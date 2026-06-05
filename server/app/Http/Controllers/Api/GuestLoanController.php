<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\User;
use App\Services\LineNotificationService;
use App\Services\PromptPayService;
use Farzai\PromptPay\Exceptions\InvalidAmountException;
use Farzai\PromptPay\Exceptions\InvalidRecipientException;
use Farzai\PromptPay\Exceptions\PromptPayException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GuestLoanController extends Controller
{
    // ============================================================
    //  GET /api/lender/{line_id}
    //  Static link ตาม LINE ID — ลูกหนี้เข้ามาดูหนี้ทั้งหมดของเจ้าหนี้คนนี้
    //  URL ไม่เปลี่ยน (ใช้ line_id แทน guest_token)
    // ============================================================

    public function byLineId(string $lineId): JsonResponse
    {
        $lender = User::where('line_id', $lineId)->first();

        if (! $lender) {
            return response()->json(['message' => 'ไม่พบเจ้าหนี้นี้'], 404);
        }

        // ส่งกลับข้อมูลเจ้าหนี้ + loans ที่ยังค้างอยู่ (รวม settled ด้วยเพื่อแสดงประวัติ)
        $loans = Loan::where('lender_id', $lender->id)
            ->with([
                'payments' => fn($q) => $q->where('confirmation_status', 'confirmed'),
                'group:id,name',
                'borrower:id,name,avatar',
            ])
            ->orderByDesc('loan_date')
            ->get()
            ->map(fn(Loan $loan) => [
                'id'              => $loan->id,
                'guest_token'     => $loan->guest_token,
                'guest_link'      => $loan->guestLink(),
                'amount'          => $loan->amount,
                'remaining'       => $loan->remaining_amount,
                'paid_amount'     => $loan->paid_amount,
                'paid_percentage' => $loan->paid_percentage,
                'description'     => $loan->description,
                'loan_date'       => $loan->loan_date,
                'due_date'        => $loan->due_date,
                'status'          => $loan->status,
                'is_overdue'      => $loan->is_overdue,
                'group_id'        => $loan->group_id,
                'group_name'      => $loan->group?->name,
                'borrower_id'     => $loan->borrower_id,
                'borrower_name'   => $loan->borrower?->name,
                'borrower_avatar' => $loan->borrower?->avatar,
            ]);

        return response()->json([
            'lender' => [
                'id'     => $lender->id,
                'name'   => $lender->name,
                'avatar' => $lender->avatar,
                'line_id'=> $lender->line_id,
            ],
            'loans' => $loans,
        ]);
    }

    // ============================================================
    //  GET /api/guest/{guest_token}/loan
    //  Guest ดูรายละเอียดหนี้และประวัติการชำระ
    // ============================================================

    public function show(Request $request): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');

        $loan->load([
            'lender:id,name,avatar',
            'borrower:id,name,line_id',
            'payments' => fn ($q) => $q->with('proofs')->latest('paid_at'),
            'proofs',
        ]);

        return response()->json([
            'loan' => [
                'id'             => $loan->id,
                'amount'         => $loan->amount,
                'remaining'      => $loan->remaining_amount,
                'paid_amount'    => $loan->paid_amount,
                'paid_percentage'=> $loan->paid_percentage,
                'description'    => $loan->description,
                'loan_date'      => $loan->loan_date,
                'due_date'       => $loan->due_date,
                'status'         => $loan->status,
                'is_overdue'     => $loan->is_overdue,
                'lender'         => $loan->lender,
                'borrower'       => $loan->borrower ? [
                    'id'      => $loan->borrower->id,
                    'name'    => $loan->borrower->name,
                    'line_id' => $loan->borrower->line_id,
                ] : null,
                'payments'       => $loan->payments,
                'proofs'         => $loan->proofs,
            ],
        ]);
    }

    // ============================================================
    //  POST /api/guest/{guest_token}/pay
    //  Guest แจ้งชำระเงิน พร้อมแนบสลิป
    //  — payment จะ confirmed ทันที ระบบจะคำนวณยอดค้างอัตโนมัติ
    // ============================================================

    public function pay(Request $request): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');

        if ($loan->status === Loan::STATUS_SETTLED) {
            return response()->json([
                'message' => 'หนี้รายการนี้ชำระครบแล้ว',
            ], 422);
        }

        $validated = $request->validate([
            'amount'  => "required|numeric|min:1|max:{$loan->remaining_amount}",
            'paid_at' => 'nullable|date',
            'note'    => 'nullable|string|max:500',
            'slip'    => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        // 1. ตรวจสอบสลิปด้วย SlipOK
        $slipokKey = config('services.slipok.api_key');
        if (! filled($slipokKey)) {
            return response()->json([
                'message' => 'ระบบยังไม่ได้ตั้งค่าระบบตรวจสลิปอัตโนมัติ (SlipOK) กรุณาติดต่อผู้ดูแลระบบ',
            ], 422);
        }
        $file = $request->file('slip');
        $amount = (float) $validated['amount'];
        $branchId = config('services.slipok.branch_id');

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(30)
                ->withoutVerifying()
                ->withHeaders([
                    'x-authorization' => $slipokKey,
                    'Accept'          => 'application/json',
                ])
                ->attach(
                    'files',
                    file_get_contents($file->getRealPath()),
                    $file->getClientOriginalName()
                )
                ->post('https://api.slipok.com/api/line/apikey/' . ($branchId ?: '0'), [
                    'amount' => $amount,
                ]);

            if (! $response->successful()) {
                $errorMessage = 'ไม่สามารถตรวจสอบสลิปได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
                try {
                    $json = $response->json();
                    if (isset($json['message'])) {
                        $errorMessage = $json['message'];
                    }
                } catch (\Throwable $e) {}

                Log::warning('SlipOK verify failed on pay', [
                    'loan_id' => $loan->id,
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);

                return response()->json([
                    'message' => $errorMessage,
                ], 422);
            }

            $data = $response->json();
            $slipAmount = isset($data['data']['amount']) ? (float) $data['data']['amount'] : 0;
            $isValid = ($data['success'] ?? false) === true && $slipAmount >= $amount;

            if (! $isValid) {
                return response()->json([
                    'message' => 'สลิปไม่ถูกต้องหรือยอดเงินโอนไม่ตรงกับจำนวนที่ระบุ',
                ], 422);
            }
        } catch (\Throwable $e) {
            Log::error('SlipOK auto-verify failed on pay', [
                'loan_id' => $loan->id,
                'error'   => $e->getMessage(),
            ]);
            return response()->json([
                'message' => 'เกิดข้อผิดพลาดในการตรวจสอบสลิปการโอน',
            ], 422);
        }

        // สร้าง payment — confirmed ทันที ไม่ต้องรอเจ้าหนี้กดยืนยันสลิป
        $payment = $loan->payments()->create([
            'paid_by'              => null,     // guest ไม่มี user_id
            'amount'               => $validated['amount'],
            'paid_at'              => $validated['paid_at'] ?? now(),
            'note'                 => $validated['note'] ?? null,
            'confirmation_status'  => LoanPayment::STATUS_CONFIRMED,
        ]);

        // อัปโหลดสลิปถ้ามี (เก็บเป็น base64 ตามที่ผู้ใช้ต้องการ)
        if ($request->hasFile('slip')) {
            $file = $request->file('slip');
            $fileContent = file_get_contents($file->getRealPath());
            $base64 = 'data:' . $file->getMimeType() . ';base64,' . base64_encode($fileContent);

            $payment->update(['proof_url' => $base64]);

            // บันทึก LoanProof (polymorphic)
            $payment->proofs()->create([
                'file_path'   => 'base64',
                'file_name'   => $file->getClientOriginalName(),
                'mime_type'   => $file->getMimeType(),
                'file_size'   => $file->getSize(),
                'uploaded_by' => null,  // guest
            ]);
        }

        // 🔔 Auto-notify lender via LINE
        app(LineNotificationService::class)->notifyLenderPaymentReceived($loan, $payment);

        return response()->json([
            'message' => $request->hasFile('slip')
                ? 'อ่านสลิปแล้ว บันทึกการชำระสำเร็จ'
                : 'บันทึกการชำระสำเร็จ',
            'payment' => $payment->load('proofs'),
        ], 201);
    }

    // ============================================================
    //  POST /api/guest/{guest_token}/approve
    //  Guest อนุมัติรายการหนี้
    // ============================================================
    public function approve(Request $request): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');

        if ($loan->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'รายการนี้ไม่ได้อยู่ในสถานะรออนุมัติ',
            ], 422);
        }

        $loan->update(['status' => Loan::STATUS_ACTIVE]);

        // 🔔 Auto-notify lender via LINE
        try {
            app(LineNotificationService::class)->notifyLenderLoanApproved($loan);
        } catch (\Throwable $e) {
            Log::error('Line notification for loan approval failed: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => 'อนุมัติรายการยืมเงินสำเร็จ',
            'data' => $loan->fresh(),
        ]);
    }

    // ============================================================
    //  GET /api/guest/{guest_token}/checkout-info
    //  ดึงข้อมูล lender + flag ว่าพร้อมรับชำระผ่าน PromptPay + SlipOK หรือไม่
    //  Frontend ใช้ตัดสินใจว่าจะแสดง QR / ปุ่มแนบสลิป / verify slip อัตโนมัติ
    // ============================================================

    public function checkoutInfo(Request $request): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');
        $loan->load('lender:id,name,avatar,promptpay_id,phone,slipok_api_key,slipok_branch_id');

        $lender = $loan->lender;

        // Determine which LINE bot to use (always central/system bot)
        $botInfo = null;

        if (filled(config('services.line.bot_token'))) {
            $botInfo = cache()->remember('line_bot_info_central', now()->addDay(), function () {
                return app(\App\Services\LineMessagingService::class)->getBotInfo(config('services.line.bot_token'));
            });
        }

        return response()->json([
            'lender' => [
                'id'     => $lender?->id,
                'name'   => $lender?->name,
                'avatar' => $lender?->avatar,
                'promptpay_target' => $lender?->getPromptPayRecipient(),
            ],
            'payment_capabilities' => [
                'promptpay' => $lender ? $lender->hasPromptPayConfigured() : false,
                'slipok'    => filled(config('services.slipok.api_key')),
            ],
            'can_pay_online' => $lender
                ? ($lender->hasPromptPayConfigured() || filled(config('services.slipok.api_key')))
                : false,
            'line_bot' => $botInfo ? [
                'has_bot' => true,
                'basic_id' => $botInfo['basicId'] ?? config('services.line.bot_basic_id'),
                'display_name' => $botInfo['displayName'] ?? 'PingPay',
                'picture_url' => $botInfo['pictureUrl'] ?? null,
                'use_central_bot' => true,
            ] : [
                'has_bot' => false,
                'use_central_bot' => true,
            ],
        ]);
    }

    // ============================================================
    //  GET /api/guest/{guest_token}/promptpay-qr
    //  Generate QR Code สำหรับชำระเงิน
    //  Query: ?amount=xxx (required)
    //  Response 422 + requires_setup:true ถ้า lender ยังไม่ตั้งค่า promptpay
    // ============================================================

    public function promptpayQr(Request $request, PromptPayService $promptPay): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');

        if ($loan->status === Loan::STATUS_SETTLED) {
            return response()->json(['message' => 'หนี้รายการนี้ชำระครบแล้ว'], 422);
        }

        $validated = $request->validate([
            'amount' => "required|numeric|min:1|max:{$loan->remaining_amount}",
        ]);

        $loan->load('lender:id,name,promptpay_id,phone');

        if (! $loan->lender || ! $loan->lender->hasPromptPayConfigured()) {
            return response()->json([
                'message' => 'เจ้าหนี้ยังไม่ได้ตั้งค่า PromptPay กรุณาแจ้งเจ้าหนี้ให้ตั้งค่าก่อนชำระเงิน',
                'requires_setup' => true,
            ], 422);
        }

        try {
            $qr = $promptPay->generateForLender($loan->lender, (float) $validated['amount']);
        } catch (InvalidRecipientException) {
            return response()->json([
                'message' => 'PromptPay ID ของเจ้าหนี้ไม่ถูกต้อง กรุณาติดต่อเจ้าหนี้',
                'requires_setup' => true,
            ], 422);
        } catch (InvalidAmountException) {
            return response()->json(['message' => 'จำนวนเงินไม่ถูกต้อง'], 422);
        } catch (PromptPayException $e) {
            Log::error('PromptPay QR generation failed', [
                'loan_id'   => $loan->id,
                'lender_id' => $loan->lender_id,
                'error'     => $e->getMessage(),
            ]);
            return response()->json(['message' => 'ไม่สามารถสร้าง QR Code ได้ในขณะนี้'], 500);
        }

        if (! $qr) {
            return response()->json([
                'message' => 'เจ้าหนี้ยังไม่ได้ตั้งค่า PromptPay',
                'requires_setup' => true,
            ], 422);
        }

        return response()->json([
            'recipient'   => $qr['recipient'],
            'amount'      => $qr['amount'],
            'qr_data_uri' => $qr['qr_data_uri'],
            'format'      => $qr['format'],
            'size'        => $qr['size'],
        ]);
    }

    // ============================================================
    //  POST /api/guest/{guest_token}/verify-slip
    //  ตรวจสอบสลิปด้วย SlipOK (ถ้า lender ตั้งค่าไว้)
    //  Body: multipart/form-data พร้อม slip (image) + amount
    //  ถ้า lender ไม่ได้ตั้ง SlipOK → 422 พร้อม flag requires_setup
    // ============================================================

    public function verifySlip(Request $request): JsonResponse
    {
        /** @var Loan $loan */
        $loan = $request->attributes->get('guest_loan');
        $loan->load('lender:id');

        if ($loan->status === Loan::STATUS_SETTLED) {
            return response()->json(['message' => 'หนี้รายการนี้ชำระครบแล้ว'], 422);
        }

        $apiKey   = config('services.slipok.api_key');
        $branchId = config('services.slipok.branch_id');

        if (! filled($apiKey)) {
            return response()->json([
                'message' => 'ระบบยังไม่ได้ตั้งค่า SlipOK API key กรุณาแจ้งผู้ดูแลระบบ',
                'requires_setup' => true,
            ], 422);
        }

        $validated = $request->validate([
            'slip'   => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'amount' => "required|numeric|min:1|max:{$loan->remaining_amount}",
        ]);

        $file     = $request->file('slip');
        $amount   = (float) $validated['amount'];

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(30)
                ->withoutVerifying()
                ->withHeaders([
                    'x-authorization' => $apiKey,
                    'Accept'          => 'application/json',
                ])
                ->attach(
                    'files',
                    file_get_contents($file->getRealPath()),
                    $file->getClientOriginalName()
                )
                ->post('https://api.slipok.com/api/line/apikey/' . ($branchId ?: '0'), [
                    'amount' => $amount,
                ]);

            if (! $response->successful()) {
                $errorMessage = 'ไม่สามารถตรวจสอบสลิปได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
                try {
                    $json = $response->json();
                    if (isset($json['message'])) {
                        $errorMessage = $json['message'];
                    }
                } catch (\Throwable $e) {}

                Log::warning('SlipOK verify failed', [
                    'loan_id' => $loan->id,
                    'status'  => $response->status(),
                    'body'    => $response->body(),
                ]);

                return response()->json([
                    'success' => false,
                    'message' => $errorMessage,
                ], 422);
            }

            $data = $response->json();
            $slipAmount = isset($data['data']['amount']) ? (float) $data['data']['amount'] : 0;
            $isValid = ($data['success'] ?? false) === true && $slipAmount >= $amount;

            return response()->json([
                'success'  => $isValid,
                'verified' => $isValid,
                'data'     => $data['data'] ?? null,
                'message'  => $isValid
                    ? 'ตรวจสอบสลิปสำเร็จ'
                    : 'สลิปไม่ถูกต้องหรือยอดเงินไม่ตรงกัน',
            ]);
        } catch (\Throwable $e) {
            Log::error('SlipOK request error', [
                'loan_id' => $loan->id,
                'error'   => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'เกิดข้อผิดพลาดในการตรวจสอบสลิป',
            ], 500);
        }
    }
}

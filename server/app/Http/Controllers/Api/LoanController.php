<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Services\LineMessagingService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoanController extends Controller
{
    // ============================================================
    //  LOANS — ส่วน lender จัดการ (auth:sanctum)
    // ============================================================

    /**
     * GET /api/loans/{loan}/guest-link
     * คืน guest link ปัจจุบัน หรือสร้างใหม่ถ้ายังไม่มี
     */
    public function guestLink(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);

        return response()->json([
            'guest_link' => $loan->guestLink(),
        ]);
    }

    /**
     * POST /api/loans/{loan}/regenerate-link
     * ยกเลิก link เดิม สร้าง guest_token ใหม่
     */
    public function regenerateLink(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);

        $loan->regenerateGuestToken();

        return response()->json([
            'guest_link' => $loan->fresh()->guestLink(),
        ]);
    }

    /**
     * POST /api/loans/{loan}/remind
     * ส่ง LINE reminder ไปหาลูกหนี้ด้วย Channel access token ของเจ้าหนี้
     */
    public function remind(Request $request, Loan $loan, LineMessagingService $line): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);

        if ($loan->status === Loan::STATUS_SETTLED || (float) $loan->remaining_amount <= 0) {
            return response()->json(['message' => 'รายการนี้ชำระครบแล้ว'], 422);
        }

        $validated = $request->validate([
            'message' => 'nullable|string|max:500',
        ]);

        $lender = $request->user();
        $borrower = $loan->borrower;

        if (! filled($lender->line_bot_token)) {
            return response()->json(['message' => 'ยังไม่ได้ตั้งค่า LINE Messaging API token'], 422);
        }

        if (! $borrower || ! filled($borrower->line_id)) {
            return response()->json(['message' => 'ลูกหนี้ยังไม่มี LINE ID'], 422);
        }

        $message = $validated['message'] ?? $this->defaultReminderMessage($loan);

        try {
            $line->pushText($lender->line_bot_token, $borrower->line_id, $message);
        } catch (RequestException $exception) {
            report($exception);

            return response()->json([
                'message' => 'ส่ง LINE reminder ไม่สำเร็จ กรุณาตรวจ token หรือสถานะการเพิ่มเพื่อนของ LINE Bot',
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'ส่ง LINE reminder แล้ว',
        ]);
    }

    private function defaultReminderMessage(Loan $loan): string
    {
        $loan->loadMissing(['lender:id,name', 'borrower:id,name']);

        $amount = number_format((float) $loan->remaining_amount, 2);
        $lines = [
            'แจ้งเตือนยอดค้างชำระจาก PingPay',
            "คุณ {$loan->borrower->name} มียอดค้าง ฿{$amount}",
        ];

        if ($loan->description) {
            $lines[] = "รายการ: {$loan->description}";
        }

        if ($loan->due_date) {
            $lines[] = 'ครบกำหนด: '.$loan->due_date->format('d/m/Y');
        }

        $lines[] = "จาก {$loan->lender->name}";
        $lines[] = $loan->guestLink();

        return implode("\n", $lines);
    }

    // ============================================================
    //  PAYMENTS — เจ้าหนี้ confirm / reject
    // ============================================================

    /**
     * GET /api/loans/{loan}/payments/pending
     * รายการ payment ที่รอ confirm ทั้งหมดของ loan นี้
     */
    public function pendingPayments(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);

        $payments = $loan->payments()
            ->pending()
            ->with('proofs')
            ->latest('paid_at')
            ->get();

        return response()->json($payments);
    }

    /**
     * POST /api/loans/{loan}/payments/{payment}/confirm
     * เจ้าหนี้ยืนยัน payment → loan recalculate อัตโนมัติ (LoanPayment::booted)
     */
    public function confirmPayment(Request $request, Loan $loan, LoanPayment $payment): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);
        abort_unless($payment->loan_id === $loan->id, 404);

        if (! $payment->isPending()) {
            return response()->json(['message' => 'รายการนี้ไม่ได้อยู่ในสถานะ pending'], 422);
        }

        $payment->confirm();

        return response()->json([
            'message' => 'ยืนยันการชำระสำเร็จ',
            'loan' => $loan->fresh(['payments']),
        ]);
    }

    /**
     * POST /api/loans/{loan}/payments/{payment}/reject
     * เจ้าหนี้ปฏิเสธ payment (สลิปไม่ถูกต้อง ฯลฯ)
     */
    public function rejectPayment(Request $request, Loan $loan, LoanPayment $payment): JsonResponse
    {
        abort_unless($loan->lender_id === $request->user()->id, 403);
        abort_unless($payment->loan_id === $loan->id, 404);

        if (! $payment->isPending()) {
            return response()->json(['message' => 'รายการนี้ไม่ได้อยู่ในสถานะ pending'], 422);
        }

        $request->validate([
            'reason' => 'nullable|string|max:300',
        ]);

        $payment->reject();

        // อัปเดต note ถ้ามี reason
        if ($request->filled('reason')) {
            $payment->update(['note' => $request->reason]);
        }

        return response()->json([
            'message' => 'ปฏิเสธการชำระแล้ว',
            'payment' => $payment->fresh(),
        ]);
    }

    // ============================================================
    //  Dashboard — รายการ pending ทั้งหมดของ lender คนนี้
    // ============================================================

    /**
     * GET /api/loans/pending-confirmations
     * รวม pending payment ทุก loan ของ lender
     */
    public function allPendingConfirmations(Request $request): JsonResponse
    {
        $pending = LoanPayment::query()
            ->pending()
            ->whereHas('loan', fn ($q) => $q->where('lender_id', $request->user()->id))
            ->with(['loan:id,lender_id,borrower_id,amount,remaining_amount', 'loan.borrower:id,name', 'proofs'])
            ->latest('paid_at')
            ->paginate(20);

        return response()->json($pending);
    }
}

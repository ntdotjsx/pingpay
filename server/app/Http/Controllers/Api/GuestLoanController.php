<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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
                'borrower:id,name',
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
                'payments'       => $loan->payments,
                'proofs'         => $loan->proofs,
            ],
        ]);
    }

    // ============================================================
    //  POST /api/guest/{guest_token}/pay
    //  Guest แจ้งชำระเงิน พร้อมแนบสลิป
    //  — payment จะอยู่ใน pending จนกว่าเจ้าหนี้จะ confirm
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
            'slip'    => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        // สร้าง payment — status = pending รอเจ้าหนี้ confirm
        $payment = $loan->payments()->create([
            'paid_by'              => null,     // guest ไม่มี user_id
            'amount'               => $validated['amount'],
            'paid_at'              => $validated['paid_at'] ?? now(),
            'note'                 => $validated['note'] ?? null,
            'confirmation_status'  => LoanPayment::STATUS_PENDING,
        ]);

        // อัปโหลดสลิปถ้ามี
        if ($request->hasFile('slip')) {
            $file = $request->file('slip');
            $path = $file->store("proofs/payments/{$payment->id}", 'public');

            $payment->update(['proof_url' => Storage::url($path)]);

            // บันทึก LoanProof (polymorphic)
            $payment->proofs()->create([
                'file_path'   => $path,
                'file_name'   => $file->getClientOriginalName(),
                'mime_type'   => $file->getMimeType(),
                'file_size'   => $file->getSize(),
                'uploaded_by' => null,  // guest
            ]);
        }

        return response()->json([
            'message' => 'แจ้งชำระสำเร็จ รอเจ้าหนี้ยืนยัน',
            'payment' => $payment->load('proofs'),
        ], 201);
    }
}
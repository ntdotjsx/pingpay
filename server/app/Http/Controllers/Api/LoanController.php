<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\LoanPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'loan'    => $loan->fresh(['payments']),
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

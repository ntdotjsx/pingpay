<?php

namespace App\Services;

use App\Models\Loan;
use App\Models\LoanPayment;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * High-level LINE notification service.
 *
 * Centralises all "auto-push" messages so controllers stay thin.
 * Uses Reply API (free) when a replyToken is available,
 * falls back to Push API when it isn't.
 */
class LineNotificationService
{
    public function __construct(
        private readonly LineMessagingService $messaging,
    ) {}

    // ================================================================
    //  0) รายการยืมเงินใหม่ / อนุมัติยืมเงิน → แจ้งเตือนผู้ยืม & เจ้าหนี้
    // ================================================================

    /**
     * แจ้งลูกหนี้ว่ามีรายการยืมเงินใหม่เข้ามา รอการอนุมัติ
     */
    public function notifyBorrowerNewLoanPending(Loan $loan): void
    {
        $loan->loadMissing(['lender', 'borrower']);
        $borrower = $loan->borrower;
        if (!$borrower || !filled($borrower->line_id)) return;

        $botToken = $this->resolveBotToken($loan->lender);
        if (!$botToken) return;

        $amount = number_format((float) $loan->amount, 2);
        $lenderName = $loan->lender?->name ?? 'เจ้าหนี้';

        $lines = [
            '📥 มีรายการยืมเงินใหม่ รอคุณอนุมัติ',
            '',
            "คุณ {$lenderName} ได้เพิ่มรายการยืมเงินใหม่",
            "จำนวนเงิน: ฿{$amount}",
            $loan->description ? "รายละเอียด: {$loan->description}" : '',
            $loan->due_date ? "กำหนดคืน: " . $loan->due_date->format('d/m/Y') : '',
            '',
            '📌 กรุณากดลิงก์ด้านล่างเพื่อตรวจสอบหลักฐานและอนุมัติรายการ',
            $loan->guestLink(),
        ];

        $this->safePush($botToken, $borrower->line_id, implode("\n", $lines));
    }

    /**
     * แจ้งเจ้าหนี้ว่าลูกหนี้อนุมัติรายการยืมเงินแล้ว
     */
    public function notifyLenderLoanApproved(Loan $loan): void
    {
        $loan->loadMissing(['lender', 'borrower']);
        $lender = $loan->lender;
        if (!$lender || !filled($lender->line_id)) return;

        $botToken = $this->resolveBotToken($lender);
        if (!$botToken) return;

        $amount = number_format((float) $loan->amount, 2);
        $borrowerName = $loan->borrower?->name ?? 'ลูกหนี้';

        $lines = [
            '✅ ลูกหนี้อนุมัติรายการยืมเงินแล้ว',
            '',
            "คุณ {$borrowerName} ได้อนุมัติรายการยืมเงินจำนวน ฿{$amount} เรียบร้อยแล้ว",
            $loan->description ? "รายละเอียด: {$loan->description}" : '',
            '',
            'รายการยืมเงินนี้ได้รับการอนุมัติและเริ่มคอยติดตาม/ส่งแจ้งเตือนตามกำหนดค่ะ',
        ];

        $this->safePush($botToken, $lender->line_id, implode("\n", $lines));
    }

    // ================================================================
    //  1) bind สำเร็จ → Push แจ้งเจ้าหนี้
    // ================================================================

    /**
     * แจ้งเจ้าหนี้ว่าลูกหนี้ผูก LINE แล้ว (push — ไม่มี replyToken ของเจ้าหนี้)
     */
    public function notifyLenderBorrowerBound(Loan $loan): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $lender   = $loan->lender;
        $borrower = $loan->borrower;

        if (!$lender || !filled($lender->line_id)) {
            return; // เจ้าหนี้ไม่มี LINE → ข้าม
        }

        $botToken = $this->resolveBotToken($lender);
        if (!$botToken) return;

        $remaining = number_format((float) $loan->remaining_amount, 2);
        $message   = implode("\n", [
            '🔗 ลูกหนี้เชื่อมต่อ LINE แล้ว',
            '',
            "คุณ {$borrower->name} ได้ผูกบัญชี LINE สำเร็จ",
            "ยอดค้าง: ฿{$remaining}",
            $loan->description ? "รายการ: {$loan->description}" : '',
            '',
            '✅ ระบบจะส่งแจ้งเตือนถึงลูกหนี้โดยอัตโนมัติ',
        ]);

        $this->safePush($botToken, $lender->line_id, trim($message));
    }

    // ================================================================
    //  2) guest ชำระเงิน → Push แจ้งเจ้าหนี้
    // ================================================================

    /**
     * แจ้งเจ้าหนี้ว่ามีการแจ้งชำระจาก guest
     */
    public function notifyLenderPaymentReceived(Loan $loan, LoanPayment $payment): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $lender = $loan->lender;

        if (!$lender || !filled($lender->line_id)) {
            return;
        }

        $botToken = $this->resolveBotToken($lender);
        if (!$botToken) return;

        $amount    = number_format((float) $payment->amount, 2);
        $remaining = number_format((float) $loan->fresh()->remaining_amount, 2);
        $borrowerName = $loan->borrower?->name ?? 'ลูกหนี้';
        $hasSlip   = filled($payment->proof_url) ? '🧾 แนบสลิปมาด้วย' : '📌 ไม่มีสลิปแนบ';

        $settled = (float) $loan->fresh()->remaining_amount <= 0;

        $message = implode("\n", [
            '💰 แจ้งชำระเงินใหม่!',
            '',
            "คุณ {$borrowerName} ชำระ ฿{$amount}",
            $loan->description ? "รายการ: {$loan->description}" : '',
            $hasSlip,
            '',
            $settled
                ? '🎉 ปิดหนี้เรียบร้อย! ยอดค้าง ฿0.00'
                : "ยอดค้างคงเหลือ: ฿{$remaining}",
        ]);

        $this->safePush($botToken, $lender->line_id, trim($message));
    }

    // ================================================================
    //  3) เจ้าหนี้ confirm payment → Push แจ้งลูกหนี้
    // ================================================================

    /**
     * แจ้งลูกหนี้ว่าเจ้าหนี้ยืนยันการชำระแล้ว
     */
    public function notifyBorrowerPaymentConfirmed(Loan $loan, LoanPayment $payment): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $borrower = $loan->borrower;

        if (!$borrower || !filled($borrower->line_id)) {
            return;
        }

        $botToken = $this->resolveBotToken($loan->lender);
        if (!$botToken) return;

        $amount    = number_format((float) $payment->amount, 2);
        $remaining = number_format((float) $loan->fresh()->remaining_amount, 2);
        $lenderName = $loan->lender?->name ?? 'เจ้าหนี้';

        $settled = (float) $loan->fresh()->remaining_amount <= 0;

        $message = implode("\n", [
            '✅ เจ้าหนี้ยืนยันการชำระแล้ว',
            '',
            "จำนวน ฿{$amount} ได้รับการยืนยันจาก {$lenderName}",
            $loan->description ? "รายการ: {$loan->description}" : '',
            '',
            $settled
                ? '🎉 ชำระครบแล้ว! ขอบคุณที่ชำระตรงเวลาค่ะ'
                : "ยอดค้างคงเหลือ: ฿{$remaining}",
        ]);

        $this->safePush($botToken, $borrower->line_id, trim($message));
    }

    // ================================================================
    //  4) เจ้าหนี้ reject payment → Push แจ้งลูกหนี้
    // ================================================================

    /**
     * แจ้งลูกหนี้ว่าเจ้าหนี้ปฏิเสธการชำระ
     */
    public function notifyBorrowerPaymentRejected(Loan $loan, LoanPayment $payment, ?string $reason = null): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $borrower = $loan->borrower;

        if (!$borrower || !filled($borrower->line_id)) {
            return;
        }

        $botToken = $this->resolveBotToken($loan->lender);
        if (!$botToken) return;

        $amount     = number_format((float) $payment->amount, 2);
        $lenderName = $loan->lender?->name ?? 'เจ้าหนี้';

        $lines = [
            '❌ การชำระถูกปฏิเสธ',
            '',
            "จำนวน ฿{$amount} ถูกปฏิเสธโดย {$lenderName}",
            $loan->description ? "รายการ: {$loan->description}" : '',
        ];

        if (filled($reason)) {
            $lines[] = "เหตุผล: {$reason}";
        }

        $lines[] = '';
        $lines[] = "กรุณาตรวจสอบและแจ้งชำระใหม่อีกครั้ง";
        $lines[] = $loan->guestLink();

        $this->safePush($botToken, $borrower->line_id, trim(implode("\n", $lines)));
    }

    // ================================================================
    //  5) Auto-remind: ใกล้ครบกำหนด (due_soon)
    // ================================================================

    /**
     * แจ้งลูกหนี้ว่าใกล้ครบกำหนดชำระแล้ว
     */
    public function autoRemindDueSoon(Loan $loan, int $daysLeft): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $borrower = $loan->borrower;
        if (!$borrower || !filled($borrower->line_id)) return;

        $botToken = $this->resolveBotToken($loan->lender);
        if (!$botToken) return;

        $remaining  = number_format((float) $loan->remaining_amount, 2);
        $lenderName = $loan->lender?->name ?? 'เจ้าหนี้';
        $dueLabel   = $daysLeft === 0
            ? '⚠️ วันนี้เป็นวันครบกำหนด!'
            : "📅 เหลืออีก {$daysLeft} วัน";

        $lines = [
            '⏰ แจ้งเตือนยอดค้างชำระ',
            '',
            "สวัสดีคุณ {$borrower->name}",
            $dueLabel,
            '',
            "ยอดค้าง: ฿{$remaining}",
        ];

        if ($loan->description) {
            $lines[] = "รายการ: {$loan->description}";
        }

        $lines[] = "ครบกำหนด: " . $loan->due_date->format('d/m/Y');
        $lines[] = "จาก {$lenderName}";
        $lines[] = '';
        $lines[] = '💳 ชำระเงินได้ที่ลิงก์ด้านล่าง';
        $lines[] = $loan->guestLink();

        $this->safePush($botToken, $borrower->line_id, implode("\n", $lines));
    }

    // ================================================================
    //  6) Auto-remind: เกินกำหนดแล้ว (overdue)
    // ================================================================

    /**
     * ทวงลูกหนี้ที่เกินกำหนดชำระ
     */
    public function autoRemindOverdue(Loan $loan, int $daysOverdue): void
    {
        $loan->loadMissing(['lender', 'borrower']);

        $borrower = $loan->borrower;
        if (!$borrower || !filled($borrower->line_id)) return;

        $botToken = $this->resolveBotToken($loan->lender);
        if (!$botToken) return;

        $remaining  = number_format((float) $loan->remaining_amount, 2);
        $lenderName = $loan->lender?->name ?? 'เจ้าหนี้';

        $lines = [
            '🔴 แจ้งเตือน — ยอดค้างเกินกำหนด',
            '',
            "สวัสดีคุณ {$borrower->name}",
            "คุณมียอดค้างเกินกำหนดชำระ {$daysOverdue} วันแล้ว",
            '',
            "ยอดค้าง: ฿{$remaining}",
        ];

        if ($loan->description) {
            $lines[] = "รายการ: {$loan->description}";
        }

        $lines[] = "ครบกำหนด: " . $loan->due_date->format('d/m/Y');
        $lines[] = "จาก {$lenderName}";
        $lines[] = '';
        $lines[] = '💳 กรุณาชำระโดยเร็วที่ลิงก์ด้านล่าง';
        $lines[] = $loan->guestLink();

        $this->safePush($botToken, $borrower->line_id, implode("\n", $lines));
    }

    // ================================================================
    //  7) สรุปให้เจ้าหนี้ว่าระบบทวงไปกี่ราย
    // ================================================================

    /**
     * Push สรุปผลการทวงหนี้อัตโนมัติให้เจ้าหนี้
     */
    public function notifyLenderAutoRemindSummary(User $lender, int $dueSoonCount, int $overdueCount): void
    {
        if (!filled($lender->line_id)) return;

        $botToken = $this->resolveBotToken($lender);
        if (!$botToken) return;

        $total = $dueSoonCount + $overdueCount;

        $lines = [
            '📊 สรุปการทวงหนี้อัตโนมัติวันนี้',
            '',
            "ระบบส่งแจ้งเตือนไปแล้ว {$total} รายการ",
        ];

        if ($dueSoonCount > 0) {
            $lines[] = "📅 ใกล้ครบกำหนด: {$dueSoonCount} ราย";
        }

        if ($overdueCount > 0) {
            $lines[] = "🔴 เกินกำหนด: {$overdueCount} ราย";
        }

        $lines[] = '';
        $lines[] = '✅ ไม่ต้องทำอะไรเพิ่ม — ระบบจัดการให้อัตโนมัติค่ะ';

        $this->safePush($botToken, $lender->line_id, implode("\n", $lines));
    }

    // ================================================================
    //  Private helpers
    // ================================================================

    /**
     * ใช้ central/system bot token เสมอ — ระบบจัดการให้ทั้งหมด
     */
    private function resolveBotToken(?User $lender = null): ?string
    {
        $central = config('services.line.bot_token');
        return filled($central) ? $central : null;
    }

    /**
     * Push แบบ fire-and-forget — ไม่ยิง exception ขึ้นมา
     * เพราะการ notify ไม่ควรทำให้ flow หลักพัง
     */
    private function safePush(string $botToken, string $lineUserId, string $message): void
    {
        try {
            $this->messaging->pushText($botToken, $lineUserId, $message);
        } catch (\Throwable $e) {
            Log::warning('LINE auto-notify failed', [
                'to'    => $lineUserId,
                'error' => $e->getMessage(),
            ]);
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Loan;
use App\Models\User;
use App\Services\LineNotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * ทวงหนี้อัตโนมัติ — แจ้งเตือนลูกหนี้ที่ใกล้ครบกำหนด + ที่เกินกำหนดแล้ว
 *
 * Logic:
 *   1) due_soon: loan ที่ due_date อยู่ภายใน N วัน (ตาม notification_settings.due_soon_days)
 *   2) overdue: loan ที่ due_date ผ่านไปแล้ว (เกินกำหนด)
 *   3) เช็ค quiet_hours ของเจ้าหนี้ — ถ้าตรงช่วงเวลาเงียบจะข้าม
 *   4) push ผ่าน LINE ไปหาลูกหนี้โดยตรง + สรุปให้เจ้าหนี้ด้วย
 *
 * Schedule: `php artisan remind:auto` — ควรรันทุกเช้า 09:00 ICT
 */
class SendAutoReminders extends Command
{
    protected $signature = 'remind:auto {--dry-run : แค่แสดงผลไม่ส่งจริง}';

    protected $description = 'ส่ง LINE ทวงหนี้อัตโนมัติสำหรับ due_soon + overdue loans';

    private int $sentDueSoon = 0;
    private int $sentOverdue = 0;
    private int $skipped = 0;

    public function handle(LineNotificationService $notify): int
    {
        $dryRun = $this->option('dry-run');
        $now = Carbon::now();

        $this->info("🔔 Auto-remind started at {$now->format('Y-m-d H:i:s')}");

        if ($dryRun) {
            $this->warn('⚠️  DRY-RUN mode — จะไม่ส่งข้อความจริง');
        }

        // ──────────────────────────────────────────────
        //  ดึง lender ที่มี active loans
        // ──────────────────────────────────────────────
        $lenders = User::query()
            ->whereHas('loansAsLender', function ($q) {
                $q->where('status', '!=', \App\Models\Loan::STATUS_SETTLED)
                  ->where('remaining_amount', '>', 0)
                  ->whereNotNull('due_date');
            })
            ->get();

        foreach ($lenders as $lender) {
            $settings = array_merge($this->defaultSettings(), $lender->notification_settings ?? []);

            // ข้ามถ้าปิด line_push
            if (!($settings['line_push'] ?? true)) {
                continue;
            }

            // เช็ค quiet hours
            if ($this->isQuietHour($now, $settings['quiet_hours_start'] ?? '22:00', $settings['quiet_hours_end'] ?? '08:00')) {
                $this->line("  ⏸ {$lender->name} — อยู่ใน quiet hours, ข้าม");
                continue;
            }

            $activeLoans = Loan::where('lender_id', $lender->id)
                ->where('status', '!=', Loan::STATUS_SETTLED)
                ->where('remaining_amount', '>', 0)
                ->whereNotNull('due_date')
                ->with(['borrower:id,name,line_id'])
                ->get();

            if ($activeLoans->isEmpty()) continue;

            $dueSoonDays = (int) ($settings['due_soon_days'] ?? 3);

            foreach ($activeLoans as $loan) {
                $borrower = $loan->borrower;

                // ลูกหนี้ไม่มี LINE → ข้าม
                if (!$borrower || !filled($borrower->line_id)) {
                    $this->skipped++;
                    continue;
                }

                $daysUntilDue = $now->startOfDay()->diffInDays($loan->due_date, false);

                if ($daysUntilDue < 0) {
                    // ── OVERDUE ──
                    if (!($settings['overdue'] ?? true)) continue;

                    $this->line("  🔴 OVERDUE: {$borrower->name} — เกินกำหนด " . abs($daysUntilDue) . " วัน");

                    if (!$dryRun) {
                        $notify->autoRemindOverdue($loan, abs($daysUntilDue));
                    }
                    $this->sentOverdue++;

                } elseif ($daysUntilDue >= 0 && $daysUntilDue <= $dueSoonDays) {
                    // ── DUE SOON ──
                    if (!($settings['due_soon'] ?? true)) continue;

                    $label = $daysUntilDue === 0 ? 'วันนี้!' : "อีก {$daysUntilDue} วัน";
                    $this->line("  🟡 DUE SOON: {$borrower->name} — ครบกำหนด{$label}");

                    if (!$dryRun) {
                        $notify->autoRemindDueSoon($loan, $daysUntilDue);
                    }
                    $this->sentDueSoon++;
                }
            }

            // สรุปให้เจ้าหนี้ (ถ้ามี loan ที่ส่งไป)
            $lenderSent = $this->sentDueSoon + $this->sentOverdue;
            if ($lenderSent > 0 && !$dryRun) {
                $notify->notifyLenderAutoRemindSummary($lender, $this->sentDueSoon, $this->sentOverdue);
            }
        }

        $this->newLine();
        $this->info("✅ เสร็จ — due_soon: {$this->sentDueSoon}, overdue: {$this->sentOverdue}, skipped: {$this->skipped}");

        return self::SUCCESS;
    }

    private function defaultSettings(): array
    {
        return [
            'due_soon'           => true,
            'overdue'            => true,
            'line_push'          => true,
            'due_soon_days'      => 3,
            'quiet_hours_start'  => '22:00',
            'quiet_hours_end'    => '08:00',
        ];
    }

    /**
     * ตรวจว่า $now อยู่ในช่วง quiet hours หรือไม่
     * รองรับข้ามเที่ยงคืน (เช่น 22:00 → 08:00)
     */
    private function isQuietHour(Carbon $now, string $start, string $end): bool
    {
        $currentMinutes = $now->hour * 60 + $now->minute;
        $startMinutes   = $this->timeToMinutes($start);
        $endMinutes     = $this->timeToMinutes($end);

        if ($startMinutes <= $endMinutes) {
            // ช่วงปกติ เช่น 08:00-18:00
            return $currentMinutes >= $startMinutes && $currentMinutes < $endMinutes;
        }

        // ข้ามเที่ยงคืน เช่น 22:00-08:00
        return $currentMinutes >= $startMinutes || $currentMinutes < $endMinutes;
    }

    private function timeToMinutes(string $time): int
    {
        [$h, $m] = explode(':', $time);
        return (int) $h * 60 + (int) $m;
    }
}

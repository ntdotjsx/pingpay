<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\LoanPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CreditorSettingsController extends Controller
{
    private array $defaultNotificationSettings = [
        'payment_confirmations' => true,
        'due_soon' => true,
        'overdue' => true,
        'daily_digest' => false,
        'line_push' => true,
        'email_backup' => false,
        'due_soon_days' => 3,
        'quiet_hours_start' => '22:00',
        'quiet_hours_end' => '08:00',
        'reminder_message' => 'แจ้งเตือนยอดค้างชำระจาก PingPay',
    ];

    public function apiKeys(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'slipok' => [
                    'has_api_key' => filled($user->slipok_api_key),
                    'masked_api_key' => $this->maskSecret($user->slipok_api_key),
                    'branch_id' => $user->slipok_branch_id,
                ],
                'promptpay' => [
                    'has_id'   => $user->hasPromptPayConfigured(),
                    'id'       => $user->promptpay_id,
                    'fallback' => $user->phone,
                    'recipient' => $user->getPromptPayRecipient(),
                ],
            ],
        ]);
    }

    public function updateApiKeys(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'slipok_api_key'    => 'nullable|string|min:6|max:255',
            'slipok_branch_id'  => 'nullable|string|max:100',
            'promptpay_id'      => 'nullable|string|min:10|max:15|regex:/^[0-9\- ]+$/',
            'clear_slipok_api_key' => 'sometimes|boolean',
            'clear_promptpay_id'   => 'sometimes|boolean',
        ]);

        $user = $request->user();

        if ($request->boolean('clear_slipok_api_key')) {
            $user->slipok_api_key = null;
        } elseif (array_key_exists('slipok_api_key', $validated) && filled($validated['slipok_api_key'])) {
            $user->slipok_api_key = $validated['slipok_api_key'];
        }

        if (array_key_exists('slipok_branch_id', $validated)) {
            $user->slipok_branch_id = $validated['slipok_branch_id'] ?: null;
        }

        if ($request->boolean('clear_promptpay_id')) {
            $user->promptpay_id = null;
        } elseif (array_key_exists('promptpay_id', $validated)) {
            $user->promptpay_id = $validated['promptpay_id']
                ? preg_replace('/\D+/', '', $validated['promptpay_id'])
                : null;
        }

        $user->save();

        return $this->apiKeys($request);
    }

    public function notifications(Request $request): JsonResponse
    {
        $settings = array_merge(
            $this->defaultNotificationSettings,
            $request->user()->notification_settings ?? [],
        );

        return response()->json([
            'success' => true,
            'data' => $settings,
        ]);
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'payment_confirmations' => 'required|boolean',
            'due_soon' => 'required|boolean',
            'overdue' => 'required|boolean',
            'daily_digest' => 'required|boolean',
            'line_push' => 'required|boolean',
            'email_backup' => 'required|boolean',
            'due_soon_days' => 'required|integer|min:1|max:14',
            'quiet_hours_start' => 'required|date_format:H:i',
            'quiet_hours_end' => 'required|date_format:H:i',
            'reminder_message' => 'nullable|string|max:240',
        ]);

        $user = $request->user();
        $user->notification_settings = array_merge(
            $this->defaultNotificationSettings,
            $validated,
        );
        $user->save();

        return $this->notifications($request);
    }

    public function insights(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $loans = Loan::where('lender_id', $userId)
            ->with(['borrower:id,name,avatar'])
            ->get();

        $activeLoans = $loans->where('status', '!=', Loan::STATUS_SETTLED);
        $settledLoans = $loans->where('status', Loan::STATUS_SETTLED);
        $totalLent = (float) $loans->sum('amount');
        $outstanding = (float) $activeLoans->sum('remaining_amount');
        $recovered = max(0, $totalLent - (float) $loans->sum('remaining_amount'));
        $overdueAmount = (float) $activeLoans
            ->filter(fn(Loan $loan) => $loan->due_date && $loan->due_date->isPast())
            ->sum('remaining_amount');

        $confirmedPayments = LoanPayment::whereHas('loan', fn($query) => $query->where('lender_id', $userId))
            ->where('confirmation_status', LoanPayment::STATUS_CONFIRMED)
            ->get();

        $topDebtors = $activeLoans
            ->groupBy('borrower_id')
            ->map(function ($group, $borrowerId) {
                $first = $group->first();

                return [
                    'borrower_id' => $borrowerId,
                    'borrower' => $first->borrower
                        ? ['id' => $first->borrower->id, 'name' => $first->borrower->name]
                        : ['id' => $borrowerId, 'name' => 'Unknown'],
                    'outstanding' => (float) $group->sum('remaining_amount'),
                    'loan_count' => $group->count(),
                ];
            })
            ->sortByDesc('outstanding')
            ->values()
            ->take(5);

        $monthlyRecovery = $confirmedPayments
            ->groupBy(fn(LoanPayment $payment) => $payment->paid_at->format('Y-m'))
            ->map(fn($items, $month) => [
                'month' => $month,
                'amount' => (float) $items->sum('amount'),
            ])
            ->sortBy('month')
            ->values()
            ->take(-6)
            ->values();

        $pendingConfirmations = LoanPayment::whereHas('loan', fn($query) => $query->where('lender_id', $userId))
            ->where('confirmation_status', LoanPayment::STATUS_PENDING)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total_lent' => $totalLent,
                'outstanding' => $outstanding,
                'recovered' => $recovered,
                'recovery_rate' => $totalLent > 0 ? round(($recovered / $totalLent) * 100, 1) : 0,
                'active_loans_count' => $activeLoans->count(),
                'settled_loans_count' => $settledLoans->count(),
                'overdue_amount' => $overdueAmount,
                'pending_confirmations' => $pendingConfirmations,
                'average_ticket' => $loans->count() > 0 ? round($totalLent / $loans->count(), 2) : 0,
                'top_debtors' => $topDebtors,
                'monthly_recovery' => $monthlyRecovery,
            ],
        ]);
    }

    private function maskSecret(?string $secret): ?string
    {
        if (! filled($secret)) {
            return null;
        }

        $length = strlen($secret);
        if ($length <= 8) {
            return str_repeat('*', $length);
        }

        return substr($secret, 0, 4) . str_repeat('*', max(4, $length - 8)) . substr($secret, -4);
    }

    public function testNotification(Request $request, \App\Services\LineMessagingService $line): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'to_line_id' => 'nullable|string|min:10|max:100',
        ]);

        $targetLineId = $validated['to_line_id'] ?? $user->line_id;

        if (!filled($targetLineId)) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่พบ LINE ID ในการทดสอบ กรุณาระบุ LINE ID ของผู้รับที่ต้องการส่งข้อความทดสอบ',
            ], 422);
        }

        $botToken = config('services.line.bot_token');

        if (!filled($botToken)) {
            return response()->json([
                'success' => false,
                'message' => 'ระบบยังไม่ได้ตั้งค่า LINE Messaging API token (.env) กรุณาติดต่อผู้ดูแลระบบ',
            ], 422);
        }

        try {
            $message = implode("\n", [
                '🔔 ทดสอบการแจ้งเตือน PingPay',
                '',
                "สวัสดีครับ/ค่ะ!",
                "นี่คือข้อความทดสอบแจ้งเตือนจากระบบ PingPay ส่งโดยเจ้าหนี้คุณ {$user->name} เพื่อยืนยันว่าการส่งแจ้งเตือนผ่าน LINE ทำงานเรียบร้อยแล้ว",
                '',
                '✅ LINE Bot พร้อมใช้งาน',
            ]);

            $line->pushText($botToken, $targetLineId, $message);

            return response()->json([
                'success' => true,
                'message' => 'ส่งข้อความทดสอบไปยัง LINE ID ที่ระบุเรียบร้อยแล้ว กรุณาตรวจสอบห้องแชท',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('LINE Notification Test Failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'ส่งข้อความล้มเหลว: ' . $e->getMessage(),
            ], 500);
        }
    }
}

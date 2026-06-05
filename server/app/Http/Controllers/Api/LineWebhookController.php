<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Loan;
use App\Services\LineMessagingService;
use App\Services\LineNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LineWebhookController extends Controller
{


    /**
     * Central Webhook for System LINE Bot
     */
    public function handleCentral(Request $request, LineMessagingService $line, LineNotificationService $notify)
    {
        $botToken = config('services.line.bot_token');
        Log::info('Central LINE webhook received', $request->all());

        // Validate LINE signature (warn only — ไม่อยากให้มันรำบากเจ้าหนี้)
        $channelSecret = config('services.line.client_secret');
        if ($channelSecret && !$this->validateSignature($request, $channelSecret)) {
            Log::warning('Central LINE webhook signature mismatch');
        }

        if (!filled($botToken)) {
            Log::warning('Central LINE bot token not configured');
            return response()->json(['message' => 'Central line bot not configured'], 400);
        }

        $events = $request->input('events', []);
        foreach ($events as $event) {
            if (($event['type'] ?? '') === 'message' && ($event['message']['type'] ?? '') === 'text') {
                $text = trim($event['message']['text'] ?? '');
                $userId = $event['source']['userId'] ?? null;
                $replyToken = $event['replyToken'] ?? null;

                if (!$userId || !$replyToken) {
                    continue;
                }

                // Check for bind_guest_xxxxx format
                if (preg_match('/^bind_guest_([a-zA-Z0-9_-]+)$/i', $text, $matches)) {
                    $guestToken = $matches[1];
                    $loan = Loan::where('guest_token', $guestToken)->with('lender')->first();

                    if ($loan && $loan->borrower) {
                        $borrower = $loan->borrower;
                        $borrower->line_id = $userId;
                        $borrower->save();

                        // Count active loans for this borrower across all lenders
                        $activeLoanCount = Loan::where('borrower_id', $borrower->id)
                            ->where('status', '!=', 'settled')
                            ->count();

                        $lenderName = $loan->lender->name ?? 'เจ้าหนี้';
                        $extraInfo = $activeLoanCount > 1
                            ? "\n\n📋 คุณมียอดค้างชำระทั้งหมด {$activeLoanCount} รายการ"
                            : '';

                        $replyMessage = "✅ เชื่อมต่อ LINE สำเร็จ!\n\nสวัสดีคุณ {$borrower->name}\nคุณจะได้รับการแจ้งเตือนยอดค้างผ่านแชทนี้โดยตรงเมื่อมียอดอัปเดตค่ะ{$extraInfo}";
                        $line->replyText($botToken, $replyToken, $replyMessage);

                        // 🔔 Auto-notify lender that borrower has bound LINE
                        $notify->notifyLenderBorrowerBound($loan);
                    } else {
                        $replyMessage = "❌ ไม่พบข้อมูลใบแจ้งยอดหรือลิงก์ค้างชำระนี้ กรุณาตรวจสอบรหัสอีกครั้งค่ะ";
                        $line->replyText($botToken, $replyToken, $replyMessage);
                    }
                } else {
                    // Default reply for any other messages
                    $replyMessage = "สวัสดีค่ะ ยินดีต้อนรับสู่ PingPay\n\nหากต้องการรับแจ้งเตือนผ่าน LINE กรุณากดปุ่มเชื่อมต่อจากลิงก์หนี้ที่คุณได้รับเพื่อทำรายการเชื่อมต่ออัตโนมัติค่ะ";
                    $line->replyText($botToken, $replyToken, $replyMessage);
                }
            }
        }

        return response()->json(['success' => true]);
    }

    /**
     * Validate LINE webhook signature
     */
    private function validateSignature(Request $request, string $channelSecret): bool
    {
        $signature = $request->header('X-Line-Signature');
        if (!$signature) return false;

        $hash = base64_encode(
            hash_hmac('sha256', $request->getContent(), $channelSecret, true)
        );

        return hash_equals($hash, $signature);
    }
}

<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class LineMessagingService
{
    private const PUSH_URL = 'https://api.line.me/v2/bot/message/push';

    private const REPLY_URL = 'https://api.line.me/v2/bot/message/reply';

    /**
     * @throws RequestException
     */
    public function pushText(string $channelAccessToken, string $lineUserId, string $message): void
    {
        Http::withoutVerifying()
            ->withToken($channelAccessToken)
            ->acceptJson()
            ->asJson()
            ->post(self::PUSH_URL, [
                'to' => $lineUserId,
                'messages' => [
                    [
                        'type' => 'text',
                        'text' => $message,
                    ],
                ],
            ])
            ->throw();
    }

    public function replyText(string $channelAccessToken, string $replyToken, string $message): void
    {
        Http::withoutVerifying()
            ->withToken($channelAccessToken)
            ->acceptJson()
            ->asJson()
            ->post(self::REPLY_URL, [
                'replyToken' => $replyToken,
                'messages' => [
                    [
                        'type' => 'text',
                        'text' => $message,
                    ],
                ],
            ]);
    }

    public function getBotInfo(string $channelAccessToken): ?array
    {
        try {
            $response = Http::withoutVerifying()
                ->withToken($channelAccessToken)
                ->acceptJson()
                ->get('https://api.line.me/v2/bot/info');

            if ($response->successful()) {
                return $response->json();
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to get LINE bot info: ' . $e->getMessage());
        }

        return null;
    }
}


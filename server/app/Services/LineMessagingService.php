<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

class LineMessagingService
{
    private const PUSH_URL = 'https://api.line.me/v2/bot/message/push';

    /**
     * @throws RequestException
     */
    public function pushText(string $channelAccessToken, string $lineUserId, string $message): void
    {
        Http::withToken($channelAccessToken)
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
}

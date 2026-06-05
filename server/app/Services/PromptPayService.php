<?php

namespace App\Services;

use App\Models\User;
use Farzai\PromptPay\Exceptions\InvalidAmountException;
use Farzai\PromptPay\Exceptions\InvalidRecipientException;
use Farzai\PromptPay\Exceptions\PromptPayException;
use Farzai\PromptPay\PromptPay;
use Farzai\PromptPay\ValueObjects\OutputResult;
use Farzai\PromptPay\ValueObjects\QrCodeConfig;
use Illuminate\Support\Facades\Log;

/**
 * Wrapper สำหรับ farzai/promptpay
 * - generateQrDataUri(): สร้าง QR เป็น data URI (พร้อมใช้ใน <img>)
 * - generateRawPayload(): สร้าง payload string ดิบ (สำหรับ debug)
 */
class PromptPayService
{
    public function __construct(
        protected int $qrSize = 360,
        protected int $qrMargin = 10,
    ) {}

    /**
     * Generate QR Code เป็น data URI (PNG)
     *
     * @throws InvalidRecipientException เมื่อ recipient ไม่ถูกต้อง
     * @throws InvalidAmountException เมื่อ amount ไม่ถูกต้อง
     * @throws PromptPayException เมื่อ generate ไม่สำเร็จ
     */
    public function generateQrDataUri(string $recipient, float $amount, string $format = 'png'): OutputResult
    {
        $config = QrCodeConfig::create(
            size: $this->qrSize,
            margin: $this->qrMargin,
        );

        return PromptPay::generate($recipient)
            ->withAmount($amount)
            ->withConfig($config)
            ->toDataUri($format);
    }

    /**
     * Generate raw payload string (ใช้สำหรับ debug หรือส่งให้ระบบอื่น)
     */
    public function generateRawPayload(string $recipient, float $amount): string
    {
        return PromptPay::generate($recipient)
            ->withAmount($amount)
            ->toPayload();
    }

    /**
     * ตรวจสอบ recipient ว่า valid หรือไม่
     */
    public function isValidRecipient(string $recipient): bool
    {
        try {
            PromptPay::generate($recipient)->build();
            return true;
        } catch (InvalidRecipientException) {
            return false;
        }
    }

    /**
     * สร้าง QR สำหรับ lender ตาม loan + amount
     * - ตรวจสอบว่า lender ตั้งค่า PromptPay แล้ว
     * - คืน null ถ้ายังไม่ตั้งค่า (caller จัดการ 422)
     *
     * @return array{recipient: string, amount: float, qr_data_uri: string, format: string, size: int}|null
     */
    public function generateForLender(User $lender, float $amount): ?array
    {
        $recipient = $lender->getPromptPayRecipient();

        if (! $recipient) {
            Log::warning('PromptPay generate skipped: lender has no promptpay_id/phone', [
                'lender_id' => $lender->id,
            ]);
            return null;
        }

        $result = $this->generateQrDataUri($recipient, $amount);

        return [
            'recipient'   => $recipient,
            'amount'      => $amount,
            'qr_data_uri' => $result->getData(),
            'format'      => $result->getFormat()->value,
            'size'        => $result->getSize(),
        ];
    }
}

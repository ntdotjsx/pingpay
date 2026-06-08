<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name',
    'email',
    'phone',
    'password',
    'line_id',
    'avatar',
    'line_bot_token',
    'slipok_api_key',
    'slipok_branch_id',
    'promptpay_id',
    'bank_name',
    'bank_account_number',
    'bank_account_name',
    'notification_settings',
])]
#[Hidden(['password', 'remember_token', 'line_bot_token', 'slipok_api_key'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'notification_settings' => 'array',
        ];
    }

    // ============================================================
    //  PromptPay helpers
    // ============================================================

    /**
     * ตรวจสอบว่าผู้ใช้ตั้งค่า PromptPay ID แล้วหรือยัง
     * ใช้สำหรับตัดสินใจว่าจะแสดง QR Code บนหน้า checkout หรือไม่
     */
    public function hasPromptPayConfigured(): bool
    {
        return filled($this->promptpay_id);
    }

    /**
     * ตรวจสอบว่าผู้ใช้ตั้งค่าธนาคารแล้วหรือยัง
     */
    public function hasBankConfigured(): bool
    {
        return filled($this->bank_name) && filled($this->bank_account_number) && filled($this->bank_account_name);
    }

    /**
     * คืนค่า PromptPay ID ที่ใช้ generate QR
     * priority: promptpay_id > phone
     */
    public function getPromptPayRecipient(): ?string
    {
        if (filled($this->promptpay_id)) {
            return preg_replace('/\D+/', '', $this->promptpay_id);
        }

        if (filled($this->phone)) {
            return preg_replace('/\D+/', '', $this->phone);
        }

        return null;
    }

    // ============================================================
    //  RELATIONSHIPS
    // ============================================================

    /** รายการที่เราให้ผู้อื่นยืม (เราเป็นเจ้าหนี้) */
    public function loansAsLender(): HasMany
    {
        return $this->hasMany(Loan::class, 'lender_id');
    }

    /** รายการที่เรายืมผู้อื่น (เราเป็นลูกหนี้) */
    public function loansAsBorrower(): HasMany
    {
        return $this->hasMany(Loan::class, 'borrower_id');
    }

    /** ประวัติการชำระทั้งหมดของเรา */
    public function payments(): HasMany
    {
        return $this->hasMany(LoanPayment::class, 'paid_by');
    }
}

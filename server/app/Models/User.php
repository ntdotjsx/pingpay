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

#[Fillable(['name', 'email', 'password', 'line_id', 'avatar'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
        ];
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
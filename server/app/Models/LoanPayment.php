<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

#[Fillable([
    'loan_id',
    'paid_by',
    'amount',
    'note',
    'paid_at',
    'proof_url',
    'confirmation_status',
])]
class LoanPayment extends Model
{
    use HasFactory;

    const STATUS_PENDING   = 'pending';
    const STATUS_CONFIRMED = 'confirmed';
    const STATUS_REJECTED  = 'rejected';

    protected function casts(): array
    {
        return [
            'amount'  => 'decimal:2',
            'paid_at' => 'datetime',
        ];
    }

    // ============================================================
    //  Relationships
    // ============================================================

    public function loan(): BelongsTo
    {
        return $this->belongsTo(Loan::class);
    }

    public function paidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /** หลักฐานสลิปที่แนบกับการชำระครั้งนี้ */
    public function proofs(): MorphMany
    {
        return $this->morphMany(LoanProof::class, 'proofable');
    }

    // ============================================================
    //  Scopes
    // ============================================================

    public function scopePending($query)
    {
        return $query->where('confirmation_status', self::STATUS_PENDING);
    }

    public function scopeConfirmed($query)
    {
        return $query->where('confirmation_status', self::STATUS_CONFIRMED);
    }

    // ============================================================
    //  Hooks
    // ============================================================

    protected static function booted(): void
    {
        // หลังยืนยัน payment → recalculate loan ทันที
        static::created(function (LoanPayment $payment) {
            if ($payment->confirmation_status === self::STATUS_CONFIRMED) {
                $payment->loan->recalculate();
            }
        });

        static::updated(function (LoanPayment $payment) {
            // recalculate เมื่อ status เปลี่ยน (เช่น pending → confirmed)
            if ($payment->wasChanged('confirmation_status')) {
                $payment->loan->recalculate();
            }
        });

        static::deleted(function (LoanPayment $payment) {
            $payment->loan->recalculate();
        });
    }

    // ============================================================
    //  Helpers
    // ============================================================

    public function confirm(): void
    {
        $this->update(['confirmation_status' => self::STATUS_CONFIRMED]);
    }

    public function reject(): void
    {
        $this->update(['confirmation_status' => self::STATUS_REJECTED]);
    }

    public function isPending(): bool
    {
        return $this->confirmation_status === self::STATUS_PENDING;
    }
}

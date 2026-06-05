<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

#[Fillable([
    'lender_id',
    'borrower_id',
    'group_id',
    'amount',
    'remaining_amount',
    'description',
    'due_date',
    'loan_date',
    'status',
    'proof_url',
])]
class Loan extends Model
{
    use HasFactory, SoftDeletes;

    const STATUS_PENDING_APPROVAL = 'pending_approval';
    const STATUS_ACTIVE  = 'active';
    const STATUS_SETTLED = 'settled';
    const STATUS_OVERDUE = 'overdue';

    protected function casts(): array
    {
        return [
            'amount'           => 'decimal:2',
            'remaining_amount' => 'decimal:2',
            'loan_date'        => 'date',
            'due_date'         => 'date',
        ];
    }

    // ============================================================
    //  Boot — auto-gen guest_token
    // ============================================================

    protected static function booted(): void
    {
        static::creating(function (Loan $loan) {
            $loan->guest_token ??= Str::random(48);
        });
    }

    // ============================================================
    //  Relationships
    // ============================================================

    public function lender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lender_id');
    }

    public function borrower(): BelongsTo
    {
        return $this->belongsTo(User::class, 'borrower_id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(LoanPayment::class)->orderBy('paid_at');
    }

    /** หลักฐาน/สัญญาที่แนบกับตัว Loan โดยตรง */
    public function proofs(): MorphMany
    {
        return $this->morphMany(LoanProof::class, 'proofable');
    }

    // ============================================================
    //  Scopes
    // ============================================================

    public function scopeActive($query)
    {
        return $query->where('status', '!=', self::STATUS_SETTLED);
    }

    public function scopeSettled($query)
    {
        return $query->where('status', self::STATUS_SETTLED);
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', '!=', self::STATUS_SETTLED)
                     ->whereNotNull('due_date')
                     ->where('due_date', '<', now()->toDateString());
    }

    public function scopeInvolving($query, int $userId)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('lender_id', $userId)
              ->orWhere('borrower_id', $userId);
        });
    }

    // ============================================================
    //  Accessors
    // ============================================================

    public function getPaidPercentageAttribute(): float
    {
        if ($this->amount <= 0) return 0;
        return round((($this->amount - $this->remaining_amount) / $this->amount) * 100, 1);
    }

    public function getPaidAmountAttribute(): float
    {
        return (float) $this->amount - (float) $this->remaining_amount;
    }

    public function getIsOverdueAttribute(): bool
    {
        return $this->status !== self::STATUS_SETTLED
            && $this->due_date !== null
            && $this->due_date->isPast();
    }

    // ============================================================
    //  Helpers
    // ============================================================

    /**
     * คำนวณ remaining_amount และ status ใหม่จาก payments ที่ confirmed
     * LoanPayment::booted() เรียกให้อัตโนมัติ
     */
    public function recalculate(): void
    {
        // นับเฉพาะ payment ที่ confirmed แล้ว (ไม่รวม pending จาก guest)
        $totalPaid = $this->payments()
            ->where('confirmation_status', 'confirmed')
            ->sum('amount');

        $remaining = max(0, $this->amount - $totalPaid);

        $this->update([
            'remaining_amount' => $remaining,
            'status' => $remaining <= 0
                ? self::STATUS_SETTLED
                : ($this->isOverdue ? self::STATUS_OVERDUE : self::STATUS_ACTIVE),
        ]);
    }

    /** URL ที่ส่งให้ guest (borrower) เพื่อดูหนี้และแจ้งชำระ */
    public function guestLink(): string
    {
        $frontend = config('app.frontend_url', 'http://localhost:4321');
        return "{$frontend}/checkout/{$this->guest_token}";
    }

    /** สร้าง guest_token ใหม่ — ยกเลิก link เดิมทันที */
    public function regenerateGuestToken(): self
    {
        $this->update(['guest_token' => Str::random(48)]);
        return $this;
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;

class LoanProof extends Model
{
    protected $fillable = [
        'proofable_type',
        'proofable_id',
        'file_path',
        'file_name',
        'mime_type',
        'file_size',
        'note',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    // ============================================================
    //  Relationships
    // ============================================================

    /** ของจริงที่ proof นี้อ้างถึง: Loan หรือ LoanPayment */
    public function proofable(): MorphTo
    {
        return $this->morphTo();
    }

    /** ผู้อัปโหลด — null หมายถึง guest */
    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    // ============================================================
    //  Helpers
    // ============================================================

    public function url(): string
    {
        return Storage::url($this->file_path);
    }

    public function isImage(): bool
    {
        return str_starts_with((string) $this->mime_type, 'image/');
    }

    public function isPdf(): bool
    {
        return $this->mime_type === 'application/pdf';
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->id();

            // คู่สัญญา
            $table->foreignId('lender_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->foreignId('borrower_id')
                  ->constrained('users')
                  ->cascadeOnDelete();

            // ตัวเงิน
            $table->decimal('amount', 12, 2)->comment('ยอดยืมต้น');
            $table->decimal('remaining_amount', 12, 2)->comment('ยอดคงค้าง');

            // รายละเอียด
            $table->text('description')->nullable()->comment('หมายเหตุ/เหตุผล');
            $table->date('loan_date')->comment('วันที่ยืม');
            $table->date('due_date')->nullable()->comment('กำหนดคืน');

            // สถานะ
            $table->enum('status', ['active', 'settled', 'overdue'])
                  ->default('active')
                  ->index();

            $table->softDeletes();
            $table->timestamps();

            // Index สำหรับ query บ่อย
            $table->index(['lender_id', 'status']);
            $table->index(['borrower_id', 'status']);
            $table->index(['due_date', 'status']);

            // หมายเหตุ: ป้องกันยืมตัวเองทำที่ validation ใน Controller แล้ว
            // ('different:' . Auth::id() ใน createLoan)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loans');
    }
};
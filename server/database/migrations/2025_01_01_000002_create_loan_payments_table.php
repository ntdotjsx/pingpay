<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loan_payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('loan_id')
                  ->constrained('loans')
                  ->cascadeOnDelete();

            // คนที่บันทึกรายการ (lender หรือ borrower ก็ได้)
            $table->foreignId('paid_by')
                  ->constrained('users')
                  ->cascadeOnDelete();

            $table->decimal('amount', 12, 2)->comment('ยอดที่จ่ายในครั้งนี้');
            $table->string('note')->nullable()->comment('หมายเหตุ');
            $table->timestamp('paid_at')->comment('วันเวลาที่จ่าย');

            $table->timestamps();

            // Index
            $table->index(['loan_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loan_payments');
    }
};
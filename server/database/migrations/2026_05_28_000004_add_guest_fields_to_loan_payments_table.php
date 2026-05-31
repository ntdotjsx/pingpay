<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_payments', function (Blueprint $table) {
            // สลิปที่ guest แนบตอนจ่าย (URL quick-access)
            $table->string('proof_url')
                  ->nullable()
                  ->after('note')
                  ->comment('URL สลิป — ดูรายละเอียดเพิ่มเติมใน loan_proofs');

            // pending = รอเจ้าหนี้ confirm, confirmed = ยืนยันแล้ว
            $table->enum('confirmation_status', ['pending', 'confirmed', 'rejected'])
                  ->default('confirmed')  // default = confirmed เพื่อ backward-compat กับ record เดิม
                  ->after('proof_url');
        });
    }

    public function down(): void
    {
        Schema::table('loan_payments', function (Blueprint $table) {
            $table->dropColumn(['proof_url', 'confirmation_status']);
        });
    }
};

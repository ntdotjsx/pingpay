<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // PromptPay ID — เบอร์โทรศัพท์ 10 หลัก หรือ เลขประจำตัวผู้เสียภาษี 13 หลัก
            // ใช้สำหรับ generate QR Code ให้ลูกหนี้สแกนจ่ายเงิน
            $table->string('promptpay_id')->nullable()->after('slipok_branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('promptpay_id');
        });
    }
};

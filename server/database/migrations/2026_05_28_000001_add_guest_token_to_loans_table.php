<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // ---- 1. เพิ่ม group_id และ guest_token ใน loans ----
        Schema::table('loans', function (Blueprint $table) {
            $table->foreignId('group_id')
                  ->nullable()
                  ->after('lender_id')
                  ->constrained('groups')
                  ->nullOnDelete();

            $table->string('guest_token', 64)
                  ->unique()
                  ->nullable()
                  ->after('group_id')
                  ->comment('Token สำหรับ guest link — gen อัตโนมัติตอนสร้าง Loan');
        });

        // ---- 2. Backfill token ให้ loan ที่มีอยู่แล้ว ----
        \DB::table('loans')->whereNull('guest_token')->lazyById()->each(function ($row) {
            \DB::table('loans')
                ->where('id', $row->id)
                ->update(['guest_token' => Str::random(48)]);
        });
    }

    public function down(): void
    {
        Schema::table('loans', function (Blueprint $table) {
            $table->dropForeign(['group_id']);
            $table->dropUnique(['guest_token']);
            $table->dropColumn(['group_id', 'guest_token']);
        });
    }
};

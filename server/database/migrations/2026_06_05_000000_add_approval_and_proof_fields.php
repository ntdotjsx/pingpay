<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add approval fields to user_members table
        Schema::table('user_members', function (Blueprint $table) {
            if (!Schema::hasColumn('user_members', 'approval_token')) {
                $table->string('approval_token', 64)->nullable()->unique();
            }
            if (!Schema::hasColumn('user_members', 'status')) {
                $table->string('status', 20)->default('pending');
            }
        });

        // 2. Add proof_url and modify status column in loans table
        Schema::table('loans', function (Blueprint $table) {
            if (!Schema::hasColumn('loans', 'proof_url')) {
                $table->longText('proof_url')->nullable();
            }
            // Change status to string to allow 'pending_approval' alongside 'active', 'settled', 'overdue'
            $table->string('status', 30)->default('pending_approval')->change();
        });
    }

    public function down(): void
    {
        Schema::table('user_members', function (Blueprint $table) {
            $table->dropColumn(['approval_token', 'status']);
        });

        Schema::table('loans', function (Blueprint $table) {
            $table->dropColumn(['proof_url']);
            // We don't change status back since enum change down can be problematic in some DBs
        });
    }
};

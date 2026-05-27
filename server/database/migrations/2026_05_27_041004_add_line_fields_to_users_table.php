<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('line_id')->unique()->nullable()->after('id');
            $table->string('avatar')->nullable()->after('email');
            $table->string('password')->nullable()->change(); // LINE login ไม่มี password
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['line_id']);
            $table->dropColumn(['line_id', 'avatar']);
            $table->string('password')->nullable(false)->change();
        });
    }
};

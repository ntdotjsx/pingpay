<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('line_bot_token')->nullable()->after('line_id');
            $table->string('slipok_api_key')->nullable()->after('line_bot_token');
            $table->string('slipok_branch_id')->nullable()->after('slipok_api_key');
            $table->json('notification_settings')->nullable()->after('slipok_branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'line_bot_token',
                'slipok_api_key',
                'slipok_branch_id',
                'notification_settings',
            ]);
        });
    }
};

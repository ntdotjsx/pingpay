<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CreditorSettingsController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\GuestLoanController;
use App\Http\Controllers\Api\LoanController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\UserController;
use App\Http\Middleware\ValidGuestToken;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ============================================================
//  Auth — LINE OAuth (ไม่ต้อง login)
// ============================================================
Route::get('/auth/line',          [AuthController::class, 'redirectToLine']);
Route::get('/auth/line/callback', [AuthController::class, 'handleLineCallback']);

// ============================================================
//  Protected routes (auth:sanctum)
// ============================================================
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/auth/me',      [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Dashboard
    Route::get('dashboard', [UserController::class, 'dashboard']);
    Route::get('dashboard/insights', [CreditorSettingsController::class, 'insights']);
    Route::get('dashboard/api-keys', [CreditorSettingsController::class, 'apiKeys']);
    Route::put('dashboard/api-keys', [CreditorSettingsController::class, 'updateApiKeys']);
    Route::get('dashboard/notification', [CreditorSettingsController::class, 'notifications']);
    Route::put('dashboard/notification', [CreditorSettingsController::class, 'updateNotifications']);

    // Profile & Account
    Route::prefix('user')->group(function () {
        Route::get('profile',  [UserController::class, 'profile']);
        Route::put('profile',  [UserController::class, 'updateProfile']);
        Route::put('password', [UserController::class, 'changePassword']);
    });

    // Members — รายชื่อเพื่อนในกลุ่ม
    Route::prefix('members')->group(function () {
        Route::get('/',        [UserController::class, 'members']);
        Route::post('/',       [UserController::class, 'createMember']);
        Route::get('{user}',   [UserController::class, 'memberSummary']);
        Route::put('{user}',   [UserController::class, 'updateMember']);   // ← เพิ่ม
        Route::delete('{user}', [UserController::class, 'deleteMember']);   // ← เพิ่ม
    });

    // Loans — รายการยืมเงิน
    Route::prefix('loans')->group(function () {
        Route::get('/',               [UserController::class, 'loans']);
        Route::post('/',               [UserController::class, 'createLoan']);
        Route::get('{loan}',          [UserController::class, 'showLoan']);
        Route::put('{loan}',          [UserController::class, 'updateLoan']);
        Route::delete('{loan}',          [UserController::class, 'deleteLoan']);
        Route::post('{loan}/payments', [UserController::class, 'recordPayment']);

        // Guest link management
        Route::get('{loan}/guest-link',      [LoanController::class, 'guestLink']);
        Route::post('{loan}/regenerate-link', [LoanController::class, 'regenerateLink']);

        // Payment confirmation
        Route::get('{loan}/payments/pending',         [LoanController::class, 'pendingPayments']);
        Route::post('{loan}/payments/{payment}/confirm', [LoanController::class, 'confirmPayment']);
        Route::post('{loan}/payments/{payment}/reject', [LoanController::class, 'rejectPayment']);
    });

    // รวม pending confirmations ทุก loan ของ lender คนนี้
    Route::get('pending-confirmations', [LoanController::class, 'allPendingConfirmations']);

    // Groups — กลุ่มทริป / งาน
    Route::prefix('groups')->group(function () {
        Route::get('/',                     [GroupController::class, 'index']);
        Route::post('/',                     [GroupController::class, 'store']);
        Route::get('{group}',               [GroupController::class, 'show']);
        Route::delete('{group}',               [GroupController::class, 'destroy']);
        Route::get('{group}/guest-links',   [GroupController::class, 'guestLinks']);
    });
});

// ============================================================
//  Static lender page — ลูกหนี้เข้าดูผ่าน LINE ID (ไม่ต้อง login)
//  URL: /api/lender/{line_id}
// ============================================================
Route::get('lender/{line_id}', [GuestLoanController::class, 'byLineId']);

// ============================================================
//  Guest routes — ไม่ต้อง login, ใช้ guest_token จาก URL
// ============================================================
Route::prefix('guest/{guest_token}')
    ->middleware(ValidGuestToken::class)
    ->name('guest.')
    ->group(function () {

        // ดูรายละเอียดหนี้ + ประวัติ
        Route::get('loan', [GuestLoanController::class, 'show'])->name('loan.show');

        // แจ้งชำระ + แนบสลิป (multipart/form-data)
        Route::post('pay',  [GuestLoanController::class, 'pay'])->name('loan.pay');
    });

// ============================================================
//  Posts (example resource — คงไว้)
// ============================================================
Route::apiResource('posts', PostController::class);

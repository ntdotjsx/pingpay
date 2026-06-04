<?php

namespace App\Http\Middleware;

use App\Models\Loan;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidGuestToken
{
    /**
     * ตรวจ guest_token จาก URL → bind Loan เข้า request
     *
     * Route pattern: /api/guest/{guest_token}/*
     */
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->route('guest_token');

        $loan = Loan::where('guest_token', $token)
                    ->orWhere('guest_token', 'like', $token . '%')
                    ->with(['lender:id,name', 'borrower:id,name,line_id'])
                    ->first();

        if (! $loan) {
            return response()->json([
                'message' => 'ลิงก์ไม่ถูกต้องหรือหมดอายุ',
            ], 404);
        }

        // bind ให้ controller ดึงได้โดยไม่ต้อง query ซ้ำ
        $request->attributes->set('guest_loan', $loan);

        return $next($request);
    }
}

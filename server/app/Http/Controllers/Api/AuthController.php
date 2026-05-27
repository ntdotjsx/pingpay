<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Cache;

class AuthController extends Controller
{
    // LINE OAuth endpoints
    private const AUTH_URL        = 'https://access.line.me/oauth2/v2.1/authorize';
    private const TOKEN_URL       = 'https://api.line.me/oauth2/v2.1/token';
    private const PROFILE_URL     = 'https://api.line.me/v2/profile';
    private const REVOKE_URL      = 'https://api.line.me/oauth2/v2.1/revoke';
    private const VERIFY_URL      = 'https://api.line.me/oauth2/v2.1/verify';

    // -------------------------------------------------------------------------
    // STEP 1 : คืน LINE Login URL ให้ frontend เปิด browser ไปที่ URL นี้
    // GET /api/auth/line
    // -------------------------------------------------------------------------
    public function redirectToLine()
    {
        // สร้าง state แบบ random แล้ว cache ไว้ 10 นาที
        // (ไม่ใช้ session เพราะเป็น REST API stateless)
        $state = hash('sha256', Str::random(40));
        Cache::put("line_state_{$state}", true, now()->addMinutes(10));

        $query = http_build_query([
            'response_type' => 'code',
            'client_id'     => config('services.line.client_id'),
            'redirect_uri'  => config('services.line.redirect'),
            'scope'         => 'profile openid email',
            'state'         => $state,
        ]);

        return response()->json([
            'url' => self::AUTH_URL . '?' . $query,
        ]);
    }

    // -------------------------------------------------------------------------
    // STEP 2 : LINE redirect กลับมาพร้อม ?code=xxx&state=xxx
    // GET /api/auth/line/callback
    // -------------------------------------------------------------------------
    public function handleLineCallback(Request $request)
    {
        $code  = $request->query('code');
        $state = $request->query('state');

        // --- ตรวจ state ว่าตรงกับที่เราสร้างไว้ ---
        if (!$code || !$state || !Cache::pull("line_state_{$state}")) {
            return response()->json(['message' => 'Invalid state or missing code.'], 422);
        }

        // --- แลก code เป็น access_token ---
        $tokenResponse = Http::asForm()->post(self::TOKEN_URL, [
            'grant_type'    => 'authorization_code',
            'code'          => $code,
            'redirect_uri'  => config('services.line.redirect'),
            'client_id'     => config('services.line.client_id'),
            'client_secret' => config('services.line.client_secret'),
        ]);

        if ($tokenResponse->failed()) {
            return response()->json(['message' => 'Failed to retrieve token from LINE.'], 502);
        }

        $token = $tokenResponse->object();

        // --- ดึง profile จาก id_token (ไม่ต้อง call API เพิ่ม) ---
        $profile = $this->parseIdToken($token);

        // --- หา user ในระบบหรือสร้างใหม่ ---
        $user = User::updateOrCreate(
            ['line_id' => $profile->sub],
            [
                'name'   => $profile->name   ?? 'LINE User',
                'email'  => $profile->email  ?? null,
                'avatar' => $profile->picture ?? null,
            ]
        );

        // --- ออก Sanctum token ---
        $accessToken = $user->createToken('line-login')->plainTextToken;

        return response()->json([
            'access_token' => $accessToken,
            'token_type'   => 'Bearer',
            'user'         => [
                'id'     => $user->id,
                'name'   => $user->name,
                'email'  => $user->email,
                'avatar' => $user->avatar,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Logout : revoke LINE token + ลบ Sanctum token
    // POST /api/auth/logout
    // -------------------------------------------------------------------------
    public function logout(Request $request)
    {
        // ลบ Sanctum token ปัจจุบัน
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // -------------------------------------------------------------------------
    // ดึง user ที่ login อยู่
    // GET /api/auth/me
    // -------------------------------------------------------------------------
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    // -------------------------------------------------------------------------
    // HELPER : decode id_token (JWT payload) โดยไม่ verify signature
    // สำหรับ production ควร verify ด้วย LINE public key
    // -------------------------------------------------------------------------
    private function parseIdToken(object $token): object
    {
        $parts = explode('.', $token->id_token ?? '');

        if (count($parts) !== 3) {
            return (object) [];
        }

        // base64url decode
        $payload = base64_decode(strtr($parts[1], '-_', '+/'));

        return json_decode($payload) ?? (object) [];
    }
}
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
    private const AUTH_URL    = 'https://access.line.me/oauth2/v2.1/authorize';
    private const TOKEN_URL   = 'https://api.line.me/oauth2/v2.1/token';

    // -------------------------------------------------------------------------
    // STEP 1 : คืน LINE Login URL ให้ frontend เปิด browser ไปที่ URL นี้
    // GET /api/auth/line
    // -------------------------------------------------------------------------
    public function redirectToLine()
    {
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

        // --- ตรวจ state ---
        if (!$code || !$state || !Cache::pull("line_state_{$state}")) {
            return response()->json(['message' => 'Invalid state or missing code.'], 422);
        }

        // --- แลก code เป็น access_token ---
        $tokenResponse = Http::withoutVerifying()->asForm()->post(self::TOKEN_URL, [
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

        // --- decode id_token เพื่อดึง profile ---
        $profile = $this->parseIdToken($token);

        // --- หา user หรือสร้างใหม่ ---
        $user = User::updateOrCreate(
            ['line_id' => $profile->sub],
            [
                'name'   => $profile->name    ?? 'LINE User',
                'email'  => !empty($profile->email)
                                ? $profile->email
                                : 'line_' . $profile->sub . '@line.local',
                'avatar' => $profile->picture ?? null,
            ]
        );

        // --- ออก Sanctum token ---
        $accessToken = $user->createToken('line-login')->plainTextToken;

        // --- redirect กลับ frontend พร้อม HttpOnly Cookie ---
        $frontendUrl = config('app.frontend_url', 'http://localhost:4321');

        return redirect("{$frontendUrl}/dashboard")
            ->cookie(
                'access_token',          // name
                $accessToken,            // value
                60 * 24 * 7,             // minutes (7 วัน)
                '/',                     // path
                null,                    // domain
                app()->isProduction(),   // secure (HTTPS เฉพาะ production)
                true,                    // httpOnly — JS อ่านไม่ได้ ✓
                false,                   // raw
                'Lax'                    // sameSite
            );
    }

    // -------------------------------------------------------------------------
    // GET /api/auth/me  — ดึงข้อมูล user ที่ login อยู่
    // -------------------------------------------------------------------------
    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    // -------------------------------------------------------------------------
    // POST /api/auth/logout — ลบ Sanctum token + clear cookie
    // -------------------------------------------------------------------------
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()
            ->json(['message' => 'Logged out successfully.'])
            ->withoutCookie('access_token');
    }

    // -------------------------------------------------------------------------
    // HELPER : decode id_token (JWT payload)
    // -------------------------------------------------------------------------
    private function parseIdToken(object $token): object
    {
        $parts = explode('.', $token->id_token ?? '');

        if (count($parts) !== 3) {
            return (object) [];
        }

        $payload = base64_decode(strtr($parts[1], '-_', '+/'));

        return json_decode($payload) ?? (object) [];
    }
}
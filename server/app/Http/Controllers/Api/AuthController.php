<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\User;
use App\Models\UserMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    // LINE OAuth endpoints
    private const AUTH_URL = 'https://access.line.me/oauth2/v2.1/authorize';

    private const TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';

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
            'client_id' => config('services.line.client_id'),
            'redirect_uri' => config('services.line.redirect'),
            'scope' => 'profile openid email',
            'state' => $state,
        ]);

        return response()->json([
            'url' => self::AUTH_URL.'?'.$query,
        ]);
    }

    // -------------------------------------------------------------------------
    // STEP 1.5 : คืน LINE Login URL สำหรับการเชื่อมต่อบัญชีของลูกหนี้ (Guest)
    // GET /api/auth/line/bind
    // -------------------------------------------------------------------------
    public function redirectToLineForBind(Request $request)
    {
        $guestToken = $request->query('guest_token');
        if (! $guestToken) {
            return response()->json(['message' => 'Missing guest_token.'], 422);
        }

        // Validate that loan exists
        $loan = Loan::where('guest_token', $guestToken)->first();
        if (! $loan) {
            return response()->json(['message' => 'Invalid guest_token.'], 404);
        }

        $state = hash('sha256', Str::random(40));
        Cache::put("line_bind_state_{$state}", $guestToken, now()->addMinutes(10));

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.line.client_id'),
            'redirect_uri' => config('services.line.redirect'),
            'scope' => 'profile openid email',
            'state' => $state,
        ]);

        return response()->json([
            'url' => self::AUTH_URL.'?'.$query,
        ]);
    }

    // -------------------------------------------------------------------------
    // STEP 1.6 : คืน LINE Login URL สำหรับการอนุมัติเพิ่มเพื่อน (Approve Friend)
    // GET /api/auth/line/approve-friend
    // -------------------------------------------------------------------------
    public function redirectToLineForApproveFriend(Request $request)
    {
        $token = $request->query('token');
        if (! $token) {
            return response()->json(['message' => 'Missing approval token.'], 422);
        }

        $friendMember = UserMember::where('approval_token', $token)->first();
        if (! $friendMember) {
            return response()->json(['message' => 'Invalid approval token.'], 404);
        }

        $state = hash('sha256', Str::random(40));
        Cache::put("line_approve_friend_{$state}", $token, now()->addMinutes(10));

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.line.client_id'),
            'redirect_uri' => config('services.line.redirect'),
            'scope' => 'profile openid email',
            'state' => $state,
        ]);

        return response()->json([
            'url' => self::AUTH_URL.'?'.$query,
        ]);
    }

    // -------------------------------------------------------------------------
    // ดึงข้อมูลสำหรับการอนุมัติเป็นเพื่อน
    // GET /api/approve-friend/{token}/info
    // -------------------------------------------------------------------------
    public function getApproveFriendInfo(string $token)
    {
        $friendMember = UserMember::where('approval_token', $token)->first();
        if (! $friendMember) {
            return response()->json(['success' => false, 'message' => 'Invalid approval token.'], 404);
        }

        $owner = User::find($friendMember->owner_id);
        $member = User::find($friendMember->member_id);

        return response()->json([
            'success' => true,
            'data' => [
                'owner_name' => $owner ? $owner->name : 'Unknown',
                'member_name' => $member ? $member->name : 'Unknown',
                'status' => $friendMember->status,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // STEP 2 : LINE redirect กลับมาพร้อม ?code=xxx&state=xxx
    // GET /api/auth/line/callback
    // -------------------------------------------------------------------------
    public function handleLineCallback(Request $request)
    {
        $code = $request->query('code');
        $state = $request->query('state');

        // --- ตรวจ state ---
        if (! $code || ! $state) {
            return response()->json(['message' => 'Invalid state or missing code.'], 422);
        }

        $isBind = false;
        $isApproveFriend = false;
        $guestToken = null;
        $approveFriendToken = null;

        if (Cache::has("line_bind_state_{$state}")) {
            $guestToken = Cache::pull("line_bind_state_{$state}");
            $isBind = true;
        } elseif (Cache::has("line_approve_friend_{$state}")) {
            $approveFriendToken = Cache::pull("line_approve_friend_{$state}");
            $isApproveFriend = true;
        } elseif (! Cache::pull("line_state_{$state}")) {
            return response()->json(['message' => 'Invalid state or missing code.'], 422);
        }

        // --- แลก code เป็น access_token ---
        $tokenResponse = Http::withoutVerifying()->asForm()->post(self::TOKEN_URL, [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => config('services.line.redirect'),
            'client_id' => config('services.line.client_id'),
            'client_secret' => config('services.line.client_secret'),
        ]);

        if ($tokenResponse->failed()) {
            return response()->json(['message' => 'Failed to retrieve token from LINE.'], 502);
        }

        $token = $tokenResponse->object();

        // --- decode id_token เพื่อดึง profile ---
        $profile = $this->parseIdToken($token);

        if (empty($profile->sub)) {
            return response()->json(['message' => 'Failed to retrieve profile sub from LINE.'], 500);
        }

        $frontendUrl = config('app.frontend_url', 'http://localhost:4321');

        if ($isApproveFriend) {
            $friendMember = UserMember::where('approval_token', $approveFriendToken)->first();
            if ($friendMember) {
                $manualUser = User::find($friendMember->member_id);
                $existingUser = User::where('line_id', $profile->sub)->first();

                if ($existingUser) {
                    // Point the friendship relation to the existing real user
                    $friendMember->member_id = $existingUser->id;
                    $friendMember->status = 'approved';
                    $friendMember->save();

                    // Delete the temporary manual user if it was a manual account
                    if ($manualUser && str_starts_with($manualUser->email ?? '', 'manual_')) {
                        $manualUser->delete();
                    }
                } else {
                    // Update manual user with line_id and avatar
                    if ($manualUser) {
                        $manualUser->line_id = $profile->sub;
                        if ($profile->picture ?? null) {
                            $manualUser->avatar = $profile->picture;
                        }
                        $manualUser->save();
                    }
                    $friendMember->status = 'approved';
                    $friendMember->save();
                }
            }

            return redirect("{$frontendUrl}/approve-friend/{$approveFriendToken}?success=true");
        }

        if ($isBind) {
            // Find the loan and update borrower's line_id
            $loan = Loan::where('guest_token', $guestToken)->first();
            if ($loan && $loan->borrower) {
                $borrower = $loan->borrower;
                $borrower->line_id = $profile->sub;

                // If borrower has default auto-generated manual email, let's also update avatar if they have one
                if ($profile->picture ?? null) {
                    $borrower->avatar = $profile->picture;
                }
                $borrower->save();
            }

            return redirect("{$frontendUrl}/checkout/{$guestToken}?bind_success=true");
        }

        // --- normal login flow ---
        // --- หา user หรือสร้างใหม่ ---
        $user = User::updateOrCreate(
            ['line_id' => $profile->sub],
            [
                'name' => $profile->name ?? 'LINE User',
                'email' => ! empty($profile->email)
                                ? $profile->email
                                : 'line_'.$profile->sub.'@line.local',
                'avatar' => $profile->picture ?? null,
            ]
        );

        // --- ออก Sanctum token ---
        $accessToken = $user->createToken('line-login')->plainTextToken;

        // --- redirect กลับ frontend พร้อม HttpOnly Cookie ---
        return redirect("{$frontendUrl}/dashboard")
            ->cookie(
                'access_token',          // name
                $accessToken,            // value
                60 * 24 * 7,             // minutes (7 วัน)
                '/',                     // path
                config('session.domain'), // domain
                config('session.secure', request()->isSecure()), // secure (HTTPS เฉพาะ production)
                true,                    // httpOnly — JS อ่านไม่ได้ ✓
                false,                   // raw
                config('session.same_site', 'lax') // sameSite
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
            ->withoutCookie(
                'access_token',
                '/',
                config('session.domain'),
                config('session.secure', request()->isSecure()),
                config('session.same_site', 'lax')
            );
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

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Loan;
use App\Models\User;
use App\Models\UserMember;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    // ============================================================
    //  Dashboard
    // ============================================================

    /**
     * GET /api/dashboard
     *
     * ส่งกลับข้อมูลตาม ApiDashboard type ของ client:
     * { net_balance, total_lent, total_borrowed, creditors[], debtors[], due_soon[] }
     */
    public function dashboard(Request $request): JsonResponse
    {
        $userId = Auth::id();

        // ── loans ที่เราให้ผู้อื่นยืม (เราเป็นเจ้าหนี้) ──────────────────────
        $loansAsLender = Loan::where('lender_id', $userId)
            ->with('borrower:id,name,avatar')
            ->get();

        // ── loans ที่เรายืมผู้อื่น (เราเป็นลูกหนี้) ──────────────────────────
        $loansAsBorrower = Loan::where('borrower_id', $userId)
            ->with('lender:id,name,avatar')
            ->get();

        $totalLent     = (float) $loansAsLender->sum('amount');
        $totalBorrowed = (float) $loansAsBorrower->sum('amount');

        // ยอดค้างรับ (remaining ของ loans ที่ยังไม่ settled)
        $remainingLent = (float) $loansAsLender
            ->where('status', '!=', Loan::STATUS_SETTLED)
            ->sum('remaining_amount');

        // ยอดค้างจ่าย
        $remainingOwed = (float) $loansAsBorrower
            ->where('status', '!=', Loan::STATUS_SETTLED)
            ->sum('remaining_amount');

        $netBalance = $remainingLent - $remainingOwed;

        // ── debtors: จัดกลุ่มตาม borrower ──────────────────────────────────
        $debtors = $loansAsLender
            ->where('status', '!=', Loan::STATUS_SETTLED)
            ->groupBy('borrower_id')
            ->map(function ($group, $borrowerId) {
                $first = $group->first();
                return [
                    'borrower_id' => $borrowerId,
                    'total_owed'  => (float) $group->sum('remaining_amount'),
                    'borrower'    => $first->borrower
                        ? ['id' => $first->borrower->id, 'name' => $first->borrower->name]
                        : ['id' => $borrowerId, 'name' => 'Unknown'],
                ];
            })
            ->values();

        // ── creditors: จัดกลุ่มตาม lender ──────────────────────────────────
        $creditors = $loansAsBorrower
            ->where('status', '!=', Loan::STATUS_SETTLED)
            ->groupBy('lender_id')
            ->map(function ($group, $lenderId) {
                $first = $group->first();
                return [
                    'lender_id' => $lenderId,
                    'total_owe' => (float) $group->sum('remaining_amount'),
                    'lender'    => $first->lender
                        ? ['id' => $first->lender->id, 'name' => $first->lender->name]
                        : ['id' => $lenderId, 'name' => 'Unknown'],
                ];
            })
            ->values();

        // ── due_soon: loans ที่ยังไม่ settled และใกล้ครบกำหนด (7 วัน) ──────
        $dueSoon = Loan::where('lender_id', $userId)
            ->where('status', '!=', Loan::STATUS_SETTLED)
            ->whereNotNull('due_date')
            ->where('due_date', '>=', now()->toDateString())
            ->where('due_date', '<=', now()->addDays(7)->toDateString())
            ->with(['lender:id,name,avatar', 'borrower:id,name,avatar'])
            ->orderBy('due_date')
            ->get()
            ->append(['paid_amount', 'paid_percentage']);

        return response()->json([
            'success' => true,
            'data'    => [
                'net_balance'    => $netBalance,
                'total_lent'     => $totalLent,
                'total_borrowed' => $totalBorrowed,
                'creditors'      => $creditors,
                'debtors'        => $debtors,
                'due_soon'       => $dueSoon,
            ],
        ]);
    }

    // ============================================================
    //  Profile
    // ============================================================

    /** GET /api/user/profile */
    public function profile(Request $request): JsonResponse
    {
        return response()->json(['success' => true, 'data' => $request->user()]);
    }

    /** PUT /api/user/profile */
    public function updateProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'  => 'required|string|max:100',
            'phone' => 'nullable|string|max:20',
        ]);
        $request->user()->update($validated);
        return response()->json(['success' => true, 'data' => $request->user()->fresh()]);
    }

    /** PUT /api/user/password */
    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);
        $request->user()->update(['password' => $validated['password']]);
        return response()->json(['success' => true, 'message' => 'เปลี่ยนรหัสผ่านสำเร็จ']);
    }

    // ============================================================
    //  Members
    // ============================================================

    /** GET /api/members */
    public function members(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $memberIds = UserMember::where('owner_id', Auth::id())
            ->pluck('member_id');

        $members = User::whereIn('id', $memberIds)
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->get()
            ->map(function (User $user) {

                $weAreCreditor = Loan::where('lender_id', Auth::id())
                    ->where('borrower_id', $user->id)
                    ->where('status', '!=', 'settled')
                    ->sum('remaining_amount');

                $weAreDebtor = Loan::where('lender_id', $user->id)
                    ->where('borrower_id', Auth::id())
                    ->where('status', '!=', 'settled')
                    ->sum('remaining_amount');

                return [
                    'id'                 => $user->id,
                    'name'               => $user->name,
                    'email'              => $user->email,
                    'phone'              => $user->phone,
                    'line_id'            => $user->line_id,
                    'we_are_creditor'    => (float) $weAreCreditor,
                    'we_are_debtor'      => (float) $weAreDebtor,
                    'active_loans_count' => (int)(
                        ($weAreCreditor > 0 ? 1 : 0) +
                        ($weAreDebtor > 0 ? 1 : 0)
                    ),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $members
        ]);
    }

    /** POST /api/members */
    public function createMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'line_id' => 'nullable|string|max:100|unique:users,line_id',
            'phone'   => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name'    => $validated['name'],
            'email'   => 'manual_' . uniqid() . '@manual.local',
            'line_id' => $validated['line_id'] ?? null,
            'phone'   => $validated['phone'] ?? null,
        ]);

        UserMember::create([
            'owner_id'  => Auth::id(),
            'member_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $user,
        ], 201);
    }

    /** GET /api/members/{user} */
    public function memberSummary(Request $request, $userId)
    {
        $member = User::findOrFail($userId);

        $userIdAuth = Auth::id();

        $loansWeGave = Loan::where('lender_id', $userIdAuth)
            ->where('borrower_id', $member->id)
            ->get();

        $loansWeOwe = Loan::where('lender_id', $member->id)
            ->where('borrower_id', $userIdAuth)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'member' => [
                    'id' => $member->id,
                    'name' => $member->name,
                    'email' => $member->email,
                    'phone' => $member->phone,
                    'line_id' => $member->line_id,
                ],
                'loans_we_gave' => $loansWeGave,
                'loans_we_owe' => $loansWeOwe,
                'we_are_creditor' => (float) $loansWeGave
                    ->where('status', '!=', 'settled')
                    ->sum('remaining_amount'),
                'we_are_debtor' => (float) $loansWeOwe
                    ->where('status', '!=', 'settled')
                    ->sum('remaining_amount'),
            ]
        ]);
    }
    /** PUT /api/members/{user} */
    public function updateMember(Request $request, $userId): JsonResponse
    {
        $member = User::findOrFail($userId);

        if (!str_starts_with($member->email ?? '', 'manual_')) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่สามารถแก้ไขผู้ใช้ที่มีบัญชีในระบบได้'
            ], 403);
        }

        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'line_id' => 'nullable|string|max:100|unique:users,line_id,' . $member->id,
            'phone'   => 'nullable|string|max:20',
        ]);

        $member->update([
            'name'    => $validated['name'],
            'line_id' => $validated['line_id'] ?? null,
            'phone'   => $validated['phone'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'อัปเดตข้อมูลเพื่อนสำเร็จ',
            'data' => $member->fresh()->only(
                'id',
                'name',
                'line_id',
                'email',
                'phone'
            ),
        ]);
    }

    /** DELETE /api/members/{user} */
    public function deleteMember($userId): JsonResponse
    {
        $member = User::findOrFail($userId);

        if (!str_starts_with($member->email ?? '', 'manual_')) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่สามารถลบผู้ใช้ที่มีบัญชีในระบบได้'
            ], 403);
        }

        $authUserId = Auth::id();

        $hasActiveLoans = Loan::where('status', '!=', 'settled')
            ->where(function ($q) use ($authUserId, $member) {
                $q->where(function ($i) use ($authUserId, $member) {
                    $i->where('lender_id', $authUserId)
                        ->where('borrower_id', $member->id);
                })->orWhere(function ($i) use ($authUserId, $member) {
                    $i->where('lender_id', $member->id)
                        ->where('borrower_id', $authUserId);
                });
            })
            ->exists();

        if ($hasActiveLoans) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่สามารถลบเพื่อนที่มีหนี้ค้างอยู่ได้'
            ], 422);
        }

        $member->delete();

        return response()->json([
            'success' => true,
            'message' => 'ลบเพื่อนสำเร็จ'
        ]);
    }
    // ============================================================
    //  Loans
    // ============================================================

    /**
     * GET /api/loans?role=lender|borrower&status=active|settled
     *
     * Client คาดหวัง data.data.data (paginate format)
     */
    public function loans(Request $request): JsonResponse
    {
        $userId = Auth::id();
        $role   = $request->query('role');   // 'lender' | 'borrower' | null = ทั้งคู่
        $status = $request->query('status');

        $query = Loan::with(['lender:id,name,avatar', 'borrower:id,name,avatar'])
            ->when($role === 'lender',   fn($q) => $q->where('lender_id', $userId))
            ->when($role === 'borrower', fn($q) => $q->where('borrower_id', $userId))
            ->when(!$role, fn($q) => $q->where(fn($i) => $i->where('lender_id', $userId)->orWhere('borrower_id', $userId)))
            ->when($status, fn($q) => $q->where('status', $status))
            ->latest();

        // ใช้ paginate เพื่อให้ตรงกับ data.data.data ที่ client คาดหวัง
        $paginated = $query->paginate(100);

        // เพิ่ม computed attributes
        $paginated->getCollection()->transform(fn($loan) => $loan->append(['paid_amount', 'paid_percentage']));

        return response()->json(['success' => true, 'data' => $paginated]);
    }

    /** POST /api/loans */
    public function createLoan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'borrower_id' => 'required|integer|exists:users,id',
            'amount'      => 'required|numeric|min:1',
            'description' => 'nullable|string|max:500',
            'due_date'    => 'nullable|date',
            'loan_date'   => 'nullable|date',
        ]);

        $loan = Loan::create([
            'lender_id'        => Auth::id(),
            'borrower_id'      => $validated['borrower_id'],
            'amount'           => $validated['amount'],
            'remaining_amount' => $validated['amount'],
            'description'      => $validated['description'] ?? null,
            'due_date'         => $validated['due_date'] ?? null,
            'loan_date'        => $validated['loan_date'] ?? now()->toDateString(),
            'status'           => Loan::STATUS_ACTIVE,
        ]);

        return response()->json([
            'success' => true,
            'data'    => $loan->load(['lender:id,name,avatar', 'borrower:id,name,avatar'])
                ->append(['paid_amount', 'paid_percentage']),
        ], 201);
    }

    /** GET /api/loans/{loan} */
    public function showLoan(Request $request, Loan $loan): JsonResponse
    {
        $userId = Auth::id();
        abort_unless($loan->lender_id === $userId || $loan->borrower_id === $userId, 403);

        return response()->json([
            'success' => true,
            'data'    => $loan->load(['lender:id,name,avatar', 'borrower:id,name,avatar', 'payments.proofs'])
                ->append(['paid_amount', 'paid_percentage']),
        ]);
    }

    /** PUT /api/loans/{loan} */
    public function updateLoan(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->lender_id === Auth::id(), 403);

        $validated = $request->validate([
            'description' => 'nullable|string|max:500',
            'due_date'    => 'nullable|date',
        ]);

        $loan->update($validated);

        return response()->json(['success' => true, 'data' => $loan->fresh()]);
    }

    /** DELETE /api/loans/{loan} */
    public function deleteLoan(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->lender_id === Auth::id(), 403);

        if ($loan->status !== Loan::STATUS_SETTLED && $loan->payments()->exists()) {
            return response()->json(['success' => false, 'message' => 'ไม่สามารถลบ loan ที่มีการชำระแล้ว'], 422);
        }

        $loan->delete();

        return response()->json(['success' => true, 'message' => 'ลบรายการสำเร็จ']);
    }

    /** POST /api/loans/{loan}/payments */
    public function recordPayment(Request $request, Loan $loan): JsonResponse
    {
        abort_unless($loan->borrower_id === Auth::id(), 403);

        $validated = $request->validate([
            'amount'  => 'required|numeric|min:1',
            'paid_at' => 'nullable|date',
            'note'    => 'nullable|string|max:300',
        ]);

        $payment = $loan->payments()->create([
            'paid_by' => Auth::id(),
            'amount'  => $validated['amount'],
            'paid_at' => $validated['paid_at'] ?? now(),
            'note'    => $validated['note'] ?? null,
            'status'  => 'pending',
        ]);

        return response()->json(['success' => true, 'data' => $payment], 201);
    }
}

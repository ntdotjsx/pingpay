<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Loan;
use App\Models\LoanPayment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    // ============================================================
    //  PROFILE & ACCOUNT
    // ============================================================

    /**
     * ดูโปรไฟล์ของตัวเอง
     */
    public function profile(): JsonResponse
    {
        $user = Auth::user()->load([
            'loansAsLender.borrower',
            'loansAsBorrower.lender',
        ]);

        return response()->json([
            'success' => true,
            'data'    => $this->buildProfileSummary($user),
        ]);
    }

    /**
     * แก้ไขโปรไฟล์
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name'  => 'sometimes|string|max:100',
            'email' => ['sometimes', 'email', Rule::unique('users')->ignore($user->id)],
            'phone' => 'sometimes|nullable|string|max:20',
        ]);

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'อัปเดตโปรไฟล์สำเร็จ',
            'data'    => $user->fresh(),
        ]);
    }

    /**
     * เปลี่ยนรหัสผ่าน
     */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'รหัสผ่านเดิมไม่ถูกต้อง',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'เปลี่ยนรหัสผ่านสำเร็จ',
        ]);
    }

    // ============================================================
    //  DASHBOARD — ภาพรวมหนี้สินทั้งหมด
    // ============================================================

    /**
     * แสดง Dashboard สรุปยอดยืม-ให้ยืม
     */
    public function dashboard(): JsonResponse
    {
        $user = Auth::user();

        // ยอดที่เราให้ยืม (เราเป็นเจ้าหนี้)
        $totalLent = Loan::where('lender_id', $user->id)
            ->where('status', '!=', 'settled')
            ->sum('remaining_amount');

        // ยอดที่เราเป็นหนี้ (เราเป็นลูกหนี้)
        $totalBorrowed = Loan::where('borrower_id', $user->id)
            ->where('status', '!=', 'settled')
            ->sum('remaining_amount');

        // รายชื่อเจ้าหนี้ (คนที่เราต้องจ่ายคืน)
        $creditors = Loan::with('lender:id,name,phone')
            ->where('borrower_id', $user->id)
            ->where('status', '!=', 'settled')
            ->select('lender_id', DB::raw('SUM(remaining_amount) as total_owe'))
            ->groupBy('lender_id')
            ->orderByDesc('total_owe')
            ->get();

        // รายชื่อลูกหนี้ (คนที่ต้องจ่ายคืนเรา)
        $debtors = Loan::with('borrower:id,name,phone')
            ->where('lender_id', $user->id)
            ->where('status', '!=', 'settled')
            ->select('borrower_id', DB::raw('SUM(remaining_amount) as total_owed'))
            ->groupBy('borrower_id')
            ->orderByDesc('total_owed')
            ->get();

        // โพยยืมใกล้ครบกำหนด (ภายใน 7 วัน)
        $dueSoon = Loan::with(['lender:id,name', 'borrower:id,name'])
            ->where(function ($q) use ($user) {
                $q->where('lender_id', $user->id)
                  ->orWhere('borrower_id', $user->id);
            })
            ->where('status', '!=', 'settled')
            ->whereNotNull('due_date')
            ->where('due_date', '<=', now()->addDays(7))
            ->orderBy('due_date')
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'net_balance'   => $totalLent - $totalBorrowed,   // บวก = คนอื่นติดเราเยอะกว่า
                'total_lent'    => $totalLent,
                'total_borrowed'=> $totalBorrowed,
                'creditors'     => $creditors,
                'debtors'       => $debtors,
                'due_soon'      => $dueSoon,
            ],
        ]);
    }

    // ============================================================
    //  LOANS — บันทึกการยืมเงิน
    // ============================================================

    /**
     * ดูรายการยืมเงินทั้งหมด (ทั้งให้ยืมและยืมมา)
     */
    public function loans(Request $request): JsonResponse
    {
        $user = Auth::user();

        $query = Loan::with(['lender:id,name', 'borrower:id,name', 'payments'])
            ->where(function ($q) use ($user) {
                $q->where('lender_id', $user->id)
                  ->orWhere('borrower_id', $user->id);
            });

        // filter ตาม role
        if ($request->role === 'lender') {
            $query->where('lender_id', $user->id);
        } elseif ($request->role === 'borrower') {
            $query->where('borrower_id', $user->id);
        }

        // filter ตาม status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // filter ตาม user คนใดคนหนึ่งในกลุ่ม
        if ($request->with_user_id) {
            $friendId = $request->with_user_id;
            $query->where(function ($q) use ($user, $friendId) {
                $q->where(function ($inner) use ($user, $friendId) {
                    $inner->where('lender_id', $user->id)
                          ->where('borrower_id', $friendId);
                })->orWhere(function ($inner) use ($user, $friendId) {
                    $inner->where('lender_id', $friendId)
                          ->where('borrower_id', $user->id);
                });
            });
        }

        $loans = $query->orderByDesc('loan_date')->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $loans,
        ]);
    }

    /**
     * ดูรายละเอียด loan เดียว
     */
    public function showLoan(Loan $loan): JsonResponse
    {
        $user = Auth::user();

        if ($loan->lender_id !== $user->id && $loan->borrower_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'ไม่มีสิทธิ์ดูรายการนี้'], 403);
        }

        $loan->load(['lender:id,name,phone', 'borrower:id,name,phone', 'payments.paidBy']);

        return response()->json([
            'success' => true,
            'data'    => $loan,
        ]);
    }

    /**
     * บันทึกการยืมเงิน (เราให้ยืม)
     */
    public function createLoan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'borrower_id' => 'required|exists:users,id|different:' . Auth::id(),
            'amount'      => 'required|numeric|min:1',
            'description' => 'nullable|string|max:500',
            'due_date'    => 'nullable|date|after:today',
            'loan_date'   => 'nullable|date',
            'group_id'    => 'nullable|exists:groups,id',
        ]);

        $loan = Loan::create([
            'lender_id'        => Auth::id(),
            'borrower_id'      => $validated['borrower_id'],
            'group_id'         => $validated['group_id'] ?? null,
            'amount'           => $validated['amount'],
            'remaining_amount' => $validated['amount'],
            'description'      => $validated['description'] ?? null,
            'due_date'         => $validated['due_date'] ?? null,
            'loan_date'        => $validated['loan_date'] ?? now(),
            'status'           => 'active',
        ]);

        $loan->load(['lender:id,name', 'borrower:id,name']);

        return response()->json([
            'success' => true,
            'message' => 'บันทึกการยืมเงินสำเร็จ',
            'data'    => $loan,
        ], 201);
    }

    /**
     * แก้ไขรายการยืมเงิน (ได้เฉพาะเจ้าหนี้เท่านั้น)
     */
    public function updateLoan(Request $request, Loan $loan): JsonResponse
    {
        if ($loan->lender_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'แก้ไขได้เฉพาะเจ้าหนี้เท่านั้น'], 403);
        }

        if ($loan->status === 'settled') {
            return response()->json(['success' => false, 'message' => 'ไม่สามารถแก้ไขรายการที่ชำระแล้ว'], 422);
        }

        $validated = $request->validate([
            'description' => 'sometimes|nullable|string|max:500',
            'due_date'    => 'sometimes|nullable|date',
        ]);

        $loan->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'อัปเดตรายการสำเร็จ',
            'data'    => $loan->fresh(['lender', 'borrower']),
        ]);
    }

    /**
     * ลบรายการยืมเงิน (ได้เฉพาะก่อนมีการชำระ)
     */
    public function deleteLoan(Loan $loan): JsonResponse
    {
        if ($loan->lender_id !== Auth::id()) {
            return response()->json(['success' => false, 'message' => 'ลบได้เฉพาะเจ้าหนี้เท่านั้น'], 403);
        }

        if ($loan->payments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'ไม่สามารถลบรายการที่มีประวัติการชำระแล้ว',
            ], 422);
        }

        $loan->delete();

        return response()->json([
            'success' => true,
            'message' => 'ลบรายการสำเร็จ',
        ]);
    }

    // ============================================================
    //  PAYMENTS — บันทึกการจ่ายคืน
    // ============================================================

    /**
     * บันทึกการจ่ายคืนบางส่วนหรือทั้งหมด
     */
    public function recordPayment(Request $request, Loan $loan): JsonResponse
    {
        $user = Auth::user();

        if ($loan->lender_id !== $user->id && $loan->borrower_id !== $user->id) {
            return response()->json(['success' => false, 'message' => 'ไม่มีสิทธิ์บันทึกรายการนี้'], 403);
        }

        if ($loan->status === 'settled') {
            return response()->json(['success' => false, 'message' => 'รายการนี้ชำระครบแล้ว'], 422);
        }

        $validated = $request->validate([
            'amount' => "required|numeric|min:1|max:{$loan->remaining_amount}",
            'note'   => 'nullable|string|max:300',
            'paid_at'=> 'nullable|date',
        ]);

        DB::transaction(function () use ($validated, $loan, $user) {
            LoanPayment::create([
                'loan_id'   => $loan->id,
                'paid_by'   => $user->id,
                'amount'    => $validated['amount'],
                'note'      => $validated['note'] ?? null,
                'paid_at'   => $validated['paid_at'] ?? now(),
            ]);

            $newRemaining = $loan->remaining_amount - $validated['amount'];
            $loan->update([
                'remaining_amount' => $newRemaining,
                'status'           => $newRemaining <= 0 ? 'settled' : 'active',
            ]);
        });

        return response()->json([
            'success' => true,
            'message' => $loan->fresh()->status === 'settled'
                ? '🎉 ชำระครบแล้ว! ปิดรายการเรียบร้อย'
                : 'บันทึกการจ่ายคืนสำเร็จ',
            'data' => $loan->fresh(['payments', 'lender', 'borrower']),
        ]);
    }

    // ============================================================
    //  MEMBERS — รายชื่อเพื่อนในกลุ่ม
    // ============================================================

    /**
     * ดูรายชื่อสมาชิกทั้งหมด
     */
    public function members(Request $request): JsonResponse
    {
        $userId = Auth::id();

        $query = User::where('id', '!=', $userId)
            ->withCount([
                'loansAsBorrower as active_loans_count' => function ($q) {
                    $q->where('status', '!=', 'settled');
                },
            ])
            ->orderBy('name');

        // รองรับ ?search=ชื่อ
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $members = $query->get(['id', 'name', 'phone', 'email']);

        return response()->json([
            'success' => true,
            'data'    => $members,
        ]);
    }

    /**
     * เพิ่มสมาชิกใหม่ (กรอกชื่อ + LINE ID)
     */
    public function createMember(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'    => 'required|string|max:100',
            'line_id' => 'nullable|string|max:100|unique:users,line_id',
        ]);

        // ถ้ามี line_id ให้เช็คว่ามี user อยู่แล้วไหม
        if (!empty($validated['line_id'])) {
            $existing = User::where('line_id', $validated['line_id'])->first();
            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'LINE ID นี้มีในระบบแล้ว',
                ], 422);
            }
        }

        $member = User::create([
            'name'    => $validated['name'],
            'line_id' => $validated['line_id'] ?? null,
            'email'   => 'manual_' . uniqid() . '@local',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'เพิ่มเพื่อนสำเร็จ',
            'data'    => $member->only('id', 'name', 'line_id', 'email'),
        ], 201);
    }

    /**
     * ดูสรุปหนี้สินกับเพื่อนคนใดคนหนึ่ง
     */
    public function memberSummary(User $member): JsonResponse
    {
        $userId = Auth::id();

        // เราให้เพื่อนยืม
        $weAreCreditor = Loan::where('lender_id', $userId)
            ->where('borrower_id', $member->id)
            ->where('status', '!=', 'settled')
            ->sum('remaining_amount');

        // เพื่อนให้เราเป็นหนี้
        $weAreDebtor = Loan::where('lender_id', $member->id)
            ->where('borrower_id', $userId)
            ->where('status', '!=', 'settled')
            ->sum('remaining_amount');

        // รายการล่าสุดระหว่างกัน
        $recentLoans = Loan::with('payments')
            ->where(function ($q) use ($userId, $member) {
                $q->where(function ($inner) use ($userId, $member) {
                    $inner->where('lender_id', $userId)
                          ->where('borrower_id', $member->id);
                })->orWhere(function ($inner) use ($userId, $member) {
                    $inner->where('lender_id', $member->id)
                          ->where('borrower_id', $userId);
                });
            })
            ->orderByDesc('loan_date')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data'    => [
                'member'         => $member->only('id', 'name', 'phone', 'email'),
                'we_are_creditor'=> $weAreCreditor,  // เพื่อนติดเราเท่าไหร่
                'we_are_debtor'  => $weAreDebtor,    // เราติดเพื่อนเท่าไหร่
                'net'            => $weAreCreditor - $weAreDebtor, // บวก = เพื่อนยังค้างเรา
                'recent_loans'   => $recentLoans,
            ],
        ]);
    }

    // ============================================================
    //  HELPERS
    // ============================================================

    private function buildProfileSummary(User $user): array
    {
        $activeAsLender   = $user->loansAsLender->where('status', '!=', 'settled');
        $activeAsBorrower = $user->loansAsBorrower->where('status', '!=', 'settled');

        return [
            'id'              => $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'phone'           => $user->phone,
            'total_lent'      => $activeAsLender->sum('remaining_amount'),
            'total_borrowed'  => $activeAsBorrower->sum('remaining_amount'),
            'active_loans_given'    => $activeAsLender->count(),
            'active_loans_received' => $activeAsBorrower->count(),
        ];
    }
}
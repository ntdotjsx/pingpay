<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Group;
use App\Models\Loan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class GroupController extends Controller
{
    /**
     * GET /api/groups
     * ดึงรายการกลุ่มทั้งหมดที่เราเป็น owner + รวม loans ของแต่ละกลุ่ม
     */
    public function index(): JsonResponse
    {
        $groups = Group::with(['members', 'loans' => function ($q) {
            $q->with(['borrower:id,name,avatar'])
              ->where('lender_id', Auth::id());
        }])
        ->where('owner_id', Auth::id())
        ->orderByDesc('created_at')
        ->get();

        // เพิ่ม summary ให้แต่ละกลุ่ม
        $groups->each(function ($group) {
            $group->total_amount    = $group->loans->sum(fn($l) => (float) $l->amount);
            $group->total_remaining = $group->loans->sum(fn($l) => (float) $l->remaining_amount);
            $group->member_count    = $group->members->count();
        });

        return response()->json([
            'success' => true,
            'data'    => $groups,
        ]);
    }

    /**
     * POST /api/groups
     * สร้างกลุ่มทริปใหม่ + สร้าง loan ให้แต่ละสมาชิกเลย
     *
     * body: {
     *   name: string,
     *   description?: string,
     *   amount_per_person: number,
     *   due_date?: string,
     *   members: Array<{ user_id?: number, name: string }>
     * }
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:100',
            'description'        => 'nullable|string|max:500',
            'amount_per_person'  => 'required|numeric|min:1',
            'due_date'           => 'nullable|date',
            'members'            => 'required|array|min:1',
            'members.*.user_id'  => 'nullable|exists:users,id',
            'members.*.name'     => 'required|string|max:100',
        ]);

        DB::beginTransaction();
        try {
            // 1. สร้าง Group
            $group = Group::create([
                'owner_id'    => Auth::id(),
                'name'        => $validated['name'],
                'description' => $validated['description'] ?? null,
            ]);

            $loans = [];

            foreach ($validated['members'] as $member) {
                // 2. เพิ่ม GroupMember record
                $group->members()->create([
                    'name' => $member['name'],
                    'note' => $member['user_id'] ? null : 'ไม่มีบัญชีในระบบ',
                ]);

                // 3. ถ้ามี user_id → สร้าง Loan ด้วย
                if (!empty($member['user_id']) && $member['user_id'] != Auth::id()) {
                    $loan = Loan::create([
                        'lender_id'        => Auth::id(),
                        'borrower_id'      => $member['user_id'],
                        'group_id'         => $group->id,
                        'amount'           => $validated['amount_per_person'],
                        'remaining_amount' => $validated['amount_per_person'],
                        'description'      => $validated['name'],
                        'due_date'         => $validated['due_date'] ?? null,
                        'loan_date'        => now(),
                        'status'           => 'active',
                    ]);
                    $loan->load(['borrower:id,name,avatar']);
                    $loans[] = $loan;
                }
            }

            DB::commit();

            $group->load(['members', 'loans.borrower:id,name,avatar']);
            $group->total_amount    = collect($loans)->sum('amount');
            $group->total_remaining = collect($loans)->sum('remaining_amount');
            $group->member_count    = $group->members->count();

            return response()->json([
                'success' => true,
                'message' => "สร้างกลุ่ม \"{$group->name}\" สำเร็จ",
                'data'    => $group,
            ], 201);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'สร้างกลุ่มไม่สำเร็จ: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/groups/{group}
     * ดูรายละเอียดกลุ่ม + loans ทั้งหมด + guest links
     */
    public function show(Group $group): JsonResponse
    {
        abort_unless($group->owner_id === Auth::id(), 403);

        $group->load(['members', 'loans' => function ($q) {
            $q->with(['borrower:id,name,avatar', 'payments'])
              ->where('lender_id', Auth::id());
        }]);

        // เพิ่ม guest_link ให้แต่ละ loan
        $group->loans->each(fn($loan) => $loan->append([]));

        return response()->json([
            'success' => true,
            'data'    => $group,
        ]);
    }

    /**
     * DELETE /api/groups/{group}
     * ลบกลุ่ม (soft delete) — ลบได้เฉพาะถ้ายังไม่มีการชำระ
     */
    public function destroy(Group $group): JsonResponse
    {
        abort_unless($group->owner_id === Auth::id(), 403);

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'ลบกลุ่มสำเร็จ',
        ]);
    }

    /**
     * GET /api/groups/{group}/guest-links
     * ดึง guest link ของทุก loan ในกลุ่ม
     */
    public function guestLinks(Group $group): JsonResponse
    {
        abort_unless($group->owner_id === Auth::id(), 403);

        $loans = Loan::with('borrower:id,name,avatar')
            ->where('group_id', $group->id)
            ->where('lender_id', Auth::id())
            ->get();

        $links = $loans->map(fn($loan) => [
            'loan_id'     => $loan->id,
            'borrower'    => $loan->borrower,
            'amount'      => $loan->amount,
            'remaining'   => $loan->remaining_amount,
            'status'      => $loan->status,
            'guest_link'  => $loan->guestLink(),
        ]);

        return response()->json([
            'success' => true,
            'data'    => $links,
        ]);
    }
}

// DashboardContent.tsx — redesigned: minimal + professional
import { useState, useEffect, useCallback, useRef } from "react";
import {
  api,
  type ApiDashboard,
  type ApiLoan,
  type ApiPayment,
} from "@/lib/api";
import { fmt, loanToDebtor } from "@/lib/debtStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  if (s === "settled")
    return {
      text: "ครบ",
      cls: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400",
    };
  if (s === "overdue")
    return {
      text: "เกิน",
      cls: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
    };
  return {
    text: "ค้าง",
    cls: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  };
}

function relativeDate(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "วันนี้";
  if (diff === 1) return "เมื่อวาน";
  if (diff < 30) return `${diff} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

// ─── Donut chart — SVG ────────────────────────────────────────────────────────

function DonutChart({
  pct,
  size = 56,
  stroke = 7,
  color = "#10b981",
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(2);
  const cx = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/30"
      />
      {pct > 0 && (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatar,
  size = "sm",
}: {
  name: string;
  avatar?: string | null;
  size?: "xs" | "sm" | "md";
}) {
  const sz =
    size === "md"
      ? "w-9 h-9 text-sm"
      : size === "xs"
        ? "w-6 h-6 text-[10px]"
        : "w-8 h-8 text-xs";
  if (avatar)
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sz} rounded-full object-cover shrink-0`}
      />
    );
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
  ];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`${sz} ${c} rounded-full flex items-center justify-center font-semibold shrink-0`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 space-y-2 border ${
        accent
          ? "bg-foreground text-background border-transparent"
          : "bg-background border-border/60"
      }`}
    >
      <p
        className={`text-[11px] font-medium uppercase tracking-widest ${
          accent ? "text-background/60" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl font-semibold leading-none tabular-nums ${
          accent ? "text-background" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs ${accent ? "text-background/60" : "text-muted-foreground"}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Loan row (redesigned) ────────────────────────────────────────────────────

function LoanRow({
  loan,
  pendingCount,
  onClick,
}: {
  loan: ApiLoan;
  pendingCount: number;
  onClick: () => void;
}) {
  const remaining = parseFloat(loan.remaining_amount);
  const total = parseFloat(loan.amount);
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
  const st = statusLabel(loan.status);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left group"
    >
      <Avatar name={loan.borrower?.name ?? "?"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {loan.borrower?.name ?? `#${loan.id}`}
          </p>
          {pendingCount > 0 && (
            <span className="shrink-0 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
          {loan.group_id && (
            <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              กลุ่ม
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {pct > 0 && loan.status !== "settled" && (
            <div className="flex-1 max-w-24">
              <Progress value={pct} className="h-1" />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground truncate">
            {loan.description ?? "ไม่มีหมายเหตุ"}
            {loan.loan_date ? ` · ${relativeDate(loan.loan_date)}` : ""}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0 space-y-1">
        <p
          className={`text-sm font-semibold tabular-nums ${
            loan.status === "settled" ? "text-emerald-600" : "text-foreground"
          }`}
        >
          {loan.status === "settled" ? "ครบ" : fmt(remaining)}
        </p>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 h-4 leading-none ${st.cls}`}
        >
          {st.text}
        </Badge>
      </div>
      <svg
        className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ─── Net Balance ring ─────────────────────────────────────────────────────────
function BalanceRing({ lent, recovered }: { lent: number; recovered: number }) {
  const total = lent + recovered;
  const recoveredPct = total > 0 ? Math.round((recovered / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4">
      {/* Donut */}
      <div className="relative shrink-0">
        <DonutChart pct={recoveredPct} size={72} stroke={8} color="#10b981" />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold tabular-nums">
            {recoveredPct}%
          </span>
          <span className="text-[10px] text-muted-foreground">คืนแล้ว</span>
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-muted-foreground">ยังค้าง</span>
          </div>

          <span className="font-semibold text-amber-600 tabular-nums">
            {fmt(lent)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-muted-foreground">ได้คืนแล้ว</span>
          </div>

          <span className="font-semibold text-emerald-600 tabular-nums">
            {fmt(recovered)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Due soon card ────────────────────────────────────────────────────────────

function DueSoonStrip({ loans }: { loans: ApiLoan[] }) {
  if (!loans.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-800/40 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-amber-200/50 dark:border-amber-800/30 flex items-center gap-2">
        <svg
          className="w-3.5 h-3.5 text-amber-500 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
          ใกล้ครบกำหนด ({loans.length})
        </p>
      </div>
      <div className="divide-y divide-amber-200/40 dark:divide-amber-800/20">
        {loans.slice(0, 3).map((loan) => (
          <div
            key={loan.id}
            className="flex items-center justify-between px-4 py-2.5 gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Avatar name={loan.borrower?.name ?? "?"} size="xs" />
              <span className="text-xs text-amber-900 dark:text-amber-300 font-medium truncate">
                {loan.borrower?.name ?? `#${loan.id}`}
              </span>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                {fmt(parseFloat(loan.remaining_amount))}
              </p>
              {loan.due_date && (
                <p className="text-[10px] text-amber-600 dark:text-amber-500">
                  {new Date(loan.due_date).toLocaleDateString("th-TH", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Loan detail modal (unchanged functionality, cleaner look) ────────────────

function LoanDetailModal({
  loan,
  open,
  onClose,
  onUpdated,
}: {
  loan: ApiLoan | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [pendingPayments, setPendingPayments] = useState<ApiPayment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loan || !open) return;
    setLoadingPending(true);
    api
      .pendingPayments(loan.id)
      .then((data: any) => setPendingPayments(Array.isArray(data) ? data : []))
      .catch(() => setPendingPayments([]))
      .finally(() => setLoadingPending(false));
  }, [loan, open]);

  if (!loan) return null;

  const remaining = parseFloat(loan.remaining_amount);
  const total = parseFloat(loan.amount);
  const paid = total - remaining;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const st = statusLabel(loan.status);

  const handleConfirm = async (paymentId: number) => {
    setConfirmingId(paymentId);
    try {
      await api.confirmPayment(loan.id, paymentId);
      toast.success("ยืนยันการชำระสำเร็จ");
      setPendingPayments((p) => p.filter((x) => x.id !== paymentId));
      onUpdated();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    setRejectingId(paymentId);
    try {
      await api.rejectPayment(loan.id, paymentId);
      toast("ปฏิเสธการชำระแล้ว");
      setPendingPayments((p) => p.filter((x) => x.id !== paymentId));
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setRejectingId(null);
    }
  };

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      const { guest_link } = await api.getGuestLink(loan.id);
      await navigator.clipboard.writeText(guest_link);
      toast.success("คัดลอก link แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  const handleDelete = async () => {
    if (!confirm("ลบรายการนี้?")) return;
    setDeleting(true);
    try {
      await api.deleteLoan(loan.id);
      toast.success("ลบรายการสำเร็จ");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Avatar name={loan.borrower?.name ?? "?"} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold">
                {loan.borrower?.name ?? `#${loan.id}`}
              </p>
              {loan.description && (
                <p className="text-xs text-muted-foreground font-normal truncate">
                  {loan.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className={`text-xs shrink-0 ${st.cls}`}>
              {st.text}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Amount summary */}
        <div className="rounded-2xl bg-muted/40 p-4 space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">ยังค้าง</span>
            <span className="text-2xl font-semibold text-foreground tabular-nums">
              {loan.status === "settled" ? "ครบ ✓" : fmt(remaining)}
            </span>
          </div>
          {pct > 0 && (
            <div className="space-y-1">
              <Progress value={pct} className="h-1.5" />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>จ่ายแล้ว {fmt(paid)}</span>
                <span>
                  {pct}% จาก {fmt(total)}
                </span>
              </div>
            </div>
          )}
          {loan.due_date && (
            <p className="text-xs text-muted-foreground">
              ครบกำหนด{" "}
              {new Date(loan.due_date).toLocaleDateString("th-TH", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Pending payments */}
        {loadingPending ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : (
          pendingPayments.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                รอยืนยัน ({pendingPayments.length})
              </p>
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/40 p-3 space-y-2.5"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                        {fmt(parseFloat(p.amount))}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        {new Date(p.paid_at).toLocaleDateString("th-TH")}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    {p.proof_url && (
                      <a
                        href={`${API_BASE}${p.proof_url}`}
                        target="_blank"
                        rel="noopener"
                        className="text-xs text-amber-700 underline shrink-0"
                      >
                        ดูสลิป
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleConfirm(p.id)}
                      disabled={confirmingId === p.id}
                    >
                      {confirmingId === p.id ? "..." : "✓ ยืนยัน"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs text-destructive border-destructive/30"
                      onClick={() => handleReject(p.id)}
                      disabled={rejectingId === p.id}
                    >
                      {rejectingId === p.id ? "..." : "✕ ปฏิเสธ"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Payment history */}
        {loan.payments &&
          loan.payments.filter((p) => p.confirmation_status === "confirmed")
            .length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                ประวัติการชำระ
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                {loan.payments
                  .filter((p) => p.confirmation_status === "confirmed")
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between px-3 py-2 border-b border-border last:border-b-0"
                    >
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.paid_at).toLocaleDateString("th-TH")}
                        {p.note && ` · ${p.note}`}
                      </p>
                      <span className="text-xs font-medium text-emerald-600 tabular-nums">
                        {fmt(parseFloat(p.amount))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleCopyLink}
            disabled={copying}
          >
            {copying ? "✓ คัดลอกแล้ว" : "🔗 คัดลอก link"}
          </Button>
          {loan.status !== "settled" && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs text-destructive border-destructive/30"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "..." : "ลบ"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Loan Modal ───────────────────────────────────────────────────────────

interface Member {
  id: number;
  name: string;
  email: string | null;
}
interface TripMember {
  id: string;
  name: string;
  user_id?: number;
}
type AddMode = "single" | "group";

function AddLoanModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<AddMode>("single");
  const [members, setMembers] = useState<Member[]>([]);
  const [borrowerId, setBorrowerId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");
  const [tripName, setTripName] = useState("");
  const [amountPerPerson, setAmountPerPerson] = useState("");
  const [tripDueDate, setTripDueDate] = useState("");
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [manualName, setManualName] = useState("");
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMembersLoading(true);
    api
      .getMembers()
      .then(setMembers)
      .finally(() => setMembersLoading(false));
  }, [open]);

  const reset = () => {
    setMode("single");
    setBorrowerId("");
    setAmount("");
    setDesc("");
    setDueDate("");
    setSearch("");
    setTripName("");
    setAmountPerPerson("");
    setTripDueDate("");
    setTripMembers([]);
    setMemberSearch("");
    setManualName("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmitSingle = async () => {
    if (!borrowerId) {
      toast.error("กรุณาเลือกลูกหนี้");
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error("กรุณาใส่จำนวนเงิน");
      return;
    }
    setLoading(true);
    try {
      await api.createLoan({
        borrower_id: borrowerId as number,
        amount: amt,
        description: desc || undefined,
        due_date: dueDate || undefined,
      });
      toast.success("เพิ่มรายการสำเร็จ");
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  const filteredApiMembers = members.filter(
    (m) =>
      !tripMembers.some((sel) => sel.user_id === m.id) &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  const addTripMember = (m: Member) => {
    setTripMembers((p) => [
      ...p,
      { id: `u${m.id}`, name: m.name, user_id: m.id },
    ]);
    setMemberSearch("");
  };

  const addManual = () => {
    const n = manualName.trim();
    if (!n) return;
    setTripMembers((p) => [...p, { id: `m${Date.now()}`, name: n }]);
    setManualName("");
  };

  const handleSubmitGroup = async () => {
    if (!tripName.trim()) {
      toast.error("กรุณาใส่ชื่อทริป");
      return;
    }
    const amt = parseFloat(amountPerPerson);
    if (!amt || amt <= 0) {
      toast.error("กรุณาใส่ยอดคนละ");
      return;
    }
    if (tripMembers.length === 0) {
      toast.error("กรุณาเพิ่มสมาชิกอย่างน้อย 1 คน");
      return;
    }
    setLoading(true);
    try {
      await api.createGroup({
        name: tripName.trim(),
        amount_per_person: amt,
        due_date: tripDueDate || undefined,
        members: tripMembers.map((m) => ({ name: m.name, user_id: m.user_id })),
      });
      toast.success(`สร้างทริป "${tripName}" สำเร็จ!`);
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "สร้างกลุ่มไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const tripAmt = parseFloat(amountPerPerson) || 0;
  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการยืมเงิน</DialogTitle>
          <DialogDescription>
            เลือกแบบรายคน หรือสร้างกลุ่มทริป
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-1">
          {(["single", "group"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
                mode === m
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "single" ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  รายคน
                </>
              ) : (
                <>
                  <span className="text-base leading-none">✈️</span>กลุ่มทริป
                </>
              )}
            </button>
          ))}
        </div>

        {mode === "single" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                ลูกหนี้ *
              </p>
              <Input
                placeholder="ค้นหาชื่อ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setBorrowerId("");
                }}
                className="mb-1.5"
              />
              {membersLoading ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-muted/30 divide-y divide-border">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">
                      ไม่พบสมาชิก
                    </p>
                  ) : (
                    filtered.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setBorrowerId(m.id);
                          setSearch(m.name);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          borrowerId === m.id
                            ? "bg-foreground/8 font-medium"
                            : "hover:bg-muted/60"
                        }`}
                      >
                        <span className="font-medium">{m.name}</span>
                        {m.email && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {m.email}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                จำนวนเงิน (บาท) *
              </p>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
                <span className="text-sm text-muted-foreground font-medium">
                  ฿
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                หมายเหตุ
              </p>
              <Input
                placeholder="เช่น ค่าอาหาร, ค่าเที่ยว..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                วันครบกำหนด (ไม่บังคับ)
              </p>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                ยกเลิก
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitSingle}
                disabled={loading}
              >
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        )}

        {mode === "group" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                ชื่อทริป / งาน *
              </p>
              <Input
                placeholder="เช่น ทริปเชียงใหม่ มีค. 68"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                ยอดคนละ (บาท) *
              </p>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
                <span className="text-sm text-muted-foreground font-medium">
                  ฿
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountPerPerson}
                  onChange={(e) => setAmountPerPerson(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                วันครบกำหนด (ไม่บังคับ)
              </p>
              <Input
                type="date"
                value={tripDueDate}
                onChange={(e) => setTripDueDate(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                เพิ่มสมาชิก
              </p>
              <Input
                placeholder="ค้นหาชื่อในระบบ..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {memberSearch && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden bg-background shadow-sm">
                  {!membersLoading && filteredApiMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">
                      ไม่พบชื่อนี้ในระบบ
                    </p>
                  )}
                  {filteredApiMembers.slice(0, 5).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addTripMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                        {m.name[0]}
                      </div>
                      {m.name}
                      {m.email && (
                        <span className="text-xs text-muted-foreground">
                          {m.email}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="หรือพิมพ์ชื่อเพื่อน (ไม่มีบัญชี)..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addManual()}
              />
              <Button
                variant="outline"
                onClick={addManual}
                disabled={!manualName.trim()}
                className="shrink-0"
              >
                + เพิ่ม
              </Button>
            </div>
            {tripMembers.length > 0 && (
              <div className="bg-muted/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    รายชื่อ ({tripMembers.length} คน)
                  </p>
                  {tripAmt > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      รวม{" "}
                      <span className="font-semibold text-foreground">
                        {fmt(tripAmt * tripMembers.length)}
                      </span>
                    </p>
                  )}
                </div>
                {tripMembers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 px-3 py-2 border-b border-border/40 last:border-0"
                  >
                    <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <span className="flex-1 text-sm">{m.name}</span>
                    {m.user_id ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        มีบัญชี
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        บันทึกชื่อ
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setTripMembers((p) => p.filter((x) => x.id !== m.id))
                      }
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                ยกเลิก
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmitGroup}
                disabled={loading}
              >
                {loading ? "กำลังสร้าง..." : "✓ สร้างทริป"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loans, setLoans] = useState<ApiLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState<Record<number, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ApiLoan | null>(null);
  const [tab, setTab] = useState<"active" | "settled">("active");
  const [lenderLinkCopied, setLenderLinkCopied] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const [dash, loanList] = await Promise.all([
        api.getDashboard(),
        api.getLoans({ role: "lender" }),
      ]);
      setData(dash);
      setLoans(loanList);
      const pending = await api.allPendingConfirmations();
      const map: Record<number, number> = {};
      ((pending as any)?.data ?? []).forEach((p: ApiPayment) => {
        map[p.loan_id] = (map[p.loan_id] ?? 0) + 1;
      });
      setPendingMap(map);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [fetchAll, authLoading]);

  const handleCopyLenderLink = async () => {
    if (!user?.line_id) return;
    const link = `${window.location.origin}/lender/${user.line_id}`;
    await navigator.clipboard.writeText(link);
    setLenderLinkCopied(true);
    setTimeout(() => setLenderLinkCopied(false), 2000);
  };

  if (loading)
    return (
      <div className="space-y-4 p-1">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-xl" />
        ))}
      </div>
    );

  const activeLoans = loans.filter((l) => l.status !== "settled");
  const settledLoans = loans.filter((l) => l.status === "settled");
  const totalPending = Object.values(pendingMap).reduce((a, b) => a + b, 0);

  const totalLent = data?.total_lent ?? 0;
  const totalBorrowed = data?.total_borrowed ?? 0;
  const netBalance = data?.net_balance ?? 0;

  const totalRecovered = loans.reduce((sum, loan) => {
    const total = parseFloat(loan.amount);
    const remaining = parseFloat(loan.remaining_amount);

    return sum + (total - remaining);
  }, 0);

  return (
    <div className="space-y-4 p-1">
      {/* ── Top row: metrics ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="ยอดสุทธิ"
          value={fmt(Math.abs(netBalance))}
          sub={netBalance >= 0 ? "เขาติดเรา" : "เราติดเขา"}
          accent={netBalance > 0}
        />
        <StatCard
          label="ได้คืนแล้ว"
          value={fmt(totalRecovered)}
          sub={`${Math.round(
            (totalRecovered / (totalRecovered + totalLent || 1)) * 100,
          )}% ของทั้งหมด`}
        />
        <StatCard label="รอยืนยัน" value={String(totalPending)} sub="การชำระ" />
      </div>

      {/* ── Balance donut + lender link ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Donut */}
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold mb-4">สัดส่วนหนี้</p>

          <BalanceRing lent={totalLent} recovered={totalRecovered} />
        </div>

        {/* Lender link */}
        {user?.line_id ? (
          <button
            onClick={handleCopyLenderLink}
            className="rounded-2xl border border-border/60 bg-background p-4 text-left hover:bg-muted/30 transition-colors group"
          >
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
              ลิงก์ของฉัน
            </p>
            <div className="flex items-start gap-2">
              <div className="w-8 h-8 rounded-xl bg-foreground/6 flex items-center justify-center shrink-0 mt-0.5">
                {lenderLinkCopied ? (
                  <svg
                    className="w-4 h-4 text-emerald-500"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground leading-tight">
                  {lenderLinkCopied ? "คัดลอกแล้ว!" : "ส่งให้ลูกหนี้กด"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  /lender/{user.line_id}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-background/50 p-4 flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              ตั้งค่า LINE ID
              <br />
              เพื่อรับลิงก์
            </p>
          </div>
        )}
      </div>

      {/* ── Due soon ── */}
      {data && data.due_soon.length > 0 && (
        <DueSoonStrip loans={data.due_soon} />
      )}

      {/* ── Loan list header ── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
          {(["active", "settled"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all tabular-nums ${
                tab === t
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "active"
                ? `ค้างอยู่${activeLoans.length ? ` (${activeLoans.length})` : ""}`
                : `ครบแล้ว${settledLoans.length ? ` (${settledLoans.length})` : ""}`}
            </button>
          ))}
        </div>
        <Button
          onClick={() => setShowAdd(true)}
          size="sm"
          className="gap-1.5 shrink-0 h-8 px-3 text-xs"
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          เพิ่มรายการ
        </Button>
      </div>

      {/* ── Loan list ── */}
      {(() => {
        const list = tab === "active" ? activeLoans : settledLoans;
        if (!list.length)
          return (
            <div className="text-center py-14">
              <p className="text-3xl mb-3">{tab === "active" ? "🎉" : "📋"}</p>
              <p className="font-medium text-sm text-foreground">
                {tab === "active"
                  ? "ไม่มีรายการค้างอยู่"
                  : "ยังไม่มีรายการที่ชำระครบ"}
              </p>
              {tab === "active" && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-3 text-xs text-primary underline underline-offset-2"
                >
                  + เพิ่มรายการแรก
                </button>
              )}
            </div>
          );
        return (
          <div className="rounded-2xl border border-border/60 bg-background overflow-hidden divide-y divide-border/50">
            {list.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                pendingCount={pendingMap[loan.id] ?? 0}
                onClick={() => setSelectedLoan(loan)}
              />
            ))}
          </div>
        );
      })()}

      <AddLoanModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchAll}
      />
      <LoanDetailModal
        loan={selectedLoan}
        open={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onUpdated={() => {
          fetchAll();
          if (selectedLoan) {
            api
              .getLoan(selectedLoan.id)
              .then(setSelectedLoan)
              .catch(() => setSelectedLoan(null));
          }
        }}
      />
    </div>
  );
}

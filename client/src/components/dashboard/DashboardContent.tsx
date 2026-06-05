// DashboardContent.tsx — redesigned: minimal + professional
import {
  cloneElement,
  type FocusEvent,
  type ReactElement,
  type MouseEvent,
  type ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

function proofHref(proofUrl: string) {
  if (
    proofUrl.startsWith("data:") ||
    proofUrl.startsWith("http://") ||
    proofUrl.startsWith("https://")
  ) {
    return proofUrl;
  }

  return `${API_BASE}${proofUrl}`;
}

function Hint({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const child = children as ReactElement<any>;

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    setPos({ x: event.clientX, y: event.clientY });
    child.props.onMouseMove?.(event);
  };

  return (
    <>
      {cloneElement(child, {
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          setOpen(true);
          setPos({ x: event.clientX, y: event.clientY });
          child.props.onMouseEnter?.(event);
        },
        onMouseMove: handleMove,
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          setOpen(false);
          child.props.onMouseLeave?.(event);
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          setOpen(true);
          child.props.onFocus?.(event);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          setOpen(false);
          child.props.onBlur?.(event);
        },
      })}
      <span
        className={`pointer-events-none fixed left-0 top-0 z-[70] max-w-xs rounded-xl bg-foreground px-3 py-1.5 text-xs text-background shadow-lg ${
          open ? "block" : "hidden"
        }`}
        style={{
          transform: `translate3d(${pos.x + 14}px, ${pos.y + 16}px, 0)`,
        }}
      >
        {label}
      </span>
    </>
  );
}

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
  size?: "2xs" | "xs" | "sm" | "md";
}) {
  const sz =
    size === "md"
      ? "w-9 h-9 text-sm"
      : size === "xs"
        ? "w-6 h-6 text-[10px]"
        : size === "2xs"
          ? "w-4 h-4 text-[8px]"
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

  const borrowerName = loan.borrower?.name ?? `#${loan.id}`;
  const daysUntilDue = loan.due_date
    ? Math.round(
        (parseDate(loan.due_date).getTime() -
          parseDate(dateKey(new Date())).getTime()) /
          86400000,
      )
    : null;
  const isDueSoon =
    daysUntilDue !== null &&
    daysUntilDue >= 0 &&
    daysUntilDue <= 3 &&
    loan.status !== "overdue" &&
    loan.status !== "settled";
  const dueSoonLabel =
    daysUntilDue === 0
      ? "ครบกำหนดวันนี้"
      : `ใกล้ครบกำหนดใน ${daysUntilDue} วัน`;

  return (
    <Hint label={`ดูรายละเอียดของ ${borrowerName}`}>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors text-left group"
      >
        <Avatar name={borrowerName} avatar={loan.borrower?.avatar} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {borrowerName}
            </p>
            {isDueSoon && (
              <Hint label={dueSoonLabel}>
                <span
                  className="relative flex h-3 w-3 shrink-0 items-center justify-center"
                  aria-label={dueSoonLabel}
                >
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-red-500/35" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
              </Hint>
            )}
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
    </Hint>
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
// ─── Loan detail modal (unchanged functionality, cleaner look) ────────────────

function monthLabel(date: Date) {
  return date.toLocaleDateString("th-TH", {
    month: "long",
    year: "numeric",
  });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function DashboardCalendar({
  loans,
  onSelectLoan,
}: {
  loans: ApiLoan[];
  onSelectLoan: (loan: ApiLoan) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();
  const todayKey = dateKey(today);
  const todayStart = parseDate(todayKey).getTime();
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - monthStart.getDay());

  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstCell);
    day.setDate(firstCell.getDate() + index);
    return day;
  });

  const dueLoans = loans
    .filter((loan) => loan.status !== "settled" && loan.due_date)
    .sort((a, b) => {
      const aTime = a.due_date ? parseDate(a.due_date).getTime() : 0;
      const bTime = b.due_date ? parseDate(b.due_date).getTime() : 0;
      return aTime - bTime;
    });

  const byDate = dueLoans.reduce<Record<string, ApiLoan[]>>((map, loan) => {
    if (!loan.due_date) return map;
    const key = dateKey(parseDate(loan.due_date));
    map[key] = [...(map[key] ?? []), loan];
    return map;
  }, {});

  const goMonth = (offset: number) => {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return next;
    });
  };
  const calendarDateLabel = (date: Date) =>
    date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <section className="rounded-2xl border border-border/60 bg-background p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[12px] font-semibold text-foreground">
            ปฏิทินครบกำหนด
          </p>
          <p className="text-[10px] text-muted-foreground">
            {monthLabel(viewDate)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Hint label="เดือนก่อนหน้า">
            <button
              onClick={() => goMonth(-1)}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="เดือนก่อนหน้า"
            >
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </Hint>
          <Hint label="กลับไปเดือนปัจจุบัน">
            <button
              onClick={() => setViewDate(new Date())}
              className="h-[26px] rounded-md border border-border/60 px-2 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              วันนี้
            </button>
          </Hint>
          <Hint label="เดือนถัดไป">
            <button
              onClick={() => goMonth(1)}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="เดือนถัดไป"
            >
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </Hint>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium text-muted-foreground">
        {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) => (
          <div key={day} className="py-[1px]">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((day) => {
          const key = dateKey(day);
          const items = byDate[key] ?? [];
          const inMonth = day.getMonth() === viewDate.getMonth();
          const isToday = key === todayKey;
          const overdue = items.some((loan) => loan.status === "overdue");
          const dueSoonLoans = items.filter((loan) => {
            if (!loan.due_date || loan.status === "overdue") return false;
            const daysUntilDue = Math.round(
              (parseDate(loan.due_date).getTime() - todayStart) / 86400000,
            );
            return daysUntilDue >= 0 && daysUntilDue <= 3;
          });
          const isDueSoon = dueSoonLoans.length > 0;
          const visibleFriends = items.slice(0, 2);
          const tooltipLabel = `${calendarDateLabel(day)}: ${items
            .map(
              (loan) =>
                `${loan.borrower?.name ?? `#${loan.id}`} ${fmt(
                  parseFloat(loan.remaining_amount),
                )}`,
            )
            .join(", ")}`;
          const dueSoonLabel = `ใกล้ครบกำหนด: ${dueSoonLoans
            .map((loan) => loan.borrower?.name ?? `#${loan.id}`)
            .join(", ")}`;

          const dayButton = (
            <button
              key={key}
              onClick={() => items[0] && onSelectLoan(items[0])}
              disabled={items.length === 0}
              className={`relative aspect-square min-h-[30px] rounded-md border text-left transition-colors ${
                items.length
                  ? overdue
                    ? "border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20"
                    : "border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20"
                  : "border-transparent hover:bg-muted/40"
              } ${inMonth ? "text-foreground" : "text-muted-foreground/35"}`}
            >
              <span
                className={`absolute left-1 top-1 text-[9px] font-medium ${
                  isToday
                    ? "rounded-full bg-foreground px-1 py-[1px] text-background"
                    : ""
                }`}
              >
                {day.getDate()}
              </span>
              {isDueSoon && (
                <Hint label={dueSoonLabel}>
                  <span className="absolute right-1 top-1 flex h-2.5 w-2.5 items-center justify-center">
                    <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-500/35" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]" />
                  </span>
                </Hint>
              )}
              {items.length > 0 && (
                <span className="absolute bottom-[3px] left-1 right-1 flex items-end justify-between gap-1">
                  <span className="flex min-w-0 -space-x-1">
                    {visibleFriends.map((loan) => (
                      <Avatar
                        key={loan.id}
                        name={loan.borrower?.name ?? `#${loan.id}`}
                        avatar={loan.borrower?.avatar}
                        size="2xs"
                      />
                    ))}
                  </span>
                  <span className="shrink-0 rounded-full bg-background/85 px-1 text-[8px] font-semibold tabular-nums shadow-sm">
                    {items.length > 2 ? `+${items.length - 2}` : items.length}
                  </span>
                </span>
              )}
            </button>
          );

          return items.length > 0 ? (
            <Hint key={key} label={tooltipLabel}>
              {dayButton}
            </Hint>
          ) : (
            dayButton
          );
        })}
      </div>
    </section>
  );
}

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
            <Avatar name={loan.borrower?.name ?? "?"} avatar={loan.borrower?.avatar} size="md" />
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
                รออ่านสลิป ({pendingPayments.length})
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
                        href={proofHref(p.proof_url)}
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
                      {confirmingId === p.id ? "..." : "อ่านแล้ว"}
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
                      className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(p.paid_at).toLocaleDateString("th-TH")}
                          {p.note && ` · ${p.note}`}
                        </p>
                        {p.proof_url && (
                          <a
                            href={proofHref(p.proof_url)}
                            target="_blank"
                            rel="noopener"
                            className="text-[11px] text-emerald-700 underline"
                          >
                            อ่านสลิปแล้ว
                          </a>
                        )}
                      </div>
                      <span className="text-xs font-medium text-emerald-600 tabular-nums shrink-0">
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
  const [proofUrl, setProofUrl] = useState("");
  const [proofName, setProofName] = useState("");

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
    setProofUrl("");
    setProofName("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
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
    if (!proofUrl) {
      toast.error("กรุณาแนบหลักฐาน (รูปสลิปหรือสัญญา)");
      return;
    }
    setLoading(true);
    try {
      await api.createLoan({
        borrower_id: borrowerId as number,
        amount: amt,
        description: desc || undefined,
        due_date: dueDate || undefined,
        proof_url: proofUrl,
      });
      toast.success("เพิ่มรายการสำเร็จ (รอเพื่อนกดยอมรับ)");
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
    if (!proofUrl) {
      toast.error("กรุณาแนบหลักฐาน (รูปใบเสร็จ/สลิปของกลุ่ม)");
      return;
    }
    setLoading(true);
    try {
      await api.createGroup({
        name: tripName.trim(),
        amount_per_person: amt,
        due_date: tripDueDate || undefined,
        members: tripMembers.map((m) => ({ name: m.name, user_id: m.user_id })),
        proof_url: proofUrl,
      });
      toast.success(`สร้างทริป "${tripName}" สำเร็จ! (รอเพื่อนแต่ละคนกดยอมรับ)`);
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
                    filtered.map((m) => {
                      const isPending = m.approval_status === "pending";
                      return (
                        <button
                          key={m.id}
                          disabled={isPending}
                          onClick={() => {
                            setBorrowerId(m.id);
                            setSearch(m.name);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                            isPending
                              ? "opacity-50 cursor-not-allowed bg-muted/20"
                              : borrowerId === m.id
                                ? "bg-foreground/8 font-medium"
                                : "hover:bg-muted/60"
                          }`}
                        >
                          <div>
                            <span className="font-medium">{m.name}</span>
                            {m.email && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {m.email}
                              </span>
                            )}
                          </div>
                          {isPending && (
                            <span className="text-[10px] bg-amber-500/10 text-amber-600 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium shrink-0">
                              ยังไม่เชื่อม LINE
                            </span>
                          )}
                        </button>
                      );
                    })
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
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                หลักฐานการยืมเงิน (รูปสลิปหรือสัญญา) *
              </p>
              <div className="flex flex-col gap-1.5">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer"
                />
                {proofName && (
                  <p className="text-[10px] text-emerald-600 font-medium truncate">
                    📎 {proofName} (แนบแล้ว)
                  </p>
                )}
              </div>
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
                หลักฐานการจ่ายเงิน (รูปใบเสร็จหรือสลิปกลุ่ม) *
              </p>
              <div className="flex flex-col gap-1.5">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  className="text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer"
                />
                {proofName && (
                  <p className="text-[10px] text-emerald-600 font-medium truncate">
                    📎 {proofName} (แนบแล้ว)
                  </p>
                )}
              </div>
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
  const [showCalendar, setShowCalendar] = useState(false);
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
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-10 rounded-xl" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    );

  const activeLoans = loans.filter((l) => l.status !== "settled");
  const settledLoans = loans.filter((l) => l.status === "settled");

  const totalLent = data?.total_lent ?? 0;

  const totalRecovered = loans.reduce((sum, loan) => {
    const total = parseFloat(loan.amount);
    const remaining = parseFloat(loan.remaining_amount);

    return sum + (total - remaining);
  }, 0);

  return (
    <div className="space-y-4 p-1">
      {/* ── Balance donut + lender link ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Donut */}
        <div className="rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-sm font-semibold mb-4">สัดส่วนหนี้</p>

          <BalanceRing lent={totalLent} recovered={totalRecovered} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {/* Lender link */}
        {user?.line_id ? (
          <Hint label="คัดลอกลิงก์สำหรับส่งให้ลูกหนี้">
            <button
              onClick={handleCopyLenderLink}
              className="rounded-2xl border border-border/60 bg-background px-2 py-2 text-left hover:bg-muted/30 transition-colors group"
            >
              {/* <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                ลิงก์ของฉัน
              </p> */}
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
          </Hint>
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

      {/* ── Loan list header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full gap-1 bg-muted/40 p-1 rounded-xl sm:w-auto">
          {(["active", "settled"] as const).map((t) => (
            <Hint
              key={t}
              label={
                t === "active" ? "ดูรายการค้างชำระ" : "ดูรายการที่ชำระครบแล้ว"
              }
            >
              <button
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-all tabular-nums sm:flex-none ${
                  tab === t
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "active"
                  ? `ค้างอยู่${activeLoans.length ? ` (${activeLoans.length})` : ""}`
                  : `ครบแล้ว${settledLoans.length ? ` (${settledLoans.length})` : ""}`}
              </button>
            </Hint>
          ))}
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Hint label="เปิดปฏิทินครบกำหนด">
            <Button
              onClick={() => setShowCalendar(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 px-3 text-xs"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              ปฏิทิน
            </Button>
          </Hint>
          <Hint label="เพิ่มรายการหนี้ใหม่">
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
          </Hint>
        </div>
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
                <Hint label="สร้างรายการหนี้รายการแรก">
                  <button
                    onClick={() => setShowAdd(true)}
                    className="mt-3 text-xs text-primary underline underline-offset-2"
                  >
                    + เพิ่มรายการแรก
                  </button>
                </Hint>
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
      <Sheet open={showCalendar} onOpenChange={setShowCalendar}>
        <SheetContent side="right" className="w-[92vw] sm:max-w-md p-0">
          <SheetHeader className="border-b border-border/60 pr-14">
            <SheetTitle>ปฏิทินครบกำหนด</SheetTitle>
            <SheetDescription>
              ดูวันครบกำหนดของรายการค้างชำระทั้งหมด
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <DashboardCalendar
              loans={activeLoans}
              onSelectLoan={(loan) => {
                setSelectedLoan(loan);
                setShowCalendar(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
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

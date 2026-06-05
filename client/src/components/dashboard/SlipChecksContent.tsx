import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  ReceiptText,
  Search,
  XCircle,
  X,
  ArrowLeft,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { api, type ApiPayment } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

type StatusFilter = "all" | "pending" | "confirmed" | "rejected";
const FILTER_LABELS: Record<StatusFilter, string> = {
  all: "ทั้งหมด",
  pending: "รออ่าน",
  confirmed: "อ่านแล้ว",
  rejected: "ปฏิเสธ",
};

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

function getPillStatus(payment: ApiPayment): "pending" | "confirmed" | "rejected" {
  if (payment.confirmation_status === "rejected") return "rejected";
  if (payment.confirmation_status === "confirmed" && !payment.is_read) return "pending";
  return payment.confirmation_status;
}

function statusText(payment: ApiPayment) {
  const status = getPillStatus(payment);
  if (status === "confirmed") return "อ่านแล้ว";
  if (status === "rejected") return "ปฏิเสธ";
  return "รออ่าน";
}

type StatusStyle = { pill: string; dot: string };

function statusStyle(payment: ApiPayment): StatusStyle {
  const status = getPillStatus(payment);
  if (status === "confirmed")
    return { pill: "bg-[#e8f8f2] text-[#1a9e6a]", dot: "bg-[#1a9e6a]" };
  if (status === "rejected")
    return { pill: "bg-red-50 text-red-500", dot: "bg-red-400" };
  return { pill: "bg-[#fff8e1] text-[#d4860a]", dot: "bg-[#f5a623] animate-pulse" };
}

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function PaymentAvatar({ name, avatar }: { name: string; avatar?: string | null }) {
  if (avatar) {
    return (
      <img
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        src={avatar}
        alt={name}
      />
    );
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </div>
  );
}

function SummaryStrip({ payments }: { payments: ApiPayment[] }) {
  const pending = payments.filter((p) => p.confirmation_status === "pending" || (p.confirmation_status === "confirmed" && !p.is_read));
  const totalPending = pending.reduce((s, p) => s + parseFloat(p.amount), 0);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="rounded-xl border border-border/60 bg-foreground p-4 text-background">
        <p className="text-[10px] font-medium uppercase tracking-widest text-background/60">
          รออ่านสลิป
        </p>
        <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {pending.length}
        </p>
        <p className="mt-1 text-xs text-background/50">รายการชำระ</p>
      </div>
      <div className="rounded-xl border border-border/60 bg-background p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          ยอดรออ่าน
        </p>
        <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {fmt(totalPending)}
        </p>
      </div>
      <div className="rounded-xl border border-border/60 bg-background p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          ทั้งหมด
        </p>
        <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">
          {payments.length}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">รายการ</p>
      </div>
    </div>
  );
}

export function SlipChecksContent() {
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [savingId, setSavingId] = useState<number | null>(null);

  const selected = payments.find((p) => p.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return payments
      .filter((p) => {
        if (!term) return true;
        const borrower = p.loan?.borrower?.name ?? "";
        const note = p.note ?? "";
        const description = p.loan?.description ?? "";
        return `${borrower} ${note} ${description} ${p.id}`.toLowerCase().includes(term);
      })
      .filter((p) => {
        if (filter === "all") return true;
        if (filter === "pending") return p.confirmation_status === "pending" || (p.confirmation_status === "confirmed" && !p.is_read);
        if (filter === "confirmed") return p.confirmation_status === "confirmed" && !!p.is_read;
        return p.confirmation_status === filter;
      });
  }, [payments, query, filter]);

  const activeFilterCount = filter !== "all" ? 1 : 0;
  const hasFilters = query.trim() !== "" || activeFilterCount > 0;

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.slipPayments();
      const rows = Array.isArray(data.data) ? data.data : [];
      setPayments(rows);
    } catch (error: any) {
      toast.error(error.message ?? "โหลดรายการสลิปไม่สำเร็จ");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (payment: ApiPayment) => {
    if (!payment.loan?.id) return;
    setSavingId(payment.id);
    try {
      if (payment.confirmation_status === "pending") {
        await api.confirmPayment(payment.loan.id, payment.id);
      } else {
        await api.readPayment(payment.loan.id, payment.id);
      }
      toast.success("อ่านสลิปแล้ว");
      await load();
    } catch (error: any) {
      toast.error(error.message ?? "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSavingId(null);
    }
  };

  const reject = async (payment: ApiPayment) => {
    if (!payment.loan?.id) return;
    setSavingId(payment.id);
    try {
      await api.rejectPayment(payment.loan.id, payment.id);
      toast("ปฏิเสธสลิปแล้ว");
      await load();
    } catch (error: any) {
      toast.error(error.message ?? "อัปเดตสถานะไม่สำเร็จ");
    } finally {
      setSavingId(null);
    }
  };

  const resetFilters = () => {
    setQuery("");
    setFilter("all");
  };

  const proofUrl = selected?.proof_url ? proofHref(selected.proof_url) : null;
  const mimeType = selected?.proofs?.[0]?.mime_type ?? "";
  const isPdf = mimeType === "application/pdf" || proofUrl?.startsWith("data:application/pdf");

  /* ─── Detail view ─── */
  if (selectedId !== null && selected) {
    const st = statusStyle(selected);
    const name = selected.loan?.borrower?.name ?? `รายการ #${selected.id}`;
    return (
      <div className="space-y-4 p-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedId(null)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <div>
              <h2 className="text-base font-semibold text-foreground">{name}</h2>
              <p className="text-xs text-muted-foreground">
                {new Date(selected.paid_at).toLocaleString("th-TH")}
              </p>
            </div>
          </div>
          <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${st.pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
            {statusText(selected)}
          </span>
        </div>

        {/* Stat strip */}
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-foreground p-4 text-background">
            <p className="text-[10px] font-medium uppercase tracking-widest text-background/60">
              ยอดชำระ
            </p>
            <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">
              {fmt(parseFloat(selected.amount))}
            </p>
          </div>
          {(selected.loan?.description || selected.note) && (
            <div className="rounded-xl border border-border/60 bg-background p-4">
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                หมายเหตุ
              </p>
              <p className="mt-2 text-sm text-foreground">
                {selected.loan?.description ?? selected.note}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {(selected.confirmation_status === "pending" || (selected.confirmation_status === "confirmed" && !selected.is_read)) && (
          <div className="flex gap-2">
            <Button
              className="h-9 flex-1 gap-2 rounded-xl bg-foreground text-background shadow-none hover:bg-foreground/90"
              onClick={() => markRead(selected)}
              disabled={savingId === selected.id}
            >
              <CheckCircle2 className="h-4 w-4" />
              อ่านแล้ว
            </Button>
            {selected.confirmation_status === "pending" && (
              <Button
                variant="outline"
                className="h-9 flex-1 gap-2 rounded-xl text-destructive hover:bg-destructive/5 hover:border-destructive/30"
                onClick={() => reject(selected)}
                disabled={savingId === selected.id}
              >
                <XCircle className="h-4 w-4" />
                ปฏิเสธ
              </Button>
            )}
          </div>
        )}

        {/* Proof */}
        {proofUrl ? (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
            <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
              <p className="text-xs font-medium text-foreground">หลักฐานการชำระเงิน</p>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-lg text-xs" asChild>
                <a href={proofUrl} target="_blank" rel="noopener">
                  <ExternalLink className="h-3 w-3" />
                  เปิดเต็มหน้า
                </a>
              </Button>
            </div>
            <div className="bg-muted/30 p-4">
              {isPdf ? (
                <iframe
                  title="payment slip"
                  src={proofUrl}
                  className="h-[60vh] w-full rounded-lg border border-border/60 bg-background"
                />
              ) : (
                <div className="flex items-start justify-center overflow-auto rounded-lg border border-border/60 bg-background p-4">
                  <img
                    src={proofUrl}
                    alt="สลิปชำระเงิน"
                    className="max-h-[65vh] max-w-full rounded-md object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-background py-14 text-center">
            <FileText className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">ไม่มีไฟล์สลิป</p>
          </div>
        )}
      </div>
    );
  }

  /* ─── List view ─── */
  return (
    <div className="space-y-4 p-1">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">เช็คสลิป</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "กำลังโหลด..." : `${payments.length} รายการ`}
          </p>
        </div>
      </div>

      {/* Summary strip */}
      {!loading && <SummaryStrip payments={payments} />}

      {/* Search + filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาชื่อลูกหนี้ / หมายเหตุ"
            className="h-9 pl-9 pr-8 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="ล้างคำค้น"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeFilterCount ? "default" : "outline"}
              size="sm"
              className="h-9 shrink-0 gap-1 px-2.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-semibold">{activeFilterCount}</span>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
              แสดง
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={(v) => setFilter(v as StatusFilter)}
            >
              {(Object.keys(FILTER_LABELS) as StatusFilter[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {FILTER_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {hasFilters && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={resetFilters}
                  className="w-full px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground"
                >
                  ล้างตัวกรอง
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter result count */}
      {!loading && hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            แสดง {filtered.length} จาก {payments.length} รายการ
          </p>
          <button
            onClick={resetFilters}
            className="text-xs text-primary underline underline-offset-2"
          >
            ล้าง
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 bg-background py-14 text-center">
          <ReceiptText className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">
            {hasFilters ? "ไม่พบสลิปตามตัวกรอง" : "ยังไม่มีสลิปให้ตรวจ"}
          </p>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-primary underline underline-offset-2"
            >
              ล้างตัวกรอง
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="divide-y divide-border/50">
            {filtered.map((payment) => {
              const st = statusStyle(payment);
              const name = payment.loan?.borrower?.name ?? `รายการ #${payment.id}`;
              return (
                <button
                  key={payment.id}
                  onClick={() => setSelectedId(payment.id)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
                >
                  <PaymentAvatar name={name} avatar={payment.loan?.borrower?.avatar} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {new Date(payment.paid_at).toLocaleDateString("th-TH")}
                      {payment.note && ` · ${payment.note}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <p className="text-sm font-semibold tabular-nums text-foreground">
                      {fmt(parseFloat(payment.amount))}
                    </p>
                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${st.pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                      {statusText(payment)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
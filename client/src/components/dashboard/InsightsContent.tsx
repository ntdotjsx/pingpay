import { useEffect, useMemo, useState } from "react";
import { api, type CreditorInsights } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, BarChart3, CheckCircle2, Clock3, WalletCards } from "lucide-react";

function Metric({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "strong" | "warn";
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        tone === "strong"
          ? "border-transparent bg-foreground text-background"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200"
            : "border-border/60 bg-background"
      }`}
    >
      <p className={`text-[10px] font-medium uppercase tracking-widest ${tone === "strong" ? "text-background/60" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-none tabular-nums">{value}</p>
      {sub && <p className={`mt-2 text-xs ${tone === "strong" ? "text-background/60" : "text-muted-foreground"}`}>{sub}</p>}
    </div>
  );
}

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-medium tabular-nums text-foreground">{fmt(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function InsightsContent() {
  const [data, setData] = useState<CreditorInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCreditorInsights()
      .then(setData)
      .catch(() => toast.error("โหลดสถิติไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const maxDebtor = useMemo(
    () => Math.max(...(data?.top_debtors.map((item) => item.outstanding) ?? [0])),
    [data],
  );
  const maxMonthly = useMemo(
    () => Math.max(...(data?.monthly_recovery.map((item) => item.amount) ?? [0])),
    [data],
  );

  if (loading || !data) {
    return (
      <div className="space-y-3 p-1">
        <div className="grid gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">สถิติฝั่งเจ้าหนี้</h2>
          <p className="text-xs text-muted-foreground">ภาพรวมยอดให้ยืม การคืนเงิน และรายการที่ต้องตาม</p>
        </div>
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <BarChart3 className="h-3.5 w-3.5" />
          Creditor-only
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="ยอดค้างรับ" value={fmt(data.outstanding)} sub={`${data.active_loans_count} รายการ active`} tone="strong" />
        <Metric label="คืนแล้ว" value={fmt(data.recovered)} sub={`${data.recovery_rate}% ของยอดให้ยืม`} />
        <Metric label="เกินกำหนด" value={fmt(data.overdue_amount)} sub="ยอดที่ควรติดตามก่อน" tone="warn" />
        <Metric label="รอยืนยัน" value={String(data.pending_confirmations)} sub="รายการชำระที่ส่งเข้ามา" />
      </div>

      <section className="rounded-xl border border-border/60 bg-background p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <WalletCards className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">ประสิทธิภาพการคืนเงิน</h3>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{fmt(data.total_lent)} ทั้งหมด</span>
        </div>
        <Progress value={data.recovery_rate} className="h-2" />
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg bg-muted/35 p-3">
            <p>ยอดเฉลี่ยต่อรายการ</p>
            <p className="mt-1 font-semibold text-foreground tabular-nums">{fmt(data.average_ticket)}</p>
          </div>
          <div className="rounded-lg bg-muted/35 p-3">
            <p>ปิดแล้ว</p>
            <p className="mt-1 font-semibold text-foreground tabular-nums">{data.settled_loans_count} รายการ</p>
          </div>
          <div className="rounded-lg bg-muted/35 p-3">
            <p>ยัง active</p>
            <p className="mt-1 font-semibold text-foreground tabular-nums">{data.active_loans_count} รายการ</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-xl border border-border/60 bg-background p-4">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">ลูกหนี้ที่ค้างสูงสุด</h3>
          </div>
          {data.top_debtors.length ? (
            <div className="space-y-3">
              {data.top_debtors.map((item) => (
                <Bar key={item.borrower_id} label={`${item.borrower.name} (${item.loan_count})`} value={item.outstanding} max={maxDebtor} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
              <p className="text-sm text-muted-foreground">ไม่มีรายการค้างรับ</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border/60 bg-background p-4">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">ยอดคืนรายเดือน</h3>
          </div>
          {data.monthly_recovery.length ? (
            <div className="space-y-3">
              {data.monthly_recovery.map((item) => (
                <Bar key={item.month} label={item.month} value={item.amount} max={maxMonthly} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการคืนเงินที่ยืนยันแล้ว</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

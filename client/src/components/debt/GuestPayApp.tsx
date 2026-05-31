// GuestPayApp.tsx — หน้าที่ลูกหนี้เปิดจาก guest link แล้วแจ้งชำระ
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api, type GuestLoan } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  // path: /checkout/TOKEN
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || null;
}

export default function GuestPayApp() {
  const [loan, setLoan] = useState<GuestLoan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"full" | "part">("full");
  const [partAmt, setPartAmt] = useState("");
  const [slip, setSlip] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = getToken();

  useEffect(() => {
    if (!token) { setError("ไม่พบ link"); setLoading(false); return; }
    api.getGuestLoan(token)
      .then(setLoan)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePay = async () => {
    if (!loan || !token) return;
    const owed = loan.remaining;
    const amount = mode === "full" ? owed : parseFloat(partAmt) || 0;
    if (amount <= 0) { toast.error("กรุณาใส่จำนวนเงิน"); return; }
    if (amount > owed) { toast.error("จำนวนเงินมากเกินยอดค้าง"); return; }

    setSubmitting(true);
    try {
      await api.guestPay(token, { amount, note: note || undefined, slip: slip || undefined });
      setSuccess(true);
      toast.success("แจ้งชำระสำเร็จ รอเจ้าหนี้ยืนยัน");
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-2xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
  );

  if (error) return (
    <div className="text-center py-16 text-muted-foreground">
      <p className="text-4xl mb-3">😕</p>
      <p className="font-medium text-foreground">{error}</p>
      <p className="text-sm mt-1">ลิงก์นี้อาจหมดอายุหรือไม่ถูกต้อง</p>
    </div>
  );

  if (!loan) return null;

  const owed = loan.remaining;
  const pct = Math.round(loan.paid_percentage);
  const settled = loan.status === "settled";

  if (success || settled) return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4">{settled ? "🎉" : "✅"}</p>
      <h2 className="text-xl font-medium text-foreground mb-2">
        {settled ? "ชำระครบแล้ว!" : "แจ้งชำระสำเร็จ"}
      </h2>
      <p className="text-sm text-muted-foreground">
        {settled
          ? "รายการนี้ปิดแล้ว ขอบคุณที่ชำระครบ"
          : "รอเจ้าหนี้ยืนยัน — ระบบจะอัปเดตยอดหลังจากนั้น"}
      </p>
    </div>
  );

  const quickAmounts = [
    Math.ceil((owed * 0.25) / 100) * 100,
    Math.ceil((owed * 0.5) / 100) * 100,
    owed,
  ].filter((v, i, a) => a.indexOf(v) === i && v > 0);

  return (
    <div className="space-y-4">
      {/* Lender info */}
      <div className="flex items-center gap-4 mb-6">
        <img
          className="w-14 h-14 rounded-xl object-cover"
          src={loan.lender.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.lender.name)}&background=random`}
          alt={loan.lender.name}
        />
        <div>
          <h1 className="text-xl font-medium text-foreground leading-tight">
            ชำระหนี้ให้ {loan.lender.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loan.description ?? "ไม่มีหมายเหตุ"}
          </p>
        </div>
      </div>

      {/* Amount summary */}
      <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ยอดรวมทั้งหมด</span>
          <span className="text-sm font-medium">{fmt(loan.amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">ชำระแล้ว</span>
          <span className="text-sm font-medium text-emerald-600">{fmt(loan.paid_amount)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">ยังค้างอยู่</span>
          <span className="text-lg font-bold text-destructive">{fmt(owed)}</span>
        </div>
        {pct > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>ความคืบหน้า</span>
              <span>{pct}%</span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
        )}
        {loan.is_overdue && (
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 text-xs">
            เกินกำหนด
          </Badge>
        )}
      </div>

      {/* Payment mode */}
      <div className="grid grid-cols-2 gap-2">
        {(["full", "part"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`border rounded-xl p-3.5 text-center transition-all ${
              mode === m
                ? "border-2 border-foreground bg-foreground/5"
                : "border-border bg-muted/30"
            }`}
          >
            {m === "full" ? (
              <>
                <svg className="w-5 h-5 mx-auto mb-1 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <p className="text-sm font-medium text-foreground">จ่ายหมดเลย</p>
                <p className="text-xs text-muted-foreground mt-0.5">{fmt(owed)}</p>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mx-auto mb-1 stroke-current text-muted-foreground" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                <p className="text-sm font-medium text-foreground">ผ่อนจ่าย</p>
                <p className="text-xs text-muted-foreground mt-0.5">จ่ายบางส่วน</p>
              </>
            )}
          </button>
        ))}
      </div>

      {/* Partial amount */}
      {mode === "part" && (
        <div className="bg-muted/50 rounded-xl p-3.5 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">จำนวนที่จ่าย</p>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">฿</span>
            <Input
              type="number"
              placeholder="0"
              value={partAmt}
              onChange={(e) => setPartAmt(e.target.value)}
              className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {quickAmounts.map((q) => (
              <button
                key={q}
                onClick={() => setPartAmt(String(q))}
                className="text-xs px-2.5 py-1 rounded-lg bg-background border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                {fmt(q)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note + Slip */}
      <div className="space-y-2">
        <Input
          placeholder="หมายเหตุ (ไม่บังคับ)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2.5 text-sm text-muted-foreground cursor-pointer hover:border-foreground/30 transition-colors"
          onClick={() => document.getElementById("slip-input")?.click()}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
          </svg>
          {slip ? slip.name : "แนบสลิป (ไม่บังคับ)"}
          <input
            id="slip-input"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => setSlip(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {/* Submit */}
      <Button className="w-full" size="lg" onClick={handlePay} disabled={submitting}>
        {submitting ? "กำลังส่ง..." : "ยืนยันแจ้งชำระ"}
      </Button>

      {/* Payment history */}
      {loan.payments.filter((p) => p.confirmation_status === "confirmed").length > 0 && (
        <div className="pt-2">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2">
            ประวัติการชำระ
          </p>
          <div className="bg-background rounded-2xl overflow-hidden">
            {loan.payments
              .filter((p) => p.confirmation_status === "confirmed")
              .map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 border-b border-border last:border-b-0">
                  <div>
                    <p className="text-xs font-medium text-foreground">{new Date(p.paid_at).toLocaleDateString("th-TH")}</p>
                    {p.note && <p className="text-[11px] text-muted-foreground">{p.note}</p>}
                  </div>
                  <span className="text-sm font-medium text-emerald-600">{fmt(parseFloat(p.amount))}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

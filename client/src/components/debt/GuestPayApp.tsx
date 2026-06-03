// GuestPayApp.tsx — หน้าลูกหนี้แจ้งชำระ
// Flow: เลือกจำนวน → แสดง QR PromptPay → แนบสลิป → verify SlipOK → submit
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { api, type GuestLoan, type CheckoutInfo, type PromptPayQr, type SlipVerifyResult } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || null;
}

type Step =
  | "amount"      // เลือกจำนวน
  | "qr"          // แสดง QR + รอชำระ
  | "slip"        // แนบสลิป + verify
  | "done";       // สำเร็จ

// ──────────────────────────────────────────────
//  Main component
// ──────────────────────────────────────────────
export default function GuestPayApp() {
  const token = getToken();

  // ── ข้อมูลหลัก ──
  const [loan, setLoan] = useState<GuestLoan | null>(null);
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── step ──
  const [step, setStep] = useState<Step>("amount");

  // ── amount step ──
  const [mode, setMode] = useState<"full" | "part">("full");
  const [partAmt, setPartAmt] = useState("");
  const [note, setNote] = useState("");

  // ── QR step ──
  const [qrData, setQrData] = useState<PromptPayQr | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // ── slip step ──
  const [slip, setSlip] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SlipVerifyResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── โหลดข้อมูล ──
  useEffect(() => {
    if (!token) { setError("ไม่พบ link"); setLoading(false); return; }
    Promise.all([
      api.getGuestLoan(token),
      api.getCheckoutInfo(token).catch(() => null),
    ])
      .then(([l, c]) => { setLoan(l); setInfo(c); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // ──────────────────────────────────────────────
  //  Derived
  // ──────────────────────────────────────────────
  const owed = loan?.remaining ?? 0;
  const amount = mode === "full" ? owed : parseFloat(partAmt) || 0;
  const canPromptPay = info?.payment_capabilities?.promptpay ?? false;
  const canSlipOk    = info?.payment_capabilities?.slipok ?? false;

  // ──────────────────────────────────────────────
  //  Step: amount → QR
  // ──────────────────────────────────────────────
  const handleGoQr = async () => {
    if (!token) return;
    if (amount <= 0) { toast.error("กรุณาใส่จำนวนเงิน"); return; }
    if (amount > owed) { toast.error("จำนวนเงินมากเกินยอดค้าง"); return; }

    setQrLoading(true);
    try {
      const qr = await api.getPromptPayQr(token, amount);
      setQrData(qr);
      setStep("qr");
    } catch (e: any) {
      toast.error(e.message ?? "สร้าง QR ไม่สำเร็จ");
    } finally {
      setQrLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Step: QR → slip (ผู้ใช้กดว่าชำระแล้ว)
  // ──────────────────────────────────────────────
  const handlePaidAlready = () => setStep("slip");

  // ──────────────────────────────────────────────
  //  Step: verify slip
  // ──────────────────────────────────────────────
  const handleVerify = async () => {
    if (!token || !slip) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await api.verifySlip(token, { slip, amount });
      setVerifyResult(result);
      if (!result.verified) {
        toast.error("สลิปไม่ผ่าน: " + result.message);
      } else {
        toast.success("สลิปผ่านแล้ว!");
      }
    } catch (e: any) {
      toast.error(e.message ?? "ตรวจสอบสลิปไม่สำเร็จ");
    } finally {
      setVerifying(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Submit payment
  // ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!loan || !token) return;
    setSubmitting(true);
    try {
      await api.guestPay(token, {
        amount,
        note: note || undefined,
        slip: slip || undefined,
      });
      setStep("done");
      toast.success("แจ้งชำระสำเร็จ รอเจ้าหนี้ยืนยัน");
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Loading / error / done states
  // ──────────────────────────────────────────────
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

  const settled = loan.status === "settled";

  if (step === "done" || settled) return (
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

  const pct = Math.round(loan.paid_percentage);
  const quickAmounts = [
    Math.ceil((owed * 0.25) / 100) * 100,
    Math.ceil((owed * 0.5) / 100) * 100,
    owed,
  ].filter((v, i, a) => a.indexOf(v) === i && v > 0);

  // ──────────────────────────────────────────────
  //  Shared: lender card + debt summary
  // ──────────────────────────────────────────────
  const LenderCard = () => (
    <div className="flex items-center gap-4 mb-2">
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
  );

  const DebtSummary = () => (
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
            <span>ความคืบหน้า</span><span>{pct}%</span>
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
  );

  // ──────────────────────────────────────────────
  //  STEP: amount
  // ──────────────────────────────────────────────
  if (step === "amount") return (
    <div className="space-y-4">
      <LenderCard />
      <DebtSummary />

      {/* mode toggle */}
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

      {/* partial amount input */}
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

      {/* note */}
      <Input
        placeholder="หมายเหตุ (ไม่บังคับ)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {/* CTA */}
      {canPromptPay ? (
        <Button className="w-full" size="lg" onClick={handleGoQr} disabled={qrLoading || amount <= 0}>
          {qrLoading ? "กำลังสร้าง QR..." : (
            <span className="flex items-center gap-2">
              <QrIcon /> สร้าง QR PromptPay {amount > 0 ? fmt(amount) : ""}
            </span>
          )}
        </Button>
      ) : (
        // ไม่มี PromptPay → ข้ามไป slip โดยตรง
        <Button className="w-full" size="lg" onClick={() => setStep("slip")} disabled={amount <= 0}>
          ต่อไป — แนบสลิป
        </Button>
      )}

      <PaymentHistory loan={loan} />
    </div>
  );

  // ──────────────────────────────────────────────
  //  STEP: qr
  // ──────────────────────────────────────────────
  if (step === "qr") return (
    <div className="space-y-5">
      <LenderCard />

      {/* QR card */}
      <div className="bg-muted/40 rounded-2xl p-5 flex flex-col items-center gap-4">
        <div className="flex justify-between w-full text-sm">
          <span className="text-muted-foreground">ยอดที่ต้องชำระ</span>
          <span className="font-bold text-foreground text-base">{qrData ? fmt(qrData.amount) : ""}</span>
        </div>
        {qrData ? (
          <img
            src={qrData.qr_data_uri}
            alt="PromptPay QR"
            className="w-56 h-56 rounded-xl border border-border"
          />
        ) : (
          <Skeleton className="w-56 h-56 rounded-xl" />
        )}
        <p className="text-xs text-muted-foreground text-center">
          สแกน QR ด้วย Mobile Banking<br />
          <span className="font-medium text-foreground">{qrData?.recipient}</span>
        </p>
      </div>

      {/* รอชำระ badge */}
      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <span className="text-amber-500 text-lg">⏳</span>
        <p className="text-sm text-amber-800">โอนเงินแล้วกด "ชำระแล้ว" เพื่อส่งสลิปยืนยัน</p>
      </div>

      <Button className="w-full" size="lg" onClick={handlePaidAlready}>
        ชำระแล้ว — แนบสลิปยืนยัน
      </Button>
      <button
        onClick={() => setStep("amount")}
        className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
      >
        ← ย้อนกลับ
      </button>
    </div>
  );

  // ──────────────────────────────────────────────
  //  STEP: slip
  // ──────────────────────────────────────────────
  if (step === "slip") return (
    <div className="space-y-4">
      <LenderCard />

      {/* amount reminder */}
      <div className="flex justify-between items-center bg-muted/40 rounded-xl px-4 py-3">
        <span className="text-sm text-muted-foreground">จำนวนที่แจ้งชำระ</span>
        <span className="font-bold text-foreground">{fmt(amount)}</span>
      </div>

      {/* slip upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
          slip
            ? "border-emerald-400 bg-emerald-50"
            : "border-border bg-muted/20 hover:border-foreground/40"
        }`}
      >
        {slip ? (
          <>
            <span className="text-3xl">🧾</span>
            <p className="text-sm font-medium text-emerald-700">{slip.name}</p>
            <p className="text-xs text-muted-foreground">แตะเพื่อเปลี่ยนไฟล์</p>
          </>
        ) : (
          <>
            <span className="text-3xl">📎</span>
            <p className="text-sm font-medium text-foreground">แนบสลิปการโอน</p>
            <p className="text-xs text-muted-foreground">JPG, PNG หรือ PDF — สูงสุด 5 MB</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            setSlip(e.target.files?.[0] ?? null);
            setVerifyResult(null);
          }}
        />
      </div>

      {/* verify result */}
      {verifyResult && (
        <div className={`rounded-xl px-4 py-3 flex items-start gap-3 ${
          verifyResult.verified
            ? "bg-emerald-50 border border-emerald-200"
            : "bg-red-50 border border-red-200"
        }`}>
          <span className="text-xl">{verifyResult.verified ? "✅" : "❌"}</span>
          <div>
            <p className={`text-sm font-medium ${verifyResult.verified ? "text-emerald-800" : "text-red-800"}`}>
              {verifyResult.message}
            </p>
            {verifyResult.verified && verifyResult.data?.transRef && (
              <p className="text-xs text-muted-foreground mt-0.5">
                รหัสอ้างอิง: {verifyResult.data.transRef}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SlipOK verify button */}
      {canSlipOk && slip && !verifyResult?.verified && (
        <Button
          variant="outline"
          className="w-full"
          onClick={handleVerify}
          disabled={verifying}
        >
          {verifying ? "กำลังตรวจสอบสลิป..." : (
            <span className="flex items-center gap-2">
              <span>🔍</span> ตรวจสอบสลิปด้วย SlipOK
            </span>
          )}
        </Button>
      )}

      {/* submit */}
      <Button
        className="w-full"
        size="lg"
        onClick={handleSubmit}
        disabled={submitting || (canSlipOk && slip != null && !verifyResult?.verified)}
      >
        {submitting ? "กำลังส่ง..." : (
          verifyResult?.verified ? "✅ ยืนยันแจ้งชำระ" : "ส่งแจ้งชำระ (รอเจ้าหนี้ยืนยัน)"
        )}
      </Button>

      {canSlipOk && slip && !verifyResult?.verified && (
        <p className="text-xs text-center text-muted-foreground">
          กรุณาตรวจสอบสลิปก่อนส่ง หรือส่งโดยไม่ต้องตรวจสอบได้เช่นกัน
        </p>
      )}

      <button
        onClick={() => setStep(canPromptPay ? "qr" : "amount")}
        className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1 transition-colors"
      >
        ← ย้อนกลับ
      </button>
    </div>
  );

  return null;
}

// ──────────────────────────────────────────────
//  Sub-components
// ──────────────────────────────────────────────
function PaymentHistory({ loan }: { loan: GuestLoan }) {
  const confirmed = loan.payments.filter((p) => p.confirmation_status === "confirmed");
  if (confirmed.length === 0) return null;
  return (
    <div className="pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2">
        ประวัติการชำระ
      </p>
      <div className="bg-background rounded-2xl overflow-hidden">
        {confirmed.map((p) => (
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
  );
}

function QrIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3M17 14v3" />
    </svg>
  );
}
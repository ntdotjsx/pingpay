// GuestPayApp.tsx — หน้าลูกหนี้แจ้งชำระ
// Flow: เลือกจำนวน → แสดง QR PromptPay → แนบสลิป → verify SlipOK → submit
import { useState, useEffect, useRef } from 'react';
import {
  api,
  type GuestLoan,
  type CheckoutInfo,
  type PromptPayQr,
  type SlipVerifyResult,
} from '@/lib/api';
import { fmt } from '@/lib/debtStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '';

// ──────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const parts = window.location.pathname.split('/');
  return parts[parts.length - 1] || null;
}

type Step =
  | 'amount' // เลือกจำนวน
  | 'qr' // แสดง QR + รอชำระ
  | 'slip' // แนบสลิป + verify
  | 'done'; // สำเร็จ

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
  const [approving, setApproving] = useState(false);

  const handleApproveLoan = async () => {
    if (!token) return;
    setApproving(true);
    try {
      await api.guestApproveLoan(token);
      alert('ยืนยันรายการยืมเงินสำเร็จ!');
      setLoading(true);
      const res = await api.getGuestLoan(token);
      setLoan(res);
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
      setApproving(false);
    }
  };

  // ── step ──
  const [step, setStep] = useState<Step>('amount');

  // ── payment method & bank transfer fields ──
  const [paymentMethod, setPaymentMethod] = useState<'promptpay' | 'bank'>(
    'promptpay',
  );
  const [bankAmount, setBankAmount] = useState('');

  // ── amount step ──
  const [mode, setMode] = useState<'full' | 'part'>('full');
  const [partAmt, setPartAmt] = useState('');
  const [partAmtError, setPartAmtError] = useState(false);
  const [partAmtShake, setPartAmtShake] = useState(false);
  const [partAmtErrorMessage, setPartAmtErrorMessage] = useState('');
  const [note, setNote] = useState('');

  // ── QR step ──
  const [qrData, setQrData] = useState<PromptPayQr | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // ── slip step ──
  const [slip, setSlip] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<SlipVerifyResult | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qrGeneratedRef = useRef(false);
  const generateQrButtonRef = useRef<HTMLButtonElement>(null);

  // ── โหลดข้อมูล ──
  useEffect(() => {
    if (!token) {
      setError('ไม่พบ link');
      setLoading(false);
      return;
    }

    // Check if redirected from LINE bind
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('bind_success') === 'true') {
        alert('เชื่อมต่อบัญชี LINE สำเร็จแล้ว!');
        // Clean up url parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }

    Promise.all([
      api.getGuestLoan(token),
      api.getCheckoutInfo(token).catch(() => null),
    ])
      .then(([l, c]) => {
        setLoan(l);
        setInfo(c);
        if (c?.payment_capabilities) {
          if (
            !c.payment_capabilities.promptpay &&
            c.payment_capabilities.bank
          ) {
            setPaymentMethod('bank');
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  // ──────────────────────────────────────────────
  //  Derived
  // ──────────────────────────────────────────────
  const owed = loan?.remaining ? parseFloat(loan.remaining as any) : 0;
  const canPromptPay = info?.payment_capabilities?.promptpay ?? false;
  const canBank = info?.payment_capabilities?.bank ?? false;
  const canSlipOk = info?.payment_capabilities?.slipok ?? false;

  const promptpayAmount = mode === 'full' ? owed : parseFloat(partAmt) || 0;
  const bankResolvedAmount = canSlipOk
    ? undefined
    : parseFloat(bankAmount) || 0;

  // For display of amount reminder or general uses
  const amount =
    paymentMethod === 'promptpay' ? promptpayAmount : bankResolvedAmount;

  // ──────────────────────────────────────────────
  //  Step: amount → QR
  // ──────────────────────────────────────────────
  const handleGoQr = async () => {
    if (!token) return;
    if (promptpayAmount <= 0) {
      const msg = 'กรุณาใส่จำนวนเงิน';
      alert(msg);
      setPartAmtError(true);
      setPartAmtShake(true);
      setPartAmtErrorMessage(msg);
      setTimeout(() => setPartAmtShake(false), 400);
      return;
    }
    if (promptpayAmount > owed) {
      const msg = 'จำนวนเงินมากเกินยอดค้าง';
      alert(msg);
      setPartAmtError(true);
      setPartAmtShake(true);
      setPartAmtErrorMessage(msg);
      setTimeout(() => setPartAmtShake(false), 400);
      return;
    }

    setQrLoading(true);
    try {
      const recipient = info?.lender?.promptpay_target;
      if (!recipient) {
        alert('เจ้าหนี้ยังไม่ได้ตั้งค่า PromptPay หรือเบอร์โทรศัพท์');
        return;
      }
      const payload = generatePayload(recipient, { amount: promptpayAmount });
      const qr_data_uri = await QRCode.toDataURL(payload, {
        width: 360,
        margin: 2,
      });

      setQrData({
        recipient,
        amount: promptpayAmount,
        qr_data_uri,
        format: 'png',
        size: 360,
      });
      setStep('qr');
    } catch (e: any) {
      alert(e.message ?? 'สร้าง QR ไม่สำเร็จ');
    } finally {
      setQrLoading(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Step: QR → slip (ผู้ใช้กดว่าชำระแล้ว)
  // ──────────────────────────────────────────────
  const handlePaidAlready = () => setStep('slip');

  // ──────────────────────────────────────────────
  //  Step: verify slip
  // ──────────────────────────────────────────────
  const handleVerify = async (): Promise<SlipVerifyResult | null> => {
    if (!token || !slip) return null;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const verifyAmt =
        paymentMethod === 'promptpay' ? promptpayAmount : bankResolvedAmount;
      const result = await api.verifySlip(token, { slip, amount: verifyAmt });
      setVerifyResult(result);
      if (!result.verified) {
        alert('สลิปไม่ผ่าน: ' + result.message);
      } else {
        alert('สลิปผ่านแล้ว!');
      }
      return result;
    } catch (e: any) {
      alert(e.message ?? 'ตรวจสอบสลิปไม่สำเร็จ');
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Submit payment
  // ──────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!loan || !token) return;
    if (!slip) {
      alert('กรุณาอัปโหลดสลิปการโอนเงินเพื่อแจ้งชำระเงิน');
      return;
    }
    setSubmitting(true);
    try {
      const verifyAmt =
        paymentMethod === 'promptpay' ? promptpayAmount : bankResolvedAmount;
      if (canSlipOk && !verifyResult?.verified) {
        const result = await handleVerify();
        if (!result?.verified) {
          setSubmitting(false);
          return;
        }
      }

      await api.guestPay(token, {
        amount: verifyAmt,
        note: note || undefined,
        slip: slip,
      });
      setStep('done');
      alert(slip ? 'อ่านสลิปแล้ว บันทึกการชำระสำเร็จ' : 'บันทึกการชำระสำเร็จ');
    } catch (e: any) {
      alert(e.message ?? 'เกิดข้อผิดพลาด');
    } finally {
      setSubmitting(false);
    }
  };

  // ──────────────────────────────────────────────
  //  Loading / error / done states
  // ──────────────────────────────────────────────
  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );

  if (error)
    return (
      <div className="text-muted-foreground py-16 text-center">
        <p className="mb-3 text-4xl">😕</p>
        <p className="text-foreground font-medium">{error}</p>
        <p className="mt-1 text-sm">ลิงก์นี้อาจหมดอายุหรือไม่ถูกต้อง</p>
      </div>
    );

  if (!loan) return null;

  const settled = loan.status === 'settled';
  const pendingApproval = (loan.status as string) === 'pending_approval';

  if (pendingApproval) {
    const hasProof = !!loan.proofs?.[0] || !!(loan as any).proof_url;
    const proofUrl =
      (loan as any).proof_url ||
      (loan.proofs?.[0]
        ? loan.proofs[0].file_path === 'base64'
          ? (loan as any).proof_url
          : `${API_BASE}${loan.proofs[0].file_path}`
        : null);
    const mimeType = loan.proofs?.[0]?.mime_type ?? '';
    const isPdf =
      mimeType === 'application/pdf' ||
      (proofUrl && proofUrl.startsWith('data:application/pdf'));

    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 space-y-5 duration-300">
        {/* Banner */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-300">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 p-2 text-white shadow-sm shadow-amber-500/25">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold">รอการอนุมัติรายการหนี้</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed opacity-90">
              คุณ {loan.borrower?.name ?? 'ลูกหนี้'}{' '}
              โปรดตรวจสอบรายละเอียดและหลักฐานด้านล่าง หากถูกต้อง กรุณากดปุ่ม
              "ยืนยันรายการยืมเงิน" เพื่อยืนยันข้อมูล
            </p>
          </div>
        </div>

        {/* Lender details */}
        <div className="bg-background border-border space-y-4 rounded-2xl border p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <img
              className="h-12 w-12 rounded-xl object-cover"
              src={
                loan.lender.avatar ??
                `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.lender.name)}&background=random`
              }
              alt={loan.lender.name}
            />
            <div>
              <p className="text-muted-foreground text-xs">เจ้าหนี้</p>
              <h2 className="text-foreground text-sm leading-tight font-semibold">
                {loan.lender.name}
              </h2>
            </div>
          </div>

          <div className="bg-border/60 h-px" />

          {/* Amount details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">ยอดเงินยืม</p>
              <p className="text-foreground mt-0.5 text-xl font-bold">
                {fmt(loan.amount)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">วันที่ยืม</p>
              <p className="text-foreground mt-1 text-sm font-semibold">
                {new Date(loan.loan_date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          {loan.description && (
            <div>
              <p className="text-muted-foreground text-xs">
                หมายเหตุ/รายละเอียด
              </p>
              <p className="text-foreground bg-muted/30 border-border/50 mt-1 rounded-xl border px-3 py-2 text-sm leading-relaxed">
                {loan.description}
              </p>
            </div>
          )}

          {loan.due_date && (
            <div>
              <p className="text-muted-foreground text-xs">วันครบกำหนดชำระ</p>
              <p className="mt-0.5 text-sm font-medium text-amber-600">
                {new Date(loan.due_date).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          )}
        </div>

        {/* Evidence / Proof Section */}
        {hasProof && proofUrl && (
          <div className="bg-background border-border space-y-3 rounded-2xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-xs font-semibold">
              หลักฐาน/เอกสารแนบจากเจ้าหนี้
            </p>
            <div className="border-border/70 bg-muted/10 flex justify-center overflow-hidden rounded-xl border p-2">
              {isPdf ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center gap-2 py-4 text-xs font-medium hover:underline"
                >
                  📄 ดูเอกสาร PDF (คลิกเพื่อเปิดในแท็บใหม่)
                </a>
              ) : (
                <img
                  src={proofUrl}
                  alt="หลักฐานการยืมเงิน"
                  className="border-border/50 max-h-[350px] w-auto rounded-lg border object-contain shadow-sm"
                />
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2.5">
          <Button
            onClick={handleApproveLoan}
            disabled={approving}
            className="h-11 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-sm font-medium text-white shadow-md shadow-emerald-500/10 transition-all duration-200 hover:from-emerald-600 hover:to-green-700"
            size="lg"
          >
            {approving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                กำลังยืนยัน...
              </span>
            ) : (
              'ยืนยันรายการยืมเงิน'
            )}
          </Button>
          <p className="text-muted-foreground text-center text-[10px] leading-relaxed">
            * เมื่อกดยืนยัน ระบบจะเริ่มติดตามการชำระเงินและแจ้งเตือนผ่าน LINE
          </p>
        </div>
      </div>
    );
  }

  if (step === 'done' || settled)
    return (
      <div className="py-16 text-center">
        <p className="mb-4 text-5xl">{settled ? '🎉' : '✅'}</p>
        <h2 className="text-foreground mb-2 text-xl font-medium">
          {settled ? 'ชำระครบแล้ว!' : 'แจ้งชำระสำเร็จ'}
        </h2>
        <p className="text-muted-foreground text-sm">
          {settled
            ? 'รายการนี้ปิดแล้ว ขอบคุณที่ชำระครบ'
            : 'ระบบอ่านสลิปและอัปเดตยอดให้อัตโนมัติแล้ว'}
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
    <div className="mb-2 flex items-center gap-4">
      <img
        className="h-14 w-14 rounded-xl object-cover"
        src={
          loan.lender.avatar ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(loan.lender.name)}&background=random`
        }
        alt={loan.lender.name}
      />
      <div>
        <h1 className="text-foreground text-xl leading-tight font-medium">
          ชำระหนี้ให้ {loan.lender.name}
        </h1>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {loan.description ?? 'ไม่มีหมายเหตุ'}
        </p>
      </div>
    </div>
  );

  const DebtSummary = () => (
    <div className="bg-muted/40 space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">ยอดรวมทั้งหมด</span>
        <span className="text-sm font-medium">{fmt(loan.amount)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">ชำระแล้ว</span>
        <span className="text-sm font-medium text-emerald-600">
          {fmt(loan.paid_amount)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">ยังค้างอยู่</span>
        <span className="text-destructive text-lg font-bold">{fmt(owed)}</span>
      </div>
      {pct > 0 && (
        <div className="space-y-1">
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>ความคืบหน้า</span>
            <span>{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>
      )}
      {loan.is_overdue && (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-xs text-red-600"
        >
          เกินกำหนด
        </Badge>
      )}
    </div>
  );

  // ──────────────────────────────────────────────
  //  STEP: amount
  // ──────────────────────────────────────────────
  if (step === 'amount')
    return (
      <div className="space-y-4">
        <LenderCard />
        <DebtSummary />

        {/* Payment Method Tabs */}
        {canPromptPay && canBank && (
          <div className="bg-muted/60 grid grid-cols-2 gap-1 rounded-xl p-1">
            <button
              onClick={() => {
                setPaymentMethod('promptpay');
                setStep('amount');
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                paymentMethod === 'promptpay'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <QrIcon /> PromptPay
            </button>
            <button
              onClick={() => {
                setPaymentMethod('bank');
                setStep('amount');
              }}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all',
                paymentMethod === 'bank'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.33m-15 0V21M3 21h18"
                />
              </svg>
              โอนผ่านบัญชีธนาคาร
            </button>
          </div>
        )}

        {paymentMethod === 'promptpay' ? (
          <div className="space-y-4">
            {/* mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              {(['full', 'part'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded-xl border p-3.5 text-center transition-all ${
                    mode === m
                      ? 'border-foreground bg-foreground/5 border-2'
                      : 'border-border bg-muted/30'
                  }`}
                >
                  {m === 'full' ? (
                    <>
                      <svg
                        className="mx-auto mb-1 h-5 w-5 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <p className="text-foreground text-sm font-medium">
                        ชำระเต็มจำนวน
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {fmt(owed)}
                      </p>
                    </>
                  ) : (
                    <>
                      <svg
                        className="text-muted-foreground mx-auto mb-1 h-5 w-5 stroke-current"
                        viewBox="0 0 24 24"
                        fill="none"
                        strokeWidth="2"
                      >
                        <polyline points="16 3 21 3 21 8" />
                        <line x1="4" y1="20" x2="21" y2="3" />
                        <polyline points="21 16 21 21 16 21" />
                        <line x1="15" y1="15" x2="21" y2="21" />
                      </svg>
                      <p className="text-foreground text-sm font-medium">
                        ชำระบางส่วน
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        เลือกจำนวนเอง
                      </p>
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* partial amount input */}
            {mode === 'part' && (
              <div className="bg-muted/50 space-y-2 rounded-xl p-3.5">
                <p className="text-muted-foreground flex justify-between text-xs font-semibold tracking-wider uppercase">
                  <span>จำนวนเงินที่ต้องการชำระ</span>
                  <span className="text-muted-foreground/85 font-normal">
                    ยอดค้างทั้งหมด: {fmt(owed)}
                  </span>
                </p>
                <div
                  className={cn(
                    'bg-background border-border flex items-center gap-2 rounded-lg border px-3 py-2 transition-[color,box-shadow]',
                    partAmtError &&
                      'border-destructive ring-destructive ring-1',
                    partAmtShake && 'animate-shake',
                  )}
                >
                  <span className="text-muted-foreground text-sm font-medium">
                    ฿
                  </span>
                  <Input
                    type="number"
                    placeholder="0"
                    value={partAmt}
                    onChange={(e) => {
                      setPartAmt(e.target.value);
                      setPartAmtError(false);
                      setPartAmtErrorMessage('');
                    }}
                    className="h-auto border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
                    autoFocus
                  />
                </div>
                {partAmtError && partAmtErrorMessage && (
                  <p className="text-destructive mt-1 text-[11px] font-medium">
                    ⚠️ {partAmtErrorMessage}
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {quickAmounts.map((q) => (
                    <button
                      key={q}
                      onClick={() => {
                        setPartAmt(String(q));
                        setPartAmtError(false);
                        setPartAmtErrorMessage('');
                      }}
                      className="bg-background border-border text-muted-foreground hover:text-foreground rounded-lg border px-2.5 py-1 text-xs transition-colors"
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
              <div className="space-y-2">
                {amount !== undefined && amount <= 0 && (
                  <p className="text-center text-xs font-medium text-rose-500">
                    * กรุณาระบุจำนวนเงินที่ต้องการชำระก่อนสร้าง QR
                  </p>
                )}
                <Button
                  ref={generateQrButtonRef}
                  className="w-full"
                  size="lg"
                  onClick={handleGoQr}
                  disabled={qrLoading || (amount !== undefined && amount <= 0)}
                >
                  {qrLoading ? (
                    'กำลังสร้าง QR...'
                  ) : (
                    <span className="flex items-center gap-2">
                      <QrIcon /> สร้าง QR PromptPay{' '}
                      {amount !== undefined && amount > 0 ? fmt(amount) : ''}
                    </span>
                  )}
                </Button>
              </div>
            ) : (
              // ไม่มี PromptPay → ข้ามไป slip โดยตรง
              <div className="space-y-2">
                {amount !== undefined && amount <= 0 && (
                  <p className="text-center text-xs font-medium text-rose-500">
                    * กรุณาระบุจำนวนเงินที่ต้องการชำระก่อน
                  </p>
                )}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setStep('slip')}
                  disabled={amount !== undefined && amount <= 0}
                >
                  ต่อไป — แนบสลิป
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Bank Transfer Details Card */}
            <div className="bg-muted/30 border-border/85 space-y-3 rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                  บัญชีสำหรับโอนเงิน
                </span>
                <Badge
                  variant="outline"
                  className="bg-background text-foreground border-border/60 text-[10px]"
                >
                  โอนเงินธนาคาร
                </Badge>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ธนาคาร</span>
                  <span className="text-foreground font-semibold">
                    {info?.lender?.bank_name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">เลขบัญชี</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground font-mono text-base font-bold tracking-wide">
                      {info?.lender?.bank_account_number}
                    </span>
                    <button
                      onClick={() => {
                        if (info?.lender?.bank_account_number) {
                          navigator.clipboard.writeText(
                            info.lender.bank_account_number,
                          );
                          alert(
                            'คัดลอกเลขบัญชี ' +
                              info.lender.bank_account_number +
                              ' แล้ว!',
                          );
                        }
                      }}
                      type="button"
                      className="bg-background border-border text-foreground hover:bg-muted/80 rounded border px-2 py-0.5 text-xs transition-colors"
                    >
                      คัดลอก
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">ชื่อบัญชี</span>
                  <span className="text-foreground font-semibold">
                    {info?.lender?.bank_account_name}
                  </span>
                </div>
              </div>
            </div>

            {/* Help Info or Manual Amount Input */}
            {canSlipOk ? (
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-[11px] leading-relaxed text-blue-800 dark:text-blue-300">
                ℹ️ <strong>ระบบตรวจสลิปอัตโนมัติ:</strong>{' '}
                คุณไม่จำเป็นต้องใส่จำนวนเงินโอน ระบบ SlipOK
                จะดึงและยืนยันยอดเงินจากรูปสลิปโดยตรง
              </div>
            ) : (
              <div className="bg-muted/50 space-y-2 rounded-xl p-3.5">
                <p className="text-muted-foreground flex justify-between text-xs font-semibold tracking-wider uppercase">
                  <span>จำนวนเงินที่โอนจริงตามสลิป</span>
                </p>
                <div className="bg-background border-border flex items-center gap-2 rounded-lg border px-3 py-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    ฿
                  </span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                    className="h-auto border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
                  />
                </div>
              </div>
            )}

            {/* Note Input */}
            <Input
              placeholder="หมายเหตุ (ไม่บังคับ)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {/* Slip Upload Area */}
            <div className="space-y-2">
              <p className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                แนบสลิปเพื่อยืนยัน
              </p>
              <div
                onClick={() => fileRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${
                  slip
                    ? 'border-emerald-400 bg-emerald-50'
                    : 'border-border bg-muted/20 hover:border-foreground/40'
                }`}
              >
                {slip ? (
                  <>
                    <span className="text-3xl">🧾</span>
                    <p className="text-sm font-medium text-emerald-700">
                      {slip.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      แตะเพื่อเปลี่ยนไฟล์
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl">📎</span>
                    <p className="text-foreground text-sm font-medium">
                      อัปโหลดสลิปการโอน
                    </p>
                    <p className="text-muted-foreground text-xs">
                      JPG, PNG หรือ PDF — สูงสุด 5 MB
                    </p>
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
            </div>

            {/* verify result */}
            {verifyResult && (
              <div
                className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
                  verifyResult.verified
                    ? 'border border-emerald-200 bg-emerald-50'
                    : 'border border-red-200 bg-red-50'
                }`}
              >
                <span className="text-xl">
                  {verifyResult.verified ? '✅' : '❌'}
                </span>
                <div>
                  <p
                    className={`text-sm font-medium ${verifyResult.verified ? 'text-emerald-800' : 'text-red-800'}`}
                  >
                    {verifyResult.message}
                  </p>
                  {verifyResult.verified && verifyResult.data?.transRef && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      รหัสอ้างอิง: {verifyResult.data.transRef}
                    </p>
                  )}
                  {verifyResult.verified && verifyResult.data?.amount && (
                    <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                      ยอดเงินที่ตรวจพบ:{' '}
                      {fmt(verifyResult.data.amount as number)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {canSlipOk && slip && !verifyResult?.verified && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    'กำลังตรวจสอบสลิป...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span>🔍</span> ตรวจสอบสลิปด้วย SlipOK
                    </span>
                  )}
                </Button>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={submitting || verifying || !slip}
              >
                {submitting || verifying
                  ? 'กำลังตรวจสอบสลิป...'
                  : slip
                    ? 'ตรวจสอบสลิปและบันทึกชำระ'
                    : 'บันทึกชำระ'}
              </Button>
            </div>
          </div>
        )}

        <PaymentHistory loan={loan} />
      </div>
    );

  // ──────────────────────────────────────────────
  //  STEP: qr
  // ──────────────────────────────────────────────
  if (step === 'qr')
    return (
      <div className="space-y-5">
        <LenderCard />

        {/* QR card */}
        <div className="bg-muted/40 flex flex-col items-center gap-4 rounded-2xl p-5">
          <div className="flex w-full justify-between text-sm">
            <span className="text-muted-foreground">ยอดชำระ</span>
            <span className="text-foreground text-base font-bold">
              {qrData ? fmt(qrData.amount) : ''}
            </span>
          </div>
          {qrData ? (
            <img
              src={qrData.qr_data_uri}
              alt="PromptPay QR"
              className="border-border h-56 w-56 rounded-xl border"
            />
          ) : (
            <Skeleton className="h-56 w-56 rounded-xl" />
          )}
          <p className="text-muted-foreground text-center text-xs">
            สแกน QR ด้วย Mobile Banking
            <br />
            <span className="text-foreground font-medium">
              {qrData?.recipient}
            </span>
          </p>
        </div>

        {/* รอชำระ badge */}
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-lg text-amber-500">⏳</span>
          <p className="text-sm text-amber-800">
            เมื่อโอนเงินแล้ว กด "ชำระแล้ว" เพื่อแนบสลิปยืนยัน
          </p>
        </div>

        <Button className="w-full" size="lg" onClick={handlePaidAlready}>
          ชำระแล้ว — แนบสลิปยืนยัน
        </Button>
        <button
          onClick={() => setStep('amount')}
          className="text-muted-foreground hover:text-foreground w-full py-1 text-center text-sm transition-colors"
        >
          ← ย้อนกลับ
        </button>
      </div>
    );

  // ──────────────────────────────────────────────
  //  STEP: slip
  // ──────────────────────────────────────────────
  if (step === 'slip')
    return (
      <div className="space-y-4">
        <LenderCard />

        {/* amount reminder */}
        <div className="bg-muted/40 flex items-center justify-between rounded-xl px-4 py-3">
          <span className="text-muted-foreground text-sm">ยอดที่แจ้งชำระ</span>
          <span className="text-foreground font-bold">{fmt(amount ?? 0)}</span>
        </div>

        {/* slip upload area */}
        <div
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-colors ${
            slip
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-border bg-muted/20 hover:border-foreground/40'
          }`}
        >
          {slip ? (
            <>
              <span className="text-3xl">🧾</span>
              <p className="text-sm font-medium text-emerald-700">
                {slip.name}
              </p>
              <p className="text-muted-foreground text-xs">
                แตะเพื่อเปลี่ยนไฟล์
              </p>
            </>
          ) : (
            <>
              <span className="text-3xl">📎</span>
              <p className="text-foreground text-sm font-medium">
                อัปโหลดสลิปการโอน
              </p>
              <p className="text-muted-foreground text-xs">
                JPG, PNG หรือ PDF — สูงสุด 5 MB
              </p>
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
          <div
            className={`flex items-start gap-3 rounded-xl px-4 py-3 ${
              verifyResult.verified
                ? 'border border-emerald-200 bg-emerald-50'
                : 'border border-red-200 bg-red-50'
            }`}
          >
            <span className="text-xl">
              {verifyResult.verified ? '✅' : '❌'}
            </span>
            <div>
              <p
                className={`text-sm font-medium ${verifyResult.verified ? 'text-emerald-800' : 'text-red-800'}`}
              >
                {verifyResult.message}
              </p>
              {verifyResult.verified && verifyResult.data?.transRef && (
                <p className="text-muted-foreground mt-0.5 text-xs">
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
            {verifying ? (
              'กำลังตรวจสอบสลิป...'
            ) : (
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
          disabled={submitting || verifying}
        >
          {submitting || verifying
            ? 'กำลังตรวจสอบสลิป...'
            : slip
              ? 'ตรวจสอบสลิปและบันทึกชำระ'
              : 'บันทึกชำระ'}
        </Button>

        {canSlipOk && slip && !verifyResult?.verified && (
          <p className="text-muted-foreground text-center text-xs">
            ระบบจะอ่านสลิปอัตโนมัติเมื่อกดบันทึก
          </p>
        )}

        <button
          onClick={() => setStep(canPromptPay ? 'qr' : 'amount')}
          className="text-muted-foreground hover:text-foreground w-full py-1 text-center text-sm transition-colors"
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
  const confirmed = loan.payments.filter(
    (p) => p.confirmation_status === 'confirmed',
  );
  if (confirmed.length === 0) return null;
  return (
    <div className="pt-2">
      <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[.1em] uppercase">
        ประวัติการชำระ
      </p>
      <div className="bg-background overflow-hidden rounded-2xl">
        {confirmed.map((p) => (
          <div
            key={p.id}
            className="border-border flex items-center justify-between border-b px-3 py-2 last:border-b-0"
          >
            <div>
              <p className="text-foreground text-xs font-medium">
                {new Date(p.paid_at).toLocaleDateString('th-TH')}
              </p>
              {p.note && (
                <p className="text-muted-foreground text-[11px]">{p.note}</p>
              )}
            </div>
            <span className="text-sm font-medium text-emerald-600">
              {fmt(parseFloat(p.amount))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QrIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM17 17h3M17 14v3" />
    </svg>
  );
}

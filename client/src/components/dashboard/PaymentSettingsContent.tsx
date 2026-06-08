import { useEffect, useState } from 'react';
import { api, type ApiKeySettings } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  KeyRound,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Trash2,
  Landmark,
} from 'lucide-react';

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-border text-muted-foreground'
      }
    >
      {active ? 'พร้อมใช้งาน' : 'ยังไม่เชื่อมต่อ'}
    </Badge>
  );
}

function validateThaiNationalID(id: string): boolean {
  if (id.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id.charAt(i)) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id.charAt(12));
}

export function PaymentSettingsContent() {
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);
  const [slipokKey, setSlipokKey] = useState('');
  const [promptpayId, setPromptpayId] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'slipok' | 'promptpay' | 'bank' | null>(
    null,
  );
  const [promptpayError, setPromptpayError] = useState(false);

  const [promptpayErrorMessage, setPromptpayErrorMessage] = useState('');

  useEffect(() => {
    api
      .getApiKeys()
      .then((data) => {
        setSettings(data);
        setBranchId(data.slipok.branch_id ?? '');
        setPromptpayId(data.promptpay.id ?? '');
        setPromptpayError(false);
        setBankName(data.bank?.bank_name ?? '');
        setBankAccountNumber(data.bank?.bank_account_number ?? '');
        setBankAccountName(data.bank?.bank_account_name ?? '');
      })
      .catch(() => console.error('โหลดข้อมูลตั้งค่าการรับเงินไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  const saveSection = async (section: 'slipok' | 'promptpay' | 'bank') => {
    setSaving(section);
    try {
      let payload: Parameters<typeof api.updateApiKeys>[0] = {};

      if (section === 'slipok') {
        payload = { slipok_api_key: slipokKey, slipok_branch_id: branchId };
      } else if (section === 'promptpay') {
        const cleaned = promptpayId.replace(/\D/g, '');
        if (cleaned.length === 10) {
          if (!cleaned.startsWith('0')) {
            const msg = 'เบอร์โทรศัพท์ต้องเริ่มต้นด้วยเลข 0';
            setPromptpayError(true);
            setPromptpayErrorMessage(msg);
            return;
          }
        } else if (cleaned.length === 13) {
          if (!validateThaiNationalID(cleaned)) {
            const msg =
              'เลขบัตรประชาชนไม่ถูกต้อง (ตรวจสอบแล้วไม่ผ่าน Checksum)';
            setPromptpayError(true);
            setPromptpayErrorMessage(msg);
            return;
          }
        } else {
          const msg =
            'PromptPay ID ต้องเป็นเบอร์โทรศัพท์ 10 หลัก หรือเลขบัตรประชาชน 13 หลักเท่านั้น';
          setPromptpayError(true);
          setPromptpayErrorMessage(msg);
          return;
        }
        payload = { promptpay_id: cleaned };
      } else if (section === 'bank') {
        if (
          !bankName.trim() ||
          !bankAccountNumber.trim() ||
          !bankAccountName.trim()
        ) {
          alert('กรุณากรอกข้อมูลบัญชีธนาคารให้ครบถ้วน');
          return;
        }
        payload = {
          bank_name: bankName.trim(),
          bank_account_number: bankAccountNumber.trim().replace(/\D/g, ''),
          bank_account_name: bankAccountName.trim(),
        };
      }

      const next = await api.updateApiKeys(payload);
      setSettings(next);

      if (section === 'slipok') {
        setSlipokKey('');
        setBranchId(next.slipok.branch_id ?? '');
      }
      if (section === 'promptpay') setPromptpayId(next.promptpay.id ?? '');
      if (section === 'bank') {
        setBankName(next.bank?.bank_name ?? '');
        setBankAccountNumber(next.bank?.bank_account_number ?? '');
        setBankAccountName(next.bank?.bank_account_name ?? '');
      }
    } catch (e: any) {
      console.error(e.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(null);
    }
  };

  const clearSection = async (target: 'slipok' | 'promptpay' | 'bank') => {
    setSaving(target);
    try {
      const payload: Parameters<typeof api.updateApiKeys>[0] =
        target === 'slipok'
          ? { clear_slipok_api_key: true, slipok_branch_id: '' }
          : target === 'promptpay'
            ? { clear_promptpay_id: true }
            : { clear_bank: true };

      const next = await api.updateApiKeys(payload);
      setSettings(next);

      if (target === 'slipok') {
        setSlipokKey('');
        setBranchId('');
      }
      if (target === 'promptpay') setPromptpayId('');
      if (target === 'bank') {
        setBankName('');
        setBankAccountNumber('');
        setBankAccountName('');
      }
    } catch (e: any) {
      console.error(e.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-44 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            ตั้งค่าการรับเงิน
          </h2>
          <p className="text-muted-foreground text-xs">
            เชื่อม PromptPay และ SlipOK สำหรับรับชำระเงินและตรวจสลิป
          </p>
        </div>
        <div className="border-border/60 text-muted-foreground hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs sm:flex">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          เก็บ token ฝั่ง backend
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ── SlipOK ── */}
        <section className="border-border/60 bg-background rounded-xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SlipOK API</h3>
                <p className="text-muted-foreground text-xs">
                  ตรวจสอบสลิปชำระเงินอัตโนมัติ
                </p>
              </div>
            </div>
            <StatusBadge active={true} />
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-sky-100 bg-sky-50/30 p-3.5 text-xs text-sky-900 dark:border-sky-950/50 dark:bg-sky-950/10 dark:text-sky-300">
              <p className="font-semibold text-sky-700 dark:text-sky-400">
                ระบบตรวจสอบสลิปของแพลตฟอร์มเปิดใช้งานอยู่
              </p>
              <p className="text-muted-foreground mt-1.5 leading-relaxed">
                ผู้ใช้งานไม่จำเป็นต้องตั้งค่า SlipOK API key ด้วยตนเองอีกต่อไป
                ระบบส่วนกลางจะทำการตรวจสอบสลิปและยอดโอนให้เจ้าหนี้โดยอัตโนมัติ
              </p>
            </div>
          </div>
        </section>

        {/* ── PromptPay ── */}
        <section className="border-border/60 bg-background rounded-xl border p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">PromptPay</h3>
                <p className="text-muted-foreground text-xs">
                  เบอร์โทรหรือเลขบัตรประชาชนสำหรับรับชำระผ่าน QR Code บนหน้า
                  checkout
                </p>
              </div>
            </div>
            <StatusBadge active={!!settings?.promptpay.has_id} />
          </div>

          <div className="mt-4 space-y-4">
            {/* current recipient */}
            {settings?.promptpay?.recipient && (
              <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/20">
                <Smartphone className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                <div className="min-w-0">
                  <p className="text-[10px] tracking-widest text-violet-500 uppercase dark:text-violet-400">
                    PromptPay ปัจจุบัน
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-violet-800 dark:text-violet-200">
                    {settings?.promptpay?.recipient}
                  </p>
                  {settings?.promptpay?.id && (
                    <p className="text-[11px] text-violet-500 dark:text-violet-400">
                      ตั้งค่าแล้ว — ใช้ตัวเลขที่บันทึกไว้
                    </p>
                  )}
                  {!settings?.promptpay?.id &&
                    settings?.promptpay?.fallback && (
                      <p className="text-[11px] text-violet-500 dark:text-violet-400">
                        ใช้เบอร์โทรจากโปรไฟล์ ({settings?.promptpay?.fallback})
                        — ตั้ง PromptPay ID เพื่อแทนที่
                      </p>
                    )}
                </div>
              </div>
            )}

            {/* input */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  เบอร์โทร หรือ เลขบัตรประชาชน (ตัวเลขเท่านั้น)
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={promptpayId}
                  onChange={(e) => {
                    setPromptpayId(e.target.value.replace(/[^0-9\-\s]/g, ''));
                    setPromptpayError(false);
                    setPromptpayErrorMessage('');
                  }}
                  placeholder="0812345678 หรือ 1234567890123"
                  autoComplete="off"
                  aria-invalid={promptpayError}
                  className=""
                />
                {promptpayError && promptpayErrorMessage && (
                  <p className="text-destructive mt-1 text-[11px] font-medium">
                    ⚠️ {promptpayErrorMessage}
                  </p>
                )}
                <p className="text-muted-foreground text-[11px]">
                  ระบบจะแสดง QR PromptPay ตามจำนวนเงินที่ลูกหนี้ต้องชำระบนหน้า
                  checkout
                </p>
              </div>

              <div className="border-border/50 bg-muted/20 space-y-1.5 rounded-lg border p-3">
                <p className="text-foreground text-xs font-medium">
                  วิธีการทำงาน
                </p>
                <ul className="text-muted-foreground space-y-1 text-[11px]">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    ลูกหนี้เปิดลิงก์ checkout จะเห็น QR PromptPay พร้อมจำนวนเงิน
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    สแกนด้วย Mobile Banking แล้วโอนเงินได้เลย
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                    แนบสลิปและให้ SlipOK ตรวจสอบอัตโนมัติ
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => saveSection('promptpay')}
                disabled={
                  saving !== null ||
                  (promptpayId.replace(/\D/g, '').length !== 10 &&
                    promptpayId.replace(/\D/g, '').length !== 13)
                }
                className="gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                บันทึก PromptPay
              </Button>
              {settings?.promptpay?.id && (
                <Button
                  variant="outline"
                  onClick={() => clearSection('promptpay')}
                  disabled={saving !== null}
                  className="text-destructive hover:text-destructive gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ PromptPay ID
                </Button>
              )}
            </div>

            {!settings?.promptpay?.has_id && !settings?.promptpay?.fallback && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-600 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-400">
                ⚠️ ยังไม่มีเบอร์โทรในโปรไฟล์และยังไม่ได้ตั้ง PromptPay ID —
                ลูกหนี้จะไม่เห็น QR Code บนหน้า checkout
              </p>
            )}
          </div>
        </section>

        {/* ── Bank Account ── */}
        <section className="border-border/60 bg-background rounded-xl border p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Landmark className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">บัญชีธนาคาร</h3>
                <p className="text-muted-foreground text-xs">
                  เลขบัญชีสำหรับให้ลูกหนี้เลือกโอนตรงผ่านช่องทางธนาคาร
                </p>
              </div>
            </div>
            <StatusBadge active={!!settings?.bank?.has_bank} />
          </div>

          <div className="mt-4 space-y-4">
            {settings?.bank?.has_bank && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <Landmark className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="min-w-0">
                  <p className="text-[10px] tracking-widest text-emerald-500 uppercase dark:text-emerald-400">
                    บัญชีธนาคารปัจจุบัน
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    {settings?.bank?.bank_name} -{' '}
                    {settings?.bank?.bank_account_number}
                  </p>
                  <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    ชื่อบัญชี: {settings?.bank?.bank_account_name}
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">ธนาคาร</Label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-xl border bg-transparent px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-1 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="" disabled className="text-muted-foreground">
                    เลือกธนาคาร...
                  </option>
                  <option value="ธนาคารกสิกรไทย">ธนาคารกสิกรไทย (KBANK)</option>
                  <option value="ธนาคารไทยพาณิชย์">
                    ธนาคารไทยพาณิชย์ (SCB)
                  </option>
                  <option value="ธนาคารกรุงเทพ">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="ธนาคารกรุงไทย">ธนาคารกรุงไทย (KTB)</option>
                  <option value="ธนาคารกรุงศรีอยุธยา">
                    ธนาคารกรุงศรีอยุธยา (BAY)
                  </option>
                  <option value="ธนาคารทหารไทยธนชาต">
                    ธนาคารทหารไทยธนชาต (TTB)
                  </option>
                  <option value="ธนาคารออมสิน">ธนาคารออมสิน (GSB)</option>
                  <option value="ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร">
                    ธนาคารเพื่อการเกษตรฯ (BAAC)
                  </option>
                  <option value="ธนาคารอาคารสงเคราะห์">
                    ธนาคารอาคารสงเคราะห์ (GHB)
                  </option>
                  <option value="ธนาคารยูโอบี">ธนาคารยูโอบี (UOB)</option>
                  <option value="ธนาคารเกียรตินาคินภัทร">
                    ธนาคารเกียรตินาคินภัทร (KKP)
                  </option>
                  <option value="ธนาคารแลนด์ แอนด์ เฮ้าส์">
                    ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)
                  </option>
                  <option value="ธนาคาร ซีไอเอ็มบี ไทย">
                    ธนาคาร ซีไอเอ็มบี ไทย (CIMBT)
                  </option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  เลขบัญชีธนาคาร (ตัวเลขเท่านั้น)
                </Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={bankAccountNumber}
                  onChange={(e) =>
                    setBankAccountNumber(e.target.value.replace(/[^0-9]/g, ''))
                  }
                  placeholder="เช่น 1234567890"
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground text-xs">
                  ชื่อบัญชี (ชื่อ-นามสกุล)
                </Label>
                <Input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => saveSection('bank')}
                disabled={
                  saving !== null ||
                  !bankName ||
                  !bankAccountNumber ||
                  !bankAccountName
                }
                className="gap-1.5"
              >
                <Landmark className="h-3.5 w-3.5" />
                บันทึกบัญชีธนาคาร
              </Button>
              {settings?.bank?.has_bank && (
                <Button
                  variant="outline"
                  onClick={() => clearSection('bank')}
                  disabled={saving !== null}
                  className="text-destructive hover:text-destructive gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบบัญชีธนาคาร
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

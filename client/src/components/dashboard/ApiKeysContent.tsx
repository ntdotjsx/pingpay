import { useEffect, useState } from "react";
import { api, type ApiKeySettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Bot,
  CheckCircle2,
  KeyRound,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Trash2,
} from "lucide-react";

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          : "border-border text-muted-foreground"
      }
    >
      {active ? "พร้อมใช้งาน" : "ยังไม่เชื่อมต่อ"}
    </Badge>
  );
}

export function ApiKeysContent() {
  const [settings, setSettings] = useState<ApiKeySettings | null>(null);
  const [lineToken, setLineToken] = useState("");
  const [slipokKey, setSlipokKey] = useState("");
  const [promptpayId, setPromptpayId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"line" | "slipok" | "promptpay" | null>(null);

  useEffect(() => {
    api
      .getApiKeys()
      .then((data) => {
        setSettings(data);
        setBranchId(data.slipok.branch_id ?? "");
        setPromptpayId(data.promptpay.id ?? "");
      })
      .catch(() => toast.error("โหลด API keys ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const saveSection = async (section: "line" | "slipok" | "promptpay") => {
    setSaving(section);
    try {
      let payload: Parameters<typeof api.updateApiKeys>[0] = {};

      if (section === "line") {
        if (!lineToken.trim()) {
          toast.error("กรุณาใส่ LINE Bot token");
          return;
        }
        payload = { line_bot_token: lineToken.trim() };
      } else if (section === "slipok") {
        if (!slipokKey.trim() && !settings?.slipok.has_api_key) {
          toast.error("กรุณาใส่ SlipOK API key");
          return;
        }
        payload = {
          ...(slipokKey.trim() ? { slipok_api_key: slipokKey.trim() } : {}),
          slipok_branch_id: branchId.trim(),
        };
      } else if (section === "promptpay") {
        const cleaned = promptpayId.replace(/\D/g, "");
        if (cleaned.length < 10) {
          toast.error("เบอร์โทรหรือเลขบัตรประชาชนต้องมีอย่างน้อย 10 หลัก");
          return;
        }
        payload = { promptpay_id: cleaned };
      }

      const next = await api.updateApiKeys(payload);
      setSettings(next);

      if (section === "line") setLineToken("");
      if (section === "slipok") {
        setSlipokKey("");
        setBranchId(next.slipok.branch_id ?? "");
      }
      if (section === "promptpay") setPromptpayId(next.promptpay.id ?? "");

      toast.success("บันทึกแล้ว");
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(null);
    }
  };

  const clearSection = async (target: "line" | "slipok" | "promptpay") => {
    setSaving(target);
    try {
      const payload: Parameters<typeof api.updateApiKeys>[0] =
        target === "line"
          ? { clear_line_bot_token: true }
          : target === "slipok"
            ? { clear_slipok_api_key: true, slipok_branch_id: "" }
            : { clear_promptpay_id: true };

      const next = await api.updateApiKeys(payload);
      setSettings(next);

      if (target === "line") setLineToken("");
      if (target === "slipok") {
        setSlipokKey("");
        setBranchId("");
      }
      if (target === "promptpay") setPromptpayId("");

      toast.success("ลบแล้ว");
    } catch (e: any) {
      toast.error(e.message ?? "ลบไม่สำเร็จ");
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
          <h2 className="text-base font-semibold text-foreground">API keys</h2>
          <p className="text-xs text-muted-foreground">
            เชื่อม LINE Bot, PromptPay และ SlipOK สำหรับงานแจ้งเตือนและตรวจสลิป
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          เก็บ token ฝั่ง backend
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* ── LINE Bot ── */}
        <section className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">LINE Bot token</h3>
                <p className="text-xs text-muted-foreground">ใช้ส่ง reminder ให้ลูกหนี้ผ่าน LINE</p>
              </div>
            </div>
            <StatusBadge active={!!settings?.line_bot.has_token} />
          </div>

          <div className="mt-4 space-y-3">
            {settings?.line_bot.masked_token && (
              <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current</p>
                <p className="mt-0.5 truncate font-mono text-xs">{settings.line_bot.masked_token}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Channel access token</Label>
              <Input
                type="password"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                placeholder="วาง LINE Messaging API token"
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveSection("line")}
                disabled={saving !== null}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                บันทึก
              </Button>
              {settings?.line_bot.has_token && (
                <Button
                  variant="outline"
                  onClick={() => clearSection("line")}
                  disabled={saving !== null}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* ── SlipOK ── */}
        <section className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SlipOK API</h3>
                <p className="text-xs text-muted-foreground">ตรวจสอบสลิปชำระเงินอัตโนมัติ</p>
              </div>
            </div>
            <StatusBadge active={!!settings?.slipok.has_api_key} />
          </div>

          <div className="mt-4 space-y-3">
            {settings?.slipok.masked_api_key && (
              <div className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current</p>
                <p className="mt-0.5 truncate font-mono text-xs">{settings.slipok.masked_api_key}</p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API key</Label>
                <Input
                  type="password"
                  value={slipokKey}
                  onChange={(e) => setSlipokKey(e.target.value)}
                  placeholder="วาง SlipOK API key"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Branch ID</Label>
                <Input
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  placeholder="optional"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => saveSection("slipok")}
                disabled={saving !== null}
                className="gap-1.5"
              >
                <KeyRound className="h-3.5 w-3.5" />
                บันทึก
              </Button>
              {settings?.slipok.has_api_key && (
                <Button
                  variant="outline"
                  onClick={() => clearSection("slipok")}
                  disabled={saving !== null}
                  className="gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* ── PromptPay ── */}
        <section className="rounded-xl border border-border/60 bg-background p-4 lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                <QrCode className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">PromptPay</h3>
                <p className="text-xs text-muted-foreground">
                  เบอร์โทรหรือเลขบัตรประชาชนสำหรับรับชำระผ่าน QR Code บนหน้า checkout
                </p>
              </div>
            </div>
            <StatusBadge active={!!settings?.promptpay.has_id} />
          </div>

          <div className="mt-4 space-y-4">
            {/* current recipient */}
            {settings?.promptpay.recipient && (
              <div className="flex items-center gap-3 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/20">
                <Smartphone className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-violet-500 dark:text-violet-400">
                    PromptPay ปัจจุบัน
                  </p>
                  <p className="mt-0.5 font-mono text-sm font-semibold text-violet-800 dark:text-violet-200">
                    {settings.promptpay.recipient}
                  </p>
                  {settings.promptpay.id && (
                    <p className="text-[11px] text-violet-500 dark:text-violet-400">
                      ตั้งค่าแล้ว — ใช้ตัวเลขที่บันทึกไว้
                    </p>
                  )}
                  {!settings.promptpay.id && settings.promptpay.fallback && (
                    <p className="text-[11px] text-violet-500 dark:text-violet-400">
                      ใช้เบอร์โทรจากโปรไฟล์ ({settings.promptpay.fallback}) — ตั้ง PromptPay ID เพื่อแทนที่
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* input */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  เบอร์โทร หรือ เลขบัตรประชาชน (ตัวเลขเท่านั้น)
                </Label>
                <Input
                  type="tel"
                  inputMode="numeric"
                  value={promptpayId}
                  onChange={(e) =>
                    setPromptpayId(e.target.value.replace(/[^0-9\-\s]/g, ""))
                  }
                  placeholder="0812345678 หรือ 1234567890123"
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  ระบบจะแสดง QR PromptPay ตามจำนวนเงินที่ลูกหนี้ต้องชำระบนหน้า checkout
                </p>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                <p className="text-xs font-medium text-foreground">วิธีการทำงาน</p>
                <ul className="space-y-1 text-[11px] text-muted-foreground">
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
                onClick={() => saveSection("promptpay")}
                disabled={saving !== null}
                className="gap-1.5"
              >
                <QrCode className="h-3.5 w-3.5" />
                บันทึก PromptPay
              </Button>
              {settings?.promptpay.id && (
                <Button
                  variant="outline"
                  onClick={() => clearSection("promptpay")}
                  disabled={saving !== null}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ PromptPay ID
                </Button>
              )}
            </div>

            {!settings?.promptpay.has_id && !settings?.promptpay.fallback && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                ⚠️ ยังไม่มีเบอร์โทรในโปรไฟล์และยังไม่ได้ตั้ง PromptPay ID — ลูกหนี้จะไม่เห็น QR Code บนหน้า checkout
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

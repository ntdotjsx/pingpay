import { useEffect, useState } from "react";
import { api, type ApiKeySettings } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, CheckCircle2, KeyRound, ReceiptText, ShieldCheck, Trash2 } from "lucide-react";

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
  const [branchId, setBranchId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getApiKeys()
      .then((data) => {
        setSettings(data);
        setBranchId(data.slipok.branch_id ?? "");
      })
      .catch(() => toast.error("โหลด API keys ไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const next = await api.updateApiKeys({
        ...(lineToken.trim() ? { line_bot_token: lineToken.trim() } : {}),
        ...(slipokKey.trim() ? { slipok_api_key: slipokKey.trim() } : {}),
        slipok_branch_id: branchId.trim(),
      });
      setSettings(next);
      setLineToken("");
      setSlipokKey("");
      setBranchId(next.slipok.branch_id ?? "");
      toast.success("บันทึกการเชื่อมต่อแล้ว");
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  const clear = async (target: "line" | "slipok") => {
    setSaving(true);
    try {
      const next = await api.updateApiKeys({
        clear_line_bot_token: target === "line",
        clear_slipok_api_key: target === "slipok",
        slipok_branch_id: target === "slipok" ? "" : branchId.trim(),
      });
      setSettings(next);
      if (target === "slipok") setBranchId("");
      toast.success("ลบ key แล้ว");
    } catch (e: any) {
      toast.error(e.message ?? "ลบ key ไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
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
            เชื่อม LINE Bot และ SlipOK สำหรับงานแจ้งเตือนและตรวจสลิป
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          เก็บ token ฝั่ง backend
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
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
              <Button onClick={save} disabled={saving} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                บันทึก
              </Button>
              {settings?.line_bot.has_token && (
                <Button variant="outline" onClick={() => clear("line")} disabled={saving} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-background p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                <ReceiptText className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">SlipOK API</h3>
                <p className="text-xs text-muted-foreground">เตรียมใช้ตรวจสอบสลิปชำระเงิน</p>
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
                <Input value={branchId} onChange={(e) => setBranchId(e.target.value)} placeholder="optional" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={saving} className="gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                บันทึก
              </Button>
              {settings?.slipok.has_api_key && (
                <Button variant="outline" onClick={() => clear("slipok")} disabled={saving} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

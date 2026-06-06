import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, type NotificationSettings } from '@/lib/api';
import { getCachedUser } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Bell,
  Clock3,
  Mail,
  MessageCircle,
  ReceiptText,
  TimerReset,
} from 'lucide-react';

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="border-border/60 bg-background hover:bg-muted/30 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors"
    >
      <div className="bg-muted text-muted-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground text-sm font-medium">{title}</p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      <span
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-muted-foreground/25'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function NotificationContent() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getNotificationSettings()
      .then(setSettings)
      .catch(() => toast.error('โหลดการแจ้งเตือนไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    setSettings((current) =>
      current ? { ...current, [key]: value } : current
    );
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const next = await api.updateNotificationSettings(settings);
      setSettings(next);
      toast.success('บันทึกการแจ้งเตือนแล้ว');
    } catch (e: any) {
      toast.error(e.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState(false);
  const [testLineId, setTestLineId] = useState(() => {
    const user = getCachedUser();
    return user?.line_id ?? '';
  });

  const handleTest = async () => {
    if (!testLineId.trim()) {
      toast.error('กรุณาระบุ LINE ID ที่ต้องการส่งข้อความทดสอบ');
      return;
    }
    setTesting(true);
    try {
      const res = await api.testNotification(testLineId.trim());
      toast.success(res.message);
    } catch (e: any) {
      toast.error(e.message ?? 'ส่งข้อความทดสอบล้มเหลว');
    } finally {
      setTesting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-3 p-1">
        <Skeleton className="h-16 rounded-xl" />
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            การแจ้งเตือน
          </h2>
          <p className="text-muted-foreground text-xs">
            ตั้งค่าการแจ้งเตือนสำหรับงานเจ้าหนี้
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={save}
            disabled={saving || testing}
            size="sm"
            className="h-8"
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </div>
      </div>

      <section className="grid gap-2 lg:grid-cols-2">
        <ToggleRow
          icon={<ReceiptText className="h-4 w-4" />}
          title="รอยืนยันชำระ"
          description="แจ้งเมื่อมีลูกหนี้ส่งหลักฐานชำระเงิน"
          checked={settings.payment_confirmations}
          onChange={(value) => update('payment_confirmations', value)}
        />
        <ToggleRow
          icon={<TimerReset className="h-4 w-4" />}
          title="ใกล้ครบกำหนด"
          description="เตือนรายการที่กำลังจะถึงวันครบกำหนด"
          checked={settings.due_soon}
          onChange={(value) => update('due_soon', value)}
        />
        <ToggleRow
          icon={<Bell className="h-4 w-4" />}
          title="เกินกำหนด"
          description="แจ้งเตือนเมื่อยอดค้างเลยกำหนด"
          checked={settings.overdue}
          onChange={(value) => update('overdue', value)}
        />
        <ToggleRow
          icon={<Clock3 className="h-4 w-4" />}
          title="สรุปรายวัน"
          description="รวมยอดที่ต้องติดตามวันละครั้ง"
          checked={settings.daily_digest}
          onChange={(value) => update('daily_digest', value)}
        />
        <ToggleRow
          icon={<MessageCircle className="h-4 w-4" />}
          title="ส่งผ่าน LINE"
          description="ส่งแจ้งเตือนอัตโนมัติผ่านระบบ LINE Bot ของ PingPay"
          checked={settings.line_push}
          onChange={(value) => update('line_push', value)}
        />
        <ToggleRow
          icon={<Mail className="h-4 w-4" />}
          title="อีเมลสำรอง"
          description="เก็บช่องทางสำรองสำหรับ notification"
          checked={settings.email_backup}
          onChange={(value) => update('email_backup', value)}
        />
      </section>

      <section className="border-border/60 bg-background rounded-xl border p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              เตือนก่อนครบกำหนด
            </Label>
            <Input
              type="number"
              min={1}
              max={14}
              value={settings.due_soon_days}
              onChange={(e) => update('due_soon_days', Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              เริ่มพักแจ้งเตือน
            </Label>
            <Input
              type="time"
              value={settings.quiet_hours_start}
              onChange={(e) => update('quiet_hours_start', e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              กลับมาแจ้งเตือน
            </Label>
            <Input
              type="time"
              value={settings.quiet_hours_end}
              onChange={(e) => update('quiet_hours_end', e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 space-y-1.5">
          <Label className="text-muted-foreground text-xs">
            ข้อความ reminder เริ่มต้น
          </Label>
          <Textarea
            value={settings.reminder_message}
            onChange={(e) => update('reminder_message', e.target.value)}
            className="min-h-20 resize-none"
            maxLength={240}
          />
        </div>
      </section>

      {/* ── Sandbox Test Section ── */}
      <section className="border-border/60 bg-background space-y-4 rounded-xl border p-4">
        <div>
          <h3 className="text-sm font-semibold">
            ทดสอบส่งแจ้งเตือน LINE (Sandbox)
          </h3>
          <p className="text-muted-foreground text-xs">
            ทดลองส่งข้อความจำลองเข้า LINE ID ที่ระบุ (ต้องเพิ่มเพื่อนกับ LINE
            Bot ของระบบก่อน)
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">
              LINE User ID ของผู้รับ (เช่น U123456789...)
            </Label>
            <Input
              type="text"
              value={testLineId}
              onChange={(e) => setTestLineId(e.target.value)}
              placeholder="วาง LINE User ID ของคุณหรือเพื่อนที่นี่..."
              className="font-mono text-xs"
            />
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !testLineId.trim()}
              className="h-10 w-full sm:w-auto"
            >
              {testing ? 'กำลังส่ง...' : 'ส่งข้อความทดสอบ'}
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-[11px]">
          * LINE User ID สามารถดูได้จากระบบข้อมูลเพื่อน/ลูกค้า หรือ LINE
          Developer Console เมื่อส่งข้อความเข้าห้องแชท
        </p>
      </section>
    </div>
  );
}

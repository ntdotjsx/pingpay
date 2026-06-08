import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  fmt,
  isPaid,
  progressPct,
  remaining,
  type Debtor,
} from '@/lib/debtStore';
import { DebtorAvatar } from './DebtorAvatar';
import { api } from '@/lib/api';
import { Bell, Check, Link, Loader2 } from 'lucide-react';

interface DebtorRowProps {
  debtor: Debtor;
  onSelect: (id: number) => void;
}

export function DebtorRow({ debtor, onSelect }: DebtorRowProps) {
  const paid = isPaid(debtor);
  const pct = progressPct(debtor);
  const [copying, setCopying] = useState(false);
  const [reminding, setReminding] = useState(false);

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCopying(true);
    try {
      const { guest_link } = await api.getGuestLink(debtor.loanId);
      await navigator.clipboard.writeText(guest_link);
      setTimeout(() => setCopying(false), 1500);
    } catch {
      setCopying(false);
    }
  };

  const handleRemind = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setReminding(true);
    try {
      const res = await api.remindLoan(debtor.loanId);
      alert(res.message);
    } catch (error: any) {
      alert(error.message ?? 'ส่ง LINE reminder ไม่สำเร็จ');
    } finally {
      setReminding(false);
    }
  };

  return (
    <div
      className={`border-border flex items-center gap-2 border-b px-3 py-2 transition-colors last:border-b-0 ${
        paid ? 'opacity-50' : 'hover:bg-muted/40 cursor-pointer'
      }`}
      onClick={() => !paid && onSelect(debtor.id)}
    >
      <DebtorAvatar debtor={debtor} />

      {/* left: name + note */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-foreground truncate text-[13px] font-medium">
            {debtor.name}
          </p>
          {paid && (
            <Badge
              variant="outline"
              className="h-3.5 shrink-0 border-emerald-200 bg-emerald-50 px-1 py-0 text-[10px] leading-none text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
            >
              ✓ ครบ
            </Badge>
          )}
          {debtor.paid > 0 && !paid && (
            <Badge
              variant="outline"
              className="h-3.5 shrink-0 border-amber-200 bg-amber-50 px-1 py-0 text-[10px] leading-none text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
              {pct}%
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="text-muted-foreground flex-1 truncate text-[11px]">
            {debtor.note}
          </p>
          {debtor.paid > 0 && !paid && (
            <Progress value={pct} className="h-0.5 w-12 shrink-0" />
          )}
        </div>
      </div>

      {/* copy link button (ส่ง link ให้ลูกหนี้) */}
      {!paid && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={handleRemind}
            title="ส่ง LINE reminder"
            disabled={reminding}
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors disabled:opacity-50"
          >
            {reminding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleCopyLink}
            title="คัดลอกลิงก์ให้ลูกหนี้"
            className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition-colors"
          >
            {copying ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Link className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      )}

      {/* right: amount */}
      <div className="shrink-0 text-right">
        {debtor.paid > 0 && !paid && (
          <p className="text-muted-foreground mb-0.5 text-[11px] leading-none line-through">
            {fmt(debtor.total)}
          </p>
        )}
        <p
          className={`text-[13px] font-medium ${paid ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}
        >
          {paid ? 'ครบ' : fmt(remaining(debtor))}
        </p>
      </div>
    </div>
  );
}

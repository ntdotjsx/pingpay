import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  fmt,
  isPaid,
  progressPct,
  remaining,
  type Debtor,
} from "@/lib/debtStore";
import { DebtorAvatar } from "./DebtorAvatar";
import { api } from "@/lib/api";
import { Bell, Check, Link, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
      toast.success(res.message);
    } catch (error: any) {
      toast.error(error.message ?? "ส่ง LINE reminder ไม่สำเร็จ");
    } finally {
      setReminding(false);
    }
  };

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 transition-colors ${
        paid ? "opacity-50" : "cursor-pointer hover:bg-muted/40"
      }`}
      onClick={() => !paid && onSelect(debtor.id)}
    >
      <DebtorAvatar debtor={debtor} />

      {/* left: name + note */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[13px] font-medium text-foreground truncate">
            {debtor.name}
          </p>
          {paid && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-3.5 leading-none shrink-0 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950"
            >
              ✓ ครบ
            </Badge>
          )}
          {debtor.paid > 0 && !paid && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-3.5 leading-none shrink-0 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950"
            >
              {pct}%
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[11px] text-muted-foreground truncate flex-1">
            {debtor.note}
          </p>
          {debtor.paid > 0 && !paid && (
            <Progress value={pct} className="w-12 h-0.5 shrink-0" />
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
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
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
      <div className="text-right shrink-0">
        {debtor.paid > 0 && !paid && (
          <p className="text-[11px] text-muted-foreground line-through leading-none mb-0.5">
            {fmt(debtor.total)}
          </p>
        )}
        <p
          className={`text-[13px] font-medium ${paid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
        >
          {paid ? "ครบ" : fmt(remaining(debtor))}
        </p>
      </div>
    </div>
  );
}

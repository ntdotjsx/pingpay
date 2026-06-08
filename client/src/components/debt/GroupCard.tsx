import { useState, useCallback } from 'react';
import { ChevronDown, Link2, Check, Copy } from 'lucide-react';
import {
  fmt,
  isPaid,
  remaining,
  type Debtor,
  type Group,
} from '@/lib/debtStore';
import { DebtorRow } from './DebtorRow';
import { cn } from '@/lib/utils';
import { api, type ApiGroupGuestLink } from '@/lib/api';

interface GroupCardProps {
  group: Group;
  debtors: Debtor[];
  onSelect: (id: number) => void;
}

type CopiedMap = Record<number, boolean>;

export function GroupCard({ group, debtors, onSelect }: GroupCardProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'links'>('members');
  const [guestLinks, setGuestLinks] = useState<ApiGroupGuestLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [copiedMap, setCopiedMap] = useState<CopiedMap>({});

  const totalRemaining = debtors.reduce((s, d) => s + remaining(d), 0);
  const totalAmount = debtors.reduce((s, d) => s + d.total, 0);
  const totalPaid = debtors.reduce((s, d) => s + d.paid, 0);
  const pct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;
  const pendingCount = debtors.filter((d) => !isPaid(d)).length;

  const fetchGuestLinks = useCallback(async () => {
    if (guestLinks.length > 0) return;
    setLoadingLinks(true);
    try {
      const links = await api.getGroupGuestLinks(group.id);
      setGuestLinks(links);
    } catch {
      alert('โหลด guest links ไม่สำเร็จ');
    } finally {
      setLoadingLinks(false);
    }
  }, [group.id, guestLinks.length]);

  const handleTabChange = (tab: 'members' | 'links') => {
    setActiveTab(tab);
    if (tab === 'links') fetchGuestLinks();
  };

  const copyLink = async (loanId: number, link: string) => {
    await navigator.clipboard.writeText(link);
    setCopiedMap((p) => ({ ...p, [loanId]: true }));
    setTimeout(() => setCopiedMap((p) => ({ ...p, [loanId]: false })), 2000);
  };

  const copyAllLinks = async () => {
    const text = guestLinks
      .map((l) => `${l.borrower?.name ?? 'ไม่ระบุ'}: ${l.guest_link}`)
      .join('\n');
    await navigator.clipboard.writeText(text);
    alert('คัดลอก link ทุกคนแล้ว');
  };

  return (
    <div className="bg-background border-border/50 mb-2 overflow-hidden rounded-xl border">
      {/* Header — คลิกเพื่อ expand */}
      <button
        className="hover:bg-muted/40 flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="bg-muted/60 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm">
          {group.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-[13px] leading-snug font-medium">
            {group.name}
          </p>
          <p className="text-muted-foreground text-[11px] leading-snug">
            {pendingCount > 0 ? `${pendingCount} คนยังค้าง` : 'ชำระครบแล้ว ✓'}
            {group.date ? ` · ${group.date}` : ''}
          </p>
        </div>
        <div className="mr-1 shrink-0 text-right">
          <p className="text-foreground text-[13px] leading-snug font-medium">
            {fmt(totalRemaining)}
          </p>
          <p className="text-muted-foreground text-[11px] leading-snug">
            {pct}% ชำระแล้ว
          </p>
        </div>
        <ChevronDown
          className={cn(
            'text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <div className="border-border border-t">
          {/* Tab switcher */}
          <div className="border-border flex border-b">
            <button
              onClick={() => handleTabChange('members')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors',
                activeTab === 'members'
                  ? 'text-foreground border-foreground -mb-px border-b-2'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              รายบุคคล ({debtors.length})
            </button>
            <button
              onClick={() => handleTabChange('links')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2 text-[12px] font-medium transition-colors',
                activeTab === 'links'
                  ? 'text-foreground border-foreground -mb-px border-b-2'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Link2 className="h-3 w-3" />
              Guest Links
            </button>
          </div>

          {/* Tab: รายบุคคล */}
          {activeTab === 'members' && (
            <>
              {debtors.length > 0 ? (
                debtors.map((d) => (
                  <DebtorRow key={d.id} debtor={d} onSelect={onSelect} />
                ))
              ) : (
                <p className="text-muted-foreground py-4 text-center text-xs">
                  ยังไม่มีรายชื่อในกลุ่มนี้
                </p>
              )}
            </>
          )}

          {/* Tab: Guest Links */}
          {activeTab === 'links' && (
            <div className="space-y-2 p-3">
              {loadingLinks && (
                <p className="text-muted-foreground py-2 text-center text-xs">
                  กำลังโหลด...
                </p>
              )}

              {!loadingLinks && guestLinks.length === 0 && (
                <p className="text-muted-foreground py-3 text-center text-xs">
                  ยังไม่มี guest links (ต้องเพิ่มสมาชิกที่มีบัญชีในระบบ)
                </p>
              )}

              {guestLinks.length > 0 && (
                <>
                  {/* Copy all */}
                  <button
                    onClick={copyAllLinks}
                    className="text-muted-foreground hover:text-foreground bg-muted/40 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                    คัดลอก link ทุกคน
                  </button>

                  {/* แต่ละคน */}
                  {guestLinks.map((link) => (
                    <div
                      key={link.loan_id}
                      className="bg-muted/30 flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                    >
                      <div className="bg-foreground/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
                        {(link.borrower?.name ?? '?')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground text-[12px] leading-tight font-medium">
                          {link.borrower?.name ?? 'ไม่ระบุ'}
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-tight">
                          ค้าง {fmt(parseFloat(link.remaining as any))}
                          {link.status === 'settled' && (
                            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
                              · จ่ายแล้ว ✓
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => copyLink(link.loan_id, link.guest_link)}
                        className={cn(
                          'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all',
                          copiedMap[link.loan_id]
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                            : 'bg-foreground/8 text-foreground hover:bg-foreground/15',
                        )}
                      >
                        {copiedMap[link.loan_id] ? (
                          <>
                            <Check className="h-3 w-3" /> คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> คัดลอก
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

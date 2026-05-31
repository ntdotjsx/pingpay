import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fmt,
  isPaid,
  remaining,
  loanToDebtor,
  type Debtor,
  type Group,
} from "@/lib/debtStore";
import { api, type ApiLoan, type ApiGroup } from "@/lib/api";
import { MetricCard } from "./MetricCard";
import { DebtorRow } from "./DebtorRow";
import { GroupCard } from "./GroupCard";
import { PaymentModal } from "./PaymentModal";
import { CreateTripModal } from "./CreateTripModal";
import { useAuth } from "@/hooks/useAuth";

export default function DebtApp() {
  const { user } = useAuth();

  const [loans, setLoans] = useState<ApiLoan[]>([]);
  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState<number | null>(null);
  const [showCreateTrip, setShowCreateTrip] = useState(false);

  const [lenderLinkCopied, setLenderLinkCopied] = useState(false);

  const handleCopyLenderLink = async () => {
    if (!user?.line_id) return;
    const link = `${window.location.origin}/lender/${user.line_id}`;
    await navigator.clipboard.writeText(link);
    setLenderLinkCopied(true);
    setTimeout(() => setLenderLinkCopied(false), 2000);
  };

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [loansData, groupsData] = await Promise.all([
        api.getLoans({ role: "lender" }),
        api.getGroups(),
      ]);
      setLoans(loansData);
      setApiGroups(groupsData);
    } catch (e) {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Map loans → debtors
  const myId = user?.id ?? 0;
  const debtors: Debtor[] = loans.map((loan, i) => loanToDebtor(loan, myId, i));

  // Map API groups → Group type ที่ UI ใช้
  const groups: Group[] = apiGroups.map((g) => ({
    id: g.id,
    name: g.name,
    emoji: "✈️",
    date: g.created_at
      ? new Date(g.created_at).toLocaleDateString("th-TH", { month: "short", year: "2-digit" })
      : "",
  }));

  const selectedDebtor = debtors.find((d) => d.loanId === selectedLoanId) ?? null;

  // Metrics
  const totalAmount = debtors.reduce((s, d) => s + d.total, 0);
  const totalPaid = debtors.reduce((s, d) => s + d.paid, 0);
  const paidCount = debtors.filter(isPaid).length;
  const pendingCount = debtors.filter((d) => !isPaid(d)).length;

  const handleConfirm = async (loanId: number, amount: number) => {
    try {
      await api.recordPayment(loanId, { amount });
      const d = debtors.find((x) => x.loanId === loanId)!;
      const willBePaid = d.paid + amount >= d.total;
      toast(willBePaid
        ? `${d.name} จ่ายครบแล้ว ${fmt(d.total)}`
        : `รับ ${fmt(amount)} จาก ${d.name} แล้ว`
      );
      setSelectedLoanId(null);
      fetchAll();
    } catch (e: any) {
      toast.error(e.message ?? "บันทึกไม่สำเร็จ");
    }
  };

  const pending = debtors.filter((d) => !isPaid(d));
  const done = debtors.filter(isPaid);

  // Loading skeleton
  if (loading) {
    return (
      <>
        <div className="mb-6 flex items-center gap-4">
          <Skeleton className="w-15 h-15 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-xl mb-5" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl mb-2" />)}
      </>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        {user && (
          <img
            className="w-15 h-15 rounded-xl object-cover"
            src={user.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
            alt={user.name}
          />
        )}
        <div>
          <h1 className="text-2xl font-medium text-foreground leading-tight">
            อย่างน้อยก็จ่ายทีละนิดนะ จาก {user?.name ?? ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            จ่ายหมดหรือผ่อนก็ได้ — เลือกรายชื่อแล้วกดได้เลย
          </p>
        </div>
      </div>

      {/* Static lender link */}
      {user?.line_id && (
        <button
          onClick={handleCopyLenderLink}
          className="w-full flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-left hover:bg-muted/80 transition-colors group mb-5"
        >
          <div className="w-7 h-7 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0">
            {lenderLinkCopied ? (
              <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {lenderLinkCopied ? "คัดลอกแล้ว!" : "ลิงก์ของฉัน (ส่งให้ลูกหนี้)"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {window.location.origin}/lender/{user.line_id}
            </p>
          </div>
          <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-5">
        <MetricCard
          label="ยังค้าง"
          value={fmt(totalAmount - totalPaid)}
          sub={`${pendingCount} คน`}
          trendMode="lower-is-better"
          current={totalAmount - totalPaid}
        />
        <MetricCard
          label="ชำระแล้ว"
          value={fmt(totalPaid)}
          sub={`${paidCount} คน`}
          trendMode="higher-is-better"
          current={totalPaid}
        />
        <MetricCard
          label="ยอดรวม"
          value={fmt(totalAmount)}
          sub={`${debtors.length} รายการ`}
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ind">
        <TabsList className="w-full mb-5">
          <TabsTrigger value="ind" className="flex-1 gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            รายบุคคล
          </TabsTrigger>
          <TabsTrigger value="grp" className="flex-1 gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            กลุ่ม {groups.length > 0 && `(${groups.length})`}
          </TabsTrigger>
          <TabsTrigger value="done" className="flex-1 gap-1.5">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            จ่ายแล้ว
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ind">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2.5">
            รอชำระ
          </p>
          {pending.length ? (
            <div className="bg-background rounded-2xl overflow-hidden">
              {pending.map((d) => (
                <DebtorRow key={d.loanId} debtor={d} onSelect={(id) => setSelectedLoanId(d.loanId)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ไม่มีใครค้างเงินแล้ว 🎉
            </div>
          )}
        </TabsContent>

        <TabsContent value="grp">
          {/* Header + ปุ่มสร้างทริป */}
          <div className="flex items-center justify-between mb-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground">
              กลุ่มทริป / งาน
            </p>
            <button
              onClick={() => setShowCreateTrip(true)}
              className="flex items-center gap-1 text-[11px] font-semibold text-foreground bg-foreground/8 hover:bg-foreground/15 transition-colors rounded-lg px-2.5 py-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              สร้างทริป
            </button>
          </div>

          {groups.length ? groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              debtors={debtors.filter((d) => d.groupId === g.id)}
              onSelect={(id) => {
                const debtor = debtors.find(d => d.id === id);
                if (debtor) setSelectedLoanId(debtor.loanId);
              }}
            />
          )) : (
            <div className="text-center py-10 text-muted-foreground text-sm space-y-3">
              <p>✈️ ยังไม่มีกลุ่มทริป</p>
              <button
                onClick={() => setShowCreateTrip(true)}
                className="text-[12px] font-medium text-foreground underline underline-offset-2"
              >
                + สร้างกลุ่มทริปแรก
              </button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="done">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2.5">
            จ่ายครบแล้ว
          </p>
          {done.length ? (
            <div className="bg-background rounded-2xl overflow-hidden">
              {done.map((d) => (
                <DebtorRow key={d.loanId} debtor={d} onSelect={(id) => setSelectedLoanId(d.loanId)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ยังไม่มีใครจ่ายครบเลย
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal — รับเงิน */}
      <PaymentModal
        debtor={selectedDebtor}
        open={selectedLoanId !== null}
        onClose={() => setSelectedLoanId(null)}
        onConfirm={handleConfirm}
      />

      {/* Modal — สร้างทริป */}
      <CreateTripModal
        open={showCreateTrip}
        onClose={() => setShowCreateTrip(false)}
        onCreated={() => {
          setShowCreateTrip(false);
          fetchAll();
        }}
      />
    </>
  );
}

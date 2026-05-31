import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  fmt,
  initialDebtors,
  groups,
  isPaid,
  remaining,
  type Debtor,
} from "@/lib/debtStore";
import { MetricCard } from "./MetricCard";
import { DebtorRow } from "./DebtorRow";
import { GroupCard } from "./GroupCard";
import { PaymentModal } from "./PaymentModal";

export default function DebtApp() {
  const [debtors, setDebtors] = useState<Debtor[]>(initialDebtors);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selectedDebtor = debtors.find((d) => d.id === selectedId) ?? null;

  // Metrics
  const totalAmount = debtors.reduce((s, d) => s + d.total, 0);
  const totalPaid = debtors.reduce((s, d) => s + d.paid, 0);
  const paidCount = debtors.filter(isPaid).length;
  const pendingCount = debtors.filter((d) => !isPaid(d)).length;

  const handleConfirm = (debtorId: number, amount: number) => {
    setDebtors((prev) =>
      prev.map((d) =>
        d.id === debtorId ? { ...d, paid: d.paid + amount } : d,
      ),
    );
    const d = debtors.find((x) => x.id === debtorId)!;
    const willBePaid = d.paid + amount >= d.total;
    toast({
      description: willBePaid
        ? `${d.name} จ่ายครบแล้ว ${fmt(d.total)}`
        : `รับ ${fmt(amount)} จาก ${d.name} แล้ว`,
    });
    setSelectedId(null);
  };

  const pending = debtors.filter((d) => !isPaid(d));
  const done = debtors.filter(isPaid);

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <img
          className="w-15 h-15 rounded-xl"
          src="https://profile.line-scdn.net/0h4lCXl0kQa0N-IXR66vwUFANkZS4JD20LBhV3IQwmMydbFClGQEYtdwgnYCYGFXtGEk5zdQgkYHUADitGNB5QRClgawZTF0ttHUBiWQJfbTITWllsPBJSIjNHdnAtUFERPkZ9UAlAaxssc3pIFgFnWiVfbiYuEGdHARI"
          alt=""
        />
        <div className="">
          <h1 className="text-2xl font-medium text-foreground leading-tight">
            อย่างน้อยก็จ่ายทีละนิดนะ จาก นัท
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            จ่ายหมดหรือผ่อนก็ได้ — เลือกรายชื่อแล้วกดได้เลย
          </p>
        </div>
      </div>

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
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            รายบุคคล
          </TabsTrigger>
          <TabsTrigger value="grp" className="flex-1 gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            กลุ่ม
          </TabsTrigger>
          <TabsTrigger value="done" className="flex-1 gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <div className="bg-background  rounded-2xl overflow-hidden">
              {pending.map((d) => (
                <DebtorRow key={d.id} debtor={d} onSelect={setSelectedId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ไม่มีใครค้างเงินแล้ว 🎉
            </div>
          )}
        </TabsContent>

        <TabsContent value="grp">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2.5">
            กลุ่มทริป / งาน
          </p>
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              debtors={debtors.filter((d) => d.groupId === g.id)}
              onSelect={setSelectedId}
            />
          ))}
        </TabsContent>

        <TabsContent value="done">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-muted-foreground mb-2.5">
            จ่ายครบแล้ว
          </p>
          {done.length ? (
            <div className="bg-background rounded-2xl overflow-hidden">
              {done.map((d) => (
                <DebtorRow key={d.id} debtor={d} onSelect={setSelectedId} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              ยังไม่มีใครจ่ายครบเลย
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal */}
      <PaymentModal
        debtor={selectedDebtor}
        open={selectedId !== null}
        onClose={() => setSelectedId(null)}
        onConfirm={handleConfirm}
      />
    </>
  );
}

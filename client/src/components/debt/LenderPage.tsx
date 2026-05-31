// LenderPage.tsx
import { useState, useEffect, useMemo } from "react";
import { api, type GuestLenderPage, type LenderLoanSummary } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function getLineId(): string | null {
  if (typeof window === "undefined") return null;
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1] || null;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const colors = [
    "from-violet-400 to-indigo-500",
    "from-rose-400 to-pink-500",
    "from-amber-400 to-orange-500",
    "from-emerald-400 to-teal-500",
    "from-sky-400 to-blue-500",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  );
}

// ---- Search Box ----
function SearchBox({
  value,
  onChange,
  placeholder = "ค้นหาชื่อ...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-9 py-2.5 text-sm bg-muted/50 border border-border/60 rounded-xl outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/40 transition-all placeholder:text-muted-foreground/60"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---- Dialog แสดงรายละเอียดหนี้ ----
function LoanDetailDialog({
  loan,
  open,
  onClose,
}: {
  loan: LenderLoanSummary | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!loan) return null;
  const pct = Math.round(loan.paid_percentage);
  const remaining = Number(loan.remaining);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar name={loan.borrower_name ?? "?"} size="lg" />
            <div>
              <p className="text-base font-bold">{loan.borrower_name ?? "ไม่ระบุชื่อ"}</p>
              {loan.group_name && (
                <p className="text-xs text-muted-foreground font-normal">✈️ {loan.group_name}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* dates */}
          <div className="flex flex-wrap gap-2">
            {loan.loan_date && (
              <span className="text-xs bg-muted rounded-lg px-2.5 py-1 text-muted-foreground">
                📅 {new Date(loan.loan_date).toLocaleDateString("th-TH")}
              </span>
            )}
            {loan.due_date && (
              <span className={`text-xs rounded-lg px-2.5 py-1 ${
                loan.is_overdue
                  ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                  : "bg-muted text-muted-foreground"
              }`}>
                ⏰ ครบ {new Date(loan.due_date).toLocaleDateString("th-TH")}
                {loan.is_overdue && " · เกินกำหนด"}
              </span>
            )}
          </div>

          {/* description */}
          {loan.description && (
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl px-3 py-2.5">
              {loan.description}
            </p>
          )}

          {/* amounts */}
          <div className="bg-muted/30 rounded-2xl p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ยอดรวม</span>
              <span className="font-medium">{fmt(Number(loan.amount))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ชำระแล้ว</span>
              <span className="font-medium text-emerald-600">{fmt(Number(loan.paid_amount))}</span>
            </div>
            {pct > 0 && pct < 100 && (
              <div className="space-y-1 pt-1">
                <Progress value={pct} className="h-1.5" />
                <p className="text-right text-xs text-muted-foreground">{pct}%</p>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-border">
              <span className="text-sm font-bold">ค้างอยู่</span>
              <span className={`text-xl font-bold ${remaining > 0 ? "text-destructive" : "text-emerald-600"}`}>
                {remaining > 0 ? fmt(remaining) : "ครบแล้ว ✓"}
              </span>
            </div>
          </div>

          {/* pay button */}
          {loan.status !== "settled" ? (
            <button
              onClick={() => { window.location.href = loan.guest_link; }}
              className="w-full bg-foreground text-background font-semibold text-sm py-3.5 rounded-2xl hover:bg-foreground/90 active:scale-[.98] transition-all"
            >
              แจ้งชำระรายการนี้ →
            </button>
          ) : (
            <div className="text-center py-2">
              <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-sm px-4 py-1.5">
                ✓ ชำระครบแล้ว
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- PersonalLoanRow: แถวหนี้เดี่ยว ----
function PersonalLoanRow({
  loan,
  onClick,
  compact = false,
}: {
  loan: LenderLoanSummary;
  onClick: () => void;
  compact?: boolean;
}) {
  const remaining = Number(loan.remaining);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 ${compact ? "px-4 py-2.5" : "px-4 py-3"} hover:bg-muted/50 transition-colors text-left`}
    >
      {!compact && <Avatar name={loan.borrower_name ?? "?"} />}
      <div className="flex-1 min-w-0">
        {!compact && (
          <p className="text-sm font-semibold text-foreground">{loan.borrower_name ?? "ไม่ระบุชื่อ"}</p>
        )}
        <p className={`${compact ? "text-sm text-foreground" : "text-xs text-muted-foreground"} truncate`}>
          {loan.description
            ? loan.description
            : compact
            ? "ไม่ระบุรายละเอียด"
            : ""}
          {loan.due_date
            ? ` · ครบ ${new Date(loan.due_date).toLocaleDateString("th-TH")}`
            : ""}
        </p>
        {compact && loan.loan_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            📅 {new Date(loan.loan_date).toLocaleDateString("th-TH")}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        {loan.status === "settled" ? (
          <span className="text-xs text-emerald-600 font-medium">✓ ครบ</span>
        ) : (
          <>
            <p className="text-sm font-bold text-destructive">{fmt(remaining)}</p>
            {loan.is_overdue && <p className="text-[10px] text-red-500">เกินกำหนด</p>}
          </>
        )}
      </div>
      <svg
        className="w-4 h-4 text-muted-foreground shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  );
}

// ---- PersonalBorrowerSection: accordion สำหรับคนที่มีหลายรายการ ----
function PersonalBorrowerSection({
  borrowerKey,
  borrowerName,
  loans,
  onSelectLoan,
}: {
  borrowerKey: string;
  borrowerName: string;
  loans: LenderLoanSummary[];
  onSelectLoan: (loan: LenderLoanSummary) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeLoans = loans.filter((l) => l.status !== "settled");
  const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining), 0);
  const allSettled = activeLoans.length === 0;

  // คนเดียวมีแค่ 1 รายการ — แสดงแบบ flat ปกติ ไม่ accordion
  if (loans.length === 1) {
    return (
      <PersonalLoanRow loan={loans[0]} onClick={() => onSelectLoan(loans[0])} />
    );
  }

  return (
    <div>
      {/* Borrower header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
      >
        <Avatar name={borrowerName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{borrowerName}</p>
          <p className="text-xs text-muted-foreground">
            {loans.length} รายการ ·{" "}
            {allSettled ? "✓ ครบทุกรายการ" : `ค้าง ${activeLoans.length} รายการ`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!allSettled ? (
            <p className="text-sm font-bold text-destructive">{fmt(totalRemaining)}</p>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">✓ ครบ</span>
          )}
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Loan rows (compact) */}
      {expanded && (
        <div className="bg-muted/20 border-t border-border/50 divide-y divide-border/50">
          {loans.map((loan) => (
            <PersonalLoanRow
              key={loan.id}
              loan={loan}
              onClick={() => onSelectLoan(loan)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- GroupSection ----
function GroupSection({
  groupName,
  loans,
  onSelectLoan,
}: {
  groupName: string;
  loans: LenderLoanSummary[];
  onSelectLoan: (loan: LenderLoanSummary) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const activeLoans = loans.filter((l) => l.status !== "settled");
  const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining), 0);
  const allSettled = activeLoans.length === 0;

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-background">
      {/* Group header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="text-base shrink-0">✈️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{groupName}</p>
          <p className="text-xs text-muted-foreground">
            {loans.length} คน · {allSettled ? "✓ ครบทุกคน" : `ยังค้าง ${activeLoans.length} คน`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!allSettled ? (
            <span className="text-sm font-bold text-destructive">{fmt(totalRemaining)}</span>
          ) : (
            <span className="text-xs text-emerald-600 font-medium">✓ ครบ</span>
          )}
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Member list */}
      {expanded && (
        <div className="divide-y divide-border/60">
          {loans.map((loan) => (
            <button
              key={loan.id}
              onClick={() => onSelectLoan(loan)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
            >
              <Avatar name={loan.borrower_name ?? "?"} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{loan.borrower_name ?? "ไม่ระบุชื่อ"}</p>
                {loan.due_date && (
                  <p className="text-xs text-muted-foreground">
                    ครบ {new Date(loan.due_date).toLocaleDateString("th-TH")}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                {loan.status === "settled" ? (
                  <span className="text-xs text-emerald-600 font-medium">✓ ครบ</span>
                ) : (
                  <>
                    <p className="text-sm font-bold text-destructive">{fmt(Number(loan.remaining))}</p>
                    {loan.is_overdue && <p className="text-[10px] text-red-500">เกินกำหนด</p>}
                  </>
                )}
              </div>
              <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Tab button ----
function TabBtn({ active, onClick, children, badge }: {
  active: boolean; onClick: () => void; children: React.ReactNode; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
        active ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center ${
          active ? "bg-white/20 text-background" : "bg-destructive/10 text-destructive"
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ---- Empty state ----
function EmptySearch({ query }: { query: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-3xl mb-2">🔍</p>
      <p className="text-sm font-medium text-foreground">ไม่พบ "{query}"</p>
      <p className="text-xs text-muted-foreground mt-1">ลองค้นหาด้วยชื่ออื่น</p>
    </div>
  );
}

// ---- Main ----
export default function LenderPage() {
  const [data, setData] = useState<GuestLenderPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"personal" | "group">("personal");
  const [selectedLoan, setSelectedLoan] = useState<LenderLoanSummary | null>(null);
  const [search, setSearch] = useState("");

  const lineId = getLineId();

  useEffect(() => {
    if (!lineId) { setError("ไม่พบ LINE ID ใน URL"); setLoading(false); return; }
    api.getLenderByLineId(lineId)
      .then((d) => {
        setData(d);
        // default tab: ถ้ามีทริปให้เปิด group ก่อน
        if (d.loans.some((l) => l.group_id)) setTab("group");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [lineId]);

  // reset search เมื่อเปลี่ยน tab
  const handleTabChange = (next: "personal" | "group") => {
    setTab(next);
    setSearch("");
  };

  // ---- derived data ----
  const groupLoans    = useMemo(() => data?.loans.filter((l) => l.group_id != null) ?? [], [data]);
  const personalLoans = useMemo(() => data?.loans.filter((l) => l.group_id == null) ?? [], [data]);

  // filtered by search
  const q = search.trim().toLowerCase();

  // personal loans grouped by borrower
  const filteredPersonalGroups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; loans: LenderLoanSummary[] }>();
    for (const loan of personalLoans) {
      const key = loan.borrower_id != null
        ? `id:${loan.borrower_id}`
        : `name:${loan.borrower_name ?? "unknown"}`;
      const name = loan.borrower_name ?? "ไม่ระบุชื่อ";
      if (!map.has(key)) map.set(key, { key, name, loans: [] });
      map.get(key)!.loans.push(loan);
    }
    const groups = Array.from(map.values());
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [personalLoans, q]);

  const filteredGroupMap = useMemo(() => {
    const map = new Map<number, { name: string; loans: LenderLoanSummary[] }>();
    for (const loan of groupLoans) {
      if (!loan.group_id) continue;
      const name = loan.group_name ?? `กลุ่ม #${loan.group_id}`;
      // filter by borrower name OR group name
      if (q && !((loan.borrower_name ?? "").toLowerCase().includes(q)) && !name.toLowerCase().includes(q)) continue;
      if (!map.has(loan.group_id)) map.set(loan.group_id, { name, loans: [] });
      map.get(loan.group_id)!.loans.push(loan);
    }
    return Array.from(map.values());
  }, [groupLoans, q]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-20 rounded-2xl" />
      <Skeleton className="h-12 rounded-2xl" />
      <Skeleton className="h-10 rounded-xl" />
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );

  if (error) return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">😕</p>
      <p className="font-medium text-foreground">{error}</p>
      <p className="text-sm text-muted-foreground mt-1">ไม่พบเจ้าหนี้จาก LINE ID นี้</p>
    </div>
  );

  if (!data) return null;

  const pendingPersonal = personalLoans.filter((l) => l.status !== "settled").length;
  const pendingGroup    = groupLoans.filter((l) => l.status !== "settled").length;
  const totalRemaining  = data.loans
    .filter((l) => l.status !== "settled")
    .reduce((s, l) => s + Number(l.remaining), 0);

  const hasPersonal = personalLoans.length > 0;
  const hasGroup    = groupLoans.length > 0;

  return (
    <>
      <div className="space-y-4">
        {/* Lender header */}
        <div className="flex items-center gap-4">
          <img
            className="w-16 h-16 rounded-2xl object-cover shadow"
            src={data.lender.avatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(data.lender.name)}&background=random&size=128`}
            alt={data.lender.name}
          />
          <div>
            <h1 className="text-xl font-semibold text-foreground">{data.lender.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">เจ้าหนี้ของคุณ</p>
            {totalRemaining > 0 && (
              <p className="text-sm font-bold text-destructive mt-1">ยอดรวมค้าง {fmt(totalRemaining)}</p>
            )}
            {totalRemaining === 0 && data.loans.length > 0 && (
              <p className="text-sm font-bold text-emerald-600 mt-1">🎉 ชำระครบทุกรายการแล้ว</p>
            )}
          </div>
        </div>

        {/* Tabs — แสดงเสมอถ้ามี loans */}
        {data.loans.length > 0 && (
          <div className="flex gap-1 p-1 bg-muted/40 rounded-2xl">
            <TabBtn
              active={tab === "personal"}
              onClick={() => handleTabChange("personal")}
              badge={pendingPersonal}
            >
              👤 รายบุคคล
            </TabBtn>
            <TabBtn
              active={tab === "group"}
              onClick={() => handleTabChange("group")}
              badge={pendingGroup}
            >
              ✈️ กลุ่มทริป
            </TabBtn>
          </div>
        )}

        {/* Search */}
        {data.loans.length > 0 && (
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={tab === "personal" ? "ค้นหาชื่อลูกหนี้..." : "ค้นหาชื่อหรือกลุ่มทริป..."}
          />
        )}

        {/* Personal tab */}
        {tab === "personal" && (
          <>
            {!hasPersonal ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                ไม่มีรายการหนี้รายบุคคล
              </div>
            ) : filteredPersonalGroups.length === 0 ? (
              <EmptySearch query={search} />
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden bg-background divide-y divide-border/60">
                {filteredPersonalGroups.map((g) => (
                  <PersonalBorrowerSection
                    key={g.key}
                    borrowerKey={g.key}
                    borrowerName={g.name}
                    loans={g.loans}
                    onSelectLoan={setSelectedLoan}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Group tab */}
        {tab === "group" && (
          <>
            {!hasGroup ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                ไม่มีรายการหนี้กลุ่มทริป
              </div>
            ) : filteredGroupMap.length === 0 ? (
              <EmptySearch query={search} />
            ) : (
              <div className="space-y-3">
                {filteredGroupMap.map((g) => (
                  <GroupSection
                    key={g.name}
                    groupName={g.name}
                    loans={g.loans}
                    onSelectLoan={setSelectedLoan}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {data.loans.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎉</p>
            <p className="font-medium text-foreground">ไม่มีรายการหนี้</p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <LoanDetailDialog
        loan={selectedLoan}
        open={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
      />
    </>
  );
}
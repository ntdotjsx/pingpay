// DashboardContent.tsx — dashboard จัดการหนี้ครบวงจร
import { useState, useEffect, useCallback } from "react";
import { api, type ApiDashboard, type ApiLoan, type ApiPayment } from "@/lib/api";
import { fmt, loanToDebtor } from "@/lib/debtStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

// ─── helpers ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

function statusLabel(s: string) {
  if (s === "settled") return { text: "ครบ", cls: "text-emerald-600 border-emerald-200 bg-emerald-50" };
  if (s === "overdue") return { text: "เกินกำหนด", cls: "text-red-600 border-red-200 bg-red-50" };
  return { text: "ค้างอยู่", cls: "text-amber-600 border-amber-200 bg-amber-50" };
}

function Avatar({ name, avatar, size = "sm" }: { name: string; avatar?: string | null; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-10 h-10 text-base" : "w-8 h-8 text-sm";
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover shrink-0`} />;
  return (
    <div className={`${sz} rounded-full bg-violet-100 flex items-center justify-center font-semibold text-violet-700 shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Add Loan Modal (รายคน + กลุ่มทริป) ──────────────────────────────────────

interface Member { id: number; name: string; email: string | null }

interface TripMember {
  id: string           // local temp id
  name: string
  user_id?: number
}

type AddMode = "single" | "group"

function AddLoanModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<AddMode>("single");

  // รายคน
  const [members, setMembers] = useState<Member[]>([]);
  const [borrowerId, setBorrowerId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [search, setSearch] = useState("");

  // กลุ่มทริป
  const [tripName, setTripName] = useState("");
  const [amountPerPerson, setAmountPerPerson] = useState("");
  const [tripDueDate, setTripDueDate] = useState("");
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [manualName, setManualName] = useState("");

  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMembersLoading(true);
    api.getMembers()
      .then(setMembers)
      .finally(() => setMembersLoading(false));
  }, [open]);

  const reset = () => {
    setMode("single");
    setBorrowerId(""); setAmount(""); setDesc(""); setDueDate(""); setSearch("");
    setTripName(""); setAmountPerPerson(""); setTripDueDate("");
    setTripMembers([]); setMemberSearch(""); setManualName("");
  };

  const handleClose = () => { reset(); onClose(); };

  // ---- รายคน ----
  const handleSubmitSingle = async () => {
    if (!borrowerId) { toast.error("กรุณาเลือกลูกหนี้"); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("กรุณาใส่จำนวนเงิน"); return; }
    setLoading(true);
    try {
      await api.createLoan({
        borrower_id: borrowerId as number,
        amount: amt,
        description: desc || undefined,
        due_date: dueDate || undefined,
      });
      toast.success("เพิ่มรายการสำเร็จ");
      reset(); onCreated(); onClose();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  // ---- กลุ่มทริป ----
  const filteredApiMembers = members.filter(
    (m) =>
      !tripMembers.some((sel) => sel.user_id === m.id) &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const addTripMember = (m: Member) => {
    setTripMembers((p) => [...p, { id: `u${m.id}`, name: m.name, user_id: m.id }]);
    setMemberSearch("");
  };

  const addManual = () => {
    const n = manualName.trim();
    if (!n) return;
    setTripMembers((p) => [...p, { id: `m${Date.now()}`, name: n }]);
    setManualName("");
  };

  const removeTripMember = (id: string) => setTripMembers((p) => p.filter((m) => m.id !== id));

  const handleSubmitGroup = async () => {
    if (!tripName.trim()) { toast.error("กรุณาใส่ชื่อทริป"); return; }
    const amt = parseFloat(amountPerPerson);
    if (!amt || amt <= 0) { toast.error("กรุณาใส่ยอดคนละ"); return; }
    if (tripMembers.length === 0) { toast.error("กรุณาเพิ่มสมาชิกอย่างน้อย 1 คน"); return; }
    setLoading(true);
    try {
      await api.createGroup({
        name: tripName.trim(),
        amount_per_person: amt,
        due_date: tripDueDate || undefined,
        members: tripMembers.map((m) => ({ name: m.name, user_id: m.user_id })),
      });
      toast.success(`สร้างทริป "${tripName}" สำเร็จ!`);
      reset(); onCreated(); onClose();
    } catch (e: any) {
      toast.error(e.message ?? "สร้างกลุ่มไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const tripAmt = parseFloat(amountPerPerson) || 0;
  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.email ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={v => !v && handleClose()}>
      <DialogContent className="max-w-sm max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการยืมเงิน</DialogTitle>
          <DialogDescription>เลือกแบบรายคน หรือสร้างกลุ่มทริป</DialogDescription>
        </DialogHeader>

        {/* Mode switcher */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl mb-1">
          <button
            onClick={() => setMode("single")}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "single"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            รายคน
          </button>
          <button
            onClick={() => setMode("group")}
            className={`flex-1 py-1.5 text-sm rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === "group"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="text-base leading-none">✈️</span>
            กลุ่มทริป
          </button>
        </div>

        {/* ======= รายคน ======= */}
        {mode === "single" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">ลูกหนี้ *</p>
              <Input
                placeholder="ค้นหาชื่อ..."
                value={search}
                onChange={e => { setSearch(e.target.value); setBorrowerId(""); }}
                className="mb-1.5"
              />
              {membersLoading ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-border bg-muted/30 divide-y divide-border">
                  {filtered.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">ไม่พบสมาชิก</p>
                  ) : filtered.map(m => (
                    <button
                      key={m.id}
                      onClick={() => { setBorrowerId(m.id); setSearch(m.name); }}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                        borrowerId === m.id
                          ? "bg-foreground/8 font-medium text-foreground"
                          : "hover:bg-muted/60 text-foreground"
                      }`}
                    >
                      <span className="font-medium">{m.name}</span>
                      {m.email && <span className="text-xs text-muted-foreground ml-2">{m.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">จำนวนเงิน (บาท) *</p>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
                <span className="text-sm text-muted-foreground font-medium">฿</span>
                <Input
                  type="number" placeholder="0" value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">หมายเหตุ</p>
              <Input placeholder="เช่น ค่าอาหาร, ค่าเที่ยว..." value={desc} onChange={e => setDesc(e.target.value)} />
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">วันครบกำหนด (ไม่บังคับ)</p>
              <Input
                type="date" value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleSubmitSingle} disabled={loading}>
                {loading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </div>
          </div>
        )}

        {/* ======= กลุ่มทริป ======= */}
        {mode === "group" && (
          <div className="space-y-3">
            {/* ชื่อทริป */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">ชื่อทริป / งาน *</p>
              <Input
                placeholder="เช่น ทริปเชียงใหม่ มีค. 68"
                value={tripName}
                onChange={e => setTripName(e.target.value)}
              />
            </div>

            {/* ยอดคนละ */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">ยอดคนละ (บาท) *</p>
              <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 bg-background">
                <span className="text-sm text-muted-foreground font-medium">฿</span>
                <Input
                  type="number" placeholder="0" value={amountPerPerson}
                  onChange={e => setAmountPerPerson(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto text-base font-medium focus-visible:ring-0 shadow-none"
                />
              </div>
            </div>

            {/* วันครบกำหนด */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">วันครบกำหนด (ไม่บังคับ)</p>
              <Input type="date" value={tripDueDate} onChange={e => setTripDueDate(e.target.value)} />
            </div>

            {/* เพิ่มสมาชิกจากระบบ */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">เพิ่มสมาชิก</p>
              <Input
                placeholder="ค้นหาชื่อในระบบ..."
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
              />
              {memberSearch && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden bg-background shadow-sm">
                  {membersLoading && (
                    <p className="text-xs text-muted-foreground px-3 py-2">กำลังโหลด...</p>
                  )}
                  {!membersLoading && filteredApiMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground px-3 py-2">ไม่พบชื่อนี้ในระบบ</p>
                  )}
                  {filteredApiMembers.slice(0, 5).map(m => (
                    <button
                      key={m.id}
                      onClick={() => addTripMember(m)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                        {m.name[0]}
                      </div>
                      {m.name}
                      {m.email && <span className="text-xs text-muted-foreground">{m.email}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* เพิ่มชื่อเอง */}
            <div className="flex gap-2">
              <Input
                placeholder="หรือพิมพ์ชื่อเพื่อน (ไม่มีบัญชี)..."
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addManual()}
              />
              <Button variant="outline" onClick={addManual} disabled={!manualName.trim()} className="shrink-0">
                + เพิ่ม
              </Button>
            </div>

            {/* รายชื่อที่เลือก */}
            {tripMembers.length > 0 && (
              <div className="bg-muted/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    รายชื่อ ({tripMembers.length} คน)
                  </p>
                  {tripAmt > 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      รวม <span className="font-semibold text-foreground">{fmt(tripAmt * tripMembers.length)}</span>
                    </p>
                  )}
                </div>
                {tripMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 border-b border-border/40 last:border-0">
                    <div className="w-5 h-5 rounded-full bg-foreground/10 flex items-center justify-center text-[10px] font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <span className="flex-1 text-sm text-foreground">{m.name}</span>
                    {m.user_id ? (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        มีบัญชี
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">บันทึกชื่อ</span>
                    )}
                    <button
                      onClick={() => removeTripMember(m.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {tripMembers.some(m => m.user_id) && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-[11px] text-amber-700 dark:text-amber-400">
                💡 คนที่มีบัญชีจะได้ guest link ให้จ่ายได้เลย — copy ได้จาก tab กลุ่ม
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={handleClose}>ยกเลิก</Button>
              <Button className="flex-1" onClick={handleSubmitGroup} disabled={loading}>
                {loading ? "กำลังสร้าง..." : "✓ สร้างทริป"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Loan Detail + Confirm/Reject Modal ──────────────────────────────────────

function LoanDetailModal({ loan, open, onClose, onUpdated }: {
  loan: ApiLoan | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [pendingPayments, setPendingPayments] = useState<ApiPayment[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [copying, setCopying] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loan || !open) return;
    setLoadingPending(true);
    api.pendingPayments(loan.id)
      .then((data: any) => setPendingPayments(Array.isArray(data) ? data : []))
      .catch(() => setPendingPayments([]))
      .finally(() => setLoadingPending(false));
  }, [loan, open]);

  if (!loan) return null;

  const remaining = parseFloat(loan.remaining_amount);
  const total = parseFloat(loan.amount);
  const paid = total - remaining;
  const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
  const st = statusLabel(loan.status);

  const handleConfirm = async (paymentId: number) => {
    setConfirmingId(paymentId);
    try {
      await api.confirmPayment(loan.id, paymentId);
      toast.success("ยืนยันการชำระสำเร็จ");
      setPendingPayments(p => p.filter(x => x.id !== paymentId));
      onUpdated();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    setRejectingId(paymentId);
    try {
      await api.rejectPayment(loan.id, paymentId);
      toast("ปฏิเสธการชำระแล้ว");
      setPendingPayments(p => p.filter(x => x.id !== paymentId));
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setRejectingId(null);
    }
  };

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      const { guest_link } = await api.getGuestLink(loan.id);
      await navigator.clipboard.writeText(guest_link);
      toast.success("คัดลอก link แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  const handleDelete = async () => {
    if (!confirm("ลบรายการนี้?")) return;
    setDeleting(true);
    try {
      await api.deleteLoan(loan.id);
      toast.success("ลบรายการสำเร็จ");
      onUpdated();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "ลบไม่สำเร็จ");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar name={loan.borrower?.name ?? "?"} size="sm" />
            <span>{loan.borrower?.name ?? `#${loan.id}`}</span>
            <Badge variant="outline" className={`text-xs ml-auto ${st.cls}`}>{st.text}</Badge>
          </DialogTitle>
          <DialogDescription>{loan.description ?? "ไม่มีหมายเหตุ"}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/40 rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ยอดรวม</span>
            <span className="font-medium">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">ชำระแล้ว</span>
            <span className="font-medium text-emerald-600">{fmt(paid)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold">
            <span>ยังค้าง</span>
            <span className="text-destructive text-base">{fmt(remaining)}</span>
          </div>
          {pct > 0 && (
            <div className="space-y-1 pt-1">
              <Progress value={pct} className="h-1.5" />
              <p className="text-xs text-muted-foreground text-right">{pct}%</p>
            </div>
          )}
          {loan.due_date && (
            <p className="text-xs text-muted-foreground pt-1">
              ครบกำหนด {new Date(loan.due_date).toLocaleDateString("th-TH")}
            </p>
          )}
        </div>

        {loadingPending ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : pendingPayments.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              รอยืนยัน ({pendingPayments.length})
            </p>
            <div className="space-y-2">
              {pendingPayments.map(p => (
                <div key={p.id} className="border border-amber-200 bg-amber-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-amber-800">{fmt(parseFloat(p.amount))}</p>
                      <p className="text-xs text-amber-600">
                        {new Date(p.paid_at).toLocaleDateString("th-TH")}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    {p.proof_url && (
                      <a href={`${API_BASE}${p.proof_url}`} target="_blank" rel="noopener"
                        className="text-xs text-amber-700 underline shrink-0 ml-2">
                        ดูสลิป
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm" className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleConfirm(p.id)} disabled={confirmingId === p.id}
                    >
                      {confirmingId === p.id ? "..." : "✓ ยืนยัน"}
                    </Button>
                    <Button
                      size="sm" variant="outline" className="flex-1 h-8 text-xs text-destructive border-destructive/30"
                      onClick={() => handleReject(p.id)} disabled={rejectingId === p.id}
                    >
                      {rejectingId === p.id ? "..." : "✕ ปฏิเสธ"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loan.payments && loan.payments.filter(p => p.confirmation_status === "confirmed").length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              ประวัติการชำระ
            </p>
            <div className="bg-background border border-border rounded-xl overflow-hidden">
              {loan.payments
                .filter(p => p.confirmation_status === "confirmed")
                .map(p => (
                  <div key={p.id} className="flex justify-between px-3 py-2 border-b border-border last:border-b-0">
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.paid_at).toLocaleDateString("th-TH")}
                      {p.note && ` · ${p.note}`}
                    </p>
                    <span className="text-xs font-medium text-emerald-600">{fmt(parseFloat(p.amount))}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline" size="sm" className="flex-1 text-xs"
            onClick={handleCopyLink} disabled={copying}
          >
            {copying ? "✓ คัดลอกแล้ว" : "🔗 คัดลอก link"}
          </Button>
          {loan.status !== "settled" && (
            <Button
              variant="outline" size="sm" className="text-xs text-destructive border-destructive/30"
              onClick={handleDelete} disabled={deleting}
            >
              {deleting ? "..." : "ลบ"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string;
  color?: "green" | "red" | "default";
}) {
  return (
    <div className="bg-background border border-border rounded-2xl p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${
        color === "green" ? "text-emerald-600" :
        color === "red" ? "text-destructive" : "text-foreground"
      }`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Loan Row ─────────────────────────────────────────────────────────────────

function LoanRow({ loan, pendingCount, onClick }: {
  loan: ApiLoan; pendingCount: number; onClick: () => void;
}) {
  const remaining = parseFloat(loan.remaining_amount);
  const total = parseFloat(loan.amount);
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
  const st = statusLabel(loan.status);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 cursor-pointer hover:bg-muted/30 transition-colors"
    >
      <Avatar name={loan.borrower?.name ?? "?"} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground truncate">
            {loan.borrower?.name ?? `#${loan.id}`}
          </p>
          {loan.group_id && (
            <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              ✈️ กลุ่ม
            </span>
          )}
          {pendingCount > 0 && (
            <span className="shrink-0 bg-amber-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] text-muted-foreground truncate flex-1">
            {loan.description ?? "ไม่มีหมายเหตุ"}
            {loan.due_date && ` · ครบ ${new Date(loan.due_date).toLocaleDateString("th-TH")}`}
          </p>
          {pct > 0 && loan.status !== "settled" && (
            <Progress value={pct} className="w-12 h-0.5 shrink-0" />
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${loan.status === "settled" ? "text-emerald-600" : "text-destructive"}`}>
          {loan.status === "settled" ? "ครบ" : fmt(remaining)}
        </p>
        <Badge variant="outline" className={`text-[10px] px-1 py-0 h-3.5 leading-none mt-0.5 ${st.cls}`}>
          {st.text}
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loans, setLoans] = useState<ApiLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState<Record<number, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ApiLoan | null>(null);
  const [tab, setTab] = useState<"active" | "settled">("active");
  const [lenderLinkCopied, setLenderLinkCopied] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [dash, loanList] = await Promise.all([
        api.getDashboard(),
        api.getLoans({ role: "lender" }),
      ]);
      setData(dash);
      setLoans(loanList);

      const pending = await api.allPendingConfirmations();
      const map: Record<number, number> = {};
      const arr = (pending as any)?.data ?? [];
      arr.forEach((p: ApiPayment) => { map[p.loan_id] = (map[p.loan_id] ?? 0) + 1; });
      setPendingMap(map);
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (!authLoading) fetchAll(); }, [fetchAll, authLoading]);

  const handleCopyLenderLink = async () => {
    if (!user?.line_id) return;
    const link = `${window.location.origin}/lender/${user.line_id}`;
    await navigator.clipboard.writeText(link);
    setLenderLinkCopied(true);
    setTimeout(() => setLenderLinkCopied(false), 2000);
  };

  if (loading) return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-3">
        {[1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 rounded-xl" />
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
    </div>
  );

  const activeLoans = loans.filter(l => l.status !== "settled");
  const settledLoans = loans.filter(l => l.status === "settled");
  const totalPending = Object.values(pendingMap).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5 p-1">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">รายการหนี้</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeLoans.length} รายการค้าง
            {totalPending > 0 && ` · ${totalPending} รอยืนยัน`}
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} size="sm" className="gap-1.5 shrink-0">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          เพิ่มรายการ
        </Button>
      </div>

      {/* Stats */}
      {data && (
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard label="ยอดสุทธิ" value={fmt(data.net_balance)} color={data.net_balance >= 0 ? "green" : "red"} />
          <StatCard label="ค้างเรา" value={fmt(data.total_lent)} sub={`${data.debtors.length} คน`} color="green" />
          <StatCard label="เราค้าง" value={fmt(data.total_borrowed)} sub={`${data.creditors.length} คน`} color={data.total_borrowed > 0 ? "red" : "default"} />
        </div>
      )}

      {/* Due soon */}
      {data && data.due_soon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
          <p className="text-xs font-semibold text-amber-800">⏰ ใกล้ครบกำหนด ({data.due_soon.length})</p>
          {data.due_soon.slice(0, 3).map(loan => (
            <div key={loan.id} className="flex justify-between text-xs">
              <span className="text-amber-700">{loan.borrower?.name ?? `#${loan.id}`}</span>
              <span className="font-medium text-amber-800">
                {fmt(parseFloat(loan.remaining_amount))}
                {loan.due_date && ` · ${new Date(loan.due_date).toLocaleDateString("th-TH")}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Lender link */}
      {user?.line_id && (
        <button
          onClick={handleCopyLenderLink}
          className="w-full flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-3 py-2.5 hover:bg-muted/80 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-foreground/8 flex items-center justify-center shrink-0">
            {lenderLinkCopied
              ? <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg className="w-3.5 h-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            }
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-foreground">
              {lenderLinkCopied ? "คัดลอกแล้ว!" : "ลิงก์ของฉัน (ส่งให้ลูกหนี้)"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {typeof window !== "undefined" ? window.location.origin : ""}/lender/{user.line_id}
            </p>
          </div>
          <svg className="w-3.5 h-3.5 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
        {(["active", "settled"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-all ${
              tab === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "active"
              ? `ค้างอยู่ ${activeLoans.length > 0 ? `(${activeLoans.length})` : ""}`
              : `ครบแล้ว ${settledLoans.length > 0 ? `(${settledLoans.length})` : ""}`}
          </button>
        ))}
      </div>

      {/* Loan list */}
      {(() => {
        const list = tab === "active" ? activeLoans : settledLoans;
        if (list.length === 0) return (
          <div className="text-center py-14 text-muted-foreground">
            <p className="text-3xl mb-3">{tab === "active" ? "🎉" : "📋"}</p>
            <p className="font-medium text-foreground text-sm">
              {tab === "active" ? "ไม่มีรายการค้างอยู่" : "ยังไม่มีรายการที่ชำระครบ"}
            </p>
            {tab === "active" && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-3 text-xs text-primary underline underline-offset-2"
              >
                เพิ่มรายการแรก
              </button>
            )}
          </div>
        );
        return (
          <div className="bg-background border border-border rounded-2xl overflow-hidden">
            {list.map(loan => (
              <LoanRow
                key={loan.id}
                loan={loan}
                pendingCount={pendingMap[loan.id] ?? 0}
                onClick={() => setSelectedLoan(loan)}
              />
            ))}
          </div>
        );
      })()}

      <AddLoanModal open={showAdd} onClose={() => setShowAdd(false)} onCreated={fetchAll} />
      <LoanDetailModal
        loan={selectedLoan}
        open={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onUpdated={() => {
          fetchAll();
          if (selectedLoan) {
            api.getLoan(selectedLoan.id).then(setSelectedLoan).catch(() => setSelectedLoan(null));
          }
        }}
      />
    </div>
  );
}

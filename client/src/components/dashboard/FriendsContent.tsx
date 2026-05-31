// FriendsContent.tsx — creditor-only UI, clean & minimal
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "@/lib/api";
import { fmt } from "@/lib/debtStore";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Search,
  UserPlus,
  Users,
  SlidersHorizontal,
  X,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  line_id?: string | null;
  we_are_creditor?: number;
  we_are_debtor?: number;
  active_loans_count?: number;
}

type SortKey = "name" | "owed_to_us";
type FilterKey = "all" | "pending" | "returned";

const SORT_LABELS: Record<SortKey, string> = {
  name: "ชื่อ A–Z",
  owed_to_us: "ยอดมากสุด",
};

const FILTER_LABELS: Record<FilterKey, string> = {
  all: "ทั้งหมด",
  pending: "ยังค้างอยู่",
  returned: "คืนแล้ว",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isManualUser = (m: Member) => m.email?.startsWith("manual_") ?? false;

const isFullySettled = (m: Member) =>
  (m.we_are_creditor ?? 0) === 0 && (m.we_are_debtor ?? 0) === 0;

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const palettes = [
    "bg-violet-100 text-violet-600 dark:bg-violet-950/60 dark:text-violet-300",
    "bg-sky-100 text-sky-600 dark:bg-sky-950/60 dark:text-sky-300",
    "bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-300",
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300",
    "bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-300",
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300",
    "bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-300",
  ];
  const color = palettes[name.charCodeAt(0) % palettes.length];
  return (
    <div className={`w-8 h-8 text-xs ${color} rounded-full flex items-center justify-center font-semibold shrink-0 select-none`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ members }: { members: Member[] }) {
  const total = members.reduce((s, m) => s + (m.we_are_creditor ?? 0), 0);
  const count = members.filter((m) => (m.we_are_creditor ?? 0) > 0).length;
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40">
      <div>
        <p className="text-[10px] uppercase tracking-widest font-medium text-emerald-600/70">
          ยอดค้างรวม
        </p>
        <p className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400 mt-0.5 leading-none">
          {fmt(total)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground/60">
          คนที่ค้างอยู่
        </p>
        <p className="text-xl font-semibold tabular-nums text-foreground mt-0.5 leading-none">
          {count}
        </p>
      </div>
    </div>
  );
}

// ─── Friend row ───────────────────────────────────────────────────────────────

function FriendRow({
  member,
  onEdit,
  onDelete,
}: {
  member: Member;
  onEdit: (m: Member) => void;
  onDelete: (m: Member) => void;
}) {
  const owed = member.we_are_creditor ?? 0;
  const manual = isManualUser(member);
  const settled = isFullySettled(member);

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
      <Avatar name={member.name} />

      {/* Name + sub-info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {!manual && member.email
            ? member.email
            : member.phone
            ? member.phone
            : member.line_id
            ? `LINE: ${member.line_id}`
            : ""}
        </p>
      </div>

      {/* Amount + status */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          {settled ? (
            <p className="text-[11px] text-muted-foreground">คืนแล้ว</p>
          ) : owed > 0 ? (
            <>
              <p className="text-sm font-semibold tabular-nums text-emerald-600">
                {fmt(owed)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">ยังค้างอยู่</p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">คืนแล้ว</p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
              aria-label="ตัวเลือก"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal truncate">
              {member.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {manual ? (
              <>
                <DropdownMenuItem onClick={() => onEdit(member)} className="gap-2 text-sm">
                  <Pencil className="w-3.5 h-3.5" />
                  แก้ไข
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(member)} variant="destructive" className="gap-2 text-sm">
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบ
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                แก้ไขไม่ได้ (มีบัญชี)
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function FriendFormModal({
  open,
  member,
  onClose,
  onSaved,
}: {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = member !== null;
  const [name, setName] = useState("");
  const [lineId, setLineId] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setLineId(member.line_id ?? "");
      setPhone(member.phone ?? "");
    } else {
      setName(""); setLineId(""); setPhone("");
    }
  }, [member, open]);

  const handleClose = () => { if (!loading) onClose(); };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) { toast.error("กรุณาใส่ชื่อ"); return; }
    setLoading(true);
    try {
      if (isEdit) {
        await fetch(
          `${(import.meta as any).env.PUBLIC_API_URL ?? ""}/api/members/${member!.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: trimmedName,
              line_id: lineId.trim() || null,
              phone: phone.trim() || null,
            }),
          }
        ).then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message ?? "อัปเดตไม่สำเร็จ");
          }
        });
        toast.success("แก้ไขข้อมูลสำเร็จ");
      } else {
        await api.createMember({ name: trimmedName, line_id: lineId.trim() || undefined });
        toast.success("เพิ่มเพื่อนสำเร็จ");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "แก้ไขข้อมูล" : "เพิ่มเพื่อน"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "แก้ไขชื่อ, LINE ID หรือเบอร์โทร" : "กรอกชื่อเพื่อเพิ่มในระบบ"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">ชื่อ *</Label>
            <Input placeholder="เช่น สมชาย ดีจัง" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">LINE ID</Label>
            <Input placeholder="เช่น somchai123" value={lineId} onChange={(e) => setLineId(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>ยกเลิก</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "กำลังบันทึก…" : isEdit ? "บันทึก" : "เพิ่ม"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  member, open, onClose, onDeleted,
}: {
  member: Member | null; open: boolean; onClose: () => void; onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const hasDebt = !isFullySettled(member ?? {});

  const handleDelete = async () => {
    if (!member) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${(import.meta as any).env.PUBLIC_API_URL ?? ""}/api/members/${member.id}`,
        { method: "DELETE", headers: { Accept: "application/json" }, credentials: "include" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "ลบไม่สำเร็จ");
      }
      toast.success(`ลบ "${member.name}" แล้ว`);
      onDeleted(); onClose();
    } catch (e: any) {
      toast.error(e.message ?? "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            ลบเพื่อน
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                ลบ <span className="font-semibold text-foreground">{member?.name}</span> ออกจากระบบ
                การกระทำนี้ไม่สามารถยกเลิกได้
              </p>
              {hasDebt && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>ยังมียอดค้างอยู่ ระบบอาจปฏิเสธการลบ</p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? "กำลังลบ…" : "ลบ"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query, filter, onReset, onAdd }: {
  query: string; filter: FilterKey; onReset: () => void; onAdd: () => void;
}) {
  if (query || filter !== "all")
    return (
      <div className="text-center py-14">
        <Search className="w-6 h-6 mx-auto mb-2.5 text-muted-foreground/30" />
        <p className="text-sm text-foreground">ไม่พบเพื่อน</p>
        <button onClick={onReset} className="mt-2 text-xs text-primary underline underline-offset-2">
          ล้างตัวกรอง
        </button>
      </div>
    );
  return (
    <div className="text-center py-14">
      <Users className="w-6 h-6 mx-auto mb-2.5 text-muted-foreground/30" />
      <p className="text-sm text-foreground">ยังไม่มีเพื่อน</p>
      <button onClick={onAdd} className="mt-2 text-xs text-primary underline underline-offset-2">
        เพิ่มเพื่อนคนแรก
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FriendsContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchMembers = useCallback(() => {
    setLoading(true);
    api.getMembers()
      .then(setMembers)
      .catch(() => toast.error("โหลดข้อมูลไม่สำเร็จ"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  const openAdd = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit = (m: Member) => { setEditTarget(m); setFormOpen(true); };
  const openDelete = (m: Member) => setDeleteTarget(m);
  const reset = () => { setQuery(""); setFilter("all"); setSort("name"); };

  const displayed = useMemo(() => {
    let list = [...members];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && !m.email.startsWith("manual_") && m.email.toLowerCase().includes(q)) ||
        (m.phone ?? "").toLowerCase().includes(q)
      );
    }

    if (filter === "pending")
      list = list.filter((m) => (m.we_are_creditor ?? 0) > 0);
    else if (filter === "returned")
      list = list.filter(isFullySettled);

    list.sort((a, b) =>
      sort === "owed_to_us"
        ? (b.we_are_creditor ?? 0) - (a.we_are_creditor ?? 0)
        : a.name.localeCompare(b.name, "th")
    );

    return list;
  }, [members, query, filter, sort]);

  const activeFilterCount = (filter !== "all" ? 1 : 0) + (sort !== "name" ? 1 : 0);

  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">เพื่อน</h2>
          <p className="text-xs text-muted-foreground">
            {loading ? "กำลังโหลด…" : `${members.length} คน`}
          </p>
        </div>
        <Button onClick={openAdd} size="sm" variant="outline" className="gap-1.5 h-8 text-xs shrink-0">
          <UserPlus className="w-3.5 h-3.5" />
          เพิ่ม
        </Button>
      </div>

      {/* Summary */}
      {!loading && <SummaryBar members={members} />}

      {/* Search + filter row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50 pointer-events-none" />
          <Input
            placeholder="ค้นหา…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeFilterCount > 0 ? "default" : "outline"}
              size="sm"
              className="h-8 gap-1 px-2.5 shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold">{activeFilterCount}</span>
              )}
              <ChevronDown className="w-2.5 h-2.5 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              แสดง
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((k) => (
                <DropdownMenuRadioItem key={k} value={k} className="text-sm">
                  {FILTER_LABELS[k]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-wider">
              เรียงตาม
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuRadioItem key={k} value={k} className="text-sm">
                  {SORT_LABELS[k]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {activeFilterCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={reset}
                  className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  ล้างทั้งหมด
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Result count */}
      {!loading && (query || filter !== "all") && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {displayed.length} จาก {members.length} คน
          </p>
          {activeFilterCount > 0 && (
            <button onClick={reset} className="text-xs text-primary underline underline-offset-2">
              ล้าง
            </button>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <EmptyState query={query} filter={filter} onReset={reset} onAdd={openAdd} />
      ) : (
        <div className="bg-background border border-border/60 rounded-xl overflow-hidden divide-y divide-border/40">
          {displayed.map((m) => (
            <FriendRow key={m.id} member={m} onEdit={openEdit} onDelete={openDelete} />
          ))}
        </div>
      )}

      <FriendFormModal
        open={formOpen}
        member={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={fetchMembers}
      />
      <DeleteConfirmDialog
        member={deleteTarget}
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onDeleted={fetchMembers}
      />
    </div>
  );
} 
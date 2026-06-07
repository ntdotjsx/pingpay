import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { fmt } from '@/lib/debtStore';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Search,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  email: string | null;
  phone?: string | null;
  line_id?: string | null;
  we_are_creditor?: number;
  we_are_debtor?: number;
  active_loans_count?: number;
  approval_status?: 'pending' | 'approved';
  approval_link?: string | null;
  avatar?: string | null;
}

type FilterKey = 'all' | 'outstanding' | 'settled';
type SortKey = 'name' | 'outstanding';

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '';

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'ทั้งหมด',
  outstanding: 'ค้างชำระ',
  settled: 'ไม่มีค้าง',
};

const SORT_LABELS: Record<SortKey, string> = {
  name: 'ชื่อ A-Z',
  outstanding: 'ยอดค้างสูงสุด',
};

const creditorBalance = (member: Member) => Number(member.we_are_creditor ?? 0);
const isManualMember = (member: Member) =>
  !member.email || member.email.startsWith('manual_');

function initials(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function MemberAvatar({
  name,
  avatar,
}: {
  name: string;
  avatar?: string | null;
}) {
  if (avatar) {
    return (
      <img
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        src={avatar}
        alt={name}
      />
    );
  }
  return (
    <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
      {initials(name)}
    </div>
  );
}

function MemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: Member;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const balance = creditorBalance(member);
  const manual = isManualMember(member);
  const subtitle = member.phone
    ? member.phone
    : member.line_id
      ? `LINE: ${member.line_id}`
      : !manual && member.email
        ? member.email
        : 'ไม่มีช่องทางติดต่อ';

  const copyApprovalLink = () => {
    if (member.approval_link) {
      navigator.clipboard.writeText(member.approval_link);
      toast.success('คัดลอกลิงก์อนุมัติสำเร็จ');
    }
  };

  return (
    <div className="group hover:bg-muted/30 flex items-center gap-3 px-4 py-3 transition-colors">
      <MemberAvatar name={member.name} avatar={member.avatar} />

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-foreground truncate text-sm font-medium">
            {member.name}
          </p>
          {manual && (
            <Badge
              variant="outline"
              className="h-5 shrink-0 px-1.5 text-[10px]"
            >
              manual
            </Badge>
          )}
          {member.approval_status === 'pending' ? (
            <Badge
              variant="outline"
              className="h-5 shrink-0 border-amber-500/20 bg-amber-500/10 px-1.5 text-[10px] text-amber-600"
            >
              รออนุมัติ LINE
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-5 shrink-0 border-emerald-500/20 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600"
            >
              เชื่อม LINE แล้ว
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {subtitle}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="min-w-20 text-right">
          {balance > 0 ? (
            <>
              <p className="text-sm font-semibold text-emerald-600 tabular-nums">
                {fmt(balance)}
              </p>
              <p className="text-muted-foreground text-[10px]">ค้างชำระ</p>
            </>
          ) : (
            <div className="text-muted-foreground flex items-center justify-end gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ไม่มีค้าง
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 opacity-100 transition-colors sm:opacity-0 sm:group-hover:opacity-100"
              aria-label="ตัวเลือก"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-muted-foreground truncate text-xs font-normal">
              {member.name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {member.approval_status === 'pending' && member.approval_link && (
              <DropdownMenuItem
                className="gap-2 font-medium text-amber-600 dark:text-amber-400"
                onClick={copyApprovalLink}
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                คัดลอกลิงก์อนุมัติ
              </DropdownMenuItem>
            )}
            {manual ? (
              <>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => onEdit(member)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  แก้ไข
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  variant="destructive"
                  onClick={() => onDelete(member)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  ลบ
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem
                disabled
                className="text-muted-foreground text-xs"
              >
                บัญชีจริง แก้จาก profile
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function MemberFormDialog({
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
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdLink, setCreatedLink] = useState<string>('');
  const [createdName, setCreatedName] = useState<string>('');

  useEffect(() => {
    setName(member?.name ?? '');
    setLineId(member?.line_id ?? '');
    setPhone(member?.phone ?? '');
    setCreatedLink('');
    setCreatedName('');
  }, [member, open]);

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('กรุณาใส่ชื่อ');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/members${isEdit ? `/${member.id}` : ''}`,
        {
          method: isEdit ? 'PUT' : 'POST',
          credentials: 'include',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: trimmedName,
            line_id: lineId.trim() || null,
            phone: phone.trim() || null,
          }),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'บันทึกไม่สำเร็จ');
      }

      const resData = await res.json();
      toast.success(isEdit ? 'แก้ไขลูกหนี้แล้ว' : 'เพิ่มลูกหนี้แล้ว');
      onSaved();

      if (!isEdit && resData.data?.approval_link) {
        setCreatedLink(resData.data.approval_link);
        setCreatedName(trimmedName);
      } else {
        onClose();
      }
    } catch (error: any) {
      toast.error(error.message ?? 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(createdLink);
    toast.success('คัดลอกลิงก์สำเร็จ');
  };

  if (createdLink) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-1.5 text-center text-emerald-600">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              เพิ่มลูกหนี้สำเร็จ
            </DialogTitle>
            <DialogDescription className="text-center">
              เพิ่มลูกหนี้ {createdName} เข้าไปในระบบแล้ว
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-muted-foreground text-center text-xs leading-relaxed">
              กรุณาส่งลิงก์นี้ให้เพื่อนของคุณเปิดเพื่อกดยืนยัน LINE ก่อน
              เพื่อให้ระบบส่งข้อความทวงเงินหาเพื่อนได้ (หากเพื่อนไม่กดยอมรับ
              จะไม่สามารถทำรายการยืมเงินกับเพื่อนคนนี้ได้)
            </p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={createdLink}
                className="bg-muted border-border h-9 font-mono text-xs select-all"
              />
              <Button size="sm" className="h-9 shrink-0" onClick={copyLink}>
                คัดลอก
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={onClose}>
              เสร็จสิ้น
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'แก้ไขลูกหนี้' : 'เพิ่มลูกหนี้'}</DialogTitle>
          <DialogDescription>
            เก็บเฉพาะข้อมูลที่จำเป็นสำหรับติดตามยอดค้างรับ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">ชื่อ</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && save()}
              placeholder="เช่น สมชาย"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">LINE ID</Label>
            <Input
              value={lineId}
              onChange={(event) => setLineId(event.target.value)}
              placeholder="optional"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">เบอร์โทร</Label>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="optional"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteMemberDialog({
  member,
  onClose,
  onDeleted,
}: {
  member: Member | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const hasOutstanding = member ? creditorBalance(member) > 0 : false;

  const remove = async () => {
    if (!member) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/members/${member.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? 'ลบไม่สำเร็จ');
      }

      toast.success('ลบลูกหนี้แล้ว');
      onDeleted();
      onClose();
    } catch (error: any) {
      toast.error(error.message ?? 'ลบไม่สำเร็จ');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={member !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive h-4 w-4" />
            ลบลูกหนี้
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                ต้องการลบ{' '}
                <span className="text-foreground font-medium">
                  {member?.name}
                </span>{' '}
                ออกจากรายชื่อหรือไม่
              </p>
              {hasOutstanding && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
                  ยังมียอดค้างรับอยู่ ระบบอาจไม่อนุญาตให้ลบจนกว่าจะปิดรายการ
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
          <AlertDialogAction
            onClick={remove}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? 'กำลังลบ...' : 'ลบ'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EmptyState({
  hasFilters,
  onReset,
  onAdd,
}: {
  hasFilters: boolean;
  onReset: () => void;
  onAdd: () => void;
}) {
  return (
    <div className="border-border/70 bg-background rounded-xl border border-dashed py-14 text-center">
      <Users className="text-muted-foreground/40 mx-auto mb-3 h-7 w-7" />
      <p className="text-foreground text-sm font-medium">
        {hasFilters ? 'ไม่พบลูกหนี้ตามตัวกรอง' : 'ยังไม่มีลูกหนี้'}
      </p>
      <button
        onClick={hasFilters ? onReset : onAdd}
        className="text-primary mt-2 text-xs underline underline-offset-2"
      >
        {hasFilters ? 'ล้างตัวกรอง' : 'เพิ่มลูกหนี้คนแรก'}
      </button>
    </div>
  );
}

export function FriendsContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('outstanding');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);

  const [hasPromptPay, setHasPromptPay] = useState<boolean | null>(null);

  const fetchMembers = useCallback(() => {
    setLoading(true);
    api
      .getMembers()
      .then((data) => setMembers(data as Member[]))
      .catch(() => toast.error('โหลดรายชื่อลูกหนี้ไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchMembers();
    api
      .getApiKeys()
      .then((keys) => {
        setHasPromptPay(keys.promptpay.has_id);
      })
      .catch(() => {});
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members
      .filter((member) => {
        if (!normalizedQuery) return true;

        return (
          member.name.toLowerCase().includes(normalizedQuery) ||
          (member.phone ?? '').toLowerCase().includes(normalizedQuery) ||
          (member.line_id ?? '').toLowerCase().includes(normalizedQuery) ||
          (!isManualMember(member) &&
            (member.email ?? '').toLowerCase().includes(normalizedQuery))
        );
      })
      .filter((member) => {
        const balance = creditorBalance(member);
        if (filter === 'outstanding') return balance > 0;
        if (filter === 'settled') return balance === 0;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'outstanding') {
          return creditorBalance(b) - creditorBalance(a);
        }

        return a.name.localeCompare(b.name, 'th');
      });
  }, [filter, members, query, sort]);

  const activeFilterCount =
    (filter !== 'all' ? 1 : 0) + (sort !== 'outstanding' ? 1 : 0);
  const hasFilters = query.trim() !== '' || activeFilterCount > 0;

  const openAdd = () => {
    if (hasPromptPay === false) {
      toast.error(
        'กรุณาตั้งค่าหมายเลข PromptPay ในหน้าการตั้งค่าก่อนเพิ่มลูกหนี้ (เพื่อน)',
      );
      return;
    }
    setEditTarget(null);
    setFormOpen(true);
  };

  const resetFilters = () => {
    setQuery('');
    setFilter('all');
    setSort('outstanding');
  };

  return (
    <div className="space-y-4 p-1">
      {hasPromptPay === false && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
            <p className="font-semibold">
              ⚠️ ยังไม่ได้ตั้งค่าหมายเลข PromptPay สำหรับรับเงิน
            </p>
            <p className="mt-1">
              คุณจะไม่สามารถเพิ่มลูกหนี้ (เพื่อน) หรือทำรายการยืมเงินได้
              กรุณาไปตั้งค่าที่หน้า{' '}
              <a
                href="/dashboard/payment-settings"
                className="font-semibold underline hover:text-amber-900 dark:hover:text-amber-100"
              >
                ตั้งค่าการรับเงิน
              </a>
            </p>
          </div>
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-foreground text-base font-semibold">ลูกหนี้</h2>
          <p className="text-muted-foreground text-xs">
            {loading ? 'กำลังโหลด...' : `${members.length} รายชื่อ`}
          </p>
        </div>
        <Button
          onClick={openAdd}
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          เพิ่ม
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground/50 pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อ, LINE, เบอร์โทร"
            className="h-9 pr-8 pl-9 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
              aria-label="ล้างคำค้น"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant={activeFilterCount ? 'default' : 'outline'}
              size="sm"
              className="h-9 shrink-0 gap-1 px-2.5"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-semibold">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-widest uppercase">
              แสดง
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={filter}
              onValueChange={(value) => setFilter(value as FilterKey)}
            >
              {(Object.keys(FILTER_LABELS) as FilterKey[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {FILTER_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-muted-foreground text-[10px] tracking-widest uppercase">
              เรียงตาม
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => setSort(value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {SORT_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            {hasFilters && (
              <>
                <DropdownMenuSeparator />
                <button
                  onClick={resetFilters}
                  className="text-muted-foreground hover:text-foreground w-full px-2 py-1.5 text-left text-xs"
                >
                  ล้างตัวกรอง
                </button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!loading && hasFilters && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-xs">
            แสดง {filteredMembers.length} จาก {members.length} รายชื่อ
          </p>
          <button
            onClick={resetFilters}
            className="text-primary text-xs underline underline-offset-2"
          >
            ล้าง
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((item) => (
            <Skeleton key={item} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onReset={resetFilters}
          onAdd={openAdd}
        />
      ) : (
        <div className="border-border/60 bg-background overflow-hidden rounded-xl border">
          <div className="divide-border/50 divide-y">
            {filteredMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onEdit={(next) => {
                  setEditTarget(next);
                  setFormOpen(true);
                }}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        </div>
      )}

      <MemberFormDialog
        open={formOpen}
        member={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={fetchMembers}
      />
      <DeleteMemberDialog
        member={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={fetchMembers}
      />
    </div>
  );
}

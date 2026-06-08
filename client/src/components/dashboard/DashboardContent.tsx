// DashboardContent.tsx — redesigned: minimal + professional
import {
  cloneElement,
  type FocusEvent,
  type ReactElement,
  type MouseEvent,
  type ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  api,
  type ApiDashboard,
  type ApiLoan,
  type ApiPayment,
} from '@/lib/api';
import { fmt, loanToDebtor } from '@/lib/debtStore';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '';

function proofHref(proofUrl: string) {
  if (
    proofUrl.startsWith('data:') ||
    proofUrl.startsWith('http://') ||
    proofUrl.startsWith('https://')
  ) {
    return proofUrl;
  }

  return `${API_BASE}${proofUrl}`;
}

function Hint({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const child = children as ReactElement<any>;

  const handleMove = (event: MouseEvent<HTMLElement>) => {
    setPos({ x: event.clientX, y: event.clientY });
    child.props.onMouseMove?.(event);
  };

  return (
    <>
      {cloneElement(child, {
        onMouseEnter: (event: MouseEvent<HTMLElement>) => {
          setOpen(true);
          setPos({ x: event.clientX, y: event.clientY });
          child.props.onMouseEnter?.(event);
        },
        onMouseMove: handleMove,
        onMouseLeave: (event: MouseEvent<HTMLElement>) => {
          setOpen(false);
          child.props.onMouseLeave?.(event);
        },
        onFocus: (event: FocusEvent<HTMLElement>) => {
          setOpen(true);
          child.props.onFocus?.(event);
        },
        onBlur: (event: FocusEvent<HTMLElement>) => {
          setOpen(false);
          child.props.onBlur?.(event);
        },
      })}
      <span
        className={`bg-foreground text-background pointer-events-none fixed top-0 left-0 z-[70] max-w-xs rounded-xl px-3 py-1.5 text-xs shadow-lg ${
          open ? 'block' : 'hidden'
        }`}
        style={{
          transform: `translate3d(${pos.x + 14}px, ${pos.y + 16}px, 0)`,
        }}
      >
        {label}
      </span>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  if (s === 'settled')
    return {
      text: 'ครบ',
      cls: 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
    };
  if (s === 'overdue')
    return {
      text: 'เกิน',
      cls: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/30 dark:text-red-400',
    };
  return {
    text: 'ค้าง',
    cls: 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
  };
}

function relativeDate(iso: string) {
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'วันนี้';
  if (diff === 1) return 'เมื่อวาน';
  if (diff < 30) return `${diff} วันที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Donut chart — SVG ────────────────────────────────────────────────────────

function DonutChart({
  pct,
  size = 56,
  stroke = 7,
  color = '#10b981',
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = ((pct / 100) * circ).toFixed(2);
  const cx = size / 2;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle
        cx={cx}
        cy={cx}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-muted/30"
      />
      {pct > 0 && (
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({
  name,
  avatar,
  size = 'sm',
}: {
  name: string;
  avatar?: string | null;
  size?: '2xs' | 'xs' | 'sm' | 'md';
}) {
  const sz =
    size === 'md'
      ? 'w-9 h-9 text-sm'
      : size === 'xs'
        ? 'w-6 h-6 text-[10px]'
        : size === '2xs'
          ? 'w-4 h-4 text-[8px]'
          : 'w-8 h-8 text-xs';
  if (avatar)
    return (
      <img
        src={avatar}
        alt={name}
        className={`${sz} shrink-0 rounded-full object-cover`}
      />
    );
  const colors = [
    'bg-violet-100 text-violet-700',
    'bg-sky-100 text-sky-700',
    'bg-amber-100 text-amber-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
  ];
  const c = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className={`${sz} ${c} flex shrink-0 items-center justify-center rounded-full font-semibold`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  trend,
  accent = false,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: boolean;
}) {
  return (
    <div
      className={`space-y-2 rounded-2xl border p-4 ${
        accent
          ? 'bg-foreground text-background border-transparent'
          : 'bg-background border-border/60'
      }`}
    >
      <p
        className={`text-[11px] font-medium tracking-widest uppercase ${
          accent ? 'text-background/60' : 'text-muted-foreground'
        }`}
      >
        {label}
      </p>
      <p
        className={`text-2xl leading-none font-semibold tabular-nums ${
          accent ? 'text-background' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {sub && (
        <p
          className={`text-xs ${accent ? 'text-background/60' : 'text-muted-foreground'}`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Loan row (redesigned) ────────────────────────────────────────────────────

function LoanRow({
  loan,
  pendingCount,
  onClick,
}: {
  loan: ApiLoan;
  pendingCount: number;
  onClick: () => void;
}) {
  const remaining = parseFloat(loan.remaining_amount);
  const total = parseFloat(loan.amount);
  const pct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0;
  const st = statusLabel(loan.status);

  const borrowerName = loan.borrower?.name ?? `#${loan.id}`;
  const daysUntilDue = loan.due_date
    ? Math.round(
        (parseDate(loan.due_date).getTime() -
          parseDate(dateKey(new Date())).getTime()) /
          86400000,
      )
    : null;
  const isDueSoon =
    daysUntilDue !== null &&
    daysUntilDue >= 0 &&
    daysUntilDue <= 3 &&
    loan.status !== 'overdue' &&
    loan.status !== 'settled';
  const dueSoonLabel =
    daysUntilDue === 0
      ? 'ครบกำหนดวันนี้'
      : `ใกล้ครบกำหนดใน ${daysUntilDue} วัน`;

  return (
    <Hint label={`ดูรายละเอียดของ ${borrowerName}`}>
      <button
        onClick={onClick}
        className="hover:bg-muted/40 group flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
      >
        <Avatar name={borrowerName} avatar={loan.borrower?.avatar} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-foreground truncate text-sm font-medium">
              {borrowerName}
            </p>
            {isDueSoon && (
              <Hint label={dueSoonLabel}>
                <span
                  className="relative flex h-3 w-3 shrink-0 items-center justify-center"
                  aria-label={dueSoonLabel}
                >
                  <span className="absolute h-3 w-3 animate-ping rounded-full bg-red-500/35" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                </span>
              </Hint>
            )}
            {pendingCount > 0 && (
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
            {loan.group_id && (
              <span className="text-muted-foreground bg-muted shrink-0 rounded-full px-1.5 py-0.5 text-[10px]">
                กลุ่ม
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            {pct > 0 && loan.status !== 'settled' && (
              <div className="max-w-24 flex-1">
                <Progress value={pct} className="h-1" />
              </div>
            )}
            <p className="text-muted-foreground truncate text-[11px]">
              {loan.description ?? 'ไม่มีหมายเหตุ'}
              {loan.loan_date ? ` · ${relativeDate(loan.loan_date)}` : ''}
            </p>
          </div>
        </div>
        <div className="shrink-0 space-y-1 text-right">
          <p
            className={`text-sm font-semibold tabular-nums ${
              loan.status === 'settled' ? 'text-emerald-600' : 'text-foreground'
            }`}
          >
            {loan.status === 'settled' ? 'ครบ' : fmt(remaining)}
          </p>
          <Badge
            variant="outline"
            className={`h-4 px-1.5 py-0 text-[10px] leading-none ${st.cls}`}
          >
            {st.text}
          </Badge>
        </div>
        <svg
          className="text-muted-foreground/40 group-hover:text-muted-foreground h-3.5 w-3.5 shrink-0 transition-colors"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </Hint>
  );
}

// ─── Net Balance ring ─────────────────────────────────────────────────────────
function BalanceRing({ lent, recovered }: { lent: number; recovered: number }) {
  const outstanding = Math.max(0, lent - recovered);
  const recoveredPct = lent > 0 ? Math.round((recovered / lent) * 100) : 0;

  return (
    <div className="mt-2 space-y-3">
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative shrink-0">
          <DonutChart pct={recoveredPct} size={60} stroke={7} color="#10b981" />

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold tabular-nums">
              {recoveredPct}%
            </span>
            <span className="text-muted-foreground text-[8px] leading-none">
              คืนแล้ว
            </span>
          </div>
        </div>

        {/* Detail */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground text-xs">ยังค้าง</span>
            </div>

            <span className="text-xs font-semibold text-amber-600 tabular-nums">
              {fmt(outstanding)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-muted-foreground text-xs">ได้คืนแล้ว</span>
            </div>

            <span className="text-xs font-semibold text-emerald-600 tabular-nums">
              {fmt(recovered)}
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="bg-border/50 h-px" />

      {/* Quick Summary / Status */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <svg
            className="text-muted-foreground/75 h-3.5 w-3.5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
          </svg>
          <span>ยอดปล่อยกู้รวม:</span>
          <span className="text-foreground font-semibold tabular-nums">
            {fmt(lent)}
          </span>
        </span>
        <span
          className={`font-semibold ${
            recoveredPct === 100
              ? 'text-emerald-500'
              : recoveredPct >= 70
                ? 'text-emerald-600'
                : recoveredPct > 0
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
          }`}
        >
          {recoveredPct === 100
            ? '✓ ทวงครบแล้ว!'
            : recoveredPct >= 70
              ? 'เก็บได้ส่วนใหญ่'
              : recoveredPct > 0
                ? 'กำลังทยอยคืน'
                : 'ยังไม่มีการชำระ'}
        </span>
      </div>
    </div>
  );
}

function ActivityLineGraph({ loans }: { loans: ApiLoan[] }) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const allMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    loans.forEach((loan) => {
      if (loan.loan_date) {
        monthsSet.add(loan.loan_date.substring(0, 7));
      }
      loan.payments?.forEach((p) => {
        if (p.confirmation_status === 'confirmed' && p.paid_at) {
          monthsSet.add(p.paid_at.substring(0, 7));
        }
      });
    });
    return Array.from(monthsSet).sort().reverse();
  }, [loans]);

  const activities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'borrow' | 'return';
      date: string;
      amount: number;
      name: string;
      avatar: string | null;
    }> = [];

    loans.forEach((loan) => {
      list.push({
        id: `loan-${loan.id}`,
        type: 'borrow',
        date: loan.loan_date.split('T')[0],
        amount: parseFloat(loan.amount),
        name: loan.borrower?.name ?? 'เพื่อน',
        avatar: loan.borrower?.avatar ?? null,
      });

      loan.payments?.forEach((payment) => {
        if (payment.confirmation_status === 'confirmed') {
          list.push({
            id: `pay-${payment.id}`,
            type: 'return',
            date: payment.paid_at.split('T')[0],
            amount: parseFloat(payment.amount),
            name: loan.borrower?.name ?? 'เพื่อน',
            avatar: loan.borrower?.avatar ?? null,
          });
        }
      });
    });

    const filtered = list.filter((item) => {
      if (selectedMonth === 'all') return true;
      return item.date.startsWith(selectedMonth);
    });

    const sorted = filtered.sort((a, b) => a.date.localeCompare(b.date));
    return sorted.slice(-5);
  }, [loans, selectedMonth]);

  const formatMonthYear = (ym: string) => {
    const [y, m] = ym.split('-');
    const months = [
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    const monthIdx = parseInt(m, 10) - 1;
    const shortYear = parseInt(y, 10) + 543;
    return `${months[monthIdx]} ${String(shortYear).substring(2)}`;
  };

  const chartConfig = {
    amount: {
      label: 'จำนวนเงิน',
      color: '#f43f5e',
    },
  } satisfies ChartConfig;

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-foreground text-sm font-semibold">
            ความเคลื่อนไหวธุรกรรมล่าสุด
          </p>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border-border bg-background focus:ring-primary text-muted-foreground cursor-pointer rounded-lg border px-2 py-1 text-xs font-medium focus:ring-1 focus:outline-none"
        >
          <option value="all">ทั้งหมด</option>
          {allMonths.map((ym) => (
            <option key={ym} value={ym}>
              {formatMonthYear(ym)}
            </option>
          ))}
        </select>
      </div>

      {activities.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center py-8 text-xs">
          <span>ยังไม่มีข้อมูลการยืม/คืนเพื่อแสดงกราฟ</span>
        </div>
      ) : (
        <div className="mt-2 flex-1">
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[85px] w-full"
          >
            <BarChart
              data={activities}
              margin={{ top: 25, right: 10, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="id"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value, index) => {
                  const item = activities[index];
                  if (!item) return '';
                  const parts = item.date.split('-');
                  return parts.length >= 3
                    ? `${parts[2]}/${parts[1]}`
                    : item.date;
                }}
              />
              <YAxis hide />
              <ChartTooltip
                cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item ? `วันที่: ${item.date}` : `วันที่: ${label}`;
                    }}
                    formatter={(value, name, item) => {
                      const isBorrow = item.payload.type === 'borrow';
                      return (
                        <span
                          className={
                            isBorrow
                              ? 'font-bold text-rose-500'
                              : 'font-bold text-emerald-500'
                          }
                        >
                          {isBorrow ? 'ยืมออก' : 'จ่ายคืน'}:{' '}
                          {fmt(value as number)} ({item.payload.name})
                        </span>
                      );
                    }}
                  />
                }
              />
              <Bar
                dataKey="amount"
                radius={[8, 8, 0, 0]}
                barSize={26}
                label={(props: any) => {
                  const { x, y, width, index } = props;
                  const item = activities[index];
                  if (!item) return null;
                  return (
                    <g>
                      <foreignObject
                        x={x + width / 2 - 10}
                        y={y - 25}
                        width="20"
                        height="20"
                      >
                        <div className="bg-muted border-border/50 flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border shadow-sm">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-muted-foreground text-[8px] font-bold">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </foreignObject>
                    </g>
                  );
                }}
              >
                {activities.map((entry, index) => {
                  const isBorrow = entry.type === 'borrow';
                  return (
                    <Cell
                      key={`cell-${index}`}
                      fill={isBorrow ? '#f43f5e' : '#10b981'}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </div>
  );
}

// ─── Loan detail modal (unchanged functionality, cleaner look) ────────────────

function monthLabel(date: Date) {
  return date.toLocaleDateString('th-TH', {
    month: 'long',
    year: 'numeric',
  });
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function DashboardCalendar({
  loans,
  onSelectLoan,
}: {
  loans: ApiLoan[];
  onSelectLoan: (loan: ApiLoan) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();
  const todayKey = dateKey(today);
  const todayStart = parseDate(todayKey).getTime();
  const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - monthStart.getDay());

  const cells = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstCell);
    day.setDate(firstCell.getDate() + index);
    return day;
  });

  const dueLoans = loans
    .filter((loan) => loan.status !== 'settled' && loan.due_date)
    .sort((a, b) => {
      const aTime = a.due_date ? parseDate(a.due_date).getTime() : 0;
      const bTime = b.due_date ? parseDate(b.due_date).getTime() : 0;
      return aTime - bTime;
    });

  const byDate = dueLoans.reduce<Record<string, ApiLoan[]>>((map, loan) => {
    if (!loan.due_date) return map;
    const key = dateKey(parseDate(loan.due_date));
    map[key] = [...(map[key] ?? []), loan];
    return map;
  }, {});

  const goMonth = (offset: number) => {
    setViewDate((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + offset);
      return next;
    });
  };
  const calendarDateLabel = (date: Date) =>
    date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <section className="border-border/60 bg-background rounded-2xl border p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-foreground text-[12px] font-semibold">
            ปฏิทินครบกำหนด
          </p>
          <p className="text-muted-foreground text-[10px]">
            {monthLabel(viewDate)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Hint label="เดือนก่อนหน้า">
            <button
              onClick={() => goMonth(-1)}
              className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground flex h-[26px] w-[26px] items-center justify-center rounded-md border transition-colors"
              aria-label="เดือนก่อนหน้า"
            >
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          </Hint>
          <Hint label="กลับไปเดือนปัจจุบัน">
            <button
              onClick={() => setViewDate(new Date())}
              className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground h-[26px] rounded-md border px-2 text-[10px] transition-colors"
            >
              วันนี้
            </button>
          </Hint>
          <Hint label="เดือนถัดไป">
            <button
              onClick={() => goMonth(1)}
              className="border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground flex h-[26px] w-[26px] items-center justify-center rounded-md border transition-colors"
              aria-label="เดือนถัดไป"
            >
              <svg
                className="h-2.5 w-2.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </Hint>
        </div>
      </div>

      <div className="text-muted-foreground mt-2 grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium">
        {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((day) => (
          <div key={day} className="py-[1px]">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((day) => {
          const key = dateKey(day);
          const items = byDate[key] ?? [];
          const inMonth = day.getMonth() === viewDate.getMonth();
          const isToday = key === todayKey;
          const overdue = items.some((loan) => loan.status === 'overdue');
          const dueSoonLoans = items.filter((loan) => {
            if (!loan.due_date || loan.status === 'overdue') return false;
            const daysUntilDue = Math.round(
              (parseDate(loan.due_date).getTime() - todayStart) / 86400000,
            );
            return daysUntilDue >= 0 && daysUntilDue <= 3;
          });
          const isDueSoon = dueSoonLoans.length > 0;
          const visibleFriends = items.slice(0, 2);
          const tooltipLabel = `${calendarDateLabel(day)}: ${items
            .map(
              (loan) =>
                `${loan.borrower?.name ?? `#${loan.id}`} ${fmt(
                  parseFloat(loan.remaining_amount),
                )}`,
            )
            .join(', ')}`;
          const dueSoonLabel = `ใกล้ครบกำหนด: ${dueSoonLoans
            .map((loan) => loan.borrower?.name ?? `#${loan.id}`)
            .join(', ')}`;

          const dayButton = (
            <button
              key={key}
              onClick={() => items[0] && onSelectLoan(items[0])}
              disabled={items.length === 0}
              className={`relative aspect-square min-h-[30px] rounded-md border text-left transition-colors ${
                items.length
                  ? overdue
                    ? 'border-red-200 bg-red-50 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20'
                    : 'border-amber-200 bg-amber-50 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/20'
                  : 'hover:bg-muted/40 border-transparent'
              } ${inMonth ? 'text-foreground' : 'text-muted-foreground/35'}`}
            >
              <span
                className={`absolute top-1 left-1 text-[9px] font-medium ${
                  isToday
                    ? 'bg-foreground text-background rounded-full px-1 py-[1px]'
                    : ''
                }`}
              >
                {day.getDate()}
              </span>
              {isDueSoon && (
                <Hint label={dueSoonLabel}>
                  <span className="absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center">
                    <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-red-500/35" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]" />
                  </span>
                </Hint>
              )}
              {items.length > 0 && (
                <span className="absolute right-1 bottom-[3px] left-1 flex items-end justify-between gap-1">
                  <span className="flex min-w-0 -space-x-1">
                    {visibleFriends.map((loan) => (
                      <Avatar
                        key={loan.id}
                        name={loan.borrower?.name ?? `#${loan.id}`}
                        avatar={loan.borrower?.avatar}
                        size="2xs"
                      />
                    ))}
                  </span>
                  <span className="bg-background/85 shrink-0 rounded-full px-1 text-[8px] font-semibold tabular-nums shadow-sm">
                    {items.length > 2 ? `+${items.length - 2}` : items.length}
                  </span>
                </span>
              )}
            </button>
          );

          return items.length > 0 ? (
            <Hint key={key} label={tooltipLabel}>
              {dayButton}
            </Hint>
          ) : (
            dayButton
          );
        })}
      </div>
    </section>
  );
}

function LoanDetailModal({
  loan,
  open,
  onClose,
  onUpdated,
}: {
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
    api
      .pendingPayments(loan.id)
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
      setPendingPayments((p) => p.filter((x) => x.id !== paymentId));
      onUpdated();
    } catch (e: any) {
      console.error(e);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReject = async (paymentId: number) => {
    setRejectingId(paymentId);
    try {
      await api.rejectPayment(loan.id, paymentId);
      setPendingPayments((p) => p.filter((x) => x.id !== paymentId));
    } catch (e: any) {
      console.error(e);
    } finally {
      setRejectingId(null);
    }
  };

  const handleCopyLink = async () => {
    setCopying(true);
    try {
      const { guest_link } = await api.getGuestLink(loan.id);
      await navigator.clipboard.writeText(guest_link);
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setCopying(false), 1500);
    }
  };

  const handleDelete = async () => {
    if (!confirm('ลบรายการนี้?')) return;
    setDeleting(true);
    try {
      await api.deleteLoan(loan.id);
      onUpdated();
      onClose();
    } catch (e: any) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Avatar
              name={loan.borrower?.name ?? '?'}
              avatar={loan.borrower?.avatar}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">
                {loan.borrower?.name ?? `#${loan.id}`}
              </p>
              {loan.description && (
                <p className="text-muted-foreground truncate text-xs font-normal">
                  {loan.description}
                </p>
              )}
            </div>
            <Badge variant="outline" className={`shrink-0 text-xs ${st.cls}`}>
              {st.text}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Amount summary */}
        <div className="bg-muted/40 space-y-3 rounded-2xl p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-muted-foreground text-xs">ยังค้าง</span>
            <span className="text-foreground text-2xl font-semibold tabular-nums">
              {loan.status === 'settled' ? 'ครบ ✓' : fmt(remaining)}
            </span>
          </div>
          {pct > 0 && (
            <div className="space-y-1">
              <Progress value={pct} className="h-1.5" />
              <div className="text-muted-foreground flex justify-between text-[11px]">
                <span>จ่ายแล้ว {fmt(paid)}</span>
                <span>
                  {pct}% จาก {fmt(total)}
                </span>
              </div>
            </div>
          )}
          {loan.due_date && (
            <p className="text-muted-foreground text-xs">
              ครบกำหนด{' '}
              {new Date(loan.due_date).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Pending payments */}
        {loadingPending ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : (
          pendingPayments.length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                รออ่านสลิป ({pendingPayments.length})
              </p>
              {pendingPayments.map((p) => (
                <div
                  key={p.id}
                  className="space-y-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-amber-800 tabular-nums dark:text-amber-300">
                        {fmt(parseFloat(p.amount))}
                      </p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        {new Date(p.paid_at).toLocaleDateString('th-TH')}
                        {p.note && ` · ${p.note}`}
                      </p>
                    </div>
                    {p.proof_url && (
                      <a
                        href={proofHref(p.proof_url)}
                        target="_blank"
                        rel="noopener"
                        className="shrink-0 text-xs text-amber-700 underline"
                      >
                        ดูสลิป
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-8 flex-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                      onClick={() => handleConfirm(p.id)}
                      disabled={confirmingId === p.id}
                    >
                      {confirmingId === p.id ? '...' : 'อ่านแล้ว'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 h-8 flex-1 text-xs"
                      onClick={() => handleReject(p.id)}
                      disabled={rejectingId === p.id}
                    >
                      {rejectingId === p.id ? '...' : '✕ ปฏิเสธ'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Payment history */}
        {loan.payments &&
          loan.payments.filter((p) => p.confirmation_status === 'confirmed')
            .length > 0 && (
            <div className="space-y-2">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                ประวัติการชำระ
              </p>
              <div className="border-border overflow-hidden rounded-xl border">
                {loan.payments
                  .filter((p) => p.confirmation_status === 'confirmed')
                  .map((p) => (
                    <div
                      key={p.id}
                      className="border-border flex items-center justify-between gap-2 border-b px-3 py-2 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-muted-foreground truncate text-xs">
                          {new Date(p.paid_at).toLocaleDateString('th-TH')}
                          {p.note && ` · ${p.note}`}
                        </p>
                        {p.proof_url && (
                          <a
                            href={proofHref(p.proof_url)}
                            target="_blank"
                            rel="noopener"
                            className="text-[11px] text-emerald-700 underline"
                          >
                            อ่านสลิปแล้ว
                          </a>
                        )}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-emerald-600 tabular-nums">
                        {fmt(parseFloat(p.amount))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={handleCopyLink}
            disabled={copying}
          >
            {copying ? '✓ คัดลอกแล้ว' : '🔗 คัดลอก link'}
          </Button>
          {loan.status !== 'settled' && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 text-xs"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'ลบ'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Loan Modal ───────────────────────────────────────────────────────────

interface Member {
  id: number;
  name: string;
  email: string | null;
  approval_status?: string;
}
interface TripMember {
  id: string;
  name: string;
  user_id?: number;
}
type AddMode = 'single' | 'group';

function AddLoanModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [mode, setMode] = useState<AddMode>('single');
  const [members, setMembers] = useState<Member[]>([]);
  const [borrowerId, setBorrowerId] = useState<number | ''>('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [search, setSearch] = useState('');
  const [tripName, setTripName] = useState('');
  const [amountPerPerson, setAmountPerPerson] = useState('');
  const [tripDueDate, setTripDueDate] = useState('');
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [manualName, setManualName] = useState('');
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [proofUrl, setProofUrl] = useState('');
  const [proofName, setProofName] = useState('');

  // Friend addition states
  const [friendName, setFriendName] = useState('');
  const [friendSaving, setFriendSaving] = useState(false);
  const [friendCreatedLink, setFriendCreatedLink] = useState('');
  const [friendCreatedName, setFriendCreatedName] = useState('');

  // Validation states
  const [borrowerError, setBorrowerError] = useState(false);
  const [amountError, setAmountError] = useState(false);
  const [proofError, setProofError] = useState(false);
  const [tripNameError, setTripNameError] = useState(false);
  const [amountPerPersonError, setAmountPerPersonError] = useState(false);
  const [friendNameError, setFriendNameError] = useState(false);
  const [membersError, setMembersError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMembersLoading(true);
    api
      .getMembers()
      .then(setMembers)
      .finally(() => setMembersLoading(false));
  }, [open]);

  const reset = () => {
    setMode('single');
    setBorrowerId('');
    setAmount('');
    setDesc('');
    setDueDate('');
    setSearch('');
    setTripName('');
    setAmountPerPerson('');
    setTripDueDate('');
    setTripMembers([]);
    setMemberSearch('');
    setManualName('');
    setProofUrl('');
    setProofName('');
    // Reset friend states
    setFriendName('');
    setFriendSaving(false);
    setFriendCreatedLink('');
    setFriendCreatedName('');

    // Reset validation errors
    setBorrowerError(false);
    setAmountError(false);
    setProofError(false);
    setTripNameError(false);
    setAmountPerPersonError(false);
    setFriendNameError(false);
    setMembersError(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProofName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSingle = async () => {
    let hasErr = false;
    if (!borrowerId) {
      setBorrowerError(true);
      hasErr = true;
    }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setAmountError(true);
      hasErr = true;
    }
    if (!proofUrl) {
      setProofError(true);
      hasErr = true;
    }

    if (hasErr) {
      return;
    }

    setLoading(true);
    try {
      await api.createLoan({
        borrower_id: borrowerId as number,
        amount: amt,
        description: desc || undefined,
        due_date: dueDate || undefined,
        proof_url: proofUrl,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredApiMembers = members.filter(
    (m) =>
      !tripMembers.some((sel) => sel.user_id === m.id) &&
      m.name.toLowerCase().includes(memberSearch.toLowerCase()),
  );

  const addTripMember = (m: Member) => {
    setTripMembers((p) => [
      ...p,
      { id: `u${m.id}`, name: m.name, user_id: m.id },
    ]);
    setMemberSearch('');
    setMembersError(false);
  };

  const addManual = () => {
    const n = manualName.trim();
    if (!n) return;
    setTripMembers((p) => [...p, { id: `m${Date.now()}`, name: n }]);
    setManualName('');
    setMembersError(false);
  };

  const handleSubmitGroup = async () => {
    let hasErr = false;
    if (!tripName.trim()) {
      setTripNameError(true);
      hasErr = true;
    }
    const amt = parseFloat(amountPerPerson);
    if (!amt || amt <= 0) {
      setAmountPerPersonError(true);
      hasErr = true;
    }
    if (tripMembers.length === 0) {
      setMembersError(true);
      hasErr = true;
    }
    if (!proofUrl) {
      setProofError(true);
      hasErr = true;
    }

    if (hasErr) {
      return;
    }

    setLoading(true);
    try {
      await api.createGroup({
        name: tripName.trim(),
        amount_per_person: amt,
        due_date: tripDueDate || undefined,
        members: tripMembers.map((m) => ({ name: m.name, user_id: m.user_id })),
        proof_url: proofUrl,
      });
      reset();
      onCreated();
      onClose();
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFriend = async () => {
    const trimmedName = friendName.trim();
    if (!trimmedName) {
      setFriendNameError(true);
      return;
    }
    setFriendSaving(true);
    try {
      const data = await api.createMember({
        name: trimmedName,
      });
      if (data && (data as any).approval_link) {
        setFriendCreatedLink((data as any).approval_link);
        setFriendCreatedName(trimmedName);
      } else {
        setMembersLoading(true);
        const updatedMembers = await api.getMembers();
        setMembers(updatedMembers);
        setMembersLoading(false);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setFriendSaving(false);
    }
  };

  const handleContinueToLoan = async () => {
    setMembersLoading(true);
    try {
      const updatedMembers = await api.getMembers();
      setMembers(updatedMembers);
    } catch (e) {
      console.error(e);
    } finally {
      setMembersLoading(false);
      setFriendName('');
      setFriendCreatedLink('');
      setFriendCreatedName('');
    }
  };

  const tripAmt = parseFloat(amountPerPerson) || 0;
  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.email ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  if (open && membersLoading) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>กำลังโหลดข้อมูล...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-6 text-center">
            <div className="border-primary mx-auto h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
            <p className="text-muted-foreground text-xs">
              กำลังดึงข้อมูลรายชื่อเพื่อน...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (open && members.length === 0) {
    if (friendCreatedLink) {
      return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
          <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <svg
                  className="h-5 w-5 text-emerald-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                เพิ่มเพื่อนสำเร็จ
              </DialogTitle>
              <DialogDescription>
                เพิ่มเพื่อน {friendCreatedName} เข้าไปในระบบแล้ว
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <p className="text-muted-foreground text-xs leading-relaxed">
                กรุณาส่งลิงก์นี้ให้เพื่อนของคุณเปิดเพื่อกดยืนยัน LINE ก่อน
                เพื่อให้ระบบส่งข้อความทวงเงินหาเพื่อนได้ (หากเพื่อนไม่กดยอมรับ
                จะไม่สามารถทำรายการยืมเงินกับเพื่อนคนนี้ได้)
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={friendCreatedLink}
                  className="bg-muted border-border h-9 font-mono text-xs select-all"
                />
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(friendCreatedLink);
                  }}
                >
                  คัดลอก
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Button className="w-full" onClick={handleContinueToLoan}>
                ทำรายการยืมเงินต่อ
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <svg
                className="text-primary h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
              เพิ่มเพื่อนใหม่ก่อนเริ่มทำรายการ
            </DialogTitle>
            <DialogDescription>
              คุณยังไม่มีรายชื่อเพื่อนในระบบ กรุณาเพิ่มเพื่อนอย่างน้อย 1
              คนเพื่อดำเนินการต่อ
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-muted-foreground text-xs font-semibold">
                ชื่อเพื่อน *
              </label>
              <Input
                value={friendName}
                onChange={(e) => {
                  setFriendName(e.target.value);
                  setFriendNameError(false);
                }}
                placeholder="เช่น สมชาย, บอย"
                autoFocus
                aria-invalid={friendNameError}
                className=""
              />
              {friendNameError && (
                <p className="text-destructive mt-1 text-[11px] font-medium">
                  ⚠️ กรุณากรอกชื่อเพื่อน
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={friendSaving}
            >
              ยกเลิก
            </Button>
            <Button
              className="flex-1"
              onClick={handleSaveFriend}
              disabled={friendSaving || !friendName.trim()}
            >
              {friendSaving ? 'กำลังบันทึก...' : 'บันทึกเพื่อน'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-h-[92vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>เพิ่มรายการยืมเงิน</DialogTitle>
          <DialogDescription>
            เลือกแบบรายคน หรือสร้างกลุ่มทริป
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 mb-1 flex gap-1 rounded-xl p-1">
          {(['single', 'group'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m === 'single' ? (
                <>
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  รายคน
                </>
              ) : (
                <>
                  <span className="text-base leading-none">✈️</span>กลุ่มทริป
                </>
              )}
            </button>
          ))}
        </div>

        {mode === 'single' && (
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                ลูกหนี้ *
              </p>
              <Input
                placeholder="ค้นหาชื่อ..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setBorrowerId('');
                  setBorrowerError(false);
                }}
                aria-invalid={borrowerError}
                className="mb-1.5"
              />
              {borrowerError && (
                <p className="text-destructive mt-1 text-[11px] font-medium">
                  ⚠️ กรุณาเลือกลูกหนี้
                </p>
              )}
              {membersLoading ? (
                <Skeleton className="h-10 rounded-lg" />
              ) : (
                <div className="border-border bg-muted/30 divide-border max-h-36 divide-y overflow-y-auto rounded-xl border">
                  {filtered.length === 0 ? (
                    <p className="text-muted-foreground py-3 text-center text-xs">
                      ไม่พบสมาชิก
                    </p>
                  ) : (
                    filtered.map((m) => {
                      const isPending = m.approval_status === 'pending';
                      return (
                        <button
                          key={m.id}
                          disabled={isPending}
                          onClick={() => {
                            setBorrowerId(m.id);
                            setSearch(m.name);
                          }}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                            isPending
                              ? 'bg-muted/20 cursor-not-allowed opacity-50'
                              : borrowerId === m.id
                                ? 'bg-foreground/8 font-medium'
                                : 'hover:bg-muted/60'
                          }`}
                        >
                          <div>
                            <span className="font-medium">{m.name}</span>
                            {m.email && (
                              <span className="text-muted-foreground ml-2 text-xs">
                                {m.email}
                              </span>
                            )}
                          </div>
                          {isPending && (
                            <span className="shrink-0 rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                              ยังไม่เชื่อม LINE
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                จำนวนเงิน (บาท) *
              </p>
              <div
                className={cn(
                  'border-border bg-background flex items-center gap-2 rounded-xl border px-3 py-2 transition-[color,box-shadow]',
                  amountError && 'border-destructive ring-destructive ring-1',
                )}
              >
                <span className="text-muted-foreground text-sm font-medium">
                  ฿
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountError(false);
                  }}
                  className="h-auto border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
                />
              </div>
              {amountError && (
                <p className="text-destructive mt-1 text-[11px] font-medium">
                  ⚠️ กรุณาใส่จำนวนเงินที่ถูกต้อง (มากกว่า 0 บาท)
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                หมายเหตุ
              </p>
              <Input
                placeholder="เช่น ค่าอาหาร, ค่าเที่ยว..."
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                วันครบกำหนด (ไม่บังคับ)
              </p>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                หลักฐานการยืมเงิน (รูปสลิปหรือสัญญา) *
              </p>
              <div
                className={cn(
                  'flex flex-col gap-1.5 transition-[color,box-shadow]',
                  proofError &&
                    'border-destructive ring-destructive rounded-xl border p-2 ring-1',
                )}
              >
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    handleFileChange(e);
                    setProofError(false);
                  }}
                  className="file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer text-xs file:mr-2 file:rounded file:border-0 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
                {proofName && (
                  <p className="truncate text-[10px] font-medium text-emerald-600">
                    📎 {proofName} (แนบแล้ว)
                  </p>
                )}
                {proofError && (
                  <p className="text-destructive mt-1 text-[11px] font-medium">
                    ⚠️ กรุณาแนบหลักฐาน (รูปสลิปหรือสัญญา)
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2 pt-2">
              {(!borrowerId ||
                !amount ||
                parseFloat(amount) <= 0 ||
                !proofUrl) && (
                <p className="text-center text-xs font-medium text-rose-500">
                  *{' '}
                  {!borrowerId
                    ? 'กรุณาเลือกผู้ยืม'
                    : !amount || parseFloat(amount) <= 0
                      ? 'กรุณากรอกยอดเงินให้ถูกต้อง'
                      : !proofUrl
                        ? 'กรุณาแนบหลักฐานการโอนเงิน'
                        : ''}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitSingle}
                  disabled={
                    loading ||
                    !borrowerId ||
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    !proofUrl
                  }
                >
                  {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {mode === 'group' && (
          <div className="space-y-3">
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                ชื่อทริป / งาน *
              </p>
              <Input
                placeholder="เช่น ทริปเชียงใหม่ มีค. 68"
                value={tripName}
                onChange={(e) => {
                  setTripName(e.target.value);
                  setTripNameError(false);
                }}
                aria-invalid={tripNameError}
                className=""
              />
              {tripNameError && (
                <p className="text-destructive mt-1 text-[11px] font-medium">
                  ⚠️ กรุณากรอกชื่อทริป / งาน
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                ยอดคนละ (บาท) *
              </p>
              <div
                className={cn(
                  'border-border bg-background flex items-center gap-2 rounded-xl border px-3 py-2 transition-[color,box-shadow]',
                  amountPerPersonError &&
                    'border-destructive ring-destructive ring-1',
                )}
              >
                <span className="text-muted-foreground text-sm font-medium">
                  ฿
                </span>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountPerPerson}
                  onChange={(e) => {
                    setAmountPerPerson(e.target.value);
                    setAmountPerPersonError(false);
                  }}
                  className="h-auto border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
                />
              </div>
              {amountPerPersonError && (
                <p className="text-destructive mt-1 text-[11px] font-medium">
                  ⚠️ กรุณากรอกยอดเงินต่อคน
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                วันครบกำหนด (ไม่บังคับ)
              </p>
              <Input
                type="date"
                value={tripDueDate}
                onChange={(e) => setTripDueDate(e.target.value)}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                หลักฐานการจ่ายเงิน (รูปใบเสร็จหรือสลิปกลุ่ม) *
              </p>
              <div
                className={cn(
                  'flex flex-col gap-1.5 transition-[color,box-shadow]',
                  proofError &&
                    'border-destructive ring-destructive rounded-xl border p-2 ring-1',
                )}
              >
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => {
                    handleFileChange(e);
                    setProofError(false);
                  }}
                  className="file:bg-primary file:text-primary-foreground hover:file:bg-primary/95 cursor-pointer text-xs file:mr-2 file:rounded file:border-0 file:px-2 file:py-1 file:text-xs file:font-semibold"
                />
                {proofName && (
                  <p className="truncate text-[10px] font-medium text-emerald-600">
                    📎 {proofName} (แนบแล้ว)
                  </p>
                )}
                {proofError && (
                  <p className="text-destructive mt-1 text-[11px] font-medium">
                    ⚠️ กรุณาแนบภาพถ่ายหลักฐานการโอนเงิน/ใบเสร็จ
                  </p>
                )}
              </div>
            </div>
            <div>
              <p className="text-muted-foreground mb-1.5 text-xs font-semibold">
                เพิ่มสมาชิก
              </p>
              <Input
                placeholder="ค้นหาชื่อในระบบ..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
              />
              {memberSearch && (
                <div className="border-border bg-background mt-1 overflow-hidden rounded-xl border shadow-sm">
                  {!membersLoading && filteredApiMembers.length === 0 && (
                    <p className="text-muted-foreground px-3 py-2 text-xs">
                      ไม่พบชื่อนี้ในระบบ
                    </p>
                  )}
                  {filteredApiMembers.slice(0, 5).map((m) => (
                    <button
                      key={m.id}
                      onClick={() => addTripMember(m)}
                      className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
                    >
                      <div className="bg-muted flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                        {m.name[0]}
                      </div>
                      {m.name}
                      {m.email && (
                        <span className="text-muted-foreground text-xs">
                          {m.email}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="หรือพิมพ์ชื่อเพื่อน (ไม่มีบัญชี)..."
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addManual()}
              />
              <Button
                variant="outline"
                onClick={addManual}
                disabled={!manualName.trim()}
                className="shrink-0"
              >
                + เพิ่ม
              </Button>
            </div>
            {membersError && (
              <p className="text-destructive mt-1 text-[11px] font-medium">
                ⚠️ กรุณาเพิ่มสมาชิกอย่างน้อย 1 คน
              </p>
            )}
            {tripMembers.length > 0 && (
              <div className="bg-muted/30 overflow-hidden rounded-xl">
                <div className="border-border/50 flex items-center justify-between border-b px-3 py-1.5">
                  <p className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">
                    รายชื่อ ({tripMembers.length} คน)
                  </p>
                  {tripAmt > 0 && (
                    <p className="text-muted-foreground text-[11px]">
                      รวม{' '}
                      <span className="text-foreground font-semibold">
                        {fmt(tripAmt * tripMembers.length)}
                      </span>
                    </p>
                  )}
                </div>
                {tripMembers.map((m) => (
                  <div
                    key={m.id}
                    className="border-border/40 flex items-center gap-2.5 border-b px-3 py-2 last:border-0"
                  >
                    <div className="bg-foreground/10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
                      {m.name[0]}
                    </div>
                    <span className="flex-1 text-sm">{m.name}</span>
                    {m.user_id ? (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                        มีบัญชี
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">
                        บันทึกชื่อ
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setTripMembers((p) => p.filter((x) => x.id !== m.id))
                      }
                      className="text-muted-foreground hover:text-destructive ml-1 transition-colors"
                    >
                      <svg
                        className="h-3 w-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 pt-2">
              {(!tripName.trim() ||
                !amountPerPerson ||
                parseFloat(amountPerPerson) <= 0 ||
                tripMembers.length === 0 ||
                !proofUrl) && (
                <p className="text-center text-xs font-medium text-rose-500">
                  *{' '}
                  {!tripName.trim()
                    ? 'กรุณากรอกชื่อทริป'
                    : !amountPerPerson || parseFloat(amountPerPerson) <= 0
                      ? 'กรุณากรอกยอดเงินต่อคน'
                      : tripMembers.length === 0
                        ? 'กรุณาเพิ่มสมาชิก'
                        : !proofUrl
                          ? 'กรุณาแนบหลักฐานการโอนเงิน'
                          : ''}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleClose}
                >
                  ยกเลิก
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmitGroup}
                  disabled={
                    loading ||
                    !tripName.trim() ||
                    !amountPerPerson ||
                    parseFloat(amountPerPerson) <= 0 ||
                    tripMembers.length === 0 ||
                    !proofUrl
                  }
                >
                  {loading ? 'กำลังสร้าง...' : '✓ สร้างทริป'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function DashboardContent() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<ApiDashboard | null>(null);
  const [loans, setLoans] = useState<ApiLoan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState<Record<number, number>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<ApiLoan | null>(null);
  const [tab, setTab] = useState<'active' | 'settled'>('active');
  const [lenderLinkCopied, setLenderLinkCopied] = useState(false);
  const [hasPromptPay, setHasPromptPay] = useState<boolean | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      api
        .getApiKeys()
        .then((keys) => {
          setHasPromptPay(keys.promptpay.has_id);
        })
        .catch(() => {});

      const [dash, loanList] = await Promise.all([
        api.getDashboard(),
        api.getLoans({ role: 'lender' }),
      ]);
      setData(dash);
      setLoans(loanList);
      const pending = await api.allPendingConfirmations();
      const map: Record<number, number> = {};
      ((pending as any)?.data ?? []).forEach((p: ApiPayment) => {
        map[p.loan_id] = (map[p.loan_id] ?? 0) + 1;
      });
      setPendingMap(map);
    } catch {
      console.error('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) fetchAll();
  }, [fetchAll, authLoading]);

  const handleCopyLenderLink = async () => {
    if (!user?.line_id) return;
    const link = `${window.location.origin}/lender/${user.line_id}`;
    await navigator.clipboard.writeText(link);
    setLenderLinkCopied(true);
    setTimeout(() => setLenderLinkCopied(false), 2000);
  };

  const handleOpenAdd = () => {
    if (hasPromptPay === false) {
      return;
    }
    setShowAdd(true);
  };

  if (loading)
    return (
      <div className="space-y-4 p-1">
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-10 rounded-xl" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    );

  const activeLoans = loans.filter((l) => l.status !== 'settled');
  const settledLoans = loans.filter((l) => l.status === 'settled');

  const totalLent = data?.total_lent ?? 0;

  const totalRecovered = loans.reduce((sum, loan) => {
    const total = parseFloat(loan.amount);
    const remaining = parseFloat(loan.remaining_amount);

    return sum + (total - remaining);
  }, 0);

  return (
    <div className="space-y-4 p-1">
      {hasPromptPay === false && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
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
      {/* ── Balance donut + lender link ── */}
      <div className="grid gap-3 lg:grid-cols-3">
        {/* Donut */}
        <div className="border-border/60 bg-background rounded-2xl border p-5">
          <p className="mb-4 text-sm font-semibold">สัดส่วนหนี้</p>

          <BalanceRing lent={totalLent} recovered={totalRecovered} />
        </div>

        {/* Recent Transaction Activity Timeline / Line Graph */}
        <div className="border-border/60 bg-background rounded-2xl border p-5 lg:col-span-2">
          <ActivityLineGraph loans={loans} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-1">
        {/* Lender link */}
        {user?.line_id ? (
          <Hint label="คัดลอกลิงก์สำหรับส่งให้ลูกหนี้">
            <button
              onClick={handleCopyLenderLink}
              className="border-border/60 bg-background hover:bg-muted/30 group rounded-2xl border px-2 py-2 text-left transition-colors"
            >
              {/* <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-3">
                ลิงก์ของฉัน
              </p> */}
              <div className="flex items-start gap-2">
                <div className="bg-foreground/6 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
                  {lenderLinkCopied ? (
                    <svg
                      className="h-4 w-4 text-emerald-500"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      className="text-muted-foreground h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-foreground text-xs leading-tight font-semibold">
                    {lenderLinkCopied ? 'คัดลอกแล้ว!' : 'ส่งให้ลูกหนี้กด'}
                  </p>
                  <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                    /lender/{user.line_id}
                  </p>
                </div>
              </div>
            </button>
          </Hint>
        ) : (
          <div className="border-border/60 bg-background/50 flex items-center justify-center rounded-2xl border border-dashed p-4">
            <p className="text-muted-foreground text-center text-xs">
              ตั้งค่า LINE ID
              <br />
              เพื่อรับลิงก์
            </p>
          </div>
        )}
      </div>

      {/* ── Loan list header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="bg-muted/40 flex w-full gap-1 rounded-xl p-1 sm:w-auto">
          {(['active', 'settled'] as const).map((t) => (
            <Hint
              key={t}
              label={
                t === 'active' ? 'ดูรายการค้างชำระ' : 'ดูรายการที่ชำระครบแล้ว'
              }
            >
              <button
                onClick={() => setTab(t)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums transition-all sm:flex-none ${
                  tab === t
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t === 'active'
                  ? `ค้างอยู่${activeLoans.length ? ` (${activeLoans.length})` : ''}`
                  : `ครบแล้ว${settledLoans.length ? ` (${settledLoans.length})` : ''}`}
              </button>
            </Hint>
          ))}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          {hasPromptPay === false && (
            <span className="text-[11px] font-medium whitespace-nowrap text-rose-500">
              ⚠️ ตั้งค่า PromptPay ก่อน
            </span>
          )}
          <Hint label="เปิดปฏิทินครบกำหนด">
            <Button
              onClick={() => setShowCalendar(true)}
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs"
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              ปฏิทิน
            </Button>
          </Hint>
          <Hint label="เพิ่มรายการหนี้ใหม่">
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="h-8 shrink-0 gap-1.5 px-3 text-xs"
              disabled={hasPromptPay === false}
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              เพิ่มรายการ
            </Button>
          </Hint>
        </div>
      </div>

      {/* ── Loan list ── */}
      {(() => {
        const list = tab === 'active' ? activeLoans : settledLoans;
        if (!list.length)
          return (
            <div className="py-14 text-center">
              <p className="mb-3 text-3xl">{tab === 'active' ? '🎉' : '📋'}</p>
              <p className="text-foreground text-sm font-medium">
                {tab === 'active'
                  ? 'ไม่มีรายการค้างอยู่'
                  : 'ยังไม่มีรายการที่ชำระครบ'}
              </p>
              {tab === 'active' && (
                <div className="mt-3 flex flex-col items-center gap-1">
                  <Hint label="สร้างรายการหนี้รายการแรก">
                    <Button
                      variant="link"
                      onClick={handleOpenAdd}
                      disabled={hasPromptPay === false}
                      className="text-primary text-xs underline underline-offset-2"
                    >
                      + เพิ่มรายการแรก
                    </Button>
                  </Hint>
                  {hasPromptPay === false && (
                    <span className="text-[11px] font-medium text-rose-500">
                      ⚠️ กรุณาตั้งค่า PromptPay ในหน้าตั้งค่าก่อนสร้างรายการหนี้
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        return (
          <div className="border-border/60 bg-background divide-border/50 divide-y overflow-hidden rounded-2xl border">
            {list.map((loan) => (
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

      <AddLoanModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={fetchAll}
      />
      <Sheet open={showCalendar} onOpenChange={setShowCalendar}>
        <SheetContent side="right" className="w-[92vw] p-0 sm:max-w-md">
          <SheetHeader className="border-border/60 border-b pr-14">
            <SheetTitle>ปฏิทินครบกำหนด</SheetTitle>
            <SheetDescription>
              ดูวันครบกำหนดของรายการค้างชำระทั้งหมด
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <DashboardCalendar
              loans={activeLoans}
              onSelectLoan={(loan) => {
                setSelectedLoan(loan);
                setShowCalendar(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
      <LoanDetailModal
        loan={selectedLoan}
        open={!!selectedLoan}
        onClose={() => setSelectedLoan(null)}
        onUpdated={() => {
          fetchAll();
          if (selectedLoan) {
            api
              .getLoan(selectedLoan.id)
              .then(setSelectedLoan)
              .catch(() => setSelectedLoan(null));
          }
        }}
      />
    </div>
  );
}

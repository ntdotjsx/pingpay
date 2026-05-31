export interface Debtor {
  id: number;
  name: string;
  note: string;
  total: number;
  paid: number;
  colorIndex: number;
  groupId: number | null;
}

export interface Group {
  id: number;
  name: string;
  emoji: string;
  date: string;
}

export const AVATAR_COLORS = [
  {
    bg: "bg-violet-100 dark:bg-violet-950",
    text: "text-violet-700 dark:text-violet-300",
  },
  {
    bg: "bg-amber-100 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
  },
  {
    bg: "bg-emerald-100 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    bg: "bg-rose-100 dark:bg-rose-950",
    text: "text-rose-700 dark:text-rose-300",
  },
  { bg: "bg-sky-100 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300" },
  {
    bg: "bg-lime-100 dark:bg-lime-950",
    text: "text-lime-700 dark:text-lime-300",
  },
] as const;

export const groups: Group[] = [
  { id: 1, name: "ทริปพัทยา", emoji: "🏖️", date: "มี.ค. 68" },
  { id: 2, name: "ทริปเชียงใหม่", emoji: "🏔️", date: "เม.ย. 68" },
  { id: 3, name: "คอนเสิร์ต BNK48", emoji: "🎤", date: "พ.ค. 68" },
];

export const initialDebtors: Debtor[] = [
  {
    id: 1,
    name: "โบ๊ท",
    note: "ค่าอาหารทะเลพัทยา + ค่าเรือ",
    total: 1800,
    paid: 500,
    colorIndex: 0,
    groupId: 1,
  },
  {
    id: 2,
    name: "มิ้ม",
    note: "ค่าโรงแรมเชียงใหม่",
    total: 2400,
    paid: 0,
    colorIndex: 1,
    groupId: 2,
  },
  {
    id: 3,
    name: "เนม",
    note: "ค่า Grab + ค่าปาร์ตี้",
    total: 750,
    paid: 750,
    colorIndex: 2,
    groupId: null,
  },
  {
    id: 4,
    name: "ฟลุ๊ค",
    note: "ค่าบัตรคอนเสิร์ต BNK48",
    total: 3200,
    paid: 1600,
    colorIndex: 3,
    groupId: 3,
  },
  {
    id: 5,
    name: "นิว",
    note: "ค่าอาหารทะเลพัทยา",
    total: 900,
    paid: 0,
    colorIndex: 4,
    groupId: 1,
  },
  {
    id: 6,
    name: "จ๊อบ",
    note: "ค่าโรงแรมเชียงใหม่",
    total: 2400,
    paid: 600,
    colorIndex: 5,
    groupId: 2,
  },
  {
    id: 7,
    name: "พลอย",
    note: "ค่าบัตรคอนเสิร์ต + เดินทาง",
    total: 2800,
    paid: 2800,
    colorIndex: 0,
    groupId: 3,
  },
  {
    id: 8,
    name: "แบงค์",
    note: "ค่ากินข้าว MBK 3 รอบ",
    total: 1350,
    paid: 0,
    colorIndex: 1,
    groupId: null,
  },
];

export const fmt = (n: number) => "฿" + n.toLocaleString("th-TH");
export const remaining = (d: Debtor) => d.total - d.paid;
export const isPaid = (d: Debtor) => remaining(d) <= 0;
export const progressPct = (d: Debtor) => Math.round((d.paid / d.total) * 100);

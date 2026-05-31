// lib/debtStore.ts — types + helpers ที่ DebtApp ใช้
// mock data ถูกลบออกแล้ว — ข้อมูลจริงมาจาก API (api.ts)

import type { ApiLoan, ApiGroup } from "@/lib/api";

export interface Debtor {
  id: number;
  name: string;
  note: string;
  total: number;
  paid: number;
  colorIndex: number;
  groupId: number | null;
  loanId: number;        // ← loan.id จริงจาก backend (ใช้ confirm/reject payment)
}

export interface Group {
  id: number;
  name: string;
  emoji: string;
  date: string;
}

export const AVATAR_COLORS = [
  { bg: "bg-violet-100 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-amber-100 dark:bg-amber-950",   text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-emerald-100 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-rose-100 dark:bg-rose-950",     text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-sky-100 dark:bg-sky-950",       text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-lime-100 dark:bg-lime-950",     text: "text-lime-700 dark:text-lime-300" },
] as const;

// ============================================================
//  Map API → Debtor (format ที่ UI ใช้)
// ============================================================

export function loanToDebtor(loan: ApiLoan, myUserId: number, index: number): Debtor {
  const total = parseFloat(loan.amount);
  const remaining = parseFloat(loan.remaining_amount);
  const paid = total - remaining;

  // borrower คือคนที่ต้องจ่าย → แสดงชื่อ borrower
  const borrower = loan.borrower;
  const name = borrower?.name ?? `#${loan.id}`;
  const note = loan.description ?? "";

  return {
    id: loan.borrower_id,       // borrower_id ใช้แยก avatar color
    loanId: loan.id,
    name,
    note,
    total,
    paid,
    colorIndex: index % AVATAR_COLORS.length,
    groupId: loan.group_id,
  };
}

// ============================================================
//  Helpers (UI ใช้)
// ============================================================

export const fmt = (n: number) => "฿" + n.toLocaleString("th-TH");
export const remaining = (d: Debtor) => d.total - d.paid;
export const isPaid = (d: Debtor) => remaining(d) <= 0;
export const progressPct = (d: Debtor) => Math.round((d.paid / d.total) * 100);

// ชื่อ export เหล่านี้ยังคงไว้เพราะ component อื่นอาจ import
export type { ApiLoan, ApiGroup, ApiGroupGuestLink };

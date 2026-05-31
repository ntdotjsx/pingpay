// lib/api.ts — API client เชื่อมต่อ backend จริง

const API_BASE = import.meta.env.PUBLIC_API_URL ?? "";

// ============================================================
//  Types — ตรงกับ backend response
// ============================================================

export interface ApiLoan {
  id: number;
  lender_id: number;
  borrower_id: number;
  group_id: number | null;
  amount: string;
  remaining_amount: string;
  description: string | null;
  loan_date: string;
  due_date: string | null;
  status: "active" | "settled" | "overdue";
  lender?: { id: number; name: string; avatar?: string | null };
  borrower?: { id: number; name: string; avatar?: string | null };
  payments?: ApiPayment[];
  paid_amount?: number;
  paid_percentage?: number;
}

export interface ApiPayment {
  id: number;
  loan_id: number;
  paid_by: number | null;
  amount: string;
  note: string | null;
  paid_at: string;
  confirmation_status: "pending" | "confirmed" | "rejected";
  proof_url: string | null;
  proofs?: ApiProof[];
}

export interface ApiProof {
  id: number;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface ApiGroup {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at?: string;
  total_amount?: number;
  total_remaining?: number;
  member_count?: number;
  members?: ApiGroupMember[];
  loans?: ApiLoan[];
}

export interface ApiGroupMember {
  id: number;
  group_id: number;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
}

export interface ApiGroupGuestLink {
  loan_id: number;
  borrower: { id: number; name: string; avatar?: string | null } | null;
  amount: string;
  remaining: string;
  status: "active" | "settled" | "overdue";
  guest_link: string;
}

export interface ApiDashboard {
  net_balance: number;
  total_lent: number;
  total_borrowed: number;
  creditors: Array<{
    lender_id: number;
    total_owe: number;
    lender: { id: number; name: string };
  }>;
  debtors: Array<{
    borrower_id: number;
    total_owed: number;
    borrower: { id: number; name: string };
  }>;
  due_soon: ApiLoan[];
}

// ============================================================
//  Lender static page (สำหรับ /lender/[line_id])
// ============================================================

export interface LenderLoanSummary {
  id: number;
  guest_token: string;
  guest_link: string;
  amount: number;
  remaining: number;
  paid_amount: number;
  paid_percentage: number;
  description: string | null;
  loan_date: string;
  due_date: string | null;
  status: "active" | "settled" | "overdue";
  is_overdue: boolean;
  group_id: number | null;
  group_name: string | null;
  borrower_name: string | null;
}

export interface GuestLenderPage {
  lender: { id: number; name: string; avatar: string | null; line_id: string };
  loans: LenderLoanSummary[];
}

// ============================================================
//  Guest loan (สำหรับ /checkout/[token])
// ============================================================

export interface GuestLoan {
  id: number;
  amount: number;
  remaining: number;
  paid_amount: number;
  paid_percentage: number;
  description: string | null;
  loan_date: string;
  due_date: string | null;
  status: "active" | "settled" | "overdue";
  is_overdue: boolean;
  lender: { id: number; name: string; avatar: string | null };
  payments: ApiPayment[];
  proofs: ApiProof[];
}

// ============================================================
//  Helpers
// ============================================================

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "เกิดข้อผิดพลาด" }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json();
}

// ============================================================
//  Auth
// ============================================================

export const api = {
  // ============================================================
  //  Loans (authenticated)
  // ============================================================

  async getLoans(params?: { role?: "lender" | "borrower"; status?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const data = await apiFetch<{ success: boolean; data: { data: ApiLoan[] } }>(
      `/loans${qs ? "?" + qs : ""}`
    );
    return data.data.data;
  },

  async createLoan(body: {
    borrower_id: number;
    amount: number;
    description?: string;
    due_date?: string;
    loan_date?: string;
  }) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>("/loans", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return data.data;
  },

  async getLoan(id: number) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>(`/loans/${id}`);
    return data.data;
  },

  async deleteLoan(id: number) {
    return apiFetch(`/loans/${id}`, { method: "DELETE" });
  },

  async recordPayment(loanId: number, body: { amount: number; note?: string; paid_at?: string }) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>(
      `/loans/${loanId}/payments`,
      { method: "POST", body: JSON.stringify(body) }
    );
    return data.data;
  },

  async pendingPayments(loanId: number) {
    return apiFetch<ApiPayment[]>(`/loans/${loanId}/payments/pending`);
  },

  async confirmPayment(loanId: number, paymentId: number) {
    return apiFetch(`/loans/${loanId}/payments/${paymentId}/confirm`, { method: "POST" });
  },

  async rejectPayment(loanId: number, paymentId: number, reason?: string) {
    return apiFetch(`/loans/${loanId}/payments/${paymentId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },

  async getGuestLink(loanId: number) {
    return apiFetch<{ guest_link: string }>(`/loans/${loanId}/guest-link`);
  },

  async regenerateLink(loanId: number) {
    return apiFetch<{ guest_link: string }>(`/loans/${loanId}/regenerate-link`, {
      method: "POST",
    });
  },

  async allPendingConfirmations() {
    return apiFetch<{ data: ApiPayment[] }>("/pending-confirmations");
  },

  // ============================================================
  //  Dashboard
  // ============================================================

  async getDashboard() {
    const data = await apiFetch<{ success: boolean; data: ApiDashboard }>("/dashboard");
    return data.data;
  },

  // ============================================================
  //  Members
  // ============================================================

  async getMembers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    const data = await apiFetch<{
      success: boolean;
      data: Array<{ id: number; name: string; phone: string | null; email: string | null }>;
    }>(`/members${qs}`);
    return data.data;
  },

  async createMember(body: { name: string; line_id?: string }) {
    const data = await apiFetch<{ success: boolean; data: { id: number; name: string; line_id: string | null } }>(
      "/members",
      { method: "POST", body: JSON.stringify(body) }
    );
    return data.data;
  },

  // ============================================================
  //  Groups — กลุ่มทริป
  // ============================================================

  async getGroups() {
    const data = await apiFetch<{ success: boolean; data: ApiGroup[] }>("/groups");
    return data.data;
  },

  async createGroup(body: {
    name: string;
    description?: string;
    amount_per_person: number;
    due_date?: string;
    members: Array<{ user_id?: number; name: string }>;
  }) {
    const data = await apiFetch<{ success: boolean; data: ApiGroup }>("/groups", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return data.data;
  },

  async getGroup(id: number) {
    const data = await apiFetch<{ success: boolean; data: ApiGroup }>(`/groups/${id}`);
    return data.data;
  },

  async getGroupGuestLinks(groupId: number) {
    const data = await apiFetch<{ success: boolean; data: ApiGroupGuestLink[] }>(
      `/groups/${groupId}/guest-links`
    );
    return data.data;
  },

  async deleteGroup(id: number) {
    return apiFetch(`/groups/${id}`, { method: "DELETE" });
  },

  // ============================================================
  //  Guest (ไม่ต้อง login)
  // ============================================================

  async getGuestLoan(token: string) {
    const res = await fetch(`${API_BASE}/api/guest/${token}/loan`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("ไม่พบรายการหนี้นี้");
    const data = await res.json();
    return data.loan as GuestLoan;
  },

  async getLenderByLineId(lineId: string) {
    const res = await fetch(`${API_BASE}/api/lender/${encodeURIComponent(lineId)}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("ไม่พบเจ้าหนี้นี้");
    return res.json() as Promise<GuestLenderPage>;
  },

  async guestPay(
    token: string,
    body: { amount: number; note?: string; paid_at?: string; slip?: File }
  ) {
    const form = new FormData();
    form.append("amount", String(body.amount));
    if (body.note) form.append("note", body.note);
    if (body.paid_at) form.append("paid_at", body.paid_at);
    if (body.slip) form.append("slip", body.slip);

    const res = await fetch(`${API_BASE}/api/guest/${token}/pay`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? "เกิดข้อผิดพลาด");
    }
    return res.json();
  },
};
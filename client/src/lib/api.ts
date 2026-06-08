// lib/api.ts — API client เชื่อมต่อ backend จริง

const API_BASE = import.meta.env.PUBLIC_API_URL ?? '';

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
  status: 'active' | 'settled' | 'overdue';
  lender?: {
    id: number;
    name: string;
    avatar?: string | null;
    line_id?: string | null;
  };
  borrower?: {
    id: number;
    name: string;
    avatar?: string | null;
    line_id?: string | null;
  };
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
  confirmation_status: 'pending' | 'confirmed' | 'rejected';
  is_read?: boolean | number;
  proof_url: string | null;
  proofs?: ApiProof[];
  loan?: Pick<
    ApiLoan,
    | 'id'
    | 'lender_id'
    | 'borrower_id'
    | 'amount'
    | 'remaining_amount'
    | 'description'
  > & {
    borrower?: {
      id: number;
      name: string;
      avatar?: string | null;
    } | null;
  };
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
  status: 'active' | 'settled' | 'overdue';
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

export interface ApiKeySettings {
  slipok: {
    has_api_key: boolean;
    masked_api_key: string | null;
    branch_id: string | null;
  };
  promptpay: {
    has_id: boolean;
    id: string | null;
    fallback: string | null;
    recipient: string | null;
  };
  bank?: {
    has_bank: boolean;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
  };
}

// ============================================================
//  Checkout (guest) — PromptPay + SlipOK
// ============================================================

export interface CheckoutInfo {
  lender: {
    id: number;
    name: string;
    avatar: string | null;
    promptpay_target?: string | null;
    bank_name?: string | null;
    bank_account_number?: string | null;
    bank_account_name?: string | null;
  } | null;
  payment_capabilities: {
    promptpay: boolean;
    bank: boolean;
    slipok: boolean;
  };
  can_pay_online: boolean;
  line_bot?: {
    has_bot: boolean;
    basic_id?: string | null;
    display_name?: string | null;
    picture_url?: string | null;
    use_central_bot?: boolean;
  } | null;
}

export interface PromptPayQr {
  recipient: string;
  amount: number;
  qr_data_uri: string;
  format: string;
  size: number;
}

export interface SlipVerifyResult {
  success: boolean;
  verified: boolean;
  data: {
    amount: number;
    transRef?: string;
    [key: string]: unknown;
  } | null;
  message: string;
}

export interface NotificationSettings {
  payment_confirmations: boolean;
  due_soon: boolean;
  overdue: boolean;
  daily_digest: boolean;
  line_push: boolean;
  email_backup: boolean;
  due_soon_days: number;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_message: string;
}

export interface CreditorInsights {
  total_lent: number;
  outstanding: number;
  recovered: number;
  recovery_rate: number;
  active_loans_count: number;
  settled_loans_count: number;
  overdue_amount: number;
  pending_confirmations: number;
  average_ticket: number;
  top_debtors: Array<{
    borrower_id: number;
    borrower: { id: number; name: string };
    outstanding: number;
    loan_count: number;
  }>;
  monthly_recovery: Array<{ month: string; amount: number }>;
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
  status: 'active' | 'settled' | 'overdue';
  is_overdue: boolean;
  group_id: number | null;
  group_name: string | null;
  borrower_id: number | null;
  borrower_name: string | null;
  borrower_avatar: string | null;
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
  status: 'active' | 'settled' | 'overdue';
  is_overdue: boolean;
  lender: { id: number; name: string; avatar: string | null };
  borrower?: {
    id: number;
    name: string;
    line_id?: string | null;
  } | null;
  payments: ApiPayment[];
  proofs: ApiProof[];
}

// ============================================================
//  Helpers
// ============================================================

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    ...init,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'เกิดข้อผิดพลาด' }));
    // Laravel validation errors — รวม field errors ให้อ่านง่าย
    if (err.errors) {
      const firstError = Object.values(
        err.errors as Record<string, string[]>,
      )[0];
      throw new Error(
        Array.isArray(firstError)
          ? firstError[0]
          : (err.message ?? `HTTP ${res.status}`),
      );
    }
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

  async getLoans(params?: { role?: 'lender' | 'borrower'; status?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    const data = await apiFetch<{
      success: boolean;
      data: { data: ApiLoan[] };
    }>(`/loans${qs ? '?' + qs : ''}`);
    return data.data.data;
  },

  async createLoan(body: {
    borrower_id: number;
    amount: number;
    description?: string;
    due_date?: string;
    loan_date?: string;
    proof_url: string;
  }) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>('/loans', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return data.data;
  },

  async getLoan(id: number) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>(
      `/loans/${id}`,
    );
    return data.data;
  },

  async deleteLoan(id: number) {
    return apiFetch(`/loans/${id}`, { method: 'DELETE' });
  },

  async recordPayment(
    loanId: number,
    body: { amount: number; note?: string; paid_at?: string },
  ) {
    const data = await apiFetch<{ success: boolean; data: ApiLoan }>(
      `/loans/${loanId}/payments`,
      { method: 'POST', body: JSON.stringify(body) },
    );
    return data.data;
  },

  async pendingPayments(loanId: number) {
    return apiFetch<ApiPayment[]>(`/loans/${loanId}/payments/pending`);
  },

  async confirmPayment(loanId: number, paymentId: number) {
    return apiFetch(`/loans/${loanId}/payments/${paymentId}/confirm`, {
      method: 'POST',
    });
  },

  async readPayment(loanId: number, paymentId: number) {
    return apiFetch(`/loans/${loanId}/payments/${paymentId}/read`, {
      method: 'POST',
    });
  },

  async rejectPayment(loanId: number, paymentId: number, reason?: string) {
    return apiFetch(`/loans/${loanId}/payments/${paymentId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getGuestLink(loanId: number) {
    return apiFetch<{ guest_link: string }>(`/loans/${loanId}/guest-link`);
  },

  async regenerateLink(loanId: number) {
    return apiFetch<{ guest_link: string }>(
      `/loans/${loanId}/regenerate-link`,
      {
        method: 'POST',
      },
    );
  },

  async remindLoan(loanId: number, message?: string) {
    return apiFetch<{ success: boolean; message: string }>(
      `/loans/${loanId}/remind`,
      {
        method: 'POST',
        body: JSON.stringify({ message }),
      },
    );
  },

  async allPendingConfirmations() {
    return apiFetch<{ data: ApiPayment[] }>('/pending-confirmations');
  },

  async slipPayments() {
    return apiFetch<{ data: ApiPayment[] }>('/slip-payments');
  },

  // ============================================================
  //  Dashboard
  // ============================================================

  async getDashboard() {
    const data = await apiFetch<{ success: boolean; data: ApiDashboard }>(
      '/dashboard',
    );
    return data.data;
  },

  async getApiKeys() {
    const data = await apiFetch<{ success: boolean; data: ApiKeySettings }>(
      '/dashboard/api-keys',
    );
    return data.data;
  },

  async updateApiKeys(body: {
    slipok_api_key?: string;
    slipok_branch_id?: string;
    promptpay_id?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    clear_slipok_api_key?: boolean;
    clear_promptpay_id?: boolean;
    clear_bank?: boolean;
  }) {
    const data = await apiFetch<{ success: boolean; data: ApiKeySettings }>(
      '/dashboard/api-keys',
      {
        method: 'PUT',
        body: JSON.stringify(body),
      },
    );
    return data.data;
  },

  async getNotificationSettings() {
    const data = await apiFetch<{
      success: boolean;
      data: NotificationSettings;
    }>('/dashboard/notification');
    return data.data;
  },

  async updateNotificationSettings(body: NotificationSettings) {
    const data = await apiFetch<{
      success: boolean;
      data: NotificationSettings;
    }>('/dashboard/notification', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return data.data;
  },

  async testNotification(toLineId?: string) {
    return await apiFetch<{ success: boolean; message: string }>(
      '/dashboard/notification/test',
      {
        method: 'POST',
        body: toLineId ? JSON.stringify({ to_line_id: toLineId }) : undefined,
      },
    );
  },

  async getCreditorInsights() {
    const data = await apiFetch<{ success: boolean; data: CreditorInsights }>(
      '/dashboard/insights',
    );
    return data.data;
  },

  // ============================================================
  //  Members
  // ============================================================

  async getMembers(search?: string) {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await apiFetch<{
      success: boolean;
      data: Array<{
        id: number;
        name: string;
        phone: string | null;
        email: string | null;
        line_id?: string | null;
        we_are_creditor?: number;
        we_are_debtor?: number;
        active_loans_count?: number;
      }>;
    }>(`/members${qs}`);
    return data.data;
  },

  async createMember(body: { name: string; line_id?: string; phone?: string }) {
    const data = await apiFetch<{
      success: boolean;
      data: { id: number; name: string; line_id: string | null };
    }>('/members', { method: 'POST', body: JSON.stringify(body) });
    return data.data;
  },

  // ============================================================
  //  Groups — กลุ่มทริป
  // ============================================================

  async getGroups() {
    const data = await apiFetch<{ success: boolean; data: ApiGroup[] }>(
      '/groups',
    );
    return data.data;
  },

  async createGroup(body: {
    name: string;
    description?: string;
    amount_per_person: number;
    due_date?: string;
    members: Array<{ user_id?: number; name: string }>;
    proof_url: string;
  }) {
    const data = await apiFetch<{ success: boolean; data: ApiGroup }>(
      '/groups',
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
    );
    return data.data;
  },

  async getGroup(id: number) {
    const data = await apiFetch<{ success: boolean; data: ApiGroup }>(
      `/groups/${id}`,
    );
    return data.data;
  },

  async getGroupGuestLinks(groupId: number) {
    const data = await apiFetch<{
      success: boolean;
      data: ApiGroupGuestLink[];
    }>(`/groups/${groupId}/guest-links`);
    return data.data;
  },

  async deleteGroup(id: number) {
    return apiFetch(`/groups/${id}`, { method: 'DELETE' });
  },

  // ============================================================
  //  Guest (ไม่ต้อง login)
  // ============================================================

  async getGuestLoan(token: string) {
    const res = await fetch(`${API_BASE}/api/guest/${token}/loan`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('ไม่พบรายการหนี้นี้');
    const data = await res.json();
    return data.loan as GuestLoan;
  },

  async getLenderByLineId(lineId: string) {
    const res = await fetch(
      `${API_BASE}/api/lender/${encodeURIComponent(lineId)}`,
      {
        headers: { Accept: 'application/json' },
      },
    );
    if (!res.ok) throw new Error('ไม่พบเจ้าหนี้นี้');
    return res.json() as Promise<GuestLenderPage>;
  },
  // },
  async getCheckoutInfo(token: string) {
    const res = await fetch(`${API_BASE}/api/guest/${token}/checkout-info`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error('ไม่พบรายการหนี้นี้');
    return (await res.json()) as CheckoutInfo;
  },

  async getPromptPayQr(token: string, amount: number) {
    const res = await fetch(
      `${API_BASE}/api/guest/${token}/promptpay-qr?amount=${encodeURIComponent(amount)}`,
      { headers: { Accept: 'application/json' } },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message ?? 'สร้าง QR ไม่สำเร็จ') as Error & {
        requiresSetup?: boolean;
      };
      if (data.requires_setup) err.requiresSetup = true;
      throw err;
    }
    return data as PromptPayQr;
  },

  async verifySlip(token: string, body: { slip: File; amount?: number }) {
    const form = new FormData();
    form.append('slip', body.slip);
    if (body.amount !== undefined) {
      form.append('amount', String(body.amount));
    }

    const res = await fetch(`${API_BASE}/api/guest/${token}/verify-slip`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 200) {
      const err = new Error(data.message ?? 'ตรวจสอบสลิปไม่สำเร็จ') as Error & {
        requiresSetup?: boolean;
      };
      if (data.requires_setup) err.requiresSetup = true;
      throw err;
    }
    return data as SlipVerifyResult;
  },

  async guestPay(
    token: string,
    body: { amount?: number; note?: string; paid_at?: string; slip?: File },
  ) {
    const form = new FormData();
    if (body.amount !== undefined) {
      form.append('amount', String(body.amount));
    }
    if (body.note) form.append('note', body.note);
    if (body.paid_at) form.append('paid_at', body.paid_at);
    if (body.slip) form.append('slip', body.slip);

    const res = await fetch(`${API_BASE}/api/guest/${token}/pay`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? 'เกิดข้อผิดพลาด');
    }
    return res.json();
  },

  async guestApproveLoan(token: string) {
    const res = await fetch(`${API_BASE}/api/guest/${token}/approve`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message ?? 'อนุมัติรายการยืมเงินไม่สำเร็จ');
    }
    return data;
  },
};

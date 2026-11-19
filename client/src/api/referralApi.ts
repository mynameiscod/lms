import axios from 'axios';

/* LMS Refer & Earn (server/src/routes/referralRoutes.ts). Separate from CareerPilot's coin referral. */

const BASE = '/api/v1/referrals';
const PUBLIC = '/api/v1/public/refer';

const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};
const get = async <T,>(url: string, params?: any): Promise<T> => (await axios.get(url, { headers: authHeader(), params })).data.data;
const post = async <T,>(url: string, body?: any): Promise<T> => (await axios.post(url, body || {}, { headers: authHeader() })).data.data;
const put = async <T,>(url: string, body?: any): Promise<T> => (await axios.put(url, body || {}, { headers: authHeader() })).data.data;

/** The server's message, for showing to a person. */
export const refErr = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;

export type ReferralStatus = 'pending' | 'joined' | 'on_hold' | 'earned' | 'rejected';

export const STATUS_LABEL: Record<ReferralStatus, string> = {
  pending: 'Enquired',
  joined: 'Joined',
  on_hold: 'On hold',
  earned: 'Earned',
  rejected: 'Not counted',
};

export interface PayoutDetails {
  method: 'upi' | 'bank';
  upiId?: string;
  holderName?: string;
  accountNumber?: string;
  ifsc?: string;
  bankName?: string;
}

export interface ReferralStats {
  invited: number; pending: number; joined: number; onHold: number; onHoldAmount: number;
  earnedCount: number; rejected: number; earned: number; paidOut: number; requested: number; available: number;
}

export interface Program {
  enabled: boolean; rewardAmount: number; holdDays: number; minPayout: number; courses: string[]; terms: string;
}

export interface MyReferral {
  _id: string; friendName: string; friendPhone: string; course?: string; status: ReferralStatus;
  rewardAmount: number; holdUntil?: string; earnedAt?: string; createdAt: string; rejectedReason?: string;
}

export interface Payout {
  _id: string; amount: number; details: PayoutDetails; status: 'requested' | 'paid' | 'rejected';
  reference?: string; paidAt?: string; rejectedReason?: string; createdAt: string;
  referrerId?: string; referrerName?: string; phone?: string; email?: string; paidByName?: string;
}

export interface MyPage {
  eligible: boolean; reason: string | null; program: Program; code: string | null; firstName: string;
  stats: ReferralStats; referrals: MyReferral[]; payouts: Payout[]; payoutDetails: PayoutDetails | null; hasSavedBank: boolean;
}

export interface AdminReferral {
  _id: string; referrerId: string; referrerName: string; code: string; friendName: string; friendPhone: string;
  friendEmail?: string; course?: string; via: 'link' | 'app' | 'admin'; leadId?: string; studentId?: string;
  status: ReferralStatus; rewardAmount: number; holdUntil?: string; earnedAt?: string; rejectedReason?: string;
  createdAt: string; history: { at: string; status: string; note?: string; by?: string }[];
  fee: { net: number; paid: number } | null;
}

export interface AdminSummary {
  counts: Record<ReferralStatus, number>; total: number; onHoldAmount: number; earnedAmount: number; paidOut: number;
  requested: { n: number; amount: number };
  top: { _id: string; name: string; code: string; joined: number; earned: number }[];
}

export interface PublicInfo {
  open: boolean; code: string; referrerFirstName: string; institute: { name: string; logo: string | null }; courses: string[];
}

export const referralApi = {
  // public link
  publicInfo: (code: string) => axios.get(`${PUBLIC}/${encodeURIComponent(code)}`).then(r => r.data.data as PublicInfo),
  publicSubmit: (code: string, body: { name: string; mobile: string; email?: string; course?: string }) =>
    axios.post(`${PUBLIC}/${encodeURIComponent(code)}`, body).then(r => r.data.data as { institute: string }),

  // student
  me: () => get<MyPage>(`${BASE}/me`),
  refer: (body: { name: string; mobile: string; email?: string; course?: string }) => post<{ id: string }>(`${BASE}/me/refer`, body),
  withdraw: (body: { amount: number; details?: PayoutDetails; useSaved?: boolean }) => post<{ id: string; amount: number }>(`${BASE}/me/withdraw`, body),

  // admin
  program: () => get<Program>(`${BASE}/admin/program`),
  saveProgram: (body: Partial<Program>) => put<Program>(`${BASE}/admin/program`, body),
  summary: () => get<AdminSummary>(`${BASE}/admin/summary`),
  list: (params: { status?: string; search?: string; page?: number }) =>
    get<{ rows: AdminReferral[]; total: number; page: number; pages: number }>(`${BASE}/admin/list`, params),
  add: (body: { code: string; name: string; phone: string; email?: string; course?: string }) => post<{ id: string }>(`${BASE}/admin/add`, body),
  reject: (id: string, reason: string) => post(`${BASE}/admin/${id}/reject`, { reason }),
  restore: (id: string) => post(`${BASE}/admin/${id}/restore`),
  recheck: (id: string) => post<AdminReferral>(`${BASE}/admin/${id}/recheck`),
  payouts: (status: string) => get<Payout[]>(`${BASE}/admin/payouts`, { status }),
  payoutPaid: (id: string, body: { reference: string; paidAt?: string }) => post(`${BASE}/admin/payouts/${id}/paid`, body),
  payoutReject: (id: string, reason: string) => post(`${BASE}/admin/payouts/${id}/reject`, { reason }),
};

export const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
export const shortDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const referLink = (code: string) => `${window.location.origin}/refer/${code}`;

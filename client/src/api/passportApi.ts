import axios from 'axios';
import { loadRazorpay } from './paymentApi';

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/passport';
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface OnboardingField { key: string; label: string; type: string; required: boolean; locked?: boolean; options?: string[]; order: number; }
export interface Entitlement { featureKey: string; label: string; tier: 'free' | 'paid'; }
export interface PassportConfig {
  _id?: string; enabled: boolean; assessmentMode: 'deterministic' | 'ai';
  onboardingFields: OnboardingField[]; entitlements: Entitlement[];
  priceInr: number; membershipMonths: number;
}

export const passportApi = {
  getConfig: async (): Promise<{ config: PassportConfig; platformEnabled: boolean }> => {
    const { data } = await axios.get(`${BASE}/config`, { headers: auth() });
    return data;
  },
  updateConfig: async (patch: Partial<PassportConfig>): Promise<PassportConfig> => {
    const { data } = await axios.put(`${BASE}/config`, patch, { headers: auth() });
    return data.config;
  },
  listStudents: async (search = ''): Promise<any[]> => {
    const { data } = await axios.get(`${BASE}/students`, { headers: auth(), params: { search } });
    return data.students;
  },
  convert: async (studentId: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/convert`, { studentId }, { headers: auth() });
    return data;
  },
  me: async (): Promise<any> => {
    const { data } = await axios.get(`${BASE}/me`, { headers: auth() });
    return data;
  },
  setPassword: async (password: string): Promise<{ success: boolean }> => {
    const { data } = await axios.post(`${BASE}/set-password`, { password }, { headers: auth() });
    return data;
  },

  // Assessment — student
  getAssessment: async (): Promise<{ title: string; questions: AssessQuestion[] }> => {
    const { data } = await axios.get(`${BASE}/assessment`, { headers: auth() });
    return data;
  },
  submitAssessment: async (answers: { questionId: string; chosen: number }[]): Promise<{ result: AssessResult }> => {
    const { data } = await axios.post(`${BASE}/assessment/submit`, { answers }, { headers: auth() });
    return data;
  },
  getResult: async (): Promise<{ result: AssessResult | null }> => {
    const { data } = await axios.get(`${BASE}/assessment/result`, { headers: auth() });
    return data;
  },

  // Assessment — admin
  getAssessmentAdmin: async (): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.get(`${BASE}/assessment/admin`, { headers: auth() });
    return data;
  },
  saveAssessment: async (patch: { title?: string; questions?: AssessQuestionFull[] }): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.put(`${BASE}/assessment/admin`, patch, { headers: auth() });
    return data;
  },
  resetAssessment: async (): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.post(`${BASE}/assessment/reset`, {}, { headers: auth() });
    return data;
  },

  // Missions
  getToday: async (): Promise<TodayMissions> => {
    const { data } = await axios.get(`${BASE}/missions/today`, { headers: auth() });
    return data;
  },
  completeMission: async (key: string): Promise<{ ok: boolean; xp: number; streak: number; longestStreak: number; allDone: boolean }> => {
    const { data } = await axios.post(`${BASE}/missions/complete`, { key }, { headers: auth() });
    return data;
  },

  // Membership checkout (₹499). Opens Razorpay and resolves true on successful activation.
  membershipCheckout: async (): Promise<{ ok: boolean; message?: string }> => {
    const ready = await loadRazorpay();
    if (!ready) return { ok: false, message: 'Could not load the payment window. Check your connection.' };
    let order: any;
    try {
      const { data } = await axios.post(`${BASE}/membership/order`, {}, { headers: auth() });
      order = data;
    } catch (e: any) {
      return { ok: false, message: e?.response?.data?.message || 'Could not start payment.' };
    }
    // Absolute return URL for redirect-mode checkout (mobile / incognito / popup-blocked,
    // where the in-page handler can't fire). Razorpay redirects here after payment; our
    // server settles and bounces back to /passport.
    const apiRoot = process.env.REACT_APP_API_URL || '/api/v1';
    const base = apiRoot.startsWith('http') ? apiRoot : window.location.origin + apiRoot;
    const callbackUrl = `${base}/payments/return?to=${encodeURIComponent('/passport')}`;
    return new Promise((resolve) => {
      const rzp = new (window as any).Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: order.name, description: order.description, order_id: order.orderId,
        prefill: order.prefill, theme: { color: '#6650d8' },
        callback_url: callbackUrl, redirect: true,
        handler: async (resp: any) => {
          try {
            await axios.post(`${BASE}/membership/verify`, {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }, { headers: auth() });
            resolve({ ok: true });
          } catch (e: any) { resolve({ ok: false, message: e?.response?.data?.message || 'Verification failed.' }); }
        },
        // The payment can complete in a redirected tab, so the handler above never fires
        // in this window. On dismiss, re-check server state (the webhook may have already
        // activated the membership) before treating it as a cancellation.
        modal: {
          ondismiss: async () => {
            try { const me = await passportApi.me(); if (me?.active) return resolve({ ok: true }); } catch { /* ignore */ }
            resolve({ ok: false, message: 'Payment cancelled.' });
          },
        },
      });
      rzp.on('payment.failed', (r: any) => resolve({ ok: false, message: r?.error?.description || 'Payment failed.' }));
      rzp.open();
    });
  },
};

export interface TodayMissions {
  locked?: boolean; needsAssessment?: boolean; priceInr?: number; reason?: string;
  day?: number; streak?: number; longestStreak?: number; xp?: number; allDone?: boolean;
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; done: boolean }[];
}

export interface PassportCard {
  name: string; careerScore: number | null; level: string | null;
  pathway: string | null; careerGoal: string | null; memberSince: string | null;
}

export interface AssessQuestion { id: string; category: string; text: string; options: string[]; }
export interface AssessQuestionFull { _id?: string; category: string; text: string; options: string[]; correctIndex: number; weight: number; selfReport?: boolean; }
export interface AssessmentBank { _id?: string; tenantId: string; title: string; questions: AssessQuestionFull[]; }
export interface CategoryScore { key: string; label: string; score: number; }
export interface AssessResult {
  careerScore: number; level: string; levelKey: string;
  categoryScores: CategoryScore[]; strengths: string[]; weaknesses: string[];
  pathway: string; pathwayLabel: string;
  weekPreview: { day: number; title: string; detail: string }[];
  takenAt?: string;
}

// ── Public funnel (no auth) ──
const PUB = (process.env.REACT_APP_API_URL || '/api/v1') + '/public/passport';
export const passportPublicApi = {
  getConfig: async (tenant: string) => {
    const { data } = await axios.get(`${PUB}/config`, { params: { tenant } });
    return data as { success: boolean; enabled: boolean; onboardingFields: OnboardingField[]; priceInr: number; tenantId: string };
  },
  signup: async (body: { tenant: string; name: string; mobile: string; email: string; fields: Record<string, any> }) => {
    const { data } = await axios.post(`${PUB}/signup`, body);
    return data as { success: boolean; token: string; otp: { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number } };
  },
  verify: async (token: string, code: string) => {
    const { data } = await axios.post(`${PUB}/verify`, { token, code });
    return data as { success: boolean; token: string; tenantId: string; user: any };
  },
  resend: async (token: string) => {
    const { data } = await axios.post(`${PUB}/resend`, { token });
    return data as { success: boolean; otp: any };
  },
  // Returning-member login (password — free) and OTP-login start (then reuse verify()).
  loginPassword: async (tenant: string, identifier: string, password: string) => {
    const { data } = await axios.post(`${PUB}/login-password`, { tenant, identifier, password });
    return data as { success: boolean; token: string; tenantId: string; user: any };
  },
  loginOtp: async (tenant: string, mobile: string) => {
    const { data } = await axios.post(`${PUB}/login-otp`, { tenant, mobile });
    return data as { success: boolean; token: string; otp: { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number } };
  },
  getCard: async (slug: string) => {
    const { data } = await axios.get(`${PUB}/card/${encodeURIComponent(slug)}`);
    return data as { success: boolean; card: PassportCard };
  },
};

export default passportApi;

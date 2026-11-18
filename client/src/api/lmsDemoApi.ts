import axios from 'axios';

const BASE = '/api/v1/lms-demo';
const PUBLIC = '/api/v1/public/lms-demo';

const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

/** The server's message, for showing to a person. */
export const demoErr = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;

export interface DemoCourseCard {
  curriculumId: string;
  title: string;
  blurb: string;
  color: string;
  totalDays: number;
}

export interface DemoMeCourse extends DemoCourseCard {
  enrollmentId: string | null;
  itemsDone: number;
  itemsTotal: number;
  daysDone: number;
  pct: number;
  minutes?: number;
}

export interface DemoMe {
  isDemo: boolean;
  active?: boolean;
  ended?: boolean;
  expiresAt?: string | null;
  daysLeft?: number;
  endedEarly?: boolean;
  startedAt?: string;
  firstName?: string;
  courses?: DemoMeCourse[];
  ai?: { left: number; limit: number };
  counsellor?: { phone: string; whatsapp: string; message: string };
  talkRequestedAt?: string | null;
  moreTimeRequestedAt?: string | null;
}

export interface LoginPayload { token: string; user: any; tenant: any }

export interface OtpInfo { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number }

export interface DemoConfig {
  enabled: boolean;
  lengthDays: number;
  aiPerDay: number;
  courses: { curriculumId: string; title?: string; blurb?: string; color?: string; order: number; active: boolean }[];
  counsellorPhone?: string;
  counsellorWhatsApp?: string;
  endMessage?: string;
  updatedByName?: string;
  updatedAt?: string;
}

export interface DemoPlanOption { _id: string; title: string; totalDays: number; isPublished: boolean; daysWithContent: number; items: number }

export interface DemoStudentRow {
  _id: string;
  name: string;
  phone: string;
  email: string;
  status: string;
  source: 'self' | 'given';
  givenBy: string;
  startedAt: string;
  expiresAt: string;
  active: boolean;
  daysLeft: number;
  endedEarly: boolean;
  lastSeenAt: string | null;
  itemsDone: number;
  daysDone: number;
  minutes: number;
  talkRequestedAt: string | null;
  moreTimeRequestedAt: string | null;
  leadId: string | null;
}

/** Put a demo login into the browser the way the normal login does. The caller reloads into the app. */
export function storeDemoLogin(p: LoginPayload) {
  localStorage.setItem('token', p.token);
  localStorage.setItem('user', JSON.stringify(p.user));
  localStorage.setItem('tenantId', String(p.user.tenantId));
}

export const lmsDemoApi = {
  /* public */
  info: async (): Promise<{ enabled: boolean; lengthDays: number; courses: DemoCourseCard[] }> =>
    (await axios.get(`${PUBLIC}/info`)).data.data,
  start: async (body: { name: string; phone: string; email?: string; status?: string }): Promise<{ token: string; otp: OtpInfo }> =>
    (await axios.post(`${PUBLIC}/start`, body)).data,
  resend: async (token: string): Promise<{ otp: OtpInfo }> => (await axios.post(`${PUBLIC}/resend`, { token })).data,
  verify: async (token: string, code: string): Promise<LoginPayload> => (await axios.post(`${PUBLIC}/verify`, { token, code })).data,
  enter: async (t: string): Promise<LoginPayload> => (await axios.post(`${PUBLIC}/enter`, { t })).data,

  /* demo student */
  me: async (): Promise<DemoMe> => (await axios.get(`${BASE}/me`, { headers: authHeader() })).data.data,
  talk: async (via?: string) => (await axios.post(`${BASE}/me/talk`, { via }, { headers: authHeader() })).data,
  moreTime: async () => (await axios.post(`${BASE}/me/more-time`, {}, { headers: authHeader() })).data,

  /* admin */
  getConfig: async (): Promise<{ tenantId: string | null; config: DemoConfig; plans: DemoPlanOption[] }> =>
    (await axios.get(`${BASE}/admin/config`, { headers: authHeader() })).data.data,
  saveConfig: async (body: Partial<DemoConfig>): Promise<DemoConfig> =>
    (await axios.put(`${BASE}/admin/config`, body, { headers: authHeader() })).data.data,
  students: async (params: { search?: string; status?: string }): Promise<{ rows: DemoStudentRow[]; counts: { all: number; active: number; ended: number; talk: number } }> =>
    (await axios.get(`${BASE}/admin/students`, { params, headers: authHeader() })).data.data,
  give: async (body: { name: string; phone: string; email?: string; status?: string; lengthDays?: number }): Promise<{ _id: string; returning: boolean; link: string; expiresAt: string }> =>
    (await axios.post(`${BASE}/admin/students`, body, { headers: authHeader() })).data.data,
  link: async (id: string): Promise<string> => (await axios.get(`${BASE}/admin/students/${id}/link`, { headers: authHeader() })).data.data.link,
  extend: async (id: string, days: number) => (await axios.post(`${BASE}/admin/students/${id}/extend`, { days }, { headers: authHeader() })).data.data,
  end: async (id: string) => (await axios.post(`${BASE}/admin/students/${id}/end`, {}, { headers: authHeader() })).data,
  reset: async (id: string) => (await axios.post(`${BASE}/admin/students/${id}/reset`, {}, { headers: authHeader() })).data,
};

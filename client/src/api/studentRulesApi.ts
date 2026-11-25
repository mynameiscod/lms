import axios from 'axios';

const BASE = '/api/v1/student-rules';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export interface OfficeNetwork { ip: string; label?: string; addedAt?: string }

export interface StudentRules {
  attendance: {
    enabled: boolean;
    sameNetworkAsScreen: boolean;
    savedNetworks: boolean;
    networks: OfficeNetwork[];
    location: boolean;
    officeLat?: number;
    officeLng?: number;
    radiusM: number;
    checkOut: boolean;
    minMinutesBeforeCheckOut: number;
    lateAfter: string;
    onePhonePerStudent: boolean;
    qrSeconds: number;
  };
  inactivity: {
    enabled: boolean;
    studentAfterDays: number;
    trainerAfterDays: number;
    parentAfterDays: number;
    sendHourIst: number;
    skipSundays: boolean;
  };
  profileGate: { enabled: boolean; requireParentMobile: boolean };
  updatedAt?: string;
}

export interface RulesResponse { rules: StudentRules; yourIp: string; screens: { ip: string; at: string }[] }

export interface QrScreen {
  svg: string; url: string; batchName: string; refreshInMs: number; qrSeconds: number; checkOut: boolean;
  checkedIn: number; checkedOut: number;
  checks: { sameNetworkAsScreen: boolean; savedNetworks: boolean; location: boolean };
}

export interface CheckInResult {
  action: 'in' | 'out' | 'already';
  time: string;
  inTime?: string;
  late?: boolean;
  checkOutExpected?: boolean;
  name?: string;
  message?: string;
}

export interface ProfileGate {
  /** Something holds this student on the profile page: the profile rule, or an agreement to accept. */
  enabled: boolean; complete: boolean; percent: number; requireParentMobile: boolean;
  missing: { section: string; fields: string[] }[];
  /** The complete-your-profile rule is on, and whether this profile meets it. */
  profileRule?: boolean; profileComplete?: boolean;
  /** Live agreements marked "hold the LMS until accepted" this student has not accepted yet. */
  agreements?: { id: string; title: string }[];
}

export interface MeResponse {
  applies: boolean;
  attendance: { enabled: boolean; checkOut?: boolean; record?: { inTime?: string; outTime?: string; status: string; late?: boolean; method?: string } | null };
  profileGate: ProfileGate;
}

export interface InactiveRow {
  studentId: string; name: string; phone: string; batchName: string; lastActiveAt: string | null; daysInactive: number;
  parentMobile: string; trainers: { name: string; phone: string }[];
  due: { student: boolean; trainer: boolean; parent: boolean };
  missing: { studentPhone: boolean; parentMobile: boolean; trainer: boolean };
}

export interface InactivityOverview {
  config: StudentRules['inactivity'];
  rows: InactiveRow[];
  trainerMsgs: { trainer: string; students: number }[];
  templates: { student: boolean; trainer: boolean; parent: boolean };
  counts: { student: number; trainer: number; parent: number };
  messages: number;
  costInr: number;
  recent: { id: string; kind: string; ok: boolean; error?: string; daysInactive: number; sentAt: string; student: string }[];
}

export const studentRulesApi = {
  get: async (): Promise<RulesResponse> => d(await axios.get(BASE, h())),
  save: async (rules: Partial<StudentRules>): Promise<StudentRules> => d(await axios.put(BASE, rules, h())),
  qr: async (batchId: string): Promise<QrScreen> =>
    d(await axios.get(`${BASE}/attendance/qr`, { ...h(), params: { batchId: batchId || 'all', origin: window.location.origin } })),
  checkIn: async (body: { token: string; lat?: number; lng?: number; deviceId?: string }): Promise<CheckInResult> =>
    d(await axios.post(`${BASE}/attendance/check-in`, body, h())),
  me: async (): Promise<MeResponse> => d(await axios.get(`${BASE}/me`, h())),
  inactivity: async (): Promise<InactivityOverview> => d(await axios.get(`${BASE}/inactivity`, h())),
  runInactivity: async (): Promise<{ student: number; trainer: number; parent: number; failed: number }> =>
    d(await axios.post(`${BASE}/inactivity/run`, {}, h())),
};

/** A random id kept on this phone, so one phone cannot check in several students. */
export function deviceId(): string {
  const KEY = 'attendance.deviceId';
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (window.crypto as any)?.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(KEY, id!);
    }
    return id!;
  } catch { return ''; }
}

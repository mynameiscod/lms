import axios from 'axios';
import { attributionForSubmit } from '../utils/careerPilotAttribution';

const BASE = '/api/v1/placement-program';
const PUB = '/api/v1/public/placement-program';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export const PLACEMENT_STAGES = [
  ['registered', 'Registered'], ['payment_pending', 'Payment pending'], ['paid', 'Paid'],
  ['interview_booked', 'Interview booked'], ['interview_attended', 'Attended'], ['interview_no_show', 'No-show'],
  ['selected', 'Selected'], ['rejected', 'Rejected'], ['agreement_sent', 'Agreement sent'],
  ['agreement_signed', 'Agreement signed'], ['cheque_verified', 'Cheque verified'], ['active', 'Active'],
  ['placed', 'Placed'], ['withdrawn', 'Withdrawn'],
] as const;
export type PlacementStage = typeof PLACEMENT_STAGES[number][0];
export const stageLabel = (s: string) => (PLACEMENT_STAGES.find(([k]) => k === s)?.[1]) || s;

export interface PlacementTouch { utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; gclid?: string; fbclid?: string; landing_page?: string }
export interface PlacementCandidate {
  _id: string; name: string; mobile: string; email?: string; college?: string; degree?: string; branch?: string;
  graduationYear?: number; experience?: string; skills?: string; targetRole?: string; city?: string;
  source: 'ad' | 'lms_push' | 'manual'; stage: PlacementStage; stageChangedAt: string; submissions: number; createdAt: string;
  attribution?: { first_touch?: PlacementTouch; last_touch?: PlacementTouch };
  fee?: { waived?: boolean; amountInr?: number; refundablePct?: number; status?: 'created' | 'paid' | 'refunded'; paidAt?: string; refund?: { amountInr: number; at: string; reason?: string } };
  interview?: { startsAt?: string; meetUrl?: string; outcome?: string; score?: number; recommendation?: Recommendation; notes?: string };
}
export interface PlacementEvent { _id: string; kind: string; message: string; createdAt: string; actorId?: { firstName?: string; lastName?: string } }

export interface PlacementRegistration {
  name: string; mobile: string; email?: string; college?: string; degree?: string; branch?: string;
  graduationYear?: string; experience?: string; skills?: string; targetRole?: string; city?: string;
}

export const placementProgramApi = {
  /** Public form. Ad attribution captured site-wide (UTM, fbclid, gclid) is attached automatically. */
  register: (tenant: string, body: PlacementRegistration) =>
    axios.post(`${PUB}/register`, { ...body, attribution: attributionForSubmit() }, { params: { tenant } }).then(d) as Promise<{ returning: boolean; portalToken?: string }>,
  list: (q: { stage?: string; source?: string; search?: string; page?: number; limit?: number }) =>
    axios.get(BASE, { ...h(), params: q }).then(d) as Promise<{ rows: PlacementCandidate[]; total: number; page: number; limit: number; byStage: Record<string, number> }>,
  get: (id: string) => axios.get(`${BASE}/${id}`, h()).then(d) as Promise<{ candidate: PlacementCandidate & { hasPortal?: boolean }; events: PlacementEvent[]; bookings: Booking[] }>,
  setStage: (id: string, stage: string, note?: string) => axios.put(`${BASE}/${id}/stage`, { stage, note }, h()).then(d),
  addNote: (id: string, text: string) => axios.post(`${BASE}/${id}/notes`, { text }, h()).then(d),
};

// ── Phase 2 ──────────────────────────────────────────────────────────────────

export interface PortalView {
  org: string; name: string; stage: string;
  fee: { amountInr: number; refundablePct: number; due: boolean; paid: boolean; waived: boolean; payFirst: boolean };
  canBook: boolean;
  booking: null | { id: string; startsAt: string; endsAt: string; meetingUrl: string; interviewer: string; canCancel: boolean };
}
export interface PortalOrder { orderId: string; amount: number; currency: string; keyId?: string; name: string; mobile: string; email?: string }

/** The candidate's own page (no login — the secret link is the key). */
export const placementPortalApi = {
  view: (token: string) => axios.get(`${PUB}/portal/${token}`).then(d) as Promise<PortalView>,
  slots: (token: string) => axios.get(`${PUB}/portal/${token}/slots`).then(d) as Promise<{ startsAt: string; endsAt: string }[]>,
  order: (token: string) => axios.post(`${PUB}/portal/${token}/order`).then(d) as Promise<PortalOrder>,
  verify: (token: string, body: { orderId: string; paymentId: string; signature: string }) => axios.post(`${PUB}/portal/${token}/verify`, body).then(d),
  book: (token: string, startsAt: string) => axios.post(`${PUB}/portal/${token}/book`, { startsAt }).then(d) as Promise<{ startsAt: string; meetingUrl: string; interviewer: string }>,
  cancel: (token: string) => axios.post(`${PUB}/portal/${token}/cancel`).then(d),
};

export interface PlacementConfig { feeInr: number; refundablePct: number; paymentBeforeBooking: boolean; slotMinutes: number; bufferMinutes: number; bookingWindowDays: number; minNoticeHours: number; scorecardCriteria: string[] }

export type Recommendation = 'strong_yes' | 'yes' | 'maybe' | 'no';
export const RECOMMENDATIONS: [Recommendation, string][] = [['strong_yes', 'Strong yes'], ['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']];
export const recLabel = (r?: string) => RECOMMENDATIONS.find(([k]) => k === r)?.[1] || '';
export interface Scorecard { ratings: { criterion: string; score: number }[]; recommendation: Recommendation; notes?: string; average?: number }

/** An interview nobody marked half an hour after it ended. */
export const needsMarking = (b: { status: string; endsAt: string }) => b.status === 'booked' && new Date(b.endsAt).getTime() + 30 * 60_000 < Date.now();
export interface WeeklyWindow { day: number; start: string; end: string }
export interface Interviewer { _id?: string; name: string; email?: string; meetingUrl: string; active: boolean; weekly: WeeklyWindow[]; daysOff: string[]; userId?: string }
export interface Booking {
  _id: string; startsAt: string; endsAt: string; meetingUrl: string; status: 'booked' | 'cancelled' | 'attended' | 'no_show';
  candidateId?: { _id: string; name: string; mobile: string; email?: string; college?: string; targetRole?: string; stage: string };
  interviewerId?: { _id: string; name: string };
  scorecard?: Scorecard;
}
export interface BoardCard {
  _id: string; name: string; mobile: string; college?: string; targetRole?: string; stage: PlacementStage; stageChangedAt: string; createdAt: string;
  fee?: { status?: string; waived?: boolean };
  interview?: { startsAt?: string; score?: number; recommendation?: Recommendation };
}

export const placementAdminApi = {
  getConfig: () => axios.get(`${BASE}/config`, h()).then(d) as Promise<PlacementConfig>,
  saveConfig: (c: Partial<PlacementConfig>) => axios.put(`${BASE}/config`, c, h()).then(d) as Promise<PlacementConfig>,
  interviewers: () => axios.get(`${BASE}/interviewers`, h()).then(d) as Promise<Interviewer[]>,
  saveInterviewer: (iv: Interviewer) => (iv._id
    ? axios.put(`${BASE}/interviewers/${iv._id}`, iv, h()) : axios.post(`${BASE}/interviewers`, iv, h())).then(d) as Promise<Interviewer>,
  deleteInterviewer: (id: string) => axios.delete(`${BASE}/interviewers/${id}`, h()).then(d),
  bookings: (range: 'upcoming' | 'past' = 'upcoming') => axios.get(`${BASE}/bookings`, { ...h(), params: { range } }).then(d) as Promise<Booking[]>,
  myBookings: (range: 'upcoming' | 'past' = 'upcoming') => axios.get(`${BASE}/bookings/mine`, { ...h(), params: { range } }).then(d) as Promise<Booking[]>,
  cancelBooking: (id: string, reason?: string) => axios.post(`${BASE}/bookings/${id}/cancel`, { reason }, h()).then(d),
  outcome: (id: string, outcome: 'attended' | 'no_show', scorecard?: Scorecard) => axios.post(`${BASE}/bookings/${id}/outcome`, { outcome, scorecard }, h()).then(d),
  scorecardCriteria: () => axios.get(`${BASE}/scorecard-criteria`, h()).then(d) as Promise<string[]>,
  board: () => axios.get(`${BASE}/board`, h()).then(d) as Promise<BoardCard[]>,
  waive: (id: string, waived: boolean) => axios.put(`${BASE}/${id}/waive`, { waived }, h()).then(d),
  refund: (id: string, reason?: string) => axios.post(`${BASE}/${id}/refund`, { reason }, h()).then(d),
  portalLink: (id: string) => axios.post(`${BASE}/${id}/portal-link`, {}, h()).then(d) as Promise<{ url: string }>,
};

/** "Mon, 6 Oct, 10:30 am" in IST. */
export const istTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });

export const errMsg = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

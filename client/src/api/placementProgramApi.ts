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
}
export interface PlacementEvent { _id: string; kind: string; message: string; createdAt: string; actorId?: { firstName?: string; lastName?: string } }

export interface PlacementRegistration {
  name: string; mobile: string; email?: string; college?: string; degree?: string; branch?: string;
  graduationYear?: string; experience?: string; skills?: string; targetRole?: string; city?: string;
}

export const placementProgramApi = {
  /** Public form. Ad attribution captured site-wide (UTM, fbclid, gclid) is attached automatically. */
  register: (tenant: string, body: PlacementRegistration) =>
    axios.post(`${PUB}/register`, { ...body, attribution: attributionForSubmit() }, { params: { tenant } }).then(d) as Promise<{ returning: boolean }>,
  list: (q: { stage?: string; source?: string; search?: string; page?: number; limit?: number }) =>
    axios.get(BASE, { ...h(), params: q }).then(d) as Promise<{ rows: PlacementCandidate[]; total: number; page: number; limit: number; byStage: Record<string, number> }>,
  get: (id: string) => axios.get(`${BASE}/${id}`, h()).then(d) as Promise<{ candidate: PlacementCandidate; events: PlacementEvent[] }>,
  setStage: (id: string, stage: string, note?: string) => axios.put(`${BASE}/${id}/stage`, { stage, note }, h()).then(d),
  addNote: (id: string, text: string) => axios.post(`${BASE}/${id}/notes`, { text }, h()).then(d),
};

export const errMsg = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

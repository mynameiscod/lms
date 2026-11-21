import axios from 'axios';

/* Sales Teams (server/src/routes/salesTeamRoutes.ts) — an add-on to Leads. */

const BASE = '/api/v1/sales-teams';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const get = async <T,>(url: string, params?: any): Promise<T> => (await axios.get(BASE + url, { headers: authHeader(), params })).data.data;
const send = async <T,>(method: 'post' | 'put' | 'delete', url: string, body?: any): Promise<T> =>
  (await axios.request({ method, url: BASE + url, data: body, headers: authHeader() })).data.data;

export const stErr = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;

export interface Person { _id: string; name: string; email?: string }
export interface Metrics {
  newAssigned: number; untouched: number; leadsWorked: number; calls: number; connected: number; notConnected: number;
  talkSeconds: number; whatsapp: number; notes: number; emails: number; stageMoves: number; followUpsDue: number;
  followUpsDone: number; followUpsMissed: number; overdueNow: number; demos: number; seats: number; enrollments: number;
  avgFirstCallMin: number | null;
}
export type TargetKey = 'calls' | 'connected' | 'followUpsDone' | 'demos' | 'enrollments';
export type Targets = Partial<Record<TargetKey, number>>;
export type Rating = 'good' | 'ok' | 'needs_work';
export interface Review { status: 'pending' | 'reviewed'; rating?: Rating | null; comment?: string; byName?: string; at?: string }

export interface SalesMe { isAdmin: boolean; managerOf: { _id: string; name: string; color: string }[]; memberOf: { _id: string; name: string; color: string } | null; today: string }
export interface StaffOption { _id: string; name: string; email: string; role: string; team: { teamId: string; team: string; as: 'manager' | 'member' } | null }
export interface TeamRow { _id: string; name: string; color: string; manager: Person; members: Person[]; defaultTargets: Targets | null; memberTargets: { userId: string; targets: Targets }[] }

export interface TeamDay {
  team: { _id: string; name: string; color: string; manager?: Person; defaultTargets: Targets | null };
  day: string; today: string; live: boolean; reviewOpen: boolean; totals: Metrics;
  members: { user: Person; metrics: Metrics; targets: Targets | null; hasNote: boolean; review: Review }[];
  pending: { count: number; days: string[] };
}
export interface TimelineItem { leadId: string; leadName: string; phone?: string; type: string; description: string; callOutcome?: string; callDuration?: number; at: string }
export interface MemberDay {
  user: Person; team: { _id: string; name: string; color: string; manager?: Person } | null;
  canReview: boolean; isSelf: boolean; day: string; today: string; live: boolean; reviewOpen: boolean;
  metrics: Metrics; targets: Targets | null;
  note: { done: string; blockers: string; tomorrow: string; at?: string } | null; noteEditable: boolean;
  review: Review; timeline: TimelineItem[];
  leadsWorked: { leadId: string; name: string; phone?: string; actions: number }[];
  openFollowUps: { _id: string; title: string; scheduledAt: string; status: string; lead: { _id: string; name: string; phone?: string } | null }[];
  trend: { day: string; metrics: Metrics | null }[];
}
export interface Overview {
  day: string; today: string; live: boolean;
  teams: { _id: string; name: string; color: string; manager: Person; members: { user: Person; metrics: Metrics }[]; totals: Metrics; reviewGrid: { day: string; reviewed: number; due: number }[] }[];
}
export interface HistoryRow { day: string; metrics: Metrics | null; targets: Targets | null; hasNote: boolean; review: Review }

export const salesTeamApi = {
  me: () => get<SalesMe>('/me'),
  teams: () => get<TeamRow[]>('/admin/teams'),
  staff: () => get<StaffOption[]>('/admin/staff'),
  createTeam: (b: { name: string; color?: string; managerId: string; memberIds: string[] }) => send<TeamRow[]>('post', '/admin/teams', b),
  updateTeam: (id: string, b: { name: string; color?: string; managerId: string; memberIds: string[] }) => send<TeamRow[]>('put', `/admin/teams/${id}`, b),
  removeTeam: (id: string) => send<TeamRow[]>('delete', `/admin/teams/${id}`),
  overview: (day?: string) => get<Overview>('/admin/overview', { day }),
  teamDay: (id: string, day?: string) => get<TeamDay>(`/teams/${id}/day`, { day }),
  saveTargets: (id: string, b: { defaultTargets?: Targets; memberTargets?: { userId: string; targets: Targets }[] }) => send('put', `/teams/${id}/targets`, b),
  memberDay: (userId: string, day?: string) => get<MemberDay>(`/members/${userId}/day`, { day }),
  review: (userId: string, b: { day: string; rating: Rating; comment?: string }) => send<Review>('post', `/members/${userId}/review`, b),
  myDay: (day?: string) => get<MemberDay>('/my/day', { day }),
  myNote: (b: { day: string; done?: string; blockers?: string; tomorrow?: string }) => send('put', '/my/note', b),
  myHistory: () => get<HistoryRow[]>('/my/history'),
};

/* ── Display helpers ── */
export const RATING_LABEL: Record<Rating, string> = { good: 'Good', ok: 'OK', needs_work: 'Needs work' };
export const TARGET_LABEL: Record<TargetKey, string> = { calls: 'Calls', connected: 'Connected calls', followUpsDone: 'Follow-ups done', demos: 'Demos', enrollments: 'Enrollments' };
export const TARGET_KEYS: TargetKey[] = ['calls', 'connected', 'followUpsDone', 'demos', 'enrollments'];
export const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${d}T12:00:00+05:30`).toLocaleDateString('en-IN', opts);
export const shiftDay = (d: string, n: number) => {
  const t = new Date(`${d}T12:00:00+05:30`).getTime() + n * 86400000;
  return new Date(t + 330 * 60000).toISOString().slice(0, 10);
};
export const talk = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m` : `${Math.round(s / 60)}m`);
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || '?';
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

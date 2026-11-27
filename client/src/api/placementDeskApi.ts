import axios from 'axios';

/** Placement Desk — daily register of companies, drives, candidates and outcomes (admin only). */
const API = axios.create({ baseURL: `${process.env.REACT_APP_API_URL || '/api/v1'}/placement-desk` });
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});
const data = <T,>(p: Promise<any>): Promise<T> => p.then(r => r.data.data).catch(e => { throw new Error(e?.response?.data?.message || e.message); });
const full = (p: Promise<any>) => p.then(r => r.data).catch(e => { throw new Error(e?.response?.data?.message || e.message); });

export type JobType = 'full_time' | 'internship' | 'internship_to_full_time' | 'contract';
export type DriveMode = 'on_campus' | 'virtual' | 'walk_in' | 'at_company';
export type DriveStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
export type CandidateStatus = 'eligible' | 'attended' | 'no_show' | 'in_process' | 'offered' | 'rejected' | 'offer_accepted' | 'offer_declined' | 'joined';

export const JOB_TYPE_LABEL: Record<JobType, string> = { full_time: 'Full-time', internship: 'Internship', internship_to_full_time: 'Internship → Full-time', contract: 'Contract' };
export const MODE_LABEL: Record<DriveMode, string> = { on_campus: 'At our institute', virtual: 'Virtual', walk_in: 'Walk-in', at_company: 'At company office' };
export const DRIVE_STATUS_LABEL: Record<DriveStatus, string> = { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Completed', cancelled: 'Cancelled' };
export const STATUS_LABEL: Record<CandidateStatus, string> = {
  eligible: 'Not marked', attended: 'Attended', no_show: 'No-show', in_process: 'In process', offered: 'Offered',
  rejected: 'Rejected', offer_accepted: 'Offer accepted', offer_declined: 'Offer declined', joined: 'Joined',
};
export const CANDIDATE_STATUSES = Object.keys(STATUS_LABEL) as CandidateStatus[];

export interface Contact { name: string; designation?: string; phone?: string; email?: string }
export interface Officer { _id: string; name: string; phone?: string; email?: string; active: boolean }
export interface Company { _id: string; name: string; website?: string; careersUrl?: string; address?: string; city?: string; industry?: string; contacts: Contact[]; notes?: string; drives?: number; lastDay?: string | null }
export interface Counts { total: number; attended: number; noShow: number; offers: number; rejected: number; pending: number; joined: number; notMarked: number }
export interface Drive {
  _id: string; companyId: string; companyName: string; day: string; role: string; openings?: number;
  jobType: JobType; mode: DriveMode; location?: string; packageMin?: number; packageMax?: number; salaryNotes?: string;
  bond: { required: boolean; months?: number; amount?: number; notes?: string }; conditions?: string;
  eligibility: { passoutYears: number[]; degrees: string[]; minPercent?: number; skills: string[]; batchIds: string[]; notes?: string };
  officerId?: string; officerName?: string; companyContact?: Contact | null; rounds: string[]; status: DriveStatus; notes?: string;
  counts?: Counts;
}
export interface Candidate {
  _id: string; driveId: string; kind: 'student' | 'external'; studentId?: string; name: string; phone?: string; email?: string;
  college?: string; degree?: string; passoutYear?: number; status: CandidateStatus; roundReached?: string; offerCtc?: number | null;
  companyFeedback?: string; internalRemarks?: string;
}
export interface Suggestion { _id: string; name: string; email: string; phone?: string; batchName: string; degree: string; passoutYear: number | null; percent: number | null; match: 'yes' | 'no' | 'unknown'; reasons: string[]; added: boolean }
export interface ExternalInput { name: string; phone?: string; email?: string; college?: string; degree?: string; passoutYear?: number | string }
export interface Report {
  from: string; to: string;
  totals: Counts & { companies: number; drives: number; cancelled: number; highestOffer: number };
  drives: { _id: string; day: string; companyName: string; role: string; packageMin: number | null; packageMax: number | null; officerName: string; status: DriveStatus; counts: Counts; bond: any;
    feedback: { name: string; kind: string; status: CandidateStatus; roundReached: string; offerCtc: number | null; companyFeedback: string; internalRemarks: string }[] }[];
  byOfficer: { officerId: string | null; name: string; drives: number; companies: number; attended: number; offers: number }[];
  byDay: { day: string; drives: number; attended: number; offers: number; rejected: number }[];
}
export interface Settings { publicEnabled: boolean; publicToken: string; publicTitle?: string }
export interface History { counts: Counts; rows: { _id: string; driveId: string; day: string; companyName: string; role: string; packageMin: number | null; packageMax: number | null; officerName: string; status: CandidateStatus; roundReached: string; offerCtc: number | null; companyFeedback: string; internalRemarks: string }[] }

export const placementDeskApi = {
  officers: () => data<Officer[]>(API.get('/officers')),
  saveOfficer: (o: Partial<Officer>) => data<Officer>(o._id ? API.patch(`/officers/${o._id}`, o) : API.post('/officers', o)),

  companies: (q?: string) => data<Company[]>(API.get('/companies', { params: q ? { q } : {} })),
  company: (id: string) => data<{ company: Company; totals: Counts; drives: Drive[] }>(API.get(`/companies/${id}`)),
  saveCompany: (c: Partial<Company>) => data<Company>(c._id ? API.patch(`/companies/${c._id}`, c) : API.post('/companies', c)),

  drives: (params: Record<string, string> = {}) => data<Drive[]>(API.get('/drives', { params })),
  drive: (id: string) => data<{ drive: Drive; company: Company | null; candidates: Candidate[] }>(API.get(`/drives/${id}`)),
  saveDrive: (d: any) => data<Drive>(d._id ? API.patch(`/drives/${d._id}`, d) : API.post('/drives', d)),
  deleteDrive: (id: string) => full(API.delete(`/drives/${id}`)),
  suggest: (id: string, batchId?: string) => data<Suggestion[]>(API.get(`/drives/${id}/suggest`, { params: batchId ? { batchId } : {} })),
  addCandidates: (id: string, body: { studentIds?: string[]; externals?: ExternalInput[] }) => full(API.post(`/drives/${id}/candidates`, body)),
  bulkStatus: (id: string, ids: string[], status: CandidateStatus) => full(API.patch(`/drives/${id}/candidates`, { ids, status })),
  updateCandidate: (cid: string, patch: Partial<Candidate>) => data<Candidate>(API.patch(`/candidates/${cid}`, patch)),
  removeCandidate: (cid: string) => full(API.delete(`/candidates/${cid}`)),

  report: (from?: string, to?: string) => data<Report>(API.get('/report', { params: { from, to } })),
  exportReport: async (from: string, to: string) => {
    const r = await API.get('/report/export', { params: { from, to }, responseType: 'blob' }).catch(e => { throw new Error(e?.response?.data?.message || e.message); });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `placement-desk-${from}-to-${to}.xlsx`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  studentHistory: (studentId: string) => data<History>(API.get(`/students/${studentId}/history`)),

  settings: () => data<Settings>(API.get('/settings')),
  saveSettings: (s: Partial<Settings> & { regenerate?: boolean }) => data<Settings>(API.patch('/settings', s)),
  publicSummary: (token: string, from?: string, to?: string) => data<any>(axios.get(`${process.env.REACT_APP_API_URL || '/api/v1'}/placement-desk/public/${token}`, { params: { from, to } })),
};

/** 'YYYY-MM-DD' in IST. */
export const istToday = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
export const fmtDay = (d?: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtPkg = (a?: number | null, b?: number | null) => (a == null && b == null ? '—' : a != null && b != null && a !== b ? `₹${a}–${b} LPA` : `₹${a ?? b} LPA`);

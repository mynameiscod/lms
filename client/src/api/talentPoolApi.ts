import axios from 'axios';

/** Talent Pool — share candidates with placement offices (admin) and the office's own portal. */
const base = process.env.REACT_APP_API_URL || '/api/v1';
const make = (path: string) => {
  const api = axios.create({ baseURL: `${base}/${path}` });
  api.interceptors.request.use(cfg => {
    const token = localStorage.getItem('token');
    const tenantId = localStorage.getItem('tenantId');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
    if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
    return cfg;
  });
  return api;
};
const ADMIN = make('talent-pool');
const PORTAL = make('talent-portal');
const data = <T,>(p: Promise<any>): Promise<T> => p.then(r => r.data.data).catch(e => { throw new Error(e?.response?.data?.message || e.message); });

/** Saves a file the server sends as an attachment. */
async function download(api: typeof ADMIN, url: string, fallbackName: string) {
  try {
    const r = await api.get(url, { responseType: 'blob' });
    const name = /filename="([^"]+)"/.exec(r.headers['content-disposition'] || '')?.[1] || fallbackName;
    const href = URL.createObjectURL(r.data);
    const a = document.createElement('a'); a.href = href; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
  } catch (e: any) {
    let msg = e.message;
    try { msg = JSON.parse(await e.response.data.text()).message || msg; } catch { /* not JSON */ }
    throw new Error(msg);
  }
}

export type TalentStatus = 'shared' | 'viewed' | 'shortlisted' | 'interview' | 'selected' | 'rejected' | 'on_hold';
export const STATUS_LABEL: Record<TalentStatus, string> = {
  shared: 'New', viewed: 'Viewed', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', rejected: 'Rejected', on_hold: 'On hold',
};
export const STATUS_ORDER: TalentStatus[] = ['shared', 'viewed', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold'];
export const PARTNER_SETTABLE: TalentStatus[] = ['shortlisted', 'interview', 'selected', 'rejected', 'on_hold'];

export interface Column { field: string; label: string }
export interface Field { key: string; label: string }
export interface Partner {
  _id: string; name: string; contactName?: string; email: string; phone?: string; city?: string; notes?: string;
  active: boolean; exportColumns: Column[]; userId?: string | null;
  total?: number; byStatus?: Partial<Record<TalentStatus, number>>;
  lastSeenAt?: string | null;
  desk?: { companies: number; openOpenings: number; submissions: number; placed: number };
  login?: { active: boolean; passwordSet: boolean } | null;
}
export interface Candidate {
  kind: 'student' | 'external'; candidateId: string; fullName: string;
  email?: string; phone?: string; gender?: string; dateOfBirth?: string; address?: string; city?: string; state?: string;
  resumeUrl?: string; linkedInUrl?: string; githubUrl?: string; portfolioUrl?: string;
  tenthSchool?: string; tenthYear?: number; tenthPercent?: number;
  twelfthCollege?: string; twelfthGroup?: string; twelfthYear?: number; twelfthPercent?: number;
  degree?: string; branch?: string; college?: string; university?: string; graduationYear?: number; graduationPercent?: number;
  skills?: string; expectedRole?: string; preferredLocation?: string;
  batchName?: string; missing?: string[]; sharedCount?: number; alreadyShared?: boolean;
}
export interface ShareRow extends Candidate {
  shareId: string; status: TalentStatus; partnerNote?: string; sharedAt: string; firstViewedAt?: string; lastViewedAt?: string;
  statusHistory?: { status: TalentStatus; byRole: string; note?: string; at: string }[];
  submissions?: CandidateSubmission[];
}

/* ── Office workspace: companies, openings, candidates sent ──────────────── */
export type CompanyStage = 'prospect' | 'contacted' | 'active' | 'on_hold' | 'closed';
export const STAGE_LABEL: Record<CompanyStage, string> = { prospect: 'Prospect', contacted: 'Contacted', active: 'Hiring', on_hold: 'On hold', closed: 'Closed' };
export const STAGE_ORDER: CompanyStage[] = ['prospect', 'contacted', 'active', 'on_hold', 'closed'];
export type SubStatus = 'sent' | 'shortlisted' | 'interview' | 'selected' | 'offered' | 'joined' | 'rejected' | 'on_hold' | 'withdrawn';
export const SUB_LABEL: Record<SubStatus, string> = {
  sent: 'Sent', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', offered: 'Offer made', joined: 'Joined', rejected: 'Rejected', on_hold: 'On hold', withdrawn: 'Withdrawn',
};
export const SUB_ORDER: SubStatus[] = ['sent', 'shortlisted', 'interview', 'selected', 'offered', 'joined', 'rejected', 'on_hold', 'withdrawn'];
export type OpeningStatus = 'open' | 'on_hold' | 'closed';
export const OPENING_LABEL: Record<OpeningStatus, string> = { open: 'Open', on_hold: 'On hold', closed: 'Closed' };

export interface FollowUp { _id: string; dueAt: string; note?: string; done: boolean; doneAt?: string; outcome?: string; createdAt: string }
export interface CompanyStats { openings: number; positions: number; totalOpenings: number; sent: number; byStatus: Partial<Record<SubStatus, number>> }
export interface Company {
  _id: string; name: string; website?: string; industry?: string; location?: string;
  contactName?: string; contactDesignation?: string; contactEmail?: string; contactPhone?: string;
  stage: CompanyStage; notes?: string; followUps: FollowUp[]; nextFollowUpAt?: string | null; updatedAt?: string;
  stats?: CompanyStats;
}
export interface Opening {
  _id: string; companyId: string; companyName?: string; title: string; jd?: string; jdUrl?: string; positions?: number | null;
  expMin?: number | null; expMax?: number | null; salaryMin?: number | null; salaryMax?: number | null; bond?: string; location?: string;
  workMode?: 'office' | 'hybrid' | 'remote' | null; qualification?: string; skills?: string; interviewProcess?: string; deadline?: string | null;
  status: OpeningStatus; sent?: number; byStatus?: Partial<Record<SubStatus, number>>; updatedAt?: string;
}
export interface Submission {
  _id: string; shareId: string; companyId: string; companyName: string; openingId: string | null; openingTitle: string | null;
  fullName: string; phone?: string; email?: string; degree?: string; branch?: string; graduationYear?: number; graduationPercent?: number;
  resumeUrl?: string; skills?: string; expectedRole?: string;
  status: SubStatus; note?: string; interviewAt?: string | null; sentAt: string; updatedAt?: string;
  statusHistory?: { status: SubStatus; note?: string; at: string }[];
}
export interface CandidateSubmission { _id: string; companyId: string; companyName: string; openingId: string | null; openingTitle: string | null; status: SubStatus; note?: string; interviewAt?: string | null; sentAt: string }
export interface FollowUpRow extends FollowUp { companyId: string; companyName: string; contactName?: string; contactPhone?: string; contactEmail?: string; stage: CompanyStage }
export interface PortalDashboard {
  candidates: Partial<Record<TalentStatus, number>>;
  submissions: Partial<Record<SubStatus, number>>;
  companies: { total: number; byStage: Partial<Record<CompanyStage, number>> };
  openings: { open: number; positions: number };
  followUpsDue: { _id: string; companyId: string; companyName: string; dueAt: string; note?: string; overdue: boolean }[];
  followUpsDueCount: number;
  upcomingInterviews?: Submission[];
  recent?: Submission[];
}
export interface Workspace {
  partner: { _id: string; name: string };
  summary: PortalDashboard;
  companies: Company[];
  openings: Opening[];
  submissions: Submission[];
}
export interface TrackerRow {
  kind: 'student' | 'external'; candidateId: string; fullName: string; phone?: string; email?: string; batchName?: string; degree?: string; graduationYear?: number;
  shares: { shareId: string; partnerId: string; partnerName: string; status: TalentStatus; sharedAt: string; lastViewedAt?: string }[];
}
export interface Meta { fields: Field[]; defaultColumns: Column[]; statuses: { key: TalentStatus; label: string }[]; batches: { _id: string; name: string }[] }
export interface InviteResult { emailSent: boolean; setupLink?: string }

export const talentPoolApi = {
  meta: () => data<Meta>(ADMIN.get('/meta')),
  partners: () => data<Partner[]>(ADMIN.get('/partners')),
  savePartner: (p: Partial<Partner>) => data<Partner>(p._id ? ADMIN.patch(`/partners/${p._id}`, p) : ADMIN.post('/partners', p)),
  createLogin: (id: string) => data<InviteResult>(ADMIN.post(`/partners/${id}/login`)),
  resendInvite: (id: string) => data<InviteResult>(ADMIN.post(`/partners/${id}/resend-invite`)),
  setActive: (id: string, active: boolean) => data<Partner>(ADMIN.patch(`/partners/${id}/active`, { active })),
  partnerShares: (id: string) => data<{ partner: Partner; rows: ShareRow[] }>(ADMIN.get(`/partners/${id}/shares`)),
  workspace: (id: string) => data<Workspace>(ADMIN.get(`/partners/${id}/workspace`)),
  exportPartner: (id: string) => download(ADMIN, `/partners/${id}/export`, 'talent_pool.xlsx'),
  candidates: (params: Record<string, any>) => data<Candidate[]>(ADMIN.get('/candidates', { params })),
  share: (partnerId: string, students: string[], externals: string[]) => data<{ added: number; alreadyShared: number }>(ADMIN.post('/shares', { partnerId, students, externals })),
  unshare: (shareId: string) => data<void>(ADMIN.delete(`/shares/${shareId}`)),
  setStatus: (shareId: string, status: TalentStatus, note?: string) => data<void>(ADMIN.patch(`/shares/${shareId}/status`, { status, note })),
  tracker: (params: Record<string, any>) => data<TrackerRow[]>(ADMIN.get('/tracker', { params })),
  external: (id: string) => data<any>(ADMIN.get(`/external/${id}`)),
  saveExternal: (id: string | null, body: Record<string, any>) => data<any>(id ? ADMIN.patch(`/external/${id}`, body) : ADMIN.post('/external', body)),
  deleteExternal: (id: string) => data<void>(ADMIN.delete(`/external/${id}`)),
  importExternal: (file: File) => { const f = new FormData(); f.append('file', file); return data<{ created: number; updated: number; skipped: number; errors: string[] }>(ADMIN.post('/external/import', f)); },
  importPlacementDesk: () => data<{ created: number; skipped: number }>(ADMIN.post('/external/import-placement-desk')),
  uploadResume: (file: File) => { const f = new FormData(); f.append('file', file); return data<{ url: string }>(ADMIN.post('/external/resume', f)); },
  template: () => download(ADMIN, '/external/template', 'talent_pool_candidates_template.xlsx'),
  setPreferences: (studentId: string, expectedRole: string, preferredLocation: string) => data<void>(ADMIN.patch(`/students/${studentId}/preferences`, { expectedRole, preferredLocation })),
};

export const talentPortalApi = {
  me: () => data<{ name: string; contactName?: string; columns: Column[]; statuses: { key: TalentStatus; label: string; settable: boolean }[]; fields: Field[] }>(PORTAL.get('/me')),
  candidates: () => data<ShareRow[]>(PORTAL.get('/candidates')),
  candidate: (shareId: string) => data<ShareRow>(PORTAL.get(`/candidates/${shareId}`)),
  setStatus: (shareId: string, status: TalentStatus, note?: string) => data<{ status: TalentStatus; partnerNote: string }>(PORTAL.patch(`/candidates/${shareId}/status`, { status, note })),
  export: () => download(PORTAL, '/export', 'talent_pool.xlsx'),
  dashboard: () => data<PortalDashboard>(PORTAL.get('/dashboard')),
  companies: () => data<Company[]>(PORTAL.get('/companies')),
  company: (id: string) => data<Company>(PORTAL.get(`/companies/${id}`)),
  saveCompany: (c: Partial<Company>) => data<Company>(c._id ? PORTAL.patch(`/companies/${c._id}`, c) : PORTAL.post('/companies', c)),
  deleteCompany: (id: string) => data<void>(PORTAL.delete(`/companies/${id}`)),
  exportCompany: (id: string) => download(PORTAL, `/companies/${id}/export`, 'candidates.xlsx'),
  addFollowUp: (id: string, dueAt: string, note: string) => data<Company>(PORTAL.post(`/companies/${id}/followups`, { dueAt, note })),
  updateFollowUp: (id: string, fid: string, body: Partial<FollowUp>) => data<Company>(PORTAL.patch(`/companies/${id}/followups/${fid}`, body)),
  deleteFollowUp: (id: string, fid: string) => data<Company>(PORTAL.delete(`/companies/${id}/followups/${fid}`)),
  followUps: (done = false) => data<FollowUpRow[]>(PORTAL.get('/followups', { params: done ? { done: 1 } : {} })),
  openings: (params: Record<string, any> = {}) => data<Opening[]>(PORTAL.get('/openings', { params })),
  saveOpening: (o: Partial<Opening>) => data<Opening>(o._id ? PORTAL.patch(`/openings/${o._id}`, o) : PORTAL.post('/openings', o)),
  deleteOpening: (id: string) => data<void>(PORTAL.delete(`/openings/${id}`)),
  submissions: (params: Record<string, any> = {}) => data<Submission[]>(PORTAL.get('/submissions', { params })),
  send: (companyId: string, openingId: string | null, shareIds: string[], note?: string) => data<{ added: number; alreadySent: number; skipped: number }>(PORTAL.post('/submissions', { companyId, openingId, shareIds, note })),
  setSubStatus: (id: string, status: SubStatus, note?: string, interviewAt?: string | null) => data<Submission>(PORTAL.patch(`/submissions/${id}/status`, { status, note, interviewAt })),
  deleteSubmission: (id: string) => data<void>(PORTAL.delete(`/submissions/${id}`)),
};

/** The fields of one candidate, grouped the way both screens show a profile. */
export const PROFILE_SECTIONS: { title: string; fields: [keyof Candidate, string][] }[] = [
  { title: 'Contact', fields: [['phone', 'Contact number'], ['email', 'Email'], ['gender', 'Gender'], ['dateOfBirth', 'Date of birth'], ['address', 'Address'], ['city', 'City'], ['state', 'State']] },
  { title: '10th', fields: [['tenthSchool', 'School'], ['tenthYear', 'Passed out'], ['tenthPercent', 'Percentage']] },
  { title: '12th / Intermediate', fields: [['twelfthCollege', 'College'], ['twelfthGroup', 'Group'], ['twelfthYear', 'Passed out'], ['twelfthPercent', 'Percentage']] },
  { title: 'Graduation', fields: [['degree', 'Degree'], ['branch', 'Branch'], ['college', 'College'], ['university', 'University'], ['graduationYear', 'Passed out'], ['graduationPercent', 'Percentage']] },
  { title: 'Career', fields: [['expectedRole', 'Expected role'], ['preferredLocation', 'Preferred location'], ['skills', 'Skills']] },
];

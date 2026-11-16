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
};

/** The fields of one candidate, grouped the way both screens show a profile. */
export const PROFILE_SECTIONS: { title: string; fields: [keyof Candidate, string][] }[] = [
  { title: 'Contact', fields: [['phone', 'Contact number'], ['email', 'Email'], ['gender', 'Gender'], ['dateOfBirth', 'Date of birth'], ['address', 'Address'], ['city', 'City'], ['state', 'State']] },
  { title: '10th', fields: [['tenthSchool', 'School'], ['tenthYear', 'Passed out'], ['tenthPercent', 'Percentage']] },
  { title: '12th / Intermediate', fields: [['twelfthCollege', 'College'], ['twelfthGroup', 'Group'], ['twelfthYear', 'Passed out'], ['twelfthPercent', 'Percentage']] },
  { title: 'Graduation', fields: [['degree', 'Degree'], ['branch', 'Branch'], ['college', 'College'], ['university', 'University'], ['graduationYear', 'Passed out'], ['graduationPercent', 'Percentage']] },
  { title: 'Career', fields: [['expectedRole', 'Expected role'], ['preferredLocation', 'Preferred location'], ['skills', 'Skills']] },
];

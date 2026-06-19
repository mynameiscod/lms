import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export type PartnerTier = 'tier1' | 'tier2' | 'tier3';
export type PartnerPriority = 'high' | 'medium' | 'low';
export type FresherFit = 'high' | 'medium' | 'low';
export type PartnerStage = 'target' | 'contacted' | 'replied' | 'interested' | 'interviewing' | 'placed' | 'not_a_fit';

export interface PartnerStageMeta { id: PartnerStage; name: string; color: string; }

export interface PlacementPartner {
  _id: string;
  companyName: string;
  website?: string;
  location?: string;
  tier: PartnerTier;
  priority: PartnerPriority;
  fresherFit: FresherFit;
  outreachAngle?: string;
  notes?: string;
  source: 'csv' | 'manual';
  contactName?: string;
  contactEmail?: string;
  contactTitle?: string;
  contactPhone?: string;
  contactLinkedin?: string;
  stage: PartnerStage;
  outreach?: {
    status: 'not_started' | 'in_sequence' | 'stopped' | 'replied' | 'bounced';
    emailsSent: number;
    lastEmailAt?: string;
    repliedAt?: string;
  };
  candidates?: { studentId: string; studentName: string; addedAt?: string }[];
  interviews?: { scheduledAt: string; mode: string; candidateNames: string[]; notes?: string; createdAt?: string }[];
  placement?: { studentId?: string; studentName?: string; ctc?: number; placedAt?: string; guaranteeEndsAt?: string };
  updatedAt?: string;
}

export interface PartnerAnalytics {
  funnel: { total: number; contacted: number; replied: number; interviewing: number; placed: number };
  responseRate: number;
  byTier: { tier: string; total: number; contacted: number; replied: number; placed: number; responseRate: number }[];
  placements: number;
  sumCtc: number;
  feePct: number;
  estRevenue: number;
}

export interface MatchedStudent {
  studentId: string;
  name: string;
  email: string;
  experienceLevel: string;
  skills: string[];
  matchedSkills: string[];
  score: number;
}

export type OutreachType = 'cold' | 'followup' | 'vouch' | 'candidate_profile';
export type MessageStatus = 'queued' | 'pending_approval' | 'sending' | 'sent' | 'failed' | 'cancelled';
export interface OutreachMessage {
  _id: string;
  partnerId: string;
  companyName: string;
  type: OutreachType;
  status: MessageStatus;
  requiresApproval: boolean;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  scheduledFor?: string;
  sentAt?: string;
  failedReason?: string;
  createdAt: string;
}

export interface ImportResult { created: number; updated: number; skipped: number; total: number; errors: { row: number; reason: string }[]; }

export const placementPartnerApi = {
  getStages: () => API.get<{ data: PartnerStageMeta[] }>('/placement-partners/stages'),
  list: (params?: { tier?: string; priority?: string; stage?: string; search?: string }) =>
    API.get<{ data: PlacementPartner[] }>('/placement-partners', { params }),
  get: (id: string) => API.get<{ data: PlacementPartner }>(`/placement-partners/${id}`),
  create: (data: Partial<PlacementPartner>) => API.post('/placement-partners', data),
  update: (id: string, data: Partial<PlacementPartner>) => API.patch(`/placement-partners/${id}`, data),
  moveStage: (id: string, stage: PartnerStage) => API.patch(`/placement-partners/${id}/stage`, { stage }),
  remove: (id: string) => API.delete(`/placement-partners/${id}`),

  // ── Outreach (Step 2) ──
  startOutreach: (id: string) => API.post(`/placement-partners/${id}/start-outreach`),
  startOutreachBulk: (ids: string[]) => API.post('/placement-partners/start-outreach', { ids }),
  markReplied: (id: string, note?: string) => API.post(`/placement-partners/${id}/mark-replied`, { note }),
  markBounced: (id: string, note?: string) => API.post(`/placement-partners/${id}/mark-bounced`, { note }),
  draftVouch: (id: string) => API.post(`/placement-partners/${id}/draft-vouch`),
  getMessages: (id: string) => API.get<{ data: OutreachMessage[] }>(`/placement-partners/${id}/messages`),
  getQueue: (status = 'pending_approval') => API.get<{ data: OutreachMessage[] }>('/placement-partners/outreach/queue', { params: { status } }),
  updateMessage: (mid: string, data: { subject?: string; body?: string }) => API.patch(`/placement-partners/outreach/messages/${mid}`, data),
  approveMessage: (mid: string, data?: { subject?: string; body?: string }) => API.post(`/placement-partners/outreach/messages/${mid}/approve`, data || {}),
  cancelMessage: (mid: string) => API.post(`/placement-partners/outreach/messages/${mid}/cancel`),

  // ── Matching (Step 3) ──
  matchStudents: (id: string) => API.get<{ data: MatchedStudent[] }>(`/placement-partners/${id}/match-students`),
  addCandidate: (id: string, studentId: string) => API.post(`/placement-partners/${id}/candidates`, { studentId }),
  removeCandidate: (id: string, studentId: string) => API.delete(`/placement-partners/${id}/candidates/${studentId}`),

  // ── Candidate profiles + interviews (Step 4) ──
  draftCandidateProfiles: (id: string) => API.post(`/placement-partners/${id}/draft-candidate-profiles`),
  candidatePdf: (id: string, studentId: string) => API.get(`/placement-partners/${id}/candidate-pdf/${studentId}`, { responseType: 'blob' }),
  scheduleInterview: (id: string, data: { scheduledAt: string; mode?: string; candidateNames?: string[]; notes?: string; notifyCompany?: boolean }) =>
    API.post(`/placement-partners/${id}/schedule-interview`, data),

  // ── Placement + analytics (Step 5) ──
  markPlaced: (id: string, data: { studentId?: string; studentName?: string; ctc?: number }) =>
    API.post(`/placement-partners/${id}/mark-placed`, data),
  analytics: () => API.get<{ data: PartnerAnalytics }>('/placement-partners/analytics'),

  import: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post<{ message: string; data: ImportResult }>('/placement-partners/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

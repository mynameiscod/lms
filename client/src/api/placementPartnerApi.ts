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

export interface PartnerTaskRow {
  id: string; partnerId: string; company: string; stage?: PartnerStage; tier?: PartnerTier;
  kind: 'reply' | 'interested' | 'checkin' | 'guarantee' | 'manual'; kindLabel: string; content: string;
  dueAt?: string; open: boolean; overdue: boolean; today: boolean;
}

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
  attachments?: AttachmentRef[];
  createdAt: string;
}

export interface ImportResult { created: number; updated: number; skipped: number; total: number; errors: { row: number; reason: string }[]; }

// A single item in a partner conversation — an email we sent, or a reply we received.
export interface ThreadItem {
  dir: 'out' | 'in';
  id: string;
  subject: string;
  body: string;
  at: string;
  // outbound
  type?: OutreachType;
  status?: MessageStatus;
  toEmail?: string;
  failedReason?: string;
  // inbound
  fromEmail?: string;
  fromName?: string;
  read?: boolean;
  matchedBy?: 'address' | 'thread';
}
export interface PartnerThread { items: ThreadItem[]; unread: number; }

export interface AttachmentRef { filename: string; path: string; size: number; contentType?: string; url?: string; }

// Apollo "Add by Company" enrichment
export interface EnrichedContact {
  name: string;
  title?: string;
  seniority?: string;
  email?: string;
  emailStatus?: string;
  linkedinUrl?: string;
  confidence: 'high' | 'medium' | 'low';
}
export interface CompanyInfo {
  name?: string;
  industry?: string;
  employees?: number;
  linkedinUrl?: string;
  logoUrl?: string;
  jobOpenings?: number;
}
export interface HiringLinks {
  linkedinJobs: string;
  googleJobs: string;
}
export interface EnrichResult {
  configured: boolean;
  company: string;
  domain?: string;
  contacts: EnrichedContact[];
  companyInfo?: CompanyInfo;
  hiringLinks?: HiringLinks;
  note?: string;
}

export const placementPartnerApi = {
  getStages: () => API.get<{ data: PartnerStageMeta[] }>('/placement-partners/stages'),
  list: (params?: { tier?: string; priority?: string; stage?: string; search?: string }) =>
    API.get<{ data: PlacementPartner[] }>('/placement-partners', { params }),
  get: (id: string) => API.get<{ data: PlacementPartner }>(`/placement-partners/${id}`),
  create: (data: Partial<PlacementPartner>) => API.post('/placement-partners', data),
  enrich: (company: string, domain?: string) => API.post<{ data: EnrichResult }>('/placement-partners/enrich', { company, domain }),
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
  getThread: (id: string) => API.get<{ data: PartnerThread }>(`/placement-partners/${id}/thread`),
  reply: (id: string, data: { subject: string; body: string; inboundId?: string; attachments?: AttachmentRef[] }) => API.post(`/placement-partners/${id}/reply`, data),
  uploadAttachment: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post<{ data: AttachmentRef }>('/placement-partners/attachments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  markInboundRead: (mid: string) => API.patch(`/placement-partners/inbound/${mid}/read`),
  testImap: () => API.post<{ success: boolean; message: string }>('/placement-partners/imap-test'),
  getQueue: (status = 'pending_approval') => API.get<{ data: OutreachMessage[] }>('/placement-partners/outreach/queue', { params: { status } }),
  updateMessage: (mid: string, data: { subject?: string; body?: string; attachments?: AttachmentRef[] }) => API.patch(`/placement-partners/outreach/messages/${mid}`, data),
  approveMessage: (mid: string, data?: { subject?: string; body?: string; attachments?: AttachmentRef[] }) => API.post(`/placement-partners/outreach/messages/${mid}/approve`, data || {}),
  cancelMessage: (mid: string) => API.post(`/placement-partners/outreach/messages/${mid}/cancel`),

  // ── Reminders / tasks ──
  listTasks: (filter = 'open') => API.get<{ data: { tasks: PartnerTaskRow[]; summary: { open: number; overdue: number; today: number } } }>('/placement-partners/tasks', { params: { filter } }),
  completeTask: (tid: string) => API.patch(`/placement-partners/tasks/${tid}/complete`),
  snoozeTask: (tid: string, days: number) => API.patch(`/placement-partners/tasks/${tid}/snooze`, { days }),
  addTask: (id: string, content: string, dueAt?: string) => API.post(`/placement-partners/${id}/tasks`, { content, dueAt }),

  import: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post<{ message: string; data: ImportResult }>('/placement-partners/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

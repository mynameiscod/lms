import axios from 'axios';

/** Help & Support (server: routes/supportRoutes.ts). Identity always comes from the login token. */
const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/support';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In progress', waiting_on_user: 'Waiting on you', resolved: 'Resolved', closed: 'Closed',
};
/** Staff read "waiting on user"; the member reads "waiting on you". */
export const STAFF_STATUS_LABEL: Record<TicketStatus, string> = { ...STATUS_LABEL, waiting_on_user: 'Waiting on member' };
export const PRIORITY_LABEL: Record<TicketPriority, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };

export const MODULES: { key: string; label: string }[] = [
  { key: 'account', label: 'Account & login' }, { key: 'payment', label: 'Payment & membership' },
  { key: 'assessment', label: 'Assessment' }, { key: 'plan', label: 'My plan (days)' }, { key: 'roadmap', label: 'Roadmap' },
  { key: 'practice', label: 'Practice' }, { key: 'coding', label: 'Coding sets' }, { key: 'playground', label: 'Playground' },
  { key: 'thinking_lab', label: 'Thinking Lab' }, { key: 'communication', label: 'Communication Lab' },
  { key: 'interview', label: 'Mock interview' }, { key: 'mentor', label: 'AI Mentor' }, { key: 'opportunities', label: 'Opportunities' },
  { key: 'news', label: 'Tech News' }, { key: 'resume', label: 'Resume' }, { key: 'progress', label: 'My progress' },
  { key: 'career_tracks', label: 'Career tracks' }, { key: 'other', label: 'Something else' },
];
export const CATEGORIES: { key: string; label: string }[] = [
  { key: 'technical', label: 'Something is not working' }, { key: 'content', label: 'A lesson or question is wrong' },
  { key: 'account', label: 'My account' }, { key: 'payment', label: 'Payment' }, { key: 'assessment', label: 'Scores and results' },
  { key: 'feedback', label: 'Suggestion' }, { key: 'other', label: 'Other' },
];
export const moduleLabel = (k?: string) => MODULES.find(m => m.key === k)?.label || 'Other';
export const categoryLabel = (k?: string) => CATEGORIES.find(c => c.key === k)?.label || 'Other';

export interface SlaClock { targetMinutes: number; dueAt: string; met: boolean | null; elapsedPct: number }

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description?: string;
  module: string;
  category: string;
  source: 'help_center' | 'ai_chat' | 'staff';
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  firstResponseAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  reopenCount: number;
  context?: { route?: string; requestId?: string; userAgent?: string };
  diagnosticsConsent: boolean;
  canReopen: boolean;
  canReply: boolean;
  sla: { firstResponse: SlaClock | null; resolution: SlaClock | null } | null;
  // Staff only
  tenant?: { id: string; name?: string };
  requester?: { id: string; name: string | null; email?: string; role?: string };
  assignee?: { id: string; name: string | null } | null;
  escalated?: boolean;
  diagnostics?: { summary?: string; capturedAt?: string };
  chatSessionId?: string | null;
}

export interface SupportAttachmentMeta { id: string; name: string; mime: string; size: number }
export interface SupportMessage {
  id: string;
  authorKind: 'requester' | 'staff' | 'system';
  author: string;
  visibility: 'public' | 'internal';
  body: string;
  attachments: SupportAttachmentMeta[];
  createdAt: string;
}
export interface TimelineEntry { action: string; at: string; by: string; changes?: Record<string, { from?: unknown; to?: unknown }> }
export interface TicketDetail { ticket: SupportTicket; messages: SupportMessage[]; timeline: TimelineEntry[] }
export interface Paged<T> { tickets: T[]; total: number; page: number; limit: number }

export interface SupportMe {
  userId: string;
  kind: 'requester' | 'coordinator' | 'agent' | 'manager' | 'super_admin';
  allTenants: boolean;
  faculty: boolean;
  can: { viewCollege: boolean; readInternal: boolean; work: boolean; manage: boolean };
}

export interface NewTicket {
  subject: string;
  description: string;
  module: string;
  category: string;
  route?: string;
  relatedRequestId?: string;
  diagnosticsConsent?: boolean;
  diagnostics?: string;
  chatSessionId?: string;
}

/** The server's own message for a failed call, or a plain fallback. Never a stack or a raw error. */
export const errorText = (e: any, fallback = 'Something went wrong. Please try again.') => {
  const m = e?.response?.data?.message;
  const ref = e?.response?.data?.requestId;
  return (typeof m === 'string' && m && m !== 'Internal server error' ? m : fallback) + (ref && e?.response?.status >= 500 ? ` (reference ${ref})` : '');
};

const qs = (q: Record<string, unknown>) => {
  const p = new URLSearchParams();
  Object.entries(q).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export interface FaqHit { id: string; question: string; category: string; module: string; snippet: string }
export interface FaqArticle { id: string; question: string; answer: string; category: string; module: string; updatedAt: string; myVote: boolean | null; related: FaqHit[] }
export interface AdminFaq {
  id: string; question: string; answer: string; category: string; module: string; audiences: string[]; keywords: string[];
  status: 'draft' | 'published' | 'archived'; needsOwnerReview: boolean; platformWide: boolean; tenantId: string | null;
  views: number; helpfulYes: number; helpfulNo: number; publishedAt?: string | null; updatedAt: string;
}
export interface FaqInsights { days: number; unanswered: { query: string; count: number; people: number; last: string }[]; lowRated: AdminFaq[] }

export interface ChatSource { id: string; title: string }
export interface ChatReply {
  sessionId: string; content: string; steps: string[]; sources: ChatSource[]; fallback: boolean; clarifying: boolean;
  handoff: boolean; offerTicket: boolean; general: true; turnIndex: number;
  draft?: { subject: string; module: string; category: string; summary: string };
}
export interface ChatTurn { index: number; role: 'user' | 'assistant'; content: string; steps: string[]; sources: ChatSource[]; fallback: boolean; helpful: boolean | null; at: string }

export const supportApi = {
  me: async (): Promise<SupportMe> => (await axios.get(`${BASE}/me`, { headers: authHeader() })).data.data,
  create: async (body: NewTicket): Promise<{ ticket: SupportTicket; duplicate: boolean }> => {
    const { data } = await axios.post(`${BASE}/tickets`, body, { headers: authHeader() });
    return { ticket: data.data, duplicate: !!data.duplicate };
  },
  mine: async (q: { status?: string; page?: number; limit?: number } = {}): Promise<Paged<SupportTicket>> =>
    (await axios.get(`${BASE}/tickets/mine${qs(q)}`, { headers: authHeader() })).data.data,
  detail: async (id: string): Promise<TicketDetail> => (await axios.get(`${BASE}/tickets/${id}`, { headers: authHeader() })).data.data,
  reply: async (id: string, body: { body: string; internal?: boolean; requestInfo?: boolean; resolve?: boolean }, files: File[] = []) => {
    if (!files.length) return (await axios.post(`${BASE}/tickets/${id}/messages`, body, { headers: authHeader() })).data.data;
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => { if (v !== undefined) fd.append(k, String(v)); });
    files.forEach(f => fd.append('files', f));
    return (await axios.post(`${BASE}/tickets/${id}/messages`, fd, { headers: authHeader() })).data.data;
  },
  reopen: async (id: string, reason?: string) => (await axios.post(`${BASE}/tickets/${id}/reopen`, { reason }, { headers: authHeader() })).data.data,
  /** Attachments need the login header, so they are fetched as a blob rather than linked. */
  attachment: async (ticketId: string, attachmentId: string): Promise<Blob> =>
    (await axios.get(`${BASE}/tickets/${ticketId}/attachments/${attachmentId}`, { headers: authHeader(), responseType: 'blob' })).data,
  // Help Center
  suggest: async (q: string): Promise<FaqHit[]> => (await axios.get(`${BASE}/faqs/suggest${qs({ q })}`, { headers: authHeader() })).data.data,
  search: async (q: string, opts: { category?: string; module?: string } = {}): Promise<FaqHit[]> =>
    (await axios.get(`${BASE}/faqs/search${qs({ q, ...opts })}`, { headers: authHeader() })).data.data,
  categories: async (): Promise<{ category: string; count: number }[]> => (await axios.get(`${BASE}/faqs/categories`, { headers: authHeader() })).data.data,
  faqs: async (q: { category?: string; module?: string; page?: number }): Promise<{ articles: FaqHit[]; total: number; page: number; limit: number }> =>
    (await axios.get(`${BASE}/faqs${qs(q)}`, { headers: authHeader() })).data.data,
  faq: async (id: string): Promise<FaqArticle> => (await axios.get(`${BASE}/faqs/${id}`, { headers: authHeader() })).data.data,
  vote: async (id: string, helpful: boolean) => (await axios.post(`${BASE}/faqs/${id}/vote`, { helpful }, { headers: authHeader() })).data.data,
  // Assistant
  chatSuggestions: async (): Promise<string[]> => (await axios.get(`${BASE}/chat/suggestions`, { headers: authHeader() })).data.data,
  chatAsk: async (message: string, sessionId?: string): Promise<ChatReply> => (await axios.post(`${BASE}/chat`, { message, sessionId }, { headers: authHeader() })).data.data,
  chatSession: async (id: string): Promise<{ sessionId: string; status: string; ticketId: string | null; turns: ChatTurn[] }> =>
    (await axios.get(`${BASE}/chat/${id}`, { headers: authHeader() })).data.data,
  chatFeedback: async (id: string, turnIndex: number, helpful: boolean) => (await axios.post(`${BASE}/chat/${id}/feedback`, { turnIndex, helpful }, { headers: authHeader() })).data.data,
  chatClose: async (id: string) => (await axios.post(`${BASE}/chat/${id}/close`, {}, { headers: authHeader() })).data.data,
  // Managing articles
  adminFaqs: async (q: Record<string, unknown>): Promise<{ articles: AdminFaq[]; total: number; page: number; limit: number }> =>
    (await axios.get(`${BASE}/admin/faqs${qs(q)}`, { headers: authHeader() })).data.data,
  adminCreateFaq: async (body: Partial<AdminFaq>): Promise<AdminFaq> => (await axios.post(`${BASE}/admin/faqs`, body, { headers: authHeader() })).data.data,
  adminUpdateFaq: async (id: string, body: Partial<AdminFaq>): Promise<AdminFaq> => (await axios.patch(`${BASE}/admin/faqs/${id}`, body, { headers: authHeader() })).data.data,
  adminFaqStatus: async (id: string, status: AdminFaq['status'], reviewed?: boolean): Promise<AdminFaq> =>
    (await axios.post(`${BASE}/admin/faqs/${id}/status`, { status, reviewed }, { headers: authHeader() })).data.data,
  adminFaqInsights: async (days = 30): Promise<FaqInsights> => (await axios.get(`${BASE}/admin/faqs/insights${qs({ days })}`, { headers: authHeader() })).data.data,
  // Staff
  queue: async (q: Record<string, unknown>): Promise<Paged<SupportTicket>> => (await axios.get(`${BASE}/queue${qs(q)}`, { headers: authHeader() })).data.data,
  update: async (id: string, body: { status?: string; priority?: string; assigneeId?: string | null; escalated?: boolean }) =>
    (await axios.patch(`${BASE}/tickets/${id}`, body, { headers: authHeader() })).data.data,
  bulk: async (ids: string[], update: Record<string, unknown>): Promise<{ results: { id: string; ok: boolean; error?: string }[]; updated: number }> =>
    (await axios.post(`${BASE}/tickets/bulk`, { ids, update }, { headers: authHeader() })).data.data,
  agents: async (): Promise<{ id: string; name: string }[]> => (await axios.get(`${BASE}/agents`, { headers: authHeader() })).data.data,
};

export default supportApi;

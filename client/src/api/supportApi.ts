import axios from 'axios';
import type { TicketStatus, TicketPriority } from './supportLabels';

/** Help & Support (server: routes/supportRoutes.ts). Identity always comes from the login token. */
const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/support';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export * from './supportLabels';

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
  /** Something from support the member has not opened yet. */
  unread?: boolean;
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
export interface ErrorRef { id: string; title: string; kind: string; count: number; lastSeen: string; status: string }
export interface TicketDetail { ticket: SupportTicket; messages: SupportMessage[]; timeline: TimelineEntry[]; errors?: { linked: ErrorRef[]; possiblyRelated: ErrorRef[] } }
export interface ErrorGroup {
  id: string; kind: string; severity: string; configuredSeverity: string; severityOverride: string | null; title: string; message: string; route?: string; module: string;
  topFrames: string[]; count: number; firstSeen: string; lastSeen: string; firstRelease?: string; lastRelease?: string; status: 'open' | 'resolved' | 'ignored';
  collegeCount: number; linkedTickets: number;
}
export interface ErrorGroupDetail extends ErrorGroup { sampleRequestIds: string[]; tickets: { id: string; ticketNumber: string; subject: string; status: TicketStatus; createdAt: string }[] }
export interface MonitorCounters { since: string; hours: number; counters: { key: string; total: number; byHour: { hour: string; count: number }[] }[] }
export interface Paged<T> { tickets: T[]; total: number; page: number; limit: number }

export interface SupportMe {
  userId: string;
  canMonitor: boolean;
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

export interface SupportSummary {
  range: { from: string; to: string };
  current: { open: number; unassigned: number; highCritical: number; waitingOnUser: number; escalated: number };
  period: { created: number; fromAssistant: number; reopened: number; resolved: number; avgFirstResponseMinutes: number | null; avgResolutionMinutes: number | null };
  sla: { configured: false } | { configured: true; firstResponsePct: number | null; resolutionPct: number | null };
  assistant: { sessions: number; resolved: number; escalated: number; failedSessions: number; resolutionRate: number | null; escalationRate: number | null; answers: number; fallbackAnswers: number; thumbsUp: number; thumbsDown: number };
}
export interface SupportTrends { series: { day: string; created: number; resolved: number }[]; releases: { version: string; day: string }[] }
export interface KeyCount { key: string; count: number }
export interface SupportBreakdown {
  byModule: KeyCount[]; byCategory: KeyCount[]; bySource: KeyCount[]; byStatus: KeyCount[];
  byCollege: { id: string; name: string; total: number }[];
  heatmap: { colleges: { id: string; name: string }[]; modules: string[]; cells: { tenantId: string; module: string; count: number }[] };
  unresolvedByModule: KeyCount[];
  repeatedIssues: { module: string; category: string; tickets: number; people: number; last: string }[];
  unansweredSearches: { query: string; count: number; people: number }[];
}
export interface SupportIncidents {
  configured: boolean;
  rules?: { minTickets: number; minDistinctUsers: number; windowMinutes: number };
  possible: { module: string; tickets: number; people: number; colleges: number; first: string; label: string }[];
  confirmed: { id: string; module: string; title: string; status: string; ticketCount: number; peopleCount: number; confirmedAt: string; notifiedCount: number }[];
}
type ByPriority = { low?: number | null; medium?: number | null; high?: number | null; critical?: number | null };
export interface SupportConfig {
  scope: 'institute' | 'platform';
  firstResponseMinutes: ByPriority; resolutionMinutes: ByPriority;
  reopen: { allowed?: boolean | null; windowDays?: number | null; maxReopens?: number | null };
  incident: { minTickets?: number | null; minDistinctUsers?: number | null; windowMinutes?: number | null };
  retention: { chatDays?: number | null; attachmentDays?: number | null };
}

export const supportApi = {
  me: async (): Promise<SupportMe> => (await axios.get(`${BASE}/me`, { headers: authHeader() })).data.data,
  create: async (body: NewTicket): Promise<{ ticket: SupportTicket; duplicate: boolean }> => {
    const { data } = await axios.post(`${BASE}/tickets`, body, { headers: authHeader() });
    return { ticket: data.data, duplicate: !!data.duplicate };
  },
  unread: async (): Promise<number> => (await axios.get(`${BASE}/tickets/unread`, { headers: authHeader() })).data.data.unread,
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
  // Dashboard
  summary: async (q: Record<string, unknown>): Promise<SupportSummary> => (await axios.get(`${BASE}/analytics/summary${qs(q)}`, { headers: authHeader() })).data.data,
  trends: async (q: Record<string, unknown>): Promise<SupportTrends> => (await axios.get(`${BASE}/analytics/trends${qs(q)}`, { headers: authHeader() })).data.data,
  breakdown: async (q: Record<string, unknown>): Promise<SupportBreakdown> => (await axios.get(`${BASE}/analytics/breakdown${qs(q)}`, { headers: authHeader() })).data.data,
  incidents: async (q: Record<string, unknown> = {}): Promise<SupportIncidents> => (await axios.get(`${BASE}/incidents${qs(q)}`, { headers: authHeader() })).data.data,
  confirmIncident: async (body: { module: string; title?: string; tenantId?: string; notify?: boolean }) => (await axios.post(`${BASE}/incidents`, body, { headers: authHeader() })).data.data,
  resolveIncident: async (id: string) => (await axios.post(`${BASE}/incidents/${id}/resolve`, {}, { headers: authHeader() })).data.data,
  getConfig: async (scope?: 'platform'): Promise<SupportConfig> => (await axios.get(`${BASE}/admin/config${qs({ scope })}`, { headers: authHeader() })).data.data,
  saveConfig: async (body: Partial<SupportConfig>): Promise<SupportConfig> => (await axios.put(`${BASE}/admin/config`, body, { headers: authHeader() })).data.data,
  // Technical monitoring
  errors: async (q: Record<string, unknown>): Promise<{ groups: ErrorGroup[]; total: number; page: number; limit: number; sentry: boolean }> =>
    (await axios.get(`${BASE}/admin/errors${qs(q)}`, { headers: authHeader() })).data.data,
  error: async (id: string): Promise<ErrorGroupDetail> => (await axios.get(`${BASE}/admin/errors/${id}`, { headers: authHeader() })).data.data,
  updateError: async (id: string, body: { status?: string; severityOverride?: string | null }): Promise<ErrorGroup> =>
    (await axios.patch(`${BASE}/admin/errors/${id}`, body, { headers: authHeader() })).data.data,
  monitorCounters: async (range: '24h' | '7d'): Promise<MonitorCounters> => (await axios.get(`${BASE}/admin/errors/counters${qs({ range })}`, { headers: authHeader() })).data.data,
  // Staff
  queue: async (q: Record<string, unknown>): Promise<Paged<SupportTicket>> => (await axios.get(`${BASE}/queue${qs(q)}`, { headers: authHeader() })).data.data,
  update: async (id: string, body: { status?: string; priority?: string; assigneeId?: string | null; escalated?: boolean }) =>
    (await axios.patch(`${BASE}/tickets/${id}`, body, { headers: authHeader() })).data.data,
  bulk: async (ids: string[], update: Record<string, unknown>): Promise<{ results: { id: string; ok: boolean; error?: string }[]; updated: number }> =>
    (await axios.post(`${BASE}/tickets/bulk`, { ids, update }, { headers: authHeader() })).data.data,
  agents: async (): Promise<{ id: string; name: string }[]> => (await axios.get(`${BASE}/agents`, { headers: authHeader() })).data.data,
};

export default supportApi;

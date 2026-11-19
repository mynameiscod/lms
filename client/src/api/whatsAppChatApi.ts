import axios from 'axios';

const BASE = '/api/v1/whatsapp-chat';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data?.data;

export interface ChatMessage {
  _id: string;
  direction: 'in' | 'out';
  kind: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'button' | 'contacts' | 'unsupported' | 'note';
  body: string;
  templateName?: string;
  hasMedia: boolean;
  mediaMime?: string;
  mediaName?: string;
  status: 'received' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
  source: 'chat' | 'broadcast' | 'system' | 'bot' | 'test' | 'person' | 'automation';
  createdAt: string;
  sentBy?: string;
}

export interface ChatThread {
  phone: string;
  messages: ChatMessage[];
  hasMore: boolean;
  window: { open: boolean; closesAt: string | null };
  botPaused: boolean;
  unreadCount: number;
  contactName?: string;
  lastStaffReply: { at: string; by?: string } | null;
  assignedTo: { _id: string; name: string } | null;
  /** 'lead' = the owner is the lead's counsellor in CRM (one owner for lead and chat). */
  ownerFrom?: 'lead' | 'chat' | null;
  links: ThreadLinks & { placementName?: string; leadName?: string; userName?: string };
}

export interface ThreadLinks { placementId?: string; leadId?: string; userId?: string }

export type InboxFilter = 'all' | 'needs_reply' | 'automation' | 'unread' | 'mine' | 'unassigned' | 'placement' | 'lead' | 'student';
export type InboxStatus = 'needs_reply' | 'automation' | 'waiting_lead' | 'idle';

export interface InboxQuery {
  filter?: InboxFilter; q?: string; page?: number;
  owner?: string; stageId?: string; source?: string; type?: '' | 'lead' | 'placement' | 'student'; window?: '' | 'open' | 'closing' | 'closed';
}

export interface InboxRow {
  phone: string;
  name: string;
  contactName?: string;
  links: ThreadLinks;
  lastPreview: string;
  lastMessageAt?: string;
  lastInboundAt?: string;
  unreadCount: number;
  assignedTo: { _id: string; name: string } | null;
  ownerFrom: 'lead' | 'chat' | null;
  status: InboxStatus;
  waitingSince?: string;
  lead: { stage: { name: string; color: string } | null; source: string; priority: string } | null;
}

export interface InboxOptions {
  staff: { _id: string; name: string }[];
  stages: { _id: string; name: string; color: string }[];
  sources: string[];
}

export interface ThreadContext {
  owner: { _id: string; name: string; from: 'lead' | 'chat' | null } | null;
  lead: {
    _id: string; name: string; email: string; source: string;
    stage: { name: string; color: string } | null; subStage: string; priority: string; score: number | null;
    courses: string[]; nextFollowUp: string | null; lastContactedAt: string | null; lastCallOutcome: string; createdAt: string;
    savedOnLead: { label: string; value: string }[];
  } | null;
  placement: { _id: string; name: string } | null;
  student: { _id: string; name: string } | null;
  automation: {
    workflows: { name: string; workflowId: string; status: string; waitingFor: string | null; note: string; at: string }[];
    bot: { step: string; asked: number; total: number; paused: boolean; live: boolean } | null;
  };
  answers: { question: string; answer: string; from: string; at?: string }[];
}

export interface InboxPage {
  rows: InboxRow[];
  total: number;
  page: number;
  limit: number;
  counts: { all: number; needs_reply: number; automation: number; unread: number; mine: number; unassigned: number };
}

export interface QuickReply { _id: string; title: string; body: string }

export interface ChatTemplate {
  _id: string; name: string; category: string; body: string; bodyExamples: string[];
  shape: { bodyVarCount: number; urlButtonIndex: number };
}

export const chatErr = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

/** Can this user use the chat at all? Mirrors the server's two gates. */
export const canChat = (user?: { role?: string; permissions?: string[] } | null) => {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  const p = user.permissions || [];
  return p.includes('chat_whatsapp')
    && ['manage_placement_program', 'manage_placement', 'manage_tenant', 'manage_leads', 'view_leads'].some((k) => p.includes(k));
};

export const whatsAppChatApi = {
  thread: (phone: string, before?: string) =>
    axios.get(`${BASE}/threads/${encodeURIComponent(phone)}`, { ...h(), params: { before } }).then(d) as Promise<ChatThread>,
  sendText: (phone: string, text: string) => axios.post(`${BASE}/threads/${encodeURIComponent(phone)}/messages`, { text }, h()),
  sendTemplate: (phone: string, templateId: string, values: string[], buttonParam?: string) =>
    axios.post(`${BASE}/threads/${encodeURIComponent(phone)}/messages`, { templateId, values, buttonParam }, h()),
  markRead: (phone: string) => axios.post(`${BASE}/threads/${encodeURIComponent(phone)}/read`, {}, h()),
  setBot: (phone: string, paused: boolean) => axios.put(`${BASE}/threads/${encodeURIComponent(phone)}/bot`, { paused }, h()).then(d),
  templates: () => axios.get(`${BASE}/templates`, h()).then(d) as Promise<ChatTemplate[]>,
  unread: (phones: string[]) =>
    axios.get(`${BASE}/unread`, { ...h(), params: { phones: phones.join(',') } }).then(d) as Promise<Record<string, number>>,
  inbox: (q: InboxQuery) => {
    const params = Object.fromEntries(Object.entries(q).filter(([, v]) => v !== '' && v !== undefined && v !== null));
    return axios.get(`${BASE}/inbox`, { ...h(), params }).then(d) as Promise<InboxPage>;
  },
  inboxOptions: () => axios.get(`${BASE}/inbox/options`, h()).then(d) as Promise<InboxOptions>,
  context: (phone: string) => axios.get(`${BASE}/threads/${encodeURIComponent(phone)}/context`, h()).then(d) as Promise<ThreadContext>,
  markHandled: (phone: string) => axios.post(`${BASE}/threads/${encodeURIComponent(phone)}/handled`, {}, h()),
  staff: () => axios.get(`${BASE}/staff`, h()).then(d) as Promise<{ staff: { _id: string; name: string }[]; canReassign: boolean; me: string }>,
  assign: (phone: string, userId: string | null) => axios.put(`${BASE}/threads/${encodeURIComponent(phone)}/assign`, { userId }, h()).then(d),
  quickReplies: () => axios.get(`${BASE}/quick-replies`, h()).then(d) as Promise<{ replies: QuickReply[]; canEdit: boolean }>,
  saveQuickReply: (r: { _id?: string; title: string; body: string }) => (r._id
    ? axios.put(`${BASE}/quick-replies/${r._id}`, r, h())
    : axios.post(`${BASE}/quick-replies`, r, h())).then(d) as Promise<QuickReply>,
  deleteQuickReply: (id: string) => axios.delete(`${BASE}/quick-replies/${id}`, h()),
  sendFile: (phone: string, file: File, caption?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (caption) form.append('caption', caption);
    return axios.post(`${BASE}/threads/${encodeURIComponent(phone)}/media`, form, h());
  },
  /** A photo/PDF/voice note as an object URL (the media route needs auth headers, so no plain <img src>). */
  mediaUrl: async (messageId: string) => {
    const r = await axios.get(`${BASE}/media/${messageId}`, { ...h(), responseType: 'blob' });
    return URL.createObjectURL(r.data);
  },
};

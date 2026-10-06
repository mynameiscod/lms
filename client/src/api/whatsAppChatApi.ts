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
  kind: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'button' | 'contacts' | 'unsupported';
  body: string;
  templateName?: string;
  hasMedia: boolean;
  mediaMime?: string;
  mediaName?: string;
  status: 'received' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';
  error?: string;
  source: 'chat' | 'broadcast' | 'system' | 'bot' | 'test' | 'person';
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
}

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
  /** A photo/PDF/voice note as an object URL (the media route needs auth headers, so no plain <img src>). */
  mediaUrl: async (messageId: string) => {
    const r = await axios.get(`${BASE}/media/${messageId}`, { ...h(), responseType: 'blob' });
    return URL.createObjectURL(r.data);
  },
};

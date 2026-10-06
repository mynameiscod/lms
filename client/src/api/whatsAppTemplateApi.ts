import axios from 'axios';

const BASE = '/api/v1/whatsapp-templates';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });

export type WaCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
export type WaButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'OTP' | 'COPY_CODE';

export interface WaButton { type: WaButtonType; text: string; url?: string; urlExample?: string; phoneNumber?: string }

export interface WaTemplate {
  _id: string;
  name: string;
  language: string;
  category: WaCategory;
  status: string;
  metaId?: string;
  rejectedReason?: string;
  qualityScore?: string;
  header: { format: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'; text?: string; imageUrl?: string };
  body: string;
  bodyExamples: string[];
  footer?: string;
  buttons: WaButton[];
  auth?: { securityRecommendation: boolean; codeExpiryMinutes?: number };
  source: 'lms' | 'meta';
  updatedAt: string;
  shape: { bodyVarCount: number; urlButtonIndex: number; headerFormat: string; headerHasVars: boolean };
  usedBy: string[];
}

export interface WaTemplateInput {
  name: string;
  language: string;
  category: WaCategory;
  header?: { format: 'NONE' | 'TEXT' | 'IMAGE'; text?: string; imageUrl?: string };
  body?: string;
  bodyExamples?: string[];
  footer?: string;
  buttons?: WaButton[];
  auth?: { securityRecommendation?: boolean; codeExpiryMinutes?: number };
}

export interface WaPurpose {
  key: string; label: string; module: string; settingsKey: string;
  variables: string[]; buttonParam?: string; headerImage?: boolean; requiredCategory?: string; help: string;
  assigned: { name: string; language: string; source: string } | null;
}

export interface WaCompat { ok: boolean; errors: string[]; warnings: string[] }

export interface WaBroadcast {
  _id: string; templateName: string; audience: string; total: number; sent: number; failed: number;
  status: 'running' | 'done' | 'failed'; failures: { phone: string; error: string }[]; createdAt: string; finishedAt?: string;
}

/** CRM leads to broadcast to. An empty list means "any". */
export interface WaLeadFilter { stageIds: string[]; sources: string[]; passoutYears: string[]; skipAlreadySent: boolean }
export interface WaLeadFilterOptions {
  stages: { _id: string; name: string; count: number }[];
  sources: { source: string; count: number }[];
}
export interface WaLeadAudience { total: number; alreadySent: number; years: Record<string, number>; sample: string[] }

/** One template send and what Meta later reported about it. */
export interface WaMessage {
  _id: string; to: string; templateName: string; source: 'test' | 'broadcast' | 'system';
  status: 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';
  errorCode?: number; errorTitle?: string; errorDetail?: string; reason?: string;
  statusAt?: string; createdAt: string;
}

const d = (r: any) => r.data.data;

export const waTemplateApi = {
  connection: () => axios.get(`${BASE}/connection`, h()).then(d) as Promise<{ wabaId: string; source: string }>,
  saveConnection: (wabaId: string) => axios.put(`${BASE}/connection`, { wabaId }, h()),
  testConnection: () => axios.post(`${BASE}/connection/test`, {}, h()).then(d) as Promise<{ ok: boolean; wabaId: string; name: string }>,
  list: () => axios.get(`${BASE}`, h()).then(d) as Promise<WaTemplate[]>,
  sync: () => axios.post(`${BASE}/sync`, {}, h()).then(d) as Promise<{ total: number; created: number; updated: number; markedDeleted: number }>,
  create: (input: WaTemplateInput) => axios.post(`${BASE}`, input, h()).then(d) as Promise<WaTemplate>,
  update: (id: string, input: WaTemplateInput) => axios.put(`${BASE}/${id}`, input, h()).then(d) as Promise<WaTemplate>,
  remove: (id: string) => axios.delete(`${BASE}/${id}`, h()),
  usage: () => axios.get(`${BASE}/usage`, h()).then(d) as Promise<WaPurpose[]>,
  compatibility: () => axios.get(`${BASE}/usage/compatibility`, h()).then(d) as Promise<Record<string, Record<string, WaCompat>>>,
  assign: (purpose: string, templateId: string | null) => axios.put(`${BASE}/usage/${purpose}`, { templateId }, h()).then(d) as Promise<{ ok: boolean; warnings: string[] }>,
  sendTest: (id: string, phone: string, values: string[], buttonParam?: string) => axios.post(`${BASE}/${id}/test`, { phone, values, buttonParam }, h()),
  broadcast: (id: string, body: { phones?: string; batchId?: string; leads?: WaLeadFilter; values: string[]; buttonParam?: string }) =>
    axios.post(`${BASE}/${id}/broadcast`, body, h()).then(d) as Promise<WaBroadcast>,
  broadcasts: () => axios.get(`${BASE}/broadcasts`, h()).then(d) as Promise<WaBroadcast[]>,
  batches: () => axios.get(`${BASE}/batches`, h()).then(d) as Promise<{ _id: string; name: string }[]>,
  leadFilters: () => axios.get(`${BASE}/lead-filters`, h()).then(d) as Promise<WaLeadFilterOptions>,
  leadAudience: (id: string, f: WaLeadFilter) => axios.post(`${BASE}/${id}/lead-audience`, f, h()).then(d) as Promise<WaLeadAudience>,
  messages: (q: { phone?: string; templateId?: string; limit?: number } = {}) =>
    axios.get(`${BASE}/messages`, { ...h(), params: q }).then(d) as Promise<WaMessage[]>,
};

export const errMsg = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

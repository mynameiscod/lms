import axios from 'axios';

const BASE = '/api/v1/event-apis';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data?.data;

export type EvFieldType = 'text' | 'textarea' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url';

export interface EvLibraryField { key: string; label: string; type: EvFieldType; options?: string[]; placeholder?: string; helpText?: string }
export interface EvCollection {
  _id: string; name: string; description?: string; fields: EvLibraryField[];
  eventCount?: number; submissionCount?: number; updatedAt: string;
}
export interface EvPick { key: string; required: boolean; label?: string; hidden?: boolean }
export type EvState = 'open' | 'closed' | 'not_yet_open' | 'paused';
export interface EvEvent {
  _id: string; collectionId: string; collectionName?: string; eventName: string; apiName: string; description?: string;
  opensAt?: string | null; closesAt: string; status: 'live' | 'paused'; state: EvState;
  fields: EvPick[]; onePerPhone: boolean; successMessage?: string; submissionCount: number; lastSubmissionAt?: string | null;
  createdAt: string;
}
export interface EvSubmissionRow {
  _id: string; eventApiId: string; eventName: string; apiName: string; data: Record<string, any>;
  contact: { name?: string; phone?: string; email?: string }; meta?: { utm?: Record<string, string> }; createdAt: string;
}
export interface EvSubmissions {
  columns: { key: string; label: string; type: EvFieldType }[];
  rows: EvSubmissionRow[]; total: number; page: number; pages: number; limit: number;
}
export interface EvQuery { collectionId?: string; eventApiId?: string; q?: string; from?: string; to?: string; page?: number }

export const evError = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const eventApisApi = {
  meta: () => axios.get(`${BASE}/meta`, h()).then(d) as Promise<{ fieldTypes: EvFieldType[]; tenantSlug: string; tenantName: string }>,
  collections: () => axios.get(`${BASE}/collections`, h()).then(d) as Promise<EvCollection[]>,
  createCollection: (body: { name: string; description?: string; fields?: EvLibraryField[] }) =>
    axios.post(`${BASE}/collections`, body, h()).then(d) as Promise<EvCollection>,
  updateCollection: (id: string, body: Partial<{ name: string; description: string; fields: EvLibraryField[] }>) =>
    axios.put(`${BASE}/collections/${id}`, body, h()).then(d) as Promise<EvCollection>,
  events: (collectionId?: string) => axios.get(`${BASE}/events`, { ...h(), params: { collectionId } }).then(d) as Promise<EvEvent[]>,
  event: (id: string) => axios.get(`${BASE}/events/${id}`, h()).then(d) as Promise<{ event: EvEvent; collection: EvCollection }>,
  createEvent: (body: any) => axios.post(`${BASE}/events`, body, h()).then(d) as Promise<EvEvent>,
  updateEvent: (id: string, body: any) => axios.put(`${BASE}/events/${id}`, body, h()).then(d) as Promise<EvEvent>,
  setStatus: (id: string, status: 'live' | 'paused') => axios.post(`${BASE}/events/${id}/status`, { status }, h()).then(d) as Promise<EvEvent>,
  submissions: (q: EvQuery) => axios.get(`${BASE}/submissions`, { ...h(), params: q }).then(d) as Promise<EvSubmissions>,
  deleteSubmission: (id: string) => axios.delete(`${BASE}/submissions/${id}`, h()).then(d),
  exportCsv: async (q: EvQuery) => {
    const r = await axios.get(`${BASE}/submissions/export`, { ...h(), params: q, responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  },
};

/** The public address the website calls for an event. */
export const publicBase = () => `${window.location.origin}/api/v1/public/events`;

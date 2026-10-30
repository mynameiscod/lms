import axios from 'axios';

const BASE = '/api/v1/content-library';
const h = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) } };
};
const d = (r: any) => r.data.data;

export type LibKind = 'mcq_single' | 'mcq_multiple' | 'short_answer' | 'coding' | 'interview_qa' | 'snippet';
export const KIND_LABEL: Record<LibKind, string> = {
  mcq_single: 'MCQ (one answer)', mcq_multiple: 'MCQ (many answers)', short_answer: 'Short answer',
  coding: 'Coding', interview_qa: 'Interview Q&A', snippet: 'Snippet',
};

export interface LibItem {
  _id: string; scope: 'global' | 'tenant'; kind: LibKind; title: string; body: string;
  options: { text: string; isCorrect: boolean }[]; answer: string; explanation: string;
  difficulty: 'easy' | 'medium' | 'hard'; subject: string; topic: string; tags: string[]; companies: string[];
  audiences: string[]; marks: number; status: 'draft' | 'published' | 'archived';
  myCopyId?: string | null; canEdit?: boolean; updatedAt: string;
}
export type LibItemInput = Partial<Omit<LibItem, '_id' | 'scope' | 'updatedAt'>> & { scope?: 'global' | 'tenant' };
export interface Facet { value: string; count: number }
export interface SearchResult {
  items: LibItem[]; total: number; page: number; pages: number;
  facets: { kind: Facet[]; difficulty: Facet[]; subject: Facet[]; topic: Facet[]; source: Facet[] };
}
export interface Bundle {
  _id: string; scope: 'global' | 'tenant'; name: string; description: string; tags: string[];
  itemCount?: number; status: string; myCopyId?: string | null; canEdit?: boolean; updatedAt: string;
  items?: Pick<LibItem, '_id' | 'title' | 'kind' | 'difficulty' | 'subject' | 'topic' | 'scope' | 'status'>[];
}

export const libError = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const libraryApi = {
  meta: () => axios.get(`${BASE}/meta`, h()).then(d) as Promise<{ canEditGlobal: boolean; counts: { mine: number; shared: number; bundles: number } }>,
  search: (params: Record<string, any>) => axios.get(`${BASE}/items`, { ...h(), params }).then(d) as Promise<SearchResult>,
  create: (body: LibItemInput & { allowDuplicate?: boolean }) => axios.post(`${BASE}/items`, body, h()).then(d) as Promise<LibItem>,
  update: (id: string, body: LibItemInput) => axios.put(`${BASE}/items/${id}`, body, h()).then(d) as Promise<LibItem>,
  archive: (id: string, restore = false) => axios.delete(`${BASE}/items/${id}`, { ...h(), params: restore ? { restore: 1 } : {} }).then(d),
  clone: (ids: string[]) => axios.post(`${BASE}/items/clone`, { ids }, h()).then(d) as Promise<{ copied: number; map: Record<string, string> }>,
  importItems: (items: any[], dryRun: boolean, scope?: 'global') =>
    axios.post(`${BASE}/items/import`, { items, dryRun, scope }, h()).then(d) as Promise<{ imported: number; duplicates: number; total: number; errorCount: number; errors: { row: number; message: string }[] }>,
  sync: (scope?: 'global') => axios.post(`${BASE}/sync`, { scope }, h()).then(d) as Promise<{ report: Record<string, { found: number; added: number }> }>,
  bundles: () => axios.get(`${BASE}/bundles`, h()).then(d) as Promise<Bundle[]>,
  bundle: (id: string) => axios.get(`${BASE}/bundles/${id}`, h()).then(d) as Promise<Bundle>,
  createBundle: (body: { name: string; description?: string; itemIds?: string[]; scope?: 'global' }) => axios.post(`${BASE}/bundles`, body, h()).then(d) as Promise<Bundle>,
  updateBundle: (id: string, body: any) => axios.put(`${BASE}/bundles/${id}`, body, h()).then(d),
  deleteBundle: (id: string) => axios.delete(`${BASE}/bundles/${id}`, h()).then(d),
  cloneBundle: (id: string) => axios.post(`${BASE}/bundles/${id}/clone`, {}, h()).then(d) as Promise<{ id: string; items?: number; alreadyCloned?: boolean }>,
};

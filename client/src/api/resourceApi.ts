import axios from 'axios';

const BASE = '/api/v1/resources';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export type ResourceType = 'project' | 'document' | 'template' | 'dataset';
export type ResourceVisibility = 'public' | 'portal' | 'approval';
export type ResourceStatus = 'draft' | 'published' | 'archived';
export type AccessStatus = 'open' | 'requestable' | 'requested' | 'approved' | 'rejected';

export interface ResourceFile { fileId: string; fileName: string; sizeBytes: number; version: number; storageKey?: string; }
export interface Resource {
  _id: string;
  title: string; description?: string;
  resourceType: ResourceType;
  tags: string[]; techStack: string[]; difficulty?: string; targetRole?: string;
  files: ResourceFile[];
  visibility: ResourceVisibility; status: ResourceStatus;
  batchIds?: string[];
  downloadCount: number; createdAt: string;
  access?: AccessStatus;         // student view
  pendingRequests?: number;      // admin view
}

export interface ResourceRequestRow {
  _id: string; resourceId: any; studentId: any; studentName?: string;
  student?: { name: string; email: string; phone: string; batch: string };
  status: string; note?: string; reviewNote?: string; createdAt: string; reviewedAt?: string;
}

export interface AuditEvent { _id: string; action: string; actorName?: string; actorRole?: string; meta?: any; ip?: string; at: string; }

// Trigger a gated, authenticated download → save as file.
async function saveDownload(resourceId: string, fileId: string, fileName: string) {
  const res = await fetch(`${BASE}/${resourceId}/download/${fileId}`, { headers: authHeader() as any });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Download failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

export const resourceApi = {
  // Student
  list: async (): Promise<{ resources: Resource[]; activeProjectId: string | null }> => {
    const { data } = await axios.get(BASE, { headers: authHeader() });
    return { resources: data.resources || [], activeProjectId: data.activeProjectId || null };
  },
  requestAccess: async (id: string, note?: string) => (await axios.post(`${BASE}/${id}/request`, { note }, { headers: authHeader() })).data.request,
  download: saveDownload,

  // Admin
  listAdmin: async (): Promise<Resource[]> => (await axios.get(`${BASE}/admin`, { headers: authHeader() })).data.resources || [],
  create: async (form: FormData): Promise<Resource> => (await axios.post(`${BASE}/admin`, form, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } })).data.resource,
  update: async (id: string, patch: any): Promise<Resource> => (await axios.patch(`${BASE}/admin/${id}`, patch, { headers: authHeader() })).data.resource,
  addFiles: async (id: string, form: FormData): Promise<Resource> => (await axios.post(`${BASE}/admin/${id}/files`, form, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' } })).data.resource,
  remove: async (id: string) => { await axios.delete(`${BASE}/admin/${id}`, { headers: authHeader() }); },
  listRequests: async (status?: string): Promise<ResourceRequestRow[]> => (await axios.get(`${BASE}/admin/requests${status ? `?status=${status}` : ''}`, { headers: authHeader() })).data.requests || [],
  reviewRequest: async (id: string, status: string, reviewNote?: string) => (await axios.patch(`${BASE}/admin/requests/${id}`, { status, reviewNote }, { headers: authHeader() })).data.request,
  audit: async (id: string): Promise<AuditEvent[]> => (await axios.get(`${BASE}/admin/${id}/audit`, { headers: authHeader() })).data.events || [],
};

export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${(b / 1e3).toFixed(0)} KB` : `${b} B`);
export const VISIBILITY_LABEL: Record<ResourceVisibility, string> = { public: 'Public', portal: 'All students', approval: 'Approval required' };
export const RESOURCE_TYPES: ResourceType[] = ['project', 'document', 'template', 'dataset'];

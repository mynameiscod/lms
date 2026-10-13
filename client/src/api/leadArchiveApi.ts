import axios from 'axios';

const BASE = '/api/v1/lead-archive';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data?.data;

export interface ArchiveFilters {
  stageIds: string[];
  sources: string[];
  priorities: string[];
  createdFrom?: string;
  createdTo?: string;
  inactiveDays?: number;
  assignment: 'any' | 'assigned' | 'unassigned';
  campaign?: string;
  duplicatesOnly: boolean;
  protectDays: number;
}
export interface ArchiveLeadRow {
  _id: string; name: string; phone: string; email?: string; source?: string; stageId?: { name: string } | null;
  assignedTo?: { firstName?: string; lastName?: string } | null; createdAt: string; archivedAt?: string; archiveReason?: string;
  telecallerMetrics?: { lastActionAt?: string };
}
export interface ArchiveRun {
  _id: string; kind: 'archive' | 'restore' | 'purge'; filters: any; reason?: string; matched: number; skippedProtected: number;
  processed: number; status: 'running' | 'done' | 'failed'; error?: string; startedByName?: string; createdAt: string; finishedAt?: string;
}

export const archiveError = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || e?.message || fallback;

export const leadArchiveApi = {
  options: () => axios.get(`${BASE}/options`, h()).then(d) as Promise<{
    stages: { _id: string; name: string; count: number }[]; sources: { source: string; count: number }[]; active: number; archived: number;
  }>,
  preview: (f: ArchiveFilters) => axios.post(`${BASE}/preview`, f, h()).then(d) as Promise<{ matched: number; willArchive: number; protected: number; sample: ArchiveLeadRow[] }>,
  run: (f: ArchiveFilters & { reason?: string }) => axios.post(`${BASE}/run`, f, h()).then(d) as Promise<ArchiveRun>,
  runs: () => axios.get(`${BASE}/runs`, h()).then(d) as Promise<ArchiveRun[]>,
  getRun: (id: string) => axios.get(`${BASE}/runs/${id}`, h()).then(d) as Promise<ArchiveRun>,
  archived: (q: { search?: string; page?: number; runId?: string }) =>
    axios.get(`${BASE}/archived`, { ...h(), params: q }).then(d) as Promise<{ rows: ArchiveLeadRow[]; total: number; page: number; pages: number }>,
  restore: (body: { leadIds?: string[]; runId?: string }) => axios.post(`${BASE}/restore`, body, h()).then(d) as Promise<{ restored: number }>,
  purgePreview: () => axios.get(`${BASE}/purge/preview`, h()).then(d) as Promise<{ count: number; cutoff: string; sample: { name: string; archivedAt: string }[] }>,
  purge: (confirm: number) => axios.post(`${BASE}/purge`, { confirm }, h()).then(d) as Promise<ArchiveRun>,
};

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
  updatedAt?: string;
}

export interface ImportResult { created: number; updated: number; skipped: number; total: number; errors: { row: number; reason: string }[]; }

export const placementPartnerApi = {
  getStages: () => API.get<{ data: PartnerStageMeta[] }>('/placement-partners/stages'),
  list: (params?: { tier?: string; priority?: string; stage?: string; search?: string }) =>
    API.get<{ data: PlacementPartner[] }>('/placement-partners', { params }),
  get: (id: string) => API.get<{ data: PlacementPartner }>(`/placement-partners/${id}`),
  create: (data: Partial<PlacementPartner>) => API.post('/placement-partners', data),
  update: (id: string, data: Partial<PlacementPartner>) => API.patch(`/placement-partners/${id}`, data),
  moveStage: (id: string, stage: PartnerStage) => API.patch(`/placement-partners/${id}/stage`, { stage }),
  remove: (id: string) => API.delete(`/placement-partners/${id}`),
  import: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return API.post<{ message: string; data: ImportResult }>('/placement-partners/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

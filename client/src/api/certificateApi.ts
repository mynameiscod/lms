import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export interface CertificateRow {
  id: string; certificateNumber: string; type: string; title: string;
  studentName: string; company?: string; role?: string; ctc?: number;
  issuedAt: string; revoked: boolean; verifyCode: string;
}

export const certificateApi = {
  list: (params?: { type?: string; search?: string }) =>
    API.get<{ success: boolean; data: CertificateRow[] }>('/certificates', { params }),
  revoke: (id: string, revoked: boolean, reason?: string) =>
    API.post(`/certificates/${id}/revoke`, { revoked, reason }),
};

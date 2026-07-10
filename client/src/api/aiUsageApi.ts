import axios from 'axios';

const API = axios.create({ baseURL: '/api/v1' });
API.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (tenantId) cfg.headers['X-Tenant-Id'] = tenantId;
  return cfg;
});

export const aiUsageApi = {
  summary: (days = 30) => API.get<{ success: boolean; data: any }>('/ai-usage/summary', { params: { days } }),
};

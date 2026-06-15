const BASE = '/api/v1/playground';

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  if (tenantId) h['X-Tenant-Id'] = tenantId;
  return h;
};

const j = async (url: string, opts: RequestInit = {}) => {
  const r = await fetch(url, { headers: authHeaders(), ...opts });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || `Request failed (${r.status})`);
  return d;
};

export const playgroundApi = {
  run: (body: { language: string; code: string; stdin?: string }) =>
    j(`${BASE}/run`, { method: 'POST', body: JSON.stringify(body) }),
  list: () => j(BASE),
  get: (id: string) => j(`${BASE}/${id}`),
  create: (body: any) => j(BASE, { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => j(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => j(`${BASE}/${id}`, { method: 'DELETE' }),
};

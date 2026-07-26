import axios from 'axios';

const API = (process.env.REACT_APP_API_URL || '/api/v1');
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface BattleDoor { code: string; label: string; type: 'public' | 'college' | 'group'; colleges?: string[]; accessCode?: string; emailDomain?: string; }
export interface BattleField { key: string; label: string; type: 'text' | 'select'; required: boolean; options?: string[]; }
export interface TechBattle {
  _id?: string; title: string; slug?: string; quizId: string; bannerUrl?: string; description?: string; prize?: string; rules?: string;
  registerOpensAt?: string; registerClosesAt?: string; startAt: string; endAt: string; joinCutoffMins?: number;
  visibility?: 'public' | 'private'; doors?: BattleDoor[]; registrationFields?: BattleField[];
  proctoring?: { camera: boolean; tabSwitch: boolean }; status?: 'draft' | 'live' | 'closed';
  registrations?: number; submissions?: number;
}

// ── Admin ──
export const battleAdminApi = {
  list: async (): Promise<TechBattle[]> => (await axios.get(`${API}/battles`, { headers: auth() })).data.battles,
  availableQuizzes: async (): Promise<any[]> => (await axios.get(`${API}/battles/available-quizzes`, { headers: auth() })).data.quizzes,
  create: async (body: Partial<TechBattle>): Promise<TechBattle> => (await axios.post(`${API}/battles`, body, { headers: auth() })).data.battle,
  get: async (id: string): Promise<{ battle: TechBattle; publicBase: string }> => (await axios.get(`${API}/battles/${id}`, { headers: auth() })).data,
  update: async (id: string, patch: Partial<TechBattle>): Promise<TechBattle> => (await axios.put(`${API}/battles/${id}`, patch, { headers: auth() })).data.battle,
  registrations: async (id: string, params: any = {}): Promise<any[]> => (await axios.get(`${API}/battles/${id}/registrations`, { headers: auth(), params })).data.registrations,
  approve: async (id: string, regId: string) => (await axios.post(`${API}/battles/${id}/registrations/${regId}/approve`, {}, { headers: auth() })).data,
  reject: async (id: string, regId: string, reason: string) => (await axios.post(`${API}/battles/${id}/registrations/${regId}/reject`, { reason }, { headers: auth() })).data,
  leaderboard: async (id: string, params: any = {}): Promise<any[]> => (await axios.get(`${API}/battles/${id}/leaderboard`, { headers: auth(), params })).data.leaderboard,
  exportUrl: (id: string) => `${API}/battles/${id}/export`,
};

// Absolute origin for viewing uploaded proof files (served at /uploads).
export const fileOrigin = () => (process.env.REACT_APP_API_URL || '/api/v1').replace(/\/api\/v1\/?$/, '') || window.location.origin;

// ── Public (no auth) ──
export const battlePublicApi = {
  list: async (tenant: string) => (await axios.get(`${API}/public/${tenant}/battles`)).data,
  get: async (tenant: string, slug: string, door?: string) => (await axios.get(`${API}/public/${tenant}/battles/${slug}`, { params: { door } })).data,
  register: async (tenant: string, slug: string, body: any, files?: File[]) => {
    const fd = new FormData();
    Object.entries(body || {}).forEach(([k, v]) => fd.append(k, v as any));
    (files || []).forEach((f, i) => fd.append(`proof_${i}`, f));
    return (await axios.post(`${API}/public/${tenant}/battles/${slug}/register`, fd)).data;
  },
  verify: async (token: string, code: string) => (await axios.post(`${API}/public/battles/verify`, { token, code })).data,
  resend: async (token: string) => (await axios.post(`${API}/public/battles/resend`, { token })).data,
  leaderboard: async (tenant: string, slug: string, params: any = {}) => (await axios.get(`${API}/public/${tenant}/battles/${slug}/leaderboard`, { params })).data,
  // exam
  getExam: async (token: string, sessionId: string) => (await axios.get(`${API}/public/battles/exam/${token}`, { headers: { 'X-Session-Id': sessionId } })).data,
  startExam: async (token: string, sessionId: string) => (await axios.post(`${API}/public/battles/exam/${token}/start`, { sessionId })).data,
  heartbeat: async (token: string, sessionId: string) => (await axios.post(`${API}/public/battles/exam/${token}/heartbeat`, { sessionId })).data,
  submitExam: async (token: string, answers: any) => (await axios.post(`${API}/public/battles/exam/${token}/submit`, { answers })).data,
};

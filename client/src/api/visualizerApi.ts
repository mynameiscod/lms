import axios from 'axios';
import { ExecutionEvent } from '../types/executionEvents';

const BASE = '/api/v1/visualizer';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });

export type VzKind = 'problem' | 'concept';
export type VzDifficulty = 'beginner' | 'easy' | 'medium' | 'hard';
export type VzAnimation = 'array_bars' | 'array_cells' | 'none';

export interface VzBreakdown {
  plainEnglish: string; input: string; output: string;
  walkthrough: string[]; steps: string[]; edgeCases: string[];
}

export interface VzListItem {
  _id: string; kind: VzKind; title: string; slug: string; topic: string; difficulty: VzDifficulty;
  summary?: string; order: number; timeComplexity?: string; spaceComplexity?: string; conceptWidget?: string;
  published?: boolean; updatedAt?: string;
}

export interface VzItem extends VzListItem {
  language: string; statement: string; examples: { input: string; output: string; explanation?: string }[];
  constraints: string; breakdown: VzBreakdown; starterCode: string; solutionCode: string; stdin: string;
  animation: VzAnimation; complexityNote: string; body: string; published: boolean;
}

export interface VzStats { steps: number; comparisons: number; arrayWrites: number; loopIterations: number; methodCalls: number; }

export interface VzRunResult {
  ok: boolean;
  status: 'COMPLETED' | 'FAILED' | 'TRUNCATED';
  errorType?: string;
  message?: string;
  line?: number;
  events: ExecutionEvent[];
  output: string;
  details?: string;
  stats: VzStats;
  executionTimeMs: number;
}

export interface VzAccess { allowed: boolean; via: string; }

export interface VzGrant {
  _id: string; targetType: 'batch' | 'user' | 'all_lms' | 'all_careerpilot';
  targetId?: string; targetName?: string; createdAt: string;
}

export interface VzUserHit { id: string; name: string; email: string; careerPilot: boolean; lms: boolean; }

export const visualizerApi = {
  access: async (): Promise<VzAccess> => (await axios.get(`${BASE}/access`, h())).data.data,
  list: async (params: { kind?: string; topic?: string; difficulty?: string; search?: string } = {}):
    Promise<{ items: VzListItem[]; total: number; topics: { topic: string; count: number }[] }> =>
    (await axios.get(`${BASE}/items`, { ...h(), params })).data.data,
  get: async (slug: string): Promise<VzItem> => (await axios.get(`${BASE}/items/${encodeURIComponent(slug)}`, h())).data.data,
  run: async (code: string, language = 'java', stdin = ''): Promise<VzRunResult> =>
    (await axios.post(`${BASE}/run`, { code, language, stdin }, { ...h(), timeout: 120000 })).data.data,

  admin: {
    list: async (): Promise<VzListItem[]> => (await axios.get(`${BASE}/admin/items`, h())).data.data,
    get: async (id: string): Promise<VzItem> => (await axios.get(`${BASE}/admin/items/${id}`, h())).data.data,
    create: async (body: Partial<VzItem>): Promise<VzItem> => (await axios.post(`${BASE}/admin/items`, body, h())).data.data,
    update: async (id: string, body: Partial<VzItem>): Promise<VzItem> => (await axios.put(`${BASE}/admin/items/${id}`, body, h())).data.data,
    remove: async (id: string): Promise<void> => { await axios.delete(`${BASE}/admin/items/${id}`, h()); },
    seed: async (): Promise<{ created: number; total: number }> => (await axios.post(`${BASE}/admin/seed`, {}, h())).data.data,
    grants: async (): Promise<VzGrant[]> => (await axios.get(`${BASE}/admin/access`, h())).data.data,
    grant: async (targetType: VzGrant['targetType'], targetIds: string[] = []): Promise<{ created: number; requested: number }> =>
      (await axios.post(`${BASE}/admin/access`, { targetType, targetIds }, h())).data.data,
    revoke: async (id: string): Promise<void> => { await axios.delete(`${BASE}/admin/access/${id}`, h()); },
    searchUsers: async (q: string): Promise<VzUserHit[]> => (await axios.get(`${BASE}/admin/users`, { ...h(), params: { q } })).data.data,
  },
};

/** Server errors carry a message meant for the reader; fall back to something plain. */
export const vzError = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;

export default visualizerApi;

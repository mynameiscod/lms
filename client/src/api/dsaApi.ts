import axios from 'axios';

/** DSA curriculum (Code Visualizer → Learn). Server: server/src/routes/dsaCurriculumRoutes.ts */
const BASE = '/api/v1/dsa';
const h = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { headers: { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) } };
};

export type DsaDiff = 'easy' | 'medium' | 'hard';
export interface DsaCounts { easy: number; medium: number; hard: number; total: number }

export interface DsaModuleSummary {
  slug: string; order: number; title: string; summary: string; stage: string;
  prerequisites: string[]; hasLesson: boolean; visualizerCount: number; widgets: string[];
  problems: DsaCounts; solved: number;
}

export interface DsaProblemRow {
  _id: string; number?: number; slug: string; title: string; difficulty: DsaDiff;
  topics: string[]; companies: string[]; hasJava: boolean; status: 'solved' | 'attempted' | 'todo';
}

export interface DsaModuleDetail {
  slug: string; order: number; title: string; summary: string; stage: string; hasLesson: boolean;
  prerequisites: { slug: string; title: string }[];
  overview: string; objectives: string[];
  concepts: { title: string; body: string }[]; internals: { title: string; body: string }[];
  javaExamples: { title: string; explanation: string; code: string; input?: string; output?: string }[];
  complexity: { operation: string; time: string; space: string; note?: string }[];
  mistakes: string[]; edgeCases: string[];
  assignments: { title: string; brief: string }[];
  interviewQuestions: { question: string; answer: string }[];
  widgets: string[]; problemTopics: string[];
  visualizers: { _id: string; kind: string; title: string; slug: string; topic: string; difficulty: string; summary?: string; timeComplexity?: string; spaceComplexity?: string }[];
  problems: Record<DsaDiff, DsaProblemRow[]>;
  problemCounts: DsaCounts;
  practiceSets: { setId: string; title: string; status: string; difficulty?: DsaDiff; problems: number }[];
}

/**
 * Thrown when the server has no curriculum API (an older server answers unknown /api paths with the
 * web page itself). Pages then fall back to the lessons bundled with the app.
 */
export class DsaUnavailableError extends Error {
  constructor() { super('The curriculum is not on this server yet.'); }
}

/** Accept only a real API answer: { success: true, data }. Anything else means the API is not there. */
const payload = <T,>(res: { data: any }): T => {
  if (!res?.data || typeof res.data !== 'object' || res.data.success !== true || res.data.data === undefined) throw new DsaUnavailableError();
  return res.data.data as T;
};
const orUnavailable = (e: any): never => {
  if (e instanceof DsaUnavailableError) throw e;
  const status = e?.response?.status;
  // 404 with no JSON body = the route does not exist on this server; a JSON 404 is a real "module not found".
  if (status === 404 && !(e?.response?.data && typeof e.response.data === 'object' && 'success' in e.response.data)) throw new DsaUnavailableError();
  throw e;
};

export const dsaApi = {
  modules: async (): Promise<{ modules: DsaModuleSummary[]; seeded: boolean }> =>
    axios.get(`${BASE}/modules`, h()).then(r => payload<{ modules: DsaModuleSummary[]; seeded: boolean }>(r), orUnavailable),
  module: async (slug: string): Promise<DsaModuleDetail> =>
    axios.get(`${BASE}/modules/${encodeURIComponent(slug)}`, h()).then(r => payload<DsaModuleDetail>(r), orUnavailable),
  seed: async (): Promise<{ created: number; refreshed: number; total: number }> => (await axios.post(`${BASE}/admin/seed`, {}, h())).data.data,
  createPracticeSets: async (slug: string): Promise<{ sets: { difficulty: DsaDiff; setId: string; problems: number }[] }> =>
    (await axios.post(`${BASE}/admin/modules/${encodeURIComponent(slug)}/practice-sets`, {}, h())).data.data,
};

export const dsaError = (e: any, fallback = 'Something went wrong. Please try again.'): string =>
  e?.response?.data?.message || e?.message || fallback;

export default dsaApi;

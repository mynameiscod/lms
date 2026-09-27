import axios from 'axios';
import { PbDifficulty, PbJudgeResult, PbCustomResult } from './problemBankApi';

const ADMIN = '/api/v1/problem-bank';
const LEARN = '/api/v1/coding-practice';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type AudienceType = 'batch' | 'user' | 'all_lms' | 'all_careerpilot';
export interface AudienceEntry { type: AudienceType; id?: string; name: string }

export interface SetItemAdmin {
  problemId: string;
  marks?: number;
  problem: { _id: string; number: number; title: string; difficulty: PbDifficulty; topics: string[]; marks: number; status: string; scope: string; languages: { language: string }[]; testCount: number; verification: { status: string } } | null;
}

export interface ProblemSetAdmin {
  _id: string; title: string; description: string; kind: 'assignment' | 'practice';
  items: SetItemAdmin[]; audience: AudienceEntry[]; opensAt?: string; dueAt?: string; allowLate: boolean;
  status: 'draft' | 'published' | 'closed'; updatedAt: string;
  problemCount?: number; submissions?: number; learners?: number;
}

export interface SetInput {
  title: string; description: string; kind: 'assignment' | 'practice';
  items: { problemId: string; marks?: number | null }[];
  audience: { type: AudienceType; id?: string }[];
  opensAt?: string | null; dueAt?: string | null; allowLate: boolean; status: 'draft' | 'published' | 'closed';
}

export interface SetReport {
  set: { _id: string; title: string; dueAt?: string; status: string };
  problems: { _id: string; title: string; difficulty: PbDifficulty; marks: number }[];
  rows: {
    userId: string; name: string; email: string; solved: number; attempted: number; score: number; totalMarks: number; lastAt?: string;
    cells: { status: 'todo' | 'attempted' | 'solved'; score?: number; attempts?: number; late?: boolean }[];
  }[];
  summary: { learners: number; started: number; completed: number; averageScore: number; totalMarks: number };
}

export interface LearnerSetSummary {
  _id: string; title: string; description: string; kind: string; status: string; opensAt?: string; dueAt?: string; allowLate: boolean;
  problemCount: number; solved: number; score: number; totalMarks: number; counts: { easy: number; medium: number; hard: number };
}

export interface LearnerSetDetail {
  _id: string; title: string; description: string; kind: string; status: string; dueAt?: string; allowLate: boolean; isStaff: boolean;
  problems: { _id: string; order: number; title: string; difficulty: PbDifficulty; topics: string[]; marks: number; languages: string[];
    status: 'todo' | 'attempted' | 'solved'; bestScore: number; attempts: number; missing?: boolean }[];
}

export interface LearnerSubmission {
  _id: string; language: string; code: string; verdict: string; passed: number; total: number; score: number; maxScore: number;
  timeMs: number; late: boolean; createdAt: string; compileError?: string;
}

export interface LearnerProblem {
  _id: string; number: number; title: string; kind: 'code' | 'sql'; statement: string; inputFormat: string; outputFormat: string;
  constraints: string; hints: string[]; difficulty: PbDifficulty; topics: string[]; companies: string[]; marks: number;
  limits: { timeMs: number; memoryMb: number }; editorial: string;
  languages: { language: string; starterCode: string }[];
  samples: { input: string; expectedOutput: string; explanation: string }[];
  submissions: LearnerSubmission[];
  set: { _id: string; title: string; dueAt?: string; status: string; allowLate: boolean; prevId: string | null; nextId: string | null; position: number; count: number };
}

export const problemSetAdminApi = {
  list: () => axios.get(`${ADMIN}/sets`, h()).then(d) as Promise<ProblemSetAdmin[]>,
  get: (id: string) => axios.get(`${ADMIN}/sets/${id}`, h()).then(d) as Promise<ProblemSetAdmin>,
  create: (s: SetInput) => axios.post(`${ADMIN}/sets`, s, h()).then(d) as Promise<{ id: string }>,
  update: (id: string, s: SetInput) => axios.put(`${ADMIN}/sets/${id}`, s, h()).then(d) as Promise<{ id: string; status: string }>,
  remove: (id: string) => axios.delete(`${ADMIN}/sets/${id}`, h()).then(d) as Promise<{ closed?: boolean; deleted?: boolean }>,
  report: (id: string) => axios.get(`${ADMIN}/sets/${id}/report`, h()).then(d) as Promise<SetReport>,
  learnerSubmissions: (id: string, userId: string) => axios.get(`${ADMIN}/sets/${id}/learners/${userId}/submissions`, h()).then(d) as Promise<(LearnerSubmission & { problemId: string })[]>,
  batches: () => axios.get(`${ADMIN}/audience/batches`, h()).then(d) as Promise<{ _id: string; name: string }[]>,
  users: (q: string) => axios.get(`${ADMIN}/audience/users`, { ...h(), params: { q } }).then(d) as Promise<{ _id: string; name: string; email: string; role: string }[]>,
};

export const codingPracticeApi = {
  sets: () => axios.get(`${LEARN}/sets`, h()).then(d) as Promise<LearnerSetSummary[]>,
  set: (id: string) => axios.get(`${LEARN}/sets/${id}`, h()).then(d) as Promise<LearnerSetDetail>,
  problem: (setId: string, problemId: string) => axios.get(`${LEARN}/sets/${setId}/problems/${problemId}`, h()).then(d) as Promise<LearnerProblem>,
  run: (setId: string, problemId: string, body: { language: string; code: string; mode: 'samples' | 'custom'; stdin?: string }) =>
    axios.post(`${LEARN}/sets/${setId}/problems/${problemId}/run`, body, h()).then(d) as Promise<{ result?: PbJudgeResult; custom?: PbCustomResult }>,
  submit: (setId: string, problemId: string, body: { language: string; code: string }) =>
    axios.post(`${LEARN}/sets/${setId}/problems/${problemId}/submit`, body, h()).then(d) as Promise<{ result: PbJudgeResult; recorded: boolean; late?: boolean; firstAccept?: boolean; reward?: { xp: number } | null }>,
};

/* ── External API clients ─────────────────────────────────────────────────────────────────── */

export type ApiScope = 'problems:read' | 'judge:run' | 'judge:submit' | 'submissions:read';
export interface ApiClientRow {
  _id: string; name: string; description: string; keyPrefix: string; scopes: ApiScope[];
  entitlement: { mode: 'all' | 'sets' | 'filter'; setIds: string[]; difficulties: string[]; topics: string[]; includeTenantProblems: boolean };
  limits: { perMinute: number; judgePerDay: number };
  status: 'active' | 'revoked'; expiresAt?: string; lastUsedAt?: string; createdAt: string;
  usage?: { requests30: number; judge30: number; requestsToday: number; judgeToday: number };
}
export type ApiClientInput = Partial<Pick<ApiClientRow, 'name' | 'description' | 'scopes' | 'entitlement' | 'limits'>> & { expiresAt?: string | null; status?: string };

export const apiClientApi = {
  list: () => axios.get(`${ADMIN}/api-clients`, h()).then(d) as Promise<ApiClientRow[]>,
  create: (b: ApiClientInput) => axios.post(`${ADMIN}/api-clients`, b, h()).then(d) as Promise<{ client: ApiClientRow; key: string }>,
  update: (id: string, b: ApiClientInput) => axios.put(`${ADMIN}/api-clients/${id}`, b, h()).then(d) as Promise<ApiClientRow>,
  rotate: (id: string) => axios.post(`${ADMIN}/api-clients/${id}/rotate`, {}, h()).then(d) as Promise<{ client: ApiClientRow; key: string }>,
  remove: (id: string) => axios.delete(`${ADMIN}/api-clients/${id}`, h()).then(d) as Promise<{ revoked?: boolean; deleted?: boolean }>,
  preview: (id: string) => axios.get(`${ADMIN}/api-clients/${id}/preview`, h()).then(d) as Promise<{ problems: number }>,
};

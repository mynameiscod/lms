import axios from 'axios';

const BASE = '/api/v1/problem-bank';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type PbDifficulty = 'easy' | 'medium' | 'hard';
export type PbVerdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'BUSY' | 'SKIPPED' | 'OK';

export interface PbLanguageDef { key: string; label: string; monaco: string }
export interface PbTopic { key: string; label: string; group: string }
export interface PbStats {
  total: number; easy: number; medium: number; hard: number; global: number; mine: number;
  published: number; verified: number; companies: string[];
}
export interface PbMeta {
  languages: PbLanguageDef[]; topics: PbTopic[]; difficulties: PbDifficulty[];
  defaultMarks: Record<PbDifficulty, number>; canEditGlobal: boolean; stats: PbStats;
}

export interface PbLanguage { language: string; starterCode: string; headerCode: string; footerCode: string; solutionCode: string }
export interface PbTest { input: string; expectedOutput: string; isSample: boolean; weight: number; explanation: string }
export interface PbLangVerification { language: string; passed: number; total: number; verdict: string; message?: string; timeMs?: number }
export interface PbVerification { status: string; checkedAt?: string; message?: string; byLanguage: PbLangVerification[] }

export interface PbProblemInput {
  title: string;
  kind: 'code' | 'sql';
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  hints: string[];
  editorial: string;
  difficulty: PbDifficulty;
  marks: number;
  topics: string[];
  tags: string[];
  companies: string[];
  languages: PbLanguage[];
  sqlSetup: string;
  limits: { timeMs: number; memoryMb: number };
  comparisonMode: 'lenient' | 'exact' | 'case_insensitive' | 'numeric';
  tests: PbTest[];
  scope?: 'global' | 'tenant';
  status?: 'draft' | 'published' | 'archived';
}

export interface PbProblem extends PbProblemInput {
  _id: string;
  scope: 'global' | 'tenant';
  number: number;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  verification: PbVerification;
  source: string;
  version: number;
  editable: boolean;
  testCount: number;
  sampleCount: number;
  updatedAt: string;
}

export interface PbListItem {
  _id: string; scope: 'global' | 'tenant'; number: number; title: string; kind: string; difficulty: PbDifficulty;
  marks: number; topics: string[]; tags: string[]; companies: string[]; status: string; testCount: number; sampleCount: number;
  verification: { status: string; checkedAt?: string }; source: string; updatedAt: string; languages: string[]; editable: boolean;
}

export interface PbCaseResult {
  index: number; isSample: boolean; verdict: PbVerdict; passed: boolean; timeMs: number; weight: number;
  input?: string; expectedOutput?: string; output?: string; error?: string;
}
export interface PbJudgeResult {
  verdict: PbVerdict; passed: number; total: number; score: number; maxScore: number; timeMs: number;
  compileError?: string; cases: PbCaseResult[];
}
export interface PbCustomResult { verdict: PbVerdict; output: string; error: string; timeMs: number }

export interface PbImportRow { row: number; title: string; errors: string[]; warnings: string[]; publishable: boolean }
export interface PbAiDraft {
  draft: Partial<PbProblemInput>;
  report: { language: string; status: 'reference' | 'passed' | 'failed'; message?: string }[];
  warnings: string[];
  error?: string;
}

export const problemBankApi = {
  meta: () => axios.get(`${BASE}/meta`, h()).then(d) as Promise<PbMeta>,
  list: (params: Record<string, any>) => axios.get(`${BASE}/problems`, { ...h(), params }).then(d) as Promise<{ items: PbListItem[]; total: number; page: number; pages: number; limit: number }>,
  get: (id: string) => axios.get(`${BASE}/problems/${id}`, h()).then(d) as Promise<PbProblem>,
  create: (p: PbProblemInput) => axios.post(`${BASE}/problems`, p, h()).then(d) as Promise<{ id: string; warnings: string[]; publishErrors: string[] }>,
  update: (id: string, p: PbProblemInput) => axios.put(`${BASE}/problems/${id}`, p, h()).then(d) as Promise<{ id: string; version: number; verification: PbVerification; warnings: string[]; publishErrors: string[] }>,
  validate: (p: PbProblemInput) => axios.post(`${BASE}/validate`, p, h()).then(d) as Promise<{ errors: string[]; warnings: string[]; publishErrors: string[] }>,
  setStatus: (id: string, status: string) => axios.post(`${BASE}/problems/${id}/status`, { status }, h()).then(d),
  bulkStatus: (ids: string[], status: 'published' | 'draft') =>
    axios.post(`${BASE}/problems/bulk-status`, { ids, status }, h()).then(d) as Promise<{
      status: string; changed: { id: string; title: string }[]; failed: { id: string; title: string; reason: string }[];
    }>,
  remove: (id: string) => axios.delete(`${BASE}/problems/${id}`, h()).then(d) as Promise<{ archived?: boolean; deleted?: boolean }>,
  duplicate: (id: string, scope: 'tenant' | 'global' = 'tenant') => axios.post(`${BASE}/problems/${id}/duplicate`, { scope }, h()).then(d) as Promise<{ id: string }>,
  promote: (id: string) => axios.post(`${BASE}/problems/${id}/promote`, {}, h()).then(d),
  verify: (id: string) => axios.post(`${BASE}/problems/${id}/verify`, {}, h()).then(d) as Promise<PbVerification>,
  verification: (id: string) => axios.get(`${BASE}/problems/${id}/verification`, h()).then(d) as Promise<PbVerification & { testCount: number }>,
  run: (body: { draft: PbProblemInput; language: string; code: string; mode: 'samples' | 'all' }) =>
    axios.post(`${BASE}/run`, body, h()).then(d) as Promise<PbJudgeResult>,
  runCustom: (body: { draft: PbProblemInput; language: string; code: string; stdin: string }) =>
    axios.post(`${BASE}/run`, { ...body, mode: 'custom' }, h()).then(d) as Promise<PbCustomResult>,
  fillOutputs: (draft: PbProblemInput, language: string, onlyEmpty: boolean) =>
    axios.post(`${BASE}/fill-outputs`, { draft, language, onlyEmpty }, h()).then(d) as Promise<{ tests: PbTest[]; filled: number; failures: { index: number; error: string }[] }>,
  importPreview: (body: { filename?: string; data?: string; text?: string }) =>
    axios.post(`${BASE}/import/preview`, body, h()).then(d) as Promise<{ rows: PbImportRow[]; items: any[] }>,
  importCommit: (items: any[], scope: 'tenant' | 'global', verify: boolean) =>
    axios.post(`${BASE}/import/commit`, { items, scope, verify }, h()).then(d) as Promise<{ created: { row: number; id: string; title: string }[]; skipped: { row: number; title: string; reason: string }[] }>,
  templateUrl: (format: 'json' | 'csv') => `${BASE}/import/template?format=${format}`,
  downloadTemplate: async (format: 'json' | 'csv') => {
    const r = await axios.get(`${BASE}/import/template`, { ...h(), params: { format }, responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url; a.download = `problem-bank-template.${format}`; a.click();
    URL.revokeObjectURL(url);
  },
  aiGenerate: (body: { topic: string; difficulty: PbDifficulty; languages: string[]; count: number; instructions: string }) =>
    axios.post(`${BASE}/ai/generate`, body, h()).then(d) as Promise<{ jobId: string }>,
  aiJob: (jobId: string) => axios.get(`${BASE}/ai/jobs/${jobId}`, h()).then(d) as Promise<{ status: 'running' | 'done' | 'failed'; drafts?: PbAiDraft[]; error?: string; elapsedSec: number }>,
  migrationInfo: () => axios.get(`${BASE}/migration`, h()).then(d) as Promise<{ source: string; label: string; total: number; imported: number }[]>,
  migrate: (sources: string[]) => axios.post(`${BASE}/migration`, { sources }, h()).then(d) as Promise<Record<string, { created: number; skipped: number; errors: string[] }>>,
};

export const pbError = (e: any, fallback = 'Something went wrong') => {
  const data = e?.response?.data;
  return data?.message || e?.message || fallback;
};

/** A blank problem, as the studio starts one. */
export const emptyProblem = (): PbProblemInput => ({
  title: '', kind: 'code', statement: '', inputFormat: '', outputFormat: '', constraints: '', hints: [], editorial: '',
  difficulty: 'easy', marks: 10, topics: [], tags: [], companies: [],
  languages: [], sqlSetup: '', limits: { timeMs: 2000, memoryMb: 256 }, comparisonMode: 'lenient',
  tests: [{ input: '', expectedOutput: '', isSample: true, weight: 1, explanation: '' }],
});

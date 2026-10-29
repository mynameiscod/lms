import axios from 'axios';
import { PbDifficulty } from './problemBankApi';

const BASE = '/api/v1/question-pools';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export type PoolKind = 'coding' | 'mcq';

export interface PoolCounts { total: number; usable: number; easy: number; medium: number; hard: number }

export interface PoolQuestion {
  id: string; title: string; difficulty: PbDifficulty; topics: string[]; marks: number;
  /** Why it cannot be drawn into a paper; '' when it can. */
  problem: string;
}

export interface PoolSummary { id: string; name: string; description: string; kind: PoolKind; updatedAt: string; counts: PoolCounts }
export interface Pool extends PoolSummary { questions: PoolQuestion[] }

export interface BankRow extends PoolQuestion { number?: number; inPool: boolean }
export interface BankPage { items: BankRow[]; total: number; page: number; pages: number }

export interface McqImportRow {
  question: string; options: string[]; correct: string;
  difficulty?: string; marks?: number; tags?: string[]; subject?: string; topic?: string;
}

export interface ExamCheck {
  ok: boolean; totalQuestions: number; totalMarks: number; problems: string[];
  sections: { key: string; title: string; poolId: string; poolName: string; kind: string; questions: number; marks: number; problem: string }[];
}

export const questionPoolApi = {
  checkExam: (sections: unknown[]): Promise<ExamCheck> => axios.post(`${BASE}/check-exam`, { sections }, h()).then(d),
  list: (): Promise<PoolSummary[]> => axios.get(BASE, h()).then(d),
  get: (id: string): Promise<Pool> => axios.get(`${BASE}/${id}`, h()).then(d),
  create: (body: { name: string; description: string; kind: PoolKind }): Promise<Pool> => axios.post(BASE, body, h()).then(d),
  update: (id: string, body: { name?: string; description?: string }): Promise<Pool> => axios.patch(`${BASE}/${id}`, body, h()).then(d),
  remove: (id: string) => axios.delete(`${BASE}/${id}`, h()).then(d),
  bank: (id: string, params: Record<string, string | number | undefined>): Promise<BankPage> =>
    axios.get(`${BASE}/${id}/bank`, { ...h(), params }).then(d),
  add: (id: string, ids: string[]): Promise<{ added: number; refused: { id: string; title: string; reason: string }[]; pool: Pool }> =>
    axios.post(`${BASE}/${id}/questions`, { ids }, h()).then(d),
  removeQuestions: (id: string, ids: string[]): Promise<Pool> => axios.post(`${BASE}/${id}/questions/remove`, { ids }, h()).then(d),
  importMcqs: (id: string, rows: McqImportRow[]): Promise<ImportResult> =>
    axios.post(`${BASE}/${id}/import-mcq`, { rows }, h()).then(d),
  /** A CSV or Excel file, base64: MCQs into the Question Bank, coding problems into the Problem Bank (LMS only). */
  importFile: (id: string, filename: string, data: string): Promise<ImportResult> =>
    axios.post(`${BASE}/${id}/import`, { filename, data }, h()).then(d),
  downloadTemplate: async (kind: PoolKind) => {
    const r = await axios.get(`${BASE}/import-template`, { ...h(), params: { kind }, responseType: 'blob' });
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a'); a.href = url; a.download = `${kind}-pool-template.csv`; a.click(); URL.revokeObjectURL(url);
  },
};

export interface ImportResult { imported: number; refused: { row: number; reason: string }[]; pool: Pool }

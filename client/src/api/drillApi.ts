import axios from 'axios';

const BASE = '/api/v1/drills';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface DrillProblem {
  attemptId: string; concept: string; difficulty: string; language: string;
  prompt: string; starterCode: string; examples: { input: string; expectedOutput: string }[]; status: string;
}
export interface RunResult {
  results: { index: number; passed: boolean; hidden: boolean }[];
  allPassed: boolean; score?: number; hint?: string; compileError?: string; passedCount: number; total: number; alreadySolved?: boolean;
}
export interface DrillProgress { solvedTotal: number; streak: number; today: number; byConcept: Record<string, { solved: number; avg: number }>; }
export interface DrillStudentRow { studentId: string; name: string; attempts: number; solved: number; avg: number; last: string; }
export interface WeakConcept { concept: string; total: number; solved: number; rate: number; }
export interface MyAssignment { _id: string; concept: string; difficulty: string; language: string; note?: string; dueDate?: string; status: string; score?: number; }
export interface AdminAssignment extends MyAssignment { studentName: string; createdAt: string; }

export const drillApi = {
  concepts: async (): Promise<string[]> => (await axios.get(`${BASE}/concepts`, { headers: authHeader() })).data.concepts || [],
  newProblem: async (concept: string, difficulty: string, language: string, assignmentId?: string): Promise<DrillProblem> => (await axios.post(`${BASE}/new`, { concept, difficulty, language, assignmentId }, { headers: authHeader(), timeout: 120000 })).data.problem,
  myAssignments: async (): Promise<MyAssignment[]> => (await axios.get(`${BASE}/assigned`, { headers: authHeader() })).data.assignments || [],
  previewProblem: async (data: { concept: string; difficulty: string; language: string; customPrompt?: string }): Promise<DrillProblem & { testCases: { input: string; expectedOutput: string; hidden: boolean }[] }> => (await axios.post(`${BASE}/admin/preview`, data, { headers: authHeader(), timeout: 120000 })).data.problem,
  assign: async (data: { concept: string; difficulty: string; language: string; studentIds?: string[]; batchId?: string; note?: string; customPrompt?: string; dueDate?: string; problem?: any }): Promise<{ created: number }> => (await axios.post(`${BASE}/admin/assign`, data, { headers: authHeader(), timeout: 120000 })).data,
  listAssignments: async (batchId?: string): Promise<AdminAssignment[]> => (await axios.get(`${BASE}/admin/assignments${batchId ? `?batchId=${batchId}` : ''}`, { headers: authHeader() })).data.assignments || [],
  checkPlan: async (id: string, plan: string): Promise<{ ok: boolean; hint: string }> => (await axios.post(`${BASE}/${id}/plan`, { plan }, { headers: authHeader(), timeout: 60000 })).data,
  run: async (id: string, code: string): Promise<RunResult> => (await axios.post(`${BASE}/${id}/run`, { code }, { headers: authHeader(), timeout: 120000 })).data,
  myProgress: async (): Promise<DrillProgress> => (await axios.get(`${BASE}/my-progress`, { headers: authHeader() })).data,
  adminOverview: async (batchId?: string): Promise<{ students: DrillStudentRow[]; weakConcepts: WeakConcept[] }> => (await axios.get(`${BASE}/admin/overview${batchId ? `?batchId=${batchId}` : ''}`, { headers: authHeader() })).data,
};

export const LANGS = [{ v: 'javascript', l: 'JavaScript' }, { v: 'python', l: 'Python' }, { v: 'java', l: 'Java' }, { v: 'cpp', l: 'C++' }, { v: 'c', l: 'C' }];

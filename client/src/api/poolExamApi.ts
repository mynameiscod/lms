import axios from 'axios';
import { PbCustomResult, PbJudgeResult } from './problemBankApi';

const BASE = '/api/v1/pool-exams';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};
const h = () => ({ headers: authHeader() });
const d = (r: any) => r.data.data;

export interface ExamRules {
  tabSwitch: { enabled: boolean; maxWarnings: number; autoSubmit: boolean };
  blockCopyPaste: boolean;
}

export interface ExamAttemptSummary {
  id: string; attemptNumber: number; status: 'in_progress' | 'submitted' | 'graded';
  startedAt: string; submittedAt?: string | null; score?: number; maxScore?: number; percentage?: number;
}

export interface ExamOverview {
  id: string; title: string; description: string; instructions: string;
  totalMarks: number; passMark: number | null; durationMinutes: number; maxAttempts: number;
  rules: ExamRules;
  sections: { title: string; kind: 'mcq' | 'coding'; questions: number; marks: number }[];
  window: { startAt: string | null; dueAt: string | null };
  attempts: ExamAttemptSummary[];
  inProgress: string | null;
  canStart: boolean;
  blocked: '' | 'not_open' | 'closed' | 'no_attempts';
  resultsVisible: boolean;
}

export interface ExamProblem {
  title: string; kind?: 'code' | 'sql'; statement: string; inputFormat?: string; outputFormat?: string; constraints?: string;
  limits?: { timeMs: number; memoryMb: number };
  languages: { language: string; starterCode: string }[];
  samples: { input: string; expectedOutput: string; explanation?: string }[];
}

export interface ExamItem {
  key: string; sectionKey: string; sectionTitle: string; kind: 'mcq' | 'coding';
  difficulty: 'easy' | 'medium' | 'hard'; marks: number;
  answer: { selected?: number[]; language?: string; code?: string } | null;
  answeredAt: string | null;
  question?: string; options?: string[]; multiple?: boolean;
  runsLeft?: number; problem?: ExamProblem;
}

export interface ExamPaper {
  id: string; examId: string; title: string; status: 'in_progress' | 'submitted' | 'graded'; attemptNumber: number;
  startedAt: string; deadlineAt: string | null; submittedAt: string | null; submitReason?: 'student' | 'time_up' | 'tab_switch';
  serverNow: string; rules: ExamRules; tabSwitches: number; maxScore: number; items: ExamItem[];
}

export const poolExamApi = {
  overview: (assignmentId: string): Promise<ExamOverview> => axios.get(`${BASE}/${assignmentId}`, h()).then(d),
  start: (assignmentId: string): Promise<{ attemptId: string; resumed: boolean }> => axios.post(`${BASE}/${assignmentId}/start`, {}, h()).then(d),
  paper: (attemptId: string): Promise<ExamPaper> => axios.get(`${BASE}/attempts/${attemptId}`, h()).then(d),
  save: (attemptId: string, key: string, answer: { selected?: number[]; language?: string; code?: string }) =>
    axios.put(`${BASE}/attempts/${attemptId}/answers/${encodeURIComponent(key)}`, answer, h()).then(d),
  run: (attemptId: string, key: string, body: { language: string; code: string; mode?: 'samples' | 'custom'; stdin?: string }):
    Promise<{ result?: PbJudgeResult; custom?: PbCustomResult; runsLeft: number }> =>
    axios.post(`${BASE}/attempts/${attemptId}/run/${encodeURIComponent(key)}`, body, h()).then(d),
  violation: (attemptId: string, type: 'tab_switch' | 'copy' | 'paste'): Promise<{ tabSwitches: number; maxWarnings?: number; submitted: boolean }> =>
    axios.post(`${BASE}/attempts/${attemptId}/violation`, { type }, h()).then(d),
  submit: (attemptId: string): Promise<{ status: string }> => axios.post(`${BASE}/attempts/${attemptId}/submit`, {}, h()).then(d),
};

export const examError = (e: any, fallback = 'Something went wrong') => e?.response?.data?.message || fallback;

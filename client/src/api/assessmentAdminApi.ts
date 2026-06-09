import { authenticatedFetch, API_BASE_URL } from './index';

// Admin question-bank API for the skill assessment.
const BASE = `${API_BASE_URL}/assessment-items`;

export interface AdminAssessmentItem {
  _id?: string;
  type: 'mcq' | 'predict_output' | 'debug' | 'complete_code' | 'live_code' | 'sql';
  dimension: 'aptitude' | 'fundamentals' | 'dsa' | 'core_stack' | 'problem_solving' | 'system_design';
  difficulty: number;
  language?: string;
  prompt: string;
  codeSnippet?: string;
  options?: { id: string; text: string }[];
  correctOptionIds?: string[];
  expectedOutput?: string;
  buggyLineNumber?: number;
  bugExplanation?: string;
  blanks?: { id: string; acceptedAnswers: string[]; caseSensitive?: boolean }[];
  starterCode?: string;
  functionSignature?: string;
  testCases?: { input: string; expectedOutput: string; hidden: boolean; weight?: number }[];
  points?: number;
  timeLimitSeconds?: number;
  tags?: string[];
  active?: boolean;
  updatedAt?: string;
}

export const assessmentAdminApi = {
  list: async (params: { dimension?: string; type?: string; difficulty?: number; active?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') q.append(k, String(v)); });
    const res: any = await authenticatedFetch(`${BASE}${q.toString() ? `?${q}` : ''}`);
    return (res?.data || res) as AdminAssessmentItem[];
  },
  coverage: async () => {
    const res: any = await authenticatedFetch(`${BASE}/coverage`);
    return (res?.data || res) as { total: number; activeTotal: number; byCell: any[]; byDifficulty: any[] };
  },
  create: async (item: AdminAssessmentItem) => {
    const res: any = await authenticatedFetch(BASE, { method: 'POST', body: JSON.stringify(item) });
    return (res?.data || res) as AdminAssessmentItem;
  },
  update: async (id: string, item: AdminAssessmentItem) => {
    const res: any = await authenticatedFetch(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(item) });
    return (res?.data || res) as AdminAssessmentItem;
  },
  toggle: async (id: string) => {
    const res: any = await authenticatedFetch(`${BASE}/${id}/toggle`, { method: 'PATCH' });
    return (res?.data || res) as AdminAssessmentItem;
  },
  remove: async (id: string) => {
    return authenticatedFetch(`${BASE}/${id}`, { method: 'DELETE' });
  },
  generate: async (spec: { type: string; dimension: string; difficulty: number; language?: string; count: number; context?: string }) => {
    const res: any = await authenticatedFetch(`${BASE}/generate`, { method: 'POST', body: JSON.stringify(spec) });
    return (res?.data || res) as AdminAssessmentItem[];
  },
};

// ── Team candidate dashboard ────────────────────────────────────────────────
const CAND_BASE = `${API_BASE_URL}/assessment-candidates`;

export interface CandidateRow {
  id: string;
  name?: string; phone?: string; email?: string;
  segment?: string; primaryLanguage?: string; yearsExperience?: number;
  status: 'registered' | 'in_progress' | 'submitted' | 'abandoned';
  progress: number; answered: number; total: number;
  readinessScore?: number; percentile?: number;
  roadmapPlan?: string; leadId?: string | null; userId?: string | null;
  createdAt?: string; submittedAt?: string;
}

export const candidatesApi = {
  list: async (params: { status?: string; segment?: string; search?: string } = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) q.append(k, String(v)); });
    const res: any = await authenticatedFetch(`${CAND_BASE}${q.toString() ? `?${q}` : ''}`);
    return (res?.data || res) as CandidateRow[];
  },
  stats: async () => {
    const res: any = await authenticatedFetch(`${CAND_BASE}/stats`);
    return (res?.data || res) as { byStatus: Record<string, number> };
  },
  unlock: async (userId: string) => {
    const res: any = await authenticatedFetch(`${CAND_BASE}/unlock`, { method: 'POST', body: JSON.stringify({ userId }) });
    return (res?.data || res) as { unlocked: number };
  },
};

export const DIMENSIONS = [
  { value: 'aptitude', label: 'Aptitude' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'dsa', label: 'DSA' },
  { value: 'core_stack', label: 'Core Stack' },
  { value: 'problem_solving', label: 'Problem Solving' },
  { value: 'system_design', label: 'System Design' },
];

export const ITEM_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'predict_output', label: 'Predict Output' },
  { value: 'debug', label: 'Find the Bug' },
  { value: 'complete_code', label: 'Complete Code' },
  { value: 'live_code', label: 'Live Code' },
  { value: 'sql', label: 'SQL' },
];

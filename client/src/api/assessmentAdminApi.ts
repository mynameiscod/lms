import { authenticatedFetch, API_BASE_URL } from './index';

// Admin question-bank API for the skill assessment.
const BASE = `${API_BASE_URL}/assessment-items`;

export interface AdminAssessmentItem {
  _id?: string;
  type: 'mcq' | 'predict_output' | 'debug' | 'complete_code' | 'live_code' | 'sql';
  dimension: 'aptitude' | 'fundamentals' | 'dsa' | 'core_stack' | 'problem_solving';
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
};

export const DIMENSIONS = [
  { value: 'aptitude', label: 'Aptitude' },
  { value: 'fundamentals', label: 'Fundamentals' },
  { value: 'dsa', label: 'DSA' },
  { value: 'core_stack', label: 'Core Stack' },
  { value: 'problem_solving', label: 'Problem Solving' },
];

export const ITEM_TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'predict_output', label: 'Predict Output' },
  { value: 'debug', label: 'Find the Bug' },
  { value: 'complete_code', label: 'Complete Code' },
  { value: 'live_code', label: 'Live Code' },
  { value: 'sql', label: 'SQL' },
];

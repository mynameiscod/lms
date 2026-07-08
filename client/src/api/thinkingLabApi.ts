import axios from 'axios';

const BASE = '/api/v1/thinking-lab';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface TLProblem {
  id: string; title: string; category: string; difficulty: string; language: string;
  statement: string; examples: { input: string; expectedOutput: string; explanation?: string }[];
  constraints?: string; notes?: string; starterCode?: string; xp: number; estimatedMinutes?: number;
  totalHints: number; hints: string[]; expectedTimeComplexity?: string; expectedSpaceComplexity?: string;
}
export interface TLRubric {
  logicalThinking?: number; problemUnderstanding?: number; approach?: number; optimization?: number;
  edgeCases?: number; codingStyle?: number; naming?: number; communication?: number; confidence?: number; overall?: number;
  timeComplexity?: string; spaceComplexity?: string;
  strengths?: string[]; weaknesses?: string[]; improvedSolution?: string; alternativeSolution?: string;
  commonMistakes?: string[]; relatedQuestions?: string[]; summary?: string;
}
export interface TLChallenge {
  challengeId: string; date: string; seq: number; status: string; difficulty: string;
  approach: string; approachWordCount: number; editorUnlocked: boolean; minApproachWords: number;
  code: string; language: string; attempts: number; hintsUsed: number; timeSpentSec: number;
  passed: boolean; score?: number; xpEarned: number; aiFeedback?: TLRubric; problem: TLProblem | null;
}
export interface TLStats { xpTotal: number; level: number; coins: number; streak: number; longestStreak: number; solvedTotal: number; solvedToday: number; badgeCount: number; }
export interface TLBadge { key: string; name: string; icon: string; desc: string; earned: boolean; earnedAt?: string | null; }
export interface TLLeaderRow { rank: number; studentId: string; name: string; xp: number; level?: number; solved?: number; streak?: number; isMe: boolean; }
export interface TLRunResult { results: { index: number; passed: boolean; hidden: boolean }[]; allPassed: boolean; compileError?: string; passedCount: number; total: number; }
export interface TLSubmitResult extends TLRunResult { feedback: TLRubric; xpEarned: number; coinsEarned: number; newBadges: { key: string; name: string; icon: string }[]; status: string; }
export interface TLAdminProblem { id: string; title: string; category: string; difficulty: string; language: string; xp: number; active: boolean; timesAssigned: number; timesSolved: number; createdAt: string; }

const h = () => ({ headers: authHeader() });

export const thinkingLabApi = {
  getToday: async (): Promise<{ challenge: TLChallenge | null; empty?: boolean; message?: string }> => (await axios.get(`${BASE}/today`, h())).data,
  next: async (): Promise<{ challenge: TLChallenge | null; empty?: boolean }> => (await axios.post(`${BASE}/next`, {}, h())).data,
  stats: async (): Promise<TLStats> => (await axios.get(`${BASE}/stats`, h())).data,
  badges: async (): Promise<TLBadge[]> => (await axios.get(`${BASE}/badges`, h())).data.badges || [],
  leaderboard: async (scope: string): Promise<{ scope: string; leaderboard: TLLeaderRow[]; myRank: number | null }> => (await axios.get(`${BASE}/leaderboard`, { ...h(), params: { scope } })).data,
  saveApproach: async (id: string, approach: string): Promise<{ unlocked: boolean; wordCount: number; minApproachWords: number }> => (await axios.post(`${BASE}/${id}/approach`, { approach }, h())).data,
  revealHint: async (id: string): Promise<{ hint: string; hintsUsed: number; totalHints: number }> => (await axios.post(`${BASE}/${id}/hint`, {}, h())).data,
  run: async (id: string, code: string, language: string): Promise<TLRunResult> => (await axios.post(`${BASE}/${id}/run`, { code, language }, { ...h(), timeout: 120000 })).data,
  submit: async (id: string, code: string, language: string, timeSpentSec: number): Promise<TLSubmitResult> => (await axios.post(`${BASE}/${id}/submit`, { code, language, timeSpentSec }, { ...h(), timeout: 120000 })).data,

  // Admin
  meta: async (): Promise<{ categories: string[]; difficulties: string[] }> => (await axios.get(`${BASE}/admin/meta`, h())).data,
  listProblems: async (params?: { category?: string; difficulty?: string }): Promise<{ problems: TLAdminProblem[]; total: number }> => (await axios.get(`${BASE}/admin/problems`, { ...h(), params })).data,
  generate: async (data: { category: string; difficulty: string; language: string; brief?: string; count?: number }): Promise<{ created: number; problems: any[] }> => (await axios.post(`${BASE}/admin/generate`, data, { ...h(), timeout: 300000 })).data,
  toggleProblem: async (id: string, active: boolean): Promise<{ id: string; active: boolean }> => (await axios.patch(`${BASE}/admin/problems/${id}`, { active }, h())).data,
  deleteProblem: async (id: string): Promise<{ deleted: number }> => (await axios.delete(`${BASE}/admin/problems/${id}`, h())).data,
};

export const TL_LANGS = [{ v: 'javascript', l: 'JavaScript' }, { v: 'python', l: 'Python' }, { v: 'java', l: 'Java' }, { v: 'cpp', l: 'C++' }];
export const DIFF_COLORS: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', expert: '#7c3aed', interview: '#2563eb' };

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
  imageUrl?: string; videoUrl?: string; referenceVideo?: string;
}
export interface TLAnalytics {
  heatmap: { date: string; count: number }[]; solvedTotal: number; attempted: number; accuracy: number;
  avgThinking: number; avgCoding: number; avgCommunication: number; avgTimeSec: number;
  byCategory: { category: string; total: number; solved: number; rate: number; avgScore: number }[];
  strongTopics: string[]; weakTopics: string[];
}
export interface TLExplanation {
  sampleInput: string; dryRun: { step: number; action: string; state: string }[];
  finalOutput: string; timeComplexity: string; spaceComplexity: string; bestPractice: string; altLogic: string;
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
export interface TLVoiceEval { transcript: string; durationSec: number; confidence: number; communication: number; grammar: number; logic: number; flow: number; professionalism: number; technicalVocabulary: number; overall: number; summary: string; tips: string[]; }
export interface TLProfile { summary?: string; strengths: string[]; weaknesses: string[]; traits: { label: string; note?: string }[]; recommendations: string[]; basedOnCount: number; computedAt?: string; }
export interface TLRunResult { results: { index: number; passed: boolean; hidden: boolean }[]; allPassed: boolean; compileError?: string; passedCount: number; total: number; }
export interface TLSubmitResult extends TLRunResult { feedback: TLRubric; xpEarned: number; coinsEarned: number; newBadges: { key: string; name: string; icon: string }[]; status: string; }
export interface TLAdminProblem { id: string; title: string; category: string; difficulty: string; language: string; xp: number; active: boolean; timesAssigned: number; timesSolved: number; createdAt: string;
  /** Empty or absent means LMS only — the same rule the server applies. */
  audiences?: ('lms' | 'careerpilot')[]; attemptCount?: number; }

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
  voiceExplain: async (id: string, blob: Blob): Promise<{ voiceEval: TLVoiceEval; xpEarned: number; coinsEarned: number; newBadges: { key: string; name: string; icon: string }[] }> => {
    const fd = new FormData();
    fd.append('recording', blob, 'explain.webm');
    return (await axios.post(`${BASE}/${id}/voice`, fd, { headers: { ...authHeader() }, timeout: 300000 })).data;
  },
  saveJournal: async (id: string, answers: { firstThought: string; gotStuck: string; learned: string }): Promise<{ saved: boolean; xpEarned: number; coinsEarned: number }> => (await axios.post(`${BASE}/${id}/journal`, answers, h())).data,
  profile: async (refresh = false): Promise<{ profile: TLProfile | null; journalCount: number; needMore?: number }> => (await axios.get(`${BASE}/profile`, { ...h(), params: refresh ? { refresh: 1 } : {} })).data,
  analytics: async (): Promise<TLAnalytics> => (await axios.get(`${BASE}/analytics`, h())).data,
  explain: async (id: string): Promise<TLExplanation> => (await axios.post(`${BASE}/${id}/explain`, {}, { ...h(), timeout: 120000 })).data.explanation,

  // Admin
  meta: async (): Promise<{ categories: string[]; difficulties: string[] }> => (await axios.get(`${BASE}/admin/meta`, h())).data,
  listProblems: async (params?: { category?: string; difficulty?: string }): Promise<{ problems: TLAdminProblem[]; total: number }> => (await axios.get(`${BASE}/admin/problems`, { ...h(), params })).data,
  generate: async (data: { category: string; difficulty: string; language: string; brief?: string; count?: number }): Promise<{ created: number; problems: any[] }> => (await axios.post(`${BASE}/admin/generate`, data, { ...h(), timeout: 300000 })).data,
  generateBulk: async (data: { items: { category: string; difficulty: string; count: number }[]; language: string; brief?: string }): Promise<{ created: number; requested: number }> => (await axios.post(`${BASE}/admin/generate-bulk`, data, { ...h(), timeout: 600000 })).data,
  toggleProblem: async (id: string, active: boolean): Promise<{ id: string; active: boolean }> => (await axios.patch(`${BASE}/admin/problems/${id}`, { active }, h())).data,
  deleteProblem: async (id: string): Promise<{ deleted: number }> => (await axios.delete(`${BASE}/admin/problems/${id}`, h())).data,
  getProblem: async (id: string): Promise<{ problem: any }> => (await axios.get(`${BASE}/admin/problems/${id}`, h())).data,
  createProblem: async (data: any): Promise<{ id: string }> => (await axios.post(`${BASE}/admin/problems`, data, h())).data,
  updateProblem: async (id: string, data: any): Promise<{ id: string }> => (await axios.put(`${BASE}/admin/problems/${id}`, data, h())).data,
  listSchedule: async (batchId?: string): Promise<{ schedule: any[] }> => (await axios.get(`${BASE}/admin/schedule`, { ...h(), params: batchId ? { batchId } : {} })).data,
  scheduleChallenge: async (data: { batchId: string; date: string; problemId: string; startTime?: string; endTime?: string }): Promise<{ id: string }> => (await axios.post(`${BASE}/admin/schedule`, data, h())).data,
  deleteSchedule: async (id: string): Promise<{ deleted: number }> => (await axios.delete(`${BASE}/admin/schedule/${id}`, h())).data,
};

export const TL_LANGS = [{ v: 'javascript', l: 'JavaScript' }, { v: 'python', l: 'Python' }, { v: 'java', l: 'Java' }, { v: 'cpp', l: 'C++' }];
export const DIFF_COLORS: Record<string, string> = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', expert: '#7c3aed', interview: '#2563eb' };

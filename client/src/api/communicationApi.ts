import axios from 'axios';

const BASE = '/api/v1/communication';
const authHeader = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface CommChallenge {
  _id: string; title: string; description?: string; instructions?: string; suggestedPoints?: string[];
  challengeType: string; minSeconds: number; targetSeconds: number; maxSeconds: number; maxAttempts: number; recordingModes: string[];
  sequenceNumber?: number; active?: boolean;
}
export interface CommToday {
  date: string; status: string; challenge: CommChallenge | null;
  currentStreak: number; longestStreak: number; lastScore: number | null; todaysAttemptId: string | null;
  locked?: boolean; message?: string;
  window?: { date: string; startTime: string | null; endTime: string | null; status: string } | null;
}
export interface CommProfile {
  fullName?: string; currentCity?: string; nativePlace?: string; degree?: string; specialization?: string; college?: string;
  graduationYear?: string; cgpaOrPercentage?: string; primarySkills?: string[]; secondarySkills?: string[];
  trainingInstitute?: string; internshipDetails?: string; projectName?: string; projectObjective?: string;
  projectTechnologies?: string[]; projectResponsibilities?: string; strengths?: string[];
  shortTermGoal?: string; longTermGoal?: string; targetRole?: string; targetCompanies?: string[];
}
export interface CommEvaluation {
  overallScore: number; confidenceScore: number; clarityScore: number; fluencyScore: number; grammarScore: number;
  vocabularyScore: number; contentScore: number; structureScore: number; technicalScore: number;
  projectExplanationScore: number; strengthExplanationScore: number; careerGoalScore: number; greetingScore: number; closingScore: number;
  eyeContactScore: number | null; facialExpressionScore: number | null; postureScore: number | null;
  speakingSpeed: { wordsPerMinute: number; status: string; recommendedRange: string };
  fillerWords: { total: number; words: Record<string, number> };
  repeatedPhrases: string[]; strengths: string[]; areasToImprove: string[]; missingSections: string[];
  grammarCorrections: { original: string; improved: string }[]; sentenceImprovements: { original: string; improved: string }[];
  improvedIntroduction: string; dailyCoachMessage: string; nextPracticeFocus: string; readinessLevel: string;
}
export interface CommAttempt {
  _id: string; challengeTitle: string; challengeType: string; practiceDate: string; attemptNumber: number;
  recordingType: 'audio' | 'video'; recordingDuration: number; wordsPerMinute?: number; wordCount?: number;
  transcript?: string; status: string; evaluation?: CommEvaluation; createdAt: string;
}
export interface CommProgress {
  timeline: { date: string; score: number }[]; totalPracticeDays: number; currentStreak: number; longestStreak: number;
  best: number; latest: number; avg: number; improvement: number; strongestSkill: string | null; weakestSkill: string | null;
  recommendedFocus: string | null; level: string;
}

export const communicationApi = {
  today: async (date: string): Promise<CommToday> => (await axios.get(`${BASE}/today?date=${date}`, { headers: authHeader() })).data,
  getProfile: async (): Promise<{ profile: CommProfile | null; template: string }> => (await axios.get(`${BASE}/profile`, { headers: authHeader() })).data,
  updateProfile: async (body: CommProfile): Promise<{ profile: CommProfile; template: string }> => (await axios.put(`${BASE}/profile`, body, { headers: authHeader() })).data,
  submit: async (challengeId: string, practiceDate: string, recordingType: 'audio' | 'video', blob: Blob): Promise<CommAttempt> => {
    const fd = new FormData();
    fd.append('challengeId', challengeId); fd.append('practiceDate', practiceDate); fd.append('recordingType', recordingType);
    fd.append('recording', blob, `intro.${recordingType === 'audio' ? 'webm' : 'webm'}`);
    const { data } = await axios.post(`${BASE}/submit`, fd, { headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' }, timeout: 300000 });
    return data.attempt;
  },
  history: async (): Promise<CommAttempt[]> => (await axios.get(`${BASE}/history`, { headers: authHeader() })).data.attempts || [],
  progress: async (): Promise<CommProgress> => (await axios.get(`${BASE}/progress`, { headers: authHeader() })).data,
  attempt: async (id: string): Promise<CommAttempt> => (await axios.get(`${BASE}/attempts/${id}`, { headers: authHeader() })).data.attempt,
  playUrl: async (attemptId: string): Promise<string> => {
    const res = await fetch(`${BASE}/play/${attemptId}`, { headers: authHeader() as any });
    if (!res.ok) throw new Error('Could not load recording');
    return URL.createObjectURL(await res.blob());
  },
  // Admin
  listChallenges: async (): Promise<CommChallenge[]> => (await axios.get(`${BASE}/admin/challenges`, { headers: authHeader() })).data.challenges || [],
  createChallenge: async (body: any): Promise<CommChallenge> => (await axios.post(`${BASE}/admin/challenges`, body, { headers: authHeader() })).data.challenge,
  updateChallenge: async (id: string, patch: any): Promise<CommChallenge> => (await axios.patch(`${BASE}/admin/challenges/${id}`, patch, { headers: authHeader() })).data.challenge,
  deleteChallenge: async (id: string) => { await axios.delete(`${BASE}/admin/challenges/${id}`, { headers: authHeader() }); },
  reorderChallenges: async (order: string[]) => { await axios.post(`${BASE}/admin/challenges/reorder`, { order }, { headers: authHeader() }); },
  listSchedule: async (batchId?: string): Promise<{ schedule: any[] }> => (await axios.get(`${BASE}/admin/schedule${batchId ? `?batchId=${batchId}` : ''}`, { headers: authHeader() })).data,
  scheduleChallenge: async (data: { batchId: string; date: string; challengeId: string; startTime?: string; endTime?: string }): Promise<{ id: string }> => (await axios.post(`${BASE}/admin/schedule`, data, { headers: authHeader() })).data,
  deleteSchedule: async (id: string): Promise<{ deleted: number }> => (await axios.delete(`${BASE}/admin/schedule/${id}`, { headers: authHeader() })).data,
  adminDashboard: async (date: string): Promise<any> => (await axios.get(`${BASE}/admin/dashboard?date=${date}`, { headers: authHeader() })).data,
  adminStudents: async (batchId?: string): Promise<{ students: any[] }> => (await axios.get(`${BASE}/admin/students${batchId ? `?batchId=${batchId}` : ''}`, { headers: authHeader() })).data,
  adminStudentDetail: async (studentId: string): Promise<any> => (await axios.get(`${BASE}/admin/students/${studentId}`, { headers: authHeader() })).data,
  // Gamification
  achievements: async (): Promise<{ achievements: any[] }> => (await axios.get(`${BASE}/achievements`, { headers: authHeader() })).data,
  leaderboard: async (batchId?: string): Promise<{ enabled: boolean; rows: any[]; me: any }> => (await axios.get(`${BASE}/leaderboard${batchId ? `?batchId=${batchId}` : ''}`, { headers: authHeader() })).data,
  // Instructor review
  getInstructorFeedback: async (attemptId: string): Promise<{ feedback: any }> => (await axios.get(`${BASE}/admin/attempts/${attemptId}/feedback`, { headers: authHeader() })).data,
  saveInstructorFeedback: async (attemptId: string, body: any) => { await axios.post(`${BASE}/admin/attempts/${attemptId}/feedback`, body, { headers: authHeader() }); },
};

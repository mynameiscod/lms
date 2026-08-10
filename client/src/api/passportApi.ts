import axios from 'axios';
import { loadRazorpay } from './paymentApi';

const BASE = (process.env.REACT_APP_API_URL || '/api/v1') + '/passport';
const auth = () => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return { ...(token && { Authorization: `Bearer ${token}` }), ...(tenantId && { 'X-Tenant-Id': tenantId }) };
};

export interface OnboardingField { key: string; label: string; type: string; required: boolean; locked?: boolean; options?: string[]; order: number; }
export interface Entitlement { featureKey: string; label: string; tier: 'free' | 'paid'; }
export interface PassportConfig {
  _id?: string; enabled: boolean; assessmentMode: 'deterministic' | 'ai';
  onboardingFields: OnboardingField[]; entitlements: Entitlement[];
  priceInr: number; membershipMonths: number;
}

export const passportApi = {
  getConfig: async (): Promise<{ config: PassportConfig; platformEnabled: boolean }> => {
    const { data } = await axios.get(`${BASE}/config`, { headers: auth() });
    return data;
  },
  updateConfig: async (patch: Partial<PassportConfig>): Promise<PassportConfig> => {
    const { data } = await axios.put(`${BASE}/config`, patch, { headers: auth() });
    return data.config;
  },
  listStudents: async (search = ''): Promise<any[]> => {
    const { data } = await axios.get(`${BASE}/students`, { headers: auth(), params: { search } });
    return data.students;
  },
  /** Admin: what this member has written on missions that have no other surface. */
  listStudentAnswers: async (studentId: string): Promise<{
    name: string; email?: string;
    answers: {
      day: number; key: string; title: string; detail: string; category: string | null;
      answer: string; at: string;
      feedback?: string | null;
      extract?: { targetRole?: string | null; skills?: string[]; gaps?: string[]; specificity?: number; flag?: string } | null;
    }[];
  }> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/answers`, { headers: auth() });
    return data;
  },
  /** Admin: every mock interview this member has sat, newest first. */
  listStudentInterviews: async (studentId: string): Promise<{
    name: string; email?: string;
    interviews: {
      id: string; role: string; status: string; askedCount: number; answers: number;
      startedAt: string; completedAt: string | null;
      evaluation: InterviewSession['evaluation'];
      transcript: InterviewTurn[];
    }[];
  }> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/interviews`, { headers: auth() });
    return data;
  },
  convert: async (studentId: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/convert`, { studentId }, { headers: auth() });
    return data;
  },

  createMember: async (body: { firstName: string; lastName?: string; email: string; phone?: string }): Promise<any> => {
    const { data } = await axios.post(`${BASE}/members`, body, { headers: auth() });
    return data;
  },
  updateMember: async (userId: string, body: Record<string, any>): Promise<any> => {
    const { data } = await axios.put(`${BASE}/members/${userId}`, body, { headers: auth() });
    return data;
  },
  setMemberActive: async (userId: string, active: boolean): Promise<any> => {
    const { data } = await axios.post(`${BASE}/members/${userId}/active`, { active }, { headers: auth() });
    return data;
  },
  deleteMember: async (userId: string): Promise<any> => {
    const { data } = await axios.delete(`${BASE}/members/${userId}`, { headers: auth() });
    return data;
  },
  me: async (): Promise<any> => {
    const { data } = await axios.get(`${BASE}/me`, { headers: auth() });
    return data;
  },
  setPassword: async (password: string): Promise<{ success: boolean }> => {
    const { data } = await axios.post(`${BASE}/set-password`, { password }, { headers: auth() });
    return data;
  },

  // Assessment — student
  getAssessment: async (): Promise<{ title: string; questions: AssessQuestion[] }> => {
    const { data } = await axios.get(`${BASE}/assessment`, { headers: auth() });
    return data;
  },
  submitAssessment: async (answers: { questionId: string; chosen: number }[]): Promise<{ result: AssessResult }> => {
    const { data } = await axios.post(`${BASE}/assessment/submit`, { answers }, { headers: auth() });
    return data;
  },
  getResult: async (): Promise<{ result: AssessResult | null }> => {
    const { data } = await axios.get(`${BASE}/assessment/result`, { headers: auth() });
    return data;
  },

  // Assessment — admin
  getAssessmentAdmin: async (): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.get(`${BASE}/assessment/admin`, { headers: auth() });
    return data;
  },
  saveAssessment: async (patch: { title?: string; maxQuestions?: number; questions?: AssessQuestionFull[] }): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.put(`${BASE}/assessment/admin`, patch, { headers: auth() });
    return data;
  },
  resetAssessment: async (): Promise<{ assessment: AssessmentBank }> => {
    const { data } = await axios.post(`${BASE}/assessment/reset`, {}, { headers: auth() });
    return data;
  },

  // Missions
  getToday: async (): Promise<TodayMissions> => {
    const { data } = await axios.get(`${BASE}/missions/today`, { headers: auth() });
    return data;
  },
  /** `answer` is required for missions flagged needsAnswer — those have no surface to
   *  complete them on, so the written response IS the completion. */
  completeMission: async (key: string, answer?: string): Promise<{ ok: boolean; xp: number; streak: number; longestStreak: number; allDone: boolean; feedback?: string | null }> => {
    const { data } = await axios.post(`${BASE}/missions/complete`, { key, answer }, { headers: auth() });
    return data;
  },

  // ── Gamified member dashboard (one call for the whole home screen) ──
  getDashboard: async (): Promise<DashboardData> => {
    const { data } = await axios.get(`${BASE}/dashboard`, { headers: auth() });
    return data;
  },

  // ── Roadmap (full 90-day journey; free users get the 7-day preview) ──
  getRoadmap: async (): Promise<RoadmapResponse> => {
    const { data } = await axios.get(`${BASE}/roadmap`, { headers: auth() });
    return data;
  },

  // ── Practice Lab ──
  listPractice: async (params: { kind?: string; category?: string } = {}): Promise<PracticeListResponse> => {
    const { data } = await axios.get(`${BASE}/practice`, { headers: auth(), params });
    return data;
  },
  getPractice: async (id: string): Promise<{ problem: PracticeProblem; solved: boolean }> => {
    const { data } = await axios.get(`${BASE}/practice/${encodeURIComponent(id)}`, { headers: auth() });
    return data;
  },
  runPractice: async (id: string, code: string, language: string): Promise<RunOutcome> => {
    const { data } = await axios.post(`${BASE}/practice/${encodeURIComponent(id)}/run`, { code, language }, { headers: auth() });
    return data;
  },
  submitPractice: async (id: string, body: { code?: string; language?: string; answers?: number[] }): Promise<SubmitOutcome> => {
    const { data } = await axios.post(`${BASE}/practice/${encodeURIComponent(id)}/submit`, body, { headers: auth() });
    return data;
  },

  // ── Mock interviews ──
  listInterviews: async (): Promise<{ locked?: boolean; priceInr?: number; aiAvailable?: boolean; sessions?: InterviewSession[]; openSessionId?: string | null }> => {
    const { data } = await axios.get(`${BASE}/interview`, { headers: auth() });
    return data;
  },
  startInterview: async (): Promise<{ session: InterviewSession; resumed?: boolean; aiAvailable?: boolean }> => {
    const { data } = await axios.post(`${BASE}/interview/start`, {}, { headers: auth() });
    return data;
  },
  interviewTurn: async (id: string, answer: string): Promise<{ say: string; kind: string; endInterview: boolean; session: InterviewSession }> => {
    const { data } = await axios.post(`${BASE}/interview/${id}/turn`, { answer }, { headers: auth() });
    return data;
  },
  finishInterview: async (id: string): Promise<{ session: InterviewSession; scored?: boolean }> => {
    const { data } = await axios.post(`${BASE}/interview/${id}/finish`, {}, { headers: auth() });
    return data;
  },
  /** The interviewer's line as real spoken audio. Returns a blob URL the caller must revoke. */
  speakInterviewLine: async (text: string): Promise<string> => {
    const { data } = await axios.post(`${BASE}/interview/speak`, { text }, { headers: auth(), responseType: 'blob' });
    return URL.createObjectURL(data as Blob);
  },

  // ── Resume Center ──
  getResume: async (): Promise<{ resume: { sections: ResumeSections; score: ResumeScore | null; scoredAt?: string; version: number } }> => {
    const { data } = await axios.get(`${BASE}/resume`, { headers: auth() });
    return data;
  },
  saveResume: async (sections: ResumeSections): Promise<{ resume: { sections: ResumeSections; score: ResumeScore | null } }> => {
    const { data } = await axios.put(`${BASE}/resume`, { sections }, { headers: auth() });
    return data;
  },
  scoreResume: async (): Promise<{ score: ResumeScore; xpAwarded: number; atsReady: boolean; goodScore: number }> => {
    const { data } = await axios.post(`${BASE}/resume/score`, {}, { headers: auth() });
    return data;
  },
  improveResume: async (): Promise<{ sections: ResumeSections }> => {
    const { data } = await axios.post(`${BASE}/resume/improve`, {}, { headers: auth() });
    return data;
  },

  // ── Admin content (Pathways + Mission pools) ──
  getContent: async (): Promise<{ content: PassportContentDoc; categories: { key: string; label: string; weight: number }[] }> => {
    const { data } = await axios.get(`${BASE}/content`, { headers: auth() });
    return data;
  },
  saveContent: async (patch: Partial<PassportContentDoc>): Promise<{ content: PassportContentDoc }> => {
    const { data } = await axios.put(`${BASE}/content`, patch, { headers: auth() });
    return data;
  },
  resetContent: async (what: 'all' | 'pathways' | 'missions'): Promise<{ content: PassportContentDoc }> => {
    const { data } = await axios.post(`${BASE}/content/reset`, { what }, { headers: auth() });
    return data;
  },
  previewContent: async (body: Partial<PassportContentDoc> & { pathway?: string }): Promise<ContentPreview> => {
    const { data } = await axios.post(`${BASE}/content/preview`, body, { headers: auth() });
    return data;
  },

  // Membership checkout (₹499). Opens Razorpay and resolves true on successful activation.
  membershipCheckout: async (): Promise<{ ok: boolean; message?: string }> => {
    const ready = await loadRazorpay();
    if (!ready) return { ok: false, message: 'Could not load the payment window. Check your connection.' };
    let order: any;
    try {
      const { data } = await axios.post(`${BASE}/membership/order`, {}, { headers: auth() });
      order = data;
    } catch (e: any) {
      return { ok: false, message: e?.response?.data?.message || 'Could not start payment.' };
    }
    // Absolute return URL for redirect-mode checkout (mobile / incognito / popup-blocked,
    // where the in-page handler can't fire). Razorpay redirects here after payment; our
    // server settles and bounces back to /passport.
    const apiRoot = process.env.REACT_APP_API_URL || '/api/v1';
    const base = apiRoot.startsWith('http') ? apiRoot : window.location.origin + apiRoot;
    const callbackUrl = `${base}/payments/return?to=${encodeURIComponent('/careerpilot')}`;
    return new Promise((resolve) => {
      const rzp = new (window as any).Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency,
        name: order.name, description: order.description, order_id: order.orderId,
        prefill: order.prefill, theme: { color: '#6650d8' },
        callback_url: callbackUrl, redirect: true,
        handler: async (resp: any) => {
          try {
            await axios.post(`${BASE}/membership/verify`, {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }, { headers: auth() });
            resolve({ ok: true });
          } catch (e: any) { resolve({ ok: false, message: e?.response?.data?.message || 'Verification failed.' }); }
        },
        // The payment can complete in a redirected tab, so the handler above never fires
        // in this window. On dismiss, re-check server state (the webhook may have already
        // activated the membership) before treating it as a cancellation.
        modal: {
          ondismiss: async () => {
            try { const me = await passportApi.me(); if (me?.active) return resolve({ ok: true }); } catch { /* ignore */ }
            resolve({ ok: false, message: 'Payment cancelled.' });
          },
        },
      });
      rzp.on('payment.failed', (r: any) => resolve({ ok: false, message: r?.error?.description || 'Payment failed.' }));
      rzp.open();
    });
  },
};

// ── Gamified dashboard ──
export interface LevelInfo {
  level: number; title: string; xp: number;
  xpIntoLevel: number; xpForThisLevel: number; xpToNextLevel: number;
  nextLevel: number; nextTitle: string; progressPct: number;
}
export interface Badge { key: string; label: string; icon: string; color: string; hint: string; earned: boolean; progress: number; }
export interface DashboardData {
  active: boolean;
  hasAssessment: boolean;
  priceInr?: number;
  name?: string;
  firstName?: string;
  level?: LevelInfo;
  coderScore?: { score: number; parts: { label: string; earned: number; max: number }[] };
  percentileAhead?: number | null;
  skills?: { key: string; label: string; score: number }[];
  careerScore?: number | null;
  careerLevel?: string | null;
  pathwayLabel?: string;
  stats?: {
    solved: number; solvedToday: number; totalProblems: number;
    accuracy: { pct: number; attempts: number } | null;
    streak: number; longestStreak: number; xp: number;
    day: number; totalDays: number; completedDays: number;
    interviews: number; bestInterview: number | null; resumeScore: number | null;
    cohortRank: number | null; cohortSize: number;
  };
  weekly?: {
    submissions: number; solved: number; totalAttempts: number;
    accuracyPct: number | null; accuracyDelta: number | null;
    xpThisWeek: number; xpLastWeek: number; xpDelta: number;
  };
  recentActivity?: { label: string; icon: string; color: string; xp: number; ago: string }[];
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; done: boolean; answer?: string; feedback?: string }[];
  allDone?: boolean;
  dailyGoal?: { earned: number; target: number; pct: number; met: boolean };
  streakWeek?: { date: string; letter: string; active: boolean; isToday: boolean }[];
  activity?: { date: string; xp: number; label: string }[];
  badges?: Badge[];
  journey?: { key: string; label: string; fromDay: number; toDay: number; done: boolean; current: boolean }[];
  leaderboard?: { rank: number; name: string; xp: number; me: boolean }[];
  contests?: { id: string; title: string; prize: string | null; startAt: string; slug: string | null }[];
  shareSlug?: string | null;
  passwordSet?: boolean;
  entitled?: Record<string, boolean>;
}

// ── Roadmap ──
export interface RoadmapDay { day: number; date?: string; categories: string[]; titles: string[]; xp: number; done?: boolean; isToday?: boolean; isPast?: boolean; }
export interface RoadmapWeek { week: number; theme: string; fromDay: number; toDay: number; focusLabels: string[]; goal: string; days: RoadmapDay[]; completedDays: number; }
export interface RoadmapPhase { key: string; label: string; blurb: string; fromDay: number; toDay: number; weeks: RoadmapWeek[]; }
export interface Roadmap {
  totalDays: number; pathway: string; pathwayLabel: string; pathwayDescription: string;
  currentDay: number; startDate?: string; endDate?: string; phases: RoadmapPhase[];
  totalXp: number; earnedXp: number; completedDays: number; locked?: boolean; previewDays?: number;
}
export interface RoadmapResponse {
  needsAssessment?: boolean; roadmap?: Roadmap; entitled?: boolean;
  priceInr?: number; careerScore?: number; level?: string;
}

// ── Practice ──
export interface PracticeListItem { id: string; kind: 'coding' | 'sql' | 'mcq'; title: string; category: string; difficulty: string; xp: number; count: number; }
export interface PracticeListResponse { locked?: boolean; priceInr?: number; problems: PracticeListItem[]; solved: string[]; xp?: number; streak?: number; }
export interface SchemaTable { table: string; columns: { column: string; type: string }[] }
export interface PracticeProblem {
  id: string; kind: 'coding' | 'sql' | 'mcq'; title: string; subtitle?: string; category: string;
  difficulty: string; xp: number; estimatedMinutes?: number; prompt: string;
  learningGoals: string[]; tip?: string; hints: string[];
  languages?: string[]; starter?: Record<string, string>;
  schemaNote?: string; schema: SchemaTable[];
  sampleTests: { input: string; expected: string }[]; testCount: number;
  questions: { q: string; options: string[] }[];
}
export interface RunOutcome {
  results: { index: number; hidden: boolean; passed: boolean; input: string; expected: string; got: string; error?: string }[];
  passedCount: number; total: number; allPassed: boolean; compilationError?: string;
  executionMs?: number; memoryMb?: number;
}
export interface SubmitOutcome extends Partial<RunOutcome> {
  passed: boolean; xpAwarded: number; xp: number; streak: number; longestStreak: number; alreadySolved?: boolean;
  review?: { index: number; q: string; options: string[]; chosen: number; answer: number; correct: boolean; explain?: string }[];
  correct?: number; total?: number;
}

// ── Mock interview ──
export interface InterviewTurn { role: 'interviewer' | 'candidate'; text: string; at?: string; }
export interface InterviewSession {
  id: string; role: string; areas: string[]; interviewerName: string;
  maxQuestions: number; askedCount: number; status: 'in_progress' | 'completed' | 'abandoned';
  transcript: InterviewTurn[];
  evaluation?: {
    overallScore: number; readinessLevel: string; summary: string;
    strengths: string[]; improvements: string[]; recommendedPracticeAreas: string[];
    areaScores: { title: string; percentage: number; feedback: string }[];
    questionFeedback?: { question: string; verdict: 'strong' | 'okay' | 'weak'; whatWorked: string; whatToFix: string; betterAnswer: string }[];
  } | null;
  xpAwarded: number; startedAt: string; completedAt?: string;
}

// ── Resume ──
export interface ResumeSections {
  contact: { name: string; title?: string; email: string; phone: string; linkedin?: string; github?: string; portfolio?: string; location?: string };
  summary: string;
  experience: { company: string; role: string; from: string; to: string; current: boolean; bullets: string[] }[];
  education: { degree: string; college: string; university?: string; year?: string; cgpa?: string }[];
  skills: { category: string; items: string[] }[];
  projects: { name: string; tech: string[]; description: string; link?: string }[];
  certifications: { name: string; issuer: string; year?: string }[];
}
export interface ResumeScore {
  total: number;
  breakdown: { contact: number; summary: number; experience: number; education: number; skills: number; projects: number; ats: number };
  suggestions: { section: string; issue: string; fix: string }[];
  atsWarnings: string[]; keywordsFound: string[]; keywordsMissing: string[];
}

// ── Admin content ──
export interface MissionPoolItem { title: string; detail: string; type: string; xp: number; link?: string; }
export interface MissionPool { category: string; items: MissionPoolItem[]; }
export interface PassportPathway { key: string; label: string; description: string; focus: string[]; weekThemes: string[]; }
export interface PassportContentDoc { _id?: string; tenantId?: string; pathways: PassportPathway[]; missionPools: MissionPool[]; journeyDays: number; }
export interface ContentPreview {
  sampleFromRealStudent: boolean;
  days: { day: number; missions: { key: string; title: string; detail: string; category: string; xp: number; link?: string }[] }[];
  weeks: { week: number; theme: string; goal: string; focusLabels: string[] }[];
  totalXp: number; totalDaysGenerated: number;
}

export interface TodayMissions {
  locked?: boolean; needsAssessment?: boolean; priceInr?: number; reason?: string;
  day?: number; streak?: number; longestStreak?: number; xp?: number; allDone?: boolean;
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; done: boolean; answer?: string; feedback?: string }[];
}

export interface PassportCard {
  name: string; careerScore: number | null; level: string | null;
  pathway: string | null; careerGoal: string | null; memberSince: string | null;
}

export interface AssessQuestion { id: string; category: string; text: string; options: string[]; dependsOn?: { questionId: string; minChosen: number }; }
export interface AssessQuestionFull { _id?: string; category: string; text: string; options: string[]; correctIndex: number; weight: number; selfReport?: boolean; stages?: string[]; goals?: string[]; background?: string; dependsOn?: { questionId: string; minChosen: number }; }
export interface AssessmentBank { _id?: string; tenantId: string; title: string; maxQuestions?: number; questions: AssessQuestionFull[]; }
export interface CategoryScore { key: string; label: string; score: number; }
export interface AssessResult {
  careerScore: number; level: string; levelKey: string;
  categoryScores: CategoryScore[]; strengths: string[]; weaknesses: string[];
  pathway: string; pathwayLabel: string;
  weekPreview: { day: number; title: string; detail: string }[];
  takenAt?: string;
}

// ── Public funnel (no auth) ──
const PUB = (process.env.REACT_APP_API_URL || '/api/v1') + '/public/passport';
export const passportPublicApi = {
  getConfig: async (tenant: string) => {
    const { data } = await axios.get(`${PUB}/config`, { params: { tenant } });
    return data as { success: boolean; enabled: boolean; onboardingFields: OnboardingField[]; priceInr: number; tenantId: string };
  },
  signup: async (body: { tenant: string; name: string; mobile: string; email: string; fields: Record<string, any> }) => {
    const { data } = await axios.post(`${PUB}/signup`, body);
    return data as { success: boolean; token: string; otp: { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number } };
  },
  verify: async (token: string, code: string) => {
    const { data } = await axios.post(`${PUB}/verify`, { token, code });
    return data as { success: boolean; token: string; tenantId: string; user: any };
  },
  resend: async (token: string) => {
    const { data } = await axios.post(`${PUB}/resend`, { token });
    return data as { success: boolean; otp: any };
  },
  // Returning-member login (password — free) and OTP-login start (then reuse verify()).
  loginPassword: async (tenant: string, identifier: string, password: string) => {
    const { data } = await axios.post(`${PUB}/login-password`, { tenant, identifier, password });
    return data as { success: boolean; token: string; tenantId: string; user: any };
  },
  loginOtp: async (tenant: string, mobile: string) => {
    const { data } = await axios.post(`${PUB}/login-otp`, { tenant, mobile });
    return data as { success: boolean; token: string; otp: { sent: boolean; channel: string; devCode?: string; throttledSeconds?: number } };
  },
  getCard: async (slug: string) => {
    const { data } = await axios.get(`${PUB}/card/${encodeURIComponent(slug)}`);
    return data as { success: boolean; card: PassportCard };
  },
};

export default passportApi;

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
  /**
   * The bank, the categories in force, and what each category is carrying.
   * Usage comes back with the list because the delete button needs it BEFORE it is
   * pressed — the server refuses to remove a category that still holds content.
   */
  getAssessmentAdmin: async (): Promise<{ assessment: AssessmentBank; categories: AssessCategory[]; usage: CategoryUsage[] }> => {
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
  /**
   * Replace the whole category list. Rejects with 409 and an `inUse` breakdown when a
   * removed category still has questions, missions or pathways pointing at it.
   */
  saveCategories: async (categories: AssessCategory[]): Promise<{ categories: AssessCategory[]; removed: string[] }> => {
    const { data } = await axios.put(`${BASE}/assessment/categories`, { categories }, { headers: auth() });
    return data;
  },

  // Missions
  /** `day` omitted = today. Past days only; the server clamps anything ahead. */
  getToday: async (day?: number): Promise<TodayMissions> => {
    const { data } = await axios.get(`${BASE}/missions/today`, { headers: auth(), params: day ? { day } : undefined });
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
  /** `companySlug` primes the interviewer with that company's rounds and most-asked topics. */
  startInterview: async (companySlug?: string): Promise<{ session: InterviewSession; resumed?: boolean; aiAvailable?: boolean }> => {
    const { data } = await axios.post(`${BASE}/interview/start`, companySlug ? { companySlug } : {}, { headers: auth() });
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

  /** Import an existing CV. Parsed fields fill gaps only — they never overwrite typed work. */
  importResume: async (file: File): Promise<{ sections: ResumeSections; importedChars: number }> => {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axios.post(`${BASE}/resume/import`, fd, { headers: auth() });
    return data;
  },

  // ── Company Questions ──
  listCompanies: async (): Promise<{ locked?: boolean; priceInr?: number; companyTypes?: TaxItem[]; companies?: CompanyRow[] }> => {
    const { data } = await axios.get(`${BASE}/companies`, { headers: auth() });
    return data;
  },
  companyDetail: async (slug: string, params: Record<string, string> = {}): Promise<CompanyDetail> => {
    const { data } = await axios.get(`${BASE}/companies/${slug}`, { headers: auth(), params });
    return data;
  },
  submitExperience: async (slug: string, body: any): Promise<{ success: boolean; message: string }> => {
    const { data } = await axios.post(`${BASE}/companies/${slug}/experience`, body, { headers: auth() });
    return data;
  },
  listExperiences: async (status = 'pending'): Promise<{ experiences: AdminExperience[] }> => {
    const { data } = await axios.get(`${BASE}/company-admin/experiences`, { headers: auth(), params: { status } });
    return data;
  },
  moderateExperience: async (id: string, status: 'published' | 'rejected'): Promise<any> => {
    const { data } = await axios.put(`${BASE}/company-admin/experiences/${id}`, { status }, { headers: auth() });
    return data;
  },
  contributeQuestion: async (slug: string, body: any): Promise<{ success: boolean; message: string }> => {
    const { data } = await axios.post(`${BASE}/companies/${slug}/contribute`, body, { headers: auth() });
    return data;
  },
  // Admin
  getCompanyAdmin: async (): Promise<CompanyAdmin> => {
    const { data } = await axios.get(`${BASE}/company-admin`, { headers: auth() });
    return data;
  },
  saveTaxonomy: async (body: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/company-admin/taxonomy`, body, { headers: auth() });
    return data;
  },
  saveCompany: async (body: any, id?: string): Promise<any> => {
    const url = id ? `${BASE}/company-admin/companies/${id}` : `${BASE}/company-admin/companies`;
    const { data } = id
      ? await axios.put(url, body, { headers: auth() })
      : await axios.post(url, body, { headers: auth() });
    return data;
  },
  deleteCompany: async (id: string): Promise<any> => {
    const { data } = await axios.delete(`${BASE}/company-admin/companies/${id}`, { headers: auth() });
    return data;
  },
  adminQuestions: async (slug: string, status?: string): Promise<{ questions: AdminQuestion[] }> => {
    const { data } = await axios.get(`${BASE}/company-admin/${slug}/questions`, { headers: auth(), params: status ? { status } : undefined });
    return data;
  },
  saveQuestions: async (slug: string, questions: any[]): Promise<{ added: number }> => {
    const { data } = await axios.post(`${BASE}/company-admin/${slug}/questions`, { questions }, { headers: auth() });
    return data;
  },
  importQuestions: async (slug: string, raw: string): Promise<{ parsed: any[] }> => {
    const { data } = await axios.post(`${BASE}/company-admin/${slug}/import`, { raw }, { headers: auth() });
    return data;
  },
  predictQuestions: async (slug: string, body: any): Promise<{ parsed: any[] }> => {
    const { data } = await axios.post(`${BASE}/company-admin/${slug}/predict`, body, { headers: auth() });
    return data;
  },
  updateQuestion: async (id: string, body: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/company-admin/questions/${id}`, body, { headers: auth() });
    return data;
  },
  deleteQuestion: async (id: string): Promise<any> => {
    const { data } = await axios.delete(`${BASE}/company-admin/questions/${id}`, { headers: auth() });
    return data;
  },

  // ── Company mock test ──
  startMockTest: async (slug: string): Promise<{ attempt: MockAttempt; resumed?: boolean; generated?: number; banked?: number }> => {
    const { data } = await axios.post(`${BASE}/companies/${slug}/mock-test/start`, {}, { headers: auth() });
    return data;
  },
  getMockTest: async (id: string): Promise<{ attempt: MockAttempt; result: MockResult | null }> => {
    const { data } = await axios.get(`${BASE}/mock-test/${id}`, { headers: auth() });
    return data;
  },
  saveMockAnswer: async (id: string, questionId: string, chosen: number): Promise<any> => {
    const { data } = await axios.put(`${BASE}/mock-test/${id}/answer`, { questionId, chosen }, { headers: auth() });
    return data;
  },
  submitMockTest: async (id: string): Promise<{ result: MockResult }> => {
    const { data } = await axios.post(`${BASE}/mock-test/${id}/submit`, {}, { headers: auth() });
    return data;
  },
  mockTestHistory: async (slug: string): Promise<{ attempts: any[] }> => {
    const { data } = await axios.get(`${BASE}/companies/${slug}/mock-test/history`, { headers: auth() });
    return data;
  },

  // ── Company roster pipeline ──
  bulkCreateCompanies: async (names: string, type: string): Promise<{ created: number; skipped: number }> => {
    const { data } = await axios.post(`${BASE}/company-admin/bulk`, { names, type }, { headers: auth() });
    return data;
  },
  readinessBoard: async (): Promise<{ rows: ReadinessRow[]; liveCount: number; total: number }> => {
    const { data } = await axios.get(`${BASE}/company-admin/readiness`, { headers: auth() });
    return data;
  },
  draftProfile: async (slug: string): Promise<{ drafted: boolean; patternRounds: number; readiness: any }> => {
    const { data } = await axios.post(`${BASE}/company-admin/${slug}/draft-profile`, {}, { headers: auth() });
    return data;
  },
  verifyFields: async (slug: string, body: { eligibility?: boolean; salary?: boolean }): Promise<any> => {
    const { data } = await axios.put(`${BASE}/company-admin/${slug}/verify`, body, { headers: auth() });
    return data;
  },
  savePattern: async (slug: string, rounds: any[], role = ''): Promise<any> => {
    const { data } = await axios.put(`${BASE}/company-admin/${slug}/pattern`, { rounds, role }, { headers: auth() });
    return data;
  },

  // ── Tech News ──
  getNews: async (): Promise<{ locked?: boolean; priceInr?: number; items?: NewsItem[] }> => {
    const { data } = await axios.get(`${BASE}/news`, { headers: auth() });
    return data;
  },
  listNewsAdmin: async (): Promise<{ items: AdminNewsItem[]; hoursSincePublish: number | null }> => {
    const { data } = await axios.get(`${BASE}/news/admin`, { headers: auth() });
    return data;
  },
  /** Paste a link — the server fetches it and the AI writes a draft. Nothing is saved. */
  draftNews: async (url: string): Promise<{ draft: NewsDraft }> => {
    const { data } = await axios.post(`${BASE}/news/admin/draft`, { url }, { headers: auth() });
    return data;
  },
  createNews: async (body: Partial<AdminNewsItem>): Promise<{ item: AdminNewsItem }> => {
    const { data } = await axios.post(`${BASE}/news/admin`, body, { headers: auth() });
    return data;
  },
  updateNews: async (id: string, body: Partial<AdminNewsItem>): Promise<{ item: AdminNewsItem }> => {
    const { data } = await axios.put(`${BASE}/news/admin/${id}`, body, { headers: auth() });
    return data;
  },
  deleteNews: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await axios.delete(`${BASE}/news/admin/${id}`, { headers: auth() });
    return data;
  },

  // ── Leaderboard ──
  getLeaderboard: async (limit = 50): Promise<LeaderboardResponse> => {
    const { data } = await axios.get(`${BASE}/leaderboard`, { headers: auth(), params: { limit } });
    return data;
  },

  // ── My profile ──
  getMyProfile: async (): Promise<{ profile: MemberProfile }> => {
    const { data } = await axios.get(`${BASE}/me/profile`, { headers: auth() });
    return data;
  },
  updateMyProfile: async (p: MemberProfile): Promise<{ profile: MemberProfile }> => {
    const { data } = await axios.put(`${BASE}/me/profile`, p, { headers: auth() });
    return data;
  },

  // ── Coins ──
  getCoins: async (): Promise<CoinsResponse> => {
    const { data } = await axios.get(`${BASE}/coins`, { headers: auth() });
    return data;
  },
  getCoinAdmin: async (): Promise<CoinAdminResponse> => {
    const { data } = await axios.get(`${BASE}/coins/admin`, { headers: auth() });
    return data;
  },
  saveCoinConfig: async (patch: Partial<CoinConfig>): Promise<{ config: CoinConfig }> => {
    const { data } = await axios.put(`${BASE}/coins/admin/config`, patch, { headers: auth() });
    return data;
  },
  saveCoinRules: async (rules: CoinRule[]): Promise<{ rules: CoinRule[] }> => {
    const { data } = await axios.put(`${BASE}/coins/admin/rules`, { rules }, { headers: auth() });
    return data;
  },
  getCoinLedger: async (): Promise<{ entries: CoinLedgerRow[] }> => {
    const { data } = await axios.get(`${BASE}/coins/admin/ledger`, { headers: auth() });
    return data;
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
  /** Which day of the journey the member is on. */
  day?: number;
  /** Null when the coin ledger is unavailable — the dashboard renders without it. */
  coins?: { balance: number; lifetimeEarned: number } | null;
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
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; verify?: 'interview'; done: boolean; answer?: string; feedback?: string }[];
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
  companySlug?: string | null; companyName?: string | null;
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
  /** The day being shown, and the member's real current day, so the UI can offer a step back. */
  today?: number;
  isPast?: boolean;
  locked?: boolean; needsAssessment?: boolean; priceInr?: number; reason?: string;
  day?: number; streak?: number; longestStreak?: number; xp?: number; allDone?: boolean;
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; verify?: 'interview'; done: boolean; answer?: string; feedback?: string }[];
}

export interface PassportCard {
  name: string; careerScore: number | null; level: string | null;
  pathway: string | null; careerGoal: string | null; memberSince: string | null;
}

export interface AssessQuestion { id: string; category: string; text: string; options: string[]; dependsOn?: { questionId: string; minChosen: number }; }
export interface AssessQuestionFull { _id?: string; category: string; text: string; options: string[]; correctIndex: number; weight: number; selfReport?: boolean; stages?: string[]; goals?: string[]; background?: string; dependsOn?: { questionId: string; minChosen: number }; }
export interface AssessmentBank { _id?: string; tenantId: string; title: string; maxQuestions?: number; questions: AssessQuestionFull[]; categories?: AssessCategory[]; }
/** A scoring category. `weight` scales its contribution to the career score (0.1–3). */
export interface AssessCategory { key: string; label: string; weight: number; order?: number; }
/** What a category is carrying — the delete guard reads from this. */
export interface CategoryUsage { key: string; questions: number; missions: number; pathways: number; }
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

export interface LeaderboardRow { rank: number; name: string; city: string; xp: number; streak: number; me: boolean; }
export interface LeaderboardResponse {
  total: number; rows: LeaderboardRow[]; me: LeaderboardRow | null; percentile: number | null;
}

export interface MemberProfile {
  name: string; email: string; mobile: string;
  degree: string; branch: string; yearOfStudy: string; careerGoal: string; city: string;
}

// ── Coins ──
export interface CoinConfig {
  enabled: boolean; coinsPerRupee: number; monthlyEarnCap: number;
  annualRealCostBudgetInr: number; expiryMonths: number; minRedemption: number;
  referrerCoins: number; refereeCoins: number; referralMonthlyCap: number;
  freeMembersAccrue: boolean;
}
export interface CoinRule {
  eventKey: string; label: string; coins: number;
  dailyCap: number; monthlyCap: number; enabled: boolean;
}
export interface CoinHistoryRow { at: string; coins: number; eventKey: string; note: string; balanceAfter: number; }
export interface CoinsResponse {
  enabled: boolean; balance: number; lifetimeEarned: number; lifetimeSpent: number;
  redeemable: boolean; minRedemption: number; monthlyEarnCap: number; expiryMonths: number;
  earnRules: { eventKey: string; label: string; coins: number; dailyCap: number }[];
  history: CoinHistoryRow[];
}
export interface CoinLedgerRow { at: string; coins: number; eventKey: string; note: string; balanceAfter: number; member: string; }
export interface CoinAdminResponse {
  config: CoinConfig;
  rules: CoinRule[];
  knownEvents: { key: string; label: string }[];
  stats: {
    totalIssued: number; awards: number; earningMembers: number;
    worstCaseInrPerMember: number; membershipPriceInr: number; budgetInrPerMember: number;
  };
}

// ── Tech News ──
export interface NewsItem {
  id: string; title: string; summary: string; note?: string;
  url: string; source: string; imageUrl?: string; tags: string[]; publishedAt: string;
}
export interface AdminNewsItem extends NewsItem { status: 'draft' | 'published'; aiGenerated?: boolean; }
export interface NewsDraft {
  title: string; summary: string; source: string; imageUrl: string; tags: string[]; url: string;
}

// ── Company Questions ──
export interface TaxItem { key: string; label: string; order: number; enabled: boolean; count?: number; }
export interface CompanyRow { id: string; name: string; slug: string; type: string; logoUrl: string; about: string; questionCount: number; }
export interface CompanyQuestionRow {
  id: string; role: string; round: string; category: string; difficulty: string;
  year: number | null; questionText: string; answer: string; tags: string[];
  aiPredicted: boolean; source: string; practiceProblemId: string; upvotes: number;
  /** How many separate reports of this question exist. 1 = a single admin entry. */
  askedCount?: number;
  lastAsked?: string | null;
}
/** A figure and the sample behind it. `value` is null when nothing supports it yet. */
export interface Stat<T = number> { value: T | null; n: number }

export interface SalaryBand { role: string; minLpa: number; maxLpa: number; note?: string; indicative: boolean }

export interface CompanyStats {
  avgRounds: Stat; avgDurationDays: Stat; offerRate: Stat; rating: Stat;
  difficultyFelt: Stat<string>; experiences: number;
  rounds: { key: string; questions: number; attemptedPct: number | null }[];
  totals: { questions: number; askedThisYear: number; highFrequency: number; avgSuccessRate: Stat };
}

export interface MockQuestion {
  id: string; text: string; options: string[]; category: string; difficulty: string;
  /** Written by AI rather than taken from the bank — surfaced to the student. */
  generated: boolean;
}
export interface MockAttempt {
  id: string; companySlug: string; companyName: string;
  startedAt: string; endsAt: string; status: 'in_progress' | 'submitted' | 'expired';
  totalQuestions: number; passingPct: number;
  sections: { name: string; category: string; durationMins: number; questions: MockQuestion[] }[];
  answers: { questionId: string; chosen: number }[];
}
export interface MockResult {
  score: number; correct: number; total: number; passed: boolean; passingPct: number;
  generatedCount: number; bankedCount: number;
  review: {
    id: string; text: string; options: string[]; chosen: number | null;
    correctIndex: number; right: boolean; explanation: string; generated: boolean;
  }[];
}

export interface ReadinessCheck { key: string; label: string; done: boolean; detail: string; required: boolean }
export interface ReadinessRow {
  id: string; name: string; slug: string; type: string;
  ready: boolean; score: number; missing: string[]; checks: ReadinessCheck[];
  aiDrafted: Record<string, boolean>; verified: Record<string, boolean>;
}
export interface PatternRound {
  key: string; order: number; name: string; durationMins?: number;
  tests: string[]; description?: string; cutoff?: string; tip?: string;
}

export interface AdminExperience {
  id: string; companySlug: string; role: string; interviewedOn: string;
  roundsFaced: string[]; durationDays: number | null; outcome: string;
  difficultyFelt: string; rating: number | null; review: string; status: string; student: string;
}

export interface CompanyDetail {
  company: {
    id: string; name: string; slug: string; type: string; logoUrl: string; about: string;
    roles: string[]; location: string; industry: string; employeeBand: string; website: string;
    tips: string[]; salaryBands: SalaryBand[];
    /** Null until an admin has verified it — never shown to a student unverified. */
    eligibility: {
      cgpaMin?: number; tenthMin?: number; twelfthMin?: number;
      backlogsAllowed?: number; branches: string[]; notes?: string;
    } | null;
    hiringTimeline: string;
  };
  pattern: { role: string; totalDurationDays: number | null; rounds: PatternRound[] } | null;
  stats: CompanyStats;
  rounds: TaxItem[]; categories: TaxItem[]; difficulties: TaxItem[];
  questions: CompanyQuestionRow[];
}
export interface AdminQuestion extends CompanyQuestionRow { status: string; companySlug: string; reviewNote: string; contributor: string; }
export interface CompanyAdmin {
  taxonomy: { rounds: TaxItem[]; categories: TaxItem[]; difficulties: TaxItem[]; companyTypes: TaxItem[] };
  companies: (CompanyRow & { active: boolean })[];
  pendingCount: number;
}

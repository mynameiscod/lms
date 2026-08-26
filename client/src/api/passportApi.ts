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

/** One skill's share of the assessable pool. */
export interface PoolCoverageRow {
  skillKey: string;
  skillName: string;
  /** Mapped, approved questions — what a paper can actually draw from. */
  approved: number;
  /** Drafted but not yet reviewed. Reachable by nobody until approved. */
  pending: number;
}

export interface DraftOption { text: string; isCorrect: boolean }

export interface QuestionDraft {
  _id: string;
  skillKey: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  options: DraftOption[];
  explanation: string;
  codeSnippet?: string;
  language?: string;
  /** Why a student would pick each wrong option. Empty is itself a warning. */
  distractorRationale?: string[];
  status: 'pending' | 'approved' | 'rejected';
  /** What the automatic checks noticed. Not errors — places to look first. */
  warnings: string[];
  batchId: string;
  generatedBy: string;
  createdAt: string;
  reviewNote?: string;
  approvedQuestionId?: string;
}

export interface DraftBatchReport {
  batchId: string;
  skillKey: string;
  requested: number;
  returned: number;
  stored: number;
  flagged: number;
  dropped: { reason: string; question: string }[];
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

  // ── Pathway curriculum (admin-authored days) ──
  listCurricula: async (): Promise<{ tracks: CurriculumTrack[]; overrides: { pathwayKey: string; days: number }[] }> => {
    const { data } = await axios.get(`${BASE}/curriculum`, { headers: auth() });
    return data;
  },
  getCurriculum: async (key: string): Promise<CurriculumDoc> => {
    const { data } = await axios.get(`${BASE}/curriculum/${encodeURIComponent(key)}`, { headers: auth() });
    return data;
  },
  saveCurriculum: async (key: string, days: CurriculumDay[]): Promise<{ days: CurriculumDay[] }> => {
    const { data } = await axios.put(`${BASE}/curriculum/${encodeURIComponent(key)}`, { days }, { headers: auth() });
    return data;
  },
  moveCurriculumDay: async (key: string, from: number, to: number): Promise<{ days: CurriculumDay[] }> => {
    const { data } = await axios.post(`${BASE}/curriculum/${encodeURIComponent(key)}/move`, { from, to }, { headers: auth() });
    return data;
  },
  copyCurriculum: async (key: string, from: string): Promise<{ days: CurriculumDay[]; copiedFrom: string }> => {
    const { data } = await axios.post(`${BASE}/curriculum/${encodeURIComponent(key)}/copy`, { from }, { headers: auth() });
    return data;
  },
  /** Appends AI-drafted days after whatever is already written. Nothing is published. */
  draftCurriculum: async (key: string, count: number, brief?: string): Promise<{ days: CurriculumDay[]; added: number }> => {
    const { data } = await axios.post(`${BASE}/curriculum/${encodeURIComponent(key)}/draft`, { count, brief }, { headers: auth() });
    return data;
  },

  // ── Role readiness (Module 8) ──
  /** Derived on request; the target role comes from stored context, never from the client. */
  getMyReadiness: async (): Promise<RoleReadinessResponse> => {
    const { data } = await axios.get(`${BASE}/me/readiness`, { headers: auth() });
    return data;
  },
  /** Admin: one member's readiness, with weights and the workings. */
  getStudentReadiness: async (studentId: string, roleKey?: string): Promise<any> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/readiness`, {
      headers: auth(), params: roleKey ? { roleKey } : {},
    });
    return data;
  },

  // ── 90-day roadmap (Module 9) ──
  /**
   * The caller's own plan. Distinct from getRoadmap(), which is the mission journey — that
   * answers "what do I do today", this answers "what am I working toward".
   */
  getMySkillRoadmap: async (): Promise<SkillRoadmapResponse> => {
    const { data } = await axios.get(`${BASE}/me/roadmap`, { headers: auth() });
    return data;
  },
  /** Safe to call twice: an existing plan is returned rather than replaced. */
  generateMySkillRoadmap: async (): Promise<SkillRoadmapResponse> => {
    const { data } = await axios.post(`${BASE}/me/roadmap/generate`, {}, { headers: auth() });
    return data;
  },
  /** Explicit rebuild. The previous plan is kept as history, never deleted. */
  replanMySkillRoadmap: async (): Promise<SkillRoadmapResponse> => {
    const { data } = await axios.post(`${BASE}/me/roadmap/replan`, {}, { headers: auth() });
    return data;
  },
  /** Admin: one member's plan, with the workings and their roadmap history. */
  getStudentSkillRoadmap: async (studentId: string): Promise<any> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/roadmap`, { headers: auth() });
    return data;
  },

  // ── Personalised assessment + daily plan (Module 10) ──
  /** Starts, or resumes an open paper. Never generates a second one. */
  startSkillAssessment: async (): Promise<{ assessment: SkillAssessment; resumed: boolean }> => {
    const { data } = await axios.post(`${BASE}/me/assessment/personalized/start`, {}, { headers: auth() });
    return data;
  },
  getSkillAssessment: async (): Promise<{ assessment: SkillAssessment | null }> => {
    const { data } = await axios.get(`${BASE}/me/assessment/personalized`, { headers: auth() });
    return data;
  },
  /** Saves progress without submitting — the paper stays open and nothing is graded. */
  saveSkillAnswers: async (answers: { sourceType: string; sourceId: string; response: any }[]): Promise<{ saved: boolean; answered: number }> => {
    const { data } = await axios.put(`${BASE}/me/assessment/personalized/answers`, { answers }, { headers: auth() });
    return data;
  },
  /** Today's roadmap-derived work. */
  getTodaysPlan: async (): Promise<DailyPlanResponse> => {
    const { data } = await axios.get(`${BASE}/me/plan/today`, { headers: auth() });
    return data;
  },
  completeDailyMission: async (key: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/me/plan/complete`, { key }, { headers: auth() });
    return data;
  },

  // ── Skill check-in (Module 13) ──
  getReassessmentStatus: async (): Promise<ReassessmentStatus> => {
    const { data } = await axios.get(`${BASE}/me/reassessment/status`, { headers: auth() });
    return data;
  },
  startReassessment: async (): Promise<{ attemptId: string; resumed: boolean; targetSkills: { skillKey: string; skillName: string }[] }> => {
    const { data } = await axios.post(`${BASE}/me/reassessment/start`, {}, { headers: auth() });
    return data;
  },
  getReassessmentResult: async (attemptId: string): Promise<ReassessmentResult> => {
    const { data } = await axios.get(`${BASE}/me/reassessment/${attemptId}/result`, { headers: auth() });
    return data;
  },
  getReplanStatus: async (): Promise<ReplanStatusView> => {
    const { data } = await axios.get(`${BASE}/me/roadmap/replan-status`, { headers: auth() });
    return data;
  },

  // ── Placement readiness (Module 14) ──
  /** Three readiness figures, side by side. Deliberately never combined into one. */
  getPlacementReadiness: async (): Promise<PlacementReadinessView> => {
    const { data } = await axios.get(`${BASE}/me/placement-readiness`, { headers: auth() });
    return data;
  },
  /** What a role interview would cover, shown before the member commits to sitting one. */
  getInterviewCoverage: async (): Promise<InterviewCoverageView> => {
    const { data } = await axios.get(`${BASE}/me/interview/coverage`, { headers: auth() });
    return data;
  },

  // ── Rewards (Module 12) ──
  /** Catalogue plus this student's standing against each reward. */
  getRewards: async (): Promise<RewardCatalogue> => {
    const { data } = await axios.get(`${BASE}/me/rewards`, { headers: auth() });
    return data;
  },
  /** The intent token separates a real second redemption from a double-clicked button. */
  redeemReward: async (key: string, intentToken: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/me/rewards/${encodeURIComponent(key)}/redeem`,
      { intentToken }, { headers: auth() });
    return data;
  },
  getMyRedemptions: async (): Promise<{ redemptions: RedemptionRow[] }> => {
    const { data } = await axios.get(`${BASE}/me/redemptions`, { headers: auth() });
    return data;
  },

  // ── Gamification (Module 11) ──
  /** XP, level, streak, badges and ranks. Read-only: no client can award anything. */
  getMyGamification: async (): Promise<GamificationSummary> => {
    const { data } = await axios.get(`${BASE}/me/gamification`, { headers: auth() });
    return data;
  },
  getMyXpHistory: async (limit = 30): Promise<{ entries: XpHistoryEntry[] }> => {
    const { data } = await axios.get(`${BASE}/me/gamification/xp-history`, { headers: auth(), params: { limit } });
    return data;
  },
  getMyLeaderboard: async (scope: string, period: string): Promise<ScopedLeaderboardResponse> => {
    const { data } = await axios.get(`${BASE}/me/leaderboard`, { headers: auth(), params: { scope, period } });
    return data;
  },
  /** Admin: XP rules, badges and leaderboard settings. */
  getAdminGamification: async (): Promise<any> => {
    const { data } = await axios.get(`${BASE}/gamification/admin`, { headers: auth() });
    return data;
  },
  updateXpRule: async (eventKey: string, patch: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/gamification/admin/rules/${eventKey}`, patch, { headers: auth() });
    return data;
  },
  updateBadgeDefinition: async (key: string, patch: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/gamification/admin/badges/${key}`, patch, { headers: auth() });
    return data;
  },
  updateLeaderboardSettings: async (patch: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/gamification/admin/leaderboard`, patch, { headers: auth() });
    return data;
  },
  getRewardBudget: async (period?: string): Promise<any> => {
    const { data } = await axios.get(`${BASE}/gamification/admin/reward-budget`, { headers: auth(), params: period ? { period } : {} });
    return data;
  },
  updateRewardBudget: async (patch: any): Promise<any> => {
    const { data } = await axios.put(`${BASE}/gamification/admin/reward-budget`, patch, { headers: auth() });
    return data;
  },
  previewRewardBudget: async (body: any): Promise<any> => {
    const { data } = await axios.post(`${BASE}/gamification/admin/reward-budget/preview`, body, { headers: auth() });
    return data;
  },

  // ── Skill DNA (Module 7) ──
  /** The caller's own skills. `assessed: false` means not measured yet, not a score of 0. */
  getMySkillDna: async (): Promise<{ skills: SkillDnaRow[]; assessed: boolean }> => {
    const { data } = await axios.get(`${BASE}/me/skills`, { headers: auth() });
    return data;
  },
  /** Grades the open paper and projects it into skill evidence. */
  submitPersonalizedAssessment: async (answers: { sourceType: string; sourceId: string; response?: any }[]): Promise<any> => {
    const { data } = await axios.post(`${BASE}/me/assessment/personalized/submit`, { answers }, { headers: auth() });
    return data;
  },
  /** Admin: one member's Skill DNA. */
  getStudentSkillDna: async (studentId: string): Promise<{ skills: SkillDnaRow[]; assessed: boolean }> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/skills`, { headers: auth() });
    return data;
  },
  /** Admin: the observations behind one score, and the arithmetic applied. */
  explainStudentSkill: async (studentId: string, skillKey: string): Promise<any> => {
    const { data } = await axios.get(`${BASE}/students/${studentId}/skills/${skillKey}`, { headers: auth() });
    return data;
  },
  /** Admin recovery: recompute profiles from stored evidence. Idempotent. */
  rebuildStudentSkillDna: async (studentId: string): Promise<any> => {
    const { data } = await axios.post(`${BASE}/students/${studentId}/skills/rebuild`, {}, { headers: auth() });
    return data;
  },

  // ── Personalised assessment (Module 6) ──
  /** Runs the real generator and saves nothing — no attempt, no member data touched. */
  previewAssessment: async (studentId: string, attemptNumber = 1): Promise<AssessmentPreview> => {
    const { data } = await axios.post(`${BASE}/assessment/personalized/preview`, { studentId, attemptNumber }, { headers: auth() });
    return data;
  },
  assessmentPolicies: async (): Promise<{ policies: AssessmentPolicyRow[] }> => {
    const { data } = await axios.get(`${BASE}/assessment/personalized/policies`, { headers: auth() });
    return data;
  },

  // ── Assessment skill evidence (Module 5, admin) ──
  /** A page of content with its mappings. One evidence query per page, never per item. */
  listSkillEvidence: async (q: { sourceType: string; filter: string; search?: string; page: number }): Promise<{
    items: EvidenceItem[]; total: number; page: number; limit: number;
    sourceTypes: { key: string; label: string }[];
  }> => {
    const { data } = await axios.get(`${BASE}/skill-evidence`, { headers: auth(), params: q });
    return data;
  },
  /** Replaces an item's whole mapping — a skill left out is unmapped. */
  saveSkillEvidence: async (sourceType: string, sourceId: string, evidence: { skillKey: string; contribution: string; active: boolean }[]): Promise<{ item: any }> => {
    const { data } = await axios.put(`${BASE}/skill-evidence/${sourceType}/${encodeURIComponent(sourceId)}`, { evidence }, { headers: auth() });
    return data;
  },
  /** How much evidence exists per skill. Configuration completeness, not analytics. */
  skillEvidenceCoverage: async (): Promise<{ coverage: SkillCoverageRow[]; totals: any; sourceTypes: { key: string; label: string }[] }> => {
    const { data } = await axios.get(`${BASE}/skill-evidence/coverage`, { headers: auth() });
    return data;
  },
  /** Active, assessable skills — the only ones that may be newly mapped. */
  mappableSkills: async (): Promise<{ skills: MappableSkill[] }> => {
    const { data } = await axios.get(`${BASE}/skill-evidence/skills`, { headers: auth() });
    return data;
  },

  // ── Role skill blueprints (Module 4, admin) ──
  /** Every role with a count of what it expects — one query, no per-role fan-out. */
  listRoleBlueprints: async (): Promise<{ roles: BlueprintRoleRow[]; suggestedTaxonomyAdditions: string[] }> => {
    const { data } = await axios.get(`${BASE}/role-blueprints`, { headers: auth() });
    return data;
  },
  /** One blueprint, its skills resolved, plus the tree the picker needs. */
  getRoleBlueprint: async (roleKey: string): Promise<{ blueprint: ResolvedBlueprint; skillTree: SkillNode[]; vocabulary: any }> => {
    const { data } = await axios.get(`${BASE}/role-blueprints/${encodeURIComponent(roleKey)}`, { headers: auth() });
    return data;
  },
  /** Replaces the whole list — a requirement left out is removed. */
  saveRoleBlueprint: async (roleKey: string, requirements: BlueprintRequirement[]): Promise<{ blueprint: ResolvedBlueprint }> => {
    const { data } = await axios.put(`${BASE}/role-blueprints/${encodeURIComponent(roleKey)}`, { requirements }, { headers: auth() });
    return data;
  },
  publishRoleBlueprint: async (roleKey: string, published: boolean): Promise<{ blueprint: ResolvedBlueprint }> => {
    const { data } = await axios.post(`${BASE}/role-blueprints/${encodeURIComponent(roleKey)}/publish`, { published }, { headers: auth() });
    return data;
  },
  /** Idempotent, insert-only. `dryRun` reports without writing. */
  seedRoleBlueprints: async (dryRun: boolean): Promise<{ inserted: string[]; skipped: string[]; missingRoles: string[]; missingSkills: Record<string, string[]> }> => {
    const { data } = await axios.post(`${BASE}/role-blueprints/seed`, { dryRun }, { headers: auth() });
    return data;
  },

  // ── Skill graph (Module 3, admin) ──
  /** Tree, flat list and vocabulary in one response, so the pickers cannot disagree. */
  listSkills: async (): Promise<{
    tree: SkillNode[];
    skills: AdminSkill[];
    difficulties: string[];
    nodeTypes: string[];
    counts: { total: number; active: number; assessable: number; groups: number };
  }> => {
    const { data } = await axios.get(`${BASE}/skills`, { headers: auth() });
    return data;
  },
  createSkill: async (body: any): Promise<{ skill: AdminSkill }> => {
    const { data } = await axios.post(`${BASE}/skills`, body, { headers: auth() });
    return data;
  },
  updateSkill: async (id: string, body: any): Promise<{ skill: AdminSkill }> => {
    const { data } = await axios.put(`${BASE}/skills/${id}`, body, { headers: auth() });
    return data;
  },
  deleteSkill: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await axios.delete(`${BASE}/skills/${id}`, { headers: auth() });
    return data;
  },
  /** Idempotent. `dryRun` reports what would be installed without writing. */
  seedSkills: async (dryRun: boolean): Promise<{ inserted: string[]; skipped: string[]; total: number }> => {
    const { data } = await axios.post(`${BASE}/skills/seed`, { dryRun }, { headers: auth() });
    return data;
  },

  // ── Career roles (Module 2, admin) ──
  listCareerRoles: async (): Promise<{
    domains: { key: string; label: string }[];
    roles: AdminCareerRole[];
    counts: { total: number; active: number; selectable: number };
  }> => {
    const { data } = await axios.get(`${BASE}/career-roles`, { headers: auth() });
    return data;
  },
  /** Counted on demand, not per row — see the admin screen's note. */
  careerRoleUsage: async (key: string): Promise<{ key: string; memberCount: number }> => {
    const { data } = await axios.get(`${BASE}/career-roles/${encodeURIComponent(key)}/usage`, { headers: auth() });
    return data;
  },
  createCareerRole: async (body: Partial<AdminCareerRole>): Promise<{ role: AdminCareerRole }> => {
    const { data } = await axios.post(`${BASE}/career-roles`, body, { headers: auth() });
    return data;
  },
  updateCareerRole: async (id: string, body: Partial<AdminCareerRole>): Promise<{ role: AdminCareerRole }> => {
    const { data } = await axios.put(`${BASE}/career-roles/${id}`, body, { headers: auth() });
    return data;
  },
  deleteCareerRole: async (id: string): Promise<{ success: boolean }> => {
    const { data } = await axios.delete(`${BASE}/career-roles/${id}`, { headers: auth() });
    return data;
  },

  // ── Career context (Module 1) ──
  /** The caller's own context. Derived values come from the server, never computed here. */
  getCareerContext: async (): Promise<{ context: CareerContext; options: CareerContextOptions }> => {
    const { data } = await axios.get(`${BASE}/me/context`, { headers: auth() });
    return data;
  },
  /** Partial save. Only `complete: true` marks onboarding finished. */
  updateCareerContext: async (patch: CareerContextPatch): Promise<{ context: CareerContext; options: CareerContextOptions }> => {
    const { data } = await axios.put(`${BASE}/me/context`, patch, { headers: auth() });
    return data;
  },

  /**
   * Can this member start a personalized assessment right now?
   *
   * Preflight so onboarding never offers a CTA that fails on click. All readiness rules
   * (blueprint published, skills configured, question pool) stay on the server — this is
   * a transport, not a second copy of the policy.
   */
  getAssessmentAvailability: async (): Promise<AssessmentAvailability> => {
    const { data } = await axios.get(`${BASE}/me/assessment/personalized/availability`, { headers: auth() });
    return data;
  },

  // ── Assessment paper shape (admin) ──
  /** Every stage with its shipped defaults and this tenant's current values. */
  getEditablePolicies: async (): Promise<{ policies: EditablePolicy[]; bounds: PolicyBounds }> => {
    const { data } = await axios.get(`${BASE}/assessment/policies/editable`, { headers: auth() });
    return data;
  },
  saveEditablePolicies: async (policies: EditablePolicy[]): Promise<{ policies: EditablePolicy[]; bounds: PolicyBounds }> => {
    const { data } = await axios.put(`${BASE}/assessment/policies/editable`, { policies }, { headers: auth() });
    return data;
  },

  // ── AI question drafting (admin) ──
  /**
   * How much pool each assessable skill has, worst first. The number that matters is per
   * skill, not the total: a paper draws slots per skill, so a large pool concentrated on a
   * few skills still produces a repetitive paper.
   */
  draftCoverage: async (): Promise<{ skills: PoolCoverageRow[] }> => {
    const { data } = await axios.get(`${BASE}/question-drafts/coverage`, { headers: auth() });
    return data;
  },
  listDrafts: async (q: { status?: string; skillKey?: string; page?: number; limit?: number } = {}):
    Promise<{ drafts: QuestionDraft[]; total: number; page: number; limit: number }> => {
    const { data } = await axios.get(`${BASE}/question-drafts`, { params: q, headers: auth() });
    return data;
  },
  generateDrafts: async (body: { skillKey: string; difficulty: string; count: number }):
    Promise<{ report: DraftBatchReport }> => {
    const { data } = await axios.post(`${BASE}/question-drafts/generate`, body, { headers: auth() });
    return data;
  },
  approveDraft: async (id: string, edits?: Partial<QuestionDraft>, note?: string): Promise<{ questionId: string }> => {
    const { data } = await axios.post(`${BASE}/question-drafts/${id}/approve`, { edits, note }, { headers: auth() });
    return data;
  },
  rejectDraft: async (id: string, note?: string): Promise<{ success: boolean }> => {
    const { data } = await axios.post(`${BASE}/question-drafts/${id}/reject`, { note }, { headers: auth() });
    return data;
  },

  // ── Pathway routing rules (who each pathway serves) ──
  /** Goals, stages, backgrounds and categories a rule may be written against. */
  ruleVocabulary: async (): Promise<RuleVocabulary> => {
    const { data } = await axios.get(`${BASE}/pathway-rules/vocabulary`, { headers: auth() });
    return data;
  },
  /** Dry-runs the SUBMITTED rules over every real member — nothing is saved. */
  previewRules: async (pathways: PassportPathway[]): Promise<RulePreview> => {
    const { data } = await axios.post(`${BASE}/pathway-rules/preview`, { pathways }, { headers: auth() });
    return data;
  },
  /** The diff only — who would move and where. Never writes. */
  reevaluatePathways: async (): Promise<ReevaluateResult> => {
    const { data } = await axios.post(`${BASE}/pathway-rules/reevaluate`, {}, { headers: auth() });
    return data;
  },
  /** Actually moves them. Separate permission (reroute_passport_members). */
  applyReevaluation: async (): Promise<ReevaluateResult> => {
    const { data } = await axios.post(`${BASE}/pathway-rules/reevaluate/apply`, {}, { headers: auth() });
    return data;
  },
  /** Plain-English audience → a rule block, for review in the editor. */
  draftRule: async (pathwayKey: string, audience: string): Promise<{ pathwayKey: string; match: PathwayMatch }> => {
    const { data } = await axios.post(`${BASE}/pathway-rules/draft`, { pathwayKey, audience }, { headers: auth() });
    return data;
  },

  // ── Drop-off funnel ──
  /** Stage definitions with live counts, plus totals. */
  getFunnel: async (): Promise<{ stages: FunnelStage[]; totals: FunnelTotals; notes: string[] }> => {
    const { data } = await axios.get(`${BASE}/funnel`, { headers: auth() });
    return data;
  },
  /** The people stuck in one stage, coldest first. */
  getFunnelStage: async (stage: string): Promise<{ stage: FunnelStage; total: number; returned: number; members: FunnelMember[] }> => {
    const { data } = await axios.get(`${BASE}/funnel/${stage}`, { headers: auth() });
    return data;
  },
  /**
   * Download the stage as CSV.
   *
   * Fetched rather than linked: the endpoint needs the Authorization header, and a plain
   * <a href> cannot send one — it would just 401. The response is turned into a blob and
   * handed to a temporary link so the browser saves it.
   */
  exportFunnelStage: async (stage: string, filename: string): Promise<void> => {
    const { data } = await axios.get(`${BASE}/funnel/${stage}/export`, {
      headers: auth(), responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
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
  /**
   * Open a mock interview.
   *
   * `mode: 'role'` builds the paper from the member's own role blueprint, which is the only
   * kind of sitting that can later become skill evidence. The member never names the skills
   * — coverage is resolved server-side.
   */
  startInterview: async (companySlug?: string, mode?: 'role' | 'intro'): Promise<{ session: InterviewSession; resumed?: boolean; aiAvailable?: boolean; mismatched?: boolean }> => {
    const body: any = {};
    if (companySlug) body.companySlug = companySlug;
    if (mode) body.mode = mode;
    const { data } = await axios.post(`${BASE}/interview/start`, body, { headers: auth() });
    return data;
  },
  interviewTurn: async (id: string, answer: string): Promise<{ say: string; kind: string; endInterview: boolean; session: InterviewSession }> => {
    const { data } = await axios.post(`${BASE}/interview/${id}/turn`, { answer }, { headers: auth() });
    return data;
  },
  /**
   * Close and grade an interview.
   *
   * `finalizing: true` means another request already owns the grading — a double-tapped
   * button, or a retry after a timeout. It is not an error and the session is not lost; ask
   * again in a moment and the graded result comes back.
   */
  finishInterview: async (id: string): Promise<{
    session: InterviewSession; scored?: boolean; finalizing?: boolean;
  }> => {
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

  // ── Company preparation (Module 15) ──
  /**
   * How ready the member is for THIS company, alongside eligibility and their role figure.
   *
   * Four separate numbers, deliberately never combined. `fit.readiness` is null when nothing
   * of theirs has been measured against this company's requirements — render that as "not
   * assessed yet", never as 0%.
   */
  companyReadiness: async (slug: string): Promise<CompanyReadinessView> => {
    const { data } = await axios.get(`${BASE}/companies/${slug}/readiness`, { headers: auth() });
    return data;
  },
  companyPreparation: async (slug: string): Promise<CompanyPreparationView> => {
    const { data } = await axios.get(`${BASE}/companies/${slug}/preparation`, { headers: auth() });
    return data;
  },
  companyOverview: async (): Promise<CompanyOverviewView> => {
    const { data } = await axios.get(`${BASE}/company-prep/overview`, { headers: auth() });
    return data;
  },
  setCompanyTargets: async (slugs: string[], primary?: string): Promise<{
    targets: { slug: string; primary: boolean }[]; maxTargets: number; rejected?: string[]; message?: string;
  }> => {
    const { data } = await axios.put(`${BASE}/company-prep/targets`, { slugs, primary }, { headers: auth() });
    return data;
  },

  // ── CareerPilot analytics + health (admin) ──
  /**
   * Every analytics call takes the SAME bounded range the server accepts and returns it in
   * the response. The client never invents a window the API would reject, and never
   * computes a metric of its own — readiness lives on the server.
   */
  analytics: async (
    section: 'overview' | 'skills' | 'progress' | 'engagement' | 'economy' | 'placement',
    range: { from?: string; to?: string } = {},
  ): Promise<AnalyticsEnvelope> => {
    const { data } = await axios.get(`${BASE}/admin/analytics/${section}`, { headers: auth(), params: range });
    return data;
  },
  configHealth: async (): Promise<ConfigHealthView> => {
    const { data } = await axios.get(`${BASE}/admin/health/configuration`, { headers: auth() });
    return data;
  },
  launchReadiness: async (): Promise<LaunchReadinessView> => {
    const { data } = await axios.get(`${BASE}/admin/health/launch-readiness`, { headers: auth() });
    return data;
  },

  // ── Company preparation profiles (admin) ──
  companyProfiles: async (slug: string): Promise<CompanyProfileAdmin> => {
    const { data } = await axios.get(`${BASE}/company-admin/${slug}/profiles`, { headers: auth() });
    return data;
  },
  saveCompanyProfile: async (slug: string, roleKey: string, body: any): Promise<{ profile: CompanyProfileRow }> => {
    const { data } = await axios.put(`${BASE}/company-admin/${slug}/profiles/${roleKey}`, body, { headers: auth() });
    return data;
  },
  publishCompanyProfile: async (slug: string, roleKey: string, profileId: string): Promise<{ profile: CompanyProfileRow }> => {
    const { data } = await axios.post(`${BASE}/company-admin/${slug}/profiles/${roleKey}/publish`, { profileId }, { headers: auth() });
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
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; verify?: 'interview' | 'resume'; done: boolean; answer?: string; feedback?: string }[];
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
export interface PathwayScoreRule { category: string; min?: number | null; max?: number | null; }
/** Who a pathway serves. Within a list = OR, across fields = AND, empty = no constraint. */
export interface PathwayMatch {
  enabled: boolean;
  priority: number;
  goals: string[];
  stages: string[];
  backgrounds: string[];
  scores: PathwayScoreRule[];
  fallback: boolean;
}
export interface PassportPathway { key: string; label: string; description: string; focus: string[]; weekThemes: string[]; stage?: string; match?: PathwayMatch; }
export interface PassportContentDoc {
  _id?: string; tenantId?: string;
  pathways: PassportPathway[];
  missionPools: MissionPool[];
  journeyDays: number;
  /** Off = pathway rules are a draft and the built-in sorting still decides. */
  pathwayRulesActive?: boolean;
}
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
  missions?: { key: string; title: string; detail: string; category: string; type: string; xp: number; link?: string; needsAnswer?: boolean; verify?: 'interview' | 'resume'; done: boolean; answer?: string; feedback?: string }[];
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
    // `onboardingCompleted` decides where the member lands — see Join.tsx.
    return data as { success: boolean; token: string; tenantId: string; user: any; onboardingCompleted?: boolean };
  },
  resend: async (token: string) => {
    const { data } = await axios.post(`${PUB}/resend`, { token });
    return data as { success: boolean; otp: any };
  },
  // Returning-member login (password — free) and OTP-login start (then reuse verify()).
  loginPassword: async (tenant: string, identifier: string, password: string) => {
    const { data } = await axios.post(`${PUB}/login-password`, { tenant, identifier, password });
    return data as { success: boolean; token: string; tenantId: string; user: any; onboardingCompleted?: boolean };
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

// ── Company preparation (Module 15) ──

export type FitStatus =
  | 'NOT_ASSESSED' | 'LIMITED_EVIDENCE' | 'PRIORITY_GAP' | 'NEEDS_WORK' | 'ON_TRACK' | 'STRONG';

export interface CompanySkillFitRow {
  skillKey: string; skillName: string; importance: string; weight: number;
  targetLevel: string; targetScore: number;
  /** Null means never measured. NOT zero — the UI must never render it as a score. */
  studentScore: number | null;
  skillConfidence: string | null;
  evidenceCount: number;
  gapPoints: number | null;
  status: FitStatus;
  countedInFit: boolean;
  skillInactive: boolean;
}

export interface CompanyFitView {
  available: boolean;
  reason?: string;
  message?: string;
  /** Null when nothing is sufficiently assessed. Render "not assessed", never 0%. */
  readiness?: number | null;
  coverage?: number;
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  classification?: string | null;
  classificationLabel?: string | null;
  profileVersion?: number;
  role?: { key: string; matched: boolean };
  summary?: {
    requiredSkills: number; assessedSkills: number; priorityGaps: number; needsWork: number;
    onTrack: number; strong: number; limitedEvidence: number; notAssessed: number;
  };
  skills?: CompanySkillFitRow[];
  strengths?: CompanySkillFitRow[];
  gaps?: CompanySkillFitRow[];
  unknowns?: CompanySkillFitRow[];
}

export interface EligibilityCriterionRow {
  key: string; label: string; required: string;
  studentValue: string | null;
  status: 'MET' | 'NOT_MET' | 'UNKNOWN';
  detail: string;
}

export interface CompanyEligibilityView {
  verdict: 'ELIGIBLE' | 'POTENTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNKNOWN';
  decidedBy: string | null;
  criteria: EligibilityCriterionRow[];
  verified: boolean;
  message: string;
}

export interface CompanyReadinessView {
  company: { slug: string; name: string; type: string; logoUrl: string };
  stage: string | null;
  fit: CompanyFitView;
  eligibility: CompanyEligibilityView;
  roleReadiness: {
    available: boolean; reason?: string; message?: string;
    role?: { key: string; name: string };
    readiness?: number | null; coverage?: number; confidence?: string;
  };
}

export interface CompanyPreparationView {
  company: { slug: string; name: string };
  available: boolean;
  reason?: string;
  message?: string;
  stage?: string | null;
  /** LONG_TERM for a member years from placement; ACTIVE for one preparing now. */
  horizon?: 'LONG_TERM' | 'ACTIVE';
  profileVersion?: number;
  focus: { skillKey: string; skillName: string; current: number | null; target: number; gap: number | null; importance: string; status: string }[];
  validate: { skillKey: string; skillName: string; importance: string; status: string }[];
  strengths?: { skillKey: string; skillName: string; current: number | null }[];
  roundSkills?: { roundKey: string; skillKeys: string[] }[];
  notes?: string;
}

export interface CompanyOverviewRow {
  slug: string; name: string; type: string; logoUrl: string; questionCount: number;
  readiness: number | null;
  classification: string | null;
  classificationLabel: string | null;
  gaps: number | null;
  isTarget: boolean;
  isPrimaryTarget: boolean;
}


// ── CareerPilot analytics (Module 16) ──

/** Whether a figure could be produced at all. `unavailable` is never rendered as 0. */
export type AnalyticsCoverage = 'available' | 'partial' | 'unavailable';

export interface CoverageNote { coverage: AnalyticsCoverage; reason?: string }

export interface AnalyticsEnvelope {
  policyVersion: string;
  range: { from: string; to: string; days: number; timezone: string };
  generatedAt: string;
  data: any;
  coverage: Record<string, AnalyticsCoverage | CoverageNote>;
}

export interface HealthFindingView {
  area: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  code: string;
  message: string;
  action: string;
  meta?: Record<string, any>;
}

export interface ConfigHealthView {
  checkedAt: string;
  findings: HealthFindingView[];
  counts: { error: number; warning: number; info: number };
}

export interface LaunchReadinessView {
  status: 'NOT_READY' | 'READY_WITH_WARNINGS' | 'READY';
  checkedAt: string;
  summary: { error: number; warning: number; info: number };
  areas: {
    area: string; label: string; status: 'PASS' | 'WARNING' | 'FAIL';
    errors: number; warnings: number; findings: HealthFindingView[];
  }[];
  disclaimer: string;
}

export interface CompanyProfileRow {
  id: string; companySlug: string; roleKey: string; version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  skillRequirements: { skillKey: string; importance: string; targetLevel: string; weight: number }[];
  roundSkills: { roundKey: string; skillKeys: string[] }[];
  careerStages: string[];
  sources: { type: string; reference: string; note?: string; verifiedAt?: string | null }[];
  preparationNotes: string;
  effectiveFrom: string | null;
  lastReviewedAt: string | null;
  publishedAt: string | null;
  daysSinceReview: number | null;
  reviewDue: boolean;
}

export interface CompanyProfileAdmin {
  company: { slug: string; name: string };
  profiles: CompanyProfileRow[];
  roles: { key: string; name: string }[];
  /** The canonical catalogue. The editor picks from this — it never accepts a typed key. */
  skills: { key: string; name: string }[];
  rounds: { key: string; label: string }[];
  importanceOptions: string[];
  targetLevelOptions: string[];
  defaultWeights: Record<string, number>;
}

export interface CompanyOverviewView {
  locked?: boolean;
  priceInr?: number;
  role?: { key: string } | null;
  stage?: string | null;
  maxTargets?: number;
  companies?: CompanyOverviewRow[];
}
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

/** One step of the drop-off funnel, with what to do about the people in it. */
export interface FunnelStage {
  key: string; label: string; meaning: string; action: string;
  /** 1 is the warmest lead — closest to paying. */
  heat: number;
  count: number;
}
export interface FunnelTotals { members: number; paid: number; revenueInr: number; unverifiedShare: number; }
export interface FunnelMember {
  id: string; name: string; email: string; phone: string; stage: string;
  /** Days since they last did anything. How cold the lead is. */
  stuckDays: number;
  joinedAt: string; lastTouch: string;
  careerScore?: number | null; pathway?: string | null; pendingAmountInr?: number;
}

/** One authored task within a curriculum day. */
export interface CurriculumItem {
  title: string; detail: string; type: string; xp: number; link?: string; category?: string;
}
export interface CurriculumDay { day: number; theme?: string; items: CurriculumItem[]; }
export interface CurriculumDoc {
  pathwayKey: string; days: CurriculumDay[]; aiDraftedAt?: string | null; journeyDays: number;
}
export interface CurriculumTrack {
  key: string; label: string; variants: string[]; days: number; journeyDays: number;
}

/**
 * The normalized answer to "who is this student right now?".
 *
 * `derived` is resolved by the server on every read. Nothing in the client recomputes
 * stage, background or months remaining — a second implementation in React is how the
 * two would come to disagree.
 */
export interface CareerContext {
  tenantId: string;
  studentId: string;
  education: {
    program: string | null; degree: string | null; branch: string | null;
    currentAcademicYear: string | null;
    graduationYear: number | null; graduationMonth: number | null;
    collegeName: string | null; university: string | null;
  };
  location: { country: string | null; state: string | null; city: string | null };
  career: {
    domain: string;
    primaryRole: string;
    secondaryRole: string | null;
    careerGoal: string | null;
    /** What they want to work in. */
    preferredProgrammingLanguages: string[];
    preferredTechnologies: string[];
    /** What they already know, from StudentProfile. Read-only. */
    knownProgrammingLanguages: string[];
  };
  availability: { minutesPerDay: number | null; daysPerWeek: number | null };
  derived: {
    stage: string | null; background: string | null;
    monthsToGraduation: number | null; computedAt: string;
  };
  status: {
    onboardingCompleted: boolean; contextVersion: number;
    missing: string[]; completedAt: string | null;
  };
}


/** One required skill compared with what the student has demonstrated. */
export interface ReadinessSkill {
  skillKey: string;
  skillName: string;
  importance: string;
  targetLevel: string;
  targetScore: number;
  /** Null when never measured — never 0, which would assert a failure we did not observe. */
  studentScore: number | null;
  skillConfidence: string | null;
  evidenceCount: number;
  gapPoints: number | null;
  status: string;
}

/** Readiness is unavailable for distinct, differently-fixable reasons. */
export interface RoleReadinessUnavailable {
  available: false;
  reason: 'ROLE_NOT_SELECTED' | 'ROLE_BLUEPRINT_NOT_READY' | 'NO_EVIDENCE';
  message: string;
  role?: { key: string; name?: string };
}

export interface RoleReadinessAvailable {
  available: true;
  role: { key: string; name: string };
  /** Null when nothing is sufficiently measured — not 0, which would assert unreadiness. */
  readiness: number | null;
  /** How much of the role has trustworthy evidence. Always shown beside readiness. */
  coverage: number;
  confidence: string;
  summary: {
    requiredSkills: number; assessedSkills: number;
    priorityGaps: number; needsWork: number; onTrack: number; strong: number;
    limitedEvidence: number; notAssessed: number;
    essentialTotal: number; essentialAssessed: number;
  };
  skills: ReadinessSkill[];
  topGaps: ReadinessSkill[];
  strengths: ReadinessSkill[];
  assessmentNeeded: ReadinessSkill[];
}

export type RoleReadinessResponse = RoleReadinessAvailable | RoleReadinessUnavailable;

/** One skill as the student's own evidence describes it. Score and confidence are separate. */
export interface SkillDnaRow {
  skillKey: string;
  skillName: string;
  /** 0-100, weighted performance across observations. */
  score: number;
  /** How much evidence sits behind the score — NOT how good the student is. */
  confidence: string;
  evidenceCount: number;
  /** Distinct questions; repeats of one item are weaker evidence than several. */
  distinctItems: number;
  lastEvidenceAt: string | null;
  skillActive: boolean;
}

/** A generated paper's shape and chosen items. Diagnostic — nothing is persisted. */
export interface AssessmentPreview {
  ok: boolean;
  message?: string;
  context: {
    name?: string; stage: string; roleKey: string; discovery: boolean;
    policy: string; policyKey?: string; policyVersion?: number; blueprintVersion?: number;
  };
  specification?: {
    skillCoverage: Record<string, number>;
    difficultyCoverage: Record<string, number>;
    totalPoints: number;
  };
  report?: {
    requestedSlots: number; filled: number; exactMatches: number;
    difficultyFallbacks: number; repeatedFromPreviousAttempt: number;
  };
  items?: {
    order: number; skillKey: string; difficulty: string;
    servedDifficulty: string | null; reason: string; sourceType: string; text: string;
  }[];
  /** Present when generation failed for want of mapped evidence. */
  shortfalls?: { skillKey: string; difficulty: string; wanted: number; got: number }[];
}

export interface AssessmentPolicyRow {
  key: string; stage: string; label: string; version: number;
  skillSlots: number; maxSkills: number;
  difficultyMix: { EASY: number; MEDIUM: number; HARD: number };
  prerequisiteDepth: number;
  allowedSkillDifficulty: string[];
}

/** One skill an assessment item measures. Joined with the skill for display. */
export interface ItemEvidenceRow {
  skillKey: string;
  contribution: string;
  active: boolean;
  skillName: string;
  skillActive: boolean;
  skillAssessable: boolean;
  /** The key resolves to nothing in the skill graph — surfaced so it can be repaired. */
  missing: boolean;
}

/** A piece of assessment content, normalised across the four content families. */
export interface EvidenceItem {
  sourceType: string;
  sourceId: string;
  sourceParentId?: string;
  text: string;
  itemType: string;
  /** Normalised on read from each family's own scale; null where none exists. */
  difficulty: string | null;
  /** The source's own tag. NOT a skill. */
  sourceTag: string | null;
  evidence: ItemEvidenceRow[];
  primarySkillKey: string | null;
  stale: boolean;
}

export interface MappableSkill {
  key: string; name: string; aliases: string[];
  parentKey: string | null; difficulty: string;
}

export interface SkillCoverageRow {
  skillKey: string; skillName: string;
  active: boolean; assessable: boolean;
  total: number; primary: number;
  byType: Record<string, number>;
}

/** One skill a role expects, with the skill's own details joined in for display. */
export interface BlueprintRequirement {
  skillKey: string;
  importance: string;
  weight: number;
  targetLevel: string;
  active: boolean;
  displayOrder: number;
  note?: string;
  /** Joined from CareerSkill. Never stored on the requirement — the key is the truth. */
  skillName: string;
  skillDescription: string;
  skillNodeType: string;
  skillDifficulty: string;
  parentKey: string | null;
  /** False once Module 3 retires the skill; the requirement itself survives. */
  skillActive: boolean;
  /** The key resolves to nothing at all — surfaced rather than hidden. */
  missing: boolean;
}

export interface ResolvedBlueprint {
  roleKey: string;
  roleName: string;
  roleActive: boolean;
  domainKey: string;
  published: boolean;
  version: number;
  requirements: BlueprintRequirement[];
  summary: {
    total: number;
    active: number;
    byImportance: Record<string, number>;
    totalWeight: number;
    /** Requirements pointing at a deactivated or missing skill. */
    stale: number;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface BlueprintRoleRow {
  key: string;
  name: string;
  active: boolean;
  studentSelectable: boolean;
  blueprint: { total: number; active: number; published: boolean };
}

/**
 * A canonical skill. `parentKey` is where it sits in the taxonomy; `prerequisiteKeys` is
 * what must be learned first — a different relationship, often pointing across branches.
 */
export interface AdminSkill {
  id: string;
  key: string;
  domainKey: string;
  name: string;
  shortName: string;
  description: string;
  /** GROUP organises; SKILL is the thing that gets measured. */
  nodeType: string;
  parentKey: string | null;
  prerequisiteKeys: string[];
  difficulty: string;
  aliases: string[];
  displayOrder: number;
  active: boolean;
  assessable: boolean;
  learnable: boolean;
  /** Part of the shipped taxonomy — editable and deactivatable, never deletable. */
  systemSkill: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

/** The same skill, nested for the tree view. */
export interface SkillNode {
  id: string;
  key: string;
  name: string;
  nodeType: string;
  difficulty: string;
  description: string;
  parentKey: string | null;
  prerequisiteKeys: string[];
  aliases: string[];
  displayOrder: number;
  active: boolean;
  assessable: boolean;
  learnable: boolean;
  systemSkill: boolean;
  children: SkillNode[];
}

/**
 * A career role as ADMIN sees it. The student-facing shape is deliberately smaller —
 * see CareerContextOptions.roles, which carries no configuration metadata.
 */
export interface AdminCareerRole {
  id: string;
  key: string;
  domainKey: string;
  name: string;
  shortName: string;
  description: string;
  studentDescription: string;
  iconKey: string;
  aliases: string[];
  displayOrder: number;
  active: boolean;
  studentSelectable: boolean;
  /** Seeded by the product; cannot be deleted, only hidden. */
  systemRole: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * Whether a personalized assessment can be started, decided entirely server-side.
 *
 * `reasonCode` is a stable token so the UI can pick a state without parsing the message;
 * `message` is the sentence to show. Neither carries internal detail.
 */
export interface AssessmentAvailability {
  assessmentAvailable: boolean;
  reasonCode?:
    | 'ACCOUNT_NOT_FOUND'
    | 'CONTEXT_INCOMPLETE'
    | 'STAGE_UNKNOWN'
    | 'ROLE_NOT_CONFIGURED'
    | 'BLUEPRINT_UNPUBLISHED'
    | 'BLUEPRINT_EMPTY'
    | 'SKILLS_NOT_CONFIGURED'
    | 'QUESTION_POOL_EMPTY';
  message?: string;
  /** The member has no chosen role and would sit the broad discovery paper. */
  discovery: boolean;
  /** An attempt is already open — the CTA resumes rather than starts. */
  inProgress: boolean;
  /** They have already submitted one — offering "Start" as the default creates a second. */
  alreadyCompleted?: boolean;
}

/** One stage's paper shape, as the admin screen edits it. */
export interface EditablePolicy {
  stage: string;
  label: string;
  defaults: { skillSlots: number; maxSkills: number; difficultyMix: { EASY: number; MEDIUM: number; HARD: number } };
  skillSlots: number;
  maxSkills: number;
  difficultyMix: { EASY: number; MEDIUM: number; HARD: number };
  /** 0 = untimed, which is the shipped behaviour. */
  timeLimitMinutes: number;
  overridden: boolean;
  /** Read-only context — what this stage is allowed to ask about. */
  allowedSkillDifficulty: string[];
  minItemsPerSkill: number;
  maxItemsPerSkill: number;
}

export interface PolicyBounds {
  skillSlots: { min: number; max: number };
  maxSkills: { min: number; max: number };
  timeLimitMinutes: { min: number; max: number };
}

/** Served alongside the context so the UI never hardcodes a list the server would reject. */
export interface CareerContextOptions {
  domains: { key: string; label: string }[];
  /** From admin configuration. `iconKey` is optional and purely presentational. */
  roles: { key: string; label: string; blurb: string; iconKey?: string }[];
  languages: string[];
  availability: { minutes: number; label: string }[];
  /** Paired with `availability` — the roadmap needs both to size weekly capacity. */
  daysPerWeek: { days: number; label: string }[];
  programs: string[];
  academicYears: string[];
  stages: { key: string; label: string; blurb: string }[];
}

export interface CareerContextPatch {
  domain?: string;
  primaryRole?: string;
  secondaryRole?: string | null;
  preferredProgrammingLanguages?: string[];
  minutesPerDay?: number;
  daysPerWeek?: number;
  program?: string; degree?: string; branch?: string;
  currentAcademicYear?: string; graduationYear?: number | null;
  complete?: boolean;
}

export interface RuleVocabulary {
  goals: string[];
  stages: { key: string; label: string; who: string }[];
  backgrounds: { key: string; label: string }[];
  categories: { key: string; label: string }[];
}
export interface RulePreviewRow {
  key: string; label: string; enabled: boolean; fallback: boolean; priority: number;
  members: number;
  samples: { name: string; email: string; why: string }[];
}
export interface RulePreview {
  total: number;
  errors: string[];
  warnings: string[];
  /** Whether these numbers describe what happens, or simulate what would. */
  active: boolean;
  /** Members reaching the catch-all, i.e. accounted for by no rule. */
  viaFallback: number;
  unmatched: number;
  /** How many would land somewhere other than where they are today. */
  moved: number;
  rows: RulePreviewRow[];
}
export interface ReevaluateResult {
  applied: boolean;
  total: number;
  changeCount: number;
  changes?: { id: string; name: string; email: string; from: string | null; to: string; toLabel: string }[];
}

// ── 90-day roadmap (Module 9) ──────────────────────────────────────────────────
//
// A plan, not a reading. Unlike readiness it is stored, so what a member was asked to do
// last week survives this week's evidence changing.

export interface RoadmapObjective {
  skillKey: string;
  skillName: string;
  workType: 'LEARN' | 'PRACTICE' | 'ASSESS' | 'REVIEW';
  plannedMinutes: number;
  phase: string;
  week: number;
  sequence: number;
  reasonCode: 'PRIORITY_GAP' | 'NEEDS_WORK' | 'PREREQUISITE' | 'ASSESSMENT_NEEDED'
    | 'LIMITED_EVIDENCE' | 'MAINTENANCE' | 'VALIDATION';
  targetLevel: string;
  /** Built deterministically from the numbers — never generated, always safe to show. */
  explanation: string;
  origin: 'GENERATED' | 'MANUAL';
}

export interface RoadmapPhase {
  key: string; title: string; blurb: string;
  fromWeek: number; toWeek: number; fromDay: number; toDay: number;
  plannedMinutes: number;
}

export interface SkillRoadmap {
  id: string;
  role: { key: string; name: string };
  policyVersion: string;
  roadmapVersion: number;
  startDate: string;
  endDate: string;
  roadmapDays: number;
  weekCount: number;
  generatedAt: string;
  planningConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  capacity: {
    minutesPerDay: number; daysPerWeek: number;
    weeklyCapacityMinutes: number; plannedMinutes: number;
  };
  basis: {
    readiness: number | null; coverage: number;
    careerStage: string | null; entitlementLimited: boolean;
  };
  phases: RoadmapPhase[];
  objectives: RoadmapObjective[];
  deferred: { skillKey: string; skillName: string; reasonCode: string; reason: string }[];
  summary: { objectives: number; deferred: number; skills: number };
}

export interface SkillRoadmapAvailable {
  available: true;
  currentDay: number;
  currentWeek: number;
  completed: boolean;
  outdated: boolean;
  outdatedReasons: ('ROLE_CHANGED' | 'COMMITMENT_CHANGED' | 'BLUEPRINT_CHANGED')[];
  roadmap: SkillRoadmap;
  created?: boolean;
}

export interface SkillRoadmapUnavailable {
  available: false;
  reason: 'CAREER_CONTEXT_INCOMPLETE' | 'ROLE_NOT_SELECTED' | 'ROLE_BLUEPRINT_NOT_READY'
    | 'NO_READINESS_DATA' | 'MEMBERSHIP_REQUIRED';
  message: string;
  missing?: string[];
  role?: { key: string; name?: string };
}

export type SkillRoadmapResponse = SkillRoadmapAvailable | SkillRoadmapUnavailable;

// ── Personalised assessment + daily execution (Module 10) ─────────────────────

/** One question as the student sees it. There is no correct answer in this shape. */
export interface SkillAssessmentItem {
  order: number;
  sourceType: string;
  sourceId: string;
  text: string;
  itemType: string;
  /** The code the question is about — debug / predict-output / complete-code items. */
  codeSnippet?: string;
  language?: string;
  options?: { id: string; text: string }[];
  points: number;
  /** What was saved earlier, so a resumed paper comes back filled in. */
  response?: any;
}

export interface SkillAssessment {
  id: string;
  attemptNumber: number;
  /** 0 = untimed. */
  timeLimitMinutes?: number;
  /** Server-computed, so a reload resumes with the time actually left. */
  secondsRemaining?: number | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';
  startedAt: string;
  totalQuestions: number;
  items: SkillAssessmentItem[];
}

export interface DailyMission {
  key: string;
  roadmapId: string;
  objectiveSequence: number;
  skillKey: string;
  skillName: string;
  workType: 'LEARN' | 'PRACTICE' | 'ASSESS' | 'REVIEW';
  plannedMinutes: number;
  title: string;
  explanation: string;
  reasonCode: string;
  resourceState: 'READY' | 'RESOURCE_NOT_CONFIGURED';
  resource?: { type: string; id: string; title: string; route: string };
  done: boolean;
}

export interface DailyPlanAvailable {
  available: true;
  policyVersion: string;
  roadmapId: string;
  date: string;
  roadmapDay: number;
  roadmapWeek: number;
  weekCount: number;
  capacity: { minutesPerDay: number; plannedMinutes: number };
  missions: DailyMission[];
  /** Progress through the PLAN. Deliberately not a readiness figure. */
  progress: { plannedMinutes: number; completedMinutes: number; percent: number };
  week: { plannedMinutes: number; completedMinutes: number };
  unmappedObjectives: number;
}

export interface DailyPlanUnavailable {
  available: false;
  reason: 'ROADMAP_REQUIRED' | 'ROADMAP_COMPLETED' | 'MEMBERSHIP_REQUIRED';
  message: string;
}

export type DailyPlanResponse = DailyPlanAvailable | DailyPlanUnavailable;

// ── Gamification (Module 11) ─────────────────────────────────────────────────
//
// XP is the ENGAGEMENT score: non-redeemable, and never a statement about ability. Coins
// remain the reward currency on their own engine; nothing here converts between them.

export interface GamificationBadgeView {
  key: string;
  name: string;
  description: string;
  iconKey: string;
  earned: boolean;
  awardedAt: string | null;
}

export interface RankView {
  available: boolean;
  /** Null when unavailable — never 0, which would read as "last". */
  rank: number | null;
  participants?: number;
  reason?: string;
}

export interface GamificationSummary {
  xp: number;
  level: { level: number; title: string; nextLevel: number; nextTitle: string; pct?: number };
  streak: number;
  longestStreak: number;
  badges: GamificationBadgeView[];
  earnedCount: number;
  ranks: Record<string, RankView>;
}

export interface XpHistoryEntry {
  eventKey: string;
  amount: number;
  at: string;
  sourceType: string;
}

export interface ScopedLeaderboardRow {
  rank: number;
  studentId: string;
  name: string;
  college: string | null;
  xp: number;
  me: boolean;
}

/** Distinct from the legacy tenant-only LeaderboardResponse above, which is untouched. */
export type ScopedLeaderboardResponse =
  | {
      available: true;
      scope: string; period: string;
      entries: ScopedLeaderboardRow[];
      myRank: number | null;
      myXp: number;
      participantCount: number;
    }
  | { available: false; scope: string; period: string; reason: string; myRank: null };

// ── Rewards (Module 12) ──────────────────────────────────────────────────────
//
// COINS buy rewards; XP never does. The business cost of a reward is deliberately absent
// from every shape here — it is not the student's business.

export interface RewardCard {
  key: string;
  name: string;
  description: string;
  type: string;
  iconKey: string;
  imageUrl?: string;
  coinCost: number;
  stockMode: string;
  stockAvailable: number | null;
  availableUntil?: string;
  instructions?: string;
  eligibility: {
    eligible: boolean;
    reasons: string[];
    messages: string[];
    coinsShort: number;
    remainingStudentLimit: number | null;
  };
}

export interface RewardCatalogue {
  rewards: RewardCard[];
  student: {
    coins: number;
    coinBalance: number;
    expiredCoins: number;
    minRedemption: number;
    xp: number;
    level: number;
    canSpend: boolean;
  };
}

export interface RedemptionRow {
  id: string;
  rewardKey: string;
  rewardName: string;
  rewardType: string;
  coinCost: number;
  status: 'PENDING' | 'RESERVED' | 'FULFILLED' | 'CANCELLED';
  requestedAt: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  fulfillmentReference?: string;
  refunded: number;
}

// ── Skill check-in and adaptive replanning (Module 13) ───────────────────────
//
// A check-in re-measures a few skills and reports what changed. It never moves the roadmap:
// that happens only when the student calls replanMySkillRoadmap().

export interface ReassessmentStatus {
  eligible: boolean;
  blockers: string[];
  triggers: string[];
  lastCompletedAt: string | null;
  nextEligibleAt: string | null;
  cooldownDays: number;
  targetSkills: { skillKey: string; skillName: string }[];
  estimatedQuestions: number;
  activeAttemptId: string | null;
  message: string;
}

export interface SkillDeltaView {
  skillKey: string;
  skillName: string;
  before: number | null;
  after: number | null;
  /** Null when one side was never measured — an unknown becoming known is not a delta. */
  delta: number | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  materialReasons: string[];
}

export interface ReassessmentResult {
  ok: boolean;
  message?: string;
  skills?: SkillDeltaView[];
  readinessBefore?: number | null;
  readinessAfter?: number | null;
  readinessDelta?: number | null;
  targetSkillKeys?: string[];
  completedAt?: string;
}

export interface ReplanStatusView {
  recommendation: 'NONE' | 'SUGGESTED' | 'REQUIRED';
  structuralReasons: string[];
  affectedSkills: SkillDeltaView[];
  currentReadiness: number | null;
  roadmapBaselineReadiness: number | null;
  readinessDelta: number | null;
  hasActiveRoadmap: boolean;
  roadmapCompleted: boolean;
  message: string;
}

// ── Placement readiness (Module 14) ──

export type ClaimStatus =
  | 'VERIFIED' | 'NEEDS_VALIDATION' | 'CLAIM_EXCEEDS_EVIDENCE' | 'MISSING_FROM_RESUME';

export interface ResumeClaimView {
  skillKey: string;
  skillName: string;
  status: ClaimStatus;
  message: string;
  /** Null means never measured — which is not the same as measured at zero. */
  measuredScore: number | null;
  requiredByRole: boolean;
}

export interface ResumeReadinessView {
  available: boolean;
  reason?: 'NO_RESUME' | 'ROLE_NOT_SELECTED' | 'ROLE_BLUEPRINT_NOT_READY';
  message?: string;
  policyVersion?: string;
  role?: { key: string; name: string };
  readiness?: number;
  dimensions?: { dimension: string; score: number; detail: string }[];
  claims?: ResumeClaimView[];
  recommendations?: { priority: 'CRITICAL' | 'IMPORTANT' | 'OPTIONAL'; action: string; skillKey?: string }[];
}

export interface InterviewReadinessView {
  available: boolean;
  reason?: string;
  message?: string;
  interviewId?: string;
  role?: string;
  completedAt?: string;
  readiness?: number;
  /** Only the dimensions the evaluator actually measured. A missing one is missing, not zero. */
  dimensions?: { dimension: string; score: number }[];
  perSkill?: { skillKey: string; area: string; score: number }[];
}

export interface PlacementReadinessView {
  policyVersion: string;
  skill: {
    available: boolean;
    reason?: string;
    role?: { key: string; name: string };
    readiness?: number | null;
    coverage?: number;
    confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  resume: ResumeReadinessView;
  interview: InterviewReadinessView;
}

export interface InterviewCoverageView {
  ok: boolean;
  message?: string;
  role?: { key: string; name: string };
  targets?: { skillKey: string; skillName: string; slots: number; bands: ('core' | 'gaps' | 'strengths')[] }[];
}

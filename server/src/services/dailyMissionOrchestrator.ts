import CareerRoadmap, { ICareerRoadmap } from '../models/CareerRoadmap';
import CareerSkillResource, { resourceServes, ResourceMember, MATERIAL_TYPES } from '../models/CareerSkillResource';
import StudentSkillProfile from '../models/StudentSkillProfile';
import PassportProgress from '../models/PassportProgress';
import PassportConfig from '../models/PassportConfig';
import User from '../models/User';
import { isEntitled } from './passportEntitlementService';
import { findProblem, findCareerPilotProblem } from './passportPracticeService';
import { ymd } from './passportMissionService';
import { XpRule } from '../models/GamificationModels';
import { MISSION_ORCHESTRATION_VERSION, MAX_MISSIONS_PER_DAY, MIN_MISSION_MINUTES, assessmentRouteForSkill, practiceRoute, materialRoute, dailySliceOf, dailyBudget, MissionResourceState, DailyPlanUnavailable } from '../data/missionOrchestrationPolicy';

/** Daily Mission Engine: roadmap=WHAT, this service=WHEN, targeted resource=HOW. */
export interface MissionResource { type: string; id: string; title: string; route: string; xp?: number | null; }
export interface DailyMission { key: string; roadmapId: string; objectiveSequence: number; skillKey: string; skillName: string; workType: string; plannedMinutes: number; title: string; explanation: string; reasonCode: string; resourceState: MissionResourceState; resource?: MissionResource; done: boolean; }
export interface DailyPlanAvailable { available: true; policyVersion: string; roadmapId: string; date: string; roadmapDay: number; roadmapWeek: number; weekCount: number; capacity: { minutesPerDay: number; plannedMinutes: number }; missions: DailyMission[]; progress: { plannedMinutes: number; completedMinutes: number; percent: number }; week: { plannedMinutes: number; completedMinutes: number }; unmappedObjectives: number; outdated: boolean; }
export interface DailyPlanUnavailableResult { available: false; reason: DailyPlanUnavailable; message: string; }
export type DailyPlanOutcome = DailyPlanAvailable | DailyPlanUnavailableResult;

/**
 * Narrow an outcome to the unavailable case.
 *
 * A plain `if (!plan.available)` reads better and does not compile here: this project runs
 * with `strictNullChecks: false`, and without it TypeScript will not narrow a union by a
 * NEGATED boolean discriminant — while `plan.available ? ... : ...` in the same file
 * narrows fine, which is what makes the failure look arbitrary. An explicit predicate works
 * under either setting.
 */
/**
 * One plan, in the shape the member screens already speak.
 *
 * Home and the missions endpoint each mapped the plan themselves, which is how two views of
 * the same day drift apart: a field added to one is missing from the other, and nobody sees
 * it until a student reports that Home and the missions list disagree. Written once here so
 * they cannot.
 *
 * `xp` falls back to 0 rather than a guess. The gamification rule decides the real amount at
 * completion time; a made-up number on the card would be a promise the ledger does not keep.
 */
export interface MemberFacingMission {
  key: string; category: string; icon: string; title: string; detail: string;
  xp: number; link?: string; done: boolean;
  skillKey: string; skillName: string; workType: string;
  plannedMinutes: number; reasonCode: string; resourceState: string;
  resource?: MissionResource;
}

const WORK_ICON: Record<string, string> = {
  LEARN: '📘', PRACTICE: '💻', ASSESS: '✓', REVIEW: '↻',
};

export function toMemberMissions(plan: DailyPlanOutcome): MemberFacingMission[] {
  if (planUnavailable(plan)) return [];
  return plan.missions.map(m => ({
    key: m.key,
    category: m.skillKey,
    icon: WORK_ICON[m.workType] || '•',
    title: m.title,
    detail: m.explanation,
    xp: m.resource?.xp ?? 0,
    link: m.resource?.route,
    done: m.done,
    skillKey: m.skillKey,
    skillName: m.skillName,
    workType: m.workType,
    plannedMinutes: m.plannedMinutes,
    reasonCode: m.reasonCode,
    resourceState: m.resourceState,
    resource: m.resource,
  }));
}

export const planUnavailable = (p: DailyPlanOutcome): p is DailyPlanUnavailableResult => !p.available;
const WORK_LABEL: Record<string, string> = { LEARN: 'Learn', PRACTICE: 'Practice', ASSESS: 'Check', REVIEW: 'Review' };
const slotKey = (skillKey: string, workType: string): string => `${String(skillKey).toUpperCase()}:${String(workType).toUpperCase()}`;
export const missionKey = (roadmapId: string, sequence: number, date: string): string => `cp:${roadmapId}:${sequence}:${date}`;
export interface SelectableObjective { sequence: number; skillKey: string; skillName: string; workType: string; plannedMinutes: number; week: number; reasonCode: string; explanation: string; prerequisiteFor?: string; }
export interface SelectionInput { roadmapId: string; date: string; week: number; objectives: SelectableObjective[]; minutesPerDay: number; daysPerWeek: number; creditedBefore: Map<number, number>; completedToday: Set<string>; resources: Map<string, MissionResource>;
  /** What CAREER_MISSION_COMPLETED pays, so the card shows what the ledger will award. */
  missionXp: number; }

export function selectTodaysMissions(input: SelectionInput): DailyMission[] {
  const thisWeek = input.objectives.filter(o => o.week === input.week).slice().sort((a, b) => a.sequence - b.sequence);
  const creditedOf = (seq: number) => input.creditedBefore.get(seq) || 0; const isSettled = (o: SelectableObjective) => creditedOf(o.sequence) >= o.plannedMinutes;
  const budget = dailyBudget(input.minutesPerDay); const chosen: DailyMission[] = []; let spent = 0;
  for (const o of thisWeek) {
    if (chosen.length >= MAX_MISSIONS_PER_DAY) break; if (isSettled(o)) continue;
    if (thisWeek.some(p => p.sequence < o.sequence && p.prerequisiteFor === o.skillKey && !isSettled(p))) continue;
    const slice = dailySliceOf(o.plannedMinutes, creditedOf(o.sequence), input.daysPerWeek); if (slice < MIN_MISSION_MINUTES) continue;
    const remainingBudget = budget - spent; if (remainingBudget < MIN_MISSION_MINUTES) break;
    const minutes = Math.min(slice, remainingBudget); const key = missionKey(input.roadmapId, o.sequence, input.date);
    // WHAT THE LEDGER WILL ACTUALLY PAY, not zero.
    //
    // The ASSESS resource is built here and carried no xp, so every mission card read
    // `resource.xp ?? 0` and printed "+0 XP" — while completing it awarded 10 from the
    // CAREER_MISSION_COMPLETED rule. Students were told nothing and paid ten, which reads
    // as a broken screen and quietly undersells the only reward the product offers.
    //
    // The rule's amount is used wherever a resource has no override of its own, so the
    // number on the card is the number that lands.
    const mapped = input.resources.get(slotKey(o.skillKey, o.workType));
    const resource = o.workType === 'ASSESS'
      ? { type: 'assessment', id: `personalized:${o.skillKey}`, title: `${o.skillName} check`, route: assessmentRouteForSkill(o.skillKey), xp: input.missionXp }
      : (mapped ? { ...mapped, xp: mapped.xp ?? input.missionXp } : undefined);
    chosen.push({ key, roadmapId: input.roadmapId, objectiveSequence: o.sequence, skillKey: o.skillKey, skillName: o.skillName, workType: o.workType, plannedMinutes: minutes, title: `${o.skillName} — ${WORK_LABEL[o.workType] || o.workType}`, explanation: o.explanation, reasonCode: o.reasonCode, resourceState: resource ? 'READY' : 'RESOURCE_NOT_CONFIGURED', resource, done: input.completedToday.has(key) }); spent += minutes;
  }
  return chosen;
}
const dayNumberFrom = (start: Date, now: Date): number => Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1;

/**
 * First eligible row by admin priority wins. Eligibility is the intersection of the
 * resource's year/course/branch/role/stage/language audience and its Skill DNA score window.
 */
async function resolveResources(tenantId: string, skillKeys: string[], member: ResourceMember, scores: Map<string, number>): Promise<Map<string, MissionResource>> {
  const out = new Map<string, MissionResource>(); const unique = [...new Set(skillKeys.map(k => String(k).toUpperCase()))]; if (!unique.length) return out;
  const rows = await CareerSkillResource.find({ tenantId, skillKey: { $in: unique }, active: true }).sort({ priority: 1, resourceId: 1, _id: 1 }).lean() as any[];
  for (const r of rows) {
    const resourceSkill = String(r.skillKey).toUpperCase(); const score = scores.has(resourceSkill) ? scores.get(resourceSkill)! : null; if (!resourceServes(r, member, score)) continue;
    let resolved: MissionResource | null = null;
    if (r.resourceType === 'practice') {
      const problem = findProblem(String(r.resourceId)); if (!problem) continue;
      resolved = { type: 'practice', id: String(r.resourceId), title: problem.title, route: practiceRoute(String(r.resourceId)), xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (r.resourceType === 'problem') {
      const hit = await findCareerPilotProblem(tenantId, String(r.resourceId)); if (!hit) continue;
      // `problem` is another catalogue source for the same member Practice workspace. Keep
      // the public resource type as practice because the client API contract intentionally
      // exposes only assessment/practice destinations today.
      resolved = { type: 'practice', id: String(r.resourceId), title: hit.problem.title, route: practiceRoute(String(r.resourceId)), xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (r.resourceType === 'mock_interview') {
      resolved = { type: 'mock_interview', id: String(r._id), title: r.title || 'Mock interview', route: '/careerpilot/interview', xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (MATERIAL_TYPES.includes(r.resourceType)) {
      /**
       * A MATERIAL NO LONGER NEEDS TO LIVE SOMEWHERE ELSE.
       *
       * This required a URL and skipped anything without one — so everything the Concept
       * Bank's editor writes (the notes, the steps, the term breakdown, the self-checks,
       * the uploaded files) was discarded, because all of it lives in `body`. An admin
       * could author a complete lesson that no student could ever be shown, and the
       * mission fell through to "work on this in your own time".
       *
       * An external URL still wins where one is set: that is an admin pointing somewhere
       * deliberately, and second-guessing it would be worse than obeying it. Otherwise the
       * material opens in the member's own viewer, which renders what they wrote.
       */
      const url = String(r.url || '').trim();
      const hasBody = !!(r.body && (
        String(r.body.overview || '').trim()
        || String(r.body.notes || '').trim()
        || String(r.body.videoUrl || '').trim()
        || String(r.body.videoKey || '').trim()
        || (r.body.steps || []).length
        || (r.body.breakdown || []).length
        || (r.body.checks || []).length
        || (r.body.references || []).length
        || (r.body.attachments || []).length
      ));
      // Neither a destination nor content is an empty row, and offering it would be a
      // Start button that opens nothing — the one thing worse than an honest gap.
      if (!url && !hasBody) continue;
      resolved = {
        type: r.resourceType,
        id: String(r._id),
        title: r.title,
        route: url || materialRoute(String(r._id)),
        xp: typeof r.xp === 'number' ? r.xp : null,
      };
    }
    if (!resolved) continue;
    for (const wt of (r.workTypes || [])) { const slot = slotKey(resourceSkill, wt); if (!out.has(slot)) out.set(slot, resolved); }
  }
  return out;
}

export async function getTodaysPlan(tenantId: string, studentId: string, now: Date = new Date()): Promise<DailyPlanOutcome> {
  const [roadmap, user, cfg] = await Promise.all([CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' }).lean() as any, User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any, PassportConfig.findOne({ tenantId }).lean() as any]);
  if (!isEntitled(cfg?.entitlements, user?.passport, 'daily_missions', now)) return { available: false, reason: 'MEMBERSHIP_REQUIRED', message: 'A CareerPilot membership is needed for your daily plan.' };
  if (!roadmap) return { available: false, reason: 'ROADMAP_REQUIRED', message: 'Generate your 90-day roadmap and your daily plan starts from it.' };
  const roadmapDay = Math.max(1, dayNumberFrom(new Date(roadmap.startDate), now)); if (roadmapDay > roadmap.roadmapDays) return { available: false, reason: 'ROADMAP_COMPLETED', message: 'This 90-day plan has finished.' };
  const week = Math.min(roadmap.weekCount, Math.max(1, Math.ceil(roadmapDay / 7))); const date = ymd(now); const roadmapId = String(roadmap._id);
  const objectives: SelectableObjective[] = (roadmap.objectives || []).map((o: any) => ({ sequence: o.sequence, skillKey: o.skillKey, skillName: o.skillName, workType: o.workType, plannedMinutes: o.plannedMinutes, week: o.week, reasonCode: o.reasonCode, explanation: o.explanation, prerequisiteFor: o.prerequisiteFor }));
  const progress: any = await PassportProgress.findOne({ tenantId, studentId }).lean(); const completions = (progress?.completed || []).filter((c: any) => c.careerpilot && c.careerpilot.roadmapId === roadmapId);
  const creditedBefore = new Map<number, number>(); const completedToday = new Set<string>(); let completedMinutes = 0;
  for (const c of completions) { const cp = c.careerpilot; completedMinutes += cp.minutes || 0; if (String(c.key).endsWith(`:${date}`)) { completedToday.add(c.key); continue; } creditedBefore.set(cp.objectiveSequence, (creditedBefore.get(cp.objectiveSequence) || 0) + (cp.minutes || 0)); }
  const weekObjectives = objectives.filter(o => o.week === week); const weekSkillKeys = [...new Set(weekObjectives.map(o => String(o.skillKey).toUpperCase()))];
  const skillRows = await StudentSkillProfile.find({ tenantId, studentId, skillKey: { $in: weekSkillKeys } }).select('skillKey score').lean() as any[]; const scores = new Map<string, number>(skillRows.map(s => [String(s.skillKey).toUpperCase(), Number(s.score)]));
  const p = user?.passport || {}; const member: ResourceMember = { yearOfStudy: p.yearOfStudy, degree: p.degree, program: p.program, branch: p.branch, primaryRole: p.primaryRole, secondaryRole: p.secondaryRole, stage: p.stage, preferredLanguages: p.preferredLanguages || [] };
  const resources = await resolveResources(tenantId, weekSkillKeys, member, scores);
  /**
   * Read from the same rule the ledger pays from, rather than restated as a constant here.
   * A tenant that re-prices missions in the gamification screen re-prices the card too, and
   * the two cannot drift apart. Falls back to 10 only if the rule row is missing.
   */
  // Never allowed to cost a student their day. A pricing lookup that fails falls back to
  // the default rather than taking the whole plan down with it.
  const xpRule = await XpRule.findOne({ tenantId, eventKey: 'CAREER_MISSION_COMPLETED' })
    .select('xp enabled').lean().catch(() => null) as any;
  const missionXp = xpRule?.enabled === false ? 0 : (typeof xpRule?.xp === 'number' ? xpRule.xp : 10);
  const missions = selectTodaysMissions({ roadmapId, date, week, objectives, minutesPerDay: roadmap.input.minutesPerDay, daysPerWeek: roadmap.input.daysPerWeek, creditedBefore, completedToday, resources, missionXp });
  const weekPlanned = weekObjectives.reduce((n, o) => n + o.plannedMinutes, 0); const weekCompleted = completions.filter((c: any) => weekObjectives.some(o => o.sequence === c.careerpilot.objectiveSequence)).reduce((n: number, c: any) => n + (c.careerpilot.minutes || 0), 0); const totalPlanned = roadmap.capacity?.plannedMinutes || 0;
  return { available: true, policyVersion: MISSION_ORCHESTRATION_VERSION, roadmapId, date, roadmapDay, roadmapWeek: week, weekCount: roadmap.weekCount, capacity: { minutesPerDay: roadmap.input.minutesPerDay, plannedMinutes: missions.reduce((n, m) => n + m.plannedMinutes, 0) }, missions, progress: { plannedMinutes: totalPlanned, completedMinutes, percent: totalPlanned > 0 ? Math.min(100, Math.round((completedMinutes / totalPlanned) * 100)) : 0 }, week: { plannedMinutes: weekPlanned, completedMinutes: weekCompleted }, unmappedObjectives: weekObjectives.filter(o => o.workType !== 'ASSESS' && !resources.has(slotKey(o.skillKey, o.workType))).length, outdated: false };
}
export { CareerRoadmap as _CareerRoadmap };
export type { ICareerRoadmap };

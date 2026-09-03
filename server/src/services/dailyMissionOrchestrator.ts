import CareerRoadmap, { ICareerRoadmap } from '../models/CareerRoadmap';
import CareerSkillResource, { resourceServes, ResourceMember, MATERIAL_TYPES } from '../models/CareerSkillResource';
import StudentSkillProfile from '../models/StudentSkillProfile';
import PassportProgress from '../models/PassportProgress';
import PassportConfig from '../models/PassportConfig';
import User from '../models/User';
import { isEntitled } from './passportEntitlementService';
import { findProblem, findCareerPilotProblem } from './passportPracticeService';
import { ymd } from './passportMissionService';
import { MISSION_ORCHESTRATION_VERSION, MAX_MISSIONS_PER_DAY, MIN_MISSION_MINUTES, assessmentRouteForSkill, practiceRoute, dailySliceOf, dailyBudget, MissionResourceState, DailyPlanUnavailable } from '../data/missionOrchestrationPolicy';

export interface MissionResource { type: string; id: string; title: string; route: string; xp?: number | null; }
export interface DailyMission { key: string; roadmapId: string; objectiveSequence: number; skillKey: string; skillName: string; workType: string; plannedMinutes: number; title: string; explanation: string; reasonCode: string; resourceState: MissionResourceState; resource?: MissionResource; done: boolean; }
export interface DailyPlanAvailable { available: true; policyVersion: string; roadmapId: string; date: string; roadmapDay: number; roadmapWeek: number; weekCount: number; capacity: { minutesPerDay: number; plannedMinutes: number }; missions: DailyMission[]; progress: { plannedMinutes: number; completedMinutes: number; percent: number }; week: { plannedMinutes: number; completedMinutes: number }; unmappedObjectives: number; outdated: boolean; }
export interface DailyPlanUnavailableResult { available: false; reason: DailyPlanUnavailable; message: string; }
export type DailyPlanOutcome = DailyPlanAvailable | DailyPlanUnavailableResult;
const WORK_LABEL: Record<string, string> = { LEARN: 'Learn', PRACTICE: 'Practice', ASSESS: 'Check', REVIEW: 'Review' };
const slotKey = (skillKey: string, workType: string): string => `${String(skillKey).toUpperCase()}:${String(workType).toUpperCase()}`;
export const missionKey = (roadmapId: string, sequence: number, date: string): string => `cp:${roadmapId}:${sequence}:${date}`;
export interface SelectableObjective { sequence: number; skillKey: string; skillName: string; workType: string; plannedMinutes: number; week: number; reasonCode: string; explanation: string; prerequisiteFor?: string; }
export interface SelectionInput { roadmapId: string; date: string; week: number; objectives: SelectableObjective[]; minutesPerDay: number; daysPerWeek: number; creditedBefore: Map<number, number>; completedToday: Set<string>; resources: Map<string, MissionResource>; }

export function selectTodaysMissions(input: SelectionInput): DailyMission[] {
  const thisWeek = input.objectives.filter(o => o.week === input.week).slice().sort((a, b) => a.sequence - b.sequence);
  const creditedOf = (seq: number) => input.creditedBefore.get(seq) || 0;
  const isSettled = (o: SelectableObjective) => creditedOf(o.sequence) >= o.plannedMinutes;
  const budget = dailyBudget(input.minutesPerDay); const chosen: DailyMission[] = []; let spent = 0;
  for (const o of thisWeek) {
    if (chosen.length >= MAX_MISSIONS_PER_DAY) break;
    if (isSettled(o)) continue;
    if (thisWeek.some(p => p.sequence < o.sequence && p.prerequisiteFor === o.skillKey && !isSettled(p))) continue;
    const slice = dailySliceOf(o.plannedMinutes, creditedOf(o.sequence), input.daysPerWeek);
    if (slice < MIN_MISSION_MINUTES) continue;
    const remainingBudget = budget - spent; if (remainingBudget < MIN_MISSION_MINUTES) break;
    const minutes = Math.min(slice, remainingBudget); const key = missionKey(input.roadmapId, o.sequence, input.date);
    const resource = o.workType === 'ASSESS' ? { type: 'assessment', id: `personalized:${o.skillKey}`, title: `${o.skillName} check`, route: assessmentRouteForSkill(o.skillKey) } : input.resources.get(slotKey(o.skillKey, o.workType));
    chosen.push({ key, roadmapId: input.roadmapId, objectiveSequence: o.sequence, skillKey: o.skillKey, skillName: o.skillName, workType: o.workType, plannedMinutes: minutes, title: `${o.skillName} — ${WORK_LABEL[o.workType] || o.workType}`, explanation: o.explanation, reasonCode: o.reasonCode, resourceState: resource ? 'READY' : 'RESOURCE_NOT_CONFIGURED', resource, done: input.completedToday.has(key) });
    spent += minutes;
  }
  return chosen;
}

const dayNumberFrom = (start: Date, now: Date): number => Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1;

/** Select the first stable, executable resource that serves this member and their score. */
async function resolveResources(tenantId: string, skillKeys: string[], member: ResourceMember, scores: Map<string, number>): Promise<Map<string, MissionResource>> {
  const out = new Map<string, MissionResource>(); const unique = [...new Set(skillKeys.map(k => String(k).toUpperCase()))]; if (!unique.length) return out;
  const rows = await CareerSkillResource.find({ tenantId, skillKey: { $in: unique }, active: true }).sort({ priority: 1, resourceId: 1, _id: 1 }).lean() as any[];
  for (const r of rows) {
    const resourceSkill = String(r.skillKey).toUpperCase(); const score = scores.has(resourceSkill) ? scores.get(resourceSkill)! : null;
    if (!resourceServes(r, member, score)) continue;
    let resolved: MissionResource | null = null;
    if (r.resourceType === 'practice') {
      const problem = findProblem(String(r.resourceId)); if (!problem) continue;
      resolved = { type: 'practice', id: String(r.resourceId), title: problem.title, route: practiceRoute(String(r.resourceId)), xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (r.resourceType === 'problem') {
      const hit = await findCareerPilotProblem(tenantId, String(r.resourceId)); if (!hit) continue;
      resolved = { type: 'problem', id: String(r.resourceId), title: hit.problem.title, route: practiceRoute(String(r.resourceId)), xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (r.resourceType === 'mock_interview') {
      resolved = { type: 'mock_interview', id: String(r._id), title: r.title || 'Mock interview', route: '/careerpilot/interview', xp: typeof r.xp === 'number' ? r.xp : null };
    } else if (MATERIAL_TYPES.includes(r.resourceType)) {
      if (!String(r.url || '').trim()) continue;
      resolved = { type: r.resourceType, id: String(r._id), title: r.title, route: String(r.url).trim(), xp: typeof r.xp === 'number' ? r.xp : null };
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
  const missions = selectTodaysMissions({ roadmapId, date, week, objectives, minutesPerDay: roadmap.input.minutesPerDay, daysPerWeek: roadmap.input.daysPerWeek, creditedBefore, completedToday, resources });
  const weekPlanned = weekObjectives.reduce((n, o) => n + o.plannedMinutes, 0); const weekCompleted = completions.filter((c: any) => weekObjectives.some(o => o.sequence === c.careerpilot.objectiveSequence)).reduce((n: number, c: any) => n + (c.careerpilot.minutes || 0), 0); const totalPlanned = roadmap.capacity?.plannedMinutes || 0;
  return { available: true, policyVersion: MISSION_ORCHESTRATION_VERSION, roadmapId, date, roadmapDay, roadmapWeek: week, weekCount: roadmap.weekCount, capacity: { minutesPerDay: roadmap.input.minutesPerDay, plannedMinutes: missions.reduce((n, m) => n + m.plannedMinutes, 0) }, missions, progress: { plannedMinutes: totalPlanned, completedMinutes, percent: totalPlanned > 0 ? Math.min(100, Math.round((completedMinutes / totalPlanned) * 100)) : 0 }, week: { plannedMinutes: weekPlanned, completedMinutes: weekCompleted }, unmappedObjectives: weekObjectives.filter(o => o.workType !== 'ASSESS' && !resources.has(slotKey(o.skillKey, o.workType))).length, outdated: false };
}

export { CareerRoadmap as _CareerRoadmap };
export type { ICareerRoadmap };

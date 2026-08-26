import CareerRoadmap, { ICareerRoadmap } from '../models/CareerRoadmap';
import CareerSkillResource from '../models/CareerSkillResource';
import PassportProgress from '../models/PassportProgress';
import PassportConfig from '../models/PassportConfig';
import User from '../models/User';
import { isEntitled } from './passportEntitlementService';
import { findProblem } from './passportPracticeService';
import { ymd } from './passportMissionService';
import {
  MISSION_ORCHESTRATION_VERSION, MAX_MISSIONS_PER_DAY, MIN_MISSION_MINUTES,
  ASSESSMENT_ROUTE, assessmentRouteForSkill, practiceRoute, dailySliceOf, dailyBudget,
  MissionResourceState, DailyPlanUnavailable,
} from '../data/missionOrchestrationPolicy';

/**
 * What a student should do today to move their roadmap forward.
 *
 * THE ROADMAP DECIDES WHAT; THIS DECIDES WHEN. Every objective, its minutes, its priority
 * and its position in the week were settled by Module 9 and are read here unchanged. This
 * module never re-ranks a gap, never re-plans a week and never invents work — if the
 * roadmap has nothing left for the current week, today is finished, and saying so is the
 * correct answer rather than a reason to find filler.
 *
 * NOT A SECOND MISSION SYSTEM. Completions are written to PassportProgress through the same
 * completeMissionOnce the legacy daily missions use, so XP, the streak and the
 * once-per-key guarantee are inherited exactly as they are. What differs is only the
 * SOURCE of the list, which is the entire point of the module.
 *
 * COMPLETING SOMETHING IS NOT PROOF OF IT. Nothing on this path writes evidence or touches
 * a skill score. Ticking "Practise arrays" moves roadmap progress and nothing else; Skill
 * DNA continues to come only from a graded assessment through Module 7.
 *
 * DETERMINISTIC AND STABLE WITHIN A DAY. Today's slate is computed from work credited on
 * EARLIER days, so finishing a mission at noon marks it done without reshuffling the two
 * beneath it. A refresh returns the same three tasks in the same order.
 */

export interface DailyMission {
  /** Stable business identity: same roadmap, same objective, same date, same key. */
  key: string;
  roadmapId: string;
  objectiveSequence: number;
  skillKey: string;
  skillName: string;
  workType: string;
  plannedMinutes: number;
  title: string;
  /** Module 9's own words for why this is in the plan. Not regenerated here. */
  explanation: string;
  reasonCode: string;
  resourceState: MissionResourceState;
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
  /** Progress across the whole plan, from credited minutes. Never a skill figure. */
  progress: { plannedMinutes: number; completedMinutes: number; percent: number };
  week: { plannedMinutes: number; completedMinutes: number };
  /** Objectives this week that no resource can execute yet — a configuration gap. */
  unmappedObjectives: number;
  outdated: boolean;
}

export interface DailyPlanUnavailableResult {
  available: false;
  reason: DailyPlanUnavailable;
  message: string;
}

export type DailyPlanOutcome = DailyPlanAvailable | DailyPlanUnavailableResult;

const WORK_LABEL: Record<string, string> = {
  LEARN: 'Learn', PRACTICE: 'Practice', ASSESS: 'Check', REVIEW: 'Review',
};

/** The identity a completion is recorded against. Deterministic, and never random. */
export const missionKey = (roadmapId: string, sequence: number, date: string): string =>
  `cp:${roadmapId}:${sequence}:${date}`;

/** One roadmap objective, as the selector needs it. */
export interface SelectableObjective {
  sequence: number;
  skillKey: string;
  skillName: string;
  workType: string;
  plannedMinutes: number;
  week: number;
  reasonCode: string;
  explanation: string;
  prerequisiteFor?: string;
}

export interface SelectionInput {
  roadmapId: string;
  date: string;
  week: number;
  objectives: SelectableObjective[];
  minutesPerDay: number;
  daysPerWeek: number;
  /** Minutes credited per objective sequence on days BEFORE today. */
  creditedBefore: Map<number, number>;
  /** Keys completed today — marks a mission done without removing it from the list. */
  completedToday: Set<string>;
  /** skillKey:workType -> the resource to send the student to. */
  resources: Map<string, { type: string; id: string; title: string; route: string }>;
}

/**
 * Choose today's missions.
 *
 * Pure, so the rules that matter — capacity, prerequisite order, stability — can be tested
 * without a database. Objectives arrive in Module 9's sequence, which already encodes
 * prerequisite ordering; the gate below enforces it a second time at the day level, because
 * a week's worth of order is not the same as a day's.
 */
export function selectTodaysMissions(input: SelectionInput): DailyMission[] {
  const thisWeek = input.objectives
    .filter(o => o.week === input.week)
    .slice()
    .sort((a, b) => a.sequence - b.sequence);

  const creditedOf = (seq: number) => input.creditedBefore.get(seq) || 0;
  const isSettled = (o: SelectableObjective) => creditedOf(o.sequence) >= o.plannedMinutes;

  const budget = dailyBudget(input.minutesPerDay);
  const chosen: DailyMission[] = [];
  let spent = 0;

  for (const o of thisWeek) {
    if (chosen.length >= MAX_MISSIONS_PER_DAY) break;
    if (isSettled(o)) continue;

    /**
     * Prerequisite gate.
     *
     * Module 9 put HTTP before REST APIs for a reason, and a day that offered both at once
     * would waste the ordering it worked out. Anything earlier in the week that exists to
     * unblock THIS skill has to be finished first — priority does not override sequence.
     */
    const blocked = thisWeek.some(p =>
      p.sequence < o.sequence && p.prerequisiteFor === o.skillKey && !isSettled(p));
    if (blocked) continue;

    const slice = dailySliceOf(o.plannedMinutes, creditedOf(o.sequence), input.daysPerWeek);
    if (slice < MIN_MISSION_MINUTES) continue;

    // Never overspend the day. A shorter final mission is fine; a fourth hour is not.
    const remainingBudget = budget - spent;
    if (remainingBudget < MIN_MISSION_MINUTES) break;
    const minutes = Math.min(slice, remainingBudget);

    const key = missionKey(input.roadmapId, o.sequence, input.date);
    const resource = o.workType === 'ASSESS'
      // The measuring instrument is built in — it always exists, so validation work is
      // never stranded waiting for somebody to map it.
      // Aimed at THIS objective's skill. The generic route measured the whole role, so a
      // fifteen-minute check on one skill opened a full paper and re-scored everything.
      ? {
        type: 'assessment', id: `personalized:${o.skillKey}`,
        title: `${o.skillName} check`, route: assessmentRouteForSkill(o.skillKey),
      }
      : input.resources.get(`${o.skillKey}:${o.workType}`);

    chosen.push({
      key,
      roadmapId: input.roadmapId,
      objectiveSequence: o.sequence,
      skillKey: o.skillKey,
      skillName: o.skillName,
      workType: o.workType,
      plannedMinutes: minutes,
      title: `${o.skillName} — ${WORK_LABEL[o.workType] || o.workType}`,
      explanation: o.explanation,
      reasonCode: o.reasonCode,
      // An unmapped objective still appears. Hiding it would make the plan look emptier
      // than it is and leave the gap invisible to the admin who can close it.
      resourceState: resource ? 'READY' : 'RESOURCE_NOT_CONFIGURED',
      resource,
      done: input.completedToday.has(key),
    });
    spent += minutes;
  }

  return chosen;
}

/** Whole days between two dates, matching how the existing journey counts them. */
const dayNumberFrom = (start: Date, now: Date): number =>
  Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1;

/**
 * Resolve one executable resource per (skill, work type).
 *
 * ONE query for every skill in the week, not one per objective. The chosen resource is the
 * lowest priority number then the lowest id, so the same objective resolves to the same
 * activity every day rather than rotating underneath the student.
 *
 * A mapping whose target has since been deleted is skipped rather than served — a Start
 * button that leads nowhere is worse than an honest configuration gap.
 */
async function resolveResources(
  tenantId: string,
  skillKeys: string[],
): Promise<Map<string, { type: string; id: string; title: string; route: string }>> {
  const out = new Map<string, { type: string; id: string; title: string; route: string }>();
  if (!skillKeys.length) return out;

  const rows = await CareerSkillResource
    .find({ tenantId, skillKey: { $in: [...new Set(skillKeys)] }, active: true })
    .sort({ priority: 1, resourceId: 1 })
    .lean() as any[];

  for (const r of rows) {
    if (r.resourceType !== 'practice') continue;
    const problem = findProblem(String(r.resourceId));
    if (!problem) continue;                       // deleted or renamed; skip, never crash

    for (const wt of (r.workTypes || [])) {
      const slot = `${r.skillKey}:${wt}`;
      if (out.has(slot)) continue;                // first by (priority, id) wins — stable
      out.set(slot, {
        type: 'practice', id: String(r.resourceId),
        title: problem.title, route: practiceRoute(String(r.resourceId)),
      });
    }
  }
  return out;
}

/**
 * Today's plan for one student.
 *
 * Reads only. Nothing is materialised, because the selection is deterministic in
 * (roadmap, date, prior completions) — exactly the property the legacy daily engine already
 * relies on. Storing a slate would add a collection whose only job is to remember something
 * we can recompute exactly, plus a new way for it to disagree with the roadmap.
 */
export async function getTodaysPlan(
  tenantId: string,
  studentId: string,
  now: Date = new Date(),
): Promise<DailyPlanOutcome> {
  const [roadmap, user, cfg] = await Promise.all([
    CareerRoadmap.findOne({ tenantId, studentId, status: 'ACTIVE' }).lean() as any,
    User.findOne({ _id: studentId, tenantId }).select('passport').lean() as any,
    PassportConfig.findOne({ tenantId }).lean() as any,
  ]);

  // Daily missions are a paid feature already; the same key the legacy engine uses gates
  // this one, so nothing new has to be configured and nothing commercial is invented here.
  if (!isEntitled(cfg?.entitlements, user?.passport, 'daily_missions', now)) {
    return {
      available: false, reason: 'MEMBERSHIP_REQUIRED',
      message: 'A CareerPilot membership is needed for your daily plan.',
    };
  }

  // Only the ACTIVE roadmap drives today. A superseded plan keeps its history and stops
  // producing work the moment it is replaced.
  if (!roadmap) {
    return {
      available: false, reason: 'ROADMAP_REQUIRED',
      message: 'Generate your 90-day roadmap and your daily plan starts from it.',
    };
  }

  const roadmapDay = Math.max(1, dayNumberFrom(new Date(roadmap.startDate), now));
  if (roadmapDay > roadmap.roadmapDays) {
    return {
      available: false, reason: 'ROADMAP_COMPLETED',
      message: 'This 90-day plan has finished.',
    };
  }

  const week = Math.min(roadmap.weekCount, Math.max(1, Math.ceil(roadmapDay / 7)));
  const date = ymd(now);
  const roadmapId = String(roadmap._id);

  const objectives: SelectableObjective[] = (roadmap.objectives || []).map((o: any) => ({
    sequence: o.sequence, skillKey: o.skillKey, skillName: o.skillName,
    workType: o.workType, plannedMinutes: o.plannedMinutes, week: o.week,
    reasonCode: o.reasonCode, explanation: o.explanation,
    prerequisiteFor: o.prerequisiteFor,
  }));

  const progress: any = await PassportProgress.findOne({ tenantId, studentId }).lean();
  const completions = (progress?.completed || [])
    .filter((c: any) => c.careerpilot && c.careerpilot.roadmapId === roadmapId);

  // Credited BEFORE today, so completing something now cannot reshuffle the rest of the day.
  const creditedBefore = new Map<number, number>();
  const completedToday = new Set<string>();
  let completedMinutes = 0;

  for (const c of completions) {
    const cp = c.careerpilot;
    completedMinutes += cp.minutes || 0;
    if (String(c.key).endsWith(`:${date}`)) { completedToday.add(c.key); continue; }
    creditedBefore.set(cp.objectiveSequence, (creditedBefore.get(cp.objectiveSequence) || 0) + (cp.minutes || 0));
  }

  const weekObjectives = objectives.filter(o => o.week === week);
  const resources = await resolveResources(tenantId, weekObjectives.map(o => o.skillKey));

  const missions = selectTodaysMissions({
    roadmapId, date, week, objectives,
    minutesPerDay: roadmap.input.minutesPerDay,
    daysPerWeek: roadmap.input.daysPerWeek,
    creditedBefore, completedToday, resources,
  });

  const weekPlanned = weekObjectives.reduce((n, o) => n + o.plannedMinutes, 0);
  const weekCompleted = completions
    .filter((c: any) => weekObjectives.some(o => o.sequence === c.careerpilot.objectiveSequence))
    .reduce((n: number, c: any) => n + (c.careerpilot.minutes || 0), 0);

  const totalPlanned = roadmap.capacity?.plannedMinutes || 0;

  return {
    available: true,
    policyVersion: MISSION_ORCHESTRATION_VERSION,
    roadmapId,
    date,
    roadmapDay,
    roadmapWeek: week,
    weekCount: roadmap.weekCount,
    capacity: {
      minutesPerDay: roadmap.input.minutesPerDay,
      plannedMinutes: missions.reduce((n, m) => n + m.plannedMinutes, 0),
    },
    missions,
    // Roadmap progress, and deliberately not readiness. Finishing the plan is not the same
    // as being ready for the role, and the two must never be shown as one number.
    progress: {
      plannedMinutes: totalPlanned,
      completedMinutes,
      percent: totalPlanned > 0 ? Math.min(100, Math.round((completedMinutes / totalPlanned) * 100)) : 0,
    },
    week: { plannedMinutes: weekPlanned, completedMinutes: weekCompleted },
    unmappedObjectives: weekObjectives.filter(o =>
      o.workType !== 'ASSESS' && !resources.has(`${o.skillKey}:${o.workType}`)).length,
    outdated: false,
  };
}

export { CareerRoadmap as _CareerRoadmap };
export type { ICareerRoadmap };

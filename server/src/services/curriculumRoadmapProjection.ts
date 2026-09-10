/**
 * Lay a student's curriculum plan out over the weeks of their roadmap.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * There were two planners. The curriculum plan decided what a student should learn and in what
 * order, correctly, module by module. The roadmap decided it again from readiness gaps — and
 * ordered the result by priority score, which for a first-year is the same for almost every
 * skill, so the tie-break decided everything. The tie-break was alphabetical. A student whose
 * gaps included AI_ML_CONCEPTS opened their 90-day plan and found it began with AI, before
 * variables, because A sorts first.
 *
 * The roadmap was also the only one the student ever saw, and its objectives were built from gap
 * status rather than from lessons: a cohort with little evidence produced twenty-five ASSESS
 * objectives and no LEARN at all, so every mission on the board was another test.
 *
 * This does not add a third planner. It PROJECTS the plan that already exists — the same ordered
 * list of topics, with the same states — onto the calendar the roadmap owns. The roadmap keeps
 * its storage, its progress tracking and its contract with every screen; what changes is where
 * its objectives come from.
 *
 * ── HOW A TOPIC BECOMES OBJECTIVES ────────────────────────────────────────────────────────
 *
 * Each teachable topic becomes a LEARN objective and, if the plan assigned practice, a PRACTICE
 * one. Both carry the topicCode, which is what lets a mission link to a page a student can open
 * rather than to a skill, which is not a thing that renders.
 *
 *   NOT_RELEVANT   no objectives. The plan already decided it is not for this student, and
 *                  saying so twice does not make it more true.
 *   VERIFIED       one REVIEW objective, not mandatory. The topic stays visible and costs no
 *                  time in the timeline — a plan that silently drops what you are good at reads
 *                  as a plan that lost your work.
 *   LOCKED         included, in curriculum order. The order already puts the prerequisite first,
 *                  so a lock resolves by the time the student reaches it. Dropping locked topics
 *                  would produce a plan that is missing its second half until something else
 *                  happens, which is not a plan.
 *
 * ── WEEKS COME FROM CAPACITY, NOT FROM AUTHORED DAY NUMBERS ───────────────────────────────
 *
 * The curriculum's day ranges are placeholders and say so. What decides how long Year 1 takes is
 * how many minutes a week this student actually has, so topics are walked in order and a week
 * closes when its capacity is spent. Two students on the same curriculum get the same sequence
 * over different numbers of weeks, which is the honest answer.
 */

import { IRoadmapObjective } from '../models/CareerRoadmap';

/** What one topic costs, when the plan does not carry its own estimate. */
const LEARN_MINUTES = 30;
const MINUTES_PER_PRACTICE_ITEM = 5;
const MIN_PRACTICE_MINUTES = 10;
/** A review of something already demonstrated. Visible, and cheap. */
const REVIEW_MINUTES = 10;

export interface ProjectedTopic {
  topicCode: string;
  title: string;
  skillKeys: string[];
  state: string;
  practiceCount: number;
  mandatory: boolean;
  locked: boolean;
  reasonText?: string;
  scoreAtAssignment?: number | null;
}

export interface ProjectionInput {
  /** Topics in curriculum order, flattened out of the plan's modules. */
  topics: ProjectedTopic[];
  skillNames: Map<string, string>;
  minutesPerDay: number;
  daysPerWeek: number;
  weekCount: number;
}

export interface ProjectionResult {
  objectives: IRoadmapObjective[];
  /** Topics that did not fit inside the window. Reported, never silently dropped. */
  deferred: { skillKey: string; skillName: string; topicCode: string }[];
  plannedMinutes: number;
}

/**
 * The gap vocabulary the roadmap stores, derived from the plan's state.
 *
 * The roadmap schema requires a reasonCode and a sourceGapStatus on every objective, and both are
 * enums this module does not own. Mapping the plan's state onto them keeps every existing reader —
 * the mission card, the admin roadmap screen, the explain endpoint — working unchanged.
 */
function statusFor(state: string): { reasonCode: string; gapStatus: string } {
  switch (state) {
    case 'FOUNDATION_REQUIRED': return { reasonCode: 'PRIORITY_GAP', gapStatus: 'PRIORITY_GAP' };
    case 'GUIDED': return { reasonCode: 'NEEDS_WORK', gapStatus: 'NEEDS_WORK' };
    case 'NOT_EXPOSED': return { reasonCode: 'NOT_ASSESSED', gapStatus: 'NOT_ASSESSED' };
    case 'LOCKED': return { reasonCode: 'PREREQUISITE', gapStatus: 'NOT_ASSESSED' };
    case 'REVISION': return { reasonCode: 'NEEDS_WORK', gapStatus: 'NEEDS_WORK' };
    case 'VERIFIED': return { reasonCode: 'ON_TRACK', gapStatus: 'ON_TRACK' };
    default: return { reasonCode: 'NOT_ASSESSED', gapStatus: 'NOT_ASSESSED' };
  }
}

/**
 * Which phase a topic belongs to, expressed in the vocabulary the roadmap already uses.
 *
 * Deliberately coarse. The phases exist so a student can see shape in a 90-day plan; the real
 * ordering is the curriculum's, and inventing a finer split here would be a second opinion about
 * sequence that nobody asked for.
 */
function phaseFor(state: string): string {
  if (state === 'VERIFIED') return 'VALIDATION';
  if (state === 'FOUNDATION_REQUIRED' || state === 'NOT_EXPOSED' || state === 'LOCKED') return 'FOUNDATION';
  return 'CORE_GAPS';
}

export function projectPlanToObjectives(input: ProjectionInput): ProjectionResult {
  const weeklyCapacity = Math.max(1, input.minutesPerDay * input.daysPerWeek);

  const objectives: IRoadmapObjective[] = [];
  const deferred: ProjectionResult['deferred'] = [];

  let week = 1;
  let spentThisWeek = 0;
  let sequence = 0;
  let plannedMinutes = 0;

  /**
   * Open a new week when this one is full.
   *
   * Checked BEFORE placing, and never mid-topic: a topic whose learn and practice landed in
   * different weeks would show a student half a lesson and call it a week's work.
   */
  const place = (cost: number): boolean => {
    if (spentThisWeek > 0 && spentThisWeek + cost > weeklyCapacity) {
      week++;
      spentThisWeek = 0;
    }
    if (week > input.weekCount) return false;
    spentThisWeek += cost;
    plannedMinutes += cost;
    return true;
  };

  for (const t of input.topics) {
    if (t.state === 'NOT_RELEVANT') continue;

    const primarySkill = (t.skillKeys || [])[0] || '';
    const skillName = input.skillNames.get(primarySkill) || t.title;
    const { reasonCode, gapStatus } = statusFor(t.state);
    const phase = phaseFor(t.state);

    const base = {
      skillKey: primarySkill,
      skillName,
      phase,
      reasonCode,
      sourceGapStatus: gapStatus,
      targetLevel: 'FOUNDATION',
      targetScore: 60,
      studentScore: t.scoreAtAssignment ?? null,
      topicCode: t.topicCode,
      origin: 'GENERATED' as const,
    } as any;

    /**
     * A verified topic earns a review and nothing else.
     *
     * It costs a token amount of time so the week's arithmetic stays honest, and it is not
     * mandatory — the timeline below counts only what a student has to do.
     */
    if (t.state === 'VERIFIED') {
      if (!place(REVIEW_MINUTES)) {
        deferred.push({ skillKey: primarySkill, skillName, topicCode: t.topicCode });
        continue;
      }
      objectives.push({
        ...base,
        workType: 'REVIEW',
        plannedMinutes: REVIEW_MINUTES,
        week,
        sequence: sequence++,
        explanation: t.reasonText || `You have already shown this. ${t.title} is here to revisit if you want it.`,
      });
      continue;
    }

    const learnCost = LEARN_MINUTES;
    if (!place(learnCost)) {
      deferred.push({ skillKey: primarySkill, skillName, topicCode: t.topicCode });
      continue;
    }
    objectives.push({
      ...base,
      workType: 'LEARN',
      plannedMinutes: learnCost,
      week,
      sequence: sequence++,
      explanation: t.reasonText || `Work through ${t.title}.`,
    });

    if (t.practiceCount > 0) {
      const practiceCost = Math.max(MIN_PRACTICE_MINUTES, t.practiceCount * MINUTES_PER_PRACTICE_ITEM);
      if (!place(practiceCost)) {
        deferred.push({ skillKey: primarySkill, skillName, topicCode: t.topicCode });
        continue;
      }
      objectives.push({
        ...base,
        workType: 'PRACTICE',
        plannedMinutes: practiceCost,
        week,
        sequence: sequence++,
        explanation: `Practise ${t.title} until it is automatic.`,
      });
    }
  }

  return { objectives, deferred, plannedMinutes };
}

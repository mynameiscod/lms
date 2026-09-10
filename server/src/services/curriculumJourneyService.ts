/**
 * The 90-day journey, built from the student's curriculum roadmap.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * The journey screen has always been fed by buildRoadmap, which composes days out of mission
 * POOLS chosen from a pathway template and the member's category scores. That produced a real,
 * usable 90 days — and it had nothing to do with the fifteen curriculum modules. A first-year
 * opened it and read "Speed-distance-time", "Blood relations", "Email practice" under a heading
 * that said Software Development Foundation, while the plan they had actually been given taught
 * hardware, then problem solving, then variables.
 *
 * So there were two journeys: the one the system decided, and the one the student was shown.
 * This builds the shown one out of the decided one.
 *
 * ── IT PRODUCES THE EXACT SAME SHAPE ──────────────────────────────────────────────────────
 *
 * Roadmap, RoadmapPhase, RoadmapWeek, RoadmapDay — unchanged. That is the point: the preview
 * trimming, the lock, the unlock CTA, the week accordion and both view modes on the client all
 * keep working untouched. Swapping the SOURCE of a screen is a far smaller risk than rewriting
 * the screen, and every one of those behaviours is one somebody already got right.
 *
 * ── THE MEMBERSHIP PREVIEW IS NOT THIS FILE'S JOB ─────────────────────────────────────────
 *
 * It always returns the whole journey. toPreview trims it to the first week for a non-member,
 * exactly as it always has. Building a short version here would put the paywall in two places
 * and guarantee they eventually disagree.
 */

import mongoose from 'mongoose';
import CareerRoadmap from '../models/CareerRoadmap';
import StudentCurriculumAssignment from '../models/StudentCurriculumAssignment';
import { Roadmap, RoadmapDay, RoadmapPhase, RoadmapWeek } from './passportRoadmapService';

/** Days in a week of the journey. The screen is built around sevens. */
const DAYS_PER_WEEK = 7;

/**
 * XP per day, matched to what the mission ledger actually pays.
 *
 * A number invented here would appear on the roadmap and never arrive in the wallet. The
 * journey shows a day's worth of missions, and the rule that pays them is the same one the
 * daily plan reads — so this is deliberately a plain multiple of the per-mission award rather
 * than a second pricing opinion.
 */
const XP_PER_MISSION = 10;

const PHASE_LABEL: Record<string, { key: 'foundation' | 'build' | 'launch'; label: string; blurb: string }> = {
  FOUNDATION: {
    key: 'foundation', label: 'Phase 1 - Foundation',
    blurb: 'The ground everything else stands on. Taught from the beginning, in the order it builds.',
  },
  CORE_GAPS: {
    key: 'build', label: 'Phase 2 - Build',
    blurb: 'Where your measured gaps are closed and the harder material starts.',
  },
  VALIDATION: {
    key: 'launch', label: 'Phase 3 - Prove it',
    blurb: 'Re-measure what you have learned and show it holds.',
  },
};

const WORK_VERB: Record<string, string> = {
  LEARN: 'Learn', PRACTICE: 'Practise', ASSESS: 'Check', REVIEW: 'Revisit',
};

export interface CurriculumJourneyResult {
  roadmap: Roadmap;
  /** False when this student has no curriculum-projected roadmap to build from. */
  available: boolean;
}

/**
 * Does this student have a roadmap that came from their curriculum?
 *
 * A roadmap built before the projection existed, or one produced by the gap planner because no
 * curriculum plan was ready, is NOT one of these — and showing it here would put the old
 * ordering back on the screen under a new name. The report flag is what the projection sets,
 * so the check is on the thing itself rather than on a guess about its age.
 */
export async function hasCurriculumRoadmap(tenantId: string, studentId: string): Promise<boolean> {
  if (!mongoose.Types.ObjectId.isValid(studentId)) return false;
  const rm = await CareerRoadmap.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'ACTIVE',
  }).select('report').lean() as any;
  return rm?.report?.projectedFromCurriculum === 1;
}

export async function buildCurriculumJourney(input: {
  tenantId: string;
  studentId: string;
  currentDay?: number;
  startDate?: Date | null;
  completedKeys?: Set<string>;
}): Promise<CurriculumJourneyResult> {
  const { tenantId, studentId } = input;

  const empty: CurriculumJourneyResult = {
    available: false,
    roadmap: {
      totalDays: 90, pathway: '', pathwayLabel: '', pathwayDescription: '',
      currentDay: 1, phases: [], totalXp: 0, earnedXp: 0,
    } as Roadmap,
  };

  if (!mongoose.Types.ObjectId.isValid(studentId)) return empty;

  const roadmap = await CareerRoadmap.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'ACTIVE',
  }).lean() as any;
  if (!roadmap || roadmap.report?.projectedFromCurriculum !== 1) return empty;

  const assignment = await StudentCurriculumAssignment.findOne({
    tenantId, studentId: new mongoose.Types.ObjectId(studentId), status: 'ACTIVE',
  }).lean() as any;

  /** Topic title and module, so a day reads as a lesson rather than as a skill key. */
  const topicTitle = new Map<string, string>();
  const topicModule = new Map<string, string>();
  for (const m of (assignment?.moduleAssignments || []) as any[]) {
    for (const t of (m.topicAssignments || []) as any[]) {
      if (!t.topicCode) continue;
      topicTitle.set(String(t.topicCode), String(t.title || t.topicCode));
      topicModule.set(String(t.topicCode), String(m.moduleName || m.moduleCode || ''));
    }
  }

  const objectives = ((roadmap.objectives || []) as any[])
    .slice()
    .sort((a, b) => (a.week - b.week) || (a.sequence - b.sequence));

  if (!objectives.length) return empty;

  /**
   * The journey is as long as the work, not as long as the window.
   *
   * The roadmap owns a 90-day window and the projection places topics by the student's real
   * weekly capacity — so a plan that fits in five weeks left eight empty ones at the end, and a
   * roadmap with eight blank weeks reads as broken rather than as finished early. The window
   * still caps it; what changes is that nothing is padded out to fill it.
   */
  const windowDays = Math.max(DAYS_PER_WEEK, Number(roadmap.roadmapDays) || 90);
  const windowWeeks = Math.max(1, Number(roadmap.weekCount) || Math.ceil(windowDays / DAYS_PER_WEEK));
  const lastWorkingWeek = Math.max(1, ...objectives.map(o => Math.min(windowWeeks, Number(o.week) || 1)));
  const weekCount = Math.min(windowWeeks, lastWorkingWeek);
  const totalDays = Math.min(windowDays, weekCount * DAYS_PER_WEEK);
  const currentDay = Math.max(1, input.currentDay || 1);

  /**
   * Objectives are DEALT across the days of their own week, never sampled.
   *
   * The first version picked one objective per day by rotating through the week's list, which
   * silently dropped work: a week holding twelve objectives has seven days, so five of them were
   * never shown anywhere and the XP total gave it away. A day now takes a contiguous slice, so a
   * busy week puts two on a day rather than losing them, and every objective appears exactly
   * once. A week with fewer objectives than days leaves the spare days genuinely empty, which is
   * a light week rather than a hidden one.
   */
  const byWeek = new Map<number, any[]>();
  for (const o of objectives) {
    const w = Math.min(weekCount, Math.max(1, Number(o.week) || 1));
    byWeek.set(w, [...(byWeek.get(w) || []), o]);
  }

  const weeks: RoadmapWeek[] = [];
  let totalXp = 0;
  let earnedXp = 0;

  for (let w = 1; w <= weekCount; w++) {
    const mine = byWeek.get(w) || [];
    const fromDay = (w - 1) * DAYS_PER_WEEK + 1;
    const toDay = Math.min(totalDays, w * DAYS_PER_WEEK);
    if (fromDay > totalDays) break;

    const days: RoadmapDay[] = [];
    let completedDays = 0;

    for (let d = fromDay; d <= toDay; d++) {
      const daysInWeek = toDay - fromDay + 1;
      const perDay = Math.ceil(mine.length / Math.max(1, daysInWeek));
      const offset = (d - fromDay) * perDay;
      const picked = mine.slice(offset, offset + perDay);
      const titles = picked.map(o => {
        const title = topicTitle.get(String(o.topicCode)) || o.skillName || o.skillKey;
        return `${WORK_VERB[o.workType] || o.workType}: ${title}`;
      });
      const categories = [...new Set(picked
        .map(o => topicModule.get(String(o.topicCode)) || '')
        .filter(Boolean))];

      const xp = picked.length * XP_PER_MISSION;
      totalXp += xp;

      const key = `curriculum:${w}:${d}`;
      const done = !!input.completedKeys?.has(key);
      if (done) { completedDays++; earnedXp += xp; }

      const date = input.startDate
        ? new Date(input.startDate.getTime() + (d - 1) * 86400000).toISOString().slice(0, 10)
        : undefined;

      days.push({
        day: d, date, categories, titles, xp, done,
        isToday: d === currentDay,
        isPast: d < currentDay,
      });
    }

    const first = mine[0];
    const theme = first
      ? (topicModule.get(String(first.topicCode)) || first.skillName || `Week ${w}`)
      : `Week ${w}`;

    weeks.push({
      week: w, theme, fromDay, toDay,
      focusLabels: [...new Set(mine.map(o => topicTitle.get(String(o.topicCode)) || o.skillName))].slice(0, 4),
      goal: first?.explanation || 'Keep working through your plan.',
      days, completedDays,
    });
  }

  /**
   * Phases come from the objectives' own phase, not from fixed day ranges.
   *
   * The projection already decided which phase each topic belongs to. Re-deriving it here from
   * day numbers would let the two disagree, and the screen would show a topic under a heading
   * the planner never put it in.
   */
  const phaseOfWeek = new Map<number, string>();
  for (const [w, list] of byWeek) {
    phaseOfWeek.set(w, String(list[0]?.phase || 'FOUNDATION'));
  }

  const phases: RoadmapPhase[] = [];
  for (const phaseKey of ['FOUNDATION', 'CORE_GAPS', 'VALIDATION']) {
    const mine = weeks.filter(x => (phaseOfWeek.get(x.week) || 'FOUNDATION') === phaseKey);
    if (!mine.length) continue;
    const meta = PHASE_LABEL[phaseKey];
    phases.push({
      key: meta.key, label: meta.label, blurb: meta.blurb,
      fromDay: mine[0].fromDay, toDay: mine[mine.length - 1].toDay,
      weeks: mine,
    });
  }

  return {
    available: true,
    roadmap: {
      totalDays,
      pathway: 'curriculum',
      pathwayLabel: 'Your Year-1 curriculum',
      pathwayDescription: 'Built from the modules you are being taught, in the order they build '
        + 'on each other, and adjusted to what your assessment measured.',
      currentDay,
      startDate: input.startDate ? input.startDate.toISOString().slice(0, 10) : undefined,
      endDate: input.startDate
        ? new Date(input.startDate.getTime() + (totalDays - 1) * 86400000).toISOString().slice(0, 10)
        : undefined,
      phases,
      totalXp,
      earnedXp,
    } as Roadmap,
  };
}

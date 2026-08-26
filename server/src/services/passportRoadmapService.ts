// Deterministic 90-day roadmap — the thing the ₹499 unlock actually promises.
// Built from the student's assessment result + their pathway, using the SAME
// mission generator that drives daily missions, so "week 4, day 26" in the
// roadmap is literally the missions they'll get on day 26. No per-user AI.

import {
  AttemptLite, PoolMap, missionsForDay, categoriesForDay, pathwayOf,
} from './passportMissionService';
import { IPassportPathway } from '../models/PassportContent';
import { PASSPORT_CATEGORIES } from '../models/PassportAssessment';

export interface RoadmapDay {
  day: number;
  date?: string;              // ISO date when a startDate is known
  categories: string[];
  titles: string[];
  xp: number;
  done?: boolean;
  isToday?: boolean;
  isPast?: boolean;
}

export interface RoadmapWeek {
  week: number;               // 1-based
  theme: string;
  fromDay: number;
  toDay: number;
  focusLabels: string[];
  goal: string;
  days: RoadmapDay[];
  completedDays: number;
}

export interface RoadmapPhase {
  key: 'foundation' | 'build' | 'launch';
  label: string;
  blurb: string;
  fromDay: number;
  toDay: number;
  weeks: RoadmapWeek[];
}

export interface Roadmap {
  totalDays: number;
  pathway: string;
  pathwayLabel: string;
  pathwayDescription: string;
  currentDay: number;
  startDate?: string;
  endDate?: string;
  phases: RoadmapPhase[];
  totalXp: number;
  earnedXp: number;
  completedDays: number;
  locked?: boolean;
  previewDays?: number;       // when locked, how many days are visible
}

const PHASES: { key: RoadmapPhase['key']; label: string; blurb: string }[] = [
  { key: 'foundation', label: 'Phase 1 · Foundation', blurb: 'Close your biggest gaps and build a daily habit.' },
  { key: 'build',      label: 'Phase 2 · Build',      blurb: 'Go deep on your core skill and produce real proof.' },
  { key: 'launch',     label: 'Phase 3 · Placement Ready', blurb: 'Resume, mock interviews and applications.' },
];

const WEEK_GOALS = [
  'Finish your assessment review and commit to a daily slot.',
  'Turn your weakest category from red to amber.',
  'Build an aptitude routine you can sustain.',
  'Speak out loud every single day this week.',
  'Solve your first set of real problems end to end.',
  'Review week 1–5, drop what is not working.',
  'Go one level deeper in your strongest technical area.',
  'Ship one project you can talk about for 3 minutes.',
  'Get your resume past an ATS score of 75.',
  'Learn the shape of a real interview round.',
  'Complete mock interviews and act on the feedback.',
  'Apply, refer, follow up — build the pipeline.',
  'Polish everything and share your CareerPilot.',
];

const catLabel = (key: string) =>
  PASSPORT_CATEGORIES.find((c: any) => c.key === key)?.label || key.replace(/_/g, ' ');

/**
 * Build the full journey. `completedKeys` is the set of "d{day}-s{slot}" keys the
 * student has already ticked off, so the roadmap doubles as a progress view.
 */
export function buildRoadmap(opts: {
  attempt: AttemptLite;
  pools: PoolMap;
  pathways?: IPassportPathway[];
  totalDays?: number;
  startDate?: Date | null;
  currentDay?: number;
  completedKeys?: Set<string>;
  stage?: string | null;
  /** Admin-authored days for this member's pathway; a day here overrides the pool. */
  curriculum?: Map<number, any>;
  /**
   * The tenant's missions-per-day. The roadmap must show the SAME days the member will be
   * given — a plan built on three when they receive two is a plan that never matches.
   */
  slotsPerDay?: number;
}): Roadmap {
  const totalDays = Math.max(7, opts.totalDays || 90);
  const pw = pathwayOf(opts.pathways, opts.attempt.pathway, opts.stage);
  const completed = opts.completedKeys || new Set<string>();
  const currentDay = Math.min(Math.max(1, opts.currentDay || 1), totalDays);
  const start = opts.startDate ? new Date(opts.startDate) : null;

  const weekCount = Math.ceil(totalDays / 7);
  const weeks: RoadmapWeek[] = [];
  let totalXp = 0, earnedXp = 0, completedDays = 0;

  for (let w = 1; w <= weekCount; w++) {
    const fromDay = (w - 1) * 7 + 1;
    const toDay = Math.min(w * 7, totalDays);
    const days: RoadmapDay[] = [];
    let weekDone = 0;

    for (let d = fromDay; d <= toDay; d++) {
      const missions = missionsForDay(opts.attempt, d, opts.pools, totalDays, opts.curriculum, opts.slotsPerDay);
      const xp = missions.reduce((s, m) => s + (m.xp || 0), 0);
      const allDone = missions.length > 0 && missions.every(m => completed.has(m.key));
      totalXp += xp;
      if (allDone) { earnedXp += xp; completedDays++; weekDone++; }
      days.push({
        day: d,
        date: start ? new Date(start.getTime() + (d - 1) * 86400000).toISOString().slice(0, 10) : undefined,
        categories: categoriesForDay(opts.attempt, d, totalDays),
        titles: missions.map(m => m.title),
        xp,
        done: allDone,
        isToday: d === currentDay,
        isPast: d < currentDay,
      });
    }

    weeks.push({
      week: w,
      theme: pw.weekThemes?.[w - 1] || `Week ${w}`,
      // An authored day may carry its own heading; the week keeps the pathway's.
      fromDay, toDay,
      focusLabels: Array.from(new Set(days.flatMap(d => d.categories))).slice(0, 3).map(catLabel),
      goal: WEEK_GOALS[(w - 1) % WEEK_GOALS.length],
      days,
      completedDays: weekDone,
    });
  }

  // Split the weeks into 3 phases as evenly as possible.
  const per = Math.ceil(weeks.length / 3);
  const phases: RoadmapPhase[] = PHASES.map((p, i) => {
    const slice = weeks.slice(i * per, (i + 1) * per);
    return {
      ...p,
      fromDay: slice[0]?.fromDay ?? 0,
      toDay: slice[slice.length - 1]?.toDay ?? 0,
      weeks: slice,
    };
  }).filter(p => p.weeks.length > 0);

  return {
    totalDays,
    pathway: pw.key,
    pathwayLabel: pw.label,
    pathwayDescription: pw.description,
    currentDay,
    startDate: start ? start.toISOString() : undefined,
    endDate: start ? new Date(start.getTime() + (totalDays - 1) * 86400000).toISOString() : undefined,
    phases,
    totalXp,
    earnedXp,
    completedDays,
  };
}

/**
 * Trim a roadmap down to the free preview window (used when not entitled).
 * Later phases are KEPT with zero weeks so the client can still show that they exist —
 * hiding them entirely made the preview look like the whole product.
 */
export function toPreview(full: Roadmap, previewDays = 7): Roadmap {
  const phases = full.phases.map(p => ({
    ...p,
    weeks: p.weeks
      .filter(w => w.fromDay <= previewDays)
      .map(w => ({ ...w, days: w.days.filter(d => d.day <= previewDays) })),
  }));
  return { ...full, phases, locked: true, previewDays };
}

/**
 * How a persisted Foundation journey is PRESENTED — as a roadmap and as a strip of ninety days.
 *
 * Nothing here decides access. Whether a day is open is the server's `locked` flag, computed by the same
 * ladder the day endpoint refuses by; these functions only choose words, groupings and links for facts the
 * server already sent. Nothing here reorders a day either: grouping gathers CONSECUTIVE days that share a
 * topic, in the order the plan has them, and a day with no topic stands on its own.
 */

import type { FoundationJourneyDaySummary } from '../../api/passportApi';

/** What a student sees a day as. AVAILABLE is open but not today; SKIPPED is behind today and not done. */
export type RoadmapDayState = 'COMPLETED' | 'CURRENT' | 'AVAILABLE' | 'SKIPPED' | 'LOCKED';

export const dayState = (d: Pick<FoundationJourneyDaySummary, 'status' | 'locked'>): RoadmapDayState => {
  if (d.status === 'COMPLETED') return 'COMPLETED';
  if (d.locked) return 'LOCKED';
  if (d.status === 'CURRENT') return 'CURRENT';
  if (d.status === 'SKIPPED') return 'SKIPPED';
  return 'AVAILABLE';
};

export const STATE_LABEL: Record<RoadmapDayState, string> = {
  COMPLETED: 'Completed',
  CURRENT: 'Today',
  AVAILABLE: 'Available',
  SKIPPED: 'Not finished',
  LOCKED: 'Locked',
};

export const KIND_LABEL: Record<string, string> = {
  LESSON: 'Lesson',
  PRACTICE: 'Practice',
  DEBUGGING: 'Debugging',
  PROJECT: 'Project',
  CHECKPOINT: 'Checkpoint',
};

/** A locked day is never opened from the roadmap. Everything else opens in My 90 Days. */
export const canOpenDay = (d: Pick<FoundationJourneyDaySummary, 'status' | 'locked'>): boolean =>
  dayState(d) !== 'LOCKED';

/** Where a day is worked through: My 90 Days, on that day. */
export const planLinkFor = (day: number): string => `/careerpilot/plan?day=${day}`;

/**
 * Where a WELCOME day is worked through — the same place, by its own parameter.
 *
 * The roadmap used to send every welcome row to /careerpilot/orientation, the standalone screen
 * that existed before these days were folded into the plan. So a member clicking day 0.2 in
 * their roadmap left the roadmap entirely, while clicking day 7 opened it in place. Same list,
 * two destinations, and only one of them was the thing that had been built.
 *
 * It goes to the welcome day's own PAGE, which is laid out like a learning day — hero, task
 * rail, one task at a time — rather than to a card inside the plan screen. A required day
 * should not look less like the product than an optional one.
 */
export const welcomeLinkFor = (dayNumber: number): string => `/careerpilot/journey/welcome/${dayNumber}`;

export interface RoadmapGroup {
  /** Stable within one response: the first day of the run. */
  key: string;
  topic: string | null;
  module: string | null;
  fromDay: number;
  toDay: number;
  days: FoundationJourneyDaySummary[];
  completed: number;
  state: 'COMPLETED' | 'CURRENT' | 'IN_PROGRESS' | 'LOCKED' | 'AVAILABLE';
}

/**
 * Consecutive days that share a topic, gathered for display. Order is exactly the plan's.
 *
 * Days are sorted by day number first only so a response delivered out of order cannot scramble the
 * roadmap; the plan's own order IS day number. A day with no topic metadata is its own group — the
 * roadmap then shows individual days rather than inventing a grouping.
 */
export function groupJourneyDays(days: FoundationJourneyDaySummary[]): RoadmapGroup[] {
  const ordered = [...days].sort((a, b) => a.day - b.day);
  const groups: RoadmapGroup[] = [];
  for (const d of ordered) {
    const last = groups[groups.length - 1];
    const sameRun = last && d.topic && last.topic === d.topic && last.module === (d.module ?? null)
      && last.toDay === d.day - 1;
    if (sameRun) {
      last.days.push(d);
      last.toDay = d.day;
    } else {
      groups.push({
        key: `g${d.day}`, topic: d.topic ?? null, module: d.module ?? null,
        fromDay: d.day, toDay: d.day, days: [d], completed: 0, state: 'LOCKED',
      });
    }
  }
  for (const g of groups) {
    const states = g.days.map(dayState);
    g.completed = states.filter(s => s === 'COMPLETED').length;
    g.state = g.completed === g.days.length ? 'COMPLETED'
      : states.includes('CURRENT') ? 'CURRENT'
        : g.completed > 0 ? 'IN_PROGRESS'
          : states.every(s => s === 'LOCKED') ? 'LOCKED' : 'AVAILABLE';
  }
  return groups;
}

export interface DayRange { from: number; to: number; label: string }

/** Pages of days covering 1..total with no gaps, so every day — the last included — has a way in. */
export function dayRanges(total: number, size = 30): DayRange[] {
  const out: DayRange[] = [];
  for (let from = 1; from <= total; from += size) {
    const to = Math.min(total, from + size - 1);
    out.push({ from, to, label: `Days ${from}–${to}` });
  }
  return out;
}

/** The day My 90 Days opens on: a valid `?day=` when given, otherwise the student's current day. */
export function initialDay(param: string | null, currentDay: number, totalDays: number): number {
  const n = Number(param);
  return Number.isInteger(n) && n >= 1 && n <= totalDays ? n : currentDay;
}

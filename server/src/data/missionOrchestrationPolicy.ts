/**
 * MISSION_ORCHESTRATION_V1 — turning this week's roadmap objectives into today's work.
 *
 * A DIFFERENT QUESTION FROM ROADMAP_V1, and the split matters. Module 9 decided what the
 * next ninety days should achieve and how the minutes divide across weeks; nothing here may
 * revisit that. This policy only decides which slice of the current week's already-decided
 * work a student should do today, and it owns exactly the constants needed for that.
 *
 * DETERMINISTIC. No AI, no randomness, no clock beyond the date. The same roadmap on the
 * same day yields the same list — which is what makes a refresh safe and a day's plan
 * something a student can come back to.
 */

export const MISSION_ORCHESTRATION_VERSION = 'MISSION_ORCHESTRATION_V1';

/**
 * How many CareerPilot missions a day may hold.
 *
 * Three, matching the legacy daily engine. That number is a long-standing product rhythm
 * rather than an implementation artefact — the dashboard, the roadmap preview and the
 * "all done" state are all built around a short, finishable list — and changing it here
 * would quietly redesign the daily experience for everybody.
 */
export const MAX_MISSIONS_PER_DAY = 3;

/**
 * How much of the day's stated capacity to fill.
 *
 * Slightly under, for the same reason Module 9 plans under the weekly total: a day packed
 * to the minute is one interruption away from failing, and a student who cannot finish
 * today's list stops opening it.
 */
export const DAILY_UTILIZATION = 0.9;

/** Below this a slice is not worth surfacing as its own task. */
export const MIN_MISSION_MINUTES = 15;

/** Planned minutes round to this, so a mission reads as a real sitting. */
export const MISSION_GRANULARITY = 5;

/**
 * Where the ASSESS work type sends a student.
 *
 * Built in rather than mapped: the personalised assessment is the product's own measuring
 * instrument and always exists, so requiring an admin to map it would leave every plan's
 * validation work unexecutable until somebody noticed.
 */
export const ASSESSMENT_ROUTE = '/careerpilot/skill-assessment';

/**
 * The assessment aimed at ONE skill — what an ASSESS mission actually wants.
 *
 * The bare route builds a paper across the whole role blueprint, so "Database Fundamentals
 * — Check, 15 min" opened a twenty-question sitting measuring everything and confirmed
 * nothing it named. The skill travels in the query, exactly as ?mode= does for the mock
 * interview, and the start endpoint narrows the paper to it.
 */
export const assessmentRouteForSkill = (skillKey: string): string =>
  (skillKey ? `${ASSESSMENT_ROUTE}?skill=${encodeURIComponent(skillKey)}` : ASSESSMENT_ROUTE);

/** Where a mapped Practice Lab item is opened. */
export const practiceRoute = (resourceId: string): string =>
  `/careerpilot/practice/${encodeURIComponent(resourceId)}`;

/** Why a mission could not be made executable. Reported, never silently dropped. */
export type MissionResourceState = 'READY' | 'RESOURCE_NOT_CONFIGURED';

/** Why today has no missions. Each is a different situation with a different next action. */
export type DailyPlanUnavailable =
  | 'ROADMAP_REQUIRED'
  | 'ROADMAP_COMPLETED'
  | 'MEMBERSHIP_REQUIRED';

export const roundMission = (minutes: number): number =>
  Math.max(MIN_MISSION_MINUTES, Math.round(minutes / MISSION_GRANULARITY) * MISSION_GRANULARITY);

/**
 * How much of one objective belongs in a single day.
 *
 * An objective carries a whole week's minutes for one skill; spreading them across the days
 * the student said they study is what stops a 240-minute block landing as one impossible
 * task. Never more than what is left, so the last day of an objective is short rather than
 * an overshoot.
 */
export function dailySliceOf(objectivePlannedMinutes: number, creditedMinutes: number, daysPerWeek: number): number {
  const remaining = Math.max(0, objectivePlannedMinutes - creditedMinutes);
  if (remaining <= 0) return 0;
  const perDay = objectivePlannedMinutes / Math.max(1, Math.min(7, daysPerWeek));
  return Math.min(remaining, Math.max(MIN_MISSION_MINUTES, roundMission(perDay)));
}

/** Today's usable budget, from the commitment Module 1 recorded. */
export const dailyBudget = (minutesPerDay: number): number =>
  Math.max(0, Math.round((minutesPerDay || 0) * DAILY_UTILIZATION));

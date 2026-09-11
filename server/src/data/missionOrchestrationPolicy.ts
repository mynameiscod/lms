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
 * The fewest missions a day may hold.
 *
 * Three, matching the legacy daily engine. That number is a long-standing product rhythm
 * rather than an implementation artefact — the dashboard, the roadmap preview and the
 * "all done" state are all built around a short, finishable list — so it stays the floor.
 * A student who committed an hour a day sees exactly what they saw before.
 */
export const MISSION_COUNT_FLOOR = 3;

/**
 * The most, however much time a student has committed.
 *
 * Six, matching the ceiling the legacy engine already clamps its own slots to. Past that a
 * day stops reading as a finishable list and starts reading as a backlog, which is the
 * failure the floor exists to prevent at the other end.
 */
export const MISSION_COUNT_CEILING = 6;

/**
 * How many missions today may hold, given what the student committed to.
 *
 * A FIXED THREE WAS THE WRONG SHAPE ONCE SKILLS BECAME JOURNEYS. A skill used to be one
 * resource, so three missions was three skills and the number was a reasonable rhythm. A
 * skill is now an authored sequence whose steps are often short — an explanation, a worked
 * example, some practice, fifteen minutes each — and a student who set aside two hours was
 * being handed three of them and told that was the day. The budget had room for the rest and
 * the cap refused to spend it.
 *
 * So the count follows the capacity the student themselves stated: as many minimum-length
 * sittings as their day's budget holds, never below the established floor and never above a
 * length that stops being finishable. An easy topic yields several short missions in one day;
 * a heavy one yields fewer and spreads across more days, which is what `dailySliceOf` was
 * already doing and the cap was overriding.
 *
 * The day's budget remains the real constraint. This only stops the count from being the
 * binding one when it should not be.
 */
export function missionCapForDay(minutesPerDay: number): number {
  const fits = Math.floor(dailyBudget(minutesPerDay) / MIN_MISSION_MINUTES);
  return Math.max(MISSION_COUNT_FLOOR, Math.min(MISSION_COUNT_CEILING, fits));
}

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

/**
 * Where a material an admin wrote is opened.
 *
 * Materials used to need an external URL or they were dropped, so the Concept Bank could
 * author a lesson with nowhere to render it. This is that somewhere.
 */
export const materialRoute = (resourceId: string): string =>
  `/careerpilot/material/${encodeURIComponent(resourceId)}`;

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

/**
 * How the student is doing against the suggested pace.
 *
 * A SIGNAL, NEVER A GATE. The roadmap is planned over a number of days, and how long a
 * student actually takes is their business: somebody working through Loops properly over
 * nine days has not failed, and somebody who skimmed it in one has not won. What the
 * membership buys is the material for a year, so the only hard boundary is entitlement.
 *
 * WHY REPORT IT AT ALL. A plan that never mentions pace leaves a student unable to tell
 * whether they are on course for a placement season that does have dates. Saying "you are
 * about a week behind the suggested pace" is information they can act on; refusing to serve
 * them the work is not.
 */
export type PaceStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND';

export interface PaceSignal {
  status: PaceStatus;
  /** Days since the roadmap started. Uncapped: day 140 of a 90-day plan is a real answer. */
  daysElapsed: number;
  /** What the plan was drawn up over. A suggestion, and the denominator for the signal. */
  daysSuggested: number;
  /** Share of planned minutes actually credited, 0-100. */
  actualPercent: number;
  /** Share the suggested pace would have reached by now, 0-100. */
  expectedPercent: number;
  /** Positive means ahead. Days of work, at the suggested rate. */
  daysAheadOrBehind: number;
}

/**
 * Either side of the suggested pace before the signal stops saying ON_TRACK.
 *
 * Ten points rather than an exact match, because a student who has done 48 per cent where
 * the pace suggests 50 is not behind in any sense worth telling them about, and a signal
 * that flickers between states on a single completed mission is noise.
 */
export const PACE_TOLERANCE_PERCENT = 10;

/**
 * Where the student sits against the suggested pace.
 *
 * Deterministic and derived entirely from figures the plan already holds, so it cannot
 * disagree with the progress shown beside it.
 */
export function paceSignal(
  daysElapsed: number, daysSuggested: number,
  completedMinutes: number, plannedMinutes: number,
): PaceSignal {
  const days = Math.max(1, Math.round(daysSuggested || 0));
  const elapsed = Math.max(0, Math.round(daysElapsed || 0));
  const actualPercent = plannedMinutes > 0
    ? Math.min(100, Math.round((completedMinutes / plannedMinutes) * 100)) : 0;
  // Capped at 100: past the suggested end the expectation is simply "all of it".
  const expectedPercent = Math.min(100, Math.round((elapsed / days) * 100));

  const delta = actualPercent - expectedPercent;
  const status: PaceStatus = delta > PACE_TOLERANCE_PERCENT ? 'AHEAD'
    : delta < -PACE_TOLERANCE_PERCENT ? 'BEHIND' : 'ON_TRACK';

  return {
    status, daysElapsed: elapsed, daysSuggested: days, actualPercent, expectedPercent,
    daysAheadOrBehind: Math.round((delta / 100) * days),
  };
}

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

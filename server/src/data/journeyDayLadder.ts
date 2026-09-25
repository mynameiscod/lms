/**
 * THE LADDER, IN ONE PLACE.
 *
 * A day opens when TWO things are true: the day before it is finished, and the calendar has
 * reached it. Day one of the roadmap is the sixth day of the programme, because the five welcome
 * days come first — see dailyPacingPolicy for why the programme is 95 days and the roadmap is 90.
 *
 * A day already completed stays open for review; the calendar never takes back what was done.
 * Beyond membership, a PREVIEW learner sees only the first N days and a LOCKED learner none.
 *
 * My 90 Days refuses a day by this rule, the roadmap reports it, the enrolment player enforces it
 * on completion, and every assignment reached through a journey day is opened by it. One rule, so
 * a day can never be closed on one screen and its assignment open by id on another.
 *
 * ── PACING IS OPTIONAL, AND ABSENT MEANS EXACTLY WHAT IT USED TO ──────────────────────────
 *
 * `pacedFrom` null — a member who predates pacing, or a caller with no clock to hand — leaves this
 * the completion ladder it has always been. That is what keeps members who were already learning
 * out of a rule that would otherwise shut them out of days they had already reached.
 */

import type { FoundationAccess } from '../services/foundationAccessService';
import { calendarHasReached, programmeDayOfLearning } from './dailyPacingPolicy';

/** When this learner's 95 days began, or null/undefined when they are not paced. */
export type PacedFrom = Date | null | undefined;

/** The completion half: it is day one, or it is done, or the day before it is done. */
export const completionAllowsDay = (dayNumber: number, completed: Set<number>): boolean =>
  dayNumber === 1 || completed.has(dayNumber) || completed.has(dayNumber - 1);

/** The calendar half: this learner's programme has reached this learning day. */
export const calendarAllowsDay = (dayNumber: number, pacedFrom: PacedFrom, now?: Date): boolean =>
  !pacedFrom || calendarHasReached(programmeDayOfLearning(dayNumber), pacedFrom, now);

export const isJourneyDayOpen = (
  dayNumber: number, completed: Set<number>, pacedFrom?: PacedFrom, now?: Date,
): boolean =>
  /* A finished day stays open whatever the calendar says. */
  completed.has(dayNumber)
  || (completionAllowsDay(dayNumber, completed) && calendarAllowsDay(dayNumber, pacedFrom, now));

/** Membership refuses this day: nothing of the roadmap, or a day past the preview. */
export const membershipRefusesDay = (dayNumber: number, access: Pick<FoundationAccess, 'level' | 'previewDays'>): boolean =>
  access.level === 'LOCKED' || (access.level === 'PREVIEW' && dayNumber > access.previewDays);

/**
 * Why a day is shut.
 *
 * DAY_LOCKED is work still to do; NOT_TODAY_YET is simply not yet. A member told the first when
 * the second is true goes looking for work that does not exist.
 */
export type JourneyDayRefusal = 'MEMBERSHIP_REQUIRED' | 'DAY_LOCKED' | 'NOT_TODAY_YET';

/** Why this learner may not open this day, or null when they may. */
export const journeyDayRefusal = (
  dayNumber: number,
  completed: Set<number>,
  access: Pick<FoundationAccess, 'level' | 'previewDays'>,
  pacedFrom?: PacedFrom,
  now?: Date,
): JourneyDayRefusal | null => {
  if (membershipRefusesDay(dayNumber, access)) return 'MEMBERSHIP_REQUIRED';
  if (completed.has(dayNumber)) return null;
  if (!completionAllowsDay(dayNumber, completed)) return 'DAY_LOCKED';
  return calendarAllowsDay(dayNumber, pacedFrom, now) ? null : 'NOT_TODAY_YET';
};

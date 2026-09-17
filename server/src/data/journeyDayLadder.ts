/**
 * THE NINETY-DAY LADDER, IN ONE PLACE.
 *
 * Day one is always open, a day already completed stays open, and any other day opens once the day
 * before it is complete. Beyond membership, a PREVIEW learner sees only the first N days and a LOCKED
 * learner none.
 *
 * My 90 Days refuses a day by this rule, the roadmap reports it, the enrolment player enforces it on
 * completion, and every assignment reached through a journey day is opened by it. One rule, so a day
 * can never be closed on one screen and its assignment open by id on another.
 */

import type { FoundationAccess } from '../services/foundationAccessService';

export const isJourneyDayOpen = (dayNumber: number, completed: Set<number>): boolean =>
  dayNumber === 1 || completed.has(dayNumber) || completed.has(dayNumber - 1);

/** Membership refuses this day: nothing of the roadmap, or a day past the preview. */
export const membershipRefusesDay = (dayNumber: number, access: Pick<FoundationAccess, 'level' | 'previewDays'>): boolean =>
  access.level === 'LOCKED' || (access.level === 'PREVIEW' && dayNumber > access.previewDays);

export type JourneyDayRefusal = 'MEMBERSHIP_REQUIRED' | 'DAY_LOCKED';

/** Why this learner may not open this day, or null when they may. */
export const journeyDayRefusal = (
  dayNumber: number, completed: Set<number>, access: Pick<FoundationAccess, 'level' | 'previewDays'>,
): JourneyDayRefusal | null => {
  if (membershipRefusesDay(dayNumber, access)) return 'MEMBERSHIP_REQUIRED';
  return isJourneyDayOpen(dayNumber, completed) ? null : 'DAY_LOCKED';
};

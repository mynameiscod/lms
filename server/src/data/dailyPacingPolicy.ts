/**
 * One day of the programme per day of the calendar.
 *
 * ── WHAT THIS ADDS TO THE LADDER ──────────────────────────────────────────────────────────
 *
 * journeyDayLadder opens a day when the one before it is finished, and nothing else. That is the
 * right rule and it is not enough on its own: a member could sit down on the day they joined and
 * finish the five welcome days in an hour, which makes a welcome a form to fill in rather than
 * five days of settling in.
 *
 * So a day now needs BOTH: the day before it finished, AND the calendar to have reached it.
 * Neither alone opens anything. Completion without the date is somebody racing ahead; the date
 * without completion is somebody skipping.
 *
 * ── THE PROGRAMME IS 95 DAYS, THE ROADMAP IS 90 ───────────────────────────────────────────
 *
 * The welcome is days 1–5 of the calendar and the ninety learning days are 6–95, so a member
 * reaches Day 1 of what they bought on their sixth day. The roadmap still says ninety, because
 * ninety learning days is what was sold and the welcome is not learning. Those two facts are not
 * in tension: 95 is how long it takes, 90 is what it teaches.
 *
 * ── INDIA TIME, NOT THE SERVER'S ──────────────────────────────────────────────────────────
 *
 * "Tomorrow" means tomorrow where the student is. A member finishing at 11pm in Hyderabad must
 * get their next day a hour later, not at 5:30am when UTC catches up. India has no daylight
 * saving, so a fixed offset is exact rather than an approximation — which is why this is arithmetic
 * and not a timezone library.
 *
 * ── FALLING BEHIND IS NOT PUNISHED ────────────────────────────────────────────────────────
 *
 * The date is a floor, never a quota: day N cannot open BEFORE its calendar day, but a member ten
 * days behind finds ten days waiting rather than ten days of penance. The alternative — one day
 * per day even when behind — makes a missed week impossible to recover and turns a ninety-day
 * programme into one nobody can finish in ninety days. Sequence is still enforced by completion,
 * so catching up means doing the work, in order.
 *
 * ── IT APPLIES TO NEW MEMBERS ONLY ────────────────────────────────────────────────────────
 *
 * Members already learning when this arrived are not paced. Applying it to them would shut two
 * people out of days they had already reached and paid for, and a product that takes away what
 * somebody has already been given has done something worse than launch late. See `paced` on
 * OrientationProgress: decided once, when the record is created, and never re-evaluated.
 */

/** India is UTC+5:30 all year. No daylight saving, so this is exact. */
export const IST_OFFSET_MINUTES = 330;

/** How many welcome days come before Day 1. The programme is this plus the roadmap's length. */
export const ORIENTATION_DAY_COUNT = 5;

/**
 * Which India-time calendar day a moment falls on, as a whole number of days since the epoch.
 *
 * Only ever subtracted from another of these, so the origin does not matter — what matters is
 * that two moments on the same Indian day give the same number, and midnight IST increments it.
 */
export const istDayIndex = (at: Date | number | string): number =>
  Math.floor((new Date(at).getTime() + IST_OFFSET_MINUTES * 60_000) / 86_400_000);

/**
 * India-time calendar days from one moment to another. 0 on the day itself, 1 after the next
 * midnight — whether that midnight is a minute away or twenty-three hours.
 *
 * Never negative: a start date in the future (a clock skew, a bad backfill) reads as "today"
 * rather than locking a member out of day one until the date passes.
 */
export const istDaysElapsed = (from: Date | number | string, to: Date | number | string = new Date()): number =>
  Math.max(0, istDayIndex(to) - istDayIndex(from));

/**
 * Which day of the 95 a given day is.
 *
 * Welcome day 1 is programme day 1; learning day 1 is programme day 6. One numbering, so the
 * calendar rule does not need to know which of the two it is being asked about.
 */
export const programmeDayOfOrientation = (orientationDay: number): number => orientationDay;
export const programmeDayOfLearning = (learningDay: number): number => ORIENTATION_DAY_COUNT + learningDay;

/**
 * Has the calendar reached this day of the programme?
 *
 * `startedAt` absent means the member has no clock yet — nothing has been dated, so nothing is
 * held back. Answering false there would lock a member out on the strength of a missing field.
 */
export function calendarHasReached(
  programmeDay: number,
  startedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!startedAt) return true;
  return istDaysElapsed(startedAt, now) >= programmeDay - 1;
}

/**
 * When a day becomes available, as a moment — the IST midnight that opens it.
 *
 * For a screen that would rather say "opens tomorrow" than "locked". Null when it is already
 * open, or when there is no clock to measure from.
 */
export function opensAt(
  programmeDay: number,
  startedAt: Date | null | undefined,
  now: Date = new Date(),
): Date | null {
  if (!startedAt || calendarHasReached(programmeDay, startedAt, now)) return null;
  /* The start of the IST day that this programme day falls on, back in real time. */
  const targetDayIndex = istDayIndex(startedAt) + (programmeDay - 1);
  return new Date(targetDayIndex * 86_400_000 - IST_OFFSET_MINUTES * 60_000);
}

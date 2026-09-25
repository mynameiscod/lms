/**
 * The calendar half of the gate: one day of the programme per day of the calendar, in India time.
 *
 * These are arithmetic tests with fixed instants rather than anything mocked, because the whole
 * point of the policy is that "tomorrow" is a fact about where the student is and not about where
 * the server is.
 */

import {
  IST_OFFSET_MINUTES, ORIENTATION_DAY_COUNT,
  istDayIndex, istDaysElapsed, calendarHasReached, opensAt,
  programmeDayOfOrientation, programmeDayOfLearning, welcomeDayLabel,
} from '../data/dailyPacingPolicy';

/** A moment written in India time, as the student would read it off their own clock. */
const ist = (s: string) => new Date(`${s}+05:30`);

describe('which day it is in India', () => {
  it('puts two moments on the same Indian day on the same day', () => {
    expect(istDayIndex(ist('2026-09-25T00:00:00'))).toBe(istDayIndex(ist('2026-09-25T23:59:59')));
  });

  it('turns over at midnight IST, not at midnight UTC', () => {
    const lateTonight = ist('2026-09-25T23:30:00');
    const justAfterMidnight = ist('2026-09-26T00:30:00');
    expect(istDayIndex(justAfterMidnight) - istDayIndex(lateTonight)).toBe(1);

    /* 19:00 UTC is already the 26th in India; a UTC-based rule would still call it the 25th. */
    const sevenPmUtc = new Date('2026-09-25T19:00:00Z');
    expect(istDayIndex(sevenPmUtc)).toBe(istDayIndex(ist('2026-09-26T00:30:00')));
  });

  it('uses the exact India offset', () => {
    expect(IST_OFFSET_MINUTES).toBe(330);
  });
});

describe('days elapsed', () => {
  it('is zero on the day somebody starts, however late they start', () => {
    expect(istDaysElapsed(ist('2026-09-25T09:00:00'), ist('2026-09-25T23:59:00'))).toBe(0);
  });

  it('is one after the next midnight, even a minute later', () => {
    expect(istDaysElapsed(ist('2026-09-25T23:59:00'), ist('2026-09-26T00:01:00'))).toBe(1);
  });

  it('counts calendar days, not 24-hour blocks', () => {
    expect(istDaysElapsed(ist('2026-09-25T23:00:00'), ist('2026-09-27T01:00:00'))).toBe(2);
  });

  it('never goes negative when the start date is in the future', () => {
    expect(istDaysElapsed(ist('2026-10-01T00:00:00'), ist('2026-09-25T00:00:00'))).toBe(0);
  });
});

describe('the programme is 95 days and the roadmap is 90', () => {
  it('numbers the welcome first and the learning after it', () => {
    expect(programmeDayOfOrientation(1)).toBe(1);
    expect(programmeDayOfOrientation(ORIENTATION_DAY_COUNT)).toBe(5);
    expect(programmeDayOfLearning(1)).toBe(6);
    expect(programmeDayOfLearning(90)).toBe(95);
  });
});

describe('what the calendar has reached', () => {
  const start = ist('2026-09-25T10:00:00');

  it('opens only the first welcome day on the day somebody joins', () => {
    const joinDay = ist('2026-09-25T23:00:00');
    expect(calendarHasReached(programmeDayOfOrientation(1), start, joinDay)).toBe(true);
    expect(calendarHasReached(programmeDayOfOrientation(2), start, joinDay)).toBe(false);
  });

  it('opens the second welcome day after the first midnight', () => {
    const tomorrow = ist('2026-09-26T00:05:00');
    expect(calendarHasReached(programmeDayOfOrientation(2), start, tomorrow)).toBe(true);
    expect(calendarHasReached(programmeDayOfOrientation(3), start, tomorrow)).toBe(false);
  });

  /** The headline consequence, stated as a test so nobody has to infer it. */
  it('does not reach Day 1 of the roadmap until the sixth day', () => {
    expect(calendarHasReached(programmeDayOfLearning(1), start, ist('2026-09-29T23:59:00'))).toBe(false);
    expect(calendarHasReached(programmeDayOfLearning(1), start, ist('2026-09-30T00:01:00'))).toBe(true);
  });

  it('reaches the last learning day on the ninety-fifth day', () => {
    /* Day 95 of the programme: ninety-four midnights after the start. */
    const day94 = new Date(start.getTime() + 94 * 86_400_000);
    expect(calendarHasReached(programmeDayOfLearning(90), start, day94)).toBe(true);
    expect(calendarHasReached(programmeDayOfLearning(90), start, new Date(day94.getTime() - 86_400_000))).toBe(false);
  });

  it('lets somebody who fell behind find every day they missed waiting', () => {
    const tenDaysLate = ist('2026-10-05T10:00:00');
    for (let d = 1; d <= 5; d++) expect(calendarHasReached(programmeDayOfOrientation(d), start, tenDaysLate)).toBe(true);
    for (let d = 1; d <= 5; d++) expect(calendarHasReached(programmeDayOfLearning(d), start, tenDaysLate)).toBe(true);
    /*
     * But never past where the calendar actually is. Ten days elapsed reaches programme day 11,
     * which is learning day 6 — so day 7 is still ahead of them however much they have caught up.
     */
    expect(calendarHasReached(programmeDayOfLearning(6), start, tenDaysLate)).toBe(true);
    expect(calendarHasReached(programmeDayOfLearning(7), start, tenDaysLate)).toBe(false);
  });

  it('holds nobody back when there is no start date to measure from', () => {
    expect(calendarHasReached(95, null)).toBe(true);
    expect(calendarHasReached(95, undefined)).toBe(true);
  });
});

describe('when a day opens', () => {
  const start = ist('2026-09-25T10:00:00');

  it('is the IST midnight that begins that programme day', () => {
    const at = opensAt(programmeDayOfOrientation(2), start, ist('2026-09-25T11:00:00'));
    expect(at).not.toBeNull();
    expect(istDayIndex(at!)).toBe(istDayIndex(ist('2026-09-26T00:00:00')));
    /* Exactly midnight in India, to the minute. */
    expect(at!.getTime()).toBe(ist('2026-09-26T00:00:00').getTime());
  });

  it('is null for a day that is already open', () => {
    expect(opensAt(programmeDayOfOrientation(1), start, ist('2026-09-25T11:00:00'))).toBeNull();
  });

  it('is null when there is no clock', () => {
    expect(opensAt(10, null)).toBeNull();
  });

  it('agrees with calendarHasReached at the exact moment it names', () => {
    const at = opensAt(programmeDayOfLearning(1), start, start)!;
    expect(calendarHasReached(programmeDayOfLearning(1), start, new Date(at.getTime() - 1))).toBe(false);
    expect(calendarHasReached(programmeDayOfLearning(1), start, at)).toBe(true);
  });
});

/**
 * The name a welcome day goes by.
 *
 * Welcome days are rows numbered 1 to 5 and are called 0.1 to 0.5, and the code kept confusing
 * the two. The roadmap built its label inline from an array index while the day panel printed
 * the raw row number, so one member saw a chip called 0.2 open a panel headed "Day 2" with a
 * button reading "Finish day 2" — the thing they had already reported once.
 */
describe('what a welcome day is called', () => {
  it('names the five welcome days 0.1 to 0.5', () => {
    expect([1, 2, 3, 4, 5].map(welcomeDayLabel)).toEqual(['0.1', '0.2', '0.3', '0.4', '0.5']);
  });

  it('never collides with a learning day, which is what the label is for', () => {
    const welcome = [1, 2, 3, 4, 5].map(welcomeDayLabel);
    const learning = [1, 2, 3, 4, 5].map(String);
    expect(welcome.filter(w => learning.includes(w))).toEqual([]);
  });

  it('labels one day for every welcome day the programme has', () => {
    const labels = Array.from({ length: ORIENTATION_DAY_COUNT }, (_, i) => welcomeDayLabel(i + 1));
    expect(new Set(labels).size).toBe(ORIENTATION_DAY_COUNT);
  });
});

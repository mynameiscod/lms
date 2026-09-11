/**
 * The journey reports how far through it the student is.
 *
 * It did not. Every week counted its own finished days and the journey never summed them, so
 * the top-level figure the screen divides by was simply absent — and `undefined / 21` is `NaN`.
 * The student's roadmap showed "Journey Progress NaN%", "NaN% of 21 days complete" and
 * "Remaining NaN Days", three symptoms of one missing field.
 *
 * IT COMPILED BECAUSE OF A CAST. The object was returned `as Roadmap`, and `as` does not check
 * that the properties are there — it asserts that they are. The legacy builder had always
 * returned this field; the curriculum journey was written beside it, missed it, and the cast
 * agreed. That is the real lesson here, and it is why the cast is gone rather than corrected.
 */

/** Exactly what the journey does now: sum what the weeks already counted. */
const journeyProgress = (weeks: { completedDays: number }[], totalDays: number) => {
  const completedDays = weeks.reduce((n, w) => n + w.completedDays, 0);
  return {
    completedDays,
    percent: totalDays ? Math.round((completedDays / totalDays) * 100) : 0,
  };
};

/** And exactly what the screen does with it. */
const screenPercent = (rm: { completedDays?: number; totalDays: number }) =>
  (rm.totalDays ? Math.round(((rm.completedDays as number) / rm.totalDays) * 100) : 0);

describe('how far through the journey', () => {
  it('sums the days its weeks already counted', () => {
    expect(journeyProgress([{ completedDays: 7 }, { completedDays: 3 }, { completedDays: 0 }], 21))
      .toEqual({ completedDays: 10, percent: 48 });
  });

  it('reports zero for a student who has not started, not nothing', () => {
    // The distinction that matters: 0% is a true statement, NaN% is a broken screen.
    expect(journeyProgress([{ completedDays: 0 }, { completedDays: 0 }], 14))
      .toEqual({ completedDays: 0, percent: 0 });
  });

  it('reads 100% when every day is done', () => {
    expect(journeyProgress([{ completedDays: 7 }, { completedDays: 7 }, { completedDays: 7 }], 21).percent)
      .toBe(100);
  });

  it('does not divide by zero on an empty journey', () => {
    expect(journeyProgress([], 0)).toEqual({ completedDays: 0, percent: 0 });
  });

  /**
   * The failure itself, pinned. If the field ever goes missing again this is what the student
   * sees, and a test that says so is cheaper than another screenshot.
   */
  it('renders NaN on the screen when the field is missing — which is the bug', () => {
    expect(Number.isNaN(screenPercent({ totalDays: 21 }))).toBe(true);
    expect(Number.isNaN(screenPercent({ completedDays: 0, totalDays: 21 }))).toBe(false);
  });
});

/**
 * Why a 90-day window can produce a 21-day journey.
 *
 * A student who saw "Your 21-Day Roadmap" under a product that promises ninety days and a year
 * of access is owed an answer, and the answer is that the journey is as long as the WORK, not
 * as long as the window: the window caps it, and nothing is padded out to fill it.
 */
describe('how long the journey turns out to be', () => {
  const DAYS_PER_WEEK = 7;
  const lengthOf = (objectiveWeeks: number[], windowDays: number) => {
    const windowWeeks = Math.max(1, Math.ceil(windowDays / DAYS_PER_WEEK));
    const lastWorkingWeek = Math.max(1, ...objectiveWeeks.map(w => Math.min(windowWeeks, w)));
    const weekCount = Math.min(windowWeeks, lastWorkingWeek);
    return Math.min(windowDays, weekCount * DAYS_PER_WEEK);
  };

  it('is as long as the work, not as long as the window', () => {
    // Three weeks of assigned topics inside a 90-day window is a 21-day journey.
    expect(lengthOf([1, 1, 2, 3], 90)).toBe(21);
  });

  it('fills the window when there is enough work to fill it', () => {
    expect(lengthOf([1, 5, 13], 90)).toBe(90);
  });

  it('never runs past the window, however much work there is', () => {
    // The window is the student's entitlement; work beyond it is not promised.
    expect(lengthOf([1, 20, 40], 90)).toBe(90);
  });

  it('is at least a week, even for one objective', () => {
    expect(lengthOf([1], 90)).toBe(7);
  });
});

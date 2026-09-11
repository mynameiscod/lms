import { paceSignal, PACE_TOLERANCE_PERCENT } from '../data/missionOrchestrationPolicy';

/**
 * The pace signal is the whole of what remains of the 90-day deadline.
 *
 * The plan used to stop serving work once the days ran out. It no longer does: a student
 * learns at their own speed and the membership is what has an end date. What survives is a
 * statement of where they sit against the suggested pace, which is information they can act
 * on rather than a gate that removes their work.
 *
 * These tests exist to keep that distinction honest. Every one of them asserts a REPORTED
 * figure; not one asserts that anything was withheld, because nothing ever should be.
 */
describe('the pace signal', () => {
  describe('reads the student against the suggested pace', () => {
    it('says ON_TRACK when progress matches the days elapsed', () => {
      // Half the days, half the minutes.
      const p = paceSignal(45, 90, 500, 1000);
      expect(p.status).toBe('ON_TRACK');
      expect(p.actualPercent).toBe(50);
      expect(p.expectedPercent).toBe(50);
    });

    it('says AHEAD when the student has done more than the pace suggests', () => {
      const p = paceSignal(30, 90, 800, 1000);   // a third of the days, 80% of the work
      expect(p.status).toBe('AHEAD');
      expect(p.daysAheadOrBehind).toBeGreaterThan(0);
    });

    it('says BEHIND when the student has done less', () => {
      const p = paceSignal(60, 90, 100, 1000);   // two thirds of the days, 10% of the work
      expect(p.status).toBe('BEHIND');
      expect(p.daysAheadOrBehind).toBeLessThan(0);
    });
  });

  /**
   * A signal that flipped on a single completed mission would be noise, and a student
   * checking it daily would learn to ignore it.
   */
  describe('does not flicker', () => {
    it('still reads ON_TRACK just inside the tolerance', () => {
      const within = PACE_TOLERANCE_PERCENT - 1;
      expect(paceSignal(50, 100, 50 - within, 100).status).toBe('ON_TRACK');
      expect(paceSignal(50, 100, 50 + within, 100).status).toBe('ON_TRACK');
    });

    it('changes only once the tolerance is genuinely exceeded', () => {
      const beyond = PACE_TOLERANCE_PERCENT + 1;
      expect(paceSignal(50, 100, 50 - beyond, 100).status).toBe('BEHIND');
      expect(paceSignal(50, 100, 50 + beyond, 100).status).toBe('AHEAD');
    });
  });

  /**
   * The cases that used to end a student's plan. All of them now produce a figure, and none
   * of them is an error.
   */
  describe('past the suggested end', () => {
    it('reports the real number of days elapsed rather than capping it at the plan length', () => {
      const p = paceSignal(140, 90, 400, 1000);
      expect(p.daysElapsed).toBe(140);
      expect(p.daysSuggested).toBe(90);
      expect(p.status).toBe('BEHIND');
    });

    it('caps the expectation at 100, since "all of it" is the most that can be expected', () => {
      expect(paceSignal(300, 90, 0, 1000).expectedPercent).toBe(100);
    });

    it('is ON_TRACK for a student who finished late but finished', () => {
      // Everything done, well past the suggested end. Behind on dates, complete on work —
      // and the honest reading of that is not "behind".
      const p = paceSignal(200, 90, 1000, 1000);
      expect(p.actualPercent).toBe(100);
      expect(p.status).toBe('ON_TRACK');
    });
  });

  describe('degenerate inputs never throw', () => {
    it('treats a plan with no planned minutes as zero progress rather than dividing by it', () => {
      const p = paceSignal(10, 90, 0, 0);
      expect(p.actualPercent).toBe(0);
      expect(Number.isFinite(p.daysAheadOrBehind)).toBe(true);
    });

    it('survives a zero-day plan', () => {
      const p = paceSignal(5, 0, 10, 100);
      expect(p.daysSuggested).toBeGreaterThanOrEqual(1);
      expect(Number.isFinite(p.expectedPercent)).toBe(true);
    });

    it('never reports a negative day count', () => {
      expect(paceSignal(-5, 90, 0, 100).daysElapsed).toBe(0);
    });
  });
});

/**
 * The Foundation programme's length is a tenant's decision, and a journey keeps the one it was
 * composed with.
 *
 * Ninety was written into the code as an invariant. It is still the default and still a promise —
 * every student on a programme gets the same number of days — but the number now belongs to the
 * programme rather than to the source, because a college can run a longer first year.
 *
 * The rule that matters most is the second one: changing the setting must not re-cut the plan of
 * somebody already part-way through it. These tests hold both ends of that.
 */
import {
  validateProgramDays, journeyDaysOf,
  DEFAULT_PROGRAM_DAYS, MIN_PROGRAM_DAYS, MAX_PROGRAM_DAYS,
} from '../services/foundationProgramLengthService';

describe('what a tenant may set', () => {
  it('takes a whole number inside the bounds', () => {
    expect(validateProgramDays(120)).toEqual({ ok: true, days: 120 });
    expect(validateProgramDays(MIN_PROGRAM_DAYS)).toEqual({ ok: true, days: MIN_PROGRAM_DAYS });
    expect(validateProgramDays(MAX_PROGRAM_DAYS)).toEqual({ ok: true, days: MAX_PROGRAM_DAYS });
  });

  it('refuses a number outside them, with the reason', () => {
    const tooLong = validateProgramDays(MAX_PROGRAM_DAYS + 1) as { ok: false; error: string };
    expect(tooLong.ok).toBe(false);
    expect(tooLong.error).toMatch(/between 30 and 180/);
    expect((validateProgramDays(MIN_PROGRAM_DAYS - 1) as any).ok).toBe(false);
  });

  it('refuses anything that is not a whole number of days', () => {
    for (const bad of [90.5, '90 days', '', null, undefined, NaN, Infinity, {}]) {
      expect((validateProgramDays(bad as any) as any).ok).toBe(false);
    }
  });

  it('takes a numeric string, because a form sends one', () => {
    expect(validateProgramDays('120')).toEqual({ ok: true, days: 120 });
  });
});

describe('the length a journey is read at', () => {
  it('is the journey own length, not the tenant setting', () => {
    expect(journeyDaysOf({ totalDays: 90 }, 120)).toBe(90);
    expect(journeyDaysOf({ totalDays: 120 }, 90)).toBe(120);
  });

  it('falls back to the tenant setting when a journey predates the field', () => {
    expect(journeyDaysOf({}, 120)).toBe(120);
    expect(journeyDaysOf(null, 90)).toBe(90);
    expect(journeyDaysOf(undefined, 90)).toBe(90);
  });

  it('ignores a stored length that is not a programme', () => {
    expect(journeyDaysOf({ totalDays: 0 }, 90)).toBe(90);
    expect(journeyDaysOf({ totalDays: 5000 }, 90)).toBe(90);
    expect(journeyDaysOf({ totalDays: 90.5 as any }, 120)).toBe(120);
  });
});

describe('the default', () => {
  it('is still ninety, so an unconfigured tenant sees no change', () => {
    expect(DEFAULT_PROGRAM_DAYS).toBe(90);
  });
});

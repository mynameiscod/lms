/**
 * Reading a number that is allowed to be absent.
 *
 * `Number(null)` is 0. So is `Number('')`, and so is `Number([])`. Every one of them sails
 * through `Number.isFinite`, which is why the obvious guard turned "we do not know" into
 * "zero" on the exact fields whose absence carries meaning — and did it silently.
 *
 * The split that made it survive review: `Number(undefined)` is NaN, so a MISSING PROPERTY
 * behaved correctly while an EXPLICIT NULL did not. The case that works is the one you write
 * a test for; the case that fails is the one in the database, where `cgpa` defaults to null.
 */

import { nullableNumber, hasNumber } from '../utils/nullableNumber';

describe('absent values', () => {
  it('reads null as absent, not as zero', () => {
    // The bug, in one line.
    expect(nullableNumber(null)).toBeNull();
  });

  it('reads undefined as absent', () => {
    expect(nullableNumber(undefined)).toBeNull();
  });

  it('reads an empty or whitespace-only string as absent', () => {
    // A blank form box is somebody not answering. Number('') would score it as zero.
    expect(nullableNumber('')).toBeNull();
    expect(nullableNumber('   ')).toBeNull();
  });

  it('refuses values that only look numeric to the coercion rules', () => {
    // Number([]) is 0 and Number(true) is 1. Neither has ever been anybody's CGPA.
    expect(nullableNumber([])).toBeNull();
    expect(nullableNumber({})).toBeNull();
    expect(nullableNumber(true)).toBeNull();
    expect(nullableNumber(false)).toBeNull();
  });

  it('refuses text that is not a number', () => {
    expect(nullableNumber('not a number')).toBeNull();
    expect(nullableNumber('7 or so')).toBeNull();
  });

  it('refuses arithmetic accidents', () => {
    expect(nullableNumber(NaN)).toBeNull();
    expect(nullableNumber(Infinity)).toBeNull();
    expect(nullableNumber(-Infinity)).toBeNull();
  });
});

describe('present values', () => {
  it('keeps a real zero, because zero means something on some fields', () => {
    // An active-backlog count of 0 is an assertion, not an absence.
    expect(nullableNumber(0)).toBe(0);
    expect(nullableNumber('0')).toBe(0);
  });

  it('keeps ordinary numbers, including decimals and negatives', () => {
    expect(nullableNumber(8.2)).toBe(8.2);
    expect(nullableNumber(7)).toBe(7);
    expect(nullableNumber(-3)).toBe(-3);
  });

  it('reads numbers that arrived as strings, as form bodies and imports do', () => {
    expect(nullableNumber('8.2')).toBe(8.2);
    expect(nullableNumber(' 6.2 ')).toBe(6.2);
  });

  it('distinguishes absent from zero, which falsiness cannot', () => {
    // `v || null` would collapse these two, which is the same bug in a different hat.
    expect(nullableNumber(0)).toBe(0);
    expect(nullableNumber(null)).toBeNull();
    expect(hasNumber(0)).toBe(true);
    expect(hasNumber(null)).toBe(false);
  });
});

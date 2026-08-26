/**
 * How many missions a day serves, now that a tenant can choose.
 *
 * The default is the whole point of these tests. Every tenant that existed before this was
 * configurable has no stored value, and the number they have been getting for months is 3 —
 * so "absent behaves exactly as before" is the guarantee, and a regression there would
 * quietly change the product for everyone rather than failing loudly.
 */

import { missionsForDay, categoriesForDay, clampSlots, AttemptLite } from '../services/passportMissionService';

const ATTEMPT: AttemptLite = {
  careerScore: 50,
  categoryScores: [
    { key: 'technical', label: 'Technical', score: 30 },
    { key: 'aptitude', label: 'Aptitude', score: 45 },
    { key: 'logical_reasoning', label: 'Reasoning', score: 55 },
    { key: 'communication', label: 'Communication', score: 60 },
    { key: 'employability', label: 'Employability', score: 65 },
    { key: 'career_clarity', label: 'Clarity', score: 70 },
  ],
  weaknesses: [],
  pathway: 'software_dev',
  pathwayLabel: 'Software Development',
};

describe('the default is unchanged', () => {
  it('serves three missions when the tenant has set nothing', () => {
    expect(missionsForDay(ATTEMPT, 1)).toHaveLength(3);
  });

  it('reads an absent or unusable value as three', () => {
    expect(clampSlots(undefined)).toBe(3);
    expect(clampSlots(NaN)).toBe(3);
    // A tenant document that has never been touched returns undefined for the field, which
    // is the case that matters — not a caller passing nonsense.
    expect(missionsForDay(ATTEMPT, 1, undefined, 90, undefined, undefined)).toHaveLength(3);
  });
});

describe('a tenant that chooses its own number', () => {
  it.each([1, 2, 4, 5, 6])('serves %i missions a day', n => {
    expect(missionsForDay(ATTEMPT, 1, undefined, 90, undefined, n)).toHaveLength(n);
  });

  it('picks one category per slot, never the same one twice in a day', () => {
    const cats = categoriesForDay(ATTEMPT, 1, 90, 5);
    expect(cats).toHaveLength(5);
    expect(new Set(cats).size).toBe(cats.length);
  });

  /**
   * Refused at the API, clamped here. The two are deliberately different: an admin typing 12
   * is told it is out of range, but a value already in the database — or a caller passing
   * something odd — must never take the generator down.
   */
  it('clamps a silly stored value rather than throwing', () => {
    expect(clampSlots(0)).toBe(1);
    expect(clampSlots(-4)).toBe(1);
    expect(clampSlots(99)).toBe(6);
    expect(missionsForDay(ATTEMPT, 1, undefined, 90, undefined, 99)).toHaveLength(6);
  });

  it('stays deterministic — the same day and count give the same missions', () => {
    const a = missionsForDay(ATTEMPT, 4, undefined, 90, undefined, 4).map(m => m.key);
    const b = missionsForDay(ATTEMPT, 4, undefined, 90, undefined, 4).map(m => m.key);
    expect(a).toEqual(b);
  });

  /**
   * Keys carry the slot index, so raising the count ADDS missions rather than reshuffling
   * the ones a member has already completed today. Without this, a mid-day change would
   * orphan their completions.
   */
  it('keeps the earlier slots stable when the count goes up', () => {
    const three = missionsForDay(ATTEMPT, 7, undefined, 90, undefined, 3).map(m => m.key);
    const five = missionsForDay(ATTEMPT, 7, undefined, 90, undefined, 5).map(m => m.key);
    expect(five.slice(0, 3)).toEqual(three);
  });
});

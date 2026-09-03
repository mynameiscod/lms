/**
 * Targeted questions reach the students they were written for.
 *
 * The query keeps a question when it is untagged OR tagged for this student, so a targeted
 * question and a universal one are equally ELIGIBLE — and the draw then shuffled them
 * together. Five questions written for first-year CSE sitting among two hundred universal
 * ones came up about 2% of the time, which made tagging look like it did nothing: every year
 * received substantially the same paper however carefully it had been tagged.
 *
 * Preference, not exclusion. Universal questions must still fill the slot when the targeted
 * ones run out, or a thinly-tagged skill would produce a short paper — which is the failure
 * mode the generator refuses outright.
 */

/** Counts constrained axes on an evidence row, exactly as specificityOf does. */
const specificityOf = (row: any): number =>
  ['audienceRoles', 'audienceYears', 'audienceCourses', 'audienceBranches']
    .reduce((n, f) => n + ((row?.[f] || []).length ? 1 : 0), 0);

type Item = { sourceId: string; audienceSpecificity: number };

/** The ordering poolFor applies, with the shuffle held constant so the rule is visible. */
const order = (drawn: Item[], seen: Set<string> = new Set()): string[] => {
  const byPreference = (list: Item[]) => list
    .slice()
    .sort((a, b) => (b.audienceSpecificity ?? 0) - (a.audienceSpecificity ?? 0));
  return [
    ...byPreference(drawn.filter(i => !seen.has(i.sourceId))),
    ...byPreference(drawn.filter(i => seen.has(i.sourceId))),
  ].map(i => i.sourceId);
};

const item = (id: string, spec: number): Item => ({ sourceId: id, audienceSpecificity: spec });

describe('how specific a mapping is', () => {
  it('counts each constrained axis', () => {
    expect(specificityOf({})).toBe(0);
    expect(specificityOf({ audienceYears: ['1st Year'] })).toBe(1);
    expect(specificityOf({ audienceYears: ['1st Year'], audienceBranches: ['CSE'] })).toBe(2);
    expect(specificityOf({
      audienceRoles: ['FRONTEND_ENGINEER'], audienceYears: ['1st Year'],
      audienceCourses: ['B.TECH'], audienceBranches: ['CSE'],
    })).toBe(4);
  });

  /** An axis an admin cleared is not a constraint, and must not count as one. */
  it('treats an empty axis as unconstrained', () => {
    expect(specificityOf({ audienceYears: [], audienceBranches: [] })).toBe(0);
  });

  it('survives a missing row', () => {
    expect(specificityOf(undefined)).toBe(0);
    expect(specificityOf({ audienceYears: null })).toBe(0);
  });
});

describe('targeted questions come first', () => {
  /**
   * The case this exists for. Without the preference these five appeared at their share of
   * the pool — about 2% — and a first-year CSE paper was indistinguishable from a
   * second-year one.
   */
  it('puts a few targeted questions ahead of many universal ones', () => {
    const pool = [
      item('u1', 0), item('u2', 0), item('t1', 2), item('u3', 0), item('t2', 2), item('u4', 0),
    ];
    expect(order(pool).slice(0, 2)).toEqual(['t1', 't2']);
  });

  it('prefers the more specific of two targeted questions', () => {
    const pool = [item('year-only', 1), item('year-and-branch', 2), item('universal', 0)];
    expect(order(pool)).toEqual(['year-and-branch', 'year-only', 'universal']);
  });

  /**
   * Preference, not exclusion — the whole pool is still returned in order. A slot that runs
   * past the targeted questions falls through to universal ones rather than going unfilled,
   * because an unfilled slot fails the entire paper.
   */
  it('still returns every universal question behind the targeted ones', () => {
    const pool = [item('t1', 2), item('u1', 0), item('u2', 0)];
    expect(order(pool)).toHaveLength(3);
    expect(order(pool).slice(1)).toEqual(['u1', 'u2']);
  });

  it('changes nothing when nothing is targeted', () => {
    const pool = [item('a', 0), item('b', 0), item('c', 0)];
    // Order preserved: a stable sort on equal keys leaves the shuffle untouched, which is
    // what keeps the same member and seed drawing the same paper.
    expect(order(pool)).toEqual(['a', 'b', 'c']);
  });
});

describe('avoiding a repeat still wins', () => {
  /**
   * Unseen stays the OUTER partition. A student who retakes an assessment and sees the same
   * question reads that as broken; drawing a slightly less specific question does not.
   */
  it('puts an unseen universal question ahead of a targeted one already seen', () => {
    const pool = [item('seen-targeted', 3), item('fresh-universal', 0)];
    expect(order(pool, new Set(['seen-targeted']))).toEqual(['fresh-universal', 'seen-targeted']);
  });

  it('still prefers targeted within the unseen group', () => {
    const pool = [item('fresh-universal', 0), item('fresh-targeted', 2), item('old', 1)];
    expect(order(pool, new Set(['old']))).toEqual(['fresh-targeted', 'fresh-universal', 'old']);
  });
});

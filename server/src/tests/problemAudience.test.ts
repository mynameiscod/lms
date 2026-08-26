/**
 * One problem bank, two products.
 *
 * The rule these pin is the conservative half: a problem written before audiences existed
 * belongs to the LMS and nobody else. Getting that wrong does not fail loudly — it silently
 * publishes the entire Thinking Lab bank to CareerPilot members the moment their list starts
 * reading it, which is a content review nobody performed rather than a crash somebody sees.
 */

import { audienceFilter, PROBLEM_AUDIENCES } from '../models/ThinkingProblem';

describe('who a problem is for', () => {
  it('offers both products, and only those', () => {
    expect([...PROBLEM_AUDIENCES]).toEqual(['lms', 'careerpilot']);
  });

  /**
   * Three shapes mean "LMS": tagged for it, the field absent (written before it existed),
   * or an empty array (an admin cleared every tick). All three must match, or existing
   * Thinking Lab problems vanish from the Thinking Lab.
   */
  it('treats an untagged problem as LMS, not as everyone', () => {
    const f: any = audienceFilter('lms');
    expect(f.$or).toEqual([
      { audiences: 'lms' },
      { audiences: { $exists: false } },
      { audiences: { $size: 0 } },
    ]);
  });

  /**
   * The asymmetry is the point. CareerPilot requires an EXPLICIT tag: an untagged problem
   * is an LMS problem that nobody opted in, and inheriting it by default would be the
   * silent publish this whole design avoids.
   */
  it('requires an explicit tag before CareerPilot sees anything', () => {
    expect(audienceFilter('careerpilot')).toEqual({ audiences: 'careerpilot' });
  });

  it('never matches an untagged problem for CareerPilot', () => {
    const f = JSON.stringify(audienceFilter('careerpilot'));
    expect(f).not.toContain('$exists');
    expect(f).not.toContain('$size');
  });
});

describe('the filter composes with an existing query', () => {
  it('spreads into a query without replacing its other conditions', () => {
    const q = { tenantId: 't1', active: true, ...audienceFilter('lms') };
    expect(q.tenantId).toBe('t1');
    expect(q.active).toBe(true);
    expect((q as any).$or).toHaveLength(3);
  });

  /**
   * A problem tagged for BOTH is matched by either filter — that is what sharing means, and
   * it is the case an $or written the wrong way round would quietly break.
   */
  it('matches a both-audiences problem from either side', () => {
    const doc = { audiences: ['lms', 'careerpilot'] };
    const lms: any = audienceFilter('lms');
    const cp: any = audienceFilter('careerpilot');
    // Mongo's array-contains semantics, applied by hand: `{ audiences: 'lms' }` matches a
    // document whose audiences ARRAY contains 'lms'.
    expect(lms.$or[0].audiences).toBe('lms');
    expect(doc.audiences).toContain(lms.$or[0].audiences);
    expect(doc.audiences).toContain(cp.audiences);
  });
});

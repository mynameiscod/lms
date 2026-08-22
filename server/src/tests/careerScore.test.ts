/**
 * The Career Score moving from a questionnaire onto role readiness.
 *
 * The number itself is sold against — it gates a ₹499 membership and is printed on a public
 * card — so the risk in changing what produces it is not that the new number is wrong. It is
 * that a member who already has a score LOSES it, or has it quietly replaced by something
 * built on almost no evidence.
 *
 * These pin the three refusals that make the migration safe: no role, not enough of the
 * blueprint measured, and nothing measured at all. In every one of them the member keeps
 * exactly what they had.
 */

const updateOne = jest.fn();
jest.mock('../models/User', () => ({
  __esModule: true,
  default: { updateOne: (...a: any[]) => { updateOne(...a); return Promise.resolve({}); } },
}));

const readiness = jest.fn();
jest.mock('../services/roleReadinessService', () => ({
  calculateStudentRoleReadiness: (...a: any[]) => readiness(...a),
}));

import { refreshCareerScoreFromReadiness, MIN_COVERAGE_FOR_SCORE } from '../services/careerScoreService';

const TENANT = 't1';
const STUDENT = 's1';

/** An available readiness result, which each test then varies in one way. */
const available = (over: any = {}) => ({
  available: true,
  readiness: 71,
  coverage: 80,
  confidence: 'HIGH',
  ...over,
});

beforeEach(() => {
  updateOne.mockReset();
  readiness.mockReset();
});

describe('when readiness is a real measurement', () => {
  it('writes the score, the level and where it came from', async () => {
    readiness.mockResolvedValue(available());

    const r = await refreshCareerScoreFromReadiness(TENANT, STUDENT);

    expect(r.updated).toBe(true);
    expect(r.score).toBe(71);

    const [filter, update] = updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: STUDENT, tenantId: TENANT });
    expect(update.$set['passport.careerScore']).toBe(71);
    expect(update.$set['passport.careerScoreSource']).toBe('role_readiness');
    // Without coverage and confidence stored alongside, a 71 built on the minimum
    // evidence is indistinguishable from a 71 built on the whole blueprint.
    expect(update.$set['passport.careerScoreCoverage']).toBe(80);
    expect(update.$set['passport.careerScoreConfidence']).toBe('HIGH');
  });

  it('rounds rather than storing a fraction', async () => {
    readiness.mockResolvedValue(available({ readiness: 62.6 }));
    expect((await refreshCareerScoreFromReadiness(TENANT, STUDENT)).score).toBe(63);
  });

  it('keeps the score inside 0-100 whatever readiness says', async () => {
    readiness.mockResolvedValue(available({ readiness: 140 }));
    expect((await refreshCareerScoreFromReadiness(TENANT, STUDENT)).score).toBe(100);
  });

  it('is scoped to the tenant, so one tenant cannot score another tenant’s member', async () => {
    readiness.mockResolvedValue(available());
    await refreshCareerScoreFromReadiness(TENANT, STUDENT);
    expect(updateOne.mock.calls[0][0]).toHaveProperty('tenantId', TENANT);
  });
});

describe('when it must refuse — and the member keeps what they had', () => {
  const writesNothing = async (expectedReason: string) => {
    const r = await refreshCareerScoreFromReadiness(TENANT, STUDENT);
    expect(r.updated).toBe(false);
    expect(r.reason).toBe(expectedReason);
    expect(updateOne).not.toHaveBeenCalled();
  };

  it('refuses when the member has not chosen a role', async () => {
    readiness.mockResolvedValue({ available: false, reason: 'ROLE_NOT_SELECTED', message: '' });
    await writesNothing('no-role');
  });

  it('refuses when the blueprint is not published', async () => {
    // A blueprint pulled for editing must not zero every member scored against it.
    readiness.mockResolvedValue({ available: false, reason: 'ROLE_BLUEPRINT_NOT_READY', message: '' });
    await writesNothing('unavailable');
  });

  it('refuses when nothing has been measured', async () => {
    // null is not 0. Writing 0 would assert a failure we never observed.
    readiness.mockResolvedValue(available({ readiness: null }));
    await writesNothing('no-readiness');
  });

  it('refuses when too little of the blueprint is covered', async () => {
    // Two skills out of twenty-four can produce a confident-looking 80 that describes
    // nothing. Publishing that would be worse than the questionnaire it replaced.
    readiness.mockResolvedValue(available({ readiness: 80, coverage: MIN_COVERAGE_FOR_SCORE - 1 }));
    await writesNothing('not-enough-measured');
  });

  it('accepts exactly at the coverage threshold', async () => {
    readiness.mockResolvedValue(available({ coverage: MIN_COVERAGE_FOR_SCORE }));
    expect((await refreshCareerScoreFromReadiness(TENANT, STUDENT)).updated).toBe(true);
  });

  it('refuses without throwing when readiness itself fails', async () => {
    // This hangs off a submission that is already saved. It must cost the member nothing.
    readiness.mockRejectedValue(new Error('mongo is down'));
    await writesNothing('unavailable');
  });
});

describe('the coverage threshold', () => {
  it('is a percentage, not a ratio', async () => {
    /**
     * The bug this exists to prevent: `coverage` on RoleReadinessResult is 0-100, and an
     * earlier version of this compared it against 0.34. Every member passed, including ones
     * with a single skill measured, and the score would have looked entirely plausible.
     */
    expect(MIN_COVERAGE_FOR_SCORE).toBeGreaterThan(1);
    expect(MIN_COVERAGE_FOR_SCORE).toBeLessThanOrEqual(100);

    readiness.mockResolvedValue(available({ coverage: 4 }));
    expect((await refreshCareerScoreFromReadiness(TENANT, STUDENT)).updated).toBe(false);
  });
});

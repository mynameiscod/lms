/**
 * Eligibility: what we know, what we do not, and never the two confused.
 *
 * The failure that matters here is the quiet one. CareerPilot does not record a member's
 * CGPA or backlog count — those live on CollegeMembership for college-linked students and
 * nowhere at all for somebody who signed up directly — so a naive implementation that reads
 * an absent CGPA as "below the cut-off" would tell most of the userbase they cannot apply
 * anywhere. Missing data has to produce UNKNOWN, and UNKNOWN has to be visible.
 *
 * Eligibility is also kept entirely apart from readiness. Nothing in this file computes a
 * score, and nothing that computes a score reads a verdict from here.
 */

const TENANT = '507f1f77bcf86cd799439000';
const STUDENT = '507f1f77bcf86cd799439011';

let user: any = null;
let membership: any = null;

const chain = (row: any) => {
  const h: any = Promise.resolve(row);
  h.select = () => h; h.lean = async () => row;
  return h;
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findById: () => chain(user) },
}));

jest.mock('../models/CollegeMembership', () => ({
  __esModule: true,
  default: { findOne: () => chain(membership) },
}));

import { evaluateEligibility } from '../services/companyEligibilityService';

const company = (eligibility: any, verified = true) => ({
  eligibility, verified: { eligibility: verified },
});

const criterion = (r: any, key: string) => r.criteria.find((c: any) => c.key === key);

beforeEach(() => {
  jest.clearAllMocks();
  user = { _id: STUDENT, passport: { branch: 'CSE', program: 'B.Tech', graduationYear: 2027 } };
  membership = null;
});

// ── the common case: we do not know ─────────────────────────────────────────

describe('a member whose academic record we do not hold', () => {
  it('is potentially eligible, never NOT eligible', async () => {
    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0, backlogsAllowed: 0 }));

    // The whole point. An absent CGPA is not a failed CGPA.
    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(criterion(r, 'cgpa').status).toBe('UNKNOWN');
    expect(criterion(r, 'cgpa').studentValue).toBeNull();
  });

  it('says which criteria it could not check, rather than hiding them', async () => {
    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0, backlogsAllowed: 0 }));

    expect(r.message).toMatch(/CGPA/i);
    expect(r.message).toMatch(/Backlogs/i);
    expect(criterion(r, 'cgpa').detail).toMatch(/do not have your CGPA/i);
  });

  it('still reports a cut-off it can never check, rather than omitting it', async () => {
    // Silently dropping Class 10 would read to the student as having passed it.
    const r = await evaluateEligibility(TENANT, STUDENT, company({ tenthMin: 60, twelfthMin: 60, gapYearsAllowed: 1 }));

    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(criterion(r, 'tenth').status).toBe('UNKNOWN');
    expect(criterion(r, 'twelfth').status).toBe('UNKNOWN');
    expect(criterion(r, 'gapYears').status).toBe('UNKNOWN');
  });
});

// ── when the college record exists ──────────────────────────────────────────

describe('a college-linked student, whose record we do hold', () => {
  it('clears a CGPA cut-off it meets', async () => {
    membership = { cgpa: 8.1, backlogs: 0 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0, backlogsAllowed: 0, branches: ['CSE', 'IT'] }));

    expect(r.verdict).toBe('ELIGIBLE');
    expect(criterion(r, 'cgpa').status).toBe('MET');
    expect(criterion(r, 'cgpa').studentValue).toBe('8.1');
    expect(criterion(r, 'branch').status).toBe('MET');
  });

  it('is not eligible when a verified cut-off is genuinely missed, and is told which', async () => {
    membership = { cgpa: 6.2, backlogs: 0 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    expect(r.verdict).toBe('NOT_ELIGIBLE');
    expect(r.decidedBy).toBe('cgpa');
    // The exact criterion, with both numbers. A verdict with no reason is not actionable.
    expect(r.message).toMatch(/7/);
    expect(r.message).toMatch(/6\.2/);
  });

  it('lets one known failure outrank any number of unknowns', async () => {
    // Backlogs disqualify; CGPA and Class 10 are unknown. The thing we DO know decides it.
    membership = { backlogs: 2 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0, backlogsAllowed: 0, tenthMin: 60 }));

    expect(r.verdict).toBe('NOT_ELIGIBLE');
    expect(r.decidedBy).toBe('backlogs');
    expect(criterion(r, 'cgpa').status).toBe('UNKNOWN');
  });

  it('accepts backlogs within an allowance', async () => {
    membership = { backlogs: 1 };
    const r = await evaluateEligibility(TENANT, STUDENT, company({ backlogsAllowed: 2 }));

    expect(r.verdict).toBe('ELIGIBLE');
    expect(criterion(r, 'backlogs').status).toBe('MET');
  });
});

// ── branch ──────────────────────────────────────────────────────────────────

describe('branch matching', () => {
  it('ignores case and punctuation', async () => {
    user = { passport: { branch: 'c.s.e' } };
    const r = await evaluateEligibility(TENANT, STUDENT, company({ branches: ['CSE'] }));

    expect(criterion(r, 'branch').status).toBe('MET');
  });

  it('rules a student out of a branch the company does not hire from', async () => {
    user = { passport: { branch: 'MECH' } };
    const r = await evaluateEligibility(TENANT, STUDENT, company({ branches: ['CSE', 'IT'] }));

    expect(r.verdict).toBe('NOT_ELIGIBLE');
    expect(r.decidedBy).toBe('branch');
    expect(r.message).toMatch(/CSE, IT/);
  });

  it('does not guess when the student has not set a branch', async () => {
    user = { passport: {} };
    const r = await evaluateEligibility(TENANT, STUDENT, company({ branches: ['CSE'] }));

    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(criterion(r, 'branch').status).toBe('UNKNOWN');
  });
});

// ── unverified and unconfigured ─────────────────────────────────────────────

describe('criteria nobody has signed off', () => {
  it('are not applied at all', async () => {
    membership = { cgpa: 6.2 };
    // An AI-drafted cut-off nobody checked. Applying it would tell a student not to apply
    // on the strength of a number the model invented.
    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }, false));

    expect(r.verdict).toBe('UNKNOWN');
    expect(r.verified).toBe(false);
    expect(r.criteria).toHaveLength(0);
    expect(r.message).toMatch(/not available yet/i);
  });

  it('report unknown rather than eligible when a company has configured nothing', async () => {
    const r = await evaluateEligibility(TENANT, STUDENT, company({}, true));

    // "Eligible" would be a claim; "we do not know" is the truth.
    expect(r.verdict).toBe('UNKNOWN');
  });

  it('report unknown when there is no company at all', async () => {
    const r = await evaluateEligibility(TENANT, STUDENT, null);
    expect(r.verdict).toBe('UNKNOWN');
  });
});

// ── it is not readiness ─────────────────────────────────────────────────────

describe('eligibility and readiness stay apart', () => {
  it('returns no score, no skills and no readiness of any kind', async () => {
    membership = { cgpa: 9.5, backlogs: 0 };
    const r: any = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    expect(r.verdict).toBe('ELIGIBLE');
    // A student can clear every cut-off and be nowhere near ready. This service must not
    // imply otherwise by carrying anything that looks like a score.
    expect(r.readiness).toBeUndefined();
    expect(r.score).toBeUndefined();
    expect(r.skills).toBeUndefined();
  });
});

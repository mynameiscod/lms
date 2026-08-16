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

// ── regression: an unrecorded number is not a zero ──────────────────────────

/**
 * The shipped code read every nullable figure with
 *
 *     Number.isFinite(Number(v)) ? Number(v) : null
 *
 * and `Number(null)` is 0. CollegeMembership.cgpa DEFAULTS to null, so any college-linked
 * student whose CGPA had never been entered was compared as a CGPA of 0 — and failed every
 * cut-off a company had published, by the widest possible margin, with a confident message
 * quoting the number back at them.
 *
 * What made it survive: `Number(undefined)` is NaN, so a student with NO membership row
 * behaved correctly. The broken case was the one with a record.
 */
describe('a college record that exists but has no CGPA', () => {
  it('is UNKNOWN, not a CGPA of zero', async () => {
    membership = { cgpa: null, backlogs: 0 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    expect(criterion(r, 'cgpa').status).toBe('UNKNOWN');
    expect(criterion(r, 'cgpa').studentValue).toBeNull();
    // Emphatically not NOT_ELIGIBLE, and emphatically not "our record shows 0".
    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(criterion(r, 'cgpa').detail).not.toMatch(/0/);
  });

  it('does not let the missing CGPA drag the whole verdict down', async () => {
    // Everything we can check passes; the only unknown is the CGPA.
    membership = { cgpa: null, backlogs: 0 };
    user = { passport: { branch: 'CSE' } };

    const r = await evaluateEligibility(TENANT, STUDENT, company({
      cgpaMin: 7.0, backlogsAllowed: 0, branches: ['CSE'],
    }));

    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(r.decidedBy).toBeNull();
    expect(criterion(r, 'backlogs').status).toBe('MET');
    expect(criterion(r, 'branch').status).toBe('MET');
  });

  it('behaves the same as having no membership row at all', async () => {
    membership = { cgpa: null };
    const withRow = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    membership = null;
    const withoutRow = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    expect(criterion(withRow, 'cgpa').status).toBe(criterion(withoutRow, 'cgpa').status);
    expect(withRow.verdict).toBe(withoutRow.verdict);
  });

  it('still reads a genuine CGPA either side of the cut-off', async () => {
    membership = { cgpa: 8.2 };
    expect(criterion(await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 })), 'cgpa').status).toBe('MET');

    membership = { cgpa: 6.2 };
    const low = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));
    expect(criterion(low, 'cgpa').status).toBe('NOT_MET');
    expect(low.verdict).toBe('NOT_ELIGIBLE');
  });

  it('still reads a CGPA that arrived as a string', async () => {
    membership = { cgpa: '8.2' };
    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0 }));

    expect(criterion(r, 'cgpa').status).toBe('MET');
    expect(criterion(r, 'cgpa').studentValue).toBe('8.2');
  });
});

describe('backlog semantics are preserved deliberately', () => {
  it('treats a recorded 0 as a real answer, because that is the schema default', async () => {
    // CollegeMembership.backlogs defaults to 0, so a row with nothing entered genuinely
    // asserts "no active backlogs". That must keep comparing as zero.
    membership = { cgpa: 8.0, backlogs: 0 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ backlogsAllowed: 0 }));

    expect(criterion(r, 'backlogs').status).toBe('MET');
    expect(criterion(r, 'backlogs').studentValue).toBe('0');
    expect(r.verdict).toBe('ELIGIBLE');
  });

  it('treats an explicit null as unknown rather than as zero backlogs', async () => {
    // The one case where nobody has asserted anything. Reading it as 0 would claim a clean
    // record on the student's behalf.
    membership = { cgpa: 8.0, backlogs: null };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ backlogsAllowed: 0 }));

    expect(criterion(r, 'backlogs').status).toBe('UNKNOWN');
    expect(r.verdict).toBe('POTENTIALLY_ELIGIBLE');
  });

  it('still fails a genuine backlog count over the allowance', async () => {
    membership = { cgpa: 8.0, backlogs: 3 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ backlogsAllowed: 1 }));

    expect(r.verdict).toBe('NOT_ELIGIBLE');
    expect(r.decidedBy).toBe('backlogs');
  });
});

describe('a company threshold stored as null', () => {
  it('is not configured, rather than a cut-off of zero', async () => {
    // `Number(null)` would have produced "CGPA 0 and above" — a criterion every student
    // passes, cluttering the panel with a rule nobody wrote.
    membership = { cgpa: 8.0 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: null, backlogsAllowed: null }));

    expect(r.criteria).toHaveLength(0);
    expect(r.verdict).toBe('UNKNOWN');
  });

  it('still honours a genuine zero allowance', async () => {
    // `backlogsAllowed: 0` is the most common real configuration there is.
    membership = { cgpa: 8.0, backlogs: 2 };

    const r = await evaluateEligibility(TENANT, STUDENT, company({ backlogsAllowed: 0 }));

    expect(criterion(r, 'backlogs').required).toBe('No active backlogs');
    expect(r.verdict).toBe('NOT_ELIGIBLE');
  });
});

describe('other nullable profile numbers', () => {
  it('never render a missing graduation year as 0', async () => {
    user = { passport: { branch: 'CSE', graduationYear: null } };
    membership = { cgpa: 8.0 };

    const r: any = await evaluateEligibility(TENANT, STUDENT, company({ cgpaMin: 7.0, branches: ['CSE'] }));

    // Not surfaced as a criterion today, but it must not be sitting in the record as a
    // year 0 waiting for the first thing that reads it.
    expect(JSON.stringify(r)).not.toMatch(/"0"/);
    expect(r.verdict).toBe('ELIGIBLE');
  });

  it('never render any absent value as the string "0"', async () => {
    membership = { cgpa: null, backlogs: null };
    user = { passport: {} };

    const r = await evaluateEligibility(TENANT, STUDENT, company({
      cgpaMin: 7.0, backlogsAllowed: 0, branches: ['CSE'], tenthMin: 60,
    }));

    for (const c of r.criteria) {
      if (c.status === 'UNKNOWN') expect(c.studentValue).toBeNull();
    }
    expect(r.criteria.some(c => c.studentValue === '0')).toBe(false);
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

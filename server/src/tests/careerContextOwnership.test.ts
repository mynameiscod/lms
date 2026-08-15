/**
 * Ownership and tenant isolation for the career context.
 *
 * The models are mocked rather than run against a database, because what needs proving
 * here is not that Mongo filters correctly — it is that the SERVICE always asks it to.
 * These assert the shape of every query, so a future edit that drops `tenantId` from a
 * lookup fails here instead of in production.
 *
 * There is no in-memory Mongo in this repo, so this is also the only level at which the
 * guarantee can be tested at all without adding infrastructure.
 */

const findOneUser = jest.fn();
const findOneProfile = jest.fn();

jest.mock('../models/User', () => ({
  __esModule: true,
  default: { findOne: (...a: any[]) => findOneUser(...a) },
}));
jest.mock('../models/StudentProfile', () => ({
  __esModule: true,
  default: { findOne: (...a: any[]) => findOneProfile(...a) },
}));

import { getCareerContext } from '../services/careerContextService';
import { ROLE_NOT_SURE, DEFAULT_DOMAIN } from '../services/careerDomainService';

const lean = (value: any) => ({ select: () => ({ lean: async () => value }), lean: async () => value });

const MEMBER = {
  _id: 'student-a',
  passport: {
    degree: 'B.Tech', branch: 'CSE', yearOfStudy: '2nd Year',
    primaryRole: 'BACKEND_ENGINEER', careerDomain: 'SOFTWARE_ENGINEERING',
    preferredLanguages: ['Java'], minutesPerDay: 60,
  },
};

beforeEach(() => {
  findOneUser.mockReset();
  findOneProfile.mockReset();
  findOneProfile.mockReturnValue(lean(null));
});

describe('a member can only ever reach their own context', () => {
  it('scopes the user lookup by BOTH the caller id and their tenant', async () => {
    findOneUser.mockReturnValue(lean(MEMBER));
    await getCareerContext('tenant-1', 'student-a');

    expect(findOneUser).toHaveBeenCalledWith({ _id: 'student-a', tenantId: 'tenant-1' });
  });

  it('returns null for a member belonging to another tenant', async () => {
    // What Mongo does when the tenant does not match: no document.
    findOneUser.mockReturnValue(lean(null));
    const ctx = await getCareerContext('tenant-2', 'student-a');

    expect(ctx).toBeNull();
    expect(findOneUser).toHaveBeenCalledWith({ _id: 'student-a', tenantId: 'tenant-2' });
  });

  it('never queries by id alone, which would cross tenants', async () => {
    findOneUser.mockReturnValue(lean(MEMBER));
    await getCareerContext('tenant-1', 'student-a');

    for (const call of findOneUser.mock.calls) {
      expect(call[0]).toHaveProperty('tenantId');
    }
  });
});

describe('an existing member with no career context does not crash', () => {
  it('resolves a bare passport into a usable context', async () => {
    findOneUser.mockReturnValue(lean({ _id: 'old', passport: { degree: 'B.Tech', yearOfStudy: '1st Year' } }));
    const ctx = await getCareerContext('tenant-1', 'old');

    expect(ctx).not.toBeNull();
    expect(ctx!.career.primaryRole).toBe(ROLE_NOT_SURE);      // absent reads as "not sure"
    expect(ctx!.career.domain).toBe(DEFAULT_DOMAIN);
    expect(ctx!.availability.minutesPerDay).toBeNull();
    expect(ctx!.status.onboardingCompleted).toBe(false);
    expect(ctx!.derived.stage).toBe('foundation');            // still fully staged
    expect(ctx!.status.missing).toContain('availability.minutesPerDay');
  });

  it('survives a member with no passport object at all', async () => {
    findOneUser.mockReturnValue(lean({ _id: 'plain' }));
    const ctx = await getCareerContext('tenant-1', 'plain');

    expect(ctx).not.toBeNull();
    expect(ctx!.derived.stage).toBeNull();                    // nothing known, nothing guessed
    expect(ctx!.career.preferredProgrammingLanguages).toEqual([]);
  });
});

describe('prefill — the LMS already knows this student', () => {
  it('answers from StudentProfile without the member re-entering anything', async () => {
    findOneUser.mockReturnValue(lean({ _id: 'x', passport: { yearOfStudy: '1st Year' } }));
    findOneProfile.mockReturnValue(lean({
      education: { degree: { name: 'B.Tech', branch: 'CSE', college: 'ABC Engineering College', graduationYear: 2030 } },
      personalInfo: { state: 'Telangana', city: 'Hyderabad', country: 'India' },
      technicalBackground: { programmingLanguages: ['Java'] },
    }));

    const ctx = await getCareerContext('tenant-1', 'x', new Date('2026-08-15T00:00:00Z'));

    expect(ctx!.education.degree).toBe('B.Tech');
    expect(ctx!.education.branch).toBe('CSE');
    expect(ctx!.education.collegeName).toBe('ABC Engineering College');
    expect(ctx!.education.graduationYear).toBe(2030);
    expect(ctx!.location.state).toBe('Telangana');
    expect(ctx!.location.city).toBe('Hyderabad');
    expect(ctx!.derived.background).toBe('cs');
    expect(ctx!.derived.stage).toBe('foundation');
  });

  it('keeps "languages I know" apart from "languages I want to work in"', async () => {
    // Collapsing these would let a course someone sat decide the plan they get.
    findOneUser.mockReturnValue(lean({ _id: 'x', passport: { preferredLanguages: ['Python'] } }));
    findOneProfile.mockReturnValue(lean({ technicalBackground: { programmingLanguages: ['C', 'Java'] } }));

    const ctx = await getCareerContext('tenant-1', 'x');

    expect(ctx!.career.knownProgrammingLanguages).toEqual(['C', 'Java']);
    expect(ctx!.career.preferredProgrammingLanguages).toEqual(['Python']);
  });

  it('prefers the profile over the cached passport copy when the two disagree', async () => {
    // The profile is the owner; the passport copy is a cache that can lag behind it.
    findOneUser.mockReturnValue(lean({ _id: 'x', passport: { degree: 'B.Sc', yearOfStudy: '2nd Year' } }));
    findOneProfile.mockReturnValue(lean({ education: { degree: { name: 'B.Tech', branch: 'CSE' } } }));

    const ctx = await getCareerContext('tenant-1', 'x');
    expect(ctx!.education.degree).toBe('B.Tech');
  });
});

describe('derived values are computed, never read from storage', () => {
  it('ignores a stale stage cached on the member', async () => {
    // A member whose record still says 'foundation' after moving into their final year.
    findOneUser.mockReturnValue(lean({
      _id: 'x',
      passport: { degree: 'B.Tech', yearOfStudy: '4th Year', stage: 'foundation', background: 'non_cs', branch: 'CSE' },
    }));

    const ctx = await getCareerContext('tenant-1', 'x');
    expect(ctx!.derived.stage).toBe('placement');
    expect(ctx!.derived.background).toBe('cs');
  });
});

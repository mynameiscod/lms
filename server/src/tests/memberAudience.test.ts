/**
 * The one targeting rule, now shared by the Thinking Lab, the Communication Lab and the
 * concept bank.
 *
 * Extracted because three near-identical copies would drift — one gaining a
 * case-insensitive compare or a degree/program fallback the others silently lacked, so the
 * same tag would reach a member on one screen and not another for no visible reason.
 *
 * The failure mode is always the same and always quiet: nobody reports content they were
 * never shown. So the permissive defaults are pinned hardest.
 */

import {
  audienceServes, readMemberAudience, audienceIsOpen, EMPTY_MEMBER_AUDIENCE,
} from '../models/memberAudience';

const AUD = (over: any = {}) => ({ ...EMPTY_MEMBER_AUDIENCE(), ...over });

const MEMBER = (over: any = {}) => ({
  yearOfStudy: '2nd Year',
  degree: 'B.Tech',
  program: null,
  branch: 'CSE',
  primaryRole: 'BACKEND_ENGINEER',
  secondaryRole: null,
  stage: 'foundation',
  ...over,
});

describe('untargeted content reaches everybody', () => {
  it('matches a fully populated member', () => {
    expect(audienceServes(AUD(), MEMBER())).toBe(true);
  });

  /** Everything written before targeting existed has no audience block at all. */
  it('matches when the block is absent', () => {
    expect(audienceServes(undefined, MEMBER())).toBe(true);
    expect(audienceServes(null, MEMBER())).toBe(true);
  });

  it('matches a member with nothing on record', () => {
    expect(audienceServes(AUD(), {})).toBe(true);
    expect(audienceServes(AUD(), null)).toBe(true);
  });
});

describe('each axis narrows independently', () => {
  it('matches on year', () => {
    expect(audienceServes(AUD({ years: ['2nd Year'] }), MEMBER())).toBe(true);
    expect(audienceServes(AUD({ years: ['4th Year'] }), MEMBER())).toBe(false);
  });

  it('matches on branch', () => {
    expect(audienceServes(AUD({ branches: ['CSE'] }), MEMBER())).toBe(true);
    expect(audienceServes(AUD({ branches: ['Electronics / ECE'] }), MEMBER())).toBe(false);
  });

  it('ORs within an axis', () => {
    expect(audienceServes(AUD({ years: ['1st Year', '2nd Year'] }), MEMBER())).toBe(true);
  });

  it('ANDs across axes', () => {
    // Right year, wrong branch — the combination is what makes targeting useful.
    expect(audienceServes(AUD({ years: ['2nd Year'], branches: ['Electronics / ECE'] }), MEMBER())).toBe(false);
    expect(audienceServes(AUD({ years: ['2nd Year'], branches: ['CSE'] }), MEMBER())).toBe(true);
  });

  /** Admins type "B.Tech" without knowing whether onboarding wrote degree or program. */
  it('accepts a course match from either degree or program', () => {
    const a = AUD({ courses: ['B.Tech'] });
    expect(audienceServes(a, MEMBER({ degree: 'B.Tech', program: null }))).toBe(true);
    expect(audienceServes(a, MEMBER({ degree: null, program: 'B.Tech' }))).toBe(true);
    expect(audienceServes(a, MEMBER({ degree: 'BCA', program: null }))).toBe(false);
  });

  it('matches a role from either primary or secondary', () => {
    const a = AUD({ roles: ['DATA_ANALYST'] });
    expect(audienceServes(a, MEMBER({ secondaryRole: 'DATA_ANALYST' }))).toBe(true);
    expect(audienceServes(a, MEMBER())).toBe(false);
  });

  /**
   * Branch values have been typed by hand, chosen from lists that changed, and migrated.
   * An exact compare would fail silently on "cse" vs "CSE" — and silence is the problem.
   */
  it('ignores case and padding on both sides', () => {
    expect(audienceServes(AUD({ branches: ['  cse '] }), MEMBER({ branch: 'CSE' }))).toBe(true);
    expect(audienceServes(AUD({ branches: ['CSE'] }), MEMBER({ branch: ' cse' }))).toBe(true);
  });

  it('does not match when the member lacks a value on a constrained axis', () => {
    expect(audienceServes(AUD({ branches: ['CSE'] }), MEMBER({ branch: null }))).toBe(false);
  });

  it('treats an axis of only blanks as no constraint', () => {
    expect(audienceServes(AUD({ branches: ['', '   '] }), MEMBER({ branch: null }))).toBe(true);
  });
});

describe('reading an audience off a request', () => {
  it('drops blanks rather than storing an axis that matches nobody', () => {
    expect(readMemberAudience({ years: ['2nd Year', '', '  '] }).years).toEqual(['2nd Year']);
  });

  it('uppercases roles, because that is how they are stored', () => {
    expect(readMemberAudience({ roles: ['backend_engineer'] }).roles).toEqual(['BACKEND_ENGINEER']);
  });

  it('yields a fully empty audience from nothing at all', () => {
    expect(readMemberAudience(undefined)).toEqual(EMPTY_MEMBER_AUDIENCE());
    expect(readMemberAudience({ years: 'not-an-array' }).years).toEqual([]);
  });

  it('survives non-string entries', () => {
    expect(readMemberAudience({ years: [2, null, '3rd Year'] }).years).toEqual(['2', '3rd Year']);
  });
});

describe('knowing when nothing is constrained', () => {
  it('reports an empty audience as open', () => {
    expect(audienceIsOpen(EMPTY_MEMBER_AUDIENCE())).toBe(true);
    expect(audienceIsOpen(undefined)).toBe(true);
  });

  it('reports any constraint as not open', () => {
    expect(audienceIsOpen(AUD({ branches: ['CSE'] }))).toBe(false);
  });
});

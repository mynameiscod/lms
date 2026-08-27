/**
 * Who a concept's material is served to.
 *
 * The rules here are cheap to state and expensive to get wrong in one specific direction:
 * a targeting bug that HIDES material is invisible. Nobody reports a note they were never
 * offered, so these pin the permissive defaults hard.
 */

import { resourceServes, EMPTY_AUDIENCE } from '../models/CareerSkillResource';

const RES = (over: any = {}) => ({
  audience: { ...EMPTY_AUDIENCE(), ...(over.audience || {}) },
  scoreWindow: over.scoreWindow,
}) as any;

const MEMBER = (over: any = {}) => ({
  yearOfStudy: '2nd Year',
  degree: 'B.Tech',
  program: 'B.Tech',
  branch: 'CSE',
  primaryRole: 'BACKEND_DEVELOPER',
  secondaryRole: null,
  stage: 'foundation',
  preferredLanguages: ['java'],
  ...over,
});

describe('an untargeted resource reaches everybody', () => {
  it('matches a fully populated member', () => {
    expect(resourceServes(RES(), MEMBER(), 40)).toBe(true);
  });

  /** The case that matters most: nothing authored before targeting existed carries tags. */
  it('matches a member with nothing on record at all', () => {
    expect(resourceServes(RES(), {} as any, null)).toBe(true);
  });

  it('treats an absent audience block as no constraint', () => {
    expect(resourceServes({ audience: undefined } as any, MEMBER(), 10)).toBe(true);
  });

  it('treats an audience of empty arrays as no constraint', () => {
    expect(resourceServes(RES({ audience: EMPTY_AUDIENCE() }), MEMBER(), 10)).toBe(true);
  });
});

describe('each axis constrains independently', () => {
  it('matches on year', () => {
    expect(resourceServes(RES({ audience: { years: ['2nd Year'] } }), MEMBER(), 50)).toBe(true);
    expect(resourceServes(RES({ audience: { years: ['3rd Year'] } }), MEMBER(), 50)).toBe(false);
  });

  it('lists within one axis as OR', () => {
    const r = RES({ audience: { years: ['1st Year', '2nd Year'] } });
    expect(resourceServes(r, MEMBER(), 50)).toBe(true);
  });

  it('combines across axes as AND', () => {
    const r = RES({ audience: { years: ['2nd Year'], branches: ['ECE'] } });
    expect(resourceServes(r, MEMBER(), 50)).toBe(false);   // right year, wrong branch
  });

  /** Admins type "B.Tech" without knowing whether onboarding wrote degree or program. */
  it('accepts a course match from either degree or program', () => {
    const r = RES({ audience: { courses: ['B.Tech'] } });
    expect(resourceServes(r, MEMBER({ degree: 'B.Tech', program: null }), 50)).toBe(true);
    expect(resourceServes(r, MEMBER({ degree: null, program: 'B.Tech' }), 50)).toBe(true);
  });

  it('matches a role from either primary or secondary', () => {
    const r = RES({ audience: { roles: ['DATA_ANALYST'] } });
    expect(resourceServes(r, MEMBER({ secondaryRole: 'DATA_ANALYST' }), 50)).toBe(true);
  });

  it('matches any one of the member\'s preferred languages', () => {
    const r = RES({ audience: { languages: ['python'] } });
    expect(resourceServes(r, MEMBER({ preferredLanguages: ['java', 'python'] }), 50)).toBe(true);
    expect(resourceServes(r, MEMBER({ preferredLanguages: ['java'] }), 50)).toBe(false);
  });

  it('ignores case and padding on both sides', () => {
    const r = RES({ audience: { branches: ['  cse  '] } });
    expect(resourceServes(r, MEMBER({ branch: 'CSE' }), 50)).toBe(true);
  });

  it('does not match a member whose value is missing on a constrained axis', () => {
    const r = RES({ audience: { branches: ['CSE'] } });
    expect(resourceServes(r, MEMBER({ branch: null }), 50)).toBe(false);
  });
});

describe('the weakness window', () => {
  it('serves remedial material only below its ceiling', () => {
    const r = RES({ scoreWindow: { min: null, max: 50 } });
    expect(resourceServes(r, MEMBER(), 30)).toBe(true);
    expect(resourceServes(r, MEMBER(), 70)).toBe(false);
  });

  it('serves advanced material only above its floor', () => {
    const r = RES({ scoreWindow: { min: 70, max: null } });
    expect(resourceServes(r, MEMBER(), 85)).toBe(true);
    expect(resourceServes(r, MEMBER(), 40)).toBe(false);
  });

  it('treats both bounds as inclusive', () => {
    const r = RES({ scoreWindow: { min: 40, max: 60 } });
    expect(resourceServes(r, MEMBER(), 40)).toBe(true);
    expect(resourceServes(r, MEMBER(), 60)).toBe(true);
  });

  /**
   * An unmeasured skill passes. Failing closed here would hide every resource for a skill
   * the member has not been assessed on — the moment they most need something to read.
   */
  it('serves a member who has no score on the skill yet', () => {
    const r = RES({ scoreWindow: { min: 70, max: null } });
    expect(resourceServes(r, MEMBER(), null)).toBe(true);
    expect(resourceServes(r, MEMBER(), undefined)).toBe(true);
  });

  it('ignores a window with no bounds set', () => {
    expect(resourceServes(RES({ scoreWindow: { min: null, max: null } }), MEMBER(), 5)).toBe(true);
  });
});

describe('audience and window compose', () => {
  it('needs both to hold', () => {
    const r = RES({ audience: { years: ['2nd Year'] }, scoreWindow: { max: 50 } });
    expect(resourceServes(r, MEMBER(), 30)).toBe(true);
    expect(resourceServes(r, MEMBER(), 80)).toBe(false);                       // window fails
    expect(resourceServes(r, MEMBER({ yearOfStudy: '4th Year' }), 30)).toBe(false); // audience fails
  });
});

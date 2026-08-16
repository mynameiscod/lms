/**
 * Configuring what a company expects.
 *
 * Two rules do most of the work here. A requirement may only name a skill the canonical
 * catalogue already has — a company-specific key would be a requirement no evidence could
 * ever be scored against, so it would read to every student as a permanent gap they cannot
 * close. And publishing is versioned, because a result stored in March was measured against
 * what we believed in March.
 */

const TENANT = 't1';

let catalogue: any[] = [];
let profiles: any[] = [];
let roles: any[] = [];

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const v = doc[k];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return (cond.$in as any[]).map(String).includes(String(v));
      if ('$ne' in cond) return String(v) !== String(cond.$ne);
    }
    return String(v) === String(cond);
  });

const chain = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.lean = async () => rows;
  return h;
};

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(catalogue.filter(d => matches(d, q))) },
}));

jest.mock('../models/CompanyRoleProfile', () => ({
  __esModule: true,
  DEFAULT_ROLE_KEY: 'DEFAULT',
  default: {
    findOne: (q: any) => {
      const doc = profiles.find(d => matches(d, q));
      const h: any = Promise.resolve(doc || null);
      h.sort = () => h; h.select = () => h; h.lean = async () => doc || null;
      return h;
    },
    updateMany: async (q: any, u: any) => {
      let n = 0;
      for (const d of profiles.filter(x => matches(x, q))) { Object.assign(d, u.$set); n += 1; }
      return { modifiedCount: n };
    },
  },
}));

jest.mock('../services/careerRoleService', () => ({
  __esModule: true,
  getCareerRole: async (_t: string, key: string) => roles.find(r => r.key === key) || null,
}));

import {
  cleanRequirements, cleanRoundSkills, validateProfile, nextVersion, publishProfile,
  daysSinceReview, REVIEW_DUE_DAYS,
} from '../services/companyProfileService';

const stored = (over: any = {}) => {
  const doc: any = {
    _id: `p${profiles.length + 1}`,
    tenantId: TENANT, companySlug: 'amazon', roleKey: 'BACKEND_ENGINEER',
    version: 1, status: 'DRAFT',
    skillRequirements: [{ skillKey: 'DSA_ARRAYS', importance: 'ESSENTIAL', targetLevel: 'PROFICIENT', weight: 10 }],
    effectiveFrom: null, lastReviewedAt: null, publishedAt: null,
    ...over,
  };
  doc.save = async () => doc;
  return doc;
};

beforeEach(() => {
  jest.clearAllMocks();
  catalogue = [
    { key: 'DSA_ARRAYS', active: true },
    { key: 'JAVA_OOP', active: true },
    { key: 'PROBLEM_SOLVING', active: true },
    { key: 'COBOL_LEGACY', active: false },
  ];
  profiles = [];
  roles = [{ key: 'BACKEND_ENGINEER', name: 'Backend Engineer' }];
});

// ── canonical keys only ─────────────────────────────────────────────────────

describe('skill requirements must be canonical', () => {
  it('accepts keys that exist in the catalogue', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'BACKEND_ENGINEER',
      skillRequirements: cleanRequirements([{ skillKey: 'DSA_ARRAYS', weight: 10 }]),
      roundSkills: [],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects a company-specific skill, and says why', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'BACKEND_ENGINEER',
      skillRequirements: cleanRequirements([
        { skillKey: 'DSA_ARRAYS', weight: 10 },
        { skillKey: 'AMAZON_DSA', weight: 10 },
      ]),
      roundSkills: [],
    });

    expect(r.ok).toBe(false);
    expect(r.unknownSkills).toEqual(['AMAZON_DSA']);
    // Names the key AND the rule, so an admin does not solve it by inventing another key.
    expect(r.message).toMatch(/AMAZON_DSA/);
    expect(r.message).toMatch(/company-specific skills are not allowed/i);
  });

  it('rejects an unknown key hiding in the round mapping', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'BACKEND_ENGINEER',
      skillRequirements: cleanRequirements([{ skillKey: 'DSA_ARRAYS', weight: 10 }]),
      roundSkills: cleanRoundSkills([{ roundKey: 'coding', skillKeys: ['DSA_ARRAYS', 'TCS_APTITUDE'] }]),
    });

    expect(r.ok).toBe(false);
    expect(r.unknownSkills).toEqual(['TCS_APTITUDE']);
  });

  it('rejects a skill the catalogue has retired, with a different message', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'BACKEND_ENGINEER',
      skillRequirements: cleanRequirements([{ skillKey: 'COBOL_LEGACY', weight: 5 }]),
      roundSkills: [],
    });

    expect(r.ok).toBe(false);
    expect(r.inactiveSkills).toEqual(['COBOL_LEGACY']);
    expect(r.message).toMatch(/retired/i);
  });

  it('rejects a role this tenant does not have', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'ASTRONAUT',
      skillRequirements: cleanRequirements([{ skillKey: 'DSA_ARRAYS', weight: 10 }]),
      roundSkills: [],
    });

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not a career role/i);
  });

  it('allows the company-wide DEFAULT profile without a role', async () => {
    const r = await validateProfile(TENANT, {
      roleKey: 'DEFAULT',
      skillRequirements: cleanRequirements([{ skillKey: 'DSA_ARRAYS', weight: 10 }]),
      roundSkills: [],
    });
    expect(r.ok).toBe(true);
  });

  it('refuses an empty profile rather than storing one that measures nothing', async () => {
    const r = await validateProfile(TENANT, { roleKey: 'BACKEND_ENGINEER', skillRequirements: [], roundSkills: [] });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/at least one skill requirement/i);
  });
});

// ── normalisation ───────────────────────────────────────────────────────────

describe('normalising what the editor sends', () => {
  it('upper-cases keys and clamps weights into range', () => {
    const out = cleanRequirements([
      { skillKey: ' java_oop ', weight: 99 },
      { skillKey: 'dsa_arrays', weight: -4 },
    ]);

    expect(out[0]).toMatchObject({ skillKey: 'JAVA_OOP', weight: 10 });
    expect(out[1]).toMatchObject({ skillKey: 'DSA_ARRAYS', weight: 1 });
  });

  it('drops a duplicate skill rather than letting the last row win silently', () => {
    const out = cleanRequirements([
      { skillKey: 'JAVA_OOP', weight: 10, importance: 'ESSENTIAL' },
      { skillKey: 'JAVA_OOP', weight: 2, importance: 'OPTIONAL' },
    ]);

    expect(out).toHaveLength(1);
    expect(out[0].weight).toBe(10);
  });

  it('falls back to safe defaults for values that are not in the vocabulary', () => {
    const out = cleanRequirements([{ skillKey: 'JAVA_OOP', importance: 'CRITICAL', targetLevel: 'GODLIKE' }]);

    expect(out[0].importance).toBe('IMPORTANT');
    expect(out[0].targetLevel).toBe('WORKING');
    expect(out[0].weight).toBe(7);
  });

  it('de-duplicates skills within a round', () => {
    const out = cleanRoundSkills([{ roundKey: 'coding', skillKeys: ['dsa_arrays', 'DSA_ARRAYS', ''] }]);
    expect(out[0].skillKeys).toEqual(['DSA_ARRAYS']);
  });
});

// ── versioning and publishing ───────────────────────────────────────────────

describe('publishing', () => {
  it('numbers a new profile after the highest version so far', async () => {
    profiles = [stored({ version: 3, status: 'ARCHIVED' })];
    expect(await nextVersion(TENANT, 'amazon', 'BACKEND_ENGINEER')).toBe(4);
  });

  it('starts at 1 for a company and role with no history', async () => {
    expect(await nextVersion(TENANT, 'newco', 'BACKEND_ENGINEER')).toBe(1);
  });

  it('retires the profile it replaces, so only one is ever live', async () => {
    const live = stored({ _id: 'p1', version: 1, status: 'PUBLISHED' });
    const draft = stored({ _id: 'p2', version: 2, status: 'DRAFT' });
    profiles = [live, draft];

    const r = await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p2', 'admin1');

    expect(r.ok).toBe(true);
    expect(draft.status).toBe('PUBLISHED');
    // The partial unique index permits exactly one PUBLISHED row; archiving first is what
    // keeps this from colliding.
    expect(live.status).toBe('ARCHIVED');
    expect(profiles.filter(p => p.status === 'PUBLISHED')).toHaveLength(1);
  });

  it('stamps when it went live and who published it', async () => {
    const draft = stored({ _id: 'p1', version: 1, status: 'DRAFT' });
    profiles = [draft];

    await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p1', 'admin1');

    expect(draft.publishedAt).toBeInstanceOf(Date);
    expect(draft.publishedBy).toBe('admin1');
    expect(draft.effectiveFrom).toEqual(draft.publishedAt);
    expect(draft.lastReviewedAt).toEqual(draft.publishedAt);
  });

  it('leaves an earlier version readable, so old results still name what they measured', async () => {
    const v1 = stored({ _id: 'p1', version: 1, status: 'PUBLISHED' });
    const v2 = stored({ _id: 'p2', version: 2, status: 'DRAFT' });
    profiles = [v1, v2];

    await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p2', 'admin1');

    // Archived, not deleted. A mock test sat against v1 still points at a document that
    // exists and still says what it required.
    expect(profiles.find(p => p._id === 'p1')).toBeDefined();
    expect(v1.version).toBe(1);
    expect(v1.skillRequirements).toHaveLength(1);
  });

  it('refuses to publish a profile with no requirements', async () => {
    profiles = [stored({ _id: 'p1', skillRequirements: [] })];

    const r = await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p1', 'admin1');

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no skill requirements/i);
  });

  it('is idempotent on an already-published profile', async () => {
    const live = stored({ _id: 'p1', status: 'PUBLISHED' });
    profiles = [live];

    const r = await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p1', 'admin1');

    expect(r.ok).toBe(true);
    expect(profiles.filter(p => p.status === 'PUBLISHED')).toHaveLength(1);
  });

  it('never publishes across companies or roles', async () => {
    profiles = [stored({ _id: 'p1', companySlug: 'tcs' })];

    const r = await publishProfile(TENANT, 'amazon', 'BACKEND_ENGINEER', 'p1', 'admin1');

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no longer exists/i);
  });
});

// ── freshness ───────────────────────────────────────────────────────────────

describe('review freshness', () => {
  it('counts days since the last review', () => {
    const d = new Date(Date.now() - 120 * 86_400_000);
    expect(daysSinceReview(d)).toBe(120);
  });

  it('reports nothing rather than zero when a profile has never been reviewed', () => {
    // Zero would read as "reviewed today", which is the opposite of the truth.
    expect(daysSinceReview(null)).toBeNull();
  });

  it('asks for a look after the review window, without calling anything wrong', () => {
    expect(REVIEW_DUE_DAYS).toBe(180);
    expect(daysSinceReview(new Date(Date.now() - 200 * 86_400_000))! > REVIEW_DUE_DAYS).toBe(true);
  });
});

// ── the index that enforces one live profile ────────────────────────────────

describe('the schema', () => {
  it('permits exactly one published profile per company and role', () => {
    /**
     * The store above only simulates this. If the partial unique index were dropped, every
     * test in this file would still pass and production could carry two live profiles, with
     * company readiness depending on which one the query returned first.
     */
    const actual = jest.requireActual('../models/CompanyRoleProfile');
    const spec = actual.default.schema.indexes()
      .find(([, o]: any) => o?.name === actual.COMPANY_PROFILE_PUBLISHED_INDEX);

    expect(spec).toBeDefined();
    const [keys, opts] = spec;
    expect(keys).toEqual({ tenantId: 1, companySlug: 1, roleKey: 1 });
    expect(opts.unique).toBe(true);
    expect(opts.partialFilterExpression).toEqual({ status: 'PUBLISHED' });
  });

  it('keeps every version distinct', () => {
    const actual = jest.requireActual('../models/CompanyRoleProfile');
    const spec = actual.default.schema.indexes()
      .find(([k, o]: any) => k.version === 1 && o?.unique);

    expect(spec).toBeDefined();
    expect(spec[0]).toEqual({ tenantId: 1, companySlug: 1, roleKey: 1, version: 1 });
  });
});

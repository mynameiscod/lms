/**
 * The student's company preparation surface.
 *
 * Two boundaries are load-bearing here and both are easy to cross by accident. Opening a
 * company page must not touch the roadmap — Module 9 owns the plan and Module 13 decides
 * when it is replanned, and a preparation screen that quietly regenerated somebody's 90 days
 * would be the worst kind of helpful. And a member must not be able to put anything they
 * like in their own target list.
 */

const TENANT = 't1';
const OTHER_TENANT = 't2';
const STUDENT = '507f1f77bcf86cd799439011';

let companies: any[] = [];
let readySet: string[] = [];
let context: any = null;
let fitResult: any = null;
let eligibilityResult: any = null;
let roleResult: any = null;
let storedUser: any = null;

const userWrites = jest.fn();
const roadmapWrites = jest.fn();

const matches = (doc: any, q: any): boolean =>
  Object.entries(q).every(([k, cond]: [string, any]) => {
    const v = doc[k];
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      if ('$in' in cond) return (cond.$in as any[]).map(String).includes(String(v));
    }
    return String(v) === String(cond);
  });

const chain = (rows: any) => {
  const h: any = Promise.resolve(rows);
  h.select = () => h; h.sort = () => h; h.limit = () => h; h.lean = async () => rows;
  return h;
};

jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findById: () => chain(storedUser),
    updateOne: async (...a: any[]) => { userWrites(...a); return { modifiedCount: 1 }; },
  },
}));
jest.mock('../models/PassportConfig', () => ({
  __esModule: true, default: { findOne: () => chain({ tenantId: TENANT, priceInr: 1599 }) },
}));
jest.mock('../services/passportEntitlementService', () => ({ __esModule: true, isEntitled: () => true }));

jest.mock('../models/CompanyQuestionModels', () => ({
  __esModule: true,
  Company: {
    find: (q: any) => chain(companies.filter(d => matches(d, q))),
    findOne: (q: any) => chain(companies.find(d => matches(d, q)) || null),
  },
}));

jest.mock('../services/companyReadinessService', () => ({
  __esModule: true,
  readinessFor: async (_t: string, slug: string) => ({ ready: readySet.includes(slug) }),
  readySlugs: async () => readySet,
}));

jest.mock('../services/companyFitService', () => ({
  __esModule: true,
  calculateCompanyFit: async () => fitResult,
  summariseCompanyFits: async () => new Map([['acme', { readiness: 61, classification: 'DEVELOPING', gaps: 2 }]]),
  resolveCompanyProfile: async () => ({ profile: null, matched: false }),
}));
jest.mock('../services/companyEligibilityService', () => ({
  __esModule: true, evaluateEligibility: async () => eligibilityResult,
}));
jest.mock('../services/careerContextService', () => ({
  __esModule: true, getCareerContext: async () => context,
}));
jest.mock('../services/roleReadinessService', () => ({
  __esModule: true, calculateStudentRoleReadiness: async () => roleResult,
}));

/**
 * The roadmap, watched rather than used.
 *
 * Module 15 does not import these at all; the spies exist so that if somebody later adds a
 * "regenerate my plan for this company" convenience, this test fails and they have to come
 * and argue for it.
 */
jest.mock('../models/CareerRoadmap', () => ({
  __esModule: true,
  default: {
    find: () => chain([]), findOne: () => chain(null),
    create: (...a: any[]) => { roadmapWrites(...a); return chain(null); },
    updateOne: (...a: any[]) => { roadmapWrites(...a); return chain(null); },
    updateMany: (...a: any[]) => { roadmapWrites(...a); return chain(null); },
    findOneAndUpdate: (...a: any[]) => { roadmapWrites(...a); return chain(null); },
  },
}));

import {
  companyReadiness, companyPreparation, companyOverview, setTargets,
} from '../controllers/companyPreparationController';

const mkRes = (): any => {
  const r: any = { statusCode: 200, body: null };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: any) => { r.body = b; return r; };
  return r;
};
const mkReq = (over: any = {}) => ({
  params: {}, body: {}, query: {},
  user: { id: STUDENT, tenantId: TENANT },
  ...over,
} as any);

const call = async (handler: any, req: any) => {
  const res = mkRes();
  await handler(req, res);
  return res;
};

const availableFit = (over: any = {}) => ({
  available: true,
  policyVersion: 'COMPANY_FIT_V1',
  company: { slug: 'acme' }, role: { key: 'BACKEND_ENGINEER', matched: true },
  profileVersion: 2,
  readiness: 61, coverage: 70, confidence: 'MEDIUM', classification: 'DEVELOPING',
  summary: { requiredSkills: 4, assessedSkills: 3, priorityGaps: 1, needsWork: 1, onTrack: 1, strong: 0, limitedEvidence: 0, notAssessed: 1, essentialTotal: 2, essentialAssessed: 2 },
  skills: [],
  strengths: [{ skillKey: 'JAVA_OOP', skillName: 'Java OOP', studentScore: 78 }],
  gaps: [{ skillKey: 'DSA_ARRAYS', skillName: 'Arrays', studentScore: 42, targetScore: 60, gapPoints: 18, importance: 'ESSENTIAL', status: 'PRIORITY_GAP' }],
  unknowns: [{ skillKey: 'SYSTEM_DESIGN_BASICS', skillName: 'Basic System Design', importance: 'IMPORTANT', status: 'NOT_ASSESSED' }],
  roundSkills: [{ roundKey: 'coding', skillKeys: ['DSA_ARRAYS'] }],
  preparationNotes: 'Practise arrays daily.',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  companies = [
    { _id: 'c1', tenantId: TENANT, slug: 'acme', name: 'Acme', type: 'product', active: true, questionCount: 40 },
    { _id: 'c2', tenantId: TENANT, slug: 'beta', name: 'Beta', type: 'service', active: true, questionCount: 30 },
  ];
  readySet = ['acme', 'beta'];
  context = { career: { primaryRole: 'BACKEND_ENGINEER' }, derived: { stage: 'placement' } };
  fitResult = availableFit();
  eligibilityResult = { verdict: 'POTENTIALLY_ELIGIBLE', decidedBy: null, criteria: [], verified: true, message: 'ok' };
  roleResult = { available: true, role: { key: 'BACKEND_ENGINEER', name: 'Backend Engineer' }, readiness: 68, coverage: 80, confidence: 'MEDIUM' };
  storedUser = { _id: STUDENT, passport: { primaryRole: 'BACKEND_ENGINEER', targetCompanies: [] } };
});

// ── the roadmap boundary ────────────────────────────────────────────────────

describe('opening company preparation', () => {
  it('never writes to the roadmap', async () => {
    await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));
    await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));
    await call(companyOverview, mkReq());

    // Module 9 owns the plan; Module 13 decides when it changes. Selecting a company is
    // preparation context and nothing else.
    expect(roadmapWrites).not.toHaveBeenCalled();
  });

  it('never writes to the member record either, until they ask', async () => {
    await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));
    await call(companyOverview, mkReq());

    expect(userWrites).not.toHaveBeenCalled();
  });
});

// ── the four figures, side by side ──────────────────────────────────────────

describe('the readiness view', () => {
  it('reports company fit, eligibility and role readiness without merging them', async () => {
    const res = await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.fit.readiness).toBe(61);
    expect(res.body.eligibility.verdict).toBe('POTENTIALLY_ELIGIBLE');
    expect(res.body.roleReadiness.readiness).toBe(68);

    // No combined score anywhere. A student who is eligible but not ready and one who is
    // ready but not eligible need different things, and an average tells neither of them.
    const flat = JSON.stringify(res.body);
    expect(res.body.overall).toBeUndefined();
    expect(res.body.combined).toBeUndefined();
    expect(flat).not.toMatch(/"overallReadiness"/);
  });

  it('carries a readable label for the classification', async () => {
    const res = await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));
    expect(res.body.fit.classificationLabel).toBe('Developing');
  });

  it('passes an unavailable fit through instead of inventing a number', async () => {
    fitResult = { available: false, reason: 'PROFILE_NOT_CONFIGURED', message: 'Not configured.', company: { slug: 'acme' } };

    const res = await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.fit.available).toBe(false);
    expect(res.body.fit.readiness).toBeUndefined();
  });

  it('refuses a company that has not met the content bar, even by direct URL', async () => {
    readySet = [];
    const res = await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));
    expect(res.statusCode).toBe(404);
  });

  it('refuses a company belonging to another tenant', async () => {
    companies = [{ _id: 'c9', tenantId: OTHER_TENANT, slug: 'acme', name: 'Acme', active: true }];
    const res = await call(companyReadiness, mkReq({ params: { slug: 'acme' } }));
    expect(res.statusCode).toBe(404);
  });
});

// ── career stage ────────────────────────────────────────────────────────────

describe('career stage shapes the framing, not the measurement', () => {
  it('treats a first-year member’s target as long term', async () => {
    context = { career: { primaryRole: 'BACKEND_ENGINEER' }, derived: { stage: 'foundation' } };

    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.stage).toBe('foundation');
    expect(res.body.horizon).toBe('LONG_TERM');
  });

  it('treats a final-year member’s target as active preparation', async () => {
    context = { career: { primaryRole: 'BACKEND_ENGINEER' }, derived: { stage: 'placement' } };

    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.horizon).toBe('ACTIVE');
  });

  it('gives both stages the same skills, because the measurement does not change', async () => {
    context = { career: { primaryRole: 'BACKEND_ENGINEER' }, derived: { stage: 'foundation' } };
    const early = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    context = { career: { primaryRole: 'BACKEND_ENGINEER' }, derived: { stage: 'job_seeker' } };
    const late = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    expect(early.body.focus).toEqual(late.body.focus);
    expect(early.body.validate).toEqual(late.body.validate);
  });
});

// ── gaps versus unknowns ────────────────────────────────────────────────────

describe('the preparation list', () => {
  it('keeps things to improve apart from things to validate', async () => {
    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.focus.map((f: any) => f.skillKey)).toEqual(['DSA_ARRAYS']);
    // An unmeasured skill is not a weakness, and telling a student to "improve" it would be
    // a guess about somebody we have never assessed.
    expect(res.body.validate.map((v: any) => v.skillKey)).toEqual(['SYSTEM_DESIGN_BASICS']);
    expect(res.body.focus.map((f: any) => f.skillKey)).not.toContain('SYSTEM_DESIGN_BASICS');
  });

  it('says what each round tests, in canonical skills', async () => {
    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));
    expect(res.body.roundSkills).toEqual([{ roundKey: 'coding', skillKeys: ['DSA_ARRAYS'] }]);
  });

  it('names the profile version the advice came from', async () => {
    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));
    expect(res.body.profileVersion).toBe(2);
  });

  it('returns empty lists and a reason when nothing is configured', async () => {
    fitResult = { available: false, reason: 'REQUIREMENTS_NOT_CONFIGURED', message: 'None configured.', company: { slug: 'acme' } };

    const res = await call(companyPreparation, mkReq({ params: { slug: 'acme' } }));

    expect(res.body.available).toBe(false);
    expect(res.body.reason).toBe('REQUIREMENTS_NOT_CONFIGURED');
    expect(res.body.focus).toEqual([]);
  });
});

// ── target companies ────────────────────────────────────────────────────────

describe('choosing target companies', () => {
  it('saves the list and marks one primary', async () => {
    const res = await call(setTargets, mkReq({ body: { slugs: ['acme', 'beta'], primary: 'beta' } }));

    expect(res.body.targets).toEqual([
      { slug: 'acme', primary: false },
      { slug: 'beta', primary: true },
    ]);
    const written = userWrites.mock.calls[0][1].$set['passport.targetCompanies'];
    expect(written).toHaveLength(2);
    expect(written.filter((t: any) => t.primary)).toHaveLength(1);
  });

  it('does not touch the member’s target ROLE', async () => {
    await call(setTargets, mkReq({ body: { slugs: ['acme'] } }));

    // A company is preparation context. Their career direction is theirs, and Module 1 owns it.
    const patch = userWrites.mock.calls[0][1].$set;
    expect(Object.keys(patch)).toEqual(['passport.targetCompanies']);
    expect(patch['passport.primaryRole']).toBeUndefined();
  });

  it('caps the list rather than letting it become a feed', async () => {
    companies = Array.from({ length: 9 }, (_, i) => ({
      _id: `c${i}`, tenantId: TENANT, slug: `co${i}`, name: `Co ${i}`, active: true,
    }));
    readySet = companies.map(c => c.slug);

    const res = await call(setTargets, mkReq({ body: { slugs: companies.map(c => c.slug) } }));

    expect(res.body.targets).toHaveLength(res.body.maxTargets);
    expect(res.body.maxTargets).toBe(5);
  });

  it('rejects a company from another tenant, and says so', async () => {
    companies.push({ _id: 'c9', tenantId: OTHER_TENANT, slug: 'secret-co', name: 'Secret', active: true });
    readySet.push('secret-co');

    const res = await call(setTargets, mkReq({ body: { slugs: ['acme', 'secret-co'] } }));

    expect(res.body.targets.map((t: any) => t.slug)).toEqual(['acme']);
    expect(res.body.rejected).toEqual(['secret-co']);
  });

  it('rejects a company the member could not otherwise open', async () => {
    // Not past the content bar, so it is invisible in the listing. Typing its slug must not
    // be a way in.
    readySet = ['acme'];

    const res = await call(setTargets, mkReq({ body: { slugs: ['acme', 'beta'] } }));

    expect(res.body.targets.map((t: any) => t.slug)).toEqual(['acme']);
    expect(res.body.rejected).toEqual(['beta']);
  });

  it('drops duplicates rather than storing the same company twice', async () => {
    const res = await call(setTargets, mkReq({ body: { slugs: ['acme', 'acme', 'acme'] } }));
    expect(res.body.targets).toHaveLength(1);
  });

  it('allows an empty list — un-following everything is a valid choice', async () => {
    const res = await call(setTargets, mkReq({ body: { slugs: [] } }));

    expect(res.body.targets).toEqual([]);
    expect(userWrites.mock.calls[0][1].$set['passport.targetCompanies']).toEqual([]);
  });

  it('marks nothing primary when the named primary did not survive validation', async () => {
    const res = await call(setTargets, mkReq({ body: { slugs: ['acme'], primary: 'ghost-co' } }));
    expect(res.body.targets.every((t: any) => !t.primary)).toBe(true);
  });
});

// ── the listing ─────────────────────────────────────────────────────────────

describe('the company listing', () => {
  it('shows a fit figure per card and flags the member’s targets', async () => {
    storedUser = { _id: STUDENT, passport: { targetCompanies: [{ slug: 'acme', primary: true }] } };

    const res = await call(companyOverview, mkReq());

    const acme = res.body.companies.find((c: any) => c.slug === 'acme');
    expect(acme.readiness).toBe(61);
    expect(acme.classificationLabel).toBe('Developing');
    expect(acme.isTarget).toBe(true);
    expect(acme.isPrimaryTarget).toBe(true);
  });

  it('shows null rather than 0% for a company with no profile', async () => {
    const res = await call(companyOverview, mkReq());

    const beta = res.body.companies.find((c: any) => c.slug === 'beta');
    expect(beta.readiness).toBeNull();
    expect(beta.classification).toBeNull();
  });

  it('hides companies that have not met the content bar', async () => {
    readySet = ['acme'];
    const res = await call(companyOverview, mkReq());

    expect(res.body.companies.map((c: any) => c.slug)).toEqual(['acme']);
  });
});

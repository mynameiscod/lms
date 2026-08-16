/**
 * Company fit: the same student, the same Skill DNA, a different company, a different answer.
 *
 * That sentence is the whole feature. TCS weighting programming and SQL and Amazon weighting
 * DSA and problem solving must produce genuinely different figures for one unchanged set of
 * measurements — otherwise "company readiness" is role readiness wearing a logo.
 *
 * And the things it must NOT do: never write a skill score, never move Module 8's number,
 * never turn an unmeasured skill into a zero, and never invent a comparison for a company
 * nobody has configured.
 */

const TENANT = 't1';
const OTHER_TENANT = 't2';
const STUDENT = '507f1f77bcf86cd799439011';

let profiles: any[] = [];
let skillProfiles: any[] = [];
let catalogue: any[] = [];
let context: any = null;

const skillProfileWrites = jest.fn();

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
  h.select = () => h; h.sort = () => h; h.limit = () => h; h.lean = async () => rows;
  return h;
};

jest.mock('../models/CompanyRoleProfile', () => ({
  __esModule: true,
  DEFAULT_ROLE_KEY: 'DEFAULT',
  default: {
    find: (q: any) => chain(profiles.filter(d => matches(d, q))),
    findOne: (q: any) => chain(profiles.find(d => matches(d, q)) || null),
  },
}));

/**
 * Skill DNA, read-only.
 *
 * Every write method is a spy that fails the test if anything calls it. Module 15 computing
 * a comparison must never become Module 15 editing what it compared.
 */
jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true,
  default: {
    find: (q: any) => chain(skillProfiles.filter(d => matches(d, q))),
    updateOne: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
    updateMany: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
    create: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
    bulkWrite: (...a: any[]) => { skillProfileWrites(...a); return chain(null); },
  },
}));

jest.mock('../models/CareerSkill', () => ({
  __esModule: true,
  default: { find: (q: any) => chain(catalogue.filter(d => matches(d, q))) },
}));

jest.mock('../services/careerContextService', () => ({
  __esModule: true,
  getCareerContext: async () => context,
}));

import { calculateCompanyFit, summariseCompanyFits } from '../services/companyFitService';

// ── fixtures ────────────────────────────────────────────────────────────────

const skill = (key: string, name: string) => ({ key, name, active: true });

const measured = (skillKey: string, score: number, confidence = 'HIGH') =>
  ({ tenantId: TENANT, studentId: STUDENT, skillKey, score, confidence, evidenceCount: 6 });

const profile = (over: any = {}) => ({
  tenantId: TENANT,
  companySlug: 'acme',
  roleKey: 'BACKEND_ENGINEER',
  version: 1,
  status: 'PUBLISHED',
  skillRequirements: [],
  roundSkills: [],
  preparationNotes: '',
  lastReviewedAt: new Date(),
  ...over,
});

const req = (skillKey: string, weight: number, targetLevel = 'WORKING', importance = 'IMPORTANT') =>
  ({ skillKey, weight, targetLevel, importance });

beforeEach(() => {
  jest.clearAllMocks();
  profiles = [];
  skillProfiles = [];
  catalogue = [
    skill('JAVA_OOP', 'Java OOP'), skill('DSA_ARRAYS', 'Arrays'),
    skill('SQL_JOINS', 'SQL Joins'), skill('PROBLEM_SOLVING', 'Problem Solving'),
    skill('SYSTEM_DESIGN_BASICS', 'Basic System Design'), skill('COMMUNICATION', 'Communication'),
  ];
  context = {
    tenantId: TENANT, studentId: STUDENT,
    career: { primaryRole: 'BACKEND_ENGINEER' },
    derived: { stage: 'placement' },
  };
});

// ── the headline ────────────────────────────────────────────────────────────

describe('one Skill DNA, two companies', () => {
  /**
   * The student is strong on Java and SQL and weak on DSA and problem solving — a very
   * ordinary service-company-ready profile.
   */
  const dna = () => [
    measured('JAVA_OOP', 78),
    measured('SQL_JOINS', 74),
    measured('DSA_ARRAYS', 42),
    measured('PROBLEM_SOLVING', 45),
  ];

  it('produces genuinely different figures for differently weighted companies', async () => {
    skillProfiles = dna();
    profiles = [
      // A service company: programming and SQL carry the weight.
      profile({
        companySlug: 'tcs',
        skillRequirements: [req('JAVA_OOP', 10), req('SQL_JOINS', 9), req('DSA_ARRAYS', 3)],
      }),
      // A product company: DSA and problem solving carry it.
      profile({
        companySlug: 'amazon',
        skillRequirements: [req('DSA_ARRAYS', 10), req('PROBLEM_SOLVING', 9), req('JAVA_OOP', 3)],
      }),
    ];

    const tcs: any = await calculateCompanyFit(TENANT, STUDENT, 'tcs');
    const amazon: any = await calculateCompanyFit(TENANT, STUDENT, 'amazon');

    expect(tcs.available).toBe(true);
    expect(amazon.available).toBe(true);
    // And the difference is not a rounding artefact. A gap this wide is the difference
    // between "start applying" and "you have work to do", which is the entire point of
    // measuring against a company rather than against a role.
    expect(tcs.readiness - amazon.readiness).toBeGreaterThanOrEqual(15);
    expect(tcs.classification).toBe('READY');
    expect(amazon.classification).toBe('NEAR_READY');

    // The gaps differ too, not just the headline number — this student is told to work on
    // DSA for Amazon and on nothing much for TCS.
    expect(amazon.gaps.map((g: any) => g.skillKey)).toContain('DSA_ARRAYS');
    expect(tcs.gaps.map((g: any) => g.skillKey)).not.toContain('JAVA_OOP');
  });

  it('changes nothing about the Skill DNA it read', async () => {
    skillProfiles = dna();
    profiles = [profile({ companySlug: 'amazon', skillRequirements: [req('DSA_ARRAYS', 10)] })];

    const before = JSON.stringify(skillProfiles);
    await calculateCompanyFit(TENANT, STUDENT, 'amazon');

    expect(skillProfileWrites).not.toHaveBeenCalled();
    expect(JSON.stringify(skillProfiles)).toBe(before);
  });

  it('names the company and the profile version it used', async () => {
    skillProfiles = dna();
    profiles = [profile({ companySlug: 'amazon', version: 4, skillRequirements: [req('DSA_ARRAYS', 10)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'amazon');

    expect(r.company.slug).toBe('amazon');
    expect(r.profileVersion).toBe(4);
    expect(r.policyVersion).toBe('COMPANY_FIT_V1');
  });
});

// ── unknown is not zero ─────────────────────────────────────────────────────

describe('a skill nobody has measured', () => {
  it('is reported as needing validation, not as a zero', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [profile({
      skillRequirements: [req('JAVA_OOP', 8), req('SYSTEM_DESIGN_BASICS', 8)],
    })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    const sd = r.skills.find((s: any) => s.skillKey === 'SYSTEM_DESIGN_BASICS');
    expect(sd.status).toBe('NOT_ASSESSED');
    expect(sd.studentScore).toBeNull();          // never 0
    expect(sd.gapPoints).toBeNull();             // no gap: none has been established
    expect(sd.countedInFit).toBe(false);

    // It appears as an unknown, and NOT among the gaps to work on.
    expect(r.unknowns.map((u: any) => u.skillKey)).toContain('SYSTEM_DESIGN_BASICS');
    expect(r.gaps.map((g: any) => g.skillKey)).not.toContain('SYSTEM_DESIGN_BASICS');

    // And it is excluded from the average rather than dragging it to 50.
    expect(r.readiness).toBe(100);
    // Coverage is what reports the ignorance: half the weight was never measured.
    expect(r.coverage).toBe(50);
  });

  it('leaves readiness null when nothing at all is sufficiently measured', async () => {
    skillProfiles = [];
    profiles = [profile({ skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    // Null, not 0. We have not established that they are unready — only that we have not looked.
    expect(r.readiness).toBeNull();
    expect(r.classification).toBeNull();
    expect(r.coverage).toBe(0);
  });
});

describe('a skill measured only lightly', () => {
  it('reduces confidence instead of counting as a proven weakness', async () => {
    skillProfiles = [
      measured('JAVA_OOP', 80),
      // One lucky answer. Real, reported, and not something to build a figure on.
      { ...measured('DSA_ARRAYS', 30), confidence: 'LOW', evidenceCount: 1 },
    ];
    profiles = [profile({ skillRequirements: [req('JAVA_OOP', 8), req('DSA_ARRAYS', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    const dsa = r.skills.find((s: any) => s.skillKey === 'DSA_ARRAYS');
    expect(dsa.status).toBe('LIMITED_EVIDENCE');
    expect(dsa.countedInFit).toBe(false);
    // The score is still reported — it is a real observation, just not a conclusion.
    expect(dsa.studentScore).toBe(30);
    expect(r.unknowns.map((u: any) => u.skillKey)).toContain('DSA_ARRAYS');
    expect(r.gaps.map((g: any) => g.skillKey)).not.toContain('DSA_ARRAYS');
    expect(r.coverage).toBe(50);
  });
});

// ── configuration edges ─────────────────────────────────────────────────────

describe('a company that is not configured for this student', () => {
  it('says the profile is missing rather than reporting 0%', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('PROFILE_NOT_CONFIGURED');
    expect(r.readiness).toBeUndefined();
  });

  it('says the requirements are missing rather than reporting 0%', async () => {
    profiles = [profile({ skillRequirements: [] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('REQUIREMENTS_NOT_CONFIGURED');
  });

  it('refuses to compare a student who has chosen no role', async () => {
    context = { ...context, career: { primaryRole: 'NOT_SURE' } };
    profiles = [profile({ skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('ROLE_NOT_SELECTED');
  });

  it('never measures a student against an unpublished draft', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [profile({ status: 'DRAFT', skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    // A draft is somebody's work in progress. Measuring against it would report a standard
    // nobody agreed to, and the number would move when they finished typing.
    expect(r.available).toBe(false);
    expect(r.reason).toBe('PROFILE_NOT_CONFIGURED');
  });

  it('falls back to the company-wide profile when the role has none of its own', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [profile({ roleKey: 'DEFAULT', skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.available).toBe(true);
    // Flagged, so the page can say this is the company's general guidance rather than
    // guidance for the student's role.
    expect(r.role.matched).toBe(false);
  });

  it('prefers the role-specific profile over the company-wide one', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [
      profile({ roleKey: 'DEFAULT', version: 9, skillRequirements: [req('COMMUNICATION', 8)] }),
      profile({ roleKey: 'BACKEND_ENGINEER', version: 2, skillRequirements: [req('JAVA_OOP', 8)] }),
    ];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.role.matched).toBe(true);
    expect(r.profileVersion).toBe(2);
    expect(r.skills.map((s: any) => s.skillKey)).toEqual(['JAVA_OOP']);
  });
});

describe('changing target role', () => {
  it('re-measures against that role’s profile without touching history', async () => {
    skillProfiles = [measured('JAVA_OOP', 85), measured('COMMUNICATION', 40)];
    profiles = [
      profile({ roleKey: 'BACKEND_ENGINEER', version: 1, skillRequirements: [req('JAVA_OOP', 10)] }),
      profile({ roleKey: 'FRONTEND_ENGINEER', version: 1, skillRequirements: [req('COMMUNICATION', 10)] }),
    ];

    const asBackend: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    context = { ...context, career: { primaryRole: 'FRONTEND_ENGINEER' } };
    const asFrontend: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(asBackend.role.key).toBe('BACKEND_ENGINEER');
    expect(asFrontend.role.key).toBe('FRONTEND_ENGINEER');
    expect(asBackend.readiness).toBeGreaterThan(asFrontend.readiness);
    expect(skillProfileWrites).not.toHaveBeenCalled();
  });
});

// ── no company-specific vocabulary ──────────────────────────────────────────

describe('the skill vocabulary', () => {
  it('is the canonical catalogue, with no company prefixes anywhere', async () => {
    skillProfiles = [measured('JAVA_OOP', 80), measured('DSA_ARRAYS', 50)];
    profiles = [profile({
      companySlug: 'amazon',
      skillRequirements: [req('JAVA_OOP', 8), req('DSA_ARRAYS', 10)],
    })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'amazon');

    for (const s of r.skills) {
      expect(s.skillKey).not.toMatch(/^(AMAZON|TCS|INFOSYS|MICROSOFT)_/);
      // Every key resolved to a name from the shared catalogue, which is only possible
      // because it is a real canonical key.
      expect(catalogue.some(c => c.key === s.skillKey)).toBe(true);
    }
    expect(r.skills.find((s: any) => s.skillKey === 'JAVA_OOP').skillName).toBe('Java OOP');
  });

  it('flags a requirement whose skill has since been retired', async () => {
    catalogue = [{ key: 'JAVA_OOP', name: 'Java OOP', active: false }];
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [profile({ skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.skills[0].skillInactive).toBe(true);
  });
});

// ── tenancy ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('never reads another tenant’s company profile', async () => {
    skillProfiles = [measured('JAVA_OOP', 80)];
    profiles = [profile({ tenantId: OTHER_TENANT, skillRequirements: [req('JAVA_OOP', 8)] })];

    const r: any = await calculateCompanyFit(TENANT, STUDENT, 'acme');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('PROFILE_NOT_CONFIGURED');
  });
});

// ── the listing summary ─────────────────────────────────────────────────────

describe('the cheap summary used by the listing', () => {
  it('agrees with the full calculation, company by company', async () => {
    skillProfiles = [measured('JAVA_OOP', 78), measured('DSA_ARRAYS', 42)];
    profiles = [
      profile({ companySlug: 'tcs', skillRequirements: [req('JAVA_OOP', 10)] }),
      profile({ companySlug: 'amazon', skillRequirements: [req('DSA_ARRAYS', 10)] }),
    ];

    const summary = await summariseCompanyFits(TENANT, STUDENT, ['tcs', 'amazon'], 'BACKEND_ENGINEER');
    const tcs: any = await calculateCompanyFit(TENANT, STUDENT, 'tcs');
    const amazon: any = await calculateCompanyFit(TENANT, STUDENT, 'amazon');

    // A card and the page it opens must not show different numbers.
    expect(summary.get('tcs')!.readiness).toBe(tcs.readiness);
    expect(summary.get('amazon')!.readiness).toBe(amazon.readiness);
    expect(summary.get('amazon')!.gaps).toBe(amazon.summary.priorityGaps + amazon.summary.needsWork);
  });

  it('reports null rather than zero for a company with nothing measured', async () => {
    skillProfiles = [];
    profiles = [profile({ companySlug: 'tcs', skillRequirements: [req('SYSTEM_DESIGN_BASICS', 10)] })];

    const summary = await summariseCompanyFits(TENANT, STUDENT, ['tcs'], 'BACKEND_ENGINEER');

    expect(summary.get('tcs')!.readiness).toBeNull();
    expect(summary.get('tcs')!.classification).toBeNull();
  });

  it('returns nothing at all for a student with no chosen role', async () => {
    const summary = await summariseCompanyFits(TENANT, STUDENT, ['tcs'], 'NOT_SURE');
    expect(summary.size).toBe(0);
  });
});

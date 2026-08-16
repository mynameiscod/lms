/**
 * Is this tenant actually configured, or does it only look configured?
 *
 * A tenant can pass every unit test in this repository and still be unusable: a role with
 * no published blueprint produces no readiness, a blueprint pointing at a retired skill
 * produces a gap nobody can close, an empty question pool produces an assessment that
 * measures nothing. None of that is a code defect, and none of it is visible until a
 * student hits it.
 *
 * The checks are deterministic — the same configuration must produce the same findings —
 * and they REPORT. Nothing here may create a blueprint, publish a draft or raise a budget.
 */

import mongoose from 'mongoose';
import { startMongo, stopMongo, clearCollections } from './mongoHarness';

jest.setTimeout(180_000);

import CareerRole from '../../models/CareerRole';
import CareerSkill from '../../models/CareerSkill';
import RoleSkillBlueprint from '../../models/RoleSkillBlueprint';
import SkillEvidence from '../../models/SkillEvidence';
import CompanyRoleProfile from '../../models/CompanyRoleProfile';
import { Company } from '../../models/CompanyQuestionModels';
import { listCareerRoles } from '../../services/careerRoleService';
import { buildConfigHealth, MIN_MAPPED_ITEMS } from '../../services/careerPilotConfigHealthService';
import { buildLaunchReadiness } from '../../services/careerPilotLaunchReadinessService';

const TENANT = '507f1f77bcf86cd7994322c1';
const OTHER = '507f1f77bcf86cd7994322d2';
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);

const env = { ...process.env };
let seq = 0;

const code = (r: any, c: string) => r.findings.find((f: any) => f.code === c);
const codes = (r: any) => r.findings.map((f: any) => f.code);

/** A skill graph, a role, a published blueprint and a mapped pool: a healthy tenant. */
async function healthyTenant(tenantId = TENANT) {
  await CareerSkill.create({
    domainKey: 'SOFTWARE_ENGINEERING', key: 'JAVA_OOP', name: 'Java OOP',
    active: true, assessable: true,
  } as any);
  await CareerRole.create({
    tenantId, key: 'BACKEND_ENGINEER', name: 'Backend Engineer',
    domainKey: 'SOFTWARE_ENGINEERING', active: true, studentSelectable: true,
  } as any);
  await RoleSkillBlueprint.create({
    tenantId, roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
    domainKey: 'SOFTWARE_ENGINEERING', published: true, version: 1,
    requirements: [{ skillKey: 'JAVA_OOP', importance: 'ESSENTIAL', weight: 10, targetLevel: 'WORKING', active: true }],
  } as any);
  // listCareerRoles SEEDS the standard catalogue on first read, so trigger that here and
  // then withdraw everything this tenant has not configured. A configured tenant offers
  // only the roles it has blueprints for.
  await listCareerRoles(tenantId);
  await CareerRole.updateMany(
    { tenantId, key: { $ne: 'BACKEND_ENGINEER' } },
    { $set: { studentSelectable: false } },
  );

  await SkillEvidence.insertMany(
    Array.from({ length: MIN_MAPPED_ITEMS }, (_, i) => {
      seq += 1;
      return {
        tenantId, skillKey: 'JAVA_OOP', sourceType: 'assessment_item',
        sourceId: new mongoose.Types.ObjectId().toString(),
        relationship: 'PRIMARY', mappedBy: new mongoose.Types.ObjectId(),
      };
    }),
  );
}

beforeAll(startMongo);
afterAll(async () => { process.env = env; await stopMongo(); });
beforeEach(async () => {
  await clearCollections();
  seq = 0;
  process.env = { ...env };
  // A configured host by default, so secret findings appear only when a test asks for them.
  process.env.JWT_SECRET = 'a-long-enough-test-secret-value';
  process.env.ENCRYPTION_KEY = 'a-long-enough-test-encryption-key';
});

// ── errors ──────────────────────────────────────────────────────────────────

describe('configuration that blocks a launch', () => {
  it('reports student-selectable roles with no blueprint as ONE aggregated ERROR', async () => {
    await healthyTenant();
    // Two seeded roles are put back in the picker without ever being configured.
    const extra = await CareerRole.find({ tenantId: TENANT, key: { $ne: 'BACKEND_ENGINEER' } })
      .limit(2).select('key').lean() as any[];
    await CareerRole.updateMany(
      { tenantId: TENANT, key: { $in: extra.map(e => e.key) } },
      { $set: { studentSelectable: true, active: true } },
    );

    const r = await buildConfigHealth(TENANT);
    const roleErrors = r.findings.filter((f: any) => f.area === 'roles' && f.severity === 'ERROR');

    expect(roleErrors.length).toBeGreaterThan(0);
    // Aggregated: one finding per PROBLEM naming the roles, never one finding per role —
    // a dozen identical errors would hide everything else on the screen.
    for (const f of roleErrors) {
      expect(f.meta.roleKeys.length).toBeGreaterThanOrEqual(1);
      expect(f.action).toMatch(/publish|stop offering|add the skills/i);
    }
    const named = roleErrors.flatMap((f: any) => f.meta.roleKeys);
    expect(named).toEqual(expect.arrayContaining(extra.map(e => e.key)));
  });

  it('does not demand a blueprint for a role no student can pick', async () => {
    await healthyTenant();
    await CareerRole.create({
      tenantId: TENANT, key: 'ARCHIVED_ROLE', name: 'Archived',
      domainKey: 'SOFTWARE_ENGINEERING', active: true, studentSelectable: false,
    } as any);

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'ROLE_BLUEPRINT_MISSING')).toBeUndefined();
  });

  it('reports an unpublished blueprint as an ERROR', async () => {
    await healthyTenant();
    await RoleSkillBlueprint.updateOne({ tenantId: TENANT }, { $set: { published: false } });

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'ROLE_BLUEPRINT_UNPUBLISHED').severity).toBe('ERROR');
  });

  it('reports a requirement pointing at a missing skill as an ERROR', async () => {
    await healthyTenant();
    await RoleSkillBlueprint.updateOne({ tenantId: TENANT }, {
      $push: { requirements: { skillKey: 'GHOST_SKILL', importance: 'ESSENTIAL', weight: 8, targetLevel: 'WORKING', active: true } },
    });

    const r = await buildConfigHealth(TENANT);
    const f = code(r, 'BLUEPRINT_SKILL_UNRESOLVED');

    expect(f.severity).toBe('ERROR');
    expect(f.meta.skillKeys).toContain('GHOST_SKILL');
  });

  it('reports a requirement pointing at a RETIRED skill as an ERROR', async () => {
    await healthyTenant();
    // Module 3 retires it; the requirement survives and now cannot be satisfied.
    await CareerSkill.updateOne({ key: 'JAVA_OOP' }, { $set: { active: false } });

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'BLUEPRINT_SKILL_UNRESOLVED').meta.skillKeys).toContain('JAVA_OOP');
  });

  it('reports an empty role picker as an ERROR', async () => {
    await CareerRole.updateMany({}, { $set: { studentSelectable: false } });
    // ensureCareerRoles seeds on read, so withdraw them again after that first call.
    await buildConfigHealth(TENANT);
    await CareerRole.updateMany({ tenantId: TENANT }, { $set: { studentSelectable: false } });

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'NO_SELECTABLE_ROLES').severity).toBe('ERROR');
  });

  it('reports a published company profile with no requirements as an ERROR', async () => {
    await healthyTenant();
    await Company.create({ tenantId: TENANT, name: 'Acme', slug: 'acme', active: true } as any);
    await CompanyRoleProfile.create({
      tenantId: TENANT, companySlug: 'acme', roleKey: 'BACKEND_ENGINEER',
      version: 1, status: 'PUBLISHED', skillRequirements: [], lastReviewedAt: new Date(),
    } as any);

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'COMPANY_PROFILE_EMPTY').severity).toBe('ERROR');
  });
});

// ── warnings ────────────────────────────────────────────────────────────────

describe('configuration worth an admin’s attention', () => {
  it('reports a thin mapped question pool as a WARNING', async () => {
    await healthyTenant();
    await SkillEvidence.deleteMany({});
    await SkillEvidence.create({
      tenantId: TENANT, skillKey: 'JAVA_OOP', sourceType: 'assessment_item',
      sourceId: new mongoose.Types.ObjectId().toString(),
      relationship: 'PRIMARY', mappedBy: new mongoose.Types.ObjectId(),
    } as any);

    const r = await buildConfigHealth(TENANT);
    const f = code(r, 'MAPPED_POOL_THIN');

    expect(f.severity).toBe('WARNING');
    // The threshold comes from Module 6's own policies rather than a number invented here.
    expect(f.meta.needed).toBe(MIN_MAPPED_ITEMS);
  });

  it('reports no mapped questions at all as an ERROR, not a warning', async () => {
    await healthyTenant();
    await SkillEvidence.deleteMany({});

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'NO_MAPPED_QUESTIONS').severity).toBe('ERROR');
  });

  it('reports a stale company profile as a WARNING', async () => {
    await healthyTenant();
    await Company.create({ tenantId: TENANT, name: 'Acme', slug: 'acme', active: true } as any);
    await CompanyRoleProfile.create({
      tenantId: TENANT, companySlug: 'acme', roleKey: 'BACKEND_ENGINEER',
      version: 1, status: 'PUBLISHED', lastReviewedAt: daysAgo(400),
      skillRequirements: [{ skillKey: 'JAVA_OOP', importance: 'ESSENTIAL', weight: 9, targetLevel: 'WORKING' }],
    } as any);

    const r = await buildConfigHealth(TENANT);
    const f = code(r, 'COMPANY_PROFILE_STALE');

    expect(f.severity).toBe('WARNING');
    expect(f.meta.companySlugs).toContain('acme');
    // Old is not the same as wrong, and the wording must not say otherwise.
    expect(f.action).toMatch(/not necessarily wrong/i);
  });

  it('reports an active company with no profile as a WARNING', async () => {
    await healthyTenant();
    await Company.create({ tenantId: TENANT, name: 'Acme', slug: 'acme', active: true } as any);

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'COMPANY_PROFILE_MISSING').severity).toBe('WARNING');
  });

  it('reports no companies as INFO, because companies are optional', async () => {
    await healthyTenant();
    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'NO_COMPANIES').severity).toBe('INFO');
  });
});

// ── the deployment prerequisite ─────────────────────────────────────────────

describe('the secret prerequisite', () => {
  it('reports an unpinned ENCRYPTION_KEY as an ERROR, with the ordering', async () => {
    await healthyTenant();
    delete process.env.ENCRYPTION_KEY;

    const r = await buildConfigHealth(TENANT);
    const f = code(r, 'ENCRYPTION_KEY_NOT_PINNED');

    expect(f.severity).toBe('ERROR');
    // The order is the whole point: pinning after rotating is what breaks decryption.
    expect(f.action).toMatch(/BEFORE rotating/);
    expect(f.action).toMatch(/jwt-secret-rotation/);
  });

  it('reports a missing JWT_SECRET as an ERROR', async () => {
    await healthyTenant();
    delete process.env.JWT_SECRET;

    const r = await buildConfigHealth(TENANT);
    expect(code(r, 'JWT_SECRET_MISSING').severity).toBe('ERROR');
  });

  it('never returns a secret value, a length or a hash', async () => {
    await healthyTenant();
    process.env.JWT_SECRET = 'super-secret-value-nobody-should-see';
    process.env.ENCRYPTION_KEY = 'another-secret-value-nobody-should-see';

    const flat = JSON.stringify(await buildConfigHealth(TENANT));

    expect(flat).not.toContain('super-secret-value-nobody-should-see');
    expect(flat).not.toContain('another-secret-value-nobody-should-see');
    expect(flat).not.toMatch(/secret['"]?\s*:\s*['"][^'"]{8,}/i);
  });
});

// ── a healthy tenant ────────────────────────────────────────────────────────

describe('a correctly configured tenant', () => {
  it('raises no false errors', async () => {
    await healthyTenant();
    const r = await buildConfigHealth(TENANT);

    expect(r.counts.error).toBe(0);
    expect(codes(r)).not.toContain('ROLE_BLUEPRINT_MISSING');
    expect(codes(r)).not.toContain('BLUEPRINT_SKILL_UNRESOLVED');
  });

  it('is deterministic — the same configuration gives the same findings', async () => {
    await healthyTenant();
    const a = await buildConfigHealth(TENANT);
    const b = await buildConfigHealth(TENANT);

    expect(codes(a)).toEqual(codes(b));
    expect(a.counts).toEqual(b.counts);
  });

  it('changes nothing it looked at', async () => {
    await healthyTenant();
    const before = await RoleSkillBlueprint.findOne({ tenantId: TENANT }).lean();

    await buildConfigHealth(TENANT);

    const after = await RoleSkillBlueprint.findOne({ tenantId: TENANT }).lean();
    // A health screen that repaired configuration would be changing what an admin decided.
    expect(after).toEqual(before);
  });
});

// ── tenancy ─────────────────────────────────────────────────────────────────

describe('tenant isolation', () => {
  it('never reports another tenant’s configuration', async () => {
    await healthyTenant(TENANT);
    await Company.create({ tenantId: OTHER, name: 'Secret Co', slug: 'secret-co', active: true } as any);

    const r = await buildConfigHealth(TENANT);

    expect(JSON.stringify(r)).not.toContain('secret-co');
    expect(code(r, 'NO_COMPANIES')).toBeDefined();
  });

  it('does not let another tenant’s healthy blueprints hide my missing ones', async () => {
    await healthyTenant(OTHER);

    // This tenant offers a role and has configured nothing for it.
    await listCareerRoles(TENANT);
    const mine = await CareerRole.findOne({ tenantId: TENANT }).select('key').lean() as any;
    await CareerRole.updateOne(
      { tenantId: TENANT, key: mine.key },
      { $set: { studentSelectable: true, active: true } },
    );

    const r = await buildConfigHealth(TENANT);
    expect(r.findings.some((f: any) => f.area === 'roles' && f.severity === 'ERROR')).toBe(true);
  });
});

// ── launch readiness ────────────────────────────────────────────────────────

describe('launch readiness', () => {
  it('is NOT_READY when anything is an ERROR', async () => {
    await CareerRole.create({
      tenantId: TENANT, key: 'BACKEND_ENGINEER', name: 'Backend Engineer',
      domainKey: 'SOFTWARE_ENGINEERING', active: true, studentSelectable: true,
    } as any);

    const r = await buildLaunchReadiness(TENANT);

    expect(r.status).toBe('NOT_READY');
    expect(r.areas.find(a => a.area === 'roles')!.status).toBe('FAIL');
  });

  it('is NOT_READY for a single error even when everything else passes', async () => {
    await healthyTenant();
    delete process.env.ENCRYPTION_KEY;

    const r = await buildLaunchReadiness(TENANT);

    // Not a weighted score: one unpinned key is not something three green areas offset.
    expect(r.status).toBe('NOT_READY');
    expect(r.summary.error).toBe(1);
    expect(r.areas.find(a => a.area === 'security')!.status).toBe('FAIL');
    expect(r.areas.find(a => a.area === 'roles')!.status).toBe('PASS');
  });

  it('is READY_WITH_WARNINGS when only warnings remain', async () => {
    await healthyTenant();
    await Company.create({ tenantId: TENANT, name: 'Acme', slug: 'acme', active: true } as any);

    const r = await buildLaunchReadiness(TENANT);

    expect(r.summary.error).toBe(0);
    expect(r.summary.warning).toBeGreaterThan(0);
    expect(r.status).toBe('READY_WITH_WARNINGS');
    expect(r.areas.find(a => a.area === 'companies')!.status).toBe('WARNING');
  });

  it('is READY when nothing is wrong', async () => {
    await healthyTenant();

    const r = await buildLaunchReadiness(TENANT);

    expect(r.summary.error).toBe(0);
    expect(r.summary.warning).toBe(0);
    expect(r.status).toBe('READY');
  });

  it('does not let INFO findings affect the verdict', async () => {
    await healthyTenant();
    const r = await buildLaunchReadiness(TENANT);

    // "No companies configured" is INFO, and there is at least one INFO finding.
    expect(r.summary.info).toBeGreaterThan(0);
    expect(r.status).toBe('READY');
  });

  it('reports every area, so a green one is visibly green', async () => {
    await healthyTenant();
    const r = await buildLaunchReadiness(TENANT);

    expect(r.areas.map(a => a.area)).toEqual([
      'core', 'roles', 'skills', 'assessment', 'roadmap',
      'gamification', 'rewards', 'interview', 'companies', 'security', 'database',
    ]);
    for (const a of r.areas) expect(a.label.length).toBeGreaterThan(3);
  });

  it('says out loud that it is not a guarantee', async () => {
    await healthyTenant();
    const r = await buildLaunchReadiness(TENANT);
    expect(r.disclaimer).toMatch(/not a guarantee/i);
  });
});

/**
 * Seeding default blueprints, and the tenant boundary.
 *
 * The seed runs against a tenant that may already have edited its blueprints, so
 * "insert-only" is the property that makes it a maintenance action rather than one that
 * quietly discards somebody's work.
 */

const findBlueprint = jest.fn();
const findOneBlueprint = jest.fn();
const findOneAndUpdateBlueprint = jest.fn();
const insertManyBlueprint = jest.fn();
const findRole = jest.fn();
const findOneRole = jest.fn();
const findSkill = jest.fn();
const auditCreate = jest.fn();

jest.mock('../models/RoleSkillBlueprint', () => {
  const actual = jest.requireActual('../models/RoleSkillBlueprint');
  return {
    __esModule: true, ...actual,
    default: {
      find: (...a: any[]) => findBlueprint(...a),
      findOne: (...a: any[]) => findOneBlueprint(...a),
      findOneAndUpdate: (...a: any[]) => findOneAndUpdateBlueprint(...a),
      insertMany: (...a: any[]) => insertManyBlueprint(...a),
    },
  };
});
jest.mock('../models/CareerRole', () => {
  const actual = jest.requireActual('../models/CareerRole');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findRole(...a), findOne: (...a: any[]) => findOneRole(...a) } };
});
jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findSkill(...a) } };
});
jest.mock('../models/AuditLog', () => ({
  __esModule: true, default: { create: (...a: any[]) => auditCreate(...a) },
}));

import { seedRoleBlueprints } from '../services/roleSkillBlueprintSeedService';
import { saveBlueprint, getBlueprint } from '../controllers/roleSkillBlueprintController';
import { DEFAULT_ROLE_BLUEPRINTS } from '../data/roleSkillBlueprints';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';
import { SYSTEM_CAREER_ROLES } from '../models/CareerRole';

const chain = (rows: any[]) => ({
  sort: () => ({ lean: async () => rows }),
  select: () => ({ lean: async () => rows }),
  lean: async () => rows,
});
const one = (row: any) => ({ select: () => ({ lean: async () => row }), lean: async () => row });

const ALL_ROLES = SYSTEM_CAREER_ROLES.map(r => ({ key: r.key, domainKey: 'SOFTWARE_ENGINEERING', name: r.name, active: true, studentSelectable: true }));
const ALL_SKILLS = CAREER_SKILL_TAXONOMY.map(s => ({
  key: s.key, active: true, nodeType: s.nodeType || 'SKILL', domainKey: 'SOFTWARE_ENGINEERING', name: s.name,
}));

function mockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}
const mockReq = (body: any, params: any = {}, tenantId = 't1') =>
  ({ body, params, user: { tenantId, id: 'a1', email: 'admin@x.com', role: 'TENANT_ADMIN' } } as any);

beforeEach(() => {
  findBlueprint.mockReset(); findOneBlueprint.mockReset(); findOneAndUpdateBlueprint.mockReset();
  insertManyBlueprint.mockReset(); findRole.mockReset(); findOneRole.mockReset();
  findSkill.mockReset(); auditCreate.mockReset();

  findBlueprint.mockReturnValue(chain([]));
  findOneBlueprint.mockReturnValue(one(null));
  findOneAndUpdateBlueprint.mockResolvedValue({ version: 2 });
  insertManyBlueprint.mockResolvedValue([]);
  findRole.mockReturnValue(chain(ALL_ROLES));
  findOneRole.mockReturnValue(one(ALL_ROLES[1]));       // BACKEND_ENGINEER
  findSkill.mockReturnValue(chain(ALL_SKILLS));
  auditCreate.mockResolvedValue({});
});

describe('seeding a tenant with no blueprints', () => {
  it('installs one per role', async () => {
    const report = await seedRoleBlueprints('t1');
    expect(report.inserted).toHaveLength(DEFAULT_ROLE_BLUEPRINTS.length);
    expect(report.missingRoles).toEqual([]);
    expect(insertManyBlueprint).toHaveBeenCalled();
  });

  it('installs them as drafts — a reasonable starting point is not a decision', async () => {
    await seedRoleBlueprints('t1');
    const docs = insertManyBlueprint.mock.calls[0][0];
    expect(docs.every((d: any) => d.published === false)).toBe(true);
  });

  it('resolves every default requirement against the real taxonomy', async () => {
    const report = await seedRoleBlueprints('t1');
    expect(report.droppedRequirements).toBe(0);
    expect(report.missingSkills).toEqual({});
  });

  it('writes nothing on a dry run', async () => {
    const report = await seedRoleBlueprints('t1', { dryRun: true });
    expect(report.inserted.length).toBeGreaterThan(0);
    expect(insertManyBlueprint).not.toHaveBeenCalled();
  });

  it('scopes both the read and the write to the tenant', async () => {
    await seedRoleBlueprints('t9');
    expect(findBlueprint).toHaveBeenCalledWith({ tenantId: 't9' });
    expect(insertManyBlueprint.mock.calls[0][0].every((d: any) => d.tenantId === 't9')).toBe(true);
  });
});

describe('running the seed again', () => {
  it('creates no duplicates and changes nothing', async () => {
    findBlueprint.mockReturnValue(chain(DEFAULT_ROLE_BLUEPRINTS.map(b => ({ roleKey: b.roleKey }))));
    const report = await seedRoleBlueprints('t1');

    expect(report.inserted).toHaveLength(0);
    expect(report.skipped).toHaveLength(DEFAULT_ROLE_BLUEPRINTS.length);
    expect(insertManyBlueprint).not.toHaveBeenCalled();
  });

  it('leaves an edited blueprint exactly as the admin left it', async () => {
    // Insert-only is the whole safety property: the role has one, so it is skipped.
    findBlueprint.mockReturnValue(chain([{ roleKey: 'BACKEND_ENGINEER' }]));
    const report = await seedRoleBlueprints('t1');

    expect(report.skipped).toContain('BACKEND_ENGINEER');
    const written = insertManyBlueprint.mock.calls[0][0].map((d: any) => d.roleKey);
    expect(written).not.toContain('BACKEND_ENGINEER');
  });

  it('installs only the roles genuinely missing a blueprint', async () => {
    findBlueprint.mockReturnValue(chain([{ roleKey: 'BACKEND_ENGINEER' }, { roleKey: 'QA_SDET' }]));
    const report = await seedRoleBlueprints('t1');
    expect(report.inserted).toHaveLength(DEFAULT_ROLE_BLUEPRINTS.length - 2);
  });
});

describe('the seed owns neither roles nor skills', () => {
  it('reports a missing role instead of creating one', async () => {
    findRole.mockReturnValue(chain(ALL_ROLES.filter(r => r.key !== 'QA_SDET')));
    const report = await seedRoleBlueprints('t1');

    expect(report.missingRoles).toEqual(['QA_SDET']);
    expect(report.inserted).not.toContain('QA_SDET');
    // Module 2 owns roles. Creating one here would give that collection a second owner.
    expect(findRole).toHaveBeenCalled();
  });

  it('reports a missing skill and drops that requirement, creating nothing', async () => {
    findSkill.mockReturnValue(chain(ALL_SKILLS.filter(s => s.key !== 'SQL_JOINS')));
    const report = await seedRoleBlueprints('t1');

    expect(Object.keys(report.missingSkills)).toContain('SQL_JOINS');
    expect(report.droppedRequirements).toBeGreaterThan(0);
    // Every installed requirement still resolves.
    const written = insertManyBlueprint.mock.calls[0][0];
    for (const d of written) {
      expect(d.requirements.some((r: any) => r.skillKey === 'SQL_JOINS')).toBe(false);
    }
  });

  it('names which roles wanted the missing skill', async () => {
    findSkill.mockReturnValue(chain(ALL_SKILLS.filter(s => s.key !== 'SQL_JOINS')));
    const report = await seedRoleBlueprints('t1');
    expect(report.missingSkills['SQL_JOINS']).toEqual(expect.arrayContaining(['BACKEND_ENGINEER']));
  });

  it('drops an inactive skill rather than seeding a dead requirement', async () => {
    findSkill.mockReturnValue(chain(ALL_SKILLS.map(s => s.key === 'SQL_JOINS' ? { ...s, active: false } : s)));
    const report = await seedRoleBlueprints('t1');
    expect(Object.keys(report.missingSkills)).toContain('SQL_JOINS');
  });
});

describe('tenant isolation', () => {
  it('reads a blueprint only within the caller’s tenant', async () => {
    const res = mockRes();
    await getBlueprint(mockReq({}, { roleKey: 'BACKEND_ENGINEER' }, 't1'), res);

    // The role lookup is Module 2's and is tenant-scoped; the blueprint query must be too.
    expect(findOneBlueprint).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 't1', roleKey: 'BACKEND_ENGINEER' }),
    );
  });

  it('refuses a role the caller’s tenant does not have', async () => {
    findOneRole.mockReturnValue(one(null));
    const res = mockRes();
    await saveBlueprint(mockReq({ requirements: [{ skillKey: 'JAVA_OOP' }] }, { roleKey: 'BACKEND_ENGINEER' }, 't2'), res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toMatch(/does not exist/i);
    expect(findOneAndUpdateBlueprint).not.toHaveBeenCalled();
  });

  it('never takes the tenant from the request body', async () => {
    const res = mockRes();
    await saveBlueprint(
      mockReq({ tenantId: 'someone-else', requirements: [{ skillKey: 'JAVA_OOP' }] }, { roleKey: 'BACKEND_ENGINEER' }, 't1'),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(findOneAndUpdateBlueprint.mock.calls[0][0]).toEqual({ tenantId: 't1', roleKey: 'BACKEND_ENGINEER' });
  });
});

describe('saving a blueprint', () => {
  it('accepts a valid set and bumps the version', async () => {
    const res = mockRes();
    await saveBlueprint(mockReq({
      requirements: [
        { skillKey: 'JAVA_OOP', importance: 'ESSENTIAL', weight: 10, targetLevel: 'PROFICIENT' },
        { skillKey: 'SQL_JOINS', importance: 'IMPORTANT', weight: 7, targetLevel: 'WORKING' },
      ],
    }, { roleKey: 'BACKEND_ENGINEER' }), res);

    expect(res.statusCode).toBe(200);
    const update = findOneAndUpdateBlueprint.mock.calls[0][1];
    expect(update.$inc).toEqual({ version: 1 });
    expect(update.$set.requirements).toHaveLength(2);
  });

  it('refuses an invalid weight before writing anything', async () => {
    const res = mockRes();
    await saveBlueprint(mockReq({
      requirements: [{ skillKey: 'JAVA_OOP', weight: 99 }],
    }, { roleKey: 'BACKEND_ENGINEER' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/between 1 and 10/i);
    expect(findOneAndUpdateBlueprint).not.toHaveBeenCalled();
  });

  it('removes a requirement simply by leaving it out', async () => {
    findOneBlueprint.mockReturnValue(one({
      roleKey: 'BACKEND_ENGINEER',
      requirements: [{ skillKey: 'JAVA_OOP' }, { skillKey: 'JAVA_CONCURRENCY' }],
    }));
    const res = mockRes();

    await saveBlueprint(mockReq({ requirements: [{ skillKey: 'JAVA_OOP' }] }, { roleKey: 'BACKEND_ENGINEER' }), res);

    expect(res.statusCode).toBe(200);
    const saved = findOneAndUpdateBlueprint.mock.calls[0][1].$set.requirements;
    expect(saved.map((r: any) => r.skillKey)).toEqual(['JAVA_OOP']);
    // Scenario 4: the CareerSkill itself is untouched — nothing here writes to that model.
    expect(findSkill).toHaveBeenCalled();
  });

  it('keeps a since-deactivated requirement editable', async () => {
    // Scenario 6, end to end: JAVA_COLLECTIONS is retired but already in the blueprint.
    findSkill.mockReturnValue(chain(ALL_SKILLS.map(s => s.key === 'JAVA_COLLECTIONS' ? { ...s, active: false } : s)));
    findOneBlueprint.mockReturnValue(one({
      roleKey: 'BACKEND_ENGINEER', requirements: [{ skillKey: 'JAVA_COLLECTIONS', weight: 8 }],
    }));
    const res = mockRes();

    await saveBlueprint(mockReq({
      requirements: [{ skillKey: 'JAVA_COLLECTIONS', weight: 5, importance: 'SUPPORTING' }],
    }, { roleKey: 'BACKEND_ENGINEER' }), res);

    expect(res.statusCode).toBe(200);
  });

  it('still refuses newly adding a deactivated skill', async () => {
    findSkill.mockReturnValue(chain(ALL_SKILLS.map(s => s.key === 'JAVA_CONCURRENCY' ? { ...s, active: false } : s)));
    findOneBlueprint.mockReturnValue(one({ roleKey: 'BACKEND_ENGINEER', requirements: [] }));
    const res = mockRes();

    await saveBlueprint(mockReq({
      requirements: [{ skillKey: 'JAVA_CONCURRENCY' }],
    }, { roleKey: 'BACKEND_ENGINEER' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/inactive and cannot be newly added/i);
  });
});

/**
 * Seeding, and the rules that make a skill's identity trustworthy.
 *
 * The seed runs against a live catalogue that admins have already edited, so "safe to run
 * repeatedly" is not a nicety — it is the difference between a maintenance action and one
 * that silently reverts somebody's work.
 */

const findSkill = jest.fn();
const findOneSkill = jest.fn();
const findByIdSkill = jest.fn();
const insertManySkill = jest.fn();
const createSkill_ = jest.fn();
const deleteOneSkill = jest.fn();
const auditCreate = jest.fn();

jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return {
    __esModule: true, ...actual,
    default: {
      find: (...a: any[]) => findSkill(...a),
      findOne: (...a: any[]) => findOneSkill(...a),
      findById: (...a: any[]) => findByIdSkill(...a),
      insertMany: (...a: any[]) => insertManySkill(...a),
      create: (...a: any[]) => createSkill_(...a),
      deleteOne: (...a: any[]) => deleteOneSkill(...a),
    },
  };
});
jest.mock('../models/AuditLog', () => ({
  __esModule: true, default: { create: (...a: any[]) => auditCreate(...a) },
}));

import { seedCareerSkills } from '../services/careerSkillSeedService';
import { createSkill, updateSkill, deleteSkill } from '../controllers/careerSkillController';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';

const chain = (rows: any[]) => ({
  sort: () => ({ lean: async () => rows }),
  select: () => ({ lean: async () => rows }),
  lean: async () => rows,
});
const one = (row: any) => ({ select: () => ({ lean: async () => row }), lean: async () => row });

function mockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}
const mockReq = (body: any, params: any = {}) =>
  ({ body, params, user: { tenantId: 't1', id: 'a1', email: 'admin@x.com', role: 'SUPER_ADMIN' } } as any);

beforeEach(() => {
  findSkill.mockReset(); findOneSkill.mockReset(); findByIdSkill.mockReset();
  insertManySkill.mockReset(); createSkill_.mockReset(); deleteOneSkill.mockReset(); auditCreate.mockReset();
  findSkill.mockReturnValue(chain([]));
  findOneSkill.mockReturnValue(one(null));
  insertManySkill.mockResolvedValue([]);
  createSkill_.mockImplementation(async (d: any) => ({ ...d, _id: 'new1' }));
  deleteOneSkill.mockResolvedValue({});
  auditCreate.mockResolvedValue({});
});

describe('seeding an empty catalogue', () => {
  it('installs the whole taxonomy', async () => {
    const report = await seedCareerSkills();
    expect(report.inserted).toHaveLength(CAREER_SKILL_TAXONOMY.length);
    expect(report.skipped).toHaveLength(0);
    expect(insertManySkill).toHaveBeenCalled();
  });

  it('marks everything it installs as a system skill', async () => {
    await seedCareerSkills();
    const docs = insertManySkill.mock.calls[0][0];
    expect(docs.every((d: any) => d.systemSkill === true)).toBe(true);
  });

  it('writes nothing on a dry run', async () => {
    const report = await seedCareerSkills({ dryRun: true });
    expect(report.inserted.length).toBeGreaterThan(0);   // still reports what it WOULD do
    expect(insertManySkill).not.toHaveBeenCalled();
  });
});

describe('running the seed again', () => {
  it('creates no duplicates', async () => {
    findSkill.mockReturnValue(chain(CAREER_SKILL_TAXONOMY.map(s => ({ key: s.key }))));
    const report = await seedCareerSkills();

    expect(report.inserted).toHaveLength(0);
    expect(report.skipped).toHaveLength(CAREER_SKILL_TAXONOMY.length);
    expect(insertManySkill).not.toHaveBeenCalled();
  });

  it('does not overwrite an admin-renamed skill', async () => {
    // Insert-only is the whole safety property: the row exists, so it is untouched.
    findSkill.mockReturnValue(chain(CAREER_SKILL_TAXONOMY.map(s => ({ key: s.key }))));
    await seedCareerSkills();
    expect(insertManySkill).not.toHaveBeenCalled();
  });

  it('does not reactivate a deactivated skill', async () => {
    // JAVA_CONCURRENCY turned off by an admin. Present, therefore skipped entirely.
    findSkill.mockReturnValue(chain(CAREER_SKILL_TAXONOMY.map(s => ({ key: s.key, active: s.key !== 'JAVA_CONCURRENCY' }))));
    const report = await seedCareerSkills();

    expect(report.inserted).toHaveLength(0);
    expect(report.skipped).toContain('JAVA_CONCURRENCY');
  });

  it('installs only what is genuinely missing', async () => {
    const partial = CAREER_SKILL_TAXONOMY.slice(0, 10).map(s => ({ key: s.key }));
    findSkill.mockReturnValue(chain(partial));
    const report = await seedCareerSkills();

    expect(report.inserted).toHaveLength(CAREER_SKILL_TAXONOMY.length - 10);
    expect(report.skipped).toHaveLength(10);
    for (const k of partial.map(p => p.key)) expect(report.inserted).not.toContain(k);
  });

  it('leaves admin-created skills alone — it only knows its own keys', async () => {
    findSkill.mockReturnValue(chain([
      ...CAREER_SKILL_TAXONOMY.map(s => ({ key: s.key })),
      { key: 'PLATFORM_ENGINEERING_BASICS' },
    ]));
    const report = await seedCareerSkills();
    expect(report.inserted).toHaveLength(0);
  });
});

describe('creating a skill', () => {
  it('accepts a new one with valid prerequisites', async () => {
    findSkill.mockReturnValue(chain([
      { key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true, name: 'Java' },
      { key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', active: true, name: 'Java OOP', parentKey: 'JAVA' },
      { key: 'JAVA_COLLECTIONS', domainKey: 'SOFTWARE_ENGINEERING', active: true, name: 'Java Collections', parentKey: 'JAVA' },
    ]));
    const res = mockRes();

    await createSkill(mockReq({
      name: 'Java Generics', key: 'JAVA_GENERICS', parentKey: 'JAVA',
      prerequisiteKeys: ['JAVA_OOP', 'JAVA_COLLECTIONS'], difficulty: 'INTERMEDIATE',
    }), res);

    expect(res.statusCode).toBe(201);
    expect(createSkill_.mock.calls[0][0].key).toBe('JAVA_GENERICS');
    expect(createSkill_.mock.calls[0][0].prerequisiteKeys).toEqual(['JAVA_OOP', 'JAVA_COLLECTIONS']);
    expect(createSkill_.mock.calls[0][0].systemSkill).toBe(false);
  });

  it('rejects a duplicate key', async () => {
    findOneSkill.mockReturnValue(one({ key: 'JAVA_OOP', name: 'Java OOP' }));
    const res = mockRes();
    await createSkill(mockReq({ name: 'Java OOP again', key: 'JAVA_OOP' }), res);

    expect(res.statusCode).toBe(409);
    expect(createSkill_).not.toHaveBeenCalled();
  });

  it('rejects a malformed key', async () => {
    const res = mockRes();
    await createSkill(mockReq({ name: 'Java Generics', key: 'Java Generics!' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/not a valid key/i);
    expect(createSkill_).not.toHaveBeenCalled();
  });

  it('rejects an unknown domain rather than coercing it', async () => {
    const res = mockRes();
    await createSkill(mockReq({ name: 'X', key: 'X_SKILL', domainKey: 'HEALTHCARE' }), res);

    expect(res.statusCode).toBe(400);
    expect(createSkill_).not.toHaveBeenCalled();
  });

  it('defaults a GROUP to neither assessable nor learnable', async () => {
    const res = mockRes();
    await createSkill(mockReq({ name: 'Mobile', key: 'MOBILE', nodeType: 'GROUP' }), res);

    expect(res.statusCode).toBe(201);
    expect(createSkill_.mock.calls[0][0].assessable).toBe(false);
    expect(createSkill_.mock.calls[0][0].learnable).toBe(false);
  });
});

describe('a skill’s identity is fixed after creation', () => {
  const skillDoc = (over: any = {}) => {
    const doc: any = {
      _id: 's1', key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', name: 'Java OOP',
      parentKey: 'JAVA', prerequisiteKeys: [], active: true, nodeType: 'SKILL',
      systemSkill: true, save: jest.fn(async () => doc), ...over,
    };
    return doc;
  };

  it('refuses a key change', async () => {
    const doc = skillDoc();
    findByIdSkill.mockResolvedValue(doc);
    const res = mockRes();

    await updateSkill(mockReq({ key: 'JAVA_OBJECT_ORIENTED' }, { id: 's1' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/cannot be changed/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('refuses a domain change', async () => {
    const doc = skillDoc();
    findByIdSkill.mockResolvedValue(doc);
    const res = mockRes();

    await updateSkill(mockReq({ domainKey: 'HEALTHCARE' }, { id: 's1' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/domain cannot be changed/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('allows a rename, leaving the key untouched — Scenario E', async () => {
    const doc = skillDoc();
    findByIdSkill.mockResolvedValue(doc);
    findSkill.mockReturnValue(chain([{ key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true }]));
    const res = mockRes();

    await updateSkill(mockReq({ name: 'Object-Oriented Programming with Java' }, { id: 's1' }), res);

    expect(res.statusCode).toBe(200);
    expect(doc.name).toBe('Object-Oriented Programming with Java');
    expect(doc.key).toBe('JAVA_OOP');
  });

  it('allows deactivation without touching anything else — Scenario F', async () => {
    const doc = skillDoc({ key: 'JAVA_CONCURRENCY' });
    findByIdSkill.mockResolvedValue(doc);
    findSkill.mockReturnValue(chain([{ key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true }]));
    const res = mockRes();

    await updateSkill(mockReq({ active: false }, { id: 's1' }), res);

    expect(res.statusCode).toBe(200);
    expect(doc.active).toBe(false);
    expect(doc.key).toBe('JAVA_CONCURRENCY');       // still resolvable
    expect(doc.name).toBe('Java OOP');              // nothing else disturbed
  });

  it('can still be edited after one of its prerequisites is deactivated', async () => {
    // End to end through the controller, which is where the lockout actually bit: the
    // update path sends the whole prerequisite array, so a rename would have been refused
    // over a relationship nobody touched.
    const doc = skillDoc({ prerequisiteKeys: ['JAVA_METHODS'] });
    findByIdSkill.mockResolvedValue(doc);
    findSkill.mockReturnValue(chain([
      { key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true },
      { key: 'JAVA_METHODS', domainKey: 'SOFTWARE_ENGINEERING', active: false, name: 'Java Methods' },
      { key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', active: true, parentKey: 'JAVA', prerequisiteKeys: ['JAVA_METHODS'] },
    ]));
    const res = mockRes();

    await updateSkill(mockReq({ name: 'Java OOP (revised)', prerequisiteKeys: ['JAVA_METHODS'] }, { id: 's1' }), res);

    expect(res.statusCode).toBe(200);
    expect(doc.name).toBe('Java OOP (revised)');
    expect(doc.prerequisiteKeys).toEqual(['JAVA_METHODS']);
  });

  it('still refuses a newly added inactive prerequisite through the controller', async () => {
    const doc = skillDoc({ prerequisiteKeys: ['JAVA_METHODS'] });
    findByIdSkill.mockResolvedValue(doc);
    findSkill.mockReturnValue(chain([
      { key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true },
      { key: 'JAVA_METHODS', domainKey: 'SOFTWARE_ENGINEERING', active: false, name: 'Java Methods' },
      { key: 'RETIRED', domainKey: 'SOFTWARE_ENGINEERING', active: false, name: 'Retired Skill' },
      { key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', active: true, parentKey: 'JAVA', prerequisiteKeys: ['JAVA_METHODS'] },
    ]));
    const res = mockRes();

    await updateSkill(mockReq({ prerequisiteKeys: ['JAVA_METHODS', 'RETIRED'] }, { id: 's1' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Retired Skill is deactivated/i);
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('rejects a cycle-forming parent before any field is written', async () => {
    const doc = skillDoc({ key: 'JAVA' , parentKey: 'PROGRAMMING' });
    findByIdSkill.mockResolvedValue(doc);
    findSkill.mockReturnValue(chain([
      { key: 'JAVA', domainKey: 'SOFTWARE_ENGINEERING', active: true, parentKey: 'PROGRAMMING' },
      { key: 'JAVA_OOP', domainKey: 'SOFTWARE_ENGINEERING', active: true, parentKey: 'JAVA' },
      { key: 'PROGRAMMING', domainKey: 'SOFTWARE_ENGINEERING', active: true, parentKey: null },
    ]));
    const res = mockRes();

    // Scenario C: JAVA under JAVA_OOP, while JAVA_OOP is under JAVA.
    await updateSkill(mockReq({ name: 'Renamed', parentKey: 'JAVA_OOP' }, { id: 's1' }), res);

    expect(res.statusCode).toBe(400);
    expect(doc.name).toBe('Java OOP');              // the rename was not applied either
    expect(doc.save).not.toHaveBeenCalled();
  });
});

describe('deletion', () => {
  it('refuses to delete a canonical skill', async () => {
    findByIdSkill.mockResolvedValue({ _id: 's1', key: 'JAVA_OOP', name: 'Java OOP', systemSkill: true });
    const res = mockRes();

    await deleteSkill(mockReq({}, { id: 's1' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/canonical taxonomy/i);
    expect(deleteOneSkill).not.toHaveBeenCalled();
  });

  it('refuses to delete a skill other skills point at', async () => {
    findByIdSkill.mockResolvedValue({ _id: 's2', key: 'CUSTOM', name: 'Custom', systemSkill: false });
    findSkill.mockReturnValue(chain([{ key: 'CHILD', name: 'Child Skill' }]));
    const res = mockRes();

    await deleteSkill(mockReq({}, { id: 's2' }), res);

    expect(res.statusCode).toBe(409);
    expect(res.body.message).toMatch(/deactivate it instead/i);
    expect(deleteOneSkill).not.toHaveBeenCalled();
  });

  it('deletes an unused admin-created skill', async () => {
    findByIdSkill.mockResolvedValue({ _id: 's3', key: 'UNUSED', name: 'Unused', systemSkill: false });
    findSkill.mockReturnValue(chain([]));
    const res = mockRes();

    await deleteSkill(mockReq({}, { id: 's3' }), res);

    expect(res.statusCode).toBe(200);
    expect(deleteOneSkill).toHaveBeenCalled();
  });
});

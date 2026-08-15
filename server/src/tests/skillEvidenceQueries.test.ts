/**
 * Evidence pools, coverage, and what saving a mapping does and does not touch.
 *
 * These matter because Module 6 will build every personalised assessment on top of them:
 * a pool query that fans out per skill would be unusable at twenty skills, and a save that
 * reached into a content collection could corrupt questions this module does not own.
 */

const findEvidence = jest.fn();
const findOneEvidence = jest.fn();
const findOneAndUpdateEvidence = jest.fn();
const deleteManyEvidence = jest.fn();
const countEvidence = jest.fn();
const aggregateEvidence = jest.fn();
const findSkill = jest.fn();
const findAssessmentItem = jest.fn();
const auditCreate = jest.fn();

jest.mock('../models/SkillEvidence', () => {
  const actual = jest.requireActual('../models/SkillEvidence');
  return {
    __esModule: true, ...actual,
    default: {
      find: (...a: any[]) => findEvidence(...a),
      findOne: (...a: any[]) => findOneEvidence(...a),
      findOneAndUpdate: (...a: any[]) => findOneAndUpdateEvidence(...a),
      deleteMany: (...a: any[]) => deleteManyEvidence(...a),
      countDocuments: (...a: any[]) => countEvidence(...a),
      aggregate: (...a: any[]) => aggregateEvidence(...a),
    },
  };
});
jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findSkill(...a) } };
});
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true, default: { find: (...a: any[]) => findAssessmentItem(...a), countDocuments: async () => 0 },
}));
jest.mock('../models/PassportAssessment', () => ({ __esModule: true, default: { findOne: () => ({ lean: async () => null }) } }));
jest.mock('../models/Question', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }), countDocuments: async () => 0 } }));
jest.mock('../models/ThinkingProblem', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }), countDocuments: async () => 0 } }));
jest.mock('../models/AuditLog', () => ({ __esModule: true, default: { create: (...a: any[]) => auditCreate(...a) } }));

import { findEvidenceCandidates, getEvidenceCoverage } from '../services/skillEvidenceService';
import { saveItemEvidence } from '../controllers/skillEvidenceController';

const chain = (rows: any[]) => ({
  sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }), lean: async () => rows }),
  select: () => ({ sort: () => ({ lean: async () => rows }), lean: async () => rows }),
  lean: async () => rows,
});

const ITEM = (id: string, over: any = {}) => ({
  _id: id, prompt: `Question ${id}`, type: 'mcq', difficulty: 3, dimension: 'fundamentals', ...over,
});
const EVROW = (sourceId: string, skillKey: string, over: any = {}) => ({
  tenantId: 't1', sourceType: 'assessment_item', sourceId, skillKey,
  contribution: 'PRIMARY', active: true, ...over,
});

function mockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}
const mockReq = (body: any, params: any = {}, tenantId = 't1') =>
  ({ body, params, query: {}, user: { tenantId, id: 'a1', email: 'admin@x.com', role: 'TENANT_ADMIN' } } as any);

beforeEach(() => {
  [findEvidence, findOneEvidence, findOneAndUpdateEvidence, deleteManyEvidence,
   countEvidence, aggregateEvidence, findSkill, findAssessmentItem, auditCreate].forEach(m => m.mockReset());
  findEvidence.mockReturnValue(chain([]));
  findSkill.mockReturnValue(chain([]));
  findAssessmentItem.mockReturnValue(chain([]));
  aggregateEvidence.mockResolvedValue([]);
  findOneAndUpdateEvidence.mockResolvedValue({});
  deleteManyEvidence.mockResolvedValue({});
  auditCreate.mockResolvedValue({});
});

describe('evidence pools for a set of skills', () => {
  it('answers many skills without querying per skill', async () => {
    findEvidence.mockReturnValue(chain([
      EVROW('i1', 'JAVA_OOP'), EVROW('i2', 'JAVA_OOP'),
      EVROW('i3', 'DSA_ARRAYS'), EVROW('i4', 'SQL_JOINS'),
    ]));
    findAssessmentItem.mockReturnValue(chain(['i1', 'i2', 'i3', 'i4'].map(id => ITEM(id))));

    const pools = await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP', 'DSA_ARRAYS', 'SQL_JOINS'] });

    // The whole point: one evidence query and one per content type, whatever the skill count.
    expect(findEvidence).toHaveBeenCalledTimes(1);
    expect(findAssessmentItem).toHaveBeenCalledTimes(1);
    expect(findEvidence.mock.calls[0][0].skillKey).toEqual({ $in: ['JAVA_OOP', 'DSA_ARRAYS', 'SQL_JOINS'] });
    expect(pools.find(p => p.skillKey === 'JAVA_OOP')!.items).toHaveLength(2);
  });

  it('returns an empty pool for a skill with no evidence, rather than omitting it', async () => {
    findEvidence.mockReturnValue(chain([EVROW('i1', 'JAVA_OOP')]));
    findAssessmentItem.mockReturnValue(chain([ITEM('i1')]));

    const pools = await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP', 'DSA_GRAPHS'] });

    // A caller planning an assessment needs to know the gap exists.
    expect(pools.map(p => p.skillKey).sort()).toEqual(['DSA_GRAPHS', 'JAVA_OOP']);
    expect(pools.find(p => p.skillKey === 'DSA_GRAPHS')!.items).toEqual([]);
  });

  it('filters by difficulty using each family’s own scale', async () => {
    // AssessmentItem grades 1-5; 3 is the middle band, 5 is hard.
    findEvidence.mockReturnValue(chain([EVROW('easy', 'JAVA_OOP'), EVROW('hard', 'JAVA_OOP')]));
    findAssessmentItem.mockReturnValue(chain([ITEM('easy', { difficulty: 1 }), ITEM('hard', { difficulty: 5 })]));

    const pools = await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP'], difficulty: 'HARD' });
    expect(pools[0].items.map(i => i.sourceId)).toEqual(['hard']);
  });

  it('excludes inactive mappings from the usable pool', async () => {
    await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP'] });
    expect(findEvidence.mock.calls[0][0].active).toBe(true);
  });

  it('scopes the pool to the tenant', async () => {
    await findEvidenceCandidates('t7', { skillKeys: ['JAVA_OOP'] });
    expect(findEvidence.mock.calls[0][0].tenantId).toBe('t7');
  });

  it('skips a mapping whose content has since been deleted', async () => {
    // A hollow candidate would be selected for a student and then fail to render.
    findEvidence.mockReturnValue(chain([EVROW('gone', 'JAVA_OOP')]));
    findAssessmentItem.mockReturnValue(chain([]));

    const pools = await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP'] });
    expect(pools[0].items).toEqual([]);
  });

  it('caps each pool when asked', async () => {
    findEvidence.mockReturnValue(chain(['a', 'b', 'c', 'd'].map(id => EVROW(id, 'JAVA_OOP'))));
    findAssessmentItem.mockReturnValue(chain(['a', 'b', 'c', 'd'].map(id => ITEM(id))));

    const pools = await findEvidenceCandidates('t1', { skillKeys: ['JAVA_OOP'], limitPerSkill: 2 });
    expect(pools[0].items).toHaveLength(2);
  });

  it('returns nothing for an empty request rather than everything', async () => {
    expect(await findEvidenceCandidates('t1', { skillKeys: [] })).toEqual([]);
    expect(findEvidence).not.toHaveBeenCalled();
  });
});

describe('coverage', () => {
  it('counts per skill and per content type in one aggregate', async () => {
    aggregateEvidence.mockResolvedValue([
      { _id: { skillKey: 'JAVA_OOP', sourceType: 'assessment_item' }, n: 27, primary: 20 },
      { _id: { skillKey: 'JAVA_OOP', sourceType: 'question' }, n: 12, primary: 8 },
      { _id: { skillKey: 'DSA_ARRAYS', sourceType: 'assessment_item' }, n: 18, primary: 18 },
    ]);
    findSkill.mockReturnValue(chain([
      { key: 'JAVA_OOP', name: 'Java OOP', active: true, assessable: true },
      { key: 'DSA_ARRAYS', name: 'Arrays', active: true, assessable: true },
      { key: 'SQL_JOINS', name: 'SQL Joins', active: true, assessable: true },
    ]));

    const cov = await getEvidenceCoverage('t1');
    const java = cov.find(c => c.skillKey === 'JAVA_OOP')!;

    expect(aggregateEvidence).toHaveBeenCalledTimes(1);
    expect(java.total).toBe(39);
    expect(java.byType).toEqual({ assessment_item: 27, question: 12 });
    expect(java.primary).toBe(28);
  });

  it('lists a skill with no evidence at all, so the gap is visible', async () => {
    aggregateEvidence.mockResolvedValue([]);
    findSkill.mockReturnValue(chain([{ key: 'SQL_JOINS', name: 'SQL Joins', active: true, assessable: true }]));

    const cov = await getEvidenceCoverage('t1');
    expect(cov).toEqual([expect.objectContaining({ skillKey: 'SQL_JOINS', total: 0 })]);
  });

  it('surfaces a mapping to a skill no longer in the graph', async () => {
    // Rather than dropping it, so an admin can find and repair it.
    aggregateEvidence.mockResolvedValue([
      { _id: { skillKey: 'REMOVED_SKILL', sourceType: 'assessment_item' }, n: 4, primary: 4 },
    ]);
    findSkill.mockReturnValue(chain([]));

    const cov = await getEvidenceCoverage('t1');
    expect(cov).toEqual([expect.objectContaining({ skillKey: 'REMOVED_SKILL', total: 4, active: false })]);
  });

  it('scopes the aggregate to the tenant and to active mappings', async () => {
    await getEvidenceCoverage('t3');
    expect(aggregateEvidence.mock.calls[0][0][0].$match).toEqual({ tenantId: 't3', active: true });
  });
});

describe('saving a mapping', () => {
  const validSkills = [
    { key: 'JAVA_OOP', name: 'Java OOP', domainKey: 'SOFTWARE_ENGINEERING', nodeType: 'SKILL', active: true, assessable: true },
    { key: 'OOP_CONCEPTS', name: 'OOP Concepts', domainKey: 'SOFTWARE_ENGINEERING', nodeType: 'SKILL', active: true, assessable: true },
  ];

  it('accepts a primary plus a secondary — Scenario B', async () => {
    findAssessmentItem.mockReturnValue(chain([ITEM('i1')]));
    findSkill.mockReturnValue(chain(validSkills));
    const res = mockRes();

    await saveItemEvidence(mockReq({
      evidence: [
        { skillKey: 'JAVA_OOP', contribution: 'PRIMARY' },
        { skillKey: 'OOP_CONCEPTS', contribution: 'SECONDARY' },
      ],
    }, { sourceType: 'assessment_item', sourceId: 'i1' }), res);

    expect(res.statusCode).toBe(200);
    expect(findOneAndUpdateEvidence).toHaveBeenCalledTimes(2);
  });

  it('refuses content that does not exist in this tenant', async () => {
    findAssessmentItem.mockReturnValue(chain([]));
    const res = mockRes();

    await saveItemEvidence(mockReq({ evidence: [{ skillKey: 'JAVA_OOP' }] },
      { sourceType: 'assessment_item', sourceId: 'not-mine' }, 't2'), res);

    expect(res.statusCode).toBe(404);
    expect(findOneAndUpdateEvidence).not.toHaveBeenCalled();
  });

  it('refuses an unsupported content type', async () => {
    const res = mockRes();
    await saveItemEvidence(mockReq({ evidence: [] }, { sourceType: 'blog_post', sourceId: 'x' }), res);
    expect(res.statusCode).toBe(400);
  });

  it('removes only the RELATIONSHIP, never the question or the skill — Scenario for §46', async () => {
    findAssessmentItem.mockReturnValue(chain([ITEM('i1')]));
    findSkill.mockReturnValue(chain(validSkills));
    findEvidence.mockReturnValue(chain([EVROW('i1', 'JAVA_OOP'), EVROW('i1', 'OOP_CONCEPTS')]));
    const res = mockRes();

    await saveItemEvidence(mockReq({ evidence: [{ skillKey: 'JAVA_OOP', contribution: 'PRIMARY' }] },
      { sourceType: 'assessment_item', sourceId: 'i1' }), res);

    expect(res.statusCode).toBe(200);
    // Deletes reach the evidence collection only, and name only the dropped skill.
    expect(deleteManyEvidence).toHaveBeenCalledWith(expect.objectContaining({
      sourceType: 'assessment_item', sourceId: 'i1', skillKey: { $in: ['OOP_CONCEPTS'] },
    }));
  });

  it('never takes the tenant from the request body', async () => {
    findAssessmentItem.mockReturnValue(chain([ITEM('i1')]));
    findSkill.mockReturnValue(chain(validSkills));
    const res = mockRes();

    await saveItemEvidence(mockReq({ tenantId: 'someone-else', evidence: [{ skillKey: 'JAVA_OOP' }] },
      { sourceType: 'assessment_item', sourceId: 'i1' }, 't1'), res);

    expect(res.statusCode).toBe(200);
    expect(findOneAndUpdateEvidence.mock.calls[0][1].$set.tenantId).toBe('t1');
  });

  it('refuses two primaries before writing anything — Scenario G', async () => {
    findAssessmentItem.mockReturnValue(chain([ITEM('i1')]));
    findSkill.mockReturnValue(chain(validSkills));
    const res = mockRes();

    await saveItemEvidence(mockReq({
      evidence: [
        { skillKey: 'JAVA_OOP', contribution: 'PRIMARY' },
        { skillKey: 'OOP_CONCEPTS', contribution: 'PRIMARY' },
      ],
    }, { sourceType: 'assessment_item', sourceId: 'i1' }), res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/only one primary/i);
    expect(findOneAndUpdateEvidence).not.toHaveBeenCalled();
    expect(deleteManyEvidence).not.toHaveBeenCalled();
  });
});

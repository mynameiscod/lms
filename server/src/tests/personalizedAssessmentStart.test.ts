/**
 * Starting an assessment: what the student controls, and what they must not.
 *
 * The security properties here are the ones that would quietly invalidate every score in
 * the product. A student who could name their own role or stage would sit an easier paper
 * whose result was still presented as comparable, and nothing in the number would show it.
 */

const findOnePA = jest.fn();
const findPA = jest.fn();
const createPA = jest.fn();
const findSkill = jest.fn();
const findEvidence = jest.fn();
const findAssessmentItem = jest.fn();

// Tenant assessment-policy overrides are read when the policy is resolved. Unmocked, the
// query buffers against a connection this suite does not have and every test times out.
jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: { findOne: () => ({ select: () => ({ lean: async () => null }) }) },
}));

jest.mock('../models/PersonalizedAssessment', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => findOnePA(...a),
    find: (...a: any[]) => findPA(...a),
    create: (...a: any[]) => createPA(...a),
  },
}));
jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findSkill(...a) } };
});
jest.mock('../models/SkillEvidence', () => {
  const actual = jest.requireActual('../models/SkillEvidence');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findEvidence(...a) } };
});
jest.mock('../models/AssessmentItem', () => ({
  __esModule: true, default: { find: (...a: any[]) => findAssessmentItem(...a), countDocuments: async () => 0 },
}));
jest.mock('../models/PassportAssessment', () => ({ __esModule: true, default: { findOne: () => ({ lean: async () => null }) } }));
jest.mock('../models/Question', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }), countDocuments: async () => 0 } }));
jest.mock('../models/ThinkingProblem', () => ({ __esModule: true, default: { find: () => ({ lean: async () => [] }), countDocuments: async () => 0 } }));

const getCareerContextMock = jest.fn();
const getRoleSkillBlueprintMock = jest.fn();
jest.mock('../services/careerContextService', () => ({
  __esModule: true, getCareerContext: (...a: any[]) => getCareerContextMock(...a),
}));
jest.mock('../services/roleSkillBlueprintService', () => ({
  __esModule: true, getRoleSkillBlueprint: (...a: any[]) => getRoleSkillBlueprintMock(...a),
}));

import { startPersonalizedAssessment } from '../controllers/personalizedAssessmentController';
import { resolvePersonalizedAssessmentContext } from '../services/personalizedAssessmentService';

const chain = (rows: any[]) => ({
  sort: () => ({ select: () => ({ lean: async () => rows }), lean: async () => rows }),
  select: () => ({ sort: () => ({ lean: async () => rows }), lean: async () => rows }),
  lean: async () => rows,
});
const one = (row: any) => ({ select: () => ({ lean: async () => row }), lean: async () => row });

const CONTEXT = (over: any = {}) => ({
  education: { degree: 'B.Tech', currentAcademicYear: '1st Year' },
  career: { primaryRole: 'BACKEND_ENGINEER' },
  derived: { stage: 'foundation' },
  status: { onboardingCompleted: true },
  ...over,
});

const BLUEPRINT = (over: any = {}) => ({
  roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer', published: true, version: 3,
  requirements: [
    { skillKey: 'PROGRAMMING_FUNDAMENTALS', active: true, skillActive: true, missing: false },
    { skillKey: 'PROBLEM_SOLVING', active: true, skillActive: true, missing: false },
  ],
  ...over,
});

function mockRes() {
  const res: any = { statusCode: 200, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}
const mockReq = (body: any = {}, tenantId = 't1', userId = 'stu1') =>
  ({ body, params: {}, query: {}, user: { tenantId, id: userId, email: 's@x.com', role: 'STUDENT' } } as any);

beforeEach(() => {
  [findOnePA, findPA, createPA, findSkill, findEvidence, findAssessmentItem,
   getCareerContextMock, getRoleSkillBlueprintMock].forEach(m => m.mockReset());

  findOnePA.mockReturnValue(one(null));
  findPA.mockReturnValue(chain([]));
  findSkill.mockReturnValue(chain([]));
  findEvidence.mockReturnValue(chain([]));
  findAssessmentItem.mockReturnValue(chain([]));
  getCareerContextMock.mockResolvedValue(CONTEXT());
  getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT());
  createPA.mockImplementation(async (d: any) => ({ ...d, _id: 'pa1' }));
});

describe('the student controls nothing about their own paper', () => {
  it('ignores a role supplied in the request body', async () => {
    const res = mockRes();
    await startPersonalizedAssessment(mockReq({ roleKey: 'CLOUD_DEVOPS', stage: 'placement' }), res);

    // Resolution went through the career context, not the body.
    expect(getCareerContextMock).toHaveBeenCalledWith('t1', 'stu1');
    expect(getRoleSkillBlueprintMock).toHaveBeenCalledWith('t1', 'BACKEND_ENGINEER');
  });

  it('ignores a stage supplied in the request body', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT({ derived: { stage: 'foundation' } }));
    const res = mockRes();
    await startPersonalizedAssessment(mockReq({ stage: 'job_seeker' }), res);

    // Whatever was created used the server-derived stage.
    if (createPA.mock.calls.length) expect(createPA.mock.calls[0][0].stage).toBe('foundation');
  });

  it('never reads the tenant from the body', async () => {
    const res = mockRes();
    await startPersonalizedAssessment(mockReq({ tenantId: 'other-tenant' }), res);
    expect(getCareerContextMock).toHaveBeenCalledWith('t1', 'stu1');
  });

  it('scopes the open-attempt lookup to the caller', async () => {
    await startPersonalizedAssessment(mockReq({}), mockRes());
    expect(findOnePA).toHaveBeenCalledWith({ tenantId: 't1', studentId: 'stu1', status: 'IN_PROGRESS' });
  });
});

describe('context resolution', () => {
  it('refuses to start before CareerPilot setup is complete', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT({ status: { onboardingCompleted: false } }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/complete your careerpilot setup/i);
  });

  it('refuses when the stage cannot be derived, rather than guessing one', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT({ derived: { stage: null } }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/academic stage/i);
  });

  it('refuses a DRAFT blueprint rather than silently using it', async () => {
    // Assessing against an unpublished standard measures something nobody agreed to.
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT({ published: false }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');

    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/not been published/i);
  });

  it('gives NOT_SURE the discovery scope without assigning a role', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT({ career: { primaryRole: 'NOT_SURE' } }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');

    expect(r.ok).toBe(true);
    expect(r.discovery).toBe(true);
    expect(r.roleKey).toBe('NOT_SURE');
    // No blueprint was even consulted — nothing infers a role for them.
    expect(getRoleSkillBlueprintMock).not.toHaveBeenCalled();
    expect(r.roleSkillKeys!.length).toBeGreaterThan(5);
  });

  it('skips blueprint requirements whose skill has been retired', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT({
      requirements: [
        { skillKey: 'GOOD', active: true, skillActive: true, missing: false },
        { skillKey: 'RETIRED', active: true, skillActive: false, missing: false },
        { skillKey: 'GONE', active: true, skillActive: true, missing: true },
        { skillKey: 'OFF', active: false, skillActive: true, missing: false },
      ],
    }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');
    expect(r.roleSkillKeys).toEqual(['GOOD']);
  });

  it('refuses when the blueprint has no usable skills left', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT({ requirements: [] }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/no usable skills/i);
  });

  it('uses the stage’s own policy — B.Sc third year is placement, not build', async () => {
    // Module 1 already distinguishes these; Module 6 must not re-derive it.
    getCareerContextMock.mockResolvedValue(CONTEXT({ derived: { stage: 'placement' } }));
    const r = await resolvePersonalizedAssessmentContext('t1', 'stu1');
    expect(r.policy!.stage).toBe('placement');
  });
});

describe('an open attempt is resumed, never replaced', () => {
  it('returns the existing paper on a second start', async () => {
    findOnePA.mockReturnValue(one({
      _id: 'open1', attemptNumber: 1, status: 'IN_PROGRESS', startedAt: new Date(),
      items: [{ sourceType: 'assessment_item', sourceId: 'q1', order: 0, points: 1 }],
    }));
    const res = mockRes();

    await startPersonalizedAssessment(mockReq({}), res);

    expect(res.body.resumed).toBe(true);
    // Nothing new was generated — a double click must not cost somebody their answers.
    expect(createPA).not.toHaveBeenCalled();
  });
});

describe('nothing internal reaches the student', () => {
  it('never sends the generation seed', async () => {
    findOnePA.mockReturnValue(one({
      _id: 'open1', attemptNumber: 1, status: 'IN_PROGRESS', startedAt: new Date(),
      generationSeed: 'stu1:FOUNDATION_V1:v1:a1',
      specification: { slots: [{ skillKey: 'X', difficulty: 'EASY' }] },
      items: [{ sourceType: 'assessment_item', sourceId: 'q1', order: 0, points: 1, skillKey: 'X', difficulty: 'EASY' }],
    }));
    const res = mockRes();

    await startPersonalizedAssessment(mockReq({}), res);

    const body = JSON.stringify(res.body);
    // The seed would let somebody reconstruct another student's paper.
    expect(body).not.toContain('FOUNDATION_V1:v1:a1');
    expect(body).not.toContain('generationSeed');
    // The slot specification is internal too — it reveals what is being measured.
    expect(res.body.assessment).not.toHaveProperty('specification');
  });

  it('sends no correct answers or skill labels with the questions', async () => {
    findOnePA.mockReturnValue(one({
      _id: 'open1', attemptNumber: 1, status: 'IN_PROGRESS', startedAt: new Date(),
      items: [{ sourceType: 'assessment_item', sourceId: 'q1', order: 0, points: 1, skillKey: 'JAVA_OOP', difficulty: 'HARD' }],
    }));
    const res = mockRes();

    await startPersonalizedAssessment(mockReq({}), res);

    const item = res.body.assessment.items[0];
    expect(item).not.toHaveProperty('correctIndex');
    expect(item).not.toHaveProperty('skillKey');     // telling them what is measured aids guessing
    expect(item).not.toHaveProperty('difficulty');
  });
});

describe('coverage failure', () => {
  it('returns a clear message and persists nothing', async () => {
    // No evidence mapped anywhere, so no slot can be filled.
    findSkill.mockReturnValue(chain([
      { key: 'PROGRAMMING_FUNDAMENTALS', domainKey: 'SOFTWARE_ENGINEERING', nodeType: 'SKILL', active: true, assessable: true, difficulty: 'FOUNDATION', prerequisiteKeys: [] },
      { key: 'PROBLEM_SOLVING', domainKey: 'SOFTWARE_ENGINEERING', nodeType: 'SKILL', active: true, assessable: true, difficulty: 'FOUNDATION', prerequisiteKeys: [] },
    ]));
    const res = mockRes();

    await startPersonalizedAssessment(mockReq({}), res);

    expect(res.statusCode).toBe(409);
    // The member is told it is not ready and that it is not their fault — NOT which skill
    // key is short, which is an administrator's problem and was previously sent to them.
    expect(res.body.message).toMatch(/not ready yet/i);
    expect(res.body.message).not.toMatch(/mapped|skill key|PROGRAMMING_FUNDAMENTALS/i);
    // `shortfalls` is a list of internal skill keys and difficulty bands. No student
    // surface reads it, so sending it only exposed the data model to the browser.
    expect(res.body.coverage).toBeUndefined();
    // A half-generated attempt would be a paper that quietly measures less.
    expect(createPA).not.toHaveBeenCalled();
  });
});

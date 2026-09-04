/**
 * The readiness engine, end to end over mocked inputs.
 *
 * These are the acceptance scenarios. The one they all circle is that a required skill
 * nobody has measured must never look like a required skill somebody failed — it is
 * excluded from readiness, reported separately, and never scored zero.
 */

const findProfile = jest.fn();
const findSkill = jest.fn();
const getCareerContextMock = jest.fn();
const getRoleSkillBlueprintMock = jest.fn();

/**
 * A student with no role now falls back to their STAGE's skill set, if an admin configured
 * one. These scenarios are about the role path, so the stage set is absent — which is what
 * every tenant has until somebody writes one, and keeps Scenario E asserting what it always
 * asserted: no role and no stage list means nothing to measure against.
 */
jest.mock('../models/StageSkillSet', () => ({
  __esModule: true,
  default: { findOne: () => ({ lean: () => Promise.resolve(null) }) },
}));

jest.mock('../models/StudentSkillProfile', () => ({
  __esModule: true, default: { find: (...a: any[]) => findProfile(...a) },
}));
jest.mock('../models/CareerSkill', () => {
  const actual = jest.requireActual('../models/CareerSkill');
  return { __esModule: true, ...actual, default: { find: (...a: any[]) => findSkill(...a) } };
});
jest.mock('../services/careerContextService', () => ({
  __esModule: true, getCareerContext: (...a: any[]) => getCareerContextMock(...a),
}));
jest.mock('../services/roleSkillBlueprintService', () => ({
  __esModule: true, getRoleSkillBlueprint: (...a: any[]) => getRoleSkillBlueprintMock(...a),
}));

import { calculateStudentRoleReadiness, explainReadiness } from '../services/roleReadinessService';
import { TARGET_SCORE } from '../data/roleReadinessPolicy';

const chain = (rows: any[]) => ({ select: () => ({ lean: async () => rows }), lean: async () => rows });

const CONTEXT = (primaryRole: string | null = 'BACKEND_ENGINEER') => ({
  career: { primaryRole },
  derived: { stage: 'placement' },
  status: { onboardingCompleted: true },
  education: {}, location: {}, availability: {},
});

const REQ = (skillKey: string, over: any = {}) => ({
  skillKey, importance: 'IMPORTANT', weight: 8, targetLevel: 'PROFICIENT',
  active: true, skillActive: true, missing: false, skillName: skillKey, ...over,
});

const BLUEPRINT = (requirements: any[], over: any = {}) => ({
  roleKey: 'BACKEND_ENGINEER', roleName: 'Backend Engineer',
  published: true, version: 3, updatedAt: new Date('2026-08-01'),
  requirements, ...over,
});

const PROFILE = (skillKey: string, score: number, confidence = 'HIGH', evidenceCount = 6) =>
  ({ skillKey, score, confidence, evidenceCount });

beforeEach(() => {
  [findProfile, findSkill, getCareerContextMock, getRoleSkillBlueprintMock].forEach(m => m.mockReset());
  getCareerContextMock.mockResolvedValue(CONTEXT());
  getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('JAVA_OOP')]));
  findProfile.mockReturnValue(chain([]));
  findSkill.mockReturnValue(chain([]));
});

describe('when readiness cannot be calculated', () => {
  it('says the role is not selected — Scenario E', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT('NOT_SURE'));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('ROLE_NOT_SELECTED');
    // No role is invented, and no blueprint is even consulted.
    expect(getRoleSkillBlueprintMock).not.toHaveBeenCalled();
  });

  it('refuses a DRAFT blueprint rather than measuring against it — Scenario F', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('JAVA_OOP')], { published: false }));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(r.available).toBe(false);
    expect(r.reason).toBe('ROLE_BLUEPRINT_NOT_READY');
  });

  it('refuses a published blueprint with nothing in it', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    expect(r.available).toBe(false);
  });
});

describe('unknown is not zero — Scenario D', () => {
  it('returns null readiness when nothing is sufficiently assessed', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('JAVA_OOP'), REQ('SQL_BASICS')]));
    findProfile.mockReturnValue(chain([]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    // Not 0 — we have not established that the student is unready, only that we have not looked.
    expect(r.readiness).toBeNull();
    expect(r.coverage).toBe(0);
    expect(r.confidence).toBe('LOW');
    expect(r.skills.every((s: any) => s.status === 'NOT_ASSESSED')).toBe(true);
  });

  it('never reports a student score of 0 for an unmeasured skill', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('DOCKER')]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(r.skills[0].studentScore).toBeNull();
    expect(r.skills[0].gapPoints).toBeNull();
    expect(r.skills[0].priorityScore).toBe(0);
  });

  it('excludes unmeasured skills from readiness rather than failing them', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([
      REQ('JAVA_OOP', { weight: 10 }), REQ('DOCKER', { weight: 10 }),
    ]));
    findProfile.mockReturnValue(chain([PROFILE('JAVA_OOP', 75)]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    // Target PROFICIENT is 75, so the measured skill is fully met. Readiness reflects only
    // what was measured; the unknown shows up as half the coverage instead.
    expect(r.readiness).toBe(100);
    expect(r.coverage).toBe(50);
  });

  it('separates assessment-needed from gaps — Scenario for §33', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([
      REQ('REST_APIS'), REQ('DOCKER'),
    ]));
    findProfile.mockReturnValue(chain([PROFILE('REST_APIS', 40)]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(r.topGaps.map((s: any) => s.skillKey)).toEqual(['REST_APIS']);
    expect(r.assessmentNeeded.map((s: any) => s.skillKey)).toEqual(['DOCKER']);
  });
});

describe('Scenario A — a full comparison', () => {
  const blueprint = BLUEPRINT([
    REQ('JAVA_OOP', { targetLevel: 'PROFICIENT', weight: 10, importance: 'ESSENTIAL' }),
    REQ('SQL_BASICS', { targetLevel: 'WORKING', weight: 8 }),
    REQ('REST_APIS', { targetLevel: 'PROFICIENT', weight: 10, importance: 'ESSENTIAL' }),
    REQ('GIT_FUNDAMENTALS', { targetLevel: 'WORKING', weight: 6 }),
  ]);

  beforeEach(() => {
    getRoleSkillBlueprintMock.mockResolvedValue(blueprint);
    findProfile.mockReturnValue(chain([
      PROFILE('JAVA_OOP', 60), PROFILE('SQL_BASICS', 72), PROFILE('REST_APIS', 40),
      // GIT deliberately absent.
    ]));
  });

  it('classifies each skill as expected', async () => {
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    const byKey = Object.fromEntries(r.skills.map((s: any) => [s.skillKey, s.status]));

    expect(byKey.JAVA_OOP).toBe('NEEDS_WORK');       // 60 vs 75
    expect(byKey.SQL_BASICS).toBe('STRONG');         // 72 vs 60, HIGH confidence
    expect(byKey.REST_APIS).toBe('PRIORITY_GAP');    // 40 vs 75
    expect(byKey.GIT_FUNDAMENTALS).toBe('NOT_ASSESSED');
  });

  it('ranks the largest essential gap first', async () => {
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    expect(r.topGaps[0].skillKey).toBe('REST_APIS');
    expect(r.skills[0].skillKey).toBe('REST_APIS');
  });

  it('computes readiness over measured skills only, and coverage separately', async () => {
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    // (60/75×10 + 1×8 + 40/75×10) ÷ 28 — SQL caps at 1, GIT excluded entirely.
    const expected = Math.round(((60 / 75 * 10) + (1 * 8) + (40 / 75 * 10)) / 28 * 100);
    expect(r.readiness).toBe(expected);
    expect(r.coverage).toBe(Math.round(28 / 34 * 100));
  });

  it('summarises what needs attention', async () => {
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    expect(r.summary).toMatchObject({
      requiredSkills: 4, assessedSkills: 3,
      priorityGaps: 1, needsWork: 1, strong: 1, notAssessed: 1,
      essentialTotal: 2, essentialAssessed: 2,
    });
  });

  it('shows its arithmetic', async () => {
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    const lines = explainReadiness(r);

    expect(lines.some(l => l.includes('REST_APIS') && l.includes('40/75'))).toBe(true);
    expect(lines.some(l => l.includes('excluded from readiness'))).toBe(true);
    expect(lines.some(l => l.includes('coverage'))).toBe(true);
  });
});

describe('low confidence is shown but not counted — Scenario B', () => {
  it('reports the score and withholds the conclusion', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('SQL_BASICS', { targetLevel: 'WORKING' })]));
    findProfile.mockReturnValue(chain([PROFILE('SQL_BASICS', 100, 'LOW', 1)]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    // The data exists and is returned — we are simply cautious about interpreting it.
    expect(r.skills[0].studentScore).toBe(100);
    expect(r.skills[0].status).toBe('LIMITED_EVIDENCE');
    expect(r.skills[0].countedInReadiness).toBe(false);
    expect(r.readiness).toBeNull();
    expect(r.coverage).toBe(0);
  });
});

describe('a trustworthy large gap ranks high — Scenario C', () => {
  it('surfaces a well-evidenced deficit at the top', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([
      REQ('DSA_ARRAYS', { targetLevel: 'PROFICIENT', weight: 9, importance: 'ESSENTIAL' }),
      REQ('GIT_FUNDAMENTALS', { targetLevel: 'WORKING', weight: 5 }),
    ]));
    findProfile.mockReturnValue(chain([PROFILE('DSA_ARRAYS', 30), PROFILE('GIT_FUNDAMENTALS', 58)]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(r.skills[0].skillKey).toBe('DSA_ARRAYS');
    expect(r.skills[0].status).toBe('PRIORITY_GAP');
    expect(r.skills[0].gapPoints).toBe(TARGET_SCORE.PROFICIENT - 30);
  });
});

describe('excellence cannot hide absence — Scenario J', () => {
  it('caps each skill at its requirement', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([
      REQ('JAVA_OOP', { weight: 10 }), REQ('SQL_BASICS', { weight: 10 }),
      REQ('REST_APIS', { weight: 10 }), REQ('GIT_FUNDAMENTALS', { weight: 10 }),
    ]));
    findProfile.mockReturnValue(chain([
      PROFILE('JAVA_OOP', 100), PROFILE('SQL_BASICS', 100),
      PROFILE('REST_APIS', 0), PROFILE('GIT_FUNDAMENTALS', 0),
    ]));
    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    // Two perfect and two absent is 50%, not more — the cap is what enforces that.
    expect(r.readiness).toBe(50);
  });
});

describe('an irrelevant strength changes nothing — Scenario I', () => {
  it('ignores skills the blueprint does not require', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('JAVA_OOP')]));
    findProfile.mockReturnValue(chain([PROFILE('JAVA_OOP', 75)]));
    await calculateStudentRoleReadiness('t1', 'stu1');

    // Profiles are fetched only for the blueprint's own skills.
    expect(findProfile.mock.calls[0][0].skillKey).toEqual({ $in: ['JAVA_OOP'] });
  });
});

describe('role switching — Scenario G', () => {
  it('recomputes against the new blueprint without touching Skill DNA', async () => {
    getCareerContextMock.mockResolvedValue(CONTEXT('DATA_ENGINEER'));
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('SQL_BASICS')], {
      roleKey: 'DATA_ENGINEER', roleName: 'Data Engineer',
    }));
    findProfile.mockReturnValue(chain([PROFILE('SQL_BASICS', 80)]));

    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');

    expect(getRoleSkillBlueprintMock).toHaveBeenCalledWith('t1', 'DATA_ENGINEER');
    expect(r.role.key).toBe('DATA_ENGINEER');
  });

  it('lets an admin compare against another role explicitly', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('SQL_BASICS')]));
    findProfile.mockReturnValue(chain([PROFILE('SQL_BASICS', 80)]));

    await calculateStudentRoleReadiness('t1', 'stu1', 'FRONTEND_ENGINEER');
    expect(getRoleSkillBlueprintMock).toHaveBeenCalledWith('t1', 'FRONTEND_ENGINEER');
  });
});

describe('performance and isolation', () => {
  it('uses a fixed number of queries whatever the blueprint size', async () => {
    const many = Array.from({ length: 30 }, (_, i) => REQ(`SKILL_${i}`));
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT(many));
    findProfile.mockReturnValue(chain(many.map((r, i) => PROFILE(r.skillKey, 50 + i))));

    await calculateStudentRoleReadiness('t1', 'stu1');

    // One batched profile query and one batched skill query — not one per requirement.
    expect(findProfile).toHaveBeenCalledTimes(1);
    expect(findSkill).toHaveBeenCalledTimes(1);
    expect(findProfile.mock.calls[0][0].skillKey.$in).toHaveLength(30);
  });

  it('scopes every query to the tenant and the student', async () => {
    await calculateStudentRoleReadiness('t9', 'stu9');
    expect(findProfile.mock.calls[0][0]).toMatchObject({ tenantId: 't9', studentId: 'stu9' });
    expect(getRoleSkillBlueprintMock.mock.calls[0][0]).toBe('t9');
  });

  it('mutates nothing', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('JAVA_OOP')]));
    findProfile.mockReturnValue(chain([PROFILE('JAVA_OOP', 60)]));
    await calculateStudentRoleReadiness('t1', 'stu1');

    // Readiness is derived. Nothing here writes.
    const profileModel = require('../models/StudentSkillProfile').default;
    expect(profileModel.updateOne).toBeUndefined();
    expect(profileModel.bulkWrite).toBeUndefined();
  });
});

describe('a retired skill still in a published blueprint', () => {
  it('is flagged rather than silently dropped', async () => {
    getRoleSkillBlueprintMock.mockResolvedValue(BLUEPRINT([REQ('OLD_SKILL')]));
    findSkill.mockReturnValue(chain([{ key: 'OLD_SKILL', name: 'Old Skill', active: false }]));
    findProfile.mockReturnValue(chain([PROFILE('OLD_SKILL', 70)]));

    const r: any = await calculateStudentRoleReadiness('t1', 'stu1');
    expect(r.skills[0].skillInactive).toBe(true);
    expect(r.skills[0].skillName).toBe('Old Skill');
  });
});

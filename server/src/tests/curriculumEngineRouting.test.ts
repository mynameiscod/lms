/**
 * Which engine plans a student, and where each trigger goes.
 *
 * The invariant these tests hold: a Foundation learner is planned by the unit engine whatever any
 * tenant switch says — that is the product, so a tenant nobody activated by hand can never hand a
 * first-year the topic roadmap — and every other stage stays on TOPIC however it is switched,
 * because the unit engine has no curriculum to plan it from. Every adaptive trigger reaches exactly
 * one engine: TOPIC learners the replanner they always reached, Foundation learners their journey.
 */

const leanChain = (value: any): any => ({ select: () => leanChain(value), lean: async () => value });

let config: any = null;
let passports: Record<string, any> = {};
let configThrows = false;

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: {
    findOne: () => {
      if (configThrows) throw new Error('config unreadable');
      return leanChain(config);
    },
  },
}));
jest.mock('../models/User', () => ({
  __esModule: true,
  default: {
    findOne: (q: any) => leanChain(passports[String(q._id)] ? { _id: q._id, passport: passports[String(q._id)] } : null),
    find: () => leanChain([]),
  },
}));

const replanForTrigger = jest.fn(async (_input: any) => ({ replanned: true, recommended: false, changedSkills: [], reason: 'TOPIC' }));
jest.mock('../services/curriculumReplanningService', () => ({
  __esModule: true,
  replanForTrigger: (input: any) => replanForTrigger(input),
}));

const applyFoundationTrigger = jest.fn(async (_input: any) => ({ action: 'CREATED', reason: 'DIAGNOSTIC_COMPLETED' }));
jest.mock('../services/foundationJourneyTriggerService', () => ({
  __esModule: true,
  applyFoundationTrigger: (input: any) => applyFoundationTrigger(input),
}));

import {
  curriculumEngineFor, effectiveCurriculumEngine, curriculumEngineDecision,
} from '../data/curriculumEnginePolicy';
import { resolveCurriculumEngine, describeEngineConfig } from '../services/curriculumEngineService';
import { handleCurriculumTrigger } from '../services/curriculumOrchestrationService';
import { registerAdaptiveHandlers, publish, __resetHandlers } from '../services/adaptiveCurriculumEvents';

const TENANT = 't1';
const FOUNDATION_STUDENT = '64b000000000000000000001';
const BUILD_STUDENT = '64b000000000000000000002';
const PILOT = '64b000000000000000000003';

beforeEach(() => {
  config = null;
  configThrows = false;
  passports = {
    [FOUNDATION_STUDENT]: { stage: 'foundation' },
    [BUILD_STUDENT]: { stage: 'build' },
    [PILOT]: { stage: 'build' },
  };
  replanForTrigger.mockClear();
  applyFoundationTrigger.mockClear();
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * The policy
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('the engine a Foundation learner is on', () => {
  it.each([
    ['no PassportConfig at all', null],
    ['an empty configuration', {}],
    ['every switch off', { megaCurriculumEnabled: false, megaCurriculumStages: [], megaCurriculumStudentIds: [] }],
    ['a pilot list that does not name them', { megaCurriculumStudentIds: [PILOT] }],
    ['the stage listed', { megaCurriculumStages: ['foundation'] }],
    ['the tenant switch on', { megaCurriculumEnabled: true }],
  ])('is UNIT with %s — the product, not a setting', (_label, cfg) => {
    expect(effectiveCurriculumEngine({ config: cfg as any, stageKey: 'foundation', studentId: FOUNDATION_STUDENT }))
      .toMatchObject({ engine: 'UNIT', requested: 'UNIT', basis: 'FOUNDATION_PRODUCT', stageKey: 'foundation' });
  });

  it('reads the stage case-insensitively', () => {
    expect(effectiveCurriculumEngine({ stageKey: ' Foundation ' }).engine).toBe('UNIT');
  });
});

describe('the engine every other learner is on', () => {
  /**
   * Build is CAPABLE of the unit engine and is not moved onto it by capability alone.
   *
   * This used to assert that build stayed TOPIC "however the switches are set", because the
   * capability list and the always-on list were one list and build was in neither. Now build is
   * in the capability list, so the switches govern it — which is what the allow-lists were
   * always for. What must not change is that capability alone moves nobody: a tenant that has
   * saved nothing still gets TOPIC for its second-years.
   */
  it('is TOPIC for a later stage until a switch says otherwise', () => {
    expect(effectiveCurriculumEngine({ config: null, stageKey: 'build' })).toMatchObject({ engine: 'TOPIC', basis: 'NO_CONFIG' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStages: ['foundation'] }, stageKey: 'build' }))
      .toMatchObject({ engine: 'TOPIC', basis: 'NOT_ENABLED' });
  });

  it('moves a later stage onto UNIT only where a switch opts it in', () => {
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStages: ['build'] }, stageKey: 'build' }))
      .toMatchObject({ engine: 'UNIT', basis: 'STAGE_LIST' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumEnabled: true }, stageKey: 'build' }))
      .toMatchObject({ engine: 'UNIT', basis: 'TENANT_SWITCH' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStudentIds: [PILOT] }, stageKey: 'build', studentId: PILOT }))
      .toMatchObject({ engine: 'UNIT', basis: 'STUDENT_ALLOWLIST' });
  });

  /**
   * The capability filter still has to exist, and still has to bite, for a stage the engine
   * genuinely cannot plan. Every college YEAR is served now, so the example is `job_seeker` —
   * somebody who has graduated, who has no year-long programme to be planned into. A tenant
   * switch that would otherwise move them must be overridden and SAID; silently planning
   * nothing is the failure this branch was written to prevent.
   */
  it('refuses a stage the engine cannot plan, even with the tenant switch on', () => {
    expect(effectiveCurriculumEngine({ config: { megaCurriculumEnabled: true }, stageKey: 'job_seeker' }))
      .toMatchObject({ engine: 'TOPIC', requested: 'UNIT', basis: 'NO_UNIT_CURRICULUM_FOR_STAGE' });
  });

  it('is TOPIC for a learner whose stage is unknown', () => {
    expect(effectiveCurriculumEngine({ config: { megaCurriculumEnabled: true }, stageKey: null }).engine).toBe('TOPIC');
  });

  it('keeps the switch precedence itself unchanged, for the stages it may one day govern', () => {
    const cfg = { megaCurriculumEnabled: true, megaCurriculumStages: ['foundation'], megaCurriculumStudentIds: [PILOT] };
    expect(curriculumEngineDecision({ config: cfg, stageKey: 'foundation', studentId: PILOT }).basis).toBe('STUDENT_ALLOWLIST');
    expect(curriculumEngineDecision({ config: cfg, stageKey: 'foundation', studentId: FOUNDATION_STUDENT }).basis).toBe('STAGE_LIST');
    expect(curriculumEngineDecision({ config: { megaCurriculumEnabled: true }, stageKey: 'foundation' }).basis).toBe('TENANT_SWITCH');
    expect(curriculumEngineFor({ config: { megaCurriculumEnabled: true }, stageKey: 'build' })).toBe('UNIT');
    expect(curriculumEngineFor({ config: null })).toBe('TOPIC');
  });

  it('describes the effective mode per stage for the Admin screen', () => {
    for (const cfg of [null, { megaCurriculumStages: ['foundation'] }]) {
      const summary = describeEngineConfig(cfg as any);
      expect(summary.foundationMode).toBe('UNIT');
      expect(summary.stages.filter(s => s.stage !== 'foundation').every(s => s.mode === 'TOPIC')).toBe(true);
    }

    /* Every college year is offerable to an admin, so the screen must list them all as capable. */
    expect(describeEngineConfig(null as any).unitCapableStages).toEqual(['foundation', 'build', 'specialize', 'placement']);

    /* And once the tenant switch is on, the screen must show build as UNIT rather than TOPIC. */
    const enabled = describeEngineConfig({ megaCurriculumEnabled: true } as any);
    expect(enabled.stages.find(s => s.stage === 'build')?.mode).toBe('UNIT');
        /* Third and final year are planned like every other year now; a graduate still is not. */
    expect(enabled.stages.find(s => s.stage === 'specialize')?.mode).toBe('UNIT');
    expect(enabled.stages.find(s => s.stage === 'job_seeker')?.mode).toBe('TOPIC');
  });
});

describe('resolving the engine for a real student', () => {
  it('is UNIT for a Foundation learner on a tenant with no configuration, and says there is none', async () => {
    expect(await resolveCurriculumEngine({ tenantId: TENANT, studentId: FOUNDATION_STUDENT }))
      .toMatchObject({ engine: 'UNIT', basis: 'FOUNDATION_PRODUCT', configured: false });
  });

  it('reads the stage from the student when the caller does not know it', async () => {
    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: FOUNDATION_STUDENT })).engine).toBe('UNIT');
    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: BUILD_STUDENT })).engine).toBe('TOPIC');
  });

  it('is TOPIC for a student whose stage is unknown', async () => {
    config = { megaCurriculumEnabled: true };
    passports[FOUNDATION_STUDENT] = {};
    expect((await resolveCurriculumEngine({ tenantId: TENANT, studentId: FOUNDATION_STUDENT })).engine).toBe('TOPIC');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * Routing — every trigger reaches exactly one engine
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('a curriculum trigger', () => {
  it('reaches the TOPIC replanner, with its original input, for a later-stage learner', async () => {
    const input = { tenantId: TENANT, studentId: BUILD_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' as const, assessmentId: 'a1' };
    const out = await handleCurriculumTrigger(input);
    expect(out.engine).toBe('TOPIC');
    expect(replanForTrigger).toHaveBeenCalledTimes(1);
    expect(replanForTrigger).toHaveBeenCalledWith(input);
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('reaches the Foundation journey, and never the TOPIC replanner, for a Foundation learner — with no configuration', async () => {
    const out = await handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'MODULE_ASSESSMENT_COMPLETED' });
    expect(out.engine).toBe('UNIT');
    expect(applyFoundationTrigger).toHaveBeenCalledWith({
      tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'MODULE_ASSESSMENT_COMPLETED', stageKey: 'foundation',
    });
    expect(replanForTrigger).not.toHaveBeenCalled();
  });

  /**
   * The seam routes a second-year to the unit composer once the tenant has opted in, and carries
   * their OWN stage rather than defaulting to foundation. That second assertion is the one worth
   * having: the trigger service threads stageKey into every downstream call, so a build student
   * planned as 'foundation' would compose from the wrong curriculum and never be found again by
   * the reader, which filters journeys by adaptiveStage.
   */
  it('routes a later-stage learner to the unit composer once the tenant switch is on', async () => {
    config = { megaCurriculumEnabled: true };
    await handleCurriculumTrigger({ tenantId: TENANT, studentId: BUILD_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' });
    expect(replanForTrigger).not.toHaveBeenCalled();
    expect(applyFoundationTrigger).toHaveBeenCalledTimes(1);
    expect(applyFoundationTrigger).toHaveBeenCalledWith(expect.objectContaining({ stageKey: 'build' }));
  });

  it('keeps a later-stage learner on TOPIC while the tenant has opted into nothing', async () => {
    config = { megaCurriculumStages: ['foundation'] };
    await handleCurriculumTrigger({ tenantId: TENANT, studentId: BUILD_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' });
    expect(replanForTrigger).toHaveBeenCalledTimes(1);
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  /**
   * Career-context saves never announced a direction change before Phase 27. Delivering one to the
   * TOPIC replanner now would rebuild TOPIC plans on every role edit — a new behaviour for TOPIC
   * learners, which must not be introduced.
   */
  it('does not replan a TOPIC learner for a career-context direction change, exactly as before', async () => {
    const out = await handleCurriculumTrigger({
      tenantId: TENANT, studentId: BUILD_STUDENT, trigger: 'DIRECTION_CHANGED', origin: 'CAREER_CONTEXT',
    });
    expect(out).toMatchObject({ engine: 'TOPIC', topic: null });
    expect(replanForTrigger).not.toHaveBeenCalled();
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('recomposes a Foundation learner for a career-context direction change', async () => {
    await handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIRECTION_CHANGED', origin: 'CAREER_CONTEXT' });
    expect(applyFoundationTrigger).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'DIRECTION_CHANGED' }));
  });

  it('plans with neither engine when the configuration cannot be read', async () => {
    configThrows = true;
    const out = await handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' });
    expect(out.engine).toBe('UNRESOLVED');
    expect(replanForTrigger).not.toHaveBeenCalled();
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('runs triggers for one student one at a time', async () => {
    const log: string[] = [];
    applyFoundationTrigger.mockImplementation(async (input: any) => {
      log.push(`start ${input.trigger}`);
      await new Promise(r => setTimeout(r, 20));
      log.push(`end ${input.trigger}`);
      return { action: 'UNCHANGED', reason: input.trigger };
    });
    await Promise.all([
      handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' }),
      handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIRECTION_CHANGED' }),
    ]);
    expect(log).toEqual(['start DIAGNOSTIC_COMPLETED', 'end DIAGNOSTIC_COMPLETED', 'start DIRECTION_CHANGED', 'end DIRECTION_CHANGED']);
    applyFoundationTrigger.mockImplementation(async () => ({ action: 'CREATED', reason: 'DIAGNOSTIC_COMPLETED' }));
  });
});

describe('the production event seam', () => {
  beforeEach(() => { __resetHandlers(); registerAdaptiveHandlers(); });
  afterAll(() => __resetHandlers());

  it('routes a diagnostic to the TOPIC replanner for a later-stage learner', async () => {
    await publish({ name: 'DIAGNOSTIC_COMPLETED', tenantId: TENANT, studentId: BUILD_STUDENT, assessmentId: 'p1' });
    expect(replanForTrigger).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'DIAGNOSTIC_COMPLETED', assessmentId: 'p1' }));
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('routes a diagnostic, a checkpoint, a mastery change and a direction change to UNIT for a Foundation learner', async () => {
    await publish({ name: 'DIAGNOSTIC_COMPLETED', tenantId: TENANT, studentId: FOUNDATION_STUDENT });
    await publish({ name: 'MODULE_ASSESSMENT_COMPLETED', tenantId: TENANT, studentId: FOUNDATION_STUDENT });
    await publish({ name: 'SKILL_MASTERY_CHANGED', tenantId: TENANT, studentId: FOUNDATION_STUDENT });
    await publish({ name: 'DIRECTION_CHANGED', tenantId: TENANT, studentId: FOUNDATION_STUDENT, meta: { origin: 'CAREER_CONTEXT' } });
    expect(applyFoundationTrigger.mock.calls.map(c => (c[0] as any).trigger)).toEqual([
      'DIAGNOSTIC_COMPLETED', 'MODULE_ASSESSMENT_COMPLETED', 'SIGNIFICANT_MASTERY_CHANGE', 'DIRECTION_CHANGED',
    ]);
    expect(replanForTrigger).not.toHaveBeenCalled();
  });

  it('delivers nothing for an event with no trigger', async () => {
    await publish({ name: 'PRACTICE_COMPLETED', tenantId: TENANT, studentId: FOUNDATION_STUDENT });
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
    expect(replanForTrigger).not.toHaveBeenCalled();
  });
});

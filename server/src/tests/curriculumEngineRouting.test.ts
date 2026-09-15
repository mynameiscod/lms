/**
 * Phase 27 — which engine plans a student, and where each trigger goes.
 *
 * The engine policy existed and nothing in production asked it. These tests hold the three
 * things the activation depends on: the precedence is the policy's own (allow-lists that can
 * only move somebody onto UNIT, then TOPIC), the unit engine is never chosen for a stage it
 * cannot plan, and every adaptive trigger reaches exactly one engine — TOPIC learners the
 * replanner they always reached, UNIT learners their Foundation journey.
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
    [PILOT]: { stage: 'foundation' },
  };
  replanForTrigger.mockClear();
  applyFoundationTrigger.mockClear();
});

/* ══════════════════════════════════════════════════════════════════════════════════════════ *
 * The policy — precedence stated once
 * ══════════════════════════════════════════════════════════════════════════════════════════ */

describe('the engine a student is on', () => {
  it('is TOPIC when the tenant has no PassportConfig', () => {
    expect(effectiveCurriculumEngine({ config: null, stageKey: 'foundation' })).toMatchObject({ engine: 'TOPIC', basis: 'NO_CONFIG' });
  });

  it('is TOPIC when the tenant switch is off and nothing is listed', () => {
    const cfg = { megaCurriculumEnabled: false, megaCurriculumStages: [], megaCurriculumStudentIds: [] };
    expect(effectiveCurriculumEngine({ config: cfg, stageKey: 'foundation', studentId: FOUNDATION_STUDENT }))
      .toMatchObject({ engine: 'TOPIC', basis: 'NOT_ENABLED' });
  });

  it('is TOPIC for a stage that is not enabled', () => {
    const cfg = { megaCurriculumStages: ['foundation'] };
    expect(effectiveCurriculumEngine({ config: cfg, stageKey: 'build' })).toMatchObject({ engine: 'TOPIC', basis: 'NOT_ENABLED' });
  });

  /**
   * The allow-lists only ever ADD. The repository has no deny-list: "not in the student list"
   * means the next rule decides, which is TOPIC unless a stage or the tenant switch says UNIT.
   */
  it('is TOPIC for a student not on the pilot list, when only the pilot list is in use', () => {
    const cfg = { megaCurriculumStudentIds: [PILOT] };
    expect(effectiveCurriculumEngine({ config: cfg, stageKey: 'foundation', studentId: FOUNDATION_STUDENT }))
      .toMatchObject({ engine: 'TOPIC', basis: 'NOT_ENABLED' });
  });

  it('is UNIT for an enabled learner — by pilot list, by stage, or by the tenant switch', () => {
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStudentIds: [PILOT] }, stageKey: 'foundation', studentId: PILOT }))
      .toMatchObject({ engine: 'UNIT', basis: 'STUDENT_ALLOWLIST' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStages: ['Foundation'] }, stageKey: 'foundation' }))
      .toMatchObject({ engine: 'UNIT', basis: 'STAGE_LIST' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumEnabled: true }, stageKey: 'foundation' }))
      .toMatchObject({ engine: 'UNIT', basis: 'TENANT_SWITCH' });
  });

  it('checks the pilot list before the stage list before the tenant switch', () => {
    const cfg = { megaCurriculumEnabled: true, megaCurriculumStages: ['foundation'], megaCurriculumStudentIds: [PILOT] };
    expect(curriculumEngineDecision({ config: cfg, stageKey: 'foundation', studentId: PILOT }).basis).toBe('STUDENT_ALLOWLIST');
    expect(curriculumEngineDecision({ config: cfg, stageKey: 'foundation', studentId: FOUNDATION_STUDENT }).basis).toBe('STAGE_LIST');
    expect(curriculumEngineDecision({ config: { megaCurriculumEnabled: true }, stageKey: 'foundation' }).basis).toBe('TENANT_SWITCH');
  });

  /** A stage with no Learning Unit curriculum stays on TOPIC however it is switched. */
  it('never chooses UNIT for a stage the unit engine cannot plan', () => {
    const tenantWide = { megaCurriculumEnabled: true };
    expect(effectiveCurriculumEngine({ config: tenantWide, stageKey: 'build' }))
      .toMatchObject({ engine: 'TOPIC', requested: 'UNIT', basis: 'NO_UNIT_CURRICULUM_FOR_STAGE' });
    expect(effectiveCurriculumEngine({ config: { megaCurriculumStudentIds: [PILOT] }, stageKey: 'build', studentId: PILOT }).engine)
      .toBe('TOPIC');
    expect(effectiveCurriculumEngine({ config: tenantWide, stageKey: null }).engine).toBe('TOPIC');
  });

  it('keeps curriculumEngineFor as the switches alone, exactly as before', () => {
    expect(curriculumEngineFor({ config: { megaCurriculumEnabled: true }, stageKey: 'build' })).toBe('UNIT');
    expect(curriculumEngineFor({ config: null })).toBe('TOPIC');
  });

  it('describes the effective mode per stage for the Admin screen', () => {
    const summary = describeEngineConfig({ megaCurriculumStages: ['foundation'] });
    expect(summary.foundationMode).toBe('UNIT');
    expect(summary.stages.find(s => s.stage === 'build')!.mode).toBe('TOPIC');
    expect(summary.unitCapableStages).toEqual(['foundation']);
    expect(describeEngineConfig(null).foundationMode).toBe('TOPIC');
  });
});

describe('resolving the engine for a real student', () => {
  it('is TOPIC, and says so, when no configuration exists', async () => {
    expect(await resolveCurriculumEngine({ tenantId: TENANT, studentId: FOUNDATION_STUDENT }))
      .toMatchObject({ engine: 'TOPIC', configured: false });
  });

  it('reads the stage from the student when the caller does not know it', async () => {
    config = { megaCurriculumStages: ['foundation'] };
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
  it('reaches the TOPIC replanner, with its original input, for a TOPIC learner', async () => {
    const input = { tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' as const, assessmentId: 'a1' };
    const out = await handleCurriculumTrigger(input);
    expect(out.engine).toBe('TOPIC');
    expect(replanForTrigger).toHaveBeenCalledTimes(1);
    expect(replanForTrigger).toHaveBeenCalledWith(input);
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('reaches the Foundation journey, and never the TOPIC replanner, for a UNIT learner', async () => {
    config = { megaCurriculumStages: ['foundation'] };
    const out = await handleCurriculumTrigger({ tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'MODULE_ASSESSMENT_COMPLETED' });
    expect(out.engine).toBe('UNIT');
    expect(applyFoundationTrigger).toHaveBeenCalledWith({
      tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'MODULE_ASSESSMENT_COMPLETED', stageKey: 'foundation',
    });
    expect(replanForTrigger).not.toHaveBeenCalled();
  });

  it('keeps a TOPIC learner in a later stage on TOPIC even when the tenant switch is on', async () => {
    config = { megaCurriculumEnabled: true };
    await handleCurriculumTrigger({ tenantId: TENANT, studentId: BUILD_STUDENT, trigger: 'DIAGNOSTIC_COMPLETED' });
    expect(replanForTrigger).toHaveBeenCalledTimes(1);
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  /**
   * Career-context saves never announced a direction change before Phase 27. Delivering one to
   * the TOPIC replanner now would rebuild TOPIC plans on every role edit — a new behaviour for
   * TOPIC learners, which the activation must not introduce.
   */
  it('does not replan a TOPIC learner for a career-context direction change, exactly as before', async () => {
    const out = await handleCurriculumTrigger({
      tenantId: TENANT, studentId: FOUNDATION_STUDENT, trigger: 'DIRECTION_CHANGED', origin: 'CAREER_CONTEXT',
    });
    expect(out).toMatchObject({ engine: 'TOPIC', topic: null });
    expect(replanForTrigger).not.toHaveBeenCalled();
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('recomposes a UNIT learner for a career-context direction change', async () => {
    config = { megaCurriculumStages: ['foundation'] };
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
    config = { megaCurriculumStages: ['foundation'] };
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

  it('routes a diagnostic to the TOPIC replanner for a TOPIC learner', async () => {
    await publish({ name: 'DIAGNOSTIC_COMPLETED', tenantId: TENANT, studentId: FOUNDATION_STUDENT, assessmentId: 'p1' });
    expect(replanForTrigger).toHaveBeenCalledWith(expect.objectContaining({ trigger: 'DIAGNOSTIC_COMPLETED', assessmentId: 'p1' }));
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
  });

  it('routes a diagnostic, a checkpoint, a mastery change and a direction change to UNIT for a UNIT learner', async () => {
    config = { megaCurriculumStages: ['foundation'] };
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
    config = { megaCurriculumStages: ['foundation'] };
    await publish({ name: 'PRACTICE_COMPLETED', tenantId: TENANT, studentId: FOUNDATION_STUDENT });
    expect(applyFoundationTrigger).not.toHaveBeenCalled();
    expect(replanForTrigger).not.toHaveBeenCalled();
  });
});

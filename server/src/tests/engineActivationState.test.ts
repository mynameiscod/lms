/**
 * Phase 27 — the production gates accept exactly two engine states.
 *
 * Before activation the engine is OFF. The one authorised activation is the Foundation stage on
 * UNIT, set through the admin config. A gate that accepts that activation must still refuse every
 * other way of turning the engine on — a tenant switch, named accounts, or another stage listed.
 */

import { engineActivationState, effectiveCurriculumEngine } from '../data/curriculumEnginePolicy';

describe('engineActivationState', () => {
  it('is OFF with no config, or a config that switches nothing on', () => {
    expect(engineActivationState([])).toBe('OFF');
    expect(engineActivationState([null, undefined])).toBe('OFF');
    expect(engineActivationState([{ megaCurriculumEnabled: false, megaCurriculumStages: [], megaCurriculumStudentIds: [] }])).toBe('OFF');
  });

  it('is FOUNDATION_UNIT for exactly the authorised activation, however the stage is cased', () => {
    expect(engineActivationState([{ megaCurriculumStages: ['foundation'] }])).toBe('FOUNDATION_UNIT');
    expect(engineActivationState([{ megaCurriculumEnabled: false, megaCurriculumStages: [' Foundation '], megaCurriculumStudentIds: [] }])).toBe('FOUNDATION_UNIT');
  });

  it.each([
    ['the tenant switch', { megaCurriculumEnabled: true }],
    ['the tenant switch alongside Foundation', { megaCurriculumEnabled: true, megaCurriculumStages: ['foundation'] }],
    ['named accounts', { megaCurriculumStudentIds: ['507f1f77bcf86cd799439011'] }],
    ['named accounts alongside Foundation', { megaCurriculumStages: ['foundation'], megaCurriculumStudentIds: ['507f1f77bcf86cd799439011'] }],
    ['another stage', { megaCurriculumStages: ['build'] }],
    ['Foundation and another stage', { megaCurriculumStages: ['foundation', 'build'] }],
  ])('is UNAUTHORIZED for %s', (_label, cfg) => {
    expect(engineActivationState([cfg])).toBe('UNAUTHORIZED');
  });

  it('is UNAUTHORIZED when any one of several configs goes beyond the activation', () => {
    expect(engineActivationState([{ megaCurriculumStages: ['foundation'] }, { megaCurriculumEnabled: true }])).toBe('UNAUTHORIZED');
  });

  it('the authorised activation serves Foundation on UNIT and every other stage on TOPIC', () => {
    const config = { megaCurriculumStages: ['foundation'] };
    expect(effectiveCurriculumEngine({ config, stageKey: 'foundation' }).engine).toBe('UNIT');
    for (const stageKey of ['build', 'specialize', 'job_seeker', null]) {
      expect(effectiveCurriculumEngine({ config, stageKey }).engine).toBe('TOPIC');
    }
  });
});

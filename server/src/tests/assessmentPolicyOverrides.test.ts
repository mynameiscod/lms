/**
 * Admin-editable paper shape.
 *
 * Question count, skill count, difficulty mix and an optional timer are the tenant's to
 * decide. Everything that keeps papers comparable — prerequisite depth, which skill
 * difficulties a stage admits, difficulty fallback — stays in code.
 *
 * The bounds are not decoration. A paper of 200 questions across 3 skills cannot be filled
 * from any realistic bank, and an admin finding that out through a generation failure — after
 * a student has clicked start — is a worse way to learn it than a clamp.
 */

const findOne = jest.fn();
const updateOne = jest.fn();

jest.mock('../models/PassportConfig', () => ({
  __esModule: true,
  default: {
    findOne: (...a: any[]) => ({ select: () => ({ lean: async () => findOne(...a) }) }),
    updateOne: (...a: any[]) => { updateOne(...a); return Promise.resolve({}); },
  },
}));

import {
  resolveAssessmentPolicy, listEditablePolicies, saveAssessmentPolicies, POLICY_BOUNDS,
} from '../services/assessmentPolicyService';

beforeEach(() => {
  findOne.mockReset().mockResolvedValue(null);
  updateOne.mockReset();
});

/** What was persisted on the last save. */
const saved = () => updateOne.mock.calls.at(-1)?.[1]?.$set?.assessmentPolicyOverrides ?? [];

describe('with no override', () => {
  it('uses the shipped policy exactly', async () => {
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect(p.skillSlots).toBe(20);
    expect(p.maxSkills).toBe(8);
    expect((p as any).timeLimitMinutes).toBeFalsy();   // untimed by default
  });

  it('survives a config read failure rather than blocking a student', async () => {
    findOne.mockRejectedValue(new Error('mongo down'));
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect(p.skillSlots).toBe(20);
  });
});

describe('with an override', () => {
  it('changes only what was set, leaving the rest at the default', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', skillSlots: 12 }] });
    const p = await resolveAssessmentPolicy('t1', 'build');

    expect(p.skillSlots).toBe(12);
    expect(p.maxSkills).toBe(8);                       // untouched
    expect(p.difficultyMix).toEqual({ EASY: 0.35, MEDIUM: 0.5, HARD: 0.15 });
  });

  it('normalises a difficulty mix that does not sum to 100', async () => {
    // "Roughly this" is what an admin means; refusing over ten points would be pedantry.
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', difficultyMix: { EASY: 30, MEDIUM: 50, HARD: 30 } }] });
    const p = await resolveAssessmentPolicy('t1', 'build');

    const total = p.difficultyMix.EASY + p.difficultyMix.MEDIUM + p.difficultyMix.HARD;
    expect(total).toBeCloseTo(1, 5);
  });

  it('applies a time limit when one is configured', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', timeLimitMinutes: 30 }] });
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect((p as any).timeLimitMinutes).toBe(30);
  });

  it('does not affect a different stage', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', skillSlots: 12 }] });
    const p = await resolveAssessmentPolicy('t1', 'foundation');
    expect(p.skillSlots).toBe(16);
  });
});

describe('bounds', () => {
  it('clamps an unbuildable question count', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', skillSlots: 500 }] });
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect(p.skillSlots).toBe(POLICY_BOUNDS.skillSlots.max);
  });

  it('clamps a skill count below what a paper can span', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', maxSkills: 0 }] });
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect(p.maxSkills).toBe(POLICY_BOUNDS.maxSkills.min);
  });

  it('never lets items-per-skill exceed the slots available', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', skillSlots: 6, maxSkills: 14 }] });
    const p = await resolveAssessmentPolicy('t1', 'build');
    expect(p.maxItemsPerSkill).toBeLessThanOrEqual(p.skillSlots);
    expect(p.minItemsPerSkill).toBeGreaterThanOrEqual(1);
  });
});

describe('what is NOT editable stays fixed', () => {
  it('keeps prerequisite depth, allowed difficulty and fallback from the shipped policy', async () => {
    findOne.mockResolvedValue({
      assessmentPolicyOverrides: [{
        stage: 'foundation', skillSlots: 30,
        // Values an admin might hope to set; they are not part of the contract.
        prerequisiteDepth: 0, allowedSkillDifficulty: ['ADVANCED'], allowDifficultyFallback: false,
      }],
    });
    const p = await resolveAssessmentPolicy('t1', 'foundation');

    expect(p.prerequisiteDepth).toBe(2);
    expect(p.allowedSkillDifficulty).toEqual(['FOUNDATION']);
    expect(p.allowDifficultyFallback).toBe(true);
  });
});

describe('saving', () => {
  it('stores only stages that genuinely differ from the default', async () => {
    await saveAssessmentPolicies('t1', [
      { stage: 'foundation', skillSlots: 16, maxSkills: 6, difficultyMix: { EASY: 60, MEDIUM: 35, HARD: 5 }, timeLimitMinutes: 0 },
      { stage: 'build', skillSlots: 12, maxSkills: 8, difficultyMix: { EASY: 35, MEDIUM: 50, HARD: 15 }, timeLimitMinutes: 0 },
    ]);

    // foundation matched the shipped policy exactly, so it is not recorded as an override.
    expect(saved().map((r: any) => r.stage)).toEqual(['build']);
  });

  it('ignores a stage that does not exist rather than inventing one', async () => {
    await saveAssessmentPolicies('t1', [{ stage: 'not_a_stage', skillSlots: 12 }]);
    expect(saved()).toEqual([]);
  });

  it('clamps on the way in, not only on the way out', async () => {
    await saveAssessmentPolicies('t1', [{ stage: 'build', skillSlots: 999, maxSkills: 8, difficultyMix: { EASY: 35, MEDIUM: 50, HARD: 15 } }]);
    expect(saved()[0].skillSlots).toBe(POLICY_BOUNDS.skillSlots.max);
  });
});

describe('the admin listing', () => {
  it('shows every stage with its defaults alongside the live values', async () => {
    findOne.mockResolvedValue({ assessmentPolicyOverrides: [{ stage: 'build', skillSlots: 12 }] });
    const rows = await listEditablePolicies('t1');

    expect(rows).toHaveLength(4);
    const build = rows.find(r => r.stage === 'build')!;
    expect(build.skillSlots).toBe(12);
    expect(build.defaults.skillSlots).toBe(20);
    expect(build.overridden).toBe(true);

    const foundation = rows.find(r => r.stage === 'foundation')!;
    expect(foundation.overridden).toBe(false);
  });
});

import {
  itemsForConfidence, effectiveShape, POLICY_BOUNDS, applyOverride,
} from '../services/assessmentPolicyService';
import { ASSESSMENT_POLICIES } from '../data/assessmentPolicies';
import { CAREER_STAGES } from '../services/careerStageService';

/**
 * The arithmetic behind the Assessment Shape screen.
 *
 * Three numbers decide what a paper measures — how many questions, how many skills, and how many
 * questions each skill is asked — and they interact in a way that is invisible on a form. Slots
 * divided by questions-per-skill caps the skills, so asking for twelve skills on twenty-four
 * questions silently returns six. And a skill asked fewer times than its difficulty mix requires
 * contributes nothing to readiness however long the paper is.
 *
 * Both were live defects rather than hypotheticals: every shipped policy except foundation asked
 * two questions per skill against a mix needing three or four, so those papers measured nothing
 * at all, and no screen said so. These assert the honesty of what an admin is shown.
 */

describe('how many questions a skill needs before it counts', () => {
  it('needs more questions when the paper is weighted easy', () => {
    // An easy item is worth 0.85 and MEDIUM confidence needs 3.0, so a heavily easy paper cannot
    // get there in three. This is the arithmetic that kept readiness on "still measuring".
    expect(itemsForConfidence({ EASY: 60, MEDIUM: 35, HARD: 5 })).toBe(4);
  });

  it('needs fewer when the paper is weighted at medium and above', () => {
    expect(itemsForConfidence({ EASY: 25, MEDIUM: 50, HARD: 25 })).toBe(3);
    expect(itemsForConfidence({ EASY: 15, MEDIUM: 50, HARD: 35 })).toBe(3);
  });

  it('does not care how the percentages are scaled', () => {
    // An admin typing "roughly this" must not change the answer.
    expect(itemsForConfidence({ EASY: 6, MEDIUM: 3.5, HARD: 0.5 }))
      .toBe(itemsForConfidence({ EASY: 60, MEDIUM: 35, HARD: 5 }));
  });
});

describe('what a set of numbers actually produces', () => {
  const mix = { EASY: 60, MEDIUM: 35, HARD: 5 };

  it('caps the skills at what the questions can fund', () => {
    // The trap: twelve skills asked for, twenty-four questions available, four questions each.
    const e = effectiveShape({ skillSlots: 24, maxSkills: 12, minItemsPerSkill: 4, difficultyMix: mix });
    expect(e.skills).toBe(6);
    expect(e.slotsUsed).toBe(24);
  });

  it('reports when a paper is too shallow to measure anything', () => {
    // Twelve skills DO fit at two questions each — and none of them would count.
    const e = effectiveShape({ skillSlots: 24, maxSkills: 12, minItemsPerSkill: 2, difficultyMix: mix });
    expect(e.skills).toBe(12);
    expect(e.measuresReliably).toBe(false);
    expect(e.itemsForConfidence).toBe(4);
  });

  it('is satisfied when depth meets the mix', () => {
    const e = effectiveShape({ skillSlots: 24, maxSkills: 6, minItemsPerSkill: 4, difficultyMix: mix });
    expect(e).toMatchObject({ skills: 6, slotsUsed: 24, measuresReliably: true });
  });
});

describe('every shipped policy can actually measure what it covers', () => {
  /**
   * The regression that motivated all of this.
   *
   * `build`, `placement` and `job_seeker` each asked two questions per skill against mixes
   * needing three or four. Every skill on those papers landed at LOW confidence, so readiness
   * had nothing to report — and the papers looked perfectly reasonable on screen.
   */
  it.each(ASSESSMENT_POLICIES.map(p => [p.stage, p] as const))(
    '%s asks enough of each skill for the evidence to count',
    (_stage, policy) => {
      expect(policy.minItemsPerSkill).toBeGreaterThanOrEqual(itemsForConfidence(policy.difficultyMix));
    },
  );

  it.each(ASSESSMENT_POLICIES.map(p => [p.stage, p] as const))(
    '%s has enough questions to fund the skills it claims to cover',
    (_stage, policy) => {
      expect(policy.skillSlots).toBeGreaterThanOrEqual(policy.maxSkills * policy.minItemsPerSkill);
    },
  );

  it('covers every stage a student can be derived into', () => {
    // A stage with no policy produces no paper at all, and the way that happens is somebody
    // adding a stage without thinking about assessment.
    expect(ASSESSMENT_POLICIES.map(p => p.stage).sort()).toEqual(CAREER_STAGES.map(s => s.key).sort());
  });
});

describe('an admin override of questions-per-skill', () => {
  const base = ASSESSMENT_POLICIES.find(p => p.stage === 'foundation')!;

  it('is honoured rather than derived away', () => {
    /**
     * It used to be computed as slots-divided-by-skills and capped at the shipped value, which
     * turned a request for more BREADTH into a silent loss of DEPTH — twelve skills at two
     * questions each, measuring none of them, with the screen reporting twelve skills covered.
     */
    const p = applyOverride(base, { minItemsPerSkill: 2 });
    expect(p.minItemsPerSkill).toBe(2);
  });

  it('clamps rather than refusing an unusable number', () => {
    expect(applyOverride(base, { minItemsPerSkill: 99 }).minItemsPerSkill)
      .toBe(POLICY_BOUNDS.itemsPerSkill.max);
    expect(applyOverride(base, { minItemsPerSkill: 0 }).minItemsPerSkill)
      .toBe(POLICY_BOUNDS.itemsPerSkill.min);
  });

  it('leaves depth alone when only the skill count was changed', () => {
    // The old derivation quietly dropped items-per-skill whenever maxSkills rose. Raising
    // breadth must now cost skills the paper cannot fund, never the depth of the ones it can.
    const p = applyOverride(base, { maxSkills: 12 });
    expect(p.minItemsPerSkill).toBe(base.minItemsPerSkill);
  });
});

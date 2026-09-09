import PassportConfig from '../models/PassportConfig';
import { AssessmentPolicy, ASSESSMENT_POLICIES, policyForStage } from '../data/assessmentPolicies';
import {
  DIFFICULTY_WEIGHT, RELATIONSHIP_WEIGHT, SOURCE_WEIGHT, CONFIDENCE_THRESHOLDS,
} from '../data/skillDnaPolicy';

/**
 * The shape of a paper, as this tenant wants it.
 *
 * The shipped policies remain the defaults and the source of the rules that are NOT
 * negotiable — prerequisite depth, which skill difficulties a stage may admit, whether
 * difficulty may fall back. What an admin gets to decide is the size and feel of the paper:
 * how many questions, across how many skills, in what difficulty mix, and whether it is
 * timed.
 *
 * PER STAGE, NEVER PER STUDENT. Two members at the same stage must sit papers of the same
 * shape or their scores stop being comparable, and comparability is the only reason a Skill
 * DNA number means anything next to somebody else's.
 *
 * Every bound below exists because the generator has to be able to satisfy the request. A
 * paper of 200 questions across 3 skills cannot be filled from any realistic bank, and an
 * admin discovering that through a generation failure — after a student has clicked start —
 * is a worse way to learn it than a clamp.
 */

export const POLICY_BOUNDS = {
  skillSlots: { min: 6, max: 60 },
  maxSkills: { min: 3, max: 20 },
  /**
   * Items asked of each skill covered.
   *
   * Editable, and it was the conspicuous omission. It is the number that decides whether a
   * skill is measured at all — below the confidence floor a skill contributes nothing to
   * readiness however many questions the paper contains — and it was being derived silently
   * from the other two. An admin raising maxSkills to twelve on twenty-four slots got twelve
   * skills at two items apiece and no measurement at all, with nothing on the screen saying so.
   */
  itemsPerSkill: { min: 1, max: 10 },
  timeLimitMinutes: { min: 0, max: 180 },
} as const;

/**
 * How many items of a given difficulty mix it takes to measure one skill.
 *
 * Evidence is weighted by relationship, difficulty and source, and MEDIUM confidence needs
 * three points of it. An easy-weighted paper therefore needs more questions per skill than a
 * hard-weighted one to say the same thing with the same certainty — four against three — which
 * is not obvious from any screen and is exactly the sort of arithmetic an admin should not have
 * to do. Derived from the Skill DNA constants rather than restated, so the two cannot drift.
 */
export function itemsForConfidence(mix: { EASY: number; MEDIUM: number; HARD: number }): number {
  const total = (mix.EASY + mix.MEDIUM + mix.HARD) || 1;
  const perItem = RELATIONSHIP_WEIGHT.PRIMARY * SOURCE_WEIGHT.PERSONALIZED_ASSESSMENT * (
    (mix.EASY / total) * DIFFICULTY_WEIGHT.EASY
    + (mix.MEDIUM / total) * DIFFICULTY_WEIGHT.MEDIUM
    + (mix.HARD / total) * DIFFICULTY_WEIGHT.HARD
  );
  return Math.max(1, Math.ceil(CONFIDENCE_THRESHOLDS.MEDIUM / (perItem || 1)));
}

/**
 * What a set of numbers will actually produce, as opposed to what was typed.
 *
 * The three fields interact, and the interaction is not visible: slots divided by items caps
 * the skills, so asking for more skills than the slots can fund silently returns fewer. Rather
 * than forbid the combination — an admin part-way through editing is briefly inconsistent by
 * definition — the screen is told the truth and can say it plainly.
 */
export function effectiveShape(p: {
  skillSlots: number; maxSkills: number; minItemsPerSkill: number;
  difficultyMix: { EASY: number; MEDIUM: number; HARD: number };
}): { skills: number; itemsPerSkill: number; slotsUsed: number; itemsForConfidence: number; measuresReliably: boolean } {
  const itemsPerSkill = Math.max(1, p.minItemsPerSkill);
  const affordable = Math.max(1, Math.floor(p.skillSlots / itemsPerSkill));
  const skills = Math.min(p.maxSkills, affordable);
  const need = itemsForConfidence(p.difficultyMix);
  return {
    skills,
    itemsPerSkill,
    slotsUsed: skills * itemsPerSkill,
    itemsForConfidence: need,
    measuresReliably: itemsPerSkill >= need,
  };
}

export interface EditablePolicy {
  stage: string;
  label: string;
  /** Shipped values, for the UI to show what "default" means. */
  defaults: { skillSlots: number; maxSkills: number; difficultyMix: { EASY: number; MEDIUM: number; HARD: number } };
  /** What is in force now — defaults with any override applied. */
  skillSlots: number;
  maxSkills: number;
  difficultyMix: { EASY: number; MEDIUM: number; HARD: number };
  timeLimitMinutes: number;
  /** True when this stage has been changed from the shipped policy. */
  overridden: boolean;
  /** Not editable — shown so an admin can see what the stage does allow. */
  allowedSkillDifficulty: string[];
  /** Editable: how many questions each covered skill is asked. */
  minItemsPerSkill: number;
  maxItemsPerSkill: number;
  /** What these numbers really produce, so the screen never has to infer it. */
  effective: {
    skills: number; itemsPerSkill: number; slotsUsed: number;
    itemsForConfidence: number; measuresReliably: boolean;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)));

/** Percentages as the UI shows them (0-100) from the internal 0-1 fractions. */
const mixToPercent = (m: { EASY: number; MEDIUM: number; HARD: number }) => ({
  EASY: Math.round(m.EASY * 100), MEDIUM: Math.round(m.MEDIUM * 100), HARD: Math.round(m.HARD * 100),
});

/**
 * Normalise a submitted mix to fractions summing to exactly 1.
 *
 * An admin typing 30/50/30 means "roughly this"; refusing the save over 10 percentage
 * points would be pedantry. Scaling preserves their intent, and difficultyQuota's
 * largest-remainder allocation then divides the slots without losing one.
 */
function normaliseMix(mix?: { EASY?: number; MEDIUM?: number; HARD?: number } | null) {
  if (!mix) return null;
  const e = Math.max(0, Number(mix.EASY) || 0);
  const m = Math.max(0, Number(mix.MEDIUM) || 0);
  const h = Math.max(0, Number(mix.HARD) || 0);
  const total = e + m + h;
  if (total <= 0) return null;
  return { EASY: e / total, MEDIUM: m / total, HARD: h / total };
}

/** The policy in force for one stage, defaults merged with this tenant's override. */
export async function resolveAssessmentPolicy(tenantId: string, stage?: string | null): Promise<AssessmentPolicy> {
  const base = policyForStage(stage);
  try {
    const cfg: any = await PassportConfig.findOne({ tenantId }).select('assessmentPolicyOverrides').lean();
    const ov = (cfg?.assessmentPolicyOverrides || []).find((o: any) => o.stage === base.stage);
    if (!ov) return base;
    return applyOverride(base, ov);
  } catch {
    // A config read failure must not stop a student sitting a paper — the shipped policy
    // is a correct answer, just not this tenant's preferred one.
    return base;
  }
}

/** Merge one override onto a shipped policy, clamped. Exported for the admin preview. */
export function applyOverride(base: AssessmentPolicy, ov: any): AssessmentPolicy {
  const mix = normaliseMix(ov?.difficultyMix);
  const skillSlots = ov?.skillSlots != null
    ? clamp(ov.skillSlots, POLICY_BOUNDS.skillSlots.min, POLICY_BOUNDS.skillSlots.max)
    : base.skillSlots;
  const maxSkills = ov?.maxSkills != null
    ? clamp(ov.maxSkills, POLICY_BOUNDS.maxSkills.min, POLICY_BOUNDS.maxSkills.max)
    : base.maxSkills;

  return {
    ...base,
    skillSlots,
    maxSkills,
    difficultyMix: mix || base.difficultyMix,
    /**
     * ITEMS PER SKILL IS THE ADMIN'S CHOICE, NOT A REMAINDER.
     *
     * This used to be derived as slots-divided-by-skills and capped at the shipped value, which
     * quietly turned a request for more BREADTH into a loss of DEPTH: raising maxSkills to
     * twelve on twenty-four slots produced twelve skills at two items each, below the
     * confidence floor, so the paper covered twice as much and measured none of it. Nothing
     * said so — the screen showed twelve skills and the readiness page showed nothing.
     *
     * Now an explicit setting is honoured, and where the three numbers cannot all hold, it is
     * the SKILL COUNT that gives way rather than the depth: buildSlots drops skills it cannot
     * fund, and effectiveShape tells the screen exactly how many will survive. Fewer skills
     * measured properly beats more measured uselessly, and either way the admin sees it.
     */
    minItemsPerSkill: ov?.minItemsPerSkill != null
      ? clamp(ov.minItemsPerSkill, POLICY_BOUNDS.itemsPerSkill.min, POLICY_BOUNDS.itemsPerSkill.max)
      : base.minItemsPerSkill,
    maxItemsPerSkill: ov?.minItemsPerSkill != null
      ? clamp(ov.minItemsPerSkill, POLICY_BOUNDS.itemsPerSkill.min, POLICY_BOUNDS.itemsPerSkill.max)
      : base.maxItemsPerSkill,
    timeLimitMinutes: ov?.timeLimitMinutes != null
      ? clamp(ov.timeLimitMinutes, POLICY_BOUNDS.timeLimitMinutes.min, POLICY_BOUNDS.timeLimitMinutes.max)
      : 0,
  } as AssessmentPolicy;
}

/** Every stage, defaults and current values, for the admin screen. */
export async function listEditablePolicies(tenantId: string): Promise<EditablePolicy[]> {
  const cfg: any = await PassportConfig.findOne({ tenantId }).select('assessmentPolicyOverrides').lean();
  const overrides: any[] = cfg?.assessmentPolicyOverrides || [];

  return ASSESSMENT_POLICIES.map(base => {
    const ov = overrides.find(o => o.stage === base.stage);
    const live = ov ? applyOverride(base, ov) : base;
    return {
      stage: base.stage,
      label: base.label,
      defaults: { skillSlots: base.skillSlots, maxSkills: base.maxSkills, difficultyMix: mixToPercent(base.difficultyMix) },
      skillSlots: live.skillSlots,
      maxSkills: live.maxSkills,
      difficultyMix: mixToPercent(live.difficultyMix),
      timeLimitMinutes: (live as any).timeLimitMinutes || 0,
      overridden: !!ov,
      allowedSkillDifficulty: base.allowedSkillDifficulty,
      minItemsPerSkill: live.minItemsPerSkill,
      maxItemsPerSkill: live.maxItemsPerSkill,
      effective: effectiveShape({
        skillSlots: live.skillSlots,
        maxSkills: live.maxSkills,
        minItemsPerSkill: live.minItemsPerSkill,
        difficultyMix: live.difficultyMix,
      }),
    };
  });
}

/**
 * Save overrides. A stage submitted with everything at its default is REMOVED rather than
 * stored, so "overridden" keeps meaning "deliberately different" instead of "was opened
 * once in the admin screen".
 */
export async function saveAssessmentPolicies(
  tenantId: string,
  rows: any[],
): Promise<EditablePolicy[]> {
  const keep: any[] = [];

  for (const row of rows || []) {
    const base = ASSESSMENT_POLICIES.find(p => p.stage === row?.stage);
    if (!base) continue;                       // unknown stage — ignored, not invented

    const mixPct = row.difficultyMix || {};
    const basePct = mixToPercent(base.difficultyMix);
    const sameMix = Math.round(Number(mixPct.EASY)) === basePct.EASY
      && Math.round(Number(mixPct.MEDIUM)) === basePct.MEDIUM
      && Math.round(Number(mixPct.HARD)) === basePct.HARD;

    const slots = row.skillSlots != null ? clamp(row.skillSlots, POLICY_BOUNDS.skillSlots.min, POLICY_BOUNDS.skillSlots.max) : base.skillSlots;
    const skills = row.maxSkills != null ? clamp(row.maxSkills, POLICY_BOUNDS.maxSkills.min, POLICY_BOUNDS.maxSkills.max) : base.maxSkills;
    const items = row.minItemsPerSkill != null
      ? clamp(row.minItemsPerSkill, POLICY_BOUNDS.itemsPerSkill.min, POLICY_BOUNDS.itemsPerSkill.max)
      : base.minItemsPerSkill;
    const time = row.timeLimitMinutes != null ? clamp(row.timeLimitMinutes, POLICY_BOUNDS.timeLimitMinutes.min, POLICY_BOUNDS.timeLimitMinutes.max) : 0;

    // Unchanged from the shipped policy in every respect: store nothing, so a later change to
    // the default reaches this tenant instead of being masked by a copy of the old value.
    if (slots === base.skillSlots && skills === base.maxSkills
      && items === base.minItemsPerSkill && sameMix && time === 0) continue;

    keep.push({
      stage: base.stage,
      skillSlots: slots,
      maxSkills: skills,
      minItemsPerSkill: items,
      ...(sameMix ? {} : { difficultyMix: { EASY: Number(mixPct.EASY) || 0, MEDIUM: Number(mixPct.MEDIUM) || 0, HARD: Number(mixPct.HARD) || 0 } }),
      ...(time > 0 ? { timeLimitMinutes: time } : {}),
    });
  }

  await PassportConfig.updateOne(
    { tenantId },
    { $set: { assessmentPolicyOverrides: keep } },
    { upsert: true },
  );
  return listEditablePolicies(tenantId);
}

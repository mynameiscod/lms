/**
 * REASSESSMENT_V1 — when to re-measure a student, what to re-measure, and whether the plan
 * they are following should change as a result.
 *
 * THE LOOP THIS CLOSES. A student is measured once, given a plan, and works it. Nothing has
 * ever asked whether the plan is still the right one. This decides when to look again — and,
 * crucially, stops short of acting on what it finds.
 *
 * IT NEVER TOUCHES A SCORE. Module 7 owns Skill DNA and Module 8 owns readiness. Everything
 * here reads those verdicts and decides only about TIMING and RECOMMENDATION. A file that
 * could nudge a score would make every improvement suspect.
 *
 * IT NEVER REPLANS BY ITSELF. This is the whole product rule: new evidence may change what we
 * know, and must not silently change what somebody was asked to do this morning. The
 * recommendation is offered; the student decides.
 *
 * NO AI. Eligibility, cooldown, targeting and materiality are arithmetic over stored data.
 */

export const REASSESSMENT_VERSION = 'REASSESSMENT_V1';

/**
 * What a sitting was for. Historical attempts predate this and are read as INITIAL.
 *
 * SKILL_CHECK is the short, single-skill paper a daily plan item opens ("Database
 * Fundamentals — Check, 15 min"). It is deliberately NOT a REASSESSMENT: a check-in has a
 * cooldown, freezes before/after snapshots and re-measures a ranked set of skills, none of
 * which should happen because somebody worked through today's plan. Kept apart so the
 * cooldown, the history and the analytics can each ask for the kind they mean.
 */
export const ASSESSMENT_PURPOSES = ['INITIAL', 'REASSESSMENT', 'SKILL_CHECK'] as const;
export type AssessmentPurpose = typeof ASSESSMENT_PURPOSES[number];

/**
 * Why a student may re-measure now. Deterministic, and every one is checkable from stored
 * data — no "we think you're ready".
 */
export type ReassessmentTrigger =
  | 'TIME_ELAPSED'
  | 'ROADMAP_PROGRESS'
  | 'LOW_CONFIDENCE'
  | 'NOT_ASSESSED'
  | 'STUDENT_REQUEST'
  | 'ADMIN_OVERRIDE';

/** Why they may not. Each names one thing, and only one is a real refusal to fix. */
export type ReassessmentBlocker =
  | 'INITIAL_ASSESSMENT_REQUIRED'
  | 'COOLDOWN_ACTIVE'
  | 'MEMBERSHIP_REQUIRED'
  | 'REASSESSMENT_DISABLED'
  | 'ASSESSMENT_IN_PROGRESS'
  | 'ROLE_NOT_SELECTED'
  | 'NO_TARGET_SKILLS';

/**
 * Defaults, applied when a tenant has configured nothing.
 *
 * Fourteen days is a judgement, not a finding: long enough that a student has actually done
 * some of the plan, short enough that a month of work is not measured by a two-month-old
 * picture. It is configurable precisely because it is a judgement.
 */
export const REASSESSMENT_DEFAULTS = {
  enabled: true,
  cooldownDays: 14,
  /** A check-in is shorter than the first sitting — validation, not re-examination. */
  questionBudget: 18,
  studentRequestEnabled: true,
  /** Score movement that counts as material on its own. See materialChanges(). */
  materialChangeThreshold: 10,
};

export type ReassessmentConfig = typeof REASSESSMENT_DEFAULTS;

/** Merge a tenant's stored settings over the defaults, ignoring anything absent. */
export function resolveReassessmentConfig(stored: any): ReassessmentConfig {
  const cfg = stored || {};
  const num = (v: any, fallback: number) =>
    (Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : fallback);

  return {
    enabled: cfg.enabled !== false,
    cooldownDays: num(cfg.cooldownDays, REASSESSMENT_DEFAULTS.cooldownDays),
    questionBudget: num(cfg.questionBudget, REASSESSMENT_DEFAULTS.questionBudget),
    studentRequestEnabled: cfg.studentRequestEnabled !== false,
    materialChangeThreshold: num(cfg.materialChangeThreshold, REASSESSMENT_DEFAULTS.materialChangeThreshold),
  };
}

// ── targeting ───────────────────────────────────────────────────────────────

/**
 * How much a skill deserves re-measuring.
 *
 * A CHECK-IN IS NOT THE ORIGINAL PAPER AGAIN. Re-testing a well-evidenced strength wastes
 * the student's time and tells us nothing we did not already know. The weights therefore
 * favour what is uncertain or what has just been worked on, and deliberately push settled
 * strengths to the bottom.
 *
 * These are ordering weights only. They never touch a score, a gap or a target — Module 8
 * decided all three, and this reads its verdict.
 */
export const TARGET_WEIGHTS = {
  /** We have never measured it. The largest hole in the picture. */
  NOT_ASSESSED: 100,
  /** We measured a little and are not sure. Cheap to settle, valuable to settle. */
  LIMITED_EVIDENCE: 90,
  /** They have actually been working on it — the whole reason to look again. */
  RECENT_WORK: 80,
  /** A known deficit against the role. */
  PRIORITY_GAP: 60,
  NEEDS_WORK: 40,
  /** Fine, and worth an occasional confirmation. */
  ON_TRACK: 10,
  /** Demonstrated and well evidenced. Re-testing this is the waste to avoid. */
  STRONG: 2,
};

/** Importance multiplier, mirroring how Module 8 already ranks a role's requirements. */
export const IMPORTANCE_MULTIPLIER: Record<string, number> = {
  ESSENTIAL: 1.5,
  IMPORTANT: 1.2,
  SUPPORTING: 1.0,
  OPTIONAL: 0.7,
};

/** Most skills one check-in will cover. Beyond this the paper stops being short. */
export const MAX_TARGET_SKILLS = 6;

/** A skill scoring below this is not worth a slot. Keeps a check-in honest and brief. */
export const MIN_TARGET_WEIGHT = 5;

export interface TargetCandidate {
  skillKey: string;
  skillName: string;
  status: string;
  importance: string;
  weight: number;
  /** True when the student has completed roadmap work against this skill. */
  recentWork: boolean;
}

/**
 * Rank what to look at, highest first.
 *
 * Deterministic and stable: the same student on the same data gets the same paper focus, so
 * two people comparing notes see a system with reasons rather than one with moods.
 */
export function rankTargets(candidates: TargetCandidate[]): { skillKey: string; skillName: string; score: number }[] {
  return candidates
    .map(c => {
      const base = (TARGET_WEIGHTS as any)[c.status] ?? TARGET_WEIGHTS.ON_TRACK;
      // Recent work REPLACES a low base rather than adding to it: having just studied
      // something is the strongest reason to check it, whatever it looked like before.
      const effective = c.recentWork ? Math.max(base, TARGET_WEIGHTS.RECENT_WORK) : base;
      const importance = IMPORTANCE_MULTIPLIER[c.importance] ?? 1;
      return {
        skillKey: c.skillKey,
        skillName: c.skillName,
        score: Math.round(effective * importance * (1 + (c.weight || 0) / 100) * 100) / 100,
      };
    })
    .filter(t => t.score >= MIN_TARGET_WEIGHT)
    .sort((a, b) => b.score - a.score || a.skillKey.localeCompare(b.skillKey))
    .slice(0, MAX_TARGET_SKILLS);
}

// ── change detection ────────────────────────────────────────────────────────

/** One skill's movement between two snapshots. */
export interface SkillDelta {
  skillKey: string;
  skillName: string;
  before: number | null;
  after: number | null;
  delta: number | null;
  beforeStatus: string | null;
  afterStatus: string | null;
  /** Why this one counts as material, if it does. */
  materialReasons: MaterialReason[];
}

export type MaterialReason =
  | 'SCORE_MOVED'
  | 'STATUS_CHANGED'
  | 'TARGET_REACHED'
  | 'NEWLY_MEASURED'
  | 'EVIDENCE_STRENGTHENED'
  | 'REGRESSED';

/**
 * Whether a change means anything.
 *
 * SEMANTICS FIRST, NUMBERS SECOND. A skill crossing its target, or becoming measured at all,
 * changes what the plan should do — even if the raw movement is small. A skill drifting by
 * two points changes nothing, however confidently it was measured. Recommending a replan for
 * noise would train students to ignore the recommendation, which costs more than never
 * making it.
 */
export function materialChanges(
  d: { before: number | null; after: number | null; beforeStatus: string | null; afterStatus: string | null; targetScore?: number },
  threshold: number,
): MaterialReason[] {
  const reasons: MaterialReason[] = [];

  // Something we had never measured now has evidence. Always material — it may be the
  // reason a whole branch of the plan existed.
  if (d.before === null && d.after !== null) reasons.push('NEWLY_MEASURED');

  if (d.before !== null && d.after !== null) {
    const delta = d.after - d.before;
    if (Math.abs(delta) >= threshold) reasons.push('SCORE_MOVED');
    if (delta <= -threshold) reasons.push('REGRESSED');

    if (d.targetScore !== undefined) {
      const wasBelow = d.before < d.targetScore;
      const nowMet = d.after >= d.targetScore;
      if (wasBelow && nowMet) reasons.push('TARGET_REACHED');
    }
  }

  // A classification change is Module 8 saying the plan's premise moved — a priority gap
  // becoming on track is exactly the case a roadmap should stop spending time on.
  if (d.beforeStatus && d.afterStatus && d.beforeStatus !== d.afterStatus) {
    reasons.push('STATUS_CHANGED');
    if (d.beforeStatus === 'LIMITED_EVIDENCE' || d.beforeStatus === 'NOT_ASSESSED') {
      reasons.push('EVIDENCE_STRENGTHENED');
    }
  }

  return [...new Set(reasons)];
}

// ── replan recommendation ───────────────────────────────────────────────────

export type ReplanRecommendation = 'NONE' | 'SUGGESTED' | 'REQUIRED';

/**
 * How strongly the plan should change.
 *
 * REQUIRED is reserved for structural mismatch — a different target role, a republished
 * blueprint — where the existing plan is aimed at something the student is no longer doing.
 * Skill movement, however large, is only ever SUGGESTED: the plan is still valid work, just
 * no longer the best use of the remaining days, and that is the student's call to make.
 */
export function recommendationFrom(input: {
  structuralReasons: string[];
  materialSkills: number;
  readinessDelta: number | null;
  threshold: number;
}): ReplanRecommendation {
  if (input.structuralReasons.length) return 'REQUIRED';
  if (input.materialSkills > 0) return 'SUGGESTED';
  if (input.readinessDelta !== null && Math.abs(input.readinessDelta) >= input.threshold) return 'SUGGESTED';
  return 'NONE';
}

/** Days between two dates, in whole days, matching how the rest of the product counts. */
export const daysBetween = (from: Date, to: Date): number =>
  Math.floor((Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
    - Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())) / 86400000);

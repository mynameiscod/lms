import { COVERAGE_THRESHOLDS } from './roleReadinessPolicy';

/**
 * ROADMAP_V1 — how a student's gaps, prerequisites and available time become a 90-day plan.
 *
 * Every number the planner uses lives here. Scattering them is how a screen ends up
 * promising 300 minutes a week while the generator budgeted 250, and nobody can say which
 * one is the product's actual position.
 *
 * THESE ARE PRODUCT DECISIONS, NOT EDUCATIONAL SCIENCE. "A priority gap deserves roughly
 * three times a nudge" is a stance we took; the version marker exists so it can change
 * later without pretending older plans were built the new way.
 *
 * NO AI, NO CLOCK, NO RANDOMNESS. Which skill has the largest gap, which prerequisite comes
 * first and how much capacity exists are all arithmetic. A model would make the same plan
 * irreproducible and impossible to defend to the student it was built for.
 *
 * NOTHING HERE DERIVES A SKILL SCORE. Module 7 measures, Module 8 compares, and this module
 * only decides where the time goes. A policy that could move a score would let a roadmap
 * flatter the student it was built from.
 */

export const ROADMAP_VERSION = 'ROADMAP_V1';

/**
 * The program window. CareerPilot is renewable, so a plan is 90 days and then it is
 * finished — a longer horizon would be a promise the product does not make and cannot keep
 * personalised, because the evidence it was built from is months old by the end.
 */
export const MAX_ROADMAP_DAYS = 90;

/**
 * How much of the theoretical capacity is planned against.
 *
 * The remainder is not slack for its own sake — it is the missed evening, the week that
 * ran long, the revision nobody schedules. A plan filled to 100% is one bad week away from
 * being permanently behind, and a student who is permanently behind stops opening it.
 */
export const PLANNING_UTILIZATION = 0.85;

/** Below this a planned block is not worth surfacing — "Study Java, 7 minutes" is noise. */
export const MIN_BLOCK_MINUTES = 30;

/** Planned minutes are rounded to this, so the plan reads in real study sessions. */
export const BLOCK_GRANULARITY = 15;

/**
 * A diagnostic costs the same whatever it measures — it is a fixed, small price paid to
 * avoid teaching somebody something they already know.
 */
export const ASSESS_BLOCK_MINUTES = 45;

/** Maintenance for a skill that is already where it needs to be. Deliberately small. */
export const REVIEW_BLOCK_MINUTES = 30;

/**
 * No single skill may take more than this share of the plan.
 *
 * One enormous gap would otherwise consume the whole 90 days and the student would finish
 * the program having moved one number. Prerequisites are exempt from the cap in effect,
 * because they are separate skills with their own allocations.
 */
export const MAX_SKILL_SHARE = 0.30;

/**
 * How many distinct skills may be live in one week.
 *
 * Focus is the product's position: eighteen skills in a week is a syllabus, not a plan, and
 * nothing gets finished. Scaled by capacity — a student with two hours a day can genuinely
 * carry more at once than one with thirty minutes.
 */
export const ACTIVE_SKILLS_PER_WEEK = { min: 2, max: 4 };

/** Weekly minutes above which a student can carry the upper end of that range. */
export const WIDE_WEEK_MINUTES = 420;

/**
 * How far the planner walks back up the prerequisite chain, and how many skills it may add
 * that way. Both bounded: one gap must not expand into twenty generations of ancestors,
 * because the 90 days would be spent on foundations for something never reached.
 */
export const PREREQUISITE_DEPTH = 2;
export const PREREQUISITE_BUDGET = 5;

/**
 * Reserved shares of the plan, taken before gap capacity is shared out.
 *
 * DIAGNOSTIC is larger when coverage is low, which is the whole of §77: a student we have
 * barely measured gets a plan that finds out, not a plan that guesses. It is a ceiling, not
 * a quota — a well-measured student simply has few unknowns to spend it on.
 */
export const DIAGNOSTIC_SHARE = { lowCoverage: 0.50, normal: 0.35 };
export const VALIDATION_SHARE = 0.12;
export const MAINTENANCE_SHARE = 0.08;

/** Coverage at or below which a plan is mostly about finding out. Module 8's own boundary. */
export const LOW_COVERAGE_PERCENT = COVERAGE_THRESHOLDS.MEDIUM;

/** What a planned item asks the student to do. Four verbs; more would not be distinguishable. */
export type WorkType = 'LEARN' | 'PRACTICE' | 'ASSESS' | 'REVIEW';

/**
 * Why an item is in the plan. Structured rather than prose so the explanation, the admin
 * view and any later analytics all read the same fact.
 */
export type ReasonCode =
  | 'PRIORITY_GAP'
  | 'NEEDS_WORK'
  | 'PREREQUISITE'
  | 'ASSESSMENT_NEEDED'
  | 'LIMITED_EVIDENCE'
  | 'MAINTENANCE'
  | 'VALIDATION';

export type PhaseKey = 'FOUNDATION' | 'CORE_GAPS' | 'APPLICATION' | 'VALIDATION';

export const PHASES: { key: PhaseKey; title: string; blurb: string }[] = [
  { key: 'FOUNDATION',  title: 'Foundation & validation', blurb: 'Settle what we do not yet know, and the skills everything else rests on.' },
  { key: 'CORE_GAPS',   title: 'Priority skill building', blurb: 'The gaps that matter most for this role.' },
  { key: 'APPLICATION', title: 'Applied practice',        blurb: 'Use what you have built, on real problems.' },
  { key: 'VALIDATION',  title: 'Validation',              blurb: 'Re-measure, so the next plan is built on what changed.' },
];

/**
 * How career stage shifts the ACTIVITY MIX — and nothing else.
 *
 * A first-year needs more instruction before practice makes sense; somebody in placement
 * season needs the reverse. Stage never touches a score, a gap or a target: it decides how
 * a skill's minutes are split between learning it and using it. Module 8 owns what the
 * student can do, and a plan that could revise that would be marking its own homework.
 */
export const STAGE_MIX: Record<string, { learn: number; practice: number }> = {
  foundation: { learn: 0.60, practice: 0.40 },
  build:      { learn: 0.45, practice: 0.55 },
  placement:  { learn: 0.30, practice: 0.70 },
  job_seeker: { learn: 0.30, practice: 0.70 },
};

/** An unknown or absent stage plans an even split rather than guessing at one. */
export const DEFAULT_MIX = { learn: 0.5, practice: 0.5 };

export const mixFor = (stage?: string | null) => STAGE_MIX[String(stage || '')] || DEFAULT_MIX;

/** Why a roadmap could not be built. Distinct states, distinct next actions for the student. */
export type RoadmapUnavailable =
  | 'CAREER_CONTEXT_INCOMPLETE'
  | 'ROLE_NOT_SELECTED'
  | 'ROLE_BLUEPRINT_NOT_READY'
  | 'NO_READINESS_DATA'
  /** No active membership, or one whose authoritative end date has already passed. */
  | 'MEMBERSHIP_REQUIRED';

/** Round a planned duration to something a student would actually sit down and do. */
export function roundBlock(minutes: number): number {
  if (minutes <= 0) return 0;
  return Math.max(BLOCK_GRANULARITY, Math.round(minutes / BLOCK_GRANULARITY) * BLOCK_GRANULARITY);
}

/**
 * Capacity for the whole window.
 *
 * Derived from what the student actually committed to, never from the calendar: 90 days at
 * 30 minutes over 5 days is a different plan from 90 days at 2 hours over 6, and treating
 * them alike is the single most common way a plan becomes fiction.
 */
export function capacityFor(input: {
  minutesPerDay: number;
  daysPerWeek: number;
  roadmapDays: number;
}): {
  weeklyCapacityMinutes: number;
  weeklyPlannableMinutes: number;
  theoreticalMinutes: number;
  plannableMinutes: number;
  weekCount: number;
} {
  const weeklyCapacityMinutes = Math.max(0, input.minutesPerDay) * Math.max(0, input.daysPerWeek);
  const weeklyPlannableMinutes = Math.round(weeklyCapacityMinutes * PLANNING_UTILIZATION);
  const theoreticalMinutes = Math.round((weeklyCapacityMinutes * input.roadmapDays) / 7);
  return {
    weeklyCapacityMinutes,
    weeklyPlannableMinutes,
    theoreticalMinutes,
    plannableMinutes: Math.round(theoreticalMinutes * PLANNING_UTILIZATION),
    weekCount: Math.max(1, Math.ceil(input.roadmapDays / 7)),
  };
}

/**
 * Per-week budgets across the window.
 *
 * A 90-day plan is twelve weeks and six days, not thirteen identical ones. The final short
 * week gets a proportionally smaller budget rather than a full one it has no days for —
 * otherwise the last week of every plan is quietly overbooked.
 */
export function weekBudgets(roadmapDays: number, weeklyPlannableMinutes: number): number[] {
  const n = Math.max(1, Math.ceil(roadmapDays / 7));
  return Array.from({ length: n }, (_, i) => {
    const days = Math.min(7, roadmapDays - i * 7);
    return Math.round((weeklyPlannableMinutes * days) / 7);
  });
}

/** How many skills this student can carry at once, given how much time they have. */
export function activeSkillsPerWeek(weeklyPlannableMinutes: number): number {
  return weeklyPlannableMinutes >= WIDE_WEEK_MINUTES
    ? ACTIVE_SKILLS_PER_WEEK.max
    : ACTIVE_SKILLS_PER_WEEK.min + 1;
}

/**
 * How far a gap is from its target, as a bounded fraction.
 *
 * Used only to scale effort — closing 35→75 is more work than 68→75 — and never to rank,
 * because ranking is Module 8's job and two priority formulas would eventually disagree.
 */
export function gapSeverity(studentScore: number | null, targetScore: number): number {
  if (studentScore === null || targetScore <= 0) return 0;
  return Math.min(1, Math.max(0, (targetScore - studentScore) / targetScore));
}

/**
 * Roughly what closing a gap is worth spending, before capacity is taken into account.
 *
 * DELIBERATELY COARSE. Two bands and a severity multiplier — nobody can say that reaching
 * PROFICIENT in REST APIs takes 7.4 hours, and a number with a decimal point in it would
 * imply we could. What this has to get right is the ORDER of magnitude and the ORDERING: a
 * real deficit is worth several times a near-miss, and 35→75 more than 68→75.
 *
 * Its real job is as a CEILING. Sharing a pool purely in proportion to priority meant that
 * once a large gap hit the per-skill cap, its surplus was re-shared among whatever was left
 * — and a seven-point shortfall on a supporting skill could be handed twenty hours simply
 * because the student had the time spare. Capacity should decide how much of the needed work
 * fits, never inflate work that was never needed.
 */
export const EFFORT_BAND_MINUTES = { PRIORITY_GAP: 480, NEEDS_WORK: 180 };

/** Even a marginal gap is worth opening the topic for; severity scales up from there. */
export const EFFORT_SEVERITY_FLOOR = 0.5;

export function effortEstimate(input: {
  status: string;
  studentScore: number | null;
  targetScore: number;
}): number {
  const base = input.status === 'PRIORITY_GAP'
    ? EFFORT_BAND_MINUTES.PRIORITY_GAP
    : EFFORT_BAND_MINUTES.NEEDS_WORK;
  return roundBlock(base * (EFFORT_SEVERITY_FLOOR + gapSeverity(input.studentScore, input.targetScore)));
}

/** The diagnostic ceiling for a plan, given how much of the role has been measured. */
export const diagnosticShareFor = (coveragePercent: number): number =>
  coveragePercent < LOW_COVERAGE_PERCENT ? DIAGNOSTIC_SHARE.lowCoverage : DIAGNOSTIC_SHARE.normal;

/**
 * How much to trust that this plan is aimed at the right things.
 *
 * Starts from Module 8's confidence in the picture it was built from, then drops a level
 * when the plan itself is mostly diagnostic — a plan whose largest activity is finding out
 * where the student stands is, by its own admission, provisional. Never derived from
 * readiness: a confidently-measured student with a low score deserves a confident plan.
 */
export function planningConfidence(input: {
  roleConfidence: 'LOW' | 'MEDIUM' | 'HIGH';
  diagnosticMinutes: number;
  plannedMinutes: number;
}): 'LOW' | 'MEDIUM' | 'HIGH' {
  const order: ('LOW' | 'MEDIUM' | 'HIGH')[] = ['LOW', 'MEDIUM', 'HIGH'];
  const at = order.indexOf(input.roleConfidence);
  const mostlyDiagnostic = input.plannedMinutes > 0
    && input.diagnosticMinutes / input.plannedMinutes > 0.5;
  return order[Math.max(0, mostlyDiagnostic ? at - 1 : at)];
}

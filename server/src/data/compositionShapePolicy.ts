/**
 * What a ninety-day journey is made OF, as distinct from what order it goes in.
 *
 * ── WHY RANKING ALONE WAS NOT ENOUGH ──────────────────────────────────────────────────────
 *
 * The P7A composer ranked every eligible unit on one global lexicographic key and took the top
 * ninety. It is a good ordering rule and a hopeless selection rule, and the capacity audit showed
 * exactly how: seven of nine profiles "passed" with ninety CONCEPT units. No practice, no
 * debugging, nothing built. Thirty-seven PRACTICE units existed and not one was ever chosen,
 * because NOT_EXPOSED outranks everything and 193 concept units are exhausted before a single
 * GUIDED-or-later unit comes up for consideration.
 *
 * A plan is not a ranked list truncated at ninety. It has a SHAPE, and the shape has to be stated
 * separately from the ranking or the ranking will quietly eat it.
 *
 * ── ROLE IS NOT unitType ──────────────────────────────────────────────────────────────────
 *
 * The obvious shortcut is to bucket by `unitType`, and it is wrong. 246 of 310 units are CONCEPT,
 * and they are not one kind of thing: "Introduction to HTML" and "Why Version Control Exists" are
 * both CONCEPT and belong in different parts of a journey. Bucketing by type would put them in
 * the same bucket and leave a strong learner with either all of them or none.
 *
 * ── NO NEW METADATA WAS NEEDED ────────────────────────────────────────────────────────────
 *
 * The question was asked before any field was added, and the answer was no. `defaultDepth` —
 * FOUNDATION 105, GUIDED 88, STANDARD 117 across the design — already separates elementary
 * instruction from advanced, and `category` already separates universal from direction-specific
 * from exploration. Together with `unitType` they partition all 310 units with nothing left over
 * and nothing guessed. Adding a `compositionRole` field would have meant 310 hand-entered values
 * that could drift from the four fields they were copied from.
 */

import { AssignmentState, stateForScore } from './adaptiveCurriculumPolicy';

/* ------------------------------------------------------------------ *
 * Roles
 * ------------------------------------------------------------------ */

/**
 * The pedagogical job a unit does in a journey.
 *
 * Deliberately more than the four `unitType` values and fewer than a taxonomy nobody can hold in
 * their head. Each one is a thing a reader would notice the absence of in a student's plan.
 */
export type CompositionRole =
  /** Meeting an idea for the first time. The bulk of a beginner's plan and very little of a strong one. */
  | 'FOUNDATION_INSTRUCTION'
  /** Instruction that assumes exposure — the second pass, not the first. */
  | 'GUIDED_INSTRUCTION'
  /** Universal material pitched past the basics. What replaces re-teaching for a strong learner. */
  | 'ADVANCED_UNIVERSAL'
  /** Material specific to a chosen or sampled direction. New learning even for the strong. */
  | 'DIRECTION_LEARNING'
  /** Orientation: what the roles are, what they need. Small, and not nothing. */
  | 'EXPLORATION'
  /** Doing it until it stops needing thought. */
  | 'PRACTICE'
  /** Diagnosing broken work — a different skill from writing it. */
  | 'APPLICATION'
  /** Building something end to end and explaining it afterwards. */
  | 'INTEGRATION'
  /** Measuring, revisiting. The design currently contains none; see BUDGET below. */
  | 'VERIFICATION';

export const COMPOSITION_ROLES: CompositionRole[] = [
  'FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
  'DIRECTION_LEARNING', 'EXPLORATION', 'PRACTICE', 'APPLICATION',
  'INTEGRATION', 'VERIFICATION',
];

/** Just enough of a unit to place it. Kept structural so the policy stays free of the model. */
export interface RoleBearingUnit {
  unitType: string;
  category: string;
  defaultDepth: string;
}

/**
 * Derive the role. Total, deterministic, and reads top to bottom as a decision.
 *
 * PRECEDENCE IS THE WHOLE DESIGN. `unitType` wins first for the three types that describe a MODE
 * OF WORK — practising, debugging, building — because a project about CSS is a project before it
 * is a CSS unit; putting it in the direction bucket would let a plan claim it builds things while
 * containing none. Category and depth then discriminate among what is left, which is exactly the
 * CONCEPT units that `unitType` could not tell apart.
 */
export function compositionRoleOf(unit: RoleBearingUnit): CompositionRole {
  switch (unit.unitType) {
    case 'PROJECT': return 'INTEGRATION';
    case 'DEBUG': return 'APPLICATION';
    case 'PRACTICE': return 'PRACTICE';
    case 'CHECKPOINT':
    case 'REVIEW': return 'VERIFICATION';
    default: break;
  }

  if (unit.category === 'EXPLORATION') return 'EXPLORATION';
  if (unit.category === 'DIRECTION') return 'DIRECTION_LEARNING';
  if (unit.defaultDepth === 'FOUNDATION') return 'FOUNDATION_INSTRUCTION';
  if (unit.defaultDepth === 'GUIDED') return 'GUIDED_INSTRUCTION';
  return 'ADVANCED_UNIVERSAL';
}

/** Roles that TEACH. The scheduling-readiness ladder below turns these into readiness. */
export const INSTRUCTIONAL_ROLES: CompositionRole[] = [
  'FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
  'DIRECTION_LEARNING', 'EXPLORATION',
];

export const isInstructionalRole = (r: CompositionRole): boolean =>
  INSTRUCTIONAL_ROLES.includes(r);

/* ------------------------------------------------------------------ *
 * Learner shape
 * ------------------------------------------------------------------ */

/**
 * How much of the design this student has already proven.
 *
 * Derived from measured skills, never from a profile name — the audit's nine profiles are test
 * fixtures and a real student arrives with a diagnostic, not a label. Three bands rather than a
 * continuous curve because the allocation below is a product decision somebody has to be able to
 * read and disagree with.
 */
export type LearnerShape = 'EMERGING' | 'DEVELOPING' | 'ESTABLISHED';

export interface ShapeInput {
  /** Every skill the curriculum teaches, so "proven" is a fraction of the design not of the test. */
  designSkills: string[];
  skills: Map<string, { score: number | null; confidence: any; understandingOnly?: boolean }>;
}

/**
 * Proven means REVISION or VERIFIED: demonstrated, not merely attempted.
 *
 * Measured against the WHOLE design rather than against what happened to be assessed. A student
 * who verified four skills out of fifty-five is not established, and scoring them against their
 * own four-question diagnostic would say they were.
 */
export function learnerShapeOf(input: ShapeInput): LearnerShape {
  const total = input.designSkills.length || 1;
  let proven = 0;
  for (const key of input.designSkills) {
    const belief = input.skills.get(key);
    if (!belief || belief.score === null || belief.score === undefined) continue;
    const state = stateForScore({ score: belief.score, confidence: belief.confidence, understandingOnly: belief.understandingOnly });
    if (state === 'REVISION' || state === 'VERIFIED') proven++;
  }

  const ratio = proven / total;
  if (ratio >= 0.6) return 'ESTABLISHED';
  if (ratio >= 0.2) return 'DEVELOPING';
  return 'EMERGING';
}

/* ------------------------------------------------------------------ *
 * Allocation
 * ------------------------------------------------------------------ */

/**
 * A range, not a quota.
 *
 * `target` is what a good plan looks like; `min` is what makes the plan defensible at all. The
 * gap between them is the room the rebalancer has to work in when inventory runs out, and stating
 * it explicitly is what stops "we could not fill projects" from silently becoming "there are no
 * projects" — the difference between a plan that bent and a plan that broke.
 *
 * A `min` of 0 means the role is genuinely optional for that learner. A `min` above 0 is a claim
 * that a plan without it is not the product we said we would sell.
 */
export interface RoleAllocation {
  role: CompositionRole;
  min: number;
  target: number;
}

/**
 * THE PRODUCT DECISION, WRITTEN DOWN.
 *
 * Ninety days for everybody — a beginner and a strong learner get the same LENGTH and a different
 * SHAPE. A strong student is not promoted out of Foundation and is not made to sit through the
 * basics again; their elementary instruction shrinks from thirty units to five and the capacity
 * moves to advanced universal material, direction learning they have genuinely not met, debugging,
 * and things they build.
 *
 * The three columns sum to ninety at target. They are not arithmetic — each is a claim about what
 * that learner's three months should contain, and the numbers are where the claim becomes
 * checkable.
 */
/** The length the tables below are written for. Other lengths scale from it. */
const PROGRAM_DAYS_BASELINE = 90;

const BASE: Record<LearnerShape, RoleAllocation[]> = {
  /**
   * Nothing proven. Teach, then practise what was taught, then apply it.
   *
   * CALIBRATED AGAINST THE 337-UNIT CURRICULUM (P8B2). The earlier numbers were written for a
   * design with nine projects, eighteen debugging units and no verification at all, and they
   * described that shortage rather than a decision: a beginner received 74 instruction units
   * because application inventory ran out, not because anybody wanted 74.
   *
   * Raising the doing roles further was swept and REJECTED. Allocations at 30 and 32 doing-units
   * came back worse, starving direction and exploration to nothing. The ceiling is prerequisite
   * depth, not preference: reaching one practice unit means teaching its topic first, and topics
   * are five to eight concept units deep, so instruction arrives whether or not it is asked for.
   */
  EMERGING: [
    { role: 'FOUNDATION_INSTRUCTION', min: 16, target: 24 },
    { role: 'GUIDED_INSTRUCTION', min: 9, target: 17 },
    { role: 'ADVANCED_UNIVERSAL', min: 2, target: 11 },
    { role: 'DIRECTION_LEARNING', min: 0, target: 9 },
    // A floor of one: exploration units rank last and were starved to zero without it.
    { role: 'EXPLORATION', min: 1, target: 2 },
    /**
     * PRACTICE LANDS AT EIGHT OR NINE, NOT FOURTEEN, AND THE FLOOR STAYS AT EIGHT.
     *
     * The target is intent; the outcome is bounded by what prerequisites cost. Raising the floor
     * to force it was measured and made the plan WORSE: at ten, practice rose to ten and
     * integration fell from four to two and verification from two to one, with total practical
     * work dropping from twenty-one units to twenty; at eleven it breached a floor outright.
     *
     * So the shortfall is left visible rather than tuned away — the capacity audit prints "asked
     * 14 got 8" — because the honest reading is that a ninety-day plan carrying this much
     * instruction cannot also carry fourteen practice units, and hiding that by lowering the
     * number would only move the capacity back into instruction.
     */
    { role: 'PRACTICE', min: 8, target: 14 },
    { role: 'APPLICATION', min: 4, target: 7 },
    { role: 'INTEGRATION', min: 2, target: 4 },
    // Two milestones in ninety days: the early checkpoint and the midpoint reassessment.
    { role: 'VERIFICATION', min: 1, target: 2 },
  ],

  /** Some ground held. The most common real student, and the least forgiving to shape. */
  DEVELOPING: [
    { role: 'FOUNDATION_INSTRUCTION', min: 6, target: 15 },
    { role: 'GUIDED_INSTRUCTION', min: 5, target: 12 },
    { role: 'ADVANCED_UNIVERSAL', min: 4, target: 12 },
    { role: 'DIRECTION_LEARNING', min: 4, target: 15 },
    { role: 'EXPLORATION', min: 1, target: 2 },
    { role: 'PRACTICE', min: 8, target: 14 },
    { role: 'APPLICATION', min: 5, target: 9 },
    { role: 'INTEGRATION', min: 3, target: 6 },
    /**
     * The most verification of the three shapes, on purpose.
     *
     * A learner with a mixed diagnostic is the one whose state estimate is least certain and most
     * worth re-measuring — a beginner has little to re-measure yet, and an established learner
     * has already proven most of it.
     */
    { role: 'VERIFICATION', min: 2, target: 5 },
  ],

  /**
   * Most of the design proven. Fewer elementary units, not fewer days.
   *
   * FOUNDATION_INSTRUCTION keeps a target above zero rather than dropping to nothing: a strong
   * learner still meets material they have never encountered, and pretending otherwise is how
   * "strong" turns into "skipped".
   */
  ESTABLISHED: [
    { role: 'FOUNDATION_INSTRUCTION', min: 0, target: 3 },
    { role: 'GUIDED_INSTRUCTION', min: 0, target: 5 },
    { role: 'ADVANCED_UNIVERSAL', min: 5, target: 15 },
    { role: 'DIRECTION_LEARNING', min: 8, target: 21 },
    { role: 'EXPLORATION', min: 1, target: 2 },
    { role: 'PRACTICE', min: 6, target: 12 },
    { role: 'APPLICATION', min: 7, target: 13 },
    { role: 'INTEGRATION', min: 5, target: 11 },
    { role: 'VERIFICATION', min: 3, target: 8 },
  ],
};


export type DirectionStance = 'SELECTED' | 'EXPLORING' | 'UNDECIDED';

/**
 * Shift capacity according to what the student has decided about direction.
 *
 * Someone who has chosen gets more of that direction and less orientation; someone still looking
 * gets the orientation units and keeps the direction capacity broad. Someone who has not engaged
 * with the question gets neither pushed at them, and the capacity goes to universal material that
 * serves them whatever they eventually choose.
 *
 * Expressed as a delta on the target only. `min` is a floor on what the plan must contain and is
 * not something a preference gets to move.
 */
function directionAdjusted(base: RoleAllocation[], stance: DirectionStance): RoleAllocation[] {
  const delta: Partial<Record<CompositionRole, number>> =
    stance === 'SELECTED' ? { DIRECTION_LEARNING: +6, EXPLORATION: -2, ADVANCED_UNIVERSAL: -4 }
      : stance === 'EXPLORING' ? { EXPLORATION: +3, DIRECTION_LEARNING: +2, FOUNDATION_INSTRUCTION: -5 }
        : { DIRECTION_LEARNING: -8, ADVANCED_UNIVERSAL: +5, GUIDED_INSTRUCTION: +3 };

  return base.map(a => ({
    ...a,
    target: Math.max(a.min, a.target + (delta[a.role] || 0)),
  }));
}

/**
 * The allocation for one student, normalised so targets sum to the programme length.
 *
 * Normalisation matters because the direction deltas above are written to read clearly rather
 * than to add up, and a shape whose targets sum to 88 would silently return an 88-day plan.
 */
export function allocationFor(
  shape: LearnerShape,
  stance: DirectionStance,
  programDays: number,
): RoleAllocation[] {
  return allocationFrom(BASE[shape], stance, programDays);
}

/**
 * The same derivation, over any base table.
 *
 * Exported so a PROPOSED shape can be evaluated through exactly the same stance adjustment,
 * scaling and normalisation as the shipped one. A curriculum study that reimplemented those
 * steps would be comparing its own arithmetic against the policy rather than the two shapes
 * against each other — which is what the first expansion simulation accidentally did.
 */
export function allocationFrom(
  table: RoleAllocation[],
  stance: DirectionStance,
  programDays: number,
): RoleAllocation[] {
  const base = directionAdjusted(table, stance);

  /**
   * Floors scale with the programme length, targets and minimums together.
   *
   * The tables are written for ninety days. Left unscaled, a twelve-unit composition inherited a
   * floor of twenty foundation units — floors summing to forty-one across a plan of twelve — and
   * the whole plan went on satisfying the first floor it met. Tests compose short plans
   * constantly, so this was a real defect rather than a theoretical one: a beginner's twelve-unit
   * plan came back with no application at all, for a reason that had nothing to do with policy.
   */
  const scale = programDays / PROGRAM_DAYS_BASELINE;
  const adjusted: RoleAllocation[] = base.map(a => {
    const target = Math.round(a.target * scale);
    return { role: a.role, target, min: Math.min(target, Math.round(a.min * scale)) };
  });

  const sum = adjusted.reduce((n, a) => n + a.target, 0);
  if (sum === programDays) return adjusted;

  /**
   * Absorb the difference on the largest targets first, never below `min`.
   *
   * Largest-first keeps the correction proportionate — taking three units off a target of
   * twenty-five changes the plan's character far less than taking them off a target of three, and
   * the small allocations are the ones carrying the roles a plan is most likely to end up
   * missing entirely.
   */
  const out = adjusted.map(a => ({ ...a }));
  let remaining = programDays - sum;

  while (remaining !== 0) {
    const order = [...out].sort((a, b) =>
      (b.target - a.target) || a.role.localeCompare(b.role));
    const movable = remaining > 0
      ? order
      : order.filter(a => a.target > a.min);
    if (!movable.length) break;

    const step = remaining > 0 ? 1 : -1;
    movable[0].target += step;
    remaining -= step;
  }

  return out;
}

/**
 * Where a role's unfilled capacity goes, in order of preference.
 *
 * NOT A FALLBACK LIST — a pedagogical one. If a plan cannot find projects, the next best thing is
 * debugging and then practice, because all three are applying what was taught; handing that
 * capacity back to foundation instruction would answer "we could not give you anything to build"
 * with "here is more reading", which is the failure this whole layer exists to prevent.
 *
 * Instruction reallocates towards application for the same reason in reverse: a plan short of
 * advanced material is better off practising than padding with basics.
 */
export const REALLOCATION_ORDER: Record<CompositionRole, CompositionRole[]> = {
  INTEGRATION: ['APPLICATION', 'PRACTICE', 'ADVANCED_UNIVERSAL', 'DIRECTION_LEARNING'],
  APPLICATION: ['PRACTICE', 'INTEGRATION', 'ADVANCED_UNIVERSAL', 'DIRECTION_LEARNING'],
  PRACTICE: ['APPLICATION', 'INTEGRATION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL'],
  VERIFICATION: ['PRACTICE', 'APPLICATION', 'INTEGRATION', 'ADVANCED_UNIVERSAL'],
  DIRECTION_LEARNING: ['ADVANCED_UNIVERSAL', 'PRACTICE', 'APPLICATION', 'GUIDED_INSTRUCTION'],
  ADVANCED_UNIVERSAL: ['DIRECTION_LEARNING', 'PRACTICE', 'APPLICATION', 'GUIDED_INSTRUCTION'],
  GUIDED_INSTRUCTION: ['ADVANCED_UNIVERSAL', 'PRACTICE', 'FOUNDATION_INSTRUCTION', 'DIRECTION_LEARNING'],
  FOUNDATION_INSTRUCTION: ['GUIDED_INSTRUCTION', 'PRACTICE', 'ADVANCED_UNIVERSAL', 'DIRECTION_LEARNING'],
  EXPLORATION: ['DIRECTION_LEARNING', 'ADVANCED_UNIVERSAL', 'GUIDED_INSTRUCTION', 'PRACTICE'],
};

/* ------------------------------------------------------------------ *
 * Scheduling readiness — NOT Skill DNA
 * ------------------------------------------------------------------ */

/**
 * WHAT THE PLAN HAS TAUGHT SO FAR. A SCHEDULING FACT, NEVER AN ASSESSMENT RESULT.
 *
 * ── WHY THIS IS ITS OWN TYPE ──────────────────────────────────────────────────────────────
 *
 * PRACTICE serves GUIDED and later; PROJECT serves STANDARD and later. A learner with nothing
 * measured is NOT_EXPOSED everywhere, so both were filtered as unsuitable before any allocation
 * could ask for them — which is why the audit found 37 practice units designed and 0 ever
 * selected. The composer was judging the student on day one and never noticing that the plan it
 * was building would teach them something.
 *
 * So the plan's own teaching has to count for SEQUENCING. What it must never do is masquerade as
 * evidence. A student who has been SCHEDULED a loops lesson has not thereby demonstrated loops,
 * and the entire adaptive system rests on that distinction: `AssignmentState` is a claim about a
 * person, derived from `stateForScore` over real evidence, and it is what the product shows them
 * and what future planning trusts.
 *
 * Returning a bare `AssignmentState` from a projection made the two indistinguishable at every
 * call site — one careless assignment into a skill map and a scheduling guess becomes somebody's
 * record. So this is a distinct type whose adaptive equivalent can only be reached through a
 * named field. Converting is then a deliberate, greppable act rather than an implicit one.
 *
 * ── THE LADDER IS DELIBERATELY SHORT ──────────────────────────────────────────────────────
 *
 *   not yet met  --taught-->  GUIDED  --practised-->  STANDARD  --and no further--
 *
 * It stops at STANDARD, and that is the honest part. REVISION and VERIFIED assert that a student
 * has DEMONSTRATED something, and only measurement can establish that. Projecting into them would
 * let a plan assert mastery it had merely scheduled — the same lie as inherited content making a
 * unit READY, which this codebase has already been bitten by once.
 *
 * A projection also never LOWERS anything: a learner who arrived VERIFIED stays VERIFIED, and the
 * result is then marked as measured rather than projected.
 */
export interface SchedulingReadiness {
  /**
   * The adaptive state this readiness is equivalent to FOR SUITABILITY PURPOSES ONLY.
   *
   * Never write this into a skill profile, an assessment result, or anything a student is shown
   * as their level. It answers "may this unit be scheduled now", not "what can this person do".
   */
  readonly equivalentState: AssignmentState;
  /**
   * True when the level came from the plan's own teaching rather than from evidence.
   *
   * The flag a caller checks before it is tempted to trust the value for anything else.
   */
  readonly projected: boolean;
}

/** What the plan has done for one skill so far. */
export type PlanProgress = 'TAUGHT' | 'PRACTISED';

/** States a plan can never manufacture, because they are claims about demonstrated ability. */
const EVIDENCE_ONLY: AssignmentState[] = ['STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];

/**
 * How ready the plan has made this student for a unit, given what it has already scheduled.
 *
 * `measured` is their real state from Skill DNA and is returned untouched when it already exceeds
 * anything the plan could claim.
 */
export function schedulingReadiness(
  measured: AssignmentState,
  progress: Set<PlanProgress>,
): SchedulingReadiness {
  if (EVIDENCE_ONLY.includes(measured)) {
    return { equivalentState: measured, projected: false };
  }

  if (progress.has('PRACTISED') && progress.has('TAUGHT')) {
    return { equivalentState: 'STANDARD', projected: true };
  }
  if (progress.has('TAUGHT')) {
    return { equivalentState: measured === 'GUIDED' ? 'STANDARD' : 'GUIDED', projected: true };
  }
  return { equivalentState: measured, projected: false };
}

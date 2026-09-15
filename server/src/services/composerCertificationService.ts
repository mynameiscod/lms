/**
 * Certifying a candidate inventory for production composition. Pure — no database.
 *
 * ── WHY THIS IS NOT JUST "DID IT RETURN NINETY" ───────────────────────────────────────────
 *
 * The composer already refuses a short plan. What it cannot tell you is whether a ninety-unit
 * plan is one a student should be given: whether a unit sits ahead of its prerequisite, whether
 * a verified skill is being re-taught, whether all the practical work landed in the last month,
 * or whether a role finished below its floor for a reason nobody can explain. Each of those has
 * happened in this codebase with every count correct. This module re-checks the finished plan
 * against the rules independently, so a certification is evidence rather than the composer
 * agreeing with itself.
 *
 * ── IT RE-DERIVES, IT DOES NOT RE-IMPLEMENT SELECTION ─────────────────────────────────────
 *
 * Nothing here chooses units. Measured state, relevance and suitability are derived from the
 * same policy modules the composer imports, and every plan comes from `composeUnits` itself.
 * The only thing added is the audit of what came back.
 *
 * ── PUBLISH SETS ARE CANDIDATE POOLS, NOT STATUS CHANGES ──────────────────────────────────
 *
 * A proposed publish set is evaluated by composing against those codes as an isolated pool.
 * Nothing here can publish, and nothing needs to: PRODUCTION candidates are exactly the
 * PUBLISHED-and-READY units, so the pool a set would produce is known without writing it.
 */

import {
  composeUnits, ComposableUnit, ComposerResult, StudentProfile, SkillBelief,
} from './curriculumComposerService';
import { AssignmentState, STATE_ORDER, stateForScore } from '../data/adaptiveCurriculumPolicy';
import { isSuitableFor, suitableStatesFor } from '../data/unitSuitabilityPolicy';
import {
  compositionRoleOf, CompositionRole, isInstructionalRole,
} from '../data/compositionShapePolicy';
import { appliesToDirection, isCoreModuleFor } from '../data/careerDirectionPolicy';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import { foundationStageRequirements } from '../seeds/careerPilot/foundationStageSkillSet';

export const PROGRAM_DAYS = FOUNDATION_PROGRAM_DAYS;

/**
 * The skills a Foundation diagnostic actually measures: the stage skill set's switched-on rows.
 *
 * STATE-BOUNDARY LEARNERS ARE DEFINED ON THIS, NOT ON THE INVENTORY. Deriving "every universal
 * skill" from whatever units happen to be READY made the learner a moving target — authoring a
 * hardware topic added hardware to the skills the learner was measured on, and the units written
 * to serve them became unsuitable for them in the same stroke. A real first-year is planned
 * against the stage set, whatever has been authored, so that is what certification measures.
 */
export const diagnosticSkills = (): string[] => [...new Set(
  foundationStageRequirements().requirements.filter(r => r.active).map(r => String(r.skillKey).toUpperCase()),
)].sort();

/** The directions an exploring learner samples in every realistic profile. */
export const EXPLORATION_SET = ['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS'];

const belief = (score: number): SkillBelief => ({ score, confidence: 'HIGH' });

/* ------------------------------------------------------------------ *
 * The nine realistic learners
 * ------------------------------------------------------------------ */

export interface RealisticProfile {
  key: string;
  note: string;
  build: (allSkills: string[], universalSkills: string[]) => StudentProfile;
}

/**
 * The nine realistic profiles, identical to the capacity audit's.
 *
 * Skills are resolved against whatever inventory is passed, so the same learner means the same
 * thing when the curriculum changes. When a SUBSET is being certified, build these against the
 * full READY inventory, not against the subset — otherwise shrinking the pool quietly changes
 * the student as well, and the comparison stops being like for like.
 *
 * The all-verified stress profile is deliberately absent: it is a diagnostic of post-mastery
 * inventory, not a learner the programme is sold to.
 */
export const REALISTIC_PROFILES: RealisticProfile[] = [
  {
    key: 'beginner',
    note: 'nothing measured',
    build: () => ({ skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED' }),
  },
  {
    key: 'mixed',
    note: 'a real diagnostic: some gaps, some adequate, most untouched',
    build: (s) => {
      const scores = [18, 34, 52, 68, 44, 76, 28, 58];
      const measured = s.slice(0, Math.ceil(s.length / 3));
      return {
        skills: new Map(measured.map((k, i) => [k, belief(scores[i % 8])] as [string, SkillBelief])),
        primaryDirection: null,
        directionStatus: 'UNDECIDED',
      };
    },
  },
  {
    key: 'strong-universal',
    note: 'verified across the universal foundation, no direction stance',
    build: (_s, universal) => ({
      skills: new Map(universal.map(k => [k, belief(91)] as [string, SkillBelief])),
      primaryDirection: null,
      directionStatus: 'UNDECIDED',
    }),
  },
  {
    key: 'strong-exploring',
    note: 'the same strong learner, sampling directions',
    build: (_s, universal) => ({
      skills: new Map(universal.map(k => [k, belief(91)] as [string, SkillBelief])),
      primaryDirection: null,
      directionStatus: 'EXPLORING',
      explorationDirections: [...EXPLORATION_SET],
    }),
  },
  {
    key: 'web',
    note: 'chosen web development, weak on its skills',
    build: (s) => ({
      skills: new Map(s.filter(k => /HTML|CSS|JS|WEB|HTTP|BROWSER/.test(k))
        .map(k => [k, belief(32)] as [string, SkillBelief])),
      primaryDirection: 'WEB_DEVELOPMENT',
      directionStatus: 'SELECTED',
    }),
  },
  {
    key: 'software_backend',
    note: 'chosen software/backend, competent at programming',
    build: (s) => ({
      skills: new Map(s.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k))
        .map(k => [k, belief(66)] as [string, SkillBelief])),
      primaryDirection: 'SOFTWARE_BACKEND',
      directionStatus: 'SELECTED',
    }),
  },
  {
    key: 'ai-data',
    note: 'chosen AI/ML, strong maths, new to programming',
    build: (s) => ({
      skills: new Map([
        ...s.filter(k => /MATRIC|PROBABILITY|STATISTIC|SET_THEORY|LOGIC|RELATIONS/.test(k))
          .map(k => [k, belief(88)] as [string, SkillBelief]),
        ...s.filter(k => /PROGRAMMING|PYTHON/.test(k))
          .map(k => [k, belief(24)] as [string, SkillBelief]),
      ]),
      primaryDirection: 'AI_ML',
      directionStatus: 'SELECTED',
    }),
  },
  {
    key: 'cloud-cyber',
    note: 'chosen cloud/devops, comfortable with Linux and networks',
    build: (s) => ({
      skills: new Map(s.filter(k => /OPERATING|OS_|SHELL|NETWORK|FILE_SYSTEM/.test(k))
        .map(k => [k, belief(74)] as [string, SkillBelief])),
      primaryDirection: 'CLOUD_DEVOPS',
      directionStatus: 'SELECTED',
    }),
  },
  {
    key: 'undecided',
    note: 'sampling several directions, lightly measured',
    build: (s) => ({
      skills: new Map(s.slice(0, 4).map(k => [k, belief(55)] as [string, SkillBelief])),
      primaryDirection: null,
      directionStatus: 'EXPLORING',
      explorationDirections: [...EXPLORATION_SET],
    }),
  },
];

export function skillUniverse(pool: ComposableUnit[]): { allSkills: string[]; universalSkills: string[] } {
  return {
    allSkills: [...new Set(pool.flatMap(u => u.skillKeys))].sort(),
    universalSkills: [...new Set(pool.filter(u => u.category === 'UNIVERSAL').flatMap(u => u.skillKeys))].sort(),
  };
}

/* ------------------------------------------------------------------ *
 * Derived facts about a unit and a student
 * ------------------------------------------------------------------ */

export const compose = (pool: ComposableUnit[], student: StudentProfile, target = PROGRAM_DAYS) =>
  composeUnits({ candidates: pool, targetUnits: target, student });

/** The measured state governing a unit: its weakest MEASURED skill, as the composer derives it. */
export function measuredStateOf(unit: ComposableUnit, student: StudentProfile): AssignmentState {
  let worst: AssignmentState | null = null;
  for (const k of unit.skillKeys) {
    const b = student.skills.get(k);
    if (!b || b.score === null || b.score === undefined) continue;
    const s = stateForScore({ score: b.score, confidence: b.confidence });
    if (!worst || STATE_ORDER[s] < STATE_ORDER[worst]) worst = s;
  }
  return worst || 'NOT_EXPOSED';
}

/** States only measurement can establish; the plan's own teaching never projects into them. */
const EVIDENCE_ONLY: AssignmentState[] = ['STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];

/**
 * Every state a plan could ever schedule this unit at, given what was measured.
 *
 * Mirrors schedulingReadiness: teaching can lift an unmeasured or weak skill as far as STANDARD
 * and no further, and a state already at or past STANDARD is left exactly where evidence put it.
 */
export function reachableSchedulingStates(measured: AssignmentState): AssignmentState[] {
  if (EVIDENCE_ONLY.includes(measured)) return [measured];
  if (measured === 'GUIDED') return ['GUIDED', 'STANDARD'];
  return [measured, 'GUIDED', 'STANDARD'];
}

/**
 * True when no amount of scheduling could make this unit suitable for this student.
 *
 * The distinction a shape floor turns on: a role left empty because every candidate is
 * permanently unsuitable is the policy working, and one left empty while a usable candidate sat
 * unselected is a defect.
 */
export const permanentlyUnsuitable = (u: ComposableUnit, student: StudentProfile): boolean =>
  !reachableSchedulingStates(measuredStateOf(u, student)).some(s => isSuitableFor(u, s));

/** Whether the composer's direction filter keeps this unit for this student. Mirrors composeUnits. */
export function isRelevant(u: ComposableUnit, student: StudentProfile): boolean {
  const scoped = (u.applicableDirections || []).length > 0;
  if (!scoped || u.mandatory) return true;
  const exploring = new Set((student.explorationDirections || []).map(d => String(d).toUpperCase()));
  return appliesToDirection(u.applicableDirections, student.primaryDirection)
    || u.applicableDirections.some(d => exploring.has(String(d).toUpperCase()))
    || (!student.primaryDirection && exploring.size === 0);
}

const TEACHING_LADDER: AssignmentState[] =
  ['NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT'];

/**
 * Measured past everything the prerequisite unit teaches. Mirrors the composer's outgrownBy:
 * every skill measured, weakest at an evidence-only state above the highest state the unit serves.
 */
export const outgrownBy = (unit: ComposableUnit | undefined, student: StudentProfile): boolean => {
  if (!unit || !unit.skillKeys.length) return false;
  let weakest = -1;
  for (const k of unit.skillKeys) {
    const b = student.skills.get(k);
    if (!b || b.score === null || b.score === undefined) return false;
    const idx = TEACHING_LADDER.indexOf(stateForScore({ score: b.score, confidence: b.confidence }));
    if (weakest < 0 || idx < weakest) weakest = idx;
  }
  const highestServed = Math.max(...suitableStatesFor(unit).map(s => TEACHING_LADDER.indexOf(s)));
  return weakest >= TEACHING_LADDER.indexOf('REVISION') && weakest > highestServed;
};

/** Satisfied without being scheduled: verified mastery, or measured past the unit. */
export const masteredBy = (
  prereqCode: string, dependent: ComposableUnit, byCode: Map<string, ComposableUnit>, student: StudentProfile,
): boolean => {
  const p = byCode.get(prereqCode);
  const keys = p?.skillKeys?.length ? p.skillKeys : dependent.prerequisiteSkillKeys;
  const verified = (keys || []).some(k => {
    const b = student.skills.get(k);
    return !!b && b.score !== null && b.score !== undefined
      && stateForScore({ score: b.score, confidence: b.confidence }) === 'VERIFIED';
  });
  return verified || outgrownBy(p, student);
};

/** Every prerequisite, however deep, that exists in the universe. */
export function prerequisiteClosure(codes: Iterable<string>, universe: ComposableUnit[]): Set<string> {
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const out = new Set<string>();
  const visit = (c: string) => {
    if (out.has(c) || !byCode.has(c)) return;
    out.add(c);
    for (const p of byCode.get(c)!.prerequisiteUnitCodes) visit(p);
  };
  for (const c of codes) visit(c);
  return out;
}

/* ------------------------------------------------------------------ *
 * Certifying one plan
 * ------------------------------------------------------------------ */

export interface Issue { code: string; detail: string }

export interface ExplainedShape {
  role: CompositionRole;
  min: number;
  actual: number;
  /** Units of the role that survive the direction filter, in the universe. */
  candidatesInRole: number;
  reason: string;
}

export interface PlanReport {
  ok: boolean;
  issues: Issue[];
  explainedShape: ExplainedShape[];
  metrics: {
    selected: number;
    eligible: number;
    slack: number;
    shape: string;
    byType: Record<string, number>;
    allocation: { role: CompositionRole; min: number; target: number; got: number }[];
    reallocations: ComposerResult['reallocations'];
    segments: { label: string; instruction: number; practice: number; debug: number; project: number; verify: number }[];
    firstPracticalDay: number | null;
    maxInstructionalRun: number;
    masteryResolvedPrerequisites: number;
  };
}

const APPLY_TYPES = ['PRACTICE', 'DEBUG', 'PROJECT'];
const VERIFY_TYPES = ['CHECKPOINT', 'REVIEW'];
const PRACTICAL_TYPES = [...APPLY_TYPES, ...VERIFY_TYPES];
const GUIDED_OR_BETTER = new Set<AssignmentState>(['GUIDED', 'STANDARD', 'REVISION', 'VERIFIED', 'ENRICHMENT']);

/** No practical unit in the opening fortnight is a long opening block of reading. */
export const OPENING_BLOCK_DAYS = 15;
/** The P8B2 threshold: more than this share of practical work in the final third is back-loading. */
export const BACK_LOADED_SHARE = 0.6;

/**
 * Audit one composed plan against every rule a production journey has to keep.
 *
 * `universe` is the full inventory being judged against — the READY set when certifying a
 * subset — so a floor missed only because the subset withheld a usable unit is reported as the
 * subset's fault rather than explained away.
 */
export function validatePlan(args: {
  result: ComposerResult;
  universe: ComposableUnit[];
  student: StudentProfile;
  target?: number;
}): PlanReport {
  const { result, universe, student } = args;
  const target = args.target ?? PROGRAM_DAYS;
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const issues: Issue[] = [];
  const add = (code: string, detail: string) => issues.push({ code, detail });

  const codes = result.units.map(u => u.unitCode);
  if (!result.ok || codes.length !== target) add('LENGTH', `${codes.length} of ${target} (${result.code || 'ok'})`);
  if (new Set(codes).size !== codes.length) add('DUPLICATE', 'a unit is scheduled twice');
  if (result.blocked.length) add('BLOCKED', result.blocked.slice(0, 5).map(b => b.unitCode).join(', '));

  const index = new Map(codes.map((c, i) => [c, i]));
  const taught = new Set<string>();
  let masteryResolved = 0;

  result.units.forEach((sel, i) => {
    const u = byCode.get(sel.unitCode);
    if (!u) { add('UNKNOWN_UNIT', sel.unitCode); return; }

    /**
     * Satisfied means SCHEDULED EARLIER or ALREADY MASTERED — the composer's own rule.
     *
     * A prerequisite the student has verified may still appear later in the plan as revision or
     * practice; that is a revisit, not the dependent unit jumping its queue.
     */
    for (const p of u.prerequisiteUnitCodes) {
      const at = index.get(p);
      if (at !== undefined && at < i) continue;
      if (masteredBy(p, u, byCode, student)) { masteryResolved++; continue; }
      if (at !== undefined) add('PREREQ_ORDER', `${u.unitCode} on day ${i + 1} before ${p} on day ${at + 1}`);
      else add('PREREQ_UNMET', `${u.unitCode} needs ${p}, neither scheduled nor mastered`);
    }

    if (!isSuitableFor(u, sel.scheduledAt)) add('UNSUITABLE', `${u.unitCode} scheduled at ${sel.scheduledAt}`);

    const measured = sel.state;
    if ((u.unitType === 'CONCEPT' || u.unitType === 'WORKED_EXAMPLE')
      && ['REVISION', 'VERIFIED', 'ENRICHMENT'].includes(measured) && !isSuitableFor(u, measured)) {
      add('VERIFIED_REINSTRUCTED', `${u.unitCode} teaches a skill measured ${measured}`);
    }
    if (APPLY_TYPES.includes(u.unitType) && !GUIDED_OR_BETTER.has(measured)
      && !u.skillKeys.some(k => taught.has(k))) {
      add('APPLIED_BEFORE_TAUGHT', `${u.unitType} ${u.unitCode} on day ${i + 1}`);
    }
    if (VERIFY_TYPES.includes(u.unitType) && measured === 'NOT_EXPOSED' && !u.skillKeys.some(k => taught.has(k))) {
      const teachers = universe.filter(x => x.unitCode !== u.unitCode
        && ['CONCEPT', 'WORKED_EXAMPLE', 'PRACTICE'].includes(x.unitType)
        && x.skillKeys.some(k => u.skillKeys.includes(k))).length;
      add('CHECKPOINT_BEFORE_LEARNING', `${u.unitCode} on day ${i + 1}: none of its skills measured or taught earlier; `
        + `${u.prerequisiteUnitCodes.length ? `prerequisites ${u.prerequisiteUnitCodes.join(',')}` : 'declares no prerequisite'}; `
        + `${teachers} unit(s) in the inventory teach any of its skills`);
    }
    if (!isRelevant(u, student)) add('OUTSIDE_DIRECTION', `${u.unitCode} [${u.applicableDirections.join(',')}]`);

    const role = compositionRoleOf(u);
    if (isInstructionalRole(role) || role === 'PRACTICE') for (const k of u.skillKeys) taught.add(k);
  });

  /* ---- sequence ---------------------------------------------------- */

  const typeOf = (c: string) => byCode.get(c)?.unitType || 'CONCEPT';
  const n = Math.ceil(codes.length / 3) || 1;
  const segs: [string, string[]][] = [
    ['days 1-30', codes.slice(0, n)], ['days 31-60', codes.slice(n, n * 2)], ['days 61-90', codes.slice(n * 2)],
  ];
  const count = (list: string[], types: string[]) => list.filter(c => types.includes(typeOf(c))).length;
  const segments = segs.map(([label, list]) => ({
    label,
    instruction: count(list, ['CONCEPT', 'WORKED_EXAMPLE']),
    practice: count(list, ['PRACTICE']),
    debug: count(list, ['DEBUG']),
    project: count(list, ['PROJECT']),
    verify: count(list, VERIFY_TYPES),
  }));

  /** Thirds that carry practical work but no PRACTICE unit — judged once the plan's inventory is known. */
  const drillGaps: string[] = [];
  if (codes.length === target) {
    segs.forEach(([label, list]) => {
      if (!count(list, PRACTICAL_TYPES)) {
        add('NO_PRACTICAL_IN_SEGMENT', label);
        add('NO_PRACTICE_IN_SEGMENT', label);
      } else if (!count(list, ['PRACTICE'])) {
        drillGaps.push(label);
      }
    });
    const total = count(codes, PRACTICAL_TYPES);
    const last = count(segs[2][1], PRACTICAL_TYPES);
    if (total && last / total > BACK_LOADED_SHARE) add('BACK_LOADED', `${last} of ${total} practical units in the final third`);
  }

  /**
   * A long opening block is only a defect when something practical could have gone in it.
   *
   * A beginner has nothing to apply until the plan has taught it, so reading first is the
   * sequence working. A learner whose measured skills already make debugging or a project
   * suitable — prerequisites satisfied by what they have demonstrated — has no such reason, and
   * a fortnight of instruction in front of them is the rotation failing to give those roles a turn.
   */
  const firstPractical = codes.findIndex(c => PRACTICAL_TYPES.includes(typeOf(c)));
  if (codes.length === target && (firstPractical < 0 || firstPractical + 1 > OPENING_BLOCK_DAYS)) {
    const schedulableFromDayOne = universe.filter(u => APPLY_TYPES.includes(u.unitType)
      && isRelevant(u, student)
      && isSuitableFor(u, measuredStateOf(u, student))
      && u.prerequisiteUnitCodes.every(p => masteredBy(p, u, byCode, student)));
    if (schedulableFromDayOne.length) {
      add('LONG_OPENING_BLOCK', `first practical unit on day ${firstPractical + 1}, though `
        + `${schedulableFromDayOne.length} application unit(s) were schedulable from day 1, e.g. `
        + schedulableFromDayOne.slice(0, 3).map(u => u.unitCode).join(', '));
    }
  }
  let run = 0; let maxRun = 0;
  for (const c of codes) {
    if (['CONCEPT', 'WORKED_EXAMPLE'].includes(typeOf(c))) { run++; maxRun = Math.max(maxRun, run); } else run = 0;
  }

  /* ---- shape ------------------------------------------------------- */

  const chosen = new Set(codes);
  const explainedShape: ExplainedShape[] = [];
  for (const v of result.shapeViolations) {
    const inRole = universe.filter(u => compositionRoleOf(u) === v.role && isRelevant(u, student));
    const usable = inRole.filter(u => !chosen.has(u.unitCode) && !permanentlyUnsuitable(u, student));
    if (usable.length) {
      add('SHAPE_UNEXPLAINED', `${v.role} ${v.actual}/${v.min}; usable but unselected: `
        + usable.slice(0, 5).map(u => `${u.unitCode}(${measuredStateOf(u, student)})`).join(', '));
    } else {
      explainedShape.push({
        role: v.role, min: v.min, actual: v.actual, candidatesInRole: inRole.length,
        reason: 'every remaining unit in this role is unsuitable at a state only evidence can set',
      });
    }
  }

  /*
   * A THIRD WITH DEBUGGING AND PROJECTS BUT NO DRILL IS A DEFECT ONLY WHILE DRILL IS LEFT TO GIVE.
   *
   * The same test the floors use. PRACTICE is suitable from GUIDED to REVISION, so a learner
   * whose measured skills are all VERIFIED can only be drilled on topics the plan itself teaches,
   * and each of those drills follows its own teaching chain. Once every such unit is already in
   * the plan, a final third of debugging, projects and checkpoints is the plan applying what the
   * learner has demonstrated — not a plan that forgot to practise. A third with no practical work
   * at all is never excused, and any usable drill left unscheduled keeps the defect.
   */
  if (drillGaps.length) {
    const drill = universe.filter(u => u.unitType === 'PRACTICE' && isRelevant(u, student));
    const usable = drill.filter(u => !chosen.has(u.unitCode) && !permanentlyUnsuitable(u, student));
    for (const label of drillGaps) {
      if (usable.length) {
        add('NO_PRACTICE_IN_SEGMENT', `${label}; usable but unselected: `
          + usable.slice(0, 5).map(u => `${u.unitCode}(${measuredStateOf(u, student)})`).join(', '));
      } else {
        explainedShape.push({
          role: 'PRACTICE', min: 1, actual: 0, candidatesInRole: drill.length,
          reason: `${label} has practical work and no drill: every PRACTICE unit this learner can take is already scheduled`,
        });
      }
    }
  }

  const byType: Record<string, number> = {};
  for (const c of codes) byType[typeOf(c)] = (byType[typeOf(c)] || 0) + 1;

  return {
    ok: issues.length === 0,
    issues,
    explainedShape,
    metrics: {
      selected: codes.length,
      eligible: result.eligibleUnits,
      slack: result.eligibleUnits - target,
      shape: result.shape,
      byType,
      allocation: result.allocation.map(a => ({
        role: a.role, min: a.min, target: a.target, got: result.composition[a.role] || 0,
      })),
      reallocations: result.reallocations,
      segments,
      firstPracticalDay: firstPractical >= 0 ? firstPractical + 1 : null,
      maxInstructionalRun: maxRun,
      masteryResolvedPrerequisites: masteryResolved,
    },
  };
}

/** Same plan whatever order the inventory arrives in. */
export const isDeterministic = (pool: ComposableUnit[], student: StudentProfile): boolean => {
  const a = compose(pool, student).units.map(u => u.unitCode).join('|');
  const b = compose([...pool].reverse(), student).units.map(u => u.unitCode).join('|');
  const c = compose(pool, student).units.map(u => u.unitCode).join('|');
  return a === b && a === c;
};

/* ------------------------------------------------------------------ *
 * Direction
 * ------------------------------------------------------------------ */

/** Direction units per sampled area, collapsed to one family name exactly as the composer does. */
export function directionFamilyMix(
  result: ComposerResult, universe: ComposableUnit[], student: StudentProfile,
): Record<string, number> {
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const exploring = new Set((student.explorationDirections || []).map(d => String(d).toUpperCase()));
  const out: Record<string, number> = {};
  for (const s of result.units) {
    if (s.role !== 'DIRECTION_LEARNING') continue;
    const dirs = (byCode.get(s.unitCode)?.applicableDirections || []).map(d => String(d).toUpperCase()).sort();
    if (!dirs.length) continue;
    const fam = exploring.size ? (dirs.find(d => exploring.has(d)) || dirs[0]) : dirs[0];
    out[fam] = (out[fam] || 0) + 1;
  }
  return out;
}

/**
 * The same pool with shared-core affinity switched off, and nothing else changed.
 *
 * Affinity reads only `moduleCode` through `isCoreModuleFor`. Prefixing every module code with
 * the same character breaks that match while keeping the module sort order the composer uses as
 * a tie-break, so the difference between the two plans is the affinity term and only that.
 */
export const withoutCoreAffinity = (pool: ComposableUnit[]): ComposableUnit[] =>
  pool.map(u => ({ ...u, moduleCode: `~${u.moduleCode}` }));

export function coreModuleUse(result: ComposerResult, universe: ComposableUnit[], student: StudentProfile) {
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const core = (c: string) => isCoreModuleFor(byCode.get(c)?.moduleCode, student.primaryDirection,
    student.explorationDirections || []);
  const units = result.units.map(s => byCode.get(s.unitCode)!).filter(Boolean);
  const practical = units.filter(u => APPLY_TYPES.includes(u.unitType));
  return {
    practicalTotal: practical.length,
    practicalFromCore: practical.filter(u => core(u.unitCode)).length,
    instructionFromCore: units.filter(u => !APPLY_TYPES.includes(u.unitType)
      && !VERIFY_TYPES.includes(u.unitType) && core(u.unitCode)).length,
    coreCodes: units.filter(u => core(u.unitCode)).map(u => u.unitCode),
  };
}

/* ------------------------------------------------------------------ *
 * Future recomposition
 * ------------------------------------------------------------------ */

export type EvolutionKind = 'IMPROVEMENT' | 'STRUGGLE' | 'NEWLY_VERIFIED' | 'DIRECTION_REFINEMENT';
export const EVOLUTIONS: EvolutionKind[] = ['IMPROVEMENT', 'STRUGGLE', 'NEWLY_VERIFIED', 'DIRECTION_REFINEMENT'];

/** A narrower or adjacent direction, the kind of change a student actually makes after a month. */
const REFINED_DIRECTION: Record<string, string> = {
  WEB_DEVELOPMENT: 'SOFTWARE_BACKEND', SOFTWARE_BACKEND: 'WEB_DEVELOPMENT',
  AI_ML: 'DATA', DATA: 'AI_ML', CLOUD_DEVOPS: 'CYBERSECURITY', CYBERSECURITY: 'CLOUD_DEVOPS',
};

/**
 * What the learner looks like after the frozen days, for one kind of new evidence.
 *
 * Only skills the frozen days actually engaged move — evidence comes from work done — and the
 * input profile is never mutated.
 */
export function evolveProfile(base: StudentProfile, kind: EvolutionKind, frozen: ComposableUnit[]): StudentProfile {
  const skills = new Map(base.skills);
  const engaged = new Map<string, number>();
  for (const u of frozen) for (const k of u.skillKeys) engaged.set(k, (engaged.get(k) || 0) + 1);
  const keys = [...engaged.keys()].sort();

  switch (kind) {
    case 'IMPROVEMENT':
      for (const k of keys) skills.set(k, belief(Math.max(skills.get(k)?.score ?? 0, 72)));
      return { ...base, skills };
    case 'STRUGGLE':
      for (const k of keys) skills.set(k, belief(30));
      return { ...base, skills };
    case 'NEWLY_VERIFIED': {
      const top = [...engaged.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
      if (top) skills.set(top[0], belief(92));
      return { ...base, skills };
    }
    case 'DIRECTION_REFINEMENT':
      if (!base.primaryDirection) {
        return {
          ...base, skills, directionStatus: 'SELECTED', explorationDirections: undefined,
          primaryDirection: (base.explorationDirections || [])[0] || 'WEB_DEVELOPMENT',
        };
      }
      return {
        ...base, skills,
        primaryDirection: REFINED_DIRECTION[base.primaryDirection] || base.primaryDirection,
      };
    default:
      return base;
  }
}

export interface RecompositionReport {
  ok: boolean;
  issues: Issue[];
  freezeDay: number;
  kind: EvolutionKind;
  /** Future candidates beyond the slots that had to be filled. */
  slack: number;
  freshOk: boolean;
  freshSelected: number;
  rewrittenDays: number;
  freshCodes: string[];
  /** The ninety unit codes of the journey after recomposition, frozen days first. */
  stitched: string[];
}

/**
 * The recomposeFutureDays algorithm, in memory, over a candidate pool.
 *
 * Days 1..freezeDay are frozen as the original plan had them; the rest are refilled from a
 * fresh composition for the evolved learner, in order, skipping anything already taught. The
 * stitched ninety days are then audited as a journey — not merely counted.
 */
export function simulateRecomposition(args: {
  pool: ComposableUnit[];
  universe: ComposableUnit[];
  base: StudentProfile;
  kind: EvolutionKind;
  freezeDay: number;
}): RecompositionReport {
  const { pool, universe, base, kind, freezeDay } = args;
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const issues: Issue[] = [];
  const add = (code: string, detail: string) => issues.push({ code, detail });

  const original = compose(pool, base);
  if (!original.ok) add('ORIGINAL_FAILED', `${original.units.length} units`);

  const frozenSel = original.units.slice(0, freezeDay);
  const next = evolveProfile(base, kind, frozenSel.map(s => byCode.get(s.unitCode)!).filter(Boolean));
  const fresh = compose(pool, next);

  const frozenCodes = new Set(frozenSel.map(s => s.unitCode));
  const available = fresh.units.filter(u => !frozenCodes.has(u.unitCode));
  const futureSlots = PROGRAM_DAYS - freezeDay;
  if (available.length < futureSlots) add('INSUFFICIENT_FUTURE', `${available.length} for ${futureSlots} days`);

  const stitched = [...frozenSel.map(s => s.unitCode), ...available.slice(0, futureSlots).map(u => u.unitCode)];
  if (stitched.length !== PROGRAM_DAYS) add('LENGTH', `${stitched.length}`);
  if (new Set(stitched).size !== stitched.length) add('DUPLICATE', 'a unit appears twice in the stitched journey');

  /**
   * FROZEN DAYS ARE JUDGED AGAINST THE EVIDENCE THEY WERE SCHEDULED ON.
   *
   * A day already completed is history. A project taken on day 20 because the student had then
   * verified its prerequisite skill stays valid when day-30 evidence shows them struggling —
   * re-judging it against the new profile would report the past as a broken plan. Only the
   * future is held to the new evidence, with everything frozen counting as already taught.
   */
  const index = new Map(stitched.map((c, i) => [c, i]));
  stitched.forEach((c, i) => {
    const u = byCode.get(c);
    if (!u) return;
    const evidence = i < freezeDay ? base : next;
    for (const p of u.prerequisiteUnitCodes) {
      const at = index.get(p);
      // Earlier in the stitched journey, or mastered on the evidence this day was scheduled from.
      // A frozen day whose prerequisite the new plan now schedules later is remediation, not a break.
      if ((at !== undefined && at < i) || masteredBy(p, u, byCode, evidence)) continue;
      add('PREREQ', `${c} on day ${i + 1} needs ${p}`);
    }
    if (i >= freezeDay && !isRelevant(u, next)) add('OUTSIDE_DIRECTION', `${c} on day ${i + 1}`);
  });

  const originalCodes = original.units.map(u => u.unitCode);
  return {
    ok: issues.length === 0,
    issues,
    freezeDay,
    kind,
    slack: available.length - futureSlots,
    freshOk: fresh.ok,
    freshSelected: fresh.units.length,
    rewrittenDays: stitched.filter((c, i) => i >= freezeDay && originalCodes[i] !== c).length,
    freshCodes: fresh.units.map(u => u.unitCode),
    stitched,
  };
}

/* ------------------------------------------------------------------ *
 * State boundaries
 * ------------------------------------------------------------------ */

export interface BoundaryProfile { key: string; note: string; student: StudentProfile }

/**
 * Learners sitting on the state boundaries, where a threshold decides what may be scheduled.
 *
 * 74/75 is STANDARD/REVISION — the edge past which concept units stop being suitable, and the one
 * that exposed the prerequisite deadlock. 84/85 is REVISION/VERIFIED, where mastery begins. A high
 * score at LOW confidence must behave as STANDARD, never as mastery. Each is taken across the
 * direction stances, because the direction filter changes which prerequisites are even present.
 *
 * Coverage is the universal foundation: that is what the Foundation stage skill set switches on and
 * therefore what a real diagnostic measures. A learner measured on every direction and academic skill
 * as well is the post-mastery stress case, reported separately and not certified as a learner.
 */
export function stateBoundaryProfiles(allSkills: string[], universalSkills: string[]): BoundaryProfile[] {
  const at = (keys: string[], score: number | ((i: number) => number), confidence: 'HIGH' | 'LOW' = 'HIGH') =>
    new Map(keys.map((k, i) => [k, { score: typeof score === 'number' ? score : score(i), confidence }] as [string, SkillBelief]));
  const stances: [string, Partial<StudentProfile>][] = [
    ['undecided', { primaryDirection: null, directionStatus: 'UNDECIDED' }],
    ['exploring', { primaryDirection: null, directionStatus: 'EXPLORING', explorationDirections: [...EXPLORATION_SET] }],
    ['web', { primaryDirection: 'WEB_DEVELOPMENT', directionStatus: 'SELECTED' }],
    ['ai_ml', { primaryDirection: 'AI_ML', directionStatus: 'SELECTED' }],
    ['cloud', { primaryDirection: 'CLOUD_DEVOPS', directionStatus: 'SELECTED' }],
    ['software_backend', { primaryDirection: 'SOFTWARE_BACKEND', directionStatus: 'SELECTED' }],
  ];
  const mk = (key: string, note: string, skills: Map<string, SkillBelief>, stance: Partial<StudentProfile>): BoundaryProfile => ({
    key, note, student: { skills, primaryDirection: null, directionStatus: 'UNDECIDED', ...stance } as StudentProfile,
  });

  const out: BoundaryProfile[] = [];
  for (const score of [74, 75, 80, 84, 85]) {
    for (const [s, stance] of stances) {
      out.push(mk(`universal@${score}/${s}`, `every universal skill at ${score}`, at(universalSkills, score), stance));
    }
  }
  const programming = allSkills.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k));
  for (const score of [74, 75, 84, 85]) {
    out.push(mk(`programming@${score}/software_backend`, `programming skills at ${score}`, at(programming, score), stances[5][1]));
  }
  for (const [lo, hi] of [[74, 75], [84, 85]]) {
    for (const [s, stance] of [stances[0], stances[2]]) {
      out.push(mk(`universal@${lo}|${hi}/${s}`, `universal skills alternating ${lo} and ${hi}`,
        at(universalSkills, i => (i % 2 ? hi : lo)), stance));
    }
  }
  for (const [s, stance] of [stances[0], stances[2]]) {
    out.push(mk(`universal@92-LOW/${s}`, 'high scores on thin evidence', at(universalSkills, 92, 'LOW'), stance));
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Robustness sweep
 * ------------------------------------------------------------------ */

/**
 * A grid of learner states beyond the nine, for judging SLACK rather than a single composition.
 *
 * Coverage x score x direction stance. Not every cell is a learner the READY inventory can serve
 * — an everything-verified cell is the stress case — so a set is judged by whether it keeps every
 * cell the READY inventory itself passes, never by an absolute count.
 */
export function robustnessGrid(allSkills: string[], universalSkills: string[]): { key: string; student: StudentProfile }[] {
  const coverage: [string, string[]][] = [
    ['all', allSkills],
    ['universal', universalSkills],
    ['first-third', allSkills.slice(0, Math.ceil(allSkills.length / 3))],
    ['programming', allSkills.filter(k => /PROGRAMMING|PYTHON|LOOPS|FUNCTIONS|CONDITIONALS|DSA|C_/.test(k))],
    ['web', allSkills.filter(k => /HTML|CSS|JS|WEB|HTTP|BROWSER/.test(k))],
    ['maths', allSkills.filter(k => /MATRIC|PROBABILITY|STATISTIC|SET_THEORY|LOGIC|RELATIONS|BOOLEAN|NUMBER/.test(k))],
    ['systems', allSkills.filter(k => /OPERATING|OS_|SHELL|NETWORK|FILE_SYSTEM/.test(k))],
  ];
  const scores = [25, 50, 70, 80, 92];
  const stances: [string, Partial<StudentProfile>][] = [
    ['undecided', { primaryDirection: null, directionStatus: 'UNDECIDED' }],
    ['exploring', { primaryDirection: null, directionStatus: 'EXPLORING', explorationDirections: [...EXPLORATION_SET] }],
    ...['WEB_DEVELOPMENT', 'AI_ML', 'DATA', 'CLOUD_DEVOPS', 'CYBERSECURITY', 'SOFTWARE_BACKEND']
      .map(d => [d.toLowerCase(), { primaryDirection: d, directionStatus: 'SELECTED' }] as [string, Partial<StudentProfile>]),
  ];

  const out: { key: string; student: StudentProfile }[] = [];
  for (const [sKey, stance] of stances) {
    out.push({
      key: `none@0/${sKey}`,
      student: { skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED', ...stance } as StudentProfile,
    });
    for (const [cKey, keys] of coverage) {
      for (const score of scores) {
        out.push({
          key: `${cKey}@${score}/${sKey}`,
          student: {
            skills: new Map(keys.map(k => [k, belief(score)] as [string, SkillBelief])),
            primaryDirection: null, directionStatus: 'UNDECIDED', ...stance,
          } as StudentProfile,
        });
      }
    }
  }
  return out;
}

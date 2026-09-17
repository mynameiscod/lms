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
import {
  isSuitableFor, suitableStatesFor, standardEvidenceSatisfies, knownInstruction,
} from '../data/unitSuitabilityPolicy';
import {
  compositionRoleOf, CompositionRole, isInstructionalRole,
} from '../data/compositionShapePolicy';
import { appliesToDirection, isCoreModuleFor } from '../data/careerDirectionPolicy';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import { foundationStageRequirements } from '../seeds/careerPilot/foundationStageSkillSet';
import { aggregate, evidenceWeightFor } from '../data/skillDnaPolicy';
import { resolveStance } from './foundationProfileService';
import {
  practicalBoundaries, COURSE_STRANDS, strandOf, strandIndex, sequenceIndexOf,
} from '../data/courseSequencePolicy';

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

/* ------------------------------------------------------------------ *
 * Learners as the actual Skill Check produces them
 * ------------------------------------------------------------------ */

/**
 * THE FOUNDATION SKILL CHECK, AS A STUDENT SITS IT.
 *
 * Every realistic profile above measures a hand-picked set of skills at a hand-picked score. None of them
 * is what the product's own Skill Check hands the composer: six Foundation skills, four questions each,
 * at the difficulties the paper was filled at, scored MEDIUM because four questions is what the paper
 * asks. That gap let a beginner who answered the whole check wrongly lose conditions, loops and functions
 * with every certification green — five low foundation scores outranked the untouched programming spine.
 *
 * These two learners are built from a paper, not from beliefs: each answer is weighed by the Skill DNA
 * policy's own evidenceWeightFor, aggregated by its own aggregate, and the direction stance resolved as a
 * student who has not chosen one is resolved. The items and difficulties are those of a real sitting.
 */
export const REAL_SKILL_CHECK_PAPER: { skillKey: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' }[] = [
  { skillKey: 'HOW_COMPUTERS_WORK', difficulty: 'EASY' }, { skillKey: 'FILE_SYSTEMS_PERMISSIONS', difficulty: 'EASY' },
  { skillKey: 'PSEUDOCODE_FLOWCHARTS', difficulty: 'MEDIUM' }, { skillKey: 'PROGRAMMING_FUNDAMENTALS', difficulty: 'EASY' },
  { skillKey: 'HOW_COMPUTERS_WORK', difficulty: 'MEDIUM' }, { skillKey: 'FILE_SYSTEMS_PERMISSIONS', difficulty: 'EASY' },
  { skillKey: 'SHELL_COMMANDS', difficulty: 'MEDIUM' }, { skillKey: 'PROBLEM_SOLVING', difficulty: 'EASY' },
  { skillKey: 'PSEUDOCODE_FLOWCHARTS', difficulty: 'MEDIUM' }, { skillKey: 'PROGRAMMING_FUNDAMENTALS', difficulty: 'EASY' },
  { skillKey: 'HOW_COMPUTERS_WORK', difficulty: 'MEDIUM' }, { skillKey: 'FILE_SYSTEMS_PERMISSIONS', difficulty: 'EASY' },
  { skillKey: 'SHELL_COMMANDS', difficulty: 'EASY' }, { skillKey: 'SHELL_COMMANDS', difficulty: 'MEDIUM' },
  { skillKey: 'PROBLEM_SOLVING', difficulty: 'EASY' }, { skillKey: 'PSEUDOCODE_FLOWCHARTS', difficulty: 'MEDIUM' },
  { skillKey: 'PROGRAMMING_FUNDAMENTALS', difficulty: 'HARD' }, { skillKey: 'PROBLEM_SOLVING', difficulty: 'EASY' },
  { skillKey: 'PSEUDOCODE_FLOWCHARTS', difficulty: 'EASY' }, { skillKey: 'PROGRAMMING_FUNDAMENTALS', difficulty: 'EASY' },
  { skillKey: 'HOW_COMPUTERS_WORK', difficulty: 'EASY' }, { skillKey: 'FILE_SYSTEMS_PERMISSIONS', difficulty: 'EASY' },
  { skillKey: 'SHELL_COMMANDS', difficulty: 'MEDIUM' }, { skillKey: 'PROBLEM_SOLVING', difficulty: 'EASY' },
];

/** A learner exactly as Skill DNA and profile hydration would hand them to the composer after this paper. */
export function skillCheckLearner(answers: number[]): StudentProfile {
  if (answers.length !== REAL_SKILL_CHECK_PAPER.length) throw new Error('one answer per Skill Check item');
  const bySkill = new Map<string, { performance: number; evidenceWeight: number; itemKey: string }[]>();
  REAL_SKILL_CHECK_PAPER.forEach((item, i) => {
    const rows = bySkill.get(item.skillKey) || [];
    rows.push({
      performance: answers[i],
      evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty: item.difficulty, sourceType: 'PERSONALIZED_ASSESSMENT' }),
      itemKey: `question:${i}`,
    });
    bySkill.set(item.skillKey, rows);
  });
  const stance = resolveStance({});
  return {
    skills: new Map([...bySkill].map(([k, rows]) => {
      const r = aggregate(rows);
      return [k, { score: r.score, confidence: r.confidence }] as [string, SkillBelief];
    })),
    primaryDirection: stance.primaryDirection,
    directionStatus: stance.directionStatus,
    explorationDirections: stance.exploring,
  };
}

export const REAL_SKILL_CHECK_PROFILES: { key: string; note: string; build: () => StudentProfile }[] = [
  {
    key: 'REAL_SKILL_CHECK_BEGINNER',
    note: 'answered the whole Skill Check wrongly: six Foundation skills at 0, MEDIUM',
    build: () => skillCheckLearner(REAL_SKILL_CHECK_PAPER.map(() => 0)),
  },
  {
    key: 'REAL_SKILL_CHECK_PARTIAL',
    note: 'some programming right: PROGRAMMING_FUNDAMENTALS 46, shell 26, problem solving 25, the rest 0, all MEDIUM',
    build: () => skillCheckLearner([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0]),
  },
];

/**
 * Is the recomposed journey still one coherent course along its structural requirements?
 *
 * Judged against the composer's own report of where each requirement stood once the frozen days were accounted
 * for: one still needing coverage must reach its boundary in the future, and the requirements the learner is
 * actually walking — covered in history or still ahead — must meet their boundaries in their authored order. One
 * the evidence has resolved is not required; if it is scheduled anyway it is not held to the order.
 */
export function recompositionContinuityIssues(
  fresh: Pick<ComposerResult, 'structure'>, stitched: string[], freezeDay: number, universe?: ComposableUnit[],
): Issue[] {
  const issues: Issue[] = [];
  const at = new Map(stitched.map((c, i) => [c, i]));
  const byCode = new Map((universe || []).map(u => [u.unitCode, u]));
  const PRACTICAL = ['PRACTICE', 'DEBUG', 'PROJECT', 'CHECKPOINT', 'REVIEW'];
  const walked: { topicCode: string; strand: string; day: number; rank: number }[] = [];
  for (const req of fresh.structure || []) {
    if (req.coverage === 'NO_SUITABLE_TREATMENT') {
      issues.push({ code: 'BACKBONE_UNTREATABLE', detail: `${req.topicCode} has no unit this learner could be given` });
      continue;
    }
    if (req.coverage === 'RESOLVED_BY_EVIDENCE' || !req.boundary) continue;
    let i = at.get(req.boundary);
    // A compressed requirement is met by the topic's first practical unit, whichever the plan reached first.
    if (req.coverage === 'REQUIRES_COMPRESSED_COVERAGE' && universe) {
      const days = stitched.map((c, d) => ({ u: byCode.get(c), d }))
        .filter(x => x.d >= freezeDay && x.u?.topicCode === req.topicCode && PRACTICAL.includes(x.u.unitType)).map(x => x.d);
      if (days.length) i = Math.min(...days);
    }
    if (i === undefined) {
      issues.push({ code: 'STRUCTURE_CUT', detail: `${req.topicCode} still needed ${req.boundary} and the future never reaches it` });
      continue;
    }
    if (req.coverage !== 'COVERED_BY_FROZEN_PLAN' && i < freezeDay) {
      issues.push({ code: 'STRUCTURE_REPORT', detail: `${req.topicCode} reported uncovered but ${req.boundary} is frozen on day ${i + 1}` });
    }
    // Out of authored order only counts WITHIN a strand — strands interleave by design — and only when measurement did
    // not rank the later requirement strictly ahead: a weak measured area opening first is the composer's rule, a
    // scrambled continuation is not. History is judged by the evidence it was scheduled on: only a requirement the
    // future reaches is held to the order.
    for (const earlier of walked) {
      if (earlier.strand !== req.strand) continue;
      if (i >= freezeDay && i <= earlier.day && (req.sequencingRank ?? 1) >= earlier.rank) {
        issues.push({ code: 'STRUCTURE_ORDER', detail: `${req.topicCode} reaches practice on day ${i + 1}, not after ${earlier.topicCode} on day ${earlier.day + 1}` });
        break;
      }
    }
    walked.push({ topicCode: req.topicCode, strand: req.strand, day: i, rank: req.sequencingRank ?? 1 });
  }
  return issues;
}

/** The programming spine, in its authored order: every topic's first practice must be in the plan, in this order. */
export const PROGRAMMING_SPINE_TOPICS = ['T_VARIABLES', 'T_CONDITIONS', 'T_LOOPS', 'T_FUNCTIONS', 'T_ARRAYS'];

/** The day each spine topic first reaches practice in a plan, by the course sequence's own boundary; null when never. */
export function spineFirstPractices(result: Pick<ComposerResult, 'units'>, universe: ComposableUnit[]): (number | null)[] {
  const codes = result.units.map(u => u.unitCode);
  return PROGRAMMING_SPINE_TOPICS.map(t => {
    const first = practicalBoundaries(universe.filter(u => u.topicCode === t))[0];
    const i = first ? codes.indexOf(first.unitCode) : -1;
    return i < 0 ? null : i + 1;
  });
}

/** For a learner the spine is unresolved for: every topic reaches practice, and in the authored order. */
export function spineContinuityIssues(result: Pick<ComposerResult, 'units'>, universe: ComposableUnit[]): string[] {
  const days = spineFirstPractices(result, universe);
  const issues = PROGRAMMING_SPINE_TOPICS.filter((_t, i) => days[i] === null).map(t => `SPINE_MISSING_${t.slice(2)}`);
  const present = days.filter((d): d is number => d !== null);
  if (present.some((d, i) => i > 0 && d <= present[i - 1])) issues.push('SPINE_OUT_OF_ORDER');
  return issues;
}

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
    const s = stateForScore({ score: b.score, confidence: b.confidence, understandingOnly: b.understandingOnly });
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

/**
 * True when the composer will never select this unit for this student.
 *
 * Either no scheduling could make it suitable, or it is a lesson the learner reliably knows below
 * their level — the composer's own `knownInstruction` rule, read from the same policy. A floor or a
 * ceiling judged without the second half would call a deliberately skipped lesson "usable but
 * unselected" and certify the policy working as a defect.
 */
export const unusableFor = (u: ComposableUnit, student: StudentProfile): boolean =>
  permanentlyUnsuitable(u, student) || !!knownInstruction(u, student.skills);

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
    const idx = TEACHING_LADDER.indexOf(stateForScore({ score: b.score, confidence: b.confidence, understandingOnly: b.understandingOnly }));
    if (weakest < 0 || idx < weakest) weakest = idx;
  }
  const highestServed = Math.max(...suitableStatesFor(unit).map(s => TEACHING_LADDER.indexOf(s)));
  return weakest >= TEACHING_LADDER.indexOf('REVISION') && weakest > highestServed;
};

/**
 * Satisfied without being scheduled: verified mastery, measured past the unit, or — for a same-topic
 * lesson only — reliable STANDARD evidence on every skill it teaches. The composer's own three
 * resolutions, in the composer's order, from the same policy.
 */
export const masteredBy = (
  prereqCode: string, dependent: ComposableUnit, byCode: Map<string, ComposableUnit>, student: StudentProfile,
): boolean => {
  const p = byCode.get(prereqCode);
  const keys = p?.skillKeys?.length ? p.skillKeys : dependent.prerequisiteSkillKeys;
  const verified = (keys || []).some(k => {
    const b = student.skills.get(k);
    return !!b && b.score !== null && b.score !== undefined
      && stateForScore({ score: b.score, confidence: b.confidence, understandingOnly: b.understandingOnly }) === 'VERIFIED';
  });
  return verified || outgrownBy(p, student) || !!standardEvidenceSatisfies(p, dependent, student.skills);
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
    const known = knownInstruction(u, student.skills);
    if (known) {
      add('KNOWN_REINSTRUCTED', `${u.unitCode} (${u.defaultDepth}) re-teaches ${known.skill}, reliably measured ${known.state}`);
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
    const usable = inRole.filter(u => !chosen.has(u.unitCode) && !unusableFor(u, student));
    if (usable.length) {
      add('SHAPE_UNEXPLAINED', `${v.role} ${v.actual}/${v.min}; usable but unselected: `
        + usable.slice(0, 5).map(u => `${u.unitCode}(${measuredStateOf(u, student)})`).join(', '));
    } else {
      const known = inRole.filter(u => !chosen.has(u.unitCode) && knownInstruction(u, student.skills)).length;
      explainedShape.push({
        role: v.role, min: v.min, actual: v.actual, candidatesInRole: inRole.length,
        reason: known
          ? `every remaining unit in this role is unsuitable at a state only evidence can set, or one of ${known} `
            + 'lesson(s) whose every skill is reliably measured above the level it teaches'
          : 'every remaining unit in this role is unsuitable at a state only evidence can set',
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
    const usable = drill.filter(u => !chosen.has(u.unitCode) && !unusableFor(u, student));
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

export type EvolutionKind = 'IMPROVEMENT' | 'STRUGGLE' | 'NEWLY_VERIFIED' | 'DIRECTION_REFINEMENT'
  | 'NONE' | 'WEAK' | 'STANDARD' | 'REVISION' | 'VERIFIED' | 'MIXED';
export const EVOLUTIONS: EvolutionKind[] = ['IMPROVEMENT', 'STRUGGLE', 'NEWLY_VERIFIED', 'DIRECTION_REFINEMENT'];

/**
 * THE STRUCTURAL CONTINUITY MATRIX. Every evidence change a reassessment can bring — none, weak, STANDARD, REVISION,
 * VERIFIED on what the frozen days engaged, a direction refinement alone, and a mixture — at freeze points across the
 * whole ninety days, for the learners whose programming spine is still being walked.
 */
export const CONTINUITY_EVOLUTIONS: EvolutionKind[] = ['NONE', 'WEAK', 'STANDARD', 'REVISION', 'VERIFIED', 'DIRECTION_REFINEMENT', 'MIXED'];
export const CONTINUITY_FREEZE_DAYS = [1, 14, 30, 45, 60, 75];
export type ReassessmentChain = 'IMPROVING_DAILY' | 'STRUGGLING_DAILY' | 'REPEATED_MIXED';
export const CONTINUITY_CHAINS: ReassessmentChain[] = ['IMPROVING_DAILY', 'STRUGGLING_DAILY', 'REPEATED_MIXED'];

/** The learners the continuity gate follows: the real Skill Check pair, the no-evidence beginner, and mixed. */
export function continuityLearners(allSkills: string[], universalSkills: string[]): { key: string; student: StudentProfile }[] {
  const realistic = (key: string) => REALISTIC_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);
  return [
    ...REAL_SKILL_CHECK_PROFILES.map(p => ({ key: p.key, student: p.build() })),
    { key: 'beginner', student: realistic('beginner') },
    { key: 'mixed', student: realistic('mixed') },
  ];
}

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
    case 'NONE':
      return base;
    case 'WEAK':
      for (const k of keys) skills.set(k, { score: 46, confidence: 'MEDIUM' });
      return { ...base, skills };
    case 'STANDARD':
      for (const k of keys) skills.set(k, belief(70));
      return { ...base, skills };
    case 'REVISION':
      for (const k of keys) skills.set(k, belief(80));
      return { ...base, skills };
    case 'VERIFIED':
      for (const k of keys) skills.set(k, belief(92));
      return { ...base, skills };
    case 'MIXED':
      keys.forEach((k, i) => skills.set(k, i % 2 ? { score: 30, confidence: 'MEDIUM' } : belief(80)));
      return { ...base, skills };
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
  // The frozen days are the composition's history, exactly as recomposeFutureDays passes them.
  const fresh = composeUnits({ candidates: pool, targetUnits: PROGRAM_DAYS, student: next, history: frozenSel.map(s => s.unitCode) });

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

  for (const issue of recompositionContinuityIssues(fresh, stitched, freezeDay, universe)) add(issue.code, issue.detail);

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

/**
 * A reassessment after reassessment, each one a recomposition of the journey the last one left.
 *
 * IMPROVING_DAILY and STRUGGLING_DAILY recompose after every day with STANDARD or struggling evidence on what that day
 * engaged — the day-by-day stress that used to scramble the spine into 65/88/90/53/35. REPEATED_MIXED reassesses at
 * days 14, 30, 45, 60 and 75 with mixed evidence. Every step is audited as a stitched journey, and the frozen days of
 * each step must be exactly the days the step before left.
 */
export function simulateReassessmentChain(args: {
  pool: ComposableUnit[]; universe: ComposableUnit[]; base: StudentProfile; chain: ReassessmentChain;
}): { ok: boolean; issues: Issue[]; stitched: string[]; steps: number } {
  const { pool, universe, base, chain } = args;
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const issues: Issue[] = [];
  let stitched = compose(pool, base).units.map(u => u.unitCode);
  let student = base;
  const freezes = chain === 'REPEATED_MIXED' ? [14, 30, 45, 60, 75] : Array.from({ length: 88 }, (_, i) => i + 1);
  for (const freezeDay of freezes) {
    const kind: EvolutionKind = chain === 'IMPROVING_DAILY' ? 'STANDARD' : chain === 'STRUGGLING_DAILY' ? 'STRUGGLE' : 'MIXED';
    const engaged = (chain === 'REPEATED_MIXED' ? stitched.slice(0, freezeDay) : stitched.slice(freezeDay - 1, freezeDay))
      .map(c => byCode.get(c)!).filter(Boolean);
    student = evolveProfile(student, kind, engaged);
    const frozen = stitched.slice(0, freezeDay);
    const fresh = composeUnits({ candidates: pool, targetUnits: PROGRAM_DAYS, student, history: frozen });
    const taken = new Set(frozen);
    const next = [...frozen, ...fresh.units.map(u => u.unitCode).filter(c => !taken.has(c)).slice(0, PROGRAM_DAYS - freezeDay)];
    const at = `${chain} day ${freezeDay}`;
    if (next.length !== PROGRAM_DAYS) issues.push({ code: 'LENGTH', detail: `${at}: ${next.length}` });
    if (new Set(next).size !== next.length) issues.push({ code: 'DUPLICATE', detail: at });
    if (next.slice(0, freezeDay).join('|') !== frozen.join('|')) issues.push({ code: 'FROZEN_CHANGED', detail: at });
    for (const i of recompositionContinuityIssues(fresh, next, freezeDay, universe)) issues.push({ code: i.code, detail: `${at}: ${i.detail}` });
    const index = new Map(next.map((c, i) => [c, i]));
    next.forEach((c, i) => {
      if (i < freezeDay) return;
      const u = byCode.get(c);
      for (const p of u?.prerequisiteUnitCodes || []) {
        const pi = index.get(p);
        if ((pi !== undefined && pi < i) || masteredBy(p, u!, byCode, student)) continue;
        issues.push({ code: 'PREREQ', detail: `${at}: ${c} on day ${i + 1} needs ${p}` });
      }
    });
    stitched = next;
  }
  return { ok: issues.length === 0, issues, stitched, steps: freezes.length };
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

/* ------------------------------------------------------------------ *
 * The mandatory Foundation backbone
 * ------------------------------------------------------------------ */

/**
 * THE BACKBONE AUDIT: EVERY MANDATORY FUNDAMENTAL, HOW THIS JOURNEY COVERS IT, AND FROM WHAT EVIDENCE.
 *
 * Re-derived from the finished plan, never read back from the composer's report, so a certification is evidence that
 * the fundamentals are there rather than the composer agreeing with itself. A requirement is covered by units of its
 * own topic only — a loose skill relationship elsewhere claims nothing:
 *
 *   FULL          taught to its first practice, with first-exposure lessons on the way
 *   GUIDED        taught to its first practice with guided or deeper lessons only
 *   COMPRESSED    its first practice, the lessons being known — no teaching at all
 *   CHALLENGE     a debugging exercise in the topic, instead of lessons and practice
 *   APPLICATION   a project in the topic
 *   VERIFICATION  a checkpoint or review in the topic
 *
 * Lessons of the topic scheduled without any practical unit do NOT cover it: being read to is not coverage.
 */
export type BackboneCoverageMode = 'FULL' | 'GUIDED' | 'COMPRESSED' | 'CHALLENGE' | 'APPLICATION' | 'VERIFICATION';

export interface BackboneRequirementCoverage {
  requirement: string;
  covered: boolean;
  mode: BackboneCoverageMode | null;
  coveredBy: string[];
  firstDay: number | null;
  lastDay: number | null;
  /** Further days on the topic beyond its coverage — deeper practice, projects, a second boundary. */
  furtherDays: number;
  /** The weakest measured state across the topic's skills, with score and confidence: what compression rests on. */
  evidence: string;
  /** Sequencing rank: 0 for a measured gap (FOUNDATION_REQUIRED), 1 otherwise. */
  rank: number;
}

export interface BackboneAudit {
  requirements: BackboneRequirementCoverage[];
  missing: string[];
  /** Days spent covering the fundamentals: the union of every requirement's coverage. */
  fundamentalDays: number;
  /** Every day on a backbone topic, coverage and further work together. */
  backboneTopicDays: number;
  firstBackboneDay: number | null;
  lastBackboneDay: number | null;
  roles: Record<CompositionRole, number>;
  /** First-exposure lessons across the whole plan. */
  elementaryInstruction: number;
  /** Everything that is not first-exposure or guided instruction: advanced, direction, practice, debugging, projects, checkpoints. */
  advancedAndApplied: number;
}

const COMPOSITION_ROLE_LIST: CompositionRole[] = ['FOUNDATION_INSTRUCTION', 'GUIDED_INSTRUCTION', 'ADVANCED_UNIVERSAL',
  'DIRECTION_LEARNING', 'EXPLORATION', 'PRACTICE', 'APPLICATION', 'INTEGRATION', 'VERIFICATION'];

/** The backbone requirements an inventory defines, in course order: flagged topics and the programming spine. */
export function backboneTopicsOf(universe: ComposableUnit[]): string[] {
  const topics = new Map<string, string>();
  for (const u of universe) if (u.backbone || PROGRAMMING_SPINE_TOPICS.includes(u.topicCode)) topics.set(u.topicCode, u.moduleCode);
  return [...topics.keys()].sort((a, b) => strandIndex(strandOf(a, topics.get(a)!)) - strandIndex(strandOf(b, topics.get(b)!))
    || (sequenceIndexOf(a) ?? 99) - (sequenceIndexOf(b) ?? 99)
    || topics.get(a)!.localeCompare(topics.get(b)!) || a.localeCompare(b));
}

const COVERAGE_BY_TYPE: Record<string, BackboneCoverageMode> = {
  PRACTICE: 'COMPRESSED', DEBUG: 'CHALLENGE', PROJECT: 'APPLICATION', CHECKPOINT: 'VERIFICATION', REVIEW: 'VERIFICATION',
};

export function auditBackbone(codes: string[], universe: ComposableUnit[], student: StudentProfile): BackboneAudit {
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const dayOf = new Map(codes.map((c, i) => [c, i + 1]));
  const requirementsList = backboneTopicsOf(universe);
  const coverageDays = new Set<number>();
  const requirements = requirementsList.map((topic): BackboneRequirementCoverage => {
    const topicUnits = universe.filter(u => u.topicCode === topic);
    const inPlan = topicUnits.filter(u => dayOf.has(u.unitCode)).sort((a, b) => dayOf.get(a.unitCode)! - dayOf.get(b.unitCode)!);
    const first = practicalBoundaries(topicUnits)[0];
    let coveredBy: ComposableUnit[] = [];
    let mode: BackboneCoverageMode | null = null;
    const teachingPath = first && dayOf.has(first.unitCode)
      ? inPlan.filter(u => u.unitCode === first.unitCode
        || (prerequisiteClosure([first.unitCode], universe).has(u.unitCode) && dayOf.get(u.unitCode)! <= dayOf.get(first.unitCode)!))
      : [];
    // Given compactly — a practical unit of the topic before any lesson of it — that unit is the coverage, and lessons
    // scheduled after it (remediation after weaker evidence) do not move it. Taught: the lessons on the way to the first
    // practice, and that practice. Otherwise the first practical unit of the topic, whatever its type.
    const firstPractical = inPlan.find(u => COVERAGE_BY_TYPE[u.unitType]);
    const compactFirst = !!firstPractical && !inPlan.some(u => isInstructionalRole(compositionRoleOf(u))
      && dayOf.get(u.unitCode)! < dayOf.get(firstPractical.unitCode)!);
    if (compactFirst) {
      coveredBy = [firstPractical!];
      mode = firstPractical!.unitCode === first?.unitCode ? 'COMPRESSED' : COVERAGE_BY_TYPE[firstPractical!.unitType];
    } else if (teachingPath.some(u => isInstructionalRole(compositionRoleOf(u)))) {
      coveredBy = teachingPath;
      mode = teachingPath.some(u => compositionRoleOf(u) === 'FOUNDATION_INSTRUCTION') ? 'FULL' : 'GUIDED';
    } else {
      const practical = inPlan.find(u => COVERAGE_BY_TYPE[u.unitType]);
      if (practical) {
        const path = prerequisiteClosure([practical.unitCode], universe);
        coveredBy = inPlan.filter(u => u === practical
          || (path.has(u.unitCode) && dayOf.get(u.unitCode)! < dayOf.get(practical.unitCode)!));
        mode = COVERAGE_BY_TYPE[practical.unitType];
      }
    }
    const days = coveredBy.map(u => dayOf.get(u.unitCode)!);
    days.forEach(d => coverageDays.add(d));
    let weakest: { state: AssignmentState; score: number; confidence: any } | null = null;
    for (const k of [...new Set(topicUnits.flatMap(u => u.skillKeys))]) {
      const b = student.skills.get(k);
      if (!b || b.score === null || b.score === undefined) continue;
      const state = stateForScore({ score: b.score, confidence: b.confidence, understandingOnly: b.understandingOnly });
      if (!weakest || STATE_ORDER[state] < STATE_ORDER[weakest.state]) weakest = { state, score: b.score, confidence: b.confidence };
    }
    return {
      requirement: topic,
      covered: coveredBy.length > 0,
      mode,
      coveredBy: coveredBy.map(u => u.unitCode),
      firstDay: days.length ? Math.min(...days) : null,
      lastDay: days.length ? Math.max(...days) : null,
      furtherDays: inPlan.length - coveredBy.length,
      evidence: weakest ? `${weakest.state} ${weakest.score} ${weakest.confidence}` : 'NOT_EXPOSED',
      rank: weakest?.state === 'FOUNDATION_REQUIRED' ? 0 : 1,
    };
  });
  const roles = Object.fromEntries(COMPOSITION_ROLE_LIST.map(r => [r, 0])) as Record<CompositionRole, number>;
  for (const c of codes) { const u = byCode.get(c); if (u) roles[compositionRoleOf(u)]++; }
  const backboneSet = new Set(requirementsList);
  const all = [...coverageDays];
  return {
    requirements,
    missing: requirements.filter(r => !r.covered).map(r => r.requirement),
    fundamentalDays: coverageDays.size,
    backboneTopicDays: codes.filter(c => backboneSet.has(byCode.get(c)?.topicCode || '')).length,
    firstBackboneDay: all.length ? Math.min(...all) : null,
    lastBackboneDay: all.length ? Math.max(...all) : null,
    roles,
    elementaryInstruction: roles.FOUNDATION_INSTRUCTION,
    advancedAndApplied: codes.length - roles.FOUNDATION_INSTRUCTION - roles.GUIDED_INSTRUCTION,
  };
}

/**
 * What a backbone audit fails on: a requirement not covered, or the fundamentals met out of course order within a
 * strand — conditions before variables, files before hardware — unless measurement ranked the later one strictly
 * ahead. `fromDay` limits the order check to requirements completed after it: frozen days keep the order they had.
 */
export function backboneIssues(audit: BackboneAudit, fromDay = 0): Issue[] {
  const issues: Issue[] = audit.missing.map(r => ({ code: 'BACKBONE_MISSING', detail: `${r} has no meaningful coverage` }));
  const byTopic = new Map(audit.requirements.map(r => [r.requirement, r]));
  for (const strand of COURSE_STRANDS) {
    const walked = strand.sequence.map(t => byTopic.get(t)).filter((r): r is BackboneRequirementCoverage => !!r && r.covered);
    for (let i = 1; i < walked.length; i++) {
      if (walked[i].lastDay! <= fromDay) continue;
      for (let j = 0; j < i; j++) {
        if (walked[i].lastDay! < walked[j].lastDay! && walked[i].rank >= walked[j].rank) {
          issues.push({ code: 'BACKBONE_ORDER', detail: `${walked[i].requirement} covered by day ${walked[i].lastDay}, before ${walked[j].requirement} on day ${walked[j].lastDay}` });
          break;
        }
      }
    }
  }
  return issues;
}

/**
 * Pathological end-loading: a requirement other than the course's last whose whole coverage falls in the final sixth of
 * the journey. Reported, not failed — a requirement landing late is not a defect by itself, and no day number is a rule.
 */
export function backboneEndLoading(audit: BackboneAudit, programDays = PROGRAM_DAYS): string[] {
  const covered = audit.requirements.filter(r => r.covered);
  const lastInCourse = covered[covered.length - 1]?.requirement;
  const threshold = Math.floor(programDays * 5 / 6);
  return covered
    .filter(r => r.requirement !== lastInCourse && r.firstDay! > threshold)
    .map(r => `${r.requirement} ${r.mode} days ${r.firstDay}-${r.lastDay}`);
}

/**
 * A learner as Skill DNA would hold them after answering real items: each skill's rows weighed by the policy's own
 * evidenceWeightFor and aggregated by its own aggregate, so score and confidence are what the product computes.
 */
export function evidenceLearner(
  skills: string[],
  answersFor: (skill: string, index: number) => number[],
  stance: Partial<StudentProfile> = { primaryDirection: null, directionStatus: 'UNDECIDED' },
): StudentProfile {
  const DIFFICULTY = ['EASY', 'MEDIUM', 'MEDIUM', 'HARD'];
  return {
    skills: new Map(skills.map((k, i) => {
      const rows = answersFor(k, i).map((performance, j) => ({
        performance,
        evidenceWeight: evidenceWeightFor({ relationship: 'PRIMARY', difficulty: DIFFICULTY[j % 4], sourceType: 'PERSONALIZED_ASSESSMENT' }),
        itemKey: `${k}:${j}`,
      }));
      const r = aggregate(rows);
      return [k, { score: r.score, confidence: r.confidence }] as [string, SkillBelief];
    })),
    primaryDirection: null,
    directionStatus: 'UNDECIDED',
    ...stance,
  } as StudentProfile;
}

/**
 * THE BACKBONE CERTIFICATION PROFILES.
 *
 * The two real Skill Check learners; a developing learner and a very strong one hydrated from answered items across
 * the Foundation diagnostic skills — four items a skill is MEDIUM confidence, eight is HIGH; the good learners at 70
 * and 78; and the undecided, exploring, software/backend and mixed learners of the realistic set.
 */
export const BACKBONE_PROFILES: { key: string; note: string; build: (allSkills: string[], universalSkills: string[]) => StudentProfile }[] = [
  { key: 'REAL_SKILL_CHECK_BEGINNER', note: REAL_SKILL_CHECK_PROFILES[0].note, build: () => REAL_SKILL_CHECK_PROFILES[0].build() },
  { key: 'REAL_SKILL_CHECK_PARTIAL', note: REAL_SKILL_CHECK_PROFILES[1].note, build: () => REAL_SKILL_CHECK_PROFILES[1].build() },
  {
    key: 'DEVELOPING',
    note: 'the 39 Foundation diagnostic skills, four answered items each: alternately 2 of 4 (46, GUIDED) and 3 of 4 (71, STANDARD), MEDIUM',
    build: () => evidenceLearner(diagnosticSkills(), (_k, i) => (i % 2 ? [1, 1, 1, 0] : [1, 0, 1, 0])),
  },
  {
    key: 'GOOD_AT_70',
    note: 'every universal skill at 70 HIGH (STANDARD)',
    build: (_s, universal) => ({ skills: new Map(universal.map(k => [k, belief(70)] as [string, SkillBelief])), primaryDirection: null, directionStatus: 'UNDECIDED' }),
  },
  {
    key: 'GOOD_AT_78',
    note: 'every universal skill at 78 HIGH (REVISION)',
    build: (_s, universal) => ({ skills: new Map(universal.map(k => [k, belief(78)] as [string, SkillBelief])), primaryDirection: null, directionStatus: 'UNDECIDED' }),
  },
  {
    key: 'VERY_STRONG',
    note: 'the 39 Foundation diagnostic skills, eight answered items each: every third skill one easy item wrong (89), the rest all right (100), HIGH: VERIFIED',
    build: () => evidenceLearner(diagnosticSkills(), (_k, i) => (i % 3 === 0 ? [0, 1, 1, 1, 1, 1, 1, 1] : [1, 1, 1, 1, 1, 1, 1, 1])),
  },
  { key: 'UNDECIDED', note: 'nothing measured, no direction chosen', build: (s, u) => REALISTIC_PROFILES.find(p => p.key === 'beginner')!.build(s, u) },
  { key: 'EXPLORING', note: 'sampling four directions, lightly measured', build: (s, u) => REALISTIC_PROFILES.find(p => p.key === 'undecided')!.build(s, u) },
  { key: 'SOFTWARE_BACKEND', note: 'chosen software/backend, competent at programming', build: (s, u) => REALISTIC_PROFILES.find(p => p.key === 'software_backend')!.build(s, u) },
  { key: 'MIXED', note: 'a real diagnostic: some gaps, some adequate, most untouched', build: (s, u) => REALISTIC_PROFILES.find(p => p.key === 'mixed')!.build(s, u) },
];

/**
 * THE COMPRESSION LADDER: one learner, the same 39 diagnostic skills, evidence rising step by step — nothing right,
 * one in four, two in four, three in four, all eight right. Elementary instruction and fundamental days should not
 * rise as evidence does, and coverage stays complete at every step.
 */
export const COMPRESSION_LADDER: { key: string; answers: number[] }[] = [
  { key: 'none right', answers: [0, 0, 0, 0] },
  { key: 'one in four', answers: [1, 0, 0, 0] },
  { key: 'two in four', answers: [1, 0, 1, 0] },
  { key: 'three in four', answers: [1, 1, 1, 0] },
  { key: 'all right', answers: [1, 1, 1, 1, 1, 1, 1, 1] },
];

export function compressionLadder(pool: ComposableUnit[]): {
  steps: { key: string; audit: BackboneAudit; ok: boolean }[];
  exceptions: string[];
} {
  const steps = COMPRESSION_LADDER.map(step => {
    const student = evidenceLearner(diagnosticSkills(), () => step.answers);
    const r = compose(pool, student);
    const audit = auditBackbone(r.units.map(u => u.unitCode), pool, student);
    return { key: step.key, audit, ok: r.ok && r.units.length === PROGRAM_DAYS && !audit.missing.length };
  });
  const exceptions: string[] = [];
  steps.forEach((s, i) => {
    if (!s.ok) exceptions.push(`${s.key}: not ninety days with every requirement covered (missing ${s.audit.missing.join(', ') || '-'})`);
    if (i === 0) return;
    const prev = steps[i - 1];
    if (s.audit.elementaryInstruction > prev.audit.elementaryInstruction) {
      exceptions.push(`${s.key}: elementary instruction rose ${prev.audit.elementaryInstruction} -> ${s.audit.elementaryInstruction}`);
    }
    if (s.audit.fundamentalDays > prev.audit.fundamentalDays) {
      exceptions.push(`${s.key}: fundamental days rose ${prev.audit.fundamentalDays} -> ${s.audit.fundamentalDays}`);
    }
  });
  return { steps, exceptions };
}

/** Evidence changes the backbone recomposition matrix applies, on what the frozen days engaged. */
export const BACKBONE_EVOLUTIONS: EvolutionKind[] = ['NONE', 'WEAK', 'STANDARD', 'REVISION', 'VERIFIED', 'MIXED', 'STRUGGLE'];

/**
 * One recomposition, held to the backbone as well as to structural continuity: every requirement covered across the
 * frozen days and the future together, the future in course order, exactly ninety days.
 */
export function simulateBackboneRecomposition(args: {
  pool: ComposableUnit[]; universe: ComposableUnit[]; base: StudentProfile; kind: EvolutionKind; freezeDay: number;
}): RecompositionReport & {
  backbone: BackboneAudit; futureElementary: number; futureFundamentalDays: number; futureBackboneDays: number; endLoading: string[];
} {
  const rep = simulateRecomposition(args);
  const byCode = new Map(args.universe.map(u => [u.unitCode, u]));
  const original = compose(args.pool, args.base).units.slice(0, args.freezeDay).map(u => byCode.get(u.unitCode)!).filter(Boolean);
  const next = evolveProfile(args.base, args.kind, original);
  const backbone = auditBackbone(rep.stitched, args.universe, next);
  const issues = [...rep.issues, ...backboneIssues(backbone, args.freezeDay)];
  const future = rep.stitched.slice(args.freezeDay).map(c => byCode.get(c)).filter(Boolean) as ComposableUnit[];
  const coverage = new Set(backbone.requirements.flatMap(r => r.coveredBy));
  return {
    ...rep,
    ok: issues.length === 0,
    issues,
    backbone,
    futureElementary: future.filter(u => compositionRoleOf(u) === 'FOUNDATION_INSTRUCTION').length,
    futureFundamentalDays: future.filter(u => coverage.has(u.unitCode)).length,
    // Every future day on a backbone topic — coverage still owed and remediation or deeper work on covered topics.
    futureBackboneDays: future.filter(u => backboneTopicsOf(args.universe).includes(u.topicCode)).length,
    endLoading: backboneEndLoading(backbone),
  };
}

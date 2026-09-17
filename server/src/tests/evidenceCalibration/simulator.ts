/**
 * EVIDENCE CALIBRATION AUDIT — a deterministic simulator of how coursework evidence moves Skill DNA and the journey.
 *
 * AUDIT TOOLING ONLY. It changes nothing in production and reads no database. Every rule it applies is the production
 * rule, imported, not re-implemented:
 *
 *   evidence weight      evidenceWeightFor (relationship × difficulty × source)
 *   score, confidence    aggregate (weighted mean; confidence from effective weight and distinct items)
 *   state                stateForScore (LOW confidence capped at STANDARD)
 *   option order         stableShuffle, as a student is shown a checkpoint
 *   curriculum           composeUnits with the frozen days as history, as recomposeFutureDays calls it
 *
 * What it models, matching production: the Skill Check writes PERSONALIZED_ASSESSMENT rows; every checkpoint question
 * with a PRIMARY skill mapping writes one MODULE_ASSESSMENT row when the checkpoint is submitted (checkpoints cannot be
 * retaken); unmapped questions write nothing; every row counts forever, with no recency. A recomposition runs whenever
 * the evidence changes anything the composer reads (a skill's state, or whether its confidence is enough to skip) —
 * production recomposes after every checkpoint, and a composition whose inputs have not changed is identical, so this
 * is exact.
 *
 * THREE MODELS, so each change can be measured against what it replaced:
 *
 *   BEFORE  as at 58b248b6: kinds did not exist; practice, debugging, projects and coding assignments wrote nothing.
 *   KINDS   as at a0cc9f2c: every row has a kind; a skill with no DIAGNOSTIC and no APPLIED row is planned at STANDARD
 *           at most; a coding assignment's grade writes one CODING_ASSIGNMENT row per unit skill, and a project day's
 *           grade one PROJECT_EVALUATION row per unit skill, at the learner's applied performance, on the day the unit
 *           is worked. ANY applied row lifts the cap, failed or not.
 *   AFTER   production now: as KINDS, but only a DIAGNOSTIC row or an APPLIED row that met its assignment's pass line
 *           (fixtures/evidence/applied-pass-standards.json: coding 60, projects 40) lifts the cap. A failed grade still
 *           counts in the score. The grading day is an ASSUMPTION: an auto-grade lands that day, while a project grade
 *           lands whenever a grader reviews it.
 */

import crypto from 'crypto';
import READY_JSON from '../fixtures/phase21/ready-inventory.json';
import SETS from '../fixtures/phase21/publish-sets.json';
import CHECKPOINTS from '../fixtures/evidence/checkpoint-questions.json';
import PASS_STANDARDS from '../fixtures/evidence/applied-pass-standards.json';
import { aggregate, evidenceWeightFor, evidenceBasis, EvidenceKind } from '../../data/skillDnaPolicy';
import { AssignmentState, stateForScore, isConfidentEnough } from '../../data/adaptiveCurriculumPolicy';
import { ComposableUnit, StudentProfile, SkillBelief, composeUnits } from '../../services/curriculumComposerService';
import {
  REAL_SKILL_CHECK_PAPER, diagnosticSkills, skillUniverse, auditBackbone, BackboneAudit,
} from '../../services/composerCertificationService';
import { stableShuffle } from '../../services/quizAnswerAccess';
import { FOUNDATION_PROGRAM_DAYS } from '../../data/ninetyDayPolicy';

export const READY = READY_JSON as unknown as ComposableUnit[];
export const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const byCode = new Map(PRODUCTION.map(u => [u.unitCode, u]));
const checkpointsByUnit = new Map((CHECKPOINTS as any).units.map((u: any) => [u.unitCode, u]));

export const FOCUS_SKILLS = ['PROGRAMMING_FUNDAMENTALS', 'CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS',
  'DSA_ARRAYS', 'SHELL_COMMANDS', 'PROBLEM_SOLVING', 'SQL_BASICS'];
export const CODING_ASSIGNMENT_UNITS = ['T_VARIABLES_COMPUTE_PRACTICE', 'T_CONDITIONS_PRACTICE', 'T_LOOPS_PRACTICE',
  'T_FUNCTIONS_CALL_RETURN_PRACTICE', 'T_ARRAYS_TRAVERSAL_PRACTICE'];

export type Model = 'BEFORE' | 'KINDS' | 'AFTER';
export type Source = 'PERSONALIZED_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'CODING_ASSIGNMENT' | 'PROJECT_EVALUATION';
export interface EvidenceRow {
  skillKey: string; performance: number; weight: number; itemKey: string; source: Source; day: number;
  /** APPLIED rows: did the grade meet the assignment's pass line? */
  meetsPassStandard?: boolean;
}
export interface Belief {
  score: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  /** The state the plan uses under the model. */
  state: AssignmentState;
  /** The state score and confidence alone buy (the low-confidence cap only). */
  rawState: AssignmentState;
  /** KINDS/AFTER: nothing behind the score demonstrates the skill, and that lowered the state. */
  capped: boolean;
  kinds: Record<EvidenceKind, number>;
  /** Weight of APPLIED rows that met their pass line. */
  qualifyingApplied: number;
  weight: number;
  items: number;
}

const CHECKPOINT_WEIGHT = (difficulty = 'MEDIUM') => evidenceWeightFor({ relationship: 'PRIMARY', difficulty, sourceType: 'MODULE_ASSESSMENT' });
const PAPER_WEIGHT = (difficulty: string) => evidenceWeightFor({ relationship: 'PRIMARY', difficulty, sourceType: 'PERSONALIZED_ASSESSMENT' });
const APPLIED_WEIGHT = (source: Source) => evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: source });

/** The pass line of a graded practical unit, as a fraction: Assignment.passingPoints / totalPoints. */
export const passStandardOf = (unitCode: string): number | null => (PASS_STANDARDS as any).units[unitCode]?.passStandard ?? null;

/** KINDS reproduces a0cc9f2c, where any APPLIED row lifted the cap; AFTER uses the recorded verdict. */
const basisOf = (rows: EvidenceRow[], model: Model = 'AFTER') => evidenceBasis(rows.map(x => ({
  sourceType: x.source, evidenceWeight: x.weight,
  meetsPassStandard: model === 'KINDS' ? true : x.meetsPassStandard,
})));

export function beliefOf(rows: EvidenceRow[], model: Model = 'AFTER'): Belief | null {
  if (!rows.length) return null;
  const r = aggregate(rows.map(x => ({ performance: x.performance, evidenceWeight: x.weight, itemKey: x.itemKey })));
  const basis = basisOf(rows, model);
  const rawState = stateForScore({ score: r.score, confidence: r.confidence });
  const state = model !== 'BEFORE' ? stateForScore({ score: r.score, confidence: r.confidence, understandingOnly: basis.understandingOnly }) : rawState;
  return {
    score: r.score, confidence: r.confidence, state, rawState, capped: state !== rawState, kinds: basis.weights,
    qualifyingApplied: model === 'BEFORE' ? 0 : basis.qualifyingApplied.weight, weight: r.effectiveEvidenceWeight, items: r.distinctItems,
  };
}

export function profileOf(rows: EvidenceRow[], model: Model = 'AFTER'): StudentProfile {
  const bySkill = new Map<string, EvidenceRow[]>();
  for (const r of rows) bySkill.set(r.skillKey, [...(bySkill.get(r.skillKey) || []), r]);
  const skills = new Map<string, SkillBelief>();
  for (const [k, rs] of bySkill) {
    const b = beliefOf(rs, model)!;
    const understandingOnly = model !== 'BEFORE' && basisOf(rs, model).understandingOnly;
    skills.set(k, { score: b.score, confidence: b.confidence, ...(understandingOnly ? { understandingOnly: true } : {}) });
  }
  return { skills, primaryDirection: null, directionStatus: 'UNDECIDED' };
}

/* ------------------------------------------------------------------ *
 * Question-level analysis
 * ------------------------------------------------------------------ */

export interface TransitionStep { answers: number; score: number; confidence: string; state: AssignmentState }

/** Consecutive checkpoint answers of one kind (all right or all wrong) on top of a prior, and where the state moves. */
export function answerLadder(prior: EvidenceRow[], correct: boolean, max = 80, difficulty = 'MEDIUM', model: Model = 'AFTER'): TransitionStep[] {
  const rows = [...prior];
  const steps: TransitionStep[] = [];
  const at = (n: number) => { const b = beliefOf(rows, model); steps.push({ answers: n, score: b?.score ?? NaN, confidence: b?.confidence ?? 'NONE', state: b?.state ?? 'NOT_EXPOSED' }); };
  at(0);
  for (let n = 1; n <= max; n++) {
    rows.push({ skillKey: 'X', performance: correct ? 1 : 0, weight: CHECKPOINT_WEIGHT(difficulty), itemKey: `q${n}`, source: 'MODULE_ASSESSMENT', day: n });
    at(n);
  }
  return steps;
}

/** The first answer count at which each state (and each confidence) is reached. */
export function firstReached(steps: TransitionStep[]): { states: Partial<Record<AssignmentState, number>>; confidence: Record<string, number> } {
  const states: Partial<Record<AssignmentState, number>> = {};
  const confidence: Record<string, number> = {};
  for (const s of steps) {
    if (states[s.state] === undefined) states[s.state] = s.answers;
    if (confidence[s.confidence] === undefined) confidence[s.confidence] = s.answers;
  }
  return { states, confidence };
}

/** The Skill Check rows for one skill, answered with the given correctness per item on the real paper. */
export function skillCheckRows(answers: number[], only?: string): EvidenceRow[] {
  return REAL_SKILL_CHECK_PAPER.map((item, i) => ({
    skillKey: item.skillKey, performance: answers[i], weight: PAPER_WEIGHT(item.difficulty),
    itemKey: `paper:${i}`, source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0,
  })).filter(r => !only || r.skillKey === only);
}

/* ------------------------------------------------------------------ *
 * Learners
 * ------------------------------------------------------------------ */

const hash01 = (seed: string): number => crypto.createHash('sha256').update(seed).digest().readUInt32BE(0) / 0x100000000;
const PRACTICAL_TYPES = ['PRACTICE', 'DEBUG', 'PROJECT'];

export interface AnswerContext { learner: string; day: number; unit: ComposableUnit; questionId: string; optionCount: number; skill: string; seenOnSkill: number; answerIndex: number }

export interface SimLearner {
  key: string;
  note: string;
  prior: () => EvidenceRow[];
  answers: (c: AnswerContext) => boolean;
  /** AFTER model: the grade (0..1) given to the coding assignment or project worked on that day. */
  applied: (c: { learner: string; day: number; unit: ComposableUnit }) => number;
}

const beginnerPrior = () => skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 0));
/** Rows for every universal skill at a fixed success rate: `right` of `n` MEDIUM paper items. */
const universalPrior = (right: number, n: number) => () => {
  const { universalSkills } = skillUniverse(READY);
  return universalSkills.flatMap(k => Array.from({ length: n }, (_, i) => ({
    skillKey: k, performance: i < right ? 1 : 0, weight: PAPER_WEIGHT('MEDIUM'), itemKey: `paper:${k}:${i}`, source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0,
  })));
};

export const SIM_LEARNERS: SimLearner[] = [
  { key: 'A_BEGINNER_WEAK', note: 'real Skill Check all wrong; checkpoints answered at about 30%, at random', prior: beginnerPrior,
    applied: () => 0.3,
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.3 },
  { key: 'B_BEGINNER_LEARNS', note: 'real Skill Check all wrong; each skill starts at 30% and gains 10 points per checkpoint answer on it, to 95%', prior: beginnerPrior,
    applied: c => Math.min(0.95, 0.4 + 0.01 * c.day),
    answers: c => hash01(`${c.learner}:${c.questionId}`) < Math.min(0.95, 0.3 + 0.1 * c.seenOnSkill) },
  { key: 'C_BEGINNER_LESSONS_ONLY', note: 'real Skill Check all wrong; every lesson checkpoint right, every checkpoint on a practice, debugging or project day wrong; coding assignments and projects graded 20%', prior: beginnerPrior,
    applied: () => 0.2,
    answers: c => !PRACTICAL_TYPES.includes(c.unit.unitType) },
  { key: 'D_BEGINNER_ALL_RIGHT', note: 'real Skill Check all wrong; every checkpoint right; coding assignments and projects graded 100%', prior: beginnerPrior,
    applied: () => 1,
    answers: () => true },
  { key: 'E_PARTIAL', note: 'real Skill Check partial (PROGRAMMING_FUNDAMENTALS 46 MEDIUM); checkpoints at about 70%', prior: () => skillCheckRows([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0]),
    applied: () => 0.7,
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.7 },
  { key: 'F_AT_70', note: 'every universal skill measured 7 of 10 (70, HIGH); checkpoints at about 70%', prior: universalPrior(7, 10),
    applied: () => 0.7,
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.7 },
  { key: 'G_AT_78', note: 'every universal skill measured 14 of 18 (78, HIGH); checkpoints at about 80%', prior: universalPrior(14, 18),
    applied: () => 0.8,
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.8 },
  { key: 'H_VERY_STRONG', note: 'the 39 diagnostic skills, 8 paper items each, 89–100 HIGH; checkpoints right except about 1 in 12', prior: () => diagnosticSkills().flatMap((k, i) => [0, 1, 2, 3, 4, 5, 6, 7].map(j => ({
    skillKey: k, performance: i % 3 === 0 && j === 0 ? 0 : 1, weight: PAPER_WEIGHT(['EASY', 'MEDIUM', 'MEDIUM', 'HARD'][j % 4]), itemKey: `paper:${k}:${j}`, source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0,
  }))), applied: () => 0.95,
    answers: c => hash01(`${c.learner}:${c.questionId}`) >= 1 / 12 },
  { key: 'I_ALWAYS_OPTION_A', note: 'real Skill Check all wrong; always picks the first option shown, under the per-student stable shuffle', prior: beginnerPrior,
    // Every stored question keeps its correct option first; the student sees stableShuffle(options, `${student}:${question}`).
    applied: () => 0.2,
    answers: c => stableShuffle(Array.from({ length: c.optionCount }, (_, i) => i), `${c.learner}:${c.questionId}`)[0] === 0 },
  { key: 'J_ALTERNATING', note: 'real Skill Check all wrong; right, wrong, right, wrong across every answer', prior: beginnerPrior,
    applied: c => (c.day % 2 ? 0.8 : 0.3),
    answers: c => c.answerIndex % 2 === 0 },
  { key: 'K_WRONG_THEN_RIGHT', note: 'real Skill Check all wrong; every checkpoint wrong until day 20, every one right after', prior: beginnerPrior,
    applied: c => (c.day > 20 ? 0.9 : 0.2),
    answers: c => c.day > 20 },
  { key: 'L_RIGHT_THEN_WRONG', note: 'real Skill Check all wrong; every checkpoint right until day 30, every one wrong after', prior: beginnerPrior,
    applied: c => (c.day <= 30 ? 0.9 : 0.2),
    answers: c => c.day <= 30 },
  { key: 'M_RECALL_RIGHT_PRACTICAL_FAILED', note: 'real Skill Check all wrong; every checkpoint right; every coding assignment and project graded 20%', prior: beginnerPrior,
    applied: () => 0.2,
    answers: () => true },
  { key: 'N_RECALL_RIGHT_PRACTICAL_AT_PASS', note: 'real Skill Check all wrong; every checkpoint right; every coding assignment graded exactly 60 and every project exactly 40 — the pass lines', prior: beginnerPrior,
    applied: c => passStandardOf(c.unit.unitCode) ?? 0.6,
    answers: () => true },
];

/* ------------------------------------------------------------------ *
 * The journey
 * ------------------------------------------------------------------ */

export interface SkillMove { skill: string; answered: number; right: number; before: Belief | null; after: Belief }
export interface CurriculumConsequence {
  recomposed: boolean;
  lessonsRemoved: string[];
  lessonsAdded: string[];
  practiceRemoved: string[];
  codingAssignmentsRemoved: string[];
  codingAssignmentsAdded: string[];
  debuggingAdded: string[];
  backboneModeChanges: string[];
  backboneMissing: string[];
}
export interface DayEvent { day: number; unit: string; unitType: string; unmappedQuestions: number; applied: { source: Source; performance: number; meetsPassStandard?: boolean } | null; moves: SkillMove[]; consequence: CurriculumConsequence | null }
export interface SimulationResult {
  learner: SimLearner;
  model: Model;
  initialPlan: string[];
  finalPlan: string[];
  events: DayEvent[];
  finalBeliefs: Record<string, Belief | null>;
  firstDay: Record<string, Partial<Record<AssignmentState, number>>>;
  totals: {
    /** Days whose unit, as worked, differs from the final plan. A frozen day never changes: always 0. */
    completedDaysChanged: number;
    recompositions: number; lessonsRemoved: number; practiceRemoved: number; codingAssignmentsRemoved: string[]; debuggingAdded: number;
    backboneModeChanges: number; backboneMissingEver: string[];
    /** Coding assignments the learner actually worked, and their grades. */
    codingAssignmentsWorked: string[]; appliedRows: number; failedApplied: number;
  };
  backboneInitial: BackboneAudit;
  backboneFinal: BackboneAudit;
}

const signature = (p: StudentProfile): string => [...p.skills.entries()].sort(([a], [b]) => a.localeCompare(b))
  .map(([k, b]) => `${k}:${stateForScore(b)}:${isConfidentEnough(b.confidence as any) ? 1 : 0}`).join('|');

const compose = (student: StudentProfile, history?: string[], pool: ComposableUnit[] = PRODUCTION) =>
  composeUnits({ candidates: pool, targetUnits: FOUNDATION_PROGRAM_DAYS, student, history });

function consequenceOf(oldPlan: string[], newPlan: string[], day: number, student: StudentProfile, oldAudit: BackboneAudit, pool: ComposableUnit[]): { c: CurriculumConsequence; audit: BackboneAudit } {
  const oldFuture = new Set(oldPlan.slice(day));
  const newFuture = new Set(newPlan.slice(day));
  const poolByCode = pool === PRODUCTION ? byCode : new Map(pool.map(u => [u.unitCode, u]));
  const typeOf = (c: string) => poolByCode.get(c)?.unitType;
  const removed = [...oldFuture].filter(c => !newFuture.has(c));
  const added = [...newFuture].filter(c => !oldFuture.has(c));
  const audit = auditBackbone(newPlan, pool, student);
  const modeOf = (a: BackboneAudit) => new Map(a.requirements.map(r => [r.requirement, `${r.mode}${r.coveredBy.length ? '' : ''}`]));
  const before = modeOf(oldAudit);
  const changes = [...modeOf(audit)].filter(([t, m]) => before.get(t) !== m).map(([t, m]) => `${t.replace('T_', '')} ${before.get(t)}→${m}`);
  return {
    audit,
    c: {
      recomposed: true,
      lessonsRemoved: removed.filter(c => typeOf(c) === 'CONCEPT'),
      lessonsAdded: added.filter(c => typeOf(c) === 'CONCEPT'),
      practiceRemoved: removed.filter(c => typeOf(c) === 'PRACTICE'),
      codingAssignmentsRemoved: removed.filter(c => CODING_ASSIGNMENT_UNITS.includes(c)),
      codingAssignmentsAdded: added.filter(c => CODING_ASSIGNMENT_UNITS.includes(c)),
      debuggingAdded: added.filter(c => typeOf(c) === 'DEBUG'),
      backboneModeChanges: changes,
      backboneMissing: audit.missing,
    },
  };
}

/** The practical units whose work is graded: the five coding assignments and every project. */
export const isGradedPractical = (u: ComposableUnit): Source | null =>
  CODING_ASSIGNMENT_UNITS.includes(u.unitCode) ? 'CODING_ASSIGNMENT' : u.unitType === 'PROJECT' ? 'PROJECT_EVALUATION' : null;

/**
 * Ninety days of one learner. `pool` defaults to the audited fixture of the certified set; the production gate passes
 * the inventory it read from the database, so the same replay certifies what is actually published.
 */
export function simulate(
  learner: SimLearner, model: Model = 'AFTER', days = FOUNDATION_PROGRAM_DAYS, pool: ComposableUnit[] = PRODUCTION,
  /** A grader reviews project work this many days after the day it is worked (coding auto-grades still land that day). */
  options: { projectGradeDelayDays?: number } = {},
): SimulationResult {
  const poolByCode = pool === PRODUCTION ? byCode : new Map(pool.map(u => [u.unitCode, u]));
  const delay = Math.max(0, options.projectGradeDelayDays || 0);
  const pendingGrades: { dueDay: number; unit: ComposableUnit; source: Source; performance: number; meetsPassStandard?: boolean }[] = [];
  const workedPlan: string[] = [];
  const rows: EvidenceRow[] = learner.prior();
  let student = profileOf(rows, model);
  let plan = compose(student, undefined, pool).units.map(u => u.unitCode);
  const initialPlan = [...plan];
  const backboneInitial = auditBackbone(plan, pool, student);
  let audit = backboneInitial;
  let sig = signature(student);
  const events: DayEvent[] = [];
  const seenOnSkill = new Map<string, number>();
  const firstDay: Record<string, Partial<Record<AssignmentState, number>>> = {};
  let answerIndex = 0;
  const missingEver = new Set<string>();

  const mark = (day: number) => {
    for (const [k, b] of student.skills) {
      const s = stateForScore(b);
      firstDay[k] = firstDay[k] || {};
      if (firstDay[k][s] === undefined) firstDay[k][s] = day;
    }
  };
  mark(0);

  for (let day = 1; day <= days; day++) {
    const unit = poolByCode.get(plan[day - 1])!;
    workedPlan.push(unit.unitCode);
    const quiz: any = checkpointsByUnit.get(unit.unitCode);
    const questions: any[] = quiz ? quiz.questions : [];
    const bySkill = new Map<string, { answered: number; right: number }>();
    let unmapped = 0;
    for (const q of questions) {
      const correct = learner.answers({
        learner: learner.key, day, unit, questionId: q.id, optionCount: q.optionCount || 4,
        skill: q.skillKey || '', seenOnSkill: seenOnSkill.get(q.skillKey) || 0, answerIndex: answerIndex++,
      });
      if (!q.skillKey) { unmapped++; continue; }
      rows.push({ skillKey: q.skillKey, performance: correct ? 1 : 0, weight: CHECKPOINT_WEIGHT(q.difficulty), itemKey: `question:${q.id}`, source: 'MODULE_ASSESSMENT', day });
      seenOnSkill.set(q.skillKey, (seenOnSkill.get(q.skillKey) || 0) + 1);
      const t = bySkill.get(q.skillKey) || { answered: 0, right: 0 };
      t.answered++; if (correct) t.right++;
      bySkill.set(q.skillKey, t);
    }
    // The day's graded work, after its checkpoint. Production records it when the grade is final.
    const source = model !== 'BEFORE' ? isGradedPractical(unit) : null;
    let applied: DayEvent['applied'] = null;
    if (source) {
      const performance = learner.applied({ learner: learner.key, day, unit });
      const standard = passStandardOf(unit.unitCode);
      const meetsPassStandard = standard === null ? undefined : performance + 1e-9 >= standard;
      applied = { source, performance, meetsPassStandard };
      pendingGrades.push({ dueDay: source === 'PROJECT_EVALUATION' ? day + delay : day, unit, source, performance, meetsPassStandard });
    }
    // Grades that arrive today — today's auto-grade, and any project a grader has now reviewed.
    for (const g of pendingGrades.filter(x => x.dueDay === day)) {
      for (const skill of g.unit.skillKeys) {
        rows.push({ skillKey: skill, performance: g.performance, weight: APPLIED_WEIGHT(g.source), itemKey: `assignment:${g.unit.unitCode}`, source: g.source, day, meetsPassStandard: g.meetsPassStandard });
        const t = bySkill.get(skill) || { answered: 0, right: 0 };
        bySkill.set(skill, t);
      }
    }
    if (!bySkill.size) { events.push({ day, unit: unit.unitCode, unitType: unit.unitType, unmappedQuestions: unmapped, applied, moves: [], consequence: null }); continue; }

    const moves: SkillMove[] = [...bySkill].map(([skill, t]) => ({
      skill, answered: t.answered, right: t.right,
      before: beliefOf(rows.filter(r => r.skillKey === skill && r.day !== day), model),
      after: beliefOf(rows.filter(r => r.skillKey === skill), model)!,
    }));
    student = profileOf(rows, model);
    mark(day);
    let consequence: CurriculumConsequence | null = null;
    const nextSig = signature(student);
    if (nextSig !== sig && day < days) {
      sig = nextSig;
      // The day being worked is frozen with every completed day, exactly as recomposeFutureDays freezes it.
      const frozen = plan.slice(0, day);
      const fresh = compose(student, frozen, pool).units.map(u => u.unitCode).filter(c => !frozen.includes(c));
      const next = [...frozen, ...fresh.slice(0, days - day)];
      const r = consequenceOf(plan, next, day, student, audit, pool);
      consequence = r.c;
      audit = r.audit;
      r.c.backboneMissing.forEach(m => missingEver.add(m));
      plan = next;
    }
    events.push({ day, unit: unit.unitCode, unitType: unit.unitType, unmappedQuestions: unmapped, applied, moves, consequence });
  }

  const recomposed = events.filter(e => e.consequence);
  const worked = events.filter(e => e.applied);
  return {
    learner,
    model,
    initialPlan,
    finalPlan: plan,
    events,
    finalBeliefs: Object.fromEntries(FOCUS_SKILLS.map(k => [k, beliefOf(rows.filter(r => r.skillKey === k), model)])),
    firstDay,
    totals: {
      completedDaysChanged: workedPlan.filter((c, i) => plan[i] !== c).length,
      recompositions: recomposed.length,
      lessonsRemoved: recomposed.reduce((n, e) => n + e.consequence!.lessonsRemoved.length, 0),
      practiceRemoved: recomposed.reduce((n, e) => n + e.consequence!.practiceRemoved.length, 0),
      codingAssignmentsRemoved: [...new Set(CODING_ASSIGNMENT_UNITS.filter(c => initialPlan.includes(c) && !plan.includes(c)))],
      debuggingAdded: recomposed.reduce((n, e) => n + e.consequence!.debuggingAdded.length, 0),
      backboneModeChanges: recomposed.reduce((n, e) => n + e.consequence!.backboneModeChanges.length, 0),
      backboneMissingEver: [...missingEver],
      codingAssignmentsWorked: worked.filter(e => e.applied!.source === 'CODING_ASSIGNMENT').map(e => e.unit),
      appliedRows: rows.filter(r => r.source === 'CODING_ASSIGNMENT' || r.source === 'PROJECT_EVALUATION').length,
      failedApplied: worked.filter(e => e.applied!.performance < 0.5).length,
    },
    backboneInitial,
    backboneFinal: audit,
  };
}

/* ------------------------------------------------------------------ *
 * The critical case
 * ------------------------------------------------------------------ */

export interface CriticalCase {
  skill: string;
  codingUnit: string;
  /** The first day checkpoint answers alone made the skill's score and confidence VERIFIED, and the belief then. */
  day: number | null;
  answers: number;
  score: number | null;
  confidence: string | null;
  rawState: AssignmentState | null;
  effectiveState: AssignmentState | null;
  capped: boolean;
  /** BEFORE: was the skill's coding assignment still in the journey at the end? AFTER: was it actually worked? */
  codingAssignmentBefore: boolean;
  codingAssignmentAfter: boolean;
  codingAssignmentDayAfter: number | null;
  /**
   * The same skill measured STANDARD by a diagnostic (7 of 10) before the journey starts: does a plan composed from it
   * hold the coding assignment? This is the composer's compact treatment at STANDARD, which the cap reuses unchanged.
   */
  standardFromScratchKeepsCoding: boolean;
  /** Six right checkpoint answers and nothing else on the skill, composed from scratch: coding assignment in the plan? */
  sixAnswersFromScratch: { rawState: AssignmentState; effectiveState: AssignmentState; before: boolean; after: boolean };
}

/**
 * The critical case, as it happens: a beginner (real Skill Check all wrong) who has never been measured on `skill`
 * answers every checkpoint right and passes every graded piece of work (learner D). The first day their checkpoint
 * answers alone reach VERIFIED is where BEFORE removed the coding assignment; AFTER must cap the state and keep it.
 */
export function criticalCase(skill: string, codingUnit: string, pool: ComposableUnit[] = PRODUCTION): CriticalCase {
  const learner = SIM_LEARNERS.find(l => l.key === 'D_BEGINNER_ALL_RIGHT')!;
  const before = simulate(learner, 'BEFORE', FOUNDATION_PROGRAM_DAYS, pool);
  const after = simulate(learner, 'AFTER', FOUNDATION_PROGRAM_DAYS, pool);
  let moment: { day: number; b: Belief; answers: number } | null = null;
  let answers = 0;
  for (const e of after.events) {
    const m = e.moves.find(x => x.skill === skill);
    if (!m) continue;
    answers += m.answered;
    if (m.after.rawState === 'VERIFIED' && m.after.kinds.APPLIED === 0 && m.after.kinds.DIAGNOSTIC === 0) { moment = { day: e.day, b: m.after, answers }; break; }
  }
  const codingEvent = after.events.find(e => e.unit === codingUnit);
  const standardRows: EvidenceRow[] = [...beginnerPrior().filter(r => r.skillKey !== skill),
    ...Array.from({ length: 10 }, (_, i) => ({ skillKey: skill, performance: i < 7 ? 1 : 0, weight: PAPER_WEIGHT('MEDIUM'), itemKey: `paper:${skill}:${i}`, source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0 }))];
  const sixRows: EvidenceRow[] = [...beginnerPrior().filter(r => r.skillKey !== skill),
    ...Array.from({ length: 6 }, (_, i) => ({ skillKey: skill, performance: 1, weight: CHECKPOINT_WEIGHT(), itemKey: `question:${skill}:${i}`, source: 'MODULE_ASSESSMENT' as Source, day: 1 }))];
  return {
    skill, codingUnit,
    day: moment?.day ?? null, answers: moment?.answers ?? 0,
    score: moment?.b.score ?? null, confidence: moment?.b.confidence ?? null,
    rawState: moment?.b.rawState ?? null, effectiveState: moment?.b.state ?? null, capped: !!moment?.b.capped,
    codingAssignmentBefore: before.finalPlan.includes(codingUnit),
    codingAssignmentAfter: after.totals.codingAssignmentsWorked.includes(codingUnit),
    codingAssignmentDayAfter: codingEvent?.day ?? null,
    standardFromScratchKeepsCoding: compose(profileOf(standardRows, 'AFTER'), undefined, pool).units.some(u => u.unitCode === codingUnit),
    sixAnswersFromScratch: {
      rawState: beliefOf(sixRows.filter(r => r.skillKey === skill), 'BEFORE')!.state,
      effectiveState: beliefOf(sixRows.filter(r => r.skillKey === skill), 'AFTER')!.state,
      before: compose(profileOf(sixRows, 'BEFORE'), undefined, pool).units.some(u => u.unitCode === codingUnit),
      after: compose(profileOf(sixRows, 'AFTER'), undefined, pool).units.some(u => u.unitCode === codingUnit),
    },
  };
}

export const CRITICAL_CASES: [string, string][] = [
  ['CONDITIONALS_BASICS', 'T_CONDITIONS_PRACTICE'],
  ['LOOPS_BASICS', 'T_LOOPS_PRACTICE'],
  ['FUNCTIONS_BASICS', 'T_FUNCTIONS_CALL_RETURN_PRACTICE'],
  ['DSA_ARRAYS', 'T_ARRAYS_TRAVERSAL_PRACTICE'],
];

/* ------------------------------------------------------------------ *
 * The evidence-kind recomposition gate
 * ------------------------------------------------------------------ */

export interface EvidenceKindGate {
  learners: { key: string; before: SimulationResult['totals']; kinds: SimulationResult['totals']; after: SimulationResult['totals']; finalDays: number; unique: number }[];
  critical: CriticalCase[];
  lateGrades: { key: string; recompositions: number; completedDaysChanged: number; codingAssignmentsRemoved: string[] }[];
  problems: string[];
}

/**
 * What must hold for every learner once evidence has kinds, on the given inventory:
 *   - exactly ninety distinct days after every recomposition, deterministically, backbone never missing;
 *   - no skill resting on checkpoint answers and failed practicals alone is ever planned beyond STANDARD;
 *   - a learner right on every checkpoint whose practical work fails keeps every coding assignment, and is never
 *     VERIFIED on the spine; one whose work meets the pass lines is allowed what the evidence supports;
 *   - the conditions, loops and functions coding assignments survive the day checkpoints alone first make them VERIFIED;
 *   - a learner who answers everything right works all five coding assignments;
 *   - strong learners (at 70, at 78, very strong) start from the same plan and end in the same states as before kinds.
 */
export function evidenceKindGate(pool: ComposableUnit[] = PRODUCTION): EvidenceKindGate {
  const problems: string[] = [];
  const learners: EvidenceKindGate['learners'] = [];
  const lateGrades: EvidenceKindGate['lateGrades'] = [];
  for (const l of SIM_LEARNERS) {
    const before = simulate(l, 'BEFORE', FOUNDATION_PROGRAM_DAYS, pool);
    const kinds = simulate(l, 'KINDS', FOUNDATION_PROGRAM_DAYS, pool);
    const after = simulate(l, 'AFTER', FOUNDATION_PROGRAM_DAYS, pool);
    const again = simulate(l, 'AFTER', FOUNDATION_PROGRAM_DAYS, pool);
    const unique = new Set(after.finalPlan).size;
    learners.push({ key: l.key, before: before.totals, kinds: kinds.totals, after: after.totals, finalDays: after.finalPlan.length, unique });
    if (after.finalPlan.length !== FOUNDATION_PROGRAM_DAYS || unique !== FOUNDATION_PROGRAM_DAYS) problems.push(`${l.key}: ${after.finalPlan.length} days, ${unique} distinct`);
    if (again.finalPlan.join('|') !== after.finalPlan.join('|')) problems.push(`${l.key}: nondeterministic`);
    if (after.totals.backboneMissingEver.length) problems.push(`${l.key}: backbone missing ${after.totals.backboneMissingEver.join(', ')}`);
    for (const e of after.events) {
      for (const m of e.moves) {
        if (m.after.kinds.DIAGNOSTIC === 0 && m.after.qualifyingApplied === 0 && ['REVISION', 'VERIFIED'].includes(m.after.state)) {
          problems.push(`${l.key} day ${e.day}: ${m.skill} planned ${m.after.state} with nothing demonstrating it (checkpoints and failed practicals only)`);
        }
      }
    }
    if (['F_AT_70', 'G_AT_78', 'H_VERY_STRONG'].includes(l.key)) {
      if (after.initialPlan.join('|') !== before.initialPlan.join('|')) problems.push(`${l.key}: initial plan changed`);
      for (const k of FOCUS_SKILLS) {
        if (before.finalBeliefs[k]?.state !== after.finalBeliefs[k]?.state) problems.push(`${l.key}: ${k} ${before.finalBeliefs[k]?.state} → ${after.finalBeliefs[k]?.state}`);
      }
    }
    if (l.key === 'M_RECALL_RIGHT_PRACTICAL_FAILED') {
      if (after.totals.codingAssignmentsRemoved.length) problems.push(`${l.key}: coding assignments removed ${after.totals.codingAssignmentsRemoved.join(', ')}`);
      for (const k of ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS']) {
        if (['REVISION', 'VERIFIED'].includes(after.finalBeliefs[k]?.state || '')) problems.push(`${l.key}: ${k} ${after.finalBeliefs[k]?.state} after failed practical work`);
      }
    }
    if (l.key === 'D_BEGINNER_ALL_RIGHT' && after.totals.codingAssignmentsWorked.length !== CODING_ASSIGNMENT_UNITS.length) {
      problems.push(`${l.key}: worked ${after.totals.codingAssignmentsWorked.length} of ${CODING_ASSIGNMENT_UNITS.length} coding assignments`);
    }
  }
  /**
   * Project grades that arrive ten days after the work: a late grade recomposes only the future. No day already worked
   * changes, ninety distinct days remain, and backbone coverage stays whole — for a learner whose late grades pass and
   * one whose late grades fail.
   */
  for (const key of ['D_BEGINNER_ALL_RIGHT', 'M_RECALL_RIGHT_PRACTICAL_FAILED']) {
    const late = simulate(SIM_LEARNERS.find(l => l.key === key)!, 'AFTER', FOUNDATION_PROGRAM_DAYS, pool, { projectGradeDelayDays: 10 });
    if (late.totals.completedDaysChanged) problems.push(`${key} with late project grades: ${late.totals.completedDaysChanged} worked days changed`);
    if (late.finalPlan.length !== FOUNDATION_PROGRAM_DAYS || new Set(late.finalPlan).size !== FOUNDATION_PROGRAM_DAYS) problems.push(`${key} with late project grades: not ninety distinct days`);
    if (late.totals.backboneMissingEver.length) problems.push(`${key} with late project grades: backbone missing ${late.totals.backboneMissingEver.join(', ')}`);
    lateGrades.push({ key, recompositions: late.totals.recompositions, completedDaysChanged: late.totals.completedDaysChanged, codingAssignmentsRemoved: late.totals.codingAssignmentsRemoved });
  }
  for (const l of learners) if ((l.after as any).completedDaysChanged) problems.push(`${l.key}: worked days changed`);

  const critical = CRITICAL_CASES.map(([skill, unit]) => criticalCase(skill, unit, pool));
  for (const c of critical) {
    if (c.day !== null && (!c.capped || c.effectiveState !== 'STANDARD')) problems.push(`${c.skill}: not capped on day ${c.day}`);
    if (!c.codingAssignmentAfter) problems.push(`${c.skill}: ${c.codingUnit} not worked`);
  }
  return { learners, critical, lateGrades, problems };
}

/* ------------------------------------------------------------------ *
 * The evidence matrix — one skill, every mix
 * ------------------------------------------------------------------ */

export interface MatrixCase {
  key: string;
  label: string;
  score: number;
  confidence: string;
  mix: Record<EvidenceKind, number>;
  qualifyingApplied: boolean;
  rawState: AssignmentState;
  /** The state the plan uses, a0cc9f2c (any applied row lifted the cap) and now. */
  kindsState: AssignmentState;
  effectiveState: AssignmentState;
  /** The conditions units a beginner's ninety days hold, composed from this evidence, a0cc9f2c and now. */
  kindsConditions: string[];
  conditions: string[];
}

const MATRIX_SKILL = 'CONDITIONALS_BASICS';
const MATRIX_CODING_UNIT = 'T_CONDITIONS_PRACTICE';

/** Rows on CONDITIONALS_BASICS, the skill the critical case is about. Graded work is its coding assignment (pass line 60). */
const cp = (n: number, right = n): EvidenceRow[] => Array.from({ length: n }, (_, i) => ({
  skillKey: MATRIX_SKILL, performance: i < right ? 1 : 0, weight: CHECKPOINT_WEIGHT(), itemKey: `question:m${i}`, source: 'MODULE_ASSESSMENT' as Source, day: 1,
}));
const graded = (performance: number, attempt = 1): EvidenceRow => {
  const standard = passStandardOf(MATRIX_CODING_UNIT)!;
  return {
    skillKey: MATRIX_SKILL, performance, weight: APPLIED_WEIGHT('CODING_ASSIGNMENT'), itemKey: `assignment:${MATRIX_CODING_UNIT}`,
    source: 'CODING_ASSIGNMENT', day: 1 + attempt, meetsPassStandard: performance + 1e-9 >= standard,
  };
};
const sitting = (n: number, right: number, tag: string): EvidenceRow[] => Array.from({ length: n }, (_, i) => ({
  skillKey: MATRIX_SKILL, performance: i < right ? 1 : 0, weight: PAPER_WEIGHT(['EASY', 'MEDIUM', 'MEDIUM', 'HARD'][i % 4]), itemKey: `paper:${tag}:${i}`,
  source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0,
}));

export const MATRIX: { key: string; label: string; rows: () => EvidenceRow[] }[] = [
  { key: '1', label: 'understanding only, all correct (18 answers)', rows: () => cp(18) },
  { key: '2', label: 'understanding only, mixed (12 of 18)', rows: () => cp(18, 12) },
  { key: '3', label: 'understanding (18 right) + applied 20%', rows: () => [...cp(18), graded(0.2)] },
  { key: '4', label: 'understanding (18 right) + applied 59% (just below the pass line of 60)', rows: () => [...cp(18), graded(0.59)] },
  { key: '5', label: 'understanding (18 right) + applied 60% (exactly the pass line)', rows: () => [...cp(18), graded(0.6)] },
  { key: '6', label: 'understanding (18 right) + applied 95%', rows: () => [...cp(18), graded(0.95)] },
  { key: '7', label: 'understanding (18 right) + applied 20%, then a later attempt at 90%', rows: () => [...cp(18), graded(0.2, 1), graded(0.9, 2)] },
  { key: '8', label: 'understanding (18 right) + applied 90%, then a later attempt at 20%', rows: () => [...cp(18), graded(0.9, 1), graded(0.2, 2)] },
  { key: '9', label: 'diagnostic strong (8 of 8) + applied 20%', rows: () => [...sitting(8, 8, 'd'), graded(0.2)] },
  { key: '10', label: 'diagnostic weak (0 of 8) + applied 90%', rows: () => [...sitting(8, 0, 'd'), graded(0.9)] },
  { key: '11', label: 'diagnostic weak (0 of 8) + applied 90% on five attempts', rows: () => [...sitting(8, 0, 'd'), ...[1, 2, 3, 4, 5].map(a => graded(0.9, a))] },
  { key: '12', label: 'reassessment improvement (0 of 8, then 8 of 8)', rows: () => [...sitting(8, 0, 'd'), ...sitting(8, 8, 'r')] },
  { key: '13', label: 'reassessment decline (8 of 8, then 0 of 8)', rows: () => [...sitting(8, 8, 'd'), ...sitting(8, 0, 'r')] },
];

export function evidenceMatrix(pool: ComposableUnit[] = PRODUCTION): MatrixCase[] {
  return MATRIX.map(m => {
    const rows = m.rows();
    const kinds = beliefOf(rows, 'KINDS')!;
    const after = beliefOf(rows, 'AFTER')!;
    const conditionsOf = (model: Model) => {
      const all = [...beginnerPrior().filter(r => r.skillKey !== MATRIX_SKILL), ...rows];
      return compose(profileOf(all, model), undefined, pool).units.map(u => u.unitCode).filter(c => c.startsWith('T_CONDITIONS_'))
        .map(c => c.replace('T_CONDITIONS_', ''));
    };
    return {
      key: m.key, label: m.label, score: after.score, confidence: after.confidence, mix: after.kinds,
      qualifyingApplied: after.qualifyingApplied > 0, rawState: after.rawState, kindsState: kinds.state, effectiveState: after.state,
      kindsConditions: conditionsOf('KINDS'), conditions: conditionsOf('AFTER'),
    };
  });
}

/* ------------------------------------------------------------------ *
 * The diagnostic anchor — how many later observations move a measured skill
 * ------------------------------------------------------------------ */

export interface AnchorCase {
  key: string; label: string; start: { score: number; state: AssignmentState };
  /** Observations at which each state is first planned. */
  firstAt: Partial<Record<AssignmentState, number>>;
  /** Score and state after 1, 3, 6, 12, 20 and 40 observations (where the stream runs that long). */
  trajectory: { n: number; score: number; state: AssignmentState }[];
}

/**
 * A prior, then a stream of later observations one at a time; the number of observations at which each state is first
 * planned (AFTER). Streams: checkpoint answers (0.5), graded coding work (1.0), a whole Skill Check sitting (8 items).
 */
export function anchorAudit(): AnchorCase[] {
  const run = (key: string, label: string, prior: EvidenceRow[], next: (i: number) => EvidenceRow[], max = 80): AnchorCase => {
    const rows = [...prior];
    const b0 = beliefOf(rows, 'AFTER')!;
    const firstAt: Partial<Record<AssignmentState, number>> = {};
    const trajectory: AnchorCase['trajectory'] = [];
    for (let n = 1; n <= max; n++) {
      rows.push(...next(n));
      const b = beliefOf(rows, 'AFTER')!;
      if (b.state !== b0.state && firstAt[b.state] === undefined) firstAt[b.state] = n;
      if ([1, 3, 6, 12, 20, 40].includes(n)) trajectory.push({ n, score: b.score, state: b.state });
    }
    return { key, label, start: { score: b0.score, state: b0.state }, firstAt, trajectory };
  };
  const checkpoint = (perf: number) => (i: number): EvidenceRow[] => [{ skillKey: MATRIX_SKILL, performance: perf, weight: CHECKPOINT_WEIGHT(), itemKey: `question:a${i}`, source: 'MODULE_ASSESSMENT', day: i }];
  const work = (perf: number) => (i: number): EvidenceRow[] => [{ ...graded(perf, i), itemKey: `assignment:a${i}` }];
  const alternating = (perf: number) => (i: number): EvidenceRow[] => (i % 3 === 0 ? work(perf)(i) : checkpoint(perf)(i));
  return [
    run('A1', 'diagnostic 0 of 8 → checkpoints all right', sitting(8, 0, 'd'), checkpoint(1)),
    run('A2', 'diagnostic 0 of 8 → coursework all right (two checkpoints, then a passed practical at 100%)', sitting(8, 0, 'd'), alternating(1)),
    run('B1', 'diagnostic 8 of 8 → checkpoints all wrong', sitting(8, 8, 'd'), checkpoint(0)),
    run('B2', 'diagnostic 8 of 8 → coursework all failed (two wrong checkpoints, then a practical at 20%)', sitting(8, 8, 'd'), i => (i % 3 === 0 ? work(0.2)(i) : checkpoint(0)(i))),
    run('C', 'diagnostic 4 of 8 → improving coursework (all right)', sitting(8, 4, 'd'), alternating(1)),
    run('D', 'diagnostic 4 of 8 → declining coursework (all wrong, practicals 0%)', sitting(8, 4, 'd'), alternating(0)),
    run('E', 'diagnostic 0 of 8 → reassessments of 8 of 8 (observations counted in sittings)', sitting(8, 0, 'd'), i => sitting(8, 8, `r${i}`), 12),
    run('F', 'diagnostic 8 of 8 → reassessments of 0 of 8 (observations counted in sittings)', sitting(8, 8, 'd'), i => sitting(8, 0, `r${i}`), 12),
  ];
}

/* ------------------------------------------------------------------ *
 * Question supply — can coursework legitimately move each skill?
 * ------------------------------------------------------------------ */

export interface SupplyCase {
  skill: string;
  checkpointQuestions: number;
  gradedPracticals: string[];
  /** Every checkpoint right and every practical passed at 100%, from a Skill Check of 0 on the skill (if the paper measures it) and from nothing. */
  fromZeroDiagnostic: { score: number; confidence: string; state: AssignmentState } | null;
  fromUnmeasured: { score: number; confidence: string; state: AssignmentState };
}

export function supplyAudit(skills = ['PROGRAMMING_FUNDAMENTALS', 'SHELL_COMMANDS', 'DSA_ARRAYS', 'SQL_BASICS'], pool: ComposableUnit[] = PRODUCTION): SupplyCase[] {
  const questions = (CHECKPOINTS as any).units.flatMap((u: any) => u.questions);
  return skills.map(skill => {
    const cps: EvidenceRow[] = questions.filter((q: any) => q.skillKey === skill).map((q: any) => ({
      skillKey: skill, performance: 1, weight: CHECKPOINT_WEIGHT(q.difficulty), itemKey: `question:${q.id}`, source: 'MODULE_ASSESSMENT' as Source, day: 1,
    }));
    const practicals = pool.filter(u => isGradedPractical(u) && u.skillKeys.includes(skill)).map(u => u.unitCode);
    const work: EvidenceRow[] = practicals.map(c => ({
      skillKey: skill, performance: 1, weight: APPLIED_WEIGHT(isGradedPractical(pool.find(u => u.unitCode === c)!)!), itemKey: `assignment:${c}`,
      source: isGradedPractical(pool.find(u => u.unitCode === c)!)!, day: 2, meetsPassStandard: true,
    }));
    const paper = skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 0), skill);
    const pick = (b: Belief | null) => (b ? { score: b.score, confidence: b.confidence, state: b.state } : null);
    return {
      skill, checkpointQuestions: cps.length, gradedPracticals: practicals,
      fromZeroDiagnostic: paper.length ? pick(beliefOf([...paper, ...cps, ...work], 'AFTER')) : null,
      fromUnmeasured: pick(beliefOf([...cps, ...work], 'AFTER'))!,
    };
  });
}

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
 * retaken); unmapped questions write nothing; practice, debugging, projects and coding assignments write nothing; every
 * row counts forever, with no recency. A recomposition runs whenever the evidence changes anything the composer reads
 * (a skill's state, or whether its confidence is enough to skip) — production recomposes after every checkpoint, and a
 * composition whose inputs have not changed is identical, so this is exact.
 */

import crypto from 'crypto';
import READY_JSON from '../fixtures/phase21/ready-inventory.json';
import SETS from '../fixtures/phase21/publish-sets.json';
import CHECKPOINTS from '../fixtures/evidence/checkpoint-questions.json';
import { aggregate, evidenceWeightFor } from '../../data/skillDnaPolicy';
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

export type Source = 'PERSONALIZED_ASSESSMENT' | 'MODULE_ASSESSMENT';
export interface EvidenceRow { skillKey: string; performance: number; weight: number; itemKey: string; source: Source; day: number }
export interface Belief { score: number; confidence: 'LOW' | 'MEDIUM' | 'HIGH'; state: AssignmentState; weight: number; items: number }

const CHECKPOINT_WEIGHT = (difficulty = 'MEDIUM') => evidenceWeightFor({ relationship: 'PRIMARY', difficulty, sourceType: 'MODULE_ASSESSMENT' });
const PAPER_WEIGHT = (difficulty: string) => evidenceWeightFor({ relationship: 'PRIMARY', difficulty, sourceType: 'PERSONALIZED_ASSESSMENT' });

export function beliefOf(rows: EvidenceRow[]): Belief | null {
  if (!rows.length) return null;
  const r = aggregate(rows.map(x => ({ performance: x.performance, evidenceWeight: x.weight, itemKey: x.itemKey })));
  return { score: r.score, confidence: r.confidence, state: stateForScore({ score: r.score, confidence: r.confidence }), weight: r.effectiveEvidenceWeight, items: r.distinctItems };
}

export function profileOf(rows: EvidenceRow[]): StudentProfile {
  const bySkill = new Map<string, EvidenceRow[]>();
  for (const r of rows) bySkill.set(r.skillKey, [...(bySkill.get(r.skillKey) || []), r]);
  const skills = new Map<string, SkillBelief>();
  for (const [k, rs] of bySkill) { const b = beliefOf(rs)!; skills.set(k, { score: b.score, confidence: b.confidence }); }
  return { skills, primaryDirection: null, directionStatus: 'UNDECIDED' };
}

/* ------------------------------------------------------------------ *
 * Question-level analysis
 * ------------------------------------------------------------------ */

export interface TransitionStep { answers: number; score: number; confidence: string; state: AssignmentState }

/** Consecutive checkpoint answers of one kind (all right or all wrong) on top of a prior, and where the state moves. */
export function answerLadder(prior: EvidenceRow[], correct: boolean, max = 80, difficulty = 'MEDIUM'): TransitionStep[] {
  const rows = [...prior];
  const steps: TransitionStep[] = [];
  const at = (n: number) => { const b = beliefOf(rows); steps.push({ answers: n, score: b?.score ?? NaN, confidence: b?.confidence ?? 'NONE', state: b?.state ?? 'NOT_EXPOSED' }); };
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
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.3 },
  { key: 'B_BEGINNER_LEARNS', note: 'real Skill Check all wrong; each skill starts at 30% and gains 10 points per checkpoint answer on it, to 95%', prior: beginnerPrior,
    answers: c => hash01(`${c.learner}:${c.questionId}`) < Math.min(0.95, 0.3 + 0.1 * c.seenOnSkill) },
  { key: 'C_BEGINNER_LESSONS_ONLY', note: 'real Skill Check all wrong; every lesson checkpoint right, every checkpoint on a practice, debugging or project day wrong; coding assignments failed', prior: beginnerPrior,
    answers: c => !PRACTICAL_TYPES.includes(c.unit.unitType) },
  { key: 'D_BEGINNER_ALL_RIGHT', note: 'real Skill Check all wrong; every checkpoint right; coding assignments passed', prior: beginnerPrior,
    answers: () => true },
  { key: 'E_PARTIAL', note: 'real Skill Check partial (PROGRAMMING_FUNDAMENTALS 46 MEDIUM); checkpoints at about 70%', prior: () => skillCheckRows([0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0]),
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.7 },
  { key: 'F_AT_70', note: 'every universal skill measured 7 of 10 (70, HIGH); checkpoints at about 70%', prior: universalPrior(7, 10),
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.7 },
  { key: 'G_AT_78', note: 'every universal skill measured 14 of 18 (78, HIGH); checkpoints at about 80%', prior: universalPrior(14, 18),
    answers: c => hash01(`${c.learner}:${c.questionId}`) < 0.8 },
  { key: 'H_VERY_STRONG', note: 'the 39 diagnostic skills, 8 paper items each, 89–100 HIGH; checkpoints right except about 1 in 12', prior: () => diagnosticSkills().flatMap((k, i) => [0, 1, 2, 3, 4, 5, 6, 7].map(j => ({
    skillKey: k, performance: i % 3 === 0 && j === 0 ? 0 : 1, weight: PAPER_WEIGHT(['EASY', 'MEDIUM', 'MEDIUM', 'HARD'][j % 4]), itemKey: `paper:${k}:${j}`, source: 'PERSONALIZED_ASSESSMENT' as Source, day: 0,
  }))), answers: c => hash01(`${c.learner}:${c.questionId}`) >= 1 / 12 },
  { key: 'I_ALWAYS_OPTION_A', note: 'real Skill Check all wrong; always picks the first option shown, under the per-student stable shuffle', prior: beginnerPrior,
    // Every stored question keeps its correct option first; the student sees stableShuffle(options, `${student}:${question}`).
    answers: c => stableShuffle(Array.from({ length: c.optionCount }, (_, i) => i), `${c.learner}:${c.questionId}`)[0] === 0 },
  { key: 'J_ALTERNATING', note: 'real Skill Check all wrong; right, wrong, right, wrong across every answer', prior: beginnerPrior,
    answers: c => c.answerIndex % 2 === 0 },
  { key: 'K_WRONG_THEN_RIGHT', note: 'real Skill Check all wrong; every checkpoint wrong until day 20, every one right after', prior: beginnerPrior,
    answers: c => c.day > 20 },
  { key: 'L_RIGHT_THEN_WRONG', note: 'real Skill Check all wrong; every checkpoint right until day 30, every one wrong after', prior: beginnerPrior,
    answers: c => c.day <= 30 },
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
export interface DayEvent { day: number; unit: string; unitType: string; unmappedQuestions: number; moves: SkillMove[]; consequence: CurriculumConsequence | null }
export interface SimulationResult {
  learner: SimLearner;
  initialPlan: string[];
  finalPlan: string[];
  events: DayEvent[];
  finalBeliefs: Record<string, Belief | null>;
  firstDay: Record<string, Partial<Record<AssignmentState, number>>>;
  totals: { recompositions: number; lessonsRemoved: number; practiceRemoved: number; codingAssignmentsRemoved: string[]; debuggingAdded: number; backboneModeChanges: number; backboneMissingEver: string[] };
  backboneInitial: BackboneAudit;
  backboneFinal: BackboneAudit;
}

const signature = (p: StudentProfile): string => [...p.skills.entries()].sort(([a], [b]) => a.localeCompare(b))
  .map(([k, b]) => `${k}:${stateForScore({ score: b.score, confidence: b.confidence })}:${isConfidentEnough(b.confidence as any) ? 1 : 0}`).join('|');

const compose = (student: StudentProfile, history?: string[]) =>
  composeUnits({ candidates: PRODUCTION, targetUnits: FOUNDATION_PROGRAM_DAYS, student, history });

function consequenceOf(oldPlan: string[], newPlan: string[], day: number, student: StudentProfile, oldAudit: BackboneAudit): { c: CurriculumConsequence; audit: BackboneAudit } {
  const oldFuture = new Set(oldPlan.slice(day));
  const newFuture = new Set(newPlan.slice(day));
  const typeOf = (c: string) => byCode.get(c)?.unitType;
  const removed = [...oldFuture].filter(c => !newFuture.has(c));
  const added = [...newFuture].filter(c => !oldFuture.has(c));
  const audit = auditBackbone(newPlan, PRODUCTION, student);
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

export function simulate(learner: SimLearner, days = FOUNDATION_PROGRAM_DAYS): SimulationResult {
  const rows: EvidenceRow[] = learner.prior();
  let student = profileOf(rows);
  let plan = compose(student).units.map(u => u.unitCode);
  const initialPlan = [...plan];
  const backboneInitial = auditBackbone(plan, PRODUCTION, student);
  let audit = backboneInitial;
  let sig = signature(student);
  const events: DayEvent[] = [];
  const seenOnSkill = new Map<string, number>();
  const firstDay: Record<string, Partial<Record<AssignmentState, number>>> = {};
  let answerIndex = 0;
  const missingEver = new Set<string>();

  const mark = (day: number) => {
    for (const [k, b] of student.skills) {
      const s = stateForScore({ score: b.score, confidence: b.confidence });
      firstDay[k] = firstDay[k] || {};
      if (firstDay[k][s] === undefined) firstDay[k][s] = day;
    }
  };
  mark(0);

  for (let day = 1; day <= days; day++) {
    const unit = byCode.get(plan[day - 1])!;
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
    if (!bySkill.size) { events.push({ day, unit: unit.unitCode, unitType: unit.unitType, unmappedQuestions: unmapped, moves: [], consequence: null }); continue; }

    const moves: SkillMove[] = [...bySkill].map(([skill, t]) => ({
      skill, answered: t.answered, right: t.right,
      before: beliefOf(rows.filter(r => r.skillKey === skill && !(r.day === day && r.source === 'MODULE_ASSESSMENT'))),
      after: beliefOf(rows.filter(r => r.skillKey === skill))!,
    }));
    student = profileOf(rows);
    mark(day);
    let consequence: CurriculumConsequence | null = null;
    const nextSig = signature(student);
    if (nextSig !== sig && day < days) {
      sig = nextSig;
      // The day being worked is frozen with every completed day, exactly as recomposeFutureDays freezes it.
      const frozen = plan.slice(0, day);
      const fresh = compose(student, frozen).units.map(u => u.unitCode).filter(c => !frozen.includes(c));
      const next = [...frozen, ...fresh.slice(0, days - day)];
      const r = consequenceOf(plan, next, day, student, audit);
      consequence = r.c;
      audit = r.audit;
      r.c.backboneMissing.forEach(m => missingEver.add(m));
      plan = next;
    }
    events.push({ day, unit: unit.unitCode, unitType: unit.unitType, unmappedQuestions: unmapped, moves, consequence });
  }

  const recomposed = events.filter(e => e.consequence);
  return {
    learner,
    initialPlan,
    finalPlan: plan,
    events,
    finalBeliefs: Object.fromEntries(FOCUS_SKILLS.map(k => [k, beliefOf(rows.filter(r => r.skillKey === k))])),
    firstDay,
    totals: {
      recompositions: recomposed.length,
      lessonsRemoved: recomposed.reduce((n, e) => n + e.consequence!.lessonsRemoved.length, 0),
      practiceRemoved: recomposed.reduce((n, e) => n + e.consequence!.practiceRemoved.length, 0),
      codingAssignmentsRemoved: [...new Set(CODING_ASSIGNMENT_UNITS.filter(c => initialPlan.includes(c) && !plan.includes(c)))],
      debuggingAdded: recomposed.reduce((n, e) => n + e.consequence!.debuggingAdded.length, 0),
      backboneModeChanges: recomposed.reduce((n, e) => n + e.consequence!.backboneModeChanges.length, 0),
      backboneMissingEver: [...missingEver],
    },
    backboneInitial,
    backboneFinal: audit,
  };
}

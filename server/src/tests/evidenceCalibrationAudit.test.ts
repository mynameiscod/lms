/**
 * Skill DNA evidence calibration — CHARACTERIZATION, not a specification.
 *
 * These tests pin how evidence behaves, as measured by the calibration audit (docs/audit/skill-dna-evidence-
 * calibration.md), so any future change to weights, thresholds or evidence sources is made knowingly and shows up
 * here. Models are pinned side by side: BEFORE (58b248b6 — no evidence kinds, no applied evidence), KINDS (a0cc9f2c —
 * any applied row lifted the understanding-only cap) and AFTER (production now — only a diagnostic or graded work that
 * met its assignment's pass line lifts it).
 * A failing assertion after a deliberate calibration change is expected: update it with the decision.
 */

import fs from 'fs';
import path from 'path';
import {
  answerLadder, firstReached, skillCheckRows, SIM_LEARNERS, simulate, CODING_ASSIGNMENT_UNITS, EvidenceRow,
  SimulationResult, Model, criticalCase, evidenceMatrix, anchorAudit,
} from './evidenceCalibration/simulator';
import { REAL_SKILL_CHECK_PAPER } from '../services/composerCertificationService';
import { aggregate, evidenceWeightFor } from '../data/skillDnaPolicy';
import CHECKPOINTS from './fixtures/evidence/checkpoint-questions.json';

const cache = new Map<string, SimulationResult>();
const run = (key: string, model: Model) => {
  const k = `${key}:${model}`;
  if (!cache.has(k)) cache.set(k, simulate(SIM_LEARNERS.find(l => l.key === key)!, model));
  return cache.get(k)!;
};
const primaryQuestions = (skill: string) => (CHECKPOINTS as any).units.flatMap((u: any) => u.questions).filter((q: any) => q.skillKey === skill).length;
const SPINE = ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS'];

describe('the evidence pipeline', () => {
  it('only four services write Skill DNA evidence: the Skill Check, checkpoints, mock interviews, and graded assignment work', () => {
    const root = path.join(__dirname, '..');
    const writers: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = path.join(dir, f);
        if (fs.statSync(p).isDirectory()) { if (!['tests', 'scripts', 'seeds'].includes(f)) walk(p); continue; }
        if (!p.endsWith('.ts')) continue;
        if (/StudentSkillEvidence\.(bulkWrite|create|insertMany|updateOne|updateMany|findOneAndUpdate)/.test(fs.readFileSync(p, 'utf8'))) writers.push(path.relative(root, p).replace(/\\/g, '/'));
      }
    };
    walk(root);
    expect(writers.sort()).toEqual([
      'services/appliedEvidenceService.ts', 'services/interviewIntelligenceService.ts', 'services/moduleAssessmentEvidenceService.ts',
      'services/skillDnaService.ts',
    ]);
  });

  it('assignment work reaches Skill DNA only through the applied evidence service, after a final grade', () => {
    const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    for (const f of ['services/submissionService.ts', 'controllers/submissionController.ts']) {
      expect({ f, direct: /StudentSkillEvidence|recomputeStudentSkills|projectModuleAssessment/.test(src(f)) }).toEqual({ f, direct: false });
    }
    // Two calls: the final auto-grade in submitCoding, and the authorised grade.
    expect(src('services/submissionService.ts').match(/scheduleAppliedEvidence\(/g)).toHaveLength(2);
    expect(src('controllers/submissionController.ts')).not.toMatch(/AppliedEvidence|recordAppliedEvaluation/);
  });

  it('weighs a checkpoint answer at half a Skill Check item, and every checkpoint question is MEDIUM, single-answer, not retakeable', () => {
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'MODULE_ASSESSMENT' })).toBe(0.5);
    expect(evidenceWeightFor({ relationship: 'PRIMARY', difficulty: 'MEDIUM', sourceType: 'PERSONALIZED_ASSESSMENT' })).toBe(1);
    const units = (CHECKPOINTS as any).units;
    expect(units.every((u: any) => u.retakeable === false)).toBe(true);
    expect(units.flatMap((u: any) => u.questions).every((q: any) => q.difficulty === 'MEDIUM' && q.marks === 1)).toBe(true);
  });

  it('has no recency: the same observations in any order give the same score and confidence', () => {
    const rows = [1, 0, 1, 1, 0, 1, 1, 1].map((p, i) => ({ performance: p, evidenceWeight: 0.5 + (i % 3) * 0.25, itemKey: `i${i}` }));
    expect(aggregate([...rows].reverse())).toEqual(aggregate(rows));
  });
});

describe('answers needed to move a state', () => {
  it('BEFORE: an unmeasured skill is STANDARD after one right checkpoint answer (capped by LOW) and VERIFIED after six (MEDIUM)', () => {
    const f = firstReached(answerLadder([], true, 80, 'MEDIUM', 'BEFORE'));
    expect(f.states).toMatchObject({ STANDARD: 1, VERIFIED: 6 });
    expect(f.states.REVISION).toBeUndefined();
    expect(f.confidence).toMatchObject({ LOW: 1, MEDIUM: 6, HIGH: 14 });
    expect(firstReached(answerLadder([], false, 80, 'MEDIUM', 'BEFORE')).states).toMatchObject({ FOUNDATION_REQUIRED: 1 });
  });

  it('AFTER: checkpoint answers alone never take an unmeasured skill past STANDARD; confidence moves exactly as before', () => {
    const f = firstReached(answerLadder([], true));
    expect(f.states).toEqual({ NOT_EXPOSED: 0, STANDARD: 1 });
    expect(f.confidence).toMatchObject({ LOW: 1, MEDIUM: 6, HIGH: 14 });
  });

  it('a skill the Skill Check measured at 0 needs 41 right answers to be VERIFIED under both models — the diagnostic lifts the cap', () => {
    const prior: EvidenceRow[] = skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 0), 'PROGRAMMING_FUNDAMENTALS');
    for (const model of ['BEFORE', 'AFTER'] as Model[]) {
      expect(firstReached(answerLadder(prior, true, 80, 'MEDIUM', model)).states).toMatchObject({ GUIDED: 5, STANDARD: 11, REVISION: 22, VERIFIED: 41 });
    }
    expect(primaryQuestions('PROGRAMMING_FUNDAMENTALS')).toBe(9);
    expect(primaryQuestions('SQL_BASICS')).toBe(4);
  });
});

describe('what realistic learners experience', () => {
  it('never loses a mandatory backbone requirement, whatever the evidence, under either model', () => {
    for (const l of SIM_LEARNERS) {
      for (const model of ['BEFORE', 'AFTER'] as Model[]) {
        expect({ key: l.key, model, missing: run(l.key, model).totals.backboneMissingEver }).toEqual({ key: l.key, model, missing: [] });
      }
    }
  });

  it('BEFORE: a beginner who answers every checkpoint right is VERIFIED on conditions, loops and functions from checkpoints alone, and loses those coding assignments', () => {
    const r = run('D_BEGINNER_ALL_RIGHT', 'BEFORE');
    for (const k of SPINE) expect({ k, state: r.finalBeliefs[k]!.state, confidence: r.finalBeliefs[k]!.confidence }).toEqual({ k, state: 'VERIFIED', confidence: 'MEDIUM' });
    expect(r.totals.codingAssignmentsRemoved.sort()).toEqual(['T_CONDITIONS_PRACTICE', 'T_FUNCTIONS_CALL_RETURN_PRACTICE', 'T_LOOPS_PRACTICE']);
    expect(r.finalBeliefs.PROGRAMMING_FUNDAMENTALS!.state).toBe('GUIDED');
  });

  it('AFTER: the same beginner keeps and works every coding assignment, and is VERIFIED once the work is graded', () => {
    const r = run('D_BEGINNER_ALL_RIGHT', 'AFTER');
    expect(r.totals.codingAssignmentsRemoved).toEqual([]);
    expect(r.totals.codingAssignmentsWorked.sort()).toEqual([...CODING_ASSIGNMENT_UNITS].sort());
    for (const k of SPINE) {
      const b = r.finalBeliefs[k]!;
      expect({ k, state: b.state, capped: b.capped, applied: b.kinds.APPLIED > 0 }).toEqual({ k, state: 'VERIFIED', capped: false, applied: true });
    }
  });

  it('the critical case: six right checkpoint answers are 100, MEDIUM, VERIFIED by score, planned at STANDARD — and the coding assignment remains', () => {
    for (const [skill, unit] of [['CONDITIONALS_BASICS', 'T_CONDITIONS_PRACTICE'], ['LOOPS_BASICS', 'T_LOOPS_PRACTICE'], ['FUNCTIONS_BASICS', 'T_FUNCTIONS_CALL_RETURN_PRACTICE']]) {
      const c = criticalCase(skill, unit);
      expect({ skill, answers: c.answers, score: c.score, confidence: c.confidence, raw: c.rawState, effective: c.effectiveState, capped: c.capped, before: c.codingAssignmentBefore, after: c.codingAssignmentAfter })
        .toEqual({ skill, answers: 6, score: 100, confidence: 'MEDIUM', raw: 'VERIFIED', effective: 'STANDARD', capped: true, before: false, after: true });
      expect(c.codingAssignmentDayAfter!).toBeGreaterThan(c.day!);
    }
    // Arrays has too few mapped checkpoint questions before its assignment to reach MEDIUM: never at risk in the journey.
    const arrays = criticalCase('DSA_ARRAYS', 'T_ARRAYS_TRAVERSAL_PRACTICE');
    expect({ day: arrays.day, before: arrays.codingAssignmentBefore, after: arrays.codingAssignmentAfter }).toEqual({ day: null, before: true, after: true });
    expect(arrays.sixAnswersFromScratch).toEqual({ rawState: 'VERIFIED', effectiveState: 'STANDARD', before: false, after: true });
  });

  it('BEFORE: a learner right on lessons and wrong on practical work is VERIFIED on functions without demonstrating it', () => {
    const r = run('C_BEGINNER_LESSONS_ONLY', 'BEFORE');
    expect(r.finalBeliefs.FUNCTIONS_BASICS!.state).toBe('VERIFIED');
    expect(r.totals.codingAssignmentsRemoved).toContain('T_FUNCTIONS_CALL_RETURN_PRACTICE');
  });

  it('AFTER: the same learner keeps the practical work, and failed grades pull the skills down at full weight', () => {
    const before = run('C_BEGINNER_LESSONS_ONLY', 'BEFORE');
    const r = run('C_BEGINNER_LESSONS_ONLY', 'AFTER');
    expect(r.totals.codingAssignmentsRemoved).toEqual([]);
    expect(r.totals.failedApplied).toBeGreaterThan(0);
    expect(r.finalBeliefs.FUNCTIONS_BASICS!.state).toBe('GUIDED');
    for (const k of SPINE) expect({ k, lower: r.finalBeliefs[k]!.score < before.finalBeliefs[k]!.score }).toEqual({ k, lower: true });
  });

  it('guessing the first option shown never makes a focus skill better than GUIDED', () => {
    for (const model of ['BEFORE', 'AFTER'] as Model[]) {
      for (const [k, b] of Object.entries(run('I_ALWAYS_OPTION_A', model).finalBeliefs)) {
        if (b) expect({ model, k, ok: ['FOUNDATION_REQUIRED', 'GUIDED'].includes(b.state) }).toEqual({ model, k, ok: true });
      }
    }
  });

  it('strong learners are anchored by their diagnostic: no cap, no regression, compressed exactly as before', () => {
    for (const model of ['BEFORE', 'AFTER'] as Model[]) {
      expect(Object.values(run('F_AT_70', model).finalBeliefs).filter(b => b && b.state === 'VERIFIED')).toHaveLength(0);
      const g = run('G_AT_78', model);
      expect(Object.values(g.finalBeliefs).every(b => b && b.state === 'REVISION')).toBe(true);
      const h = run('H_VERY_STRONG', model);
      expect(Object.values(h.finalBeliefs).every(b => b && b.state === 'VERIFIED' && !b.capped)).toBe(true);
      expect(CODING_ASSIGNMENT_UNITS.filter(c => h.initialPlan.includes(c))).toEqual([]);
    }
    expect(run('H_VERY_STRONG', 'AFTER').initialPlan).toEqual(run('H_VERY_STRONG', 'BEFORE').initialPlan);
  });

  it('is deterministic', () => {
    const again = simulate(SIM_LEARNERS.find(l => l.key === 'E_PARTIAL')!, 'AFTER');
    expect(again.finalPlan).toEqual(run('E_PARTIAL', 'AFTER').finalPlan);
  });
});

describe('failed practical work is evidence, not a demonstration', () => {
  it('a learner right on every checkpoint whose practicals all fail: a0cc9f2c let the failure lift the cap; now it does not', () => {
    const kinds = run('M_RECALL_RIGHT_PRACTICAL_FAILED', 'KINDS');
    const after = run('M_RECALL_RIGHT_PRACTICAL_FAILED', 'AFTER');
    expect(['CONDITIONALS_BASICS', 'FUNCTIONS_BASICS'].map(k => kinds.finalBeliefs[k]!.state)).toEqual(['VERIFIED', 'VERIFIED']);
    for (const k of SPINE) {
      expect({ k, state: after.finalBeliefs[k]!.state, capped: after.finalBeliefs[k]!.capped, score: after.finalBeliefs[k]!.score })
        .toEqual({ k, state: 'STANDARD', capped: true, score: kinds.finalBeliefs[k]!.score });
    }
    expect(after.totals.codingAssignmentsRemoved).toEqual([]);
    expect(after.totals.failedApplied).toBeGreaterThan(0);
  });

  it('a learner whose practicals meet the pass lines keeps what the evidence supports', () => {
    const r = run('N_RECALL_RIGHT_PRACTICAL_AT_PASS', 'AFTER');
    for (const k of SPINE) expect({ k, capped: r.finalBeliefs[k]!.capped, qualifying: r.finalBeliefs[k]!.qualifyingApplied > 0 }).toEqual({ k, capped: false, qualifying: true });
    expect(r.totals.backboneMissingEver).toEqual([]);
  });

  it('the evidence matrix on one skill', () => {
    const m = new Map(evidenceMatrix().map(c => [c.key, c]));
    const row = (k: string) => { const c = m.get(k)!; return [c.score, c.confidence, c.qualifyingApplied, c.rawState, c.kindsState, c.effectiveState]; };
    expect(row('1')).toEqual([100, 'HIGH', false, 'VERIFIED', 'STANDARD', 'STANDARD']);
    expect(row('2')).toEqual([67, 'HIGH', false, 'STANDARD', 'STANDARD', 'STANDARD']);
    expect(row('3')).toEqual([92, 'HIGH', false, 'VERIFIED', 'VERIFIED', 'STANDARD']);
    expect(row('4')).toEqual([96, 'HIGH', false, 'VERIFIED', 'VERIFIED', 'STANDARD']);
    expect(row('5')).toEqual([96, 'HIGH', true, 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(row('6')).toEqual([99, 'HIGH', true, 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(row('7')).toEqual([92, 'HIGH', true, 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(row('8')).toEqual(row('7'));
    expect(row('9')).toEqual([91, 'HIGH', false, 'VERIFIED', 'VERIFIED', 'VERIFIED']);
    expect(row('10')).toEqual([10, 'HIGH', true, 'FOUNDATION_REQUIRED', 'FOUNDATION_REQUIRED', 'FOUNDATION_REQUIRED']);
    expect(row('11')).toEqual([35, 'HIGH', true, 'FOUNDATION_REQUIRED', 'FOUNDATION_REQUIRED', 'FOUNDATION_REQUIRED']);
    expect(row('12')).toEqual([50, 'HIGH', false, 'GUIDED', 'GUIDED', 'GUIDED']);
    expect(row('13')).toEqual(row('12'));
    // Curriculum: a failed practical no longer buys the VERIFIED treatment (debugging plus the mini project).
    expect(m.get('3')!.kindsConditions).toEqual(['DEBUGGING', 'MINI_PROJECT']);
    expect(m.get('3')!.conditions).toEqual(['DEBUGGING']);
    expect(m.get('5')!.conditions).toEqual(['DEBUGGING', 'MINI_PROJECT']);
  });
});

describe('the diagnostic anchor, measured (no recency is implemented)', () => {
  it('observations needed to move a measured skill', () => {
    const a = new Map(anchorAudit().map(c => [c.key, c.firstAt]));
    expect(a.get('A1')).toEqual({ GUIDED: 11, STANDARD: 24, REVISION: 47 });
    expect(a.get('A2')).toEqual({ GUIDED: 9, STANDARD: 18, REVISION: 36, VERIFIED: 66 });
    expect(a.get('B1')).toEqual({ REVISION: 3, STANDARD: 6, GUIDED: 11, FOUNDATION_REQUIRED: 25 });
    expect(a.get('C')).toEqual({ STANDARD: 3, REVISION: 12, VERIFIED: 27 });
    expect(a.get('D')).toEqual({ FOUNDATION_REQUIRED: 4 });
    expect(a.get('E')).toEqual({ GUIDED: 1, STANDARD: 2, REVISION: 3, VERIFIED: 6 });
    expect(a.get('F')).toEqual({ GUIDED: 1, FOUNDATION_REQUIRED: 2 });
  });
});

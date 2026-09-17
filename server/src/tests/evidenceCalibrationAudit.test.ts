/**
 * Skill DNA evidence calibration — CHARACTERIZATION, not a specification.
 *
 * These tests pin how evidence behaves TODAY, as measured by the calibration audit (docs/audit/skill-dna-evidence-
 * calibration.md), so any future change to weights, thresholds or evidence sources is made knowingly and shows up
 * here. A failing assertion after a deliberate calibration change is expected: update it with the decision.
 */

import fs from 'fs';
import path from 'path';
import {
  answerLadder, firstReached, skillCheckRows, SIM_LEARNERS, simulate, CODING_ASSIGNMENT_UNITS, EvidenceRow,
} from './evidenceCalibration/simulator';
import { REAL_SKILL_CHECK_PAPER } from '../services/composerCertificationService';
import { aggregate, evidenceWeightFor } from '../data/skillDnaPolicy';
import CHECKPOINTS from './fixtures/evidence/checkpoint-questions.json';

const learner = (key: string) => SIM_LEARNERS.find(l => l.key === key)!;
const results = new Map(SIM_LEARNERS.map(l => [l.key, simulate(l)]));
const primaryQuestions = (skill: string) => (CHECKPOINTS as any).units.flatMap((u: any) => u.questions).filter((q: any) => q.skillKey === skill).length;

describe('the evidence pipeline today', () => {
  it('only three services write Skill DNA evidence: the Skill Check, module/checkpoint assessments, and mock interviews', () => {
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
      'services/interviewIntelligenceService.ts', 'services/moduleAssessmentEvidenceService.ts', 'services/skillDnaService.ts',
    ]);
  });

  it('assignment and project submissions write no evidence', () => {
    const src = (p: string) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
    for (const f of ['services/submissionService.ts', 'controllers/submissionController.ts']) {
      expect({ f, evidence: /StudentSkillEvidence|recomputeStudentSkills|projectModuleAssessment|SkillEvidence/.test(src(f)) }).toEqual({ f, evidence: false });
    }
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
  it('an unmeasured skill is STANDARD after one right checkpoint answer (capped by LOW) and VERIFIED after six (MEDIUM)', () => {
    const f = firstReached(answerLadder([], true));
    expect(f.states).toMatchObject({ STANDARD: 1, VERIFIED: 6 });
    expect(f.states.REVISION).toBeUndefined();
    expect(f.confidence).toMatchObject({ LOW: 1, MEDIUM: 6, HIGH: 14 });
    expect(firstReached(answerLadder([], false)).states).toMatchObject({ FOUNDATION_REQUIRED: 1 });
  });

  it('a skill the Skill Check measured at 0 needs 41 right answers to be VERIFIED — more than the curriculum asks for it', () => {
    const prior: EvidenceRow[] = skillCheckRows(REAL_SKILL_CHECK_PAPER.map(() => 0), 'PROGRAMMING_FUNDAMENTALS');
    expect(firstReached(answerLadder(prior, true)).states).toMatchObject({ GUIDED: 5, STANDARD: 11, REVISION: 22, VERIFIED: 41 });
    expect(primaryQuestions('PROGRAMMING_FUNDAMENTALS')).toBe(9);
    expect(primaryQuestions('SQL_BASICS')).toBe(4);
  });
});

describe('what realistic learners experience', () => {
  it('never loses a mandatory backbone requirement, whatever the evidence', () => {
    for (const [key, r] of results) expect({ key, missing: r.totals.backboneMissingEver }).toEqual({ key, missing: [] });
  });

  it('a beginner who answers every checkpoint right is VERIFIED on conditions, loops and functions from lesson checkpoints alone, and loses those coding assignments', () => {
    const r = results.get('D_BEGINNER_ALL_RIGHT')!;
    for (const k of ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'FUNCTIONS_BASICS']) expect({ k, state: r.finalBeliefs[k]!.state, confidence: r.finalBeliefs[k]!.confidence }).toEqual({ k, state: 'VERIFIED', confidence: 'MEDIUM' });
    expect(r.totals.codingAssignmentsRemoved.sort()).toEqual(['T_CONDITIONS_PRACTICE', 'T_FUNCTIONS_CALL_RETURN_PRACTICE', 'T_LOOPS_PRACTICE']);
    // The skills the Skill Check measured wrong stay low however well the coursework goes: nine checkpoint questions exist.
    expect(r.finalBeliefs.PROGRAMMING_FUNDAMENTALS!.state).toBe('GUIDED');
  });

  it('a learner right on lessons and wrong on practical work is still VERIFIED on functions, without demonstrating it', () => {
    const r = results.get('C_BEGINNER_LESSONS_ONLY')!;
    expect(r.finalBeliefs.FUNCTIONS_BASICS!.state).toBe('VERIFIED');
    expect(r.totals.codingAssignmentsRemoved).toContain('T_FUNCTIONS_CALL_RETURN_PRACTICE');
  });

  it('guessing the first option shown never makes a focus skill better than GUIDED', () => {
    const r = results.get('I_ALWAYS_OPTION_A')!;
    for (const [k, b] of Object.entries(r.finalBeliefs)) {
      if (b) expect({ k, ok: ['FOUNDATION_REQUIRED', 'GUIDED'].includes(b.state) }).toEqual({ k, ok: true });
    }
  });

  it('strong learners are anchored by their diagnostic: checkpoint evidence barely moves them', () => {
    const f = results.get('F_AT_70')!;
    expect(Object.values(f.finalBeliefs).filter(b => b && b.state === 'VERIFIED')).toHaveLength(0);
    const h = results.get('H_VERY_STRONG')!;
    expect(Object.values(h.finalBeliefs).every(b => b && b.state === 'VERIFIED')).toBe(true);
    expect(CODING_ASSIGNMENT_UNITS.filter(c => h.initialPlan.includes(c))).toEqual([]);
  });

  it('is deterministic', () => {
    const again = simulate(learner('E_PARTIAL'));
    expect(again.finalPlan).toEqual(results.get('E_PARTIAL')!.finalPlan);
  });
});

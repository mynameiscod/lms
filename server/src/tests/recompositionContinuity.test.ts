/**
 * A reassessment continues the course; it does not start it again.
 *
 * Recomposition used to compose a fresh ninety days for the updated learner, drop what was already taught, and fill
 * the future from whatever was left in the fresh plan's order. The fresh plan knew nothing of the frozen days, so a
 * reassessed beginner lost functions and arrays, or met them in reverse — a daily reassessment chain produced spine
 * practices on days 65, 88, 90, 53 and 35 — while every count stayed right.
 *
 * The frozen days are now the composition's history: replayed first as already given, so the future is composed from
 * the capacity, teaching and structure the learner really has. These tests hold the history mechanics, the structural
 * coverage report, and continuity across freeze points, evidence changes and reassessment chains.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit, StudentProfile, composeUnits } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, REAL_SKILL_CHECK_PROFILES, CONTINUITY_EVOLUTIONS, CONTINUITY_FREEZE_DAYS, CONTINUITY_CHAINS,
  continuityLearners, simulateRecomposition, simulateReassessmentChain, recompositionContinuityIssues, evolveProfile,
  spineFirstPractices, skillUniverse, PROGRAMMING_SPINE_TOPICS,
} from '../services/composerCertificationService';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const { allSkills, universalSkills } = skillUniverse(READY);
const beginner = REAL_SKILL_CHECK_PROFILES[0].build();
const partial = REAL_SKILL_CHECK_PROFILES[1].build();
const compose = (student: StudentProfile, history?: string[]) =>
  composeUnits({ candidates: PRODUCTION, targetUnits: FOUNDATION_PROGRAM_DAYS, student, history });
const initial = (student: StudentProfile) => compose(student).units.map(u => u.unitCode);
const coverageOf = (r: ReturnType<typeof compose>) => Object.fromEntries((r.structure || []).map(s => [s.topicCode, s.coverage]));
const days = (codes: string[]) => spineFirstPractices({ units: codes.map(unitCode => ({ unitCode })) } as any, PRODUCTION);

describe('the composition history', () => {
  it('replays the frozen days first, unchanged, and composes exactly the future that remains', () => {
    const plan = initial(beginner);
    const r = compose(beginner, plan.slice(0, 30));
    expect(r.ok).toBe(true);
    expect(r.units.map(u => u.unitCode).slice(0, 30)).toEqual(plan.slice(0, 30));
    expect(r.units).toHaveLength(90);
    expect(new Set(r.units.map(u => u.unitCode)).size).toBe(90);
  });

  it('with no history, composes exactly as before', () => {
    expect(initial(beginner)).toEqual(compose(beginner, []).units.map(u => u.unitCode));
  });

  it('keeps the day of a history unit the pool no longer holds, and composes one fewer', () => {
    const plan = initial(beginner);
    const r = compose(beginner, ['T_NO_LONGER_PUBLISHED', ...plan.slice(0, 10)]);
    expect(r.units).toHaveLength(89);
    expect(r.units.map(u => u.unitCode)).not.toContain('T_NO_LONGER_PUBLISHED');
  });

  it('spends the frozen days\' capacity: the future is composed from what is left', () => {
    const plan = initial(beginner);
    const whole = compose(beginner).composition;
    const continued = compose(beginner, plan.slice(0, 45)).composition;
    expect(Object.values(continued).reduce((a, b) => a + b, 0)).toBe(90);
    // The history counts toward its roles, so the continued plan's foundation instruction includes the frozen days'.
    expect(continued.FOUNDATION_INSTRUCTION).toBeGreaterThanOrEqual(plan.slice(0, 45).length ? 1 : 0);
    expect(whole.FOUNDATION_INSTRUCTION).toBeGreaterThan(0);
  });
});

describe('where each structural requirement stands', () => {
  it('reports every spine topic still owed for a new beginner', () => {
    expect(Object.values(coverageOf(compose(beginner)))).toEqual(PROGRAMMING_SPINE_TOPICS.map(() => 'REQUIRES_FUTURE_COVERAGE'));
  });

  it('reports a topic whose practice is in the frozen days as covered, and does not reserve it again', () => {
    const plan = initial(beginner);
    const variablesPractice = days(plan)[0]!;
    const cov = coverageOf(compose(beginner, plan.slice(0, variablesPractice)));
    expect(cov.T_VARIABLES).toBe('COVERED_BY_FROZEN_PLAN');
    expect(cov.T_CONDITIONS).toBe('REQUIRES_FUTURE_COVERAGE');
  });

  it('reports a topic the evidence has resolved as resolved — today\'s treatment, not a removal from the course', () => {
    const plan = initial(beginner);
    const r = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: beginner, kind: 'VERIFIED', freezeDay: 30 });
    expect(r.ok).toBe(true);
    // Days 1–30 taught conditions; VERIFIED evidence on it resolves its practice under today's rules.
    const evolved = evolveProfile(beginner, 'VERIFIED', plan.slice(0, 30).map(c => PRODUCTION.find(u => u.unitCode === c)!));
    const cov = coverageOf(composeUnits({ candidates: PRODUCTION, targetUnits: 90, student: evolved, history: plan.slice(0, 30) }));
    expect(cov.T_VARIABLES).toBe('COVERED_BY_FROZEN_PLAN');
    expect(cov.T_CONDITIONS).toBe('RESOLVED_BY_EVIDENCE');
    expect(cov.T_LOOPS).toBe('REQUIRES_FUTURE_COVERAGE');
  });

  it('flags a structure the future never reaches, and one met out of order', () => {
    const fresh = { structure: [
      { strand: 'PROGRAMMING', topicCode: 'T_A', boundary: 'A', coverage: 'REQUIRES_FUTURE_COVERAGE', sequencingRank: 1 },
      { strand: 'PROGRAMMING', topicCode: 'T_B', boundary: 'B', coverage: 'REQUIRES_FUTURE_COVERAGE', sequencingRank: 1 },
      { strand: 'PROGRAMMING', topicCode: 'T_C', boundary: 'C', coverage: 'REQUIRES_FUTURE_COVERAGE', sequencingRank: 1 },
    ] } as any;
    const issues = recompositionContinuityIssues(fresh, ['X', 'B', 'A'], 1).map(i => i.code);
    expect(issues).toEqual(['STRUCTURE_ORDER', 'STRUCTURE_CUT']);
    // A later requirement measurement ranks strictly ahead (a FOUNDATION_REQUIRED weak area) may come first.
    fresh.structure[1].sequencingRank = 0;
    expect(recompositionContinuityIssues(fresh, ['X', 'B', 'A', 'C'], 1)).toEqual([]);
  });
});

describe('continuity at every freeze point and evidence change', () => {
  for (const [name, student] of [['REAL_SKILL_CHECK_BEGINNER', beginner], ['REAL_SKILL_CHECK_PARTIAL', partial]] as [string, StudentProfile][]) {
    it(`${name}: every recomposition is ninety valid, structurally continuous days`, () => {
      const failures: string[] = [];
      for (const freezeDay of CONTINUITY_FREEZE_DAYS) {
        for (const kind of CONTINUITY_EVOLUTIONS) {
          const r = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: student, kind, freezeDay });
          if (!r.ok || r.stitched.length !== 90 || new Set(r.stitched).size !== 90) {
            failures.push(`freeze ${freezeDay} ${kind}: ${r.issues.map(i => `${i.code} ${i.detail}`).join('; ')}`);
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }

  it('never changes a frozen day', () => {
    const plan = initial(beginner);
    for (const freezeDay of CONTINUITY_FREEZE_DAYS) {
      const r = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: beginner, kind: 'MIXED', freezeDay });
      expect(r.stitched.slice(0, freezeDay)).toEqual(plan.slice(0, freezeDay));
    }
  });

  it('is deterministic', () => {
    const a = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: partial, kind: 'REVISION', freezeDay: 45 });
    const b = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: partial, kind: 'REVISION', freezeDay: 45 });
    expect(a.stitched).toEqual(b.stitched);
  });

  it('more evidence may compress the spine but never leaves an owed topic unreached', () => {
    const plan = initial(beginner);
    for (const freezeDay of [14, 30, 45]) {
      for (const kind of ['WEAK', 'STANDARD', 'REVISION', 'VERIFIED'] as const) {
        const r = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: beginner, kind, freezeDay });
        const evolved = evolveProfile(beginner, kind, plan.slice(0, freezeDay).map(c => PRODUCTION.find(u => u.unitCode === c)!));
        const next = composeUnits({ candidates: PRODUCTION, targetUnits: 90, student: evolved, history: plan.slice(0, freezeDay) });
        const owed = (next.structure || []).filter(s => s.coverage !== 'RESOLVED_BY_EVIDENCE').map(s => s.boundary);
        expect({ freezeDay, kind, cut: owed.filter(b => b && !r.stitched.includes(b)) }).toEqual({ freezeDay, kind, cut: [] });
      }
    }
  });
});

describe('reassessment after reassessment', () => {
  it('the day-by-day improving chain that scrambled the spine now keeps it whole and in order', () => {
    const r = simulateReassessmentChain({ pool: PRODUCTION, universe: PRODUCTION, base: beginner, chain: 'IMPROVING_DAILY' });
    expect(r.issues).toEqual([]);
    const d = days(r.stitched);
    expect(d.every(x => x !== null)).toBe(true);
    expect(d.every((x, i) => i === 0 || (x as number) > (d[i - 1] as number))).toBe(true);
  });

  it('every chain holds for every continuity learner', () => {
    const failures: string[] = [];
    for (const learner of continuityLearners(allSkills, universalSkills)) {
      for (const chain of CONTINUITY_CHAINS) {
        const r = simulateReassessmentChain({ pool: PRODUCTION, universe: PRODUCTION, base: learner.student, chain });
        if (!r.ok) failures.push(`${learner.key} ${chain}: ${r.issues.slice(0, 2).map(i => `${i.code} ${i.detail}`).join('; ')}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('the no-evidence and mixed learners continue coherently at every freeze point and change', () => {
    const failures: string[] = [];
    for (const key of ['beginner', 'mixed']) {
      const student = REALISTIC_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);
      for (const freezeDay of CONTINUITY_FREEZE_DAYS) {
        for (const kind of CONTINUITY_EVOLUTIONS) {
          const r = simulateRecomposition({ pool: PRODUCTION, universe: PRODUCTION, base: student, kind, freezeDay });
          if (!r.ok) failures.push(`${key} freeze ${freezeDay} ${kind}: ${r.issues.map(i => i.code).join(',')}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

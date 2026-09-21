/**
 * A runnable coding assignment on each core programming topic's first practice day.
 *
 * Variables, Conditions, Loops, Functions and Arrays each had lessons, practice drills and a later
 * mini project, but no assignment a beginner could write code into and submit on the day the topic
 * is first practised. Each first-practice unit now binds one CODING Assignment: the existing engine,
 * the existing test-case runner, the existing submission flow. These tests hold that coverage, the
 * binding rules that keep it from colliding with PROJECT briefs, the quality bar for a task a
 * beginner is graded on, and that none of it moved a single day of the beginner's plan.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import METADATA from './fixtures/year1UnitMetadata.json';
import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { isPendingReview } from '../data/productionPublicationPolicy';
import { PilotAssignmentCoding, PilotBundle } from '../seeds/careerPilot/pilotUnitContent';
import { ComposableUnit } from '../services/curriculumComposerService';
import { REALISTIC_PROFILES, compose, skillUniverse } from '../services/composerCertificationService';
import { practicalBoundaries } from '../data/courseSequencePolicy';
import { activitiesFor } from '../services/foundationJourneyService';
import { FOUNDATION_PROGRAM_DAYS as PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const UNITS = METADATA as unknown as { unitCode: string; topicCode: string; unitType: string; skillKeys: string[] }[];
const unitOf = new Map(UNITS.map(u => [u.unitCode, u]));
/* The certified inventory's bundles. Units awaiting review are outside it, and outside the metadata snapshot;
   the content-quality suite still checks everything they contain. */
const bundles = (ALL_BUNDLES as PilotBundle[]).filter(b => !isPendingReview(b.unitCode));
const bundleOf = new Map(bundles.map(b => [b.unitCode, b]));

const FIRST_PRACTICE: Record<string, string> = {
  T_VARIABLES: 'T_VARIABLES_COMPUTE_PRACTICE',
  T_CONDITIONS: 'T_CONDITIONS_PRACTICE',
  T_LOOPS: 'T_LOOPS_PRACTICE',
  T_FUNCTIONS: 'T_FUNCTIONS_CALL_RETURN_PRACTICE',
  T_ARRAYS: 'T_ARRAYS_TRAVERSAL_PRACTICE',
};
const CORE = Object.keys(FIRST_PRACTICE);

const codingAssignments = bundles
  .filter(b => b.assignment?.coding)
  .map(b => ({ unitCode: b.unitCode, a: b.assignment!, c: b.assignment!.coding as PilotAssignmentCoding }));

describe('coverage of the core programming topics', () => {
  it('names, for each topic, the unit the course sequence treats as its first practice', () => {
    for (const topic of CORE) {
      const first = practicalBoundaries(PRODUCTION.filter(u => u.topicCode === topic))[0];
      expect({ topic, first: first?.unitCode }).toEqual({ topic, first: FIRST_PRACTICE[topic] });
    }
  });

  it('binds a coding assignment to every one of those first-practice units, and each is PRACTICE and in production', () => {
    const production = new Set(SETS.recommended);
    for (const code of Object.values(FIRST_PRACTICE)) {
      expect({ code, unitType: unitOf.get(code)?.unitType, production: production.has(code), coding: !!bundleOf.get(code)?.assignment?.coding })
        .toEqual({ code, unitType: 'PRACTICE', production: true, coding: true });
    }
  });

  it('adds coding assignments only where they were missing — exactly the five first-practice units', () => {
    expect(codingAssignments.map(x => x.unitCode).sort()).toEqual(Object.values(FIRST_PRACTICE).sort());
  });
});

describe('binding', () => {
  it('has one bundle per unit, so no unit can bind two assignments', () => {
    const codes = bundles.map(b => b.unitCode);
    expect(codes.length).toBe(new Set(codes).size);
  });

  it('binds every assignment to a unit that exists', () => {
    expect(bundles.filter(b => b.assignment && !unitOf.has(b.unitCode)).map(b => b.unitCode)).toEqual([]);
  });

  /** Certification requires a PROJECT unit's assignment to be a project; a runnable task belongs on practice. */
  it('never puts a coding assignment on a PROJECT unit, nor a project brief on any other unit', () => {
    const bad = bundles.filter(b => b.assignment)
      .filter(b => (unitOf.get(b.unitCode)!.unitType === 'PROJECT') === !!b.assignment!.coding)
      .map(b => `${b.unitCode} (${unitOf.get(b.unitCode)!.unitType}, coding ${!!b.assignment!.coding})`);
    expect(bad).toEqual([]);
  });

  it('maps each coding assignment to its unit’s skills through the unit it is bound to', () => {
    const expected: Record<string, string> = {
      T_VARIABLES_COMPUTE_PRACTICE: 'PROGRAMMING_FUNDAMENTALS', T_CONDITIONS_PRACTICE: 'CONDITIONALS_BASICS',
      T_LOOPS_PRACTICE: 'LOOPS_BASICS', T_FUNCTIONS_CALL_RETURN_PRACTICE: 'FUNCTIONS_BASICS', T_ARRAYS_TRAVERSAL_PRACTICE: 'DSA_ARRAYS',
    };
    for (const { unitCode } of codingAssignments) {
      expect(unitOf.get(unitCode)!.skillKeys).toContain(expected[unitCode]);
    }
  });
});

describe('a coding assignment a beginner is graded on', () => {
  it('is Python, the language the Foundation curriculum teaches in, at a beginner level', () => {
    for (const { unitCode, c } of codingAssignments) {
      expect({ unitCode, language: c.language, level: ['beginner', 'easy'].includes(c.difficulty) })
        .toEqual({ unitCode, language: 'python', level: true });
    }
  });

  it('states its objective, what the program must do, what to submit and how it is graded, in the brief itself', () => {
    for (const { unitCode, a } of codingAssignments) {
      const missing = ['**Objective**', '**What the program must do**', '**What to submit**', '**How it is graded**']
        .filter(h => !a.instructions.includes(h));
      expect({ unitCode, missing, long: a.instructions.length >= 400, title: /^Coding Assignment — /.test(a.title) })
        .toEqual({ unitCode, missing: [], long: true, title: true });
    }
  });

  it('passes at a score it is possible to reach, below the rubric total', () => {
    for (const { unitCode, a, c } of codingAssignments) {
      expect({ unitCode, ok: c.passingPoints > 0 && c.passingPoints <= a.totalPoints }).toEqual({ unitCode, ok: true });
    }
  });

  it('has a starter and at least one test that expects output', () => {
    for (const { unitCode, c } of codingAssignments) {
      expect({ unitCode, starter: !!c.starter.trim(), tests: c.tests.length > 0, output: c.tests.every(t => t.expectedOutput.length > 0) })
        .toEqual({ unitCode, starter: true, tests: true, output: true });
    }
  });

  /** The same rule the practice drills keep: a task with no input would otherwise publish its answer. */
  it('hides the expected output when the program reads no input', () => {
    const bad = codingAssignments
      .filter(({ c }) => !c.tests.some(t => t.input.trim()) && c.tests.some(t => !t.isHidden))
      .map(x => x.unitCode);
    expect(bad).toEqual([]);
  });

  it('shows at least one example and holds at least one case back when the program reads input', () => {
    const bad = codingAssignments
      .filter(({ c }) => c.tests.some(t => t.input.trim()))
      .filter(({ c }) => c.tests.length < 2 || c.tests.every(t => t.isHidden) || !c.tests.some(t => t.isHidden))
      .map(x => x.unitCode);
    expect(bad).toEqual([]);
  });

  /** The starter sets up values or reads input; every decision, loop, definition and print is the student's. */
  it('carries no solution: no solution field, and a starter with nothing of the answer in it', () => {
    for (const { unitCode, c } of codingAssignments) {
      expect(Object.keys(c).sort()).toEqual(['difficulty', 'language', 'passingPoints', 'starter', 'tests']);
      // The one loop a starter may contain is the input-parsing idiom the practice drills hand out too.
      const code = c.starter.split('\n').map(line => line.replace(/#.*$/, '')).join('\n')
        .replace('[int(x) for x in input().split()]', 'PARSED_INPUT');
      expect({ unitCode, solved: /\b(print|if|elif|else|for|while|def|return|sum|max)\b/.test(code) })
        .toEqual({ unitCode, solved: false });
    }
  });
});

describe('on the journey day', () => {
  it('becomes one required, gating assignment activity after the day’s teaching', () => {
    const items = activitiesFor({ title: 'Loops practice' } as any, {
      content: [{ _id: 'n1', type: 'notes', title: 'Loops practice — notes', estimatedDuration: 10 }],
      quizzes: [],
      assignments: [{ _id: 'a1', title: 'Coding Assignment — Count Up and Add Up', type: 'coding' }],
    } as any);
    const assignment = items.filter(i => i.kind === 'assignment');
    expect(assignment).toHaveLength(1);
    expect(assignment[0]).toMatchObject({
      sourceModel: 'Assignment', sourceId: 'a1', contentTitle: 'Coding Assignment — Count Up and Add Up',
      required: true, isGating: true,
    });
    expect(items.findIndex(i => i.kind === 'assignment')).toBeGreaterThan(items.findIndex(i => i.kind === 'content'));
  });
});

describe('composition is untouched', () => {
  const { allSkills, universalSkills } = skillUniverse(PRODUCTION);
  const beginner = REALISTIC_PROFILES.find(p => p.key === 'beginner')!.build(allSkills, universalSkills);
  const r: any = compose(PRODUCTION, beginner);
  const codes: string[] = r.units.map((u: any) => u.unitCode);

  it('still gives a fresh beginner exactly ninety days', () => {
    expect(codes).toHaveLength(PROGRAM_DAYS);
    expect(new Set(codes).size).toBe(PROGRAM_DAYS);
  });

  it('still reaches Variables, Conditions, Loops, Functions and Arrays practice, on the certified backbone days 33, 39, 46, 52 and 57', () => {
    expect(CORE.map(t => codes.indexOf(FIRST_PRACTICE[t]) + 1)).toEqual([33, 39, 46, 52, 57]);
  });
});

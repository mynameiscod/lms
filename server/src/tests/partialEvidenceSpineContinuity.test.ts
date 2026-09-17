/**
 * Partial programming evidence compresses the spine; it never removes it.
 *
 * A real learner's single skill-check score (PROGRAMMING_FUNDAMENTALS 46, MEDIUM) put variables at GUIDED.
 * GUIDED ranks after NOT_EXPOSED, so every variables lesson lost its turn to untouched topics, and conditions,
 * loops, functions and arrays — which wait on variables by sequence — never appeared. A score of 30 kept the whole
 * spine; 46 and 62 lost it. The same cliff existed for a partial score on any spine topic.
 *
 * These tests hold the continuity of an unresolved prerequisite path, not "more evidence means earlier days":
 * personalised day numbers are allowed to move, the spine is not allowed to disappear, and the profiles the
 * accepted sequencing protects are pinned as they are.
 */

import READY_JSON from './fixtures/phase21/ready-inventory.json';
import SETS from './fixtures/phase21/publish-sets.json';
import { ComposableUnit, StudentProfile, composeUnits } from '../services/curriculumComposerService';
import { REALISTIC_PROFILES, skillUniverse } from '../services/composerCertificationService';
import { practicalBoundaries } from '../data/courseSequencePolicy';
import { stateForScore } from '../data/adaptiveCurriculumPolicy';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

const READY = READY_JSON as unknown as ComposableUnit[];
const PRODUCTION = READY.filter(u => new Set(SETS.recommended).has(u.unitCode));
const byCode = new Map(PRODUCTION.map(u => [u.unitCode, u]));
const SPINE = ['T_VARIABLES', 'T_CONDITIONS', 'T_LOOPS', 'T_FUNCTIONS', 'T_ARRAYS'];
const FIRST = SPINE.map(t => practicalBoundaries(PRODUCTION.filter(u => u.topicCode === t))[0].unitCode);
const { allSkills, universalSkills } = skillUniverse(PRODUCTION);
const profile = (key: string) => REALISTIC_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);

const compose = (student: StudentProfile) => composeUnits({ candidates: PRODUCTION, targetUnits: FOUNDATION_PROGRAM_DAYS, student }) as any;
const codesOf = (student: StudentProfile): string[] => compose(student).units.map((u: any) => u.unitCode);
/** Day of each spine topic's first practical boundary, or null when it is not in the plan. */
const spineDays = (student: StudentProfile): (number | null)[] => {
  const codes = codesOf(student);
  return FIRST.map(c => (codes.includes(c) ? codes.indexOf(c) + 1 : null));
};
const oneScore = (skill: string, score: number, confidence: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM'): StudentProfile => ({
  skills: new Map([[skill, { score, confidence }]]) as any, primaryDirection: null, directionStatus: 'UNDECIDED',
});
const everyUniversal = (score: number): StudentProfile => ({
  skills: new Map(universalSkills.map(k => [k, { score, confidence: 'HIGH' }])) as any, primaryDirection: null, directionStatus: 'UNDECIDED',
});

describe('the diagnostic profiles', () => {
  it('A. a learner with no programming evidence keeps the accepted spine, day for day', () => {
    expect(spineDays(profile('beginner'))).toEqual([14, 32, 47, 61, 75]);
  });

  it('B. PROGRAMMING_FUNDAMENTALS 30 MEDIUM (FOUNDATION_REQUIRED) reaches every spine practice', () => {
    expect(stateForScore({ score: 30, confidence: 'MEDIUM' })).toBe('FOUNDATION_REQUIRED');
    expect(spineDays(oneScore('PROGRAMMING_FUNDAMENTALS', 30)).every(d => d !== null)).toBe(true);
  });

  it('C. PROGRAMMING_FUNDAMENTALS 46 MEDIUM (GUIDED) no longer loses the spine', () => {
    expect(stateForScore({ score: 46, confidence: 'MEDIUM' })).toBe('GUIDED');
    const days = spineDays(oneScore('PROGRAMMING_FUNDAMENTALS', 46));
    expect(days.every(d => d !== null)).toBe(true);
  });

  it('D. PROGRAMMING_FUNDAMENTALS 62 MEDIUM (STANDARD, not reliable) no longer loses the spine', () => {
    expect(stateForScore({ score: 62, confidence: 'MEDIUM' })).toBe('STANDARD');
    expect(spineDays(oneScore('PROGRAMMING_FUNDAMENTALS', 62)).every(d => d !== null)).toBe(true);
  });

  it('keeps each practice in spine order for the partial profiles', () => {
    for (const score of [46, 62]) {
      const days = spineDays(oneScore('PROGRAMMING_FUNDAMENTALS', score)) as number[];
      expect({ score, ordered: days.slice(0, 4).every((d, i) => i === 0 || d > days[i - 1]) }).toEqual({ score, ordered: true });
    }
  });

  it('E. reliably STANDARD+ programming evidence still compresses: known lessons are not taught back', () => {
    const spineSkills = [...new Set(PRODUCTION.filter(u => SPINE.includes(u.topicCode)).flatMap(u => u.skillKeys))];
    const student: StudentProfile = {
      skills: new Map(spineSkills.map(k => [k, { score: 72, confidence: 'HIGH' }])) as any, primaryDirection: null, directionStatus: 'UNDECIDED',
    };
    const plan = codesOf(student).map(c => byCode.get(c)!);
    const spineLessons = plan.filter(u => SPINE.includes(u.topicCode) && ['CONCEPT', 'WORKED_EXAMPLE'].includes(u.unitType));
    const beginnerLessons = codesOf(profile('beginner')).map(c => byCode.get(c)!)
      .filter(u => SPINE.includes(u.topicCode) && ['CONCEPT', 'WORKED_EXAMPLE'].includes(u.unitType));
    expect(spineLessons.length).toBeLessThan(beginnerLessons.length / 2);
  });
});

describe('continuity of an unresolved prerequisite path', () => {
  /**
   * The semantic regression. Moving the evidence on one spine topic from FOUNDATION_REQUIRED to a partial state must not
   * remove a practice the FOUNDATION_REQUIRED learner reaches on any LATER spine topic. Day numbers may move.
   */
  const TOPIC_SKILL: [string, string][] = [
    ['T_VARIABLES', 'PROGRAMMING_FUNDAMENTALS'], ['T_VARIABLES', 'PYTHON_BASICS'], ['T_CONDITIONS', 'CONDITIONALS_BASICS'],
    ['T_LOOPS', 'LOOPS_BASICS'], ['T_FUNCTIONS', 'FUNCTIONS_BASICS'], ['T_ARRAYS', 'DSA_ARRAYS'],
  ];
  for (const [topic, skill] of TOPIC_SKILL) {
    it(`keeps every later spine practice when ${skill} moves from FOUNDATION_REQUIRED to GUIDED`, () => {
      const position = SPINE.indexOf(topic);
      const required = spineDays(oneScore(skill, 30));
      for (const [score, confidence] of [[46, 'MEDIUM'], [46, 'LOW'], [55, 'HIGH']] as [number, 'LOW' | 'MEDIUM' | 'HIGH'][]) {
        expect(stateForScore({ score, confidence })).toBe('GUIDED');
        const guided = spineDays(oneScore(skill, score, confidence));
        const lost = SPINE.filter((_t, i) => i >= position && required[i] !== null && guided[i] === null);
        expect({ skill, score, confidence, lost }).toEqual({ skill, score, confidence, lost: [] });
      }
    });
  }

  it('never lets the partial profiles lose a spine practice the no-evidence beginner reaches', () => {
    const beginner = spineDays(profile('beginner'));
    for (const [skill] of [['PROGRAMMING_FUNDAMENTALS'], ['PYTHON_BASICS']]) {
      for (const score of [46, 62]) {
        const partial = spineDays(oneScore(skill, score));
        const lost = SPINE.filter((_t, i) => beginner[i] !== null && partial[i] === null);
        expect({ skill, score, lost }).toEqual({ skill, score, lost: [] });
      }
    }
  });

  it('stays exactly ninety distinct days and deterministic for every partial profile', () => {
    for (const score of [30, 46, 62]) {
      const student = oneScore('PROGRAMMING_FUNDAMENTALS', score);
      const codes = codesOf(student);
      expect({ score, days: codes.length, distinct: new Set(codes).size }).toEqual({ score, days: 90, distinct: 90 });
      expect(codesOf(student)).toEqual(codes);
    }
  });
});

describe('the accepted profiles are untouched', () => {
  const mix = (student: StudentProfile) => compose(student).composition;

  it('@70 keeps its practice-heavy, direction-led shape', () => {
    expect(mix(everyUniversal(70))).toMatchObject({ DIRECTION_LEARNING: 25, PRACTICE: 28, APPLICATION: 11, INTEGRATION: 4, VERIFICATION: 2 });
  });

  it('@78 keeps its shape', () => {
    expect(mix(everyUniversal(78))).toMatchObject({ DIRECTION_LEARNING: 13, PRACTICE: 24, APPLICATION: 15, INTEGRATION: 11, VERIFICATION: 7 });
  });

  it('a strong learner keeps its shape', () => {
    expect(mix(profile('strong-universal'))).toMatchObject({ DIRECTION_LEARNING: 29, APPLICATION: 13, INTEGRATION: 11, VERIFICATION: 7 });
  });

  it('an undecided learner keeps meaningful direction', () => {
    expect(mix(profile('undecided')).DIRECTION_LEARNING).toBe(10);
  });
});

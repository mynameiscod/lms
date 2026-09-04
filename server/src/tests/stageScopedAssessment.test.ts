/**
 * A first-year's paper is drawn from the list their college configured.
 *
 * Two separate failures put the same workplace question in front of a first-year twice: "a
 * ticket says only: make the report page faster", and "you have been stuck for two days
 * waiting for database access". Both are COMMUNICATION questions written for the backend
 * pilot, and both reached a student in their first term who had answered "I'm not sure yet".
 *
 * ONE: the assessment scoped a role-less student to DISCOVERY_SKILL_SCOPE — twelve hardcoded
 * keys — and never consulted the stage skill set. An admin could configure 47 foundation
 * skills, switch the list on, and change nothing about what was measured.
 *
 * TWO: even once scoped, ranking broke ties alphabetically. A paper covers `maxSkills` — six
 * at foundation — so a list of 47 equally-weighted FOUNDATION skills always yielded the six
 * whose keys sort first. Every APTITUDE_* key, and never Loops or Conditionals, however the
 * admin had ordered them: their Importance, Weight and Order columns had no effect at all.
 *
 * The ranking is reproduced rather than imported where it needs a Mongo-free harness; the
 * real rankSkills is exercised directly where it does not.
 */

import { rankSkills } from '../services/personalizedAssessmentService';

const POLICY: any = { maxSkills: 6, prerequisiteDepth: 2, skillSlots: 16 };

/** Everything a first-year list holds: all FOUNDATION, all reached the same way. */
const FOUNDATION_KEYS = [
  'APTITUDE_DATA_INTERPRETATION', 'APTITUDE_QUANT_ARITHMETIC', 'APTITUDE_QUANT_TIME',
  'APTITUDE_REASONING_LOGIC', 'APTITUDE_REASONING_SERIES', 'APTITUDE_VERBAL_GRAMMAR',
  'APTITUDE_VERBAL_READING', 'CONDITIONALS_BASICS', 'FUNCTIONS_BASICS',
  'HOW_COMPUTERS_WORK', 'INPUT_OUTPUT_BASICS', 'LOOPS_BASICS',
  'PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'SELF_INTRODUCTION',
];

const candidates = FOUNDATION_KEYS.map(skillKey => ({ skillKey, reason: 'prerequisite' as const }));
const skills = new Map<string, any>(FOUNDATION_KEYS.map(k => [k, { key: k, difficulty: 'FOUNDATION' }]));

const priority = (rows: Record<string, Partial<{ importance: string; weight: number; order: number }>>) =>
  new Map(FOUNDATION_KEYS.map(k => [k, {
    importance: rows[k]?.importance ?? 'IMPORTANT',
    weight: rows[k]?.weight ?? 7,
    order: rows[k]?.order ?? 100,
  }]));

describe('without the admin ordering, the alphabet decides', () => {
  /**
   * The behaviour that produced an all-aptitude paper. Kept as a test because it is the
   * baseline the fix is measured against, not because it is desirable.
   */
  it('takes the alphabetically-first six when nothing distinguishes them', () => {
    const out = rankSkills(candidates, skills, POLICY).map(s => s.skillKey);
    expect(out).toHaveLength(6);
    expect(out.every(k => k.startsWith('APTITUDE_'))).toBe(true);
    expect(out).not.toContain('LOOPS_BASICS');
    expect(out).not.toContain('PROGRAMMING_FUNDAMENTALS');
  });
});

describe('the admin ordering decides what a first-year is measured on', () => {
  it('puts ESSENTIAL skills ahead of IMPORTANT ones', () => {
    const out = rankSkills(candidates, skills, POLICY, priority({
      PROGRAMMING_FUNDAMENTALS: { importance: 'ESSENTIAL' },
      LOOPS_BASICS: { importance: 'ESSENTIAL' },
      CONDITIONALS_BASICS: { importance: 'ESSENTIAL' },
    })).map(s => s.skillKey);

    expect(out.slice(0, 3).sort()).toEqual(
      ['CONDITIONALS_BASICS', 'LOOPS_BASICS', 'PROGRAMMING_FUNDAMENTALS'],
    );
  });

  it('breaks a tie in importance on weight, heavier first', () => {
    const out = rankSkills(candidates, skills, POLICY, priority({
      LOOPS_BASICS: { weight: 10 },
      CONDITIONALS_BASICS: { weight: 9 },
      FUNCTIONS_BASICS: { weight: 8 },
    })).map(s => s.skillKey);

    expect(out.slice(0, 3)).toEqual(['LOOPS_BASICS', 'CONDITIONALS_BASICS', 'FUNCTIONS_BASICS']);
  });

  it('breaks a tie in weight on the order the admin set', () => {
    const out = rankSkills(candidates, skills, POLICY, priority({
      SELF_INTRODUCTION: { order: 1 },
      HOW_COMPUTERS_WORK: { order: 2 },
      INPUT_OUTPUT_BASICS: { order: 3 },
    })).map(s => s.skillKey);

    expect(out.slice(0, 3)).toEqual(['SELF_INTRODUCTION', 'HOW_COMPUTERS_WORK', 'INPUT_OUTPUT_BASICS']);
  });

  /**
   * THE POINT OF ALL OF IT. A 47-skill list does not have to be trimmed to work — the six
   * that surface are the six the admin marked, not the ones starting with "A".
   */
  it('lets a long list yield the skills a first term actually teaches', () => {
    const out = rankSkills(candidates, skills, POLICY, priority({
      PROGRAMMING_FUNDAMENTALS: { importance: 'ESSENTIAL', order: 1 },
      INPUT_OUTPUT_BASICS: { importance: 'ESSENTIAL', order: 2 },
      CONDITIONALS_BASICS: { importance: 'ESSENTIAL', order: 3 },
      LOOPS_BASICS: { importance: 'ESSENTIAL', order: 4 },
      FUNCTIONS_BASICS: { importance: 'ESSENTIAL', order: 5 },
      PROBLEM_SOLVING: { importance: 'ESSENTIAL', order: 6 },
    })).map(s => s.skillKey);

    expect(out).toEqual([
      'PROGRAMMING_FUNDAMENTALS', 'INPUT_OUTPUT_BASICS', 'CONDITIONALS_BASICS',
      'LOOPS_BASICS', 'FUNCTIONS_BASICS', 'PROBLEM_SOLVING',
    ]);
    expect(out.some(k => k.startsWith('APTITUDE_'))).toBe(false);
  });

  it('still covers only maxSkills, however long the list is', () => {
    expect(rankSkills(candidates, skills, POLICY, priority({}))).toHaveLength(6);
  });
});

describe('what the change does not do', () => {
  /**
   * A role blueprint passes no priority, so its ranking is byte-for-byte what it was. This
   * has to hold: every existing member with a chosen role sits the paper they sat before.
   */
  it('leaves ranking unchanged when no priority is supplied', () => {
    const withNothing = rankSkills(candidates, skills, POLICY).map(s => s.skillKey);
    const withUndefined = rankSkills(candidates, skills, POLICY, undefined).map(s => s.skillKey);
    expect(withUndefined).toEqual(withNothing);
  });

  /** Difficulty still outranks anything an admin can set: no ADVANCED skill for a beginner. */
  it('does not let importance promote a harder skill above a foundation one', () => {
    const mixed = new Map<string, any>([
      ['LOOPS_BASICS', { key: 'LOOPS_BASICS', difficulty: 'FOUNDATION' }],
      ['DSA_GRAPHS', { key: 'DSA_GRAPHS', difficulty: 'ADVANCED' }],
    ]);
    const out = rankSkills(
      [{ skillKey: 'DSA_GRAPHS', reason: 'prerequisite' }, { skillKey: 'LOOPS_BASICS', reason: 'prerequisite' }],
      mixed,
      POLICY,
      new Map([
        ['DSA_GRAPHS', { importance: 'ESSENTIAL', weight: 10, order: 1 }],
        ['LOOPS_BASICS', { importance: 'OPTIONAL', weight: 1, order: 99 }],
      ]),
    ).map(s => s.skillKey);

    expect(out[0]).toBe('LOOPS_BASICS');
  });

  /** Two students at the same stage must still sit the same paper. */
  it('is deterministic across repeated runs', () => {
    const p = priority({ LOOPS_BASICS: { weight: 9 } });
    const a = rankSkills(candidates, skills, POLICY, p).map(s => s.skillKey);
    const b = rankSkills(candidates.slice().reverse(), skills, POLICY, p).map(s => s.skillKey);
    expect(b).toEqual(a);
  });
});

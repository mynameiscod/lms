/**
 * The shared bank, seen from CareerPilot.
 *
 * Two things here are worth a test rather than a careful read. The id spaces of the two
 * banks must never collide, because a collision silently serves the wrong problem. And a
 * database problem has to arrive in the shape the rest of the Practice Lab already speaks —
 * `toPublic`, `runProblem` and the grader were written against PracticeProblem and none of
 * them know a second source exists.
 */

import {
  fromThinkingProblem, toPublic, DB_PREFIX, PRACTICE_BANK,
} from '../services/passportPracticeService';

const DOC = (over: any = {}) => ({
  _id: '6a1f2c3d4e5f60718293a4b5',
  title: 'Two Sum',
  category: 'Arrays',
  difficulty: 'medium',
  language: 'python',
  statement: 'Find two numbers that add to the target.',
  starterCode: 'def two_sum(nums, target):\n    pass',
  hints: ['Try a hash map.', 'One pass is enough.'],
  xp: 80,
  testCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', hidden: false },
    { input: '[3,2,4]\n6', expectedOutput: '[1,2]', hidden: true },
  ],
  ...over,
});

describe('a database problem becomes a practice problem', () => {
  it('keeps its own difficulty rather than flattening to hard', () => {
    expect(fromThinkingProblem(DOC({ difficulty: 'interview' })).difficulty).toBe('interview');
    expect(fromThinkingProblem(DOC({ difficulty: 'expert' })).difficulty).toBe('expert');
  });

  it('carries the admin-set XP', () => {
    expect(fromThinkingProblem(DOC({ xp: 120 })).xp).toBe(120);
  });

  it('falls back to a usable XP when the field is missing', () => {
    expect(fromThinkingProblem(DOC({ xp: undefined })).xp).toBe(50);
  });

  it('maps test cases into the shape the runner expects', () => {
    const p = fromThinkingProblem(DOC());
    expect(p.tests).toEqual([
      { input: '[2,7,11,15]\n9', expected: '[0,1]', hidden: false },
      { input: '[3,2,4]\n6', expected: '[1,2]', hidden: true },
    ]);
  });

  it('puts the starter code under its language', () => {
    const p = fromThinkingProblem(DOC());
    expect((p.starter as any).python).toContain('def two_sum');
  });
});

describe('hidden test cases stay hidden', () => {
  /**
   * The whole point of the `hidden` flag. If it were dropped in translation, every student
   * would be handed the cases their Submit is graded against.
   */
  it('never reaches the student payload', () => {
    const pub = toPublic(fromThinkingProblem(DOC()));
    expect(pub.sampleTests).toHaveLength(1);
    expect(pub.sampleTests[0].input).toContain('[2,7,11,15]');
    expect(JSON.stringify(pub)).not.toContain('[3,2,4]');
  });

  it('still counts toward the total the student is told about', () => {
    expect(toPublic(fromThinkingProblem(DOC())).testCount).toBe(2);
  });
});

describe('the two id spaces cannot collide', () => {
  it('prefixes every database problem', () => {
    expect(fromThinkingProblem(DOC()).id).toBe(`${DB_PREFIX}6a1f2c3d4e5f60718293a4b5`);
  });

  /**
   * `findCareerPilotProblem` routes on this prefix alone. A built-in whose id happened to
   * start with "db:" would be looked up in Mongo, found missing, and 404 for everybody.
   */
  it('and no built-in uses that prefix', () => {
    const clashes = PRACTICE_BANK.filter(p => p.id.startsWith(DB_PREFIX));
    expect(clashes).toEqual([]);
  });

  it('so built-in ids are still routed to the code bank', () => {
    expect(PRACTICE_BANK.length).toBeGreaterThan(0);
    PRACTICE_BANK.forEach(p => expect(p.id.startsWith(DB_PREFIX)).toBe(false));
  });
});

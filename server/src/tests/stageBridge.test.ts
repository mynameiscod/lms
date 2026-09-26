/**
 * Bridging: the rule that decides whether a learner is taught the previous stage first.
 *
 * The product question behind every case here is one sentence: a second-year who did Year 1
 * starts on objects, and a second-year who did not starts on the fundamentals objects are made
 * of. These tests exist because that distinction is made ONLY from Skill DNA — there is no
 * "returning member" flag to inspect — so the rule itself has to be trustworthy.
 */

import {
  bridgePlanFor, BRIDGE_READY_SCORE, BRIDGE_SKILLS, BRIDGE_SOURCE_STAGE,
  MAX_BRIDGE_SHARE, DAYS_PER_BRIDGE_SKILL,
} from '../data/stageBridgePolicy';

/** A profile carrying exactly the measured skills named. Skills absent here are UNMEASURED. */
const profileOf = (scores: Record<string, number>): any => ({
  skills: new Map(Object.entries(scores).map(([k, score]) => [k, { score, confidence: 'MEDIUM' }])),
});

const BUILD_DAYS = 110;

describe('who gets bridged', () => {
  it('bridges a fresh second-year measured below the ready score', () => {
    const plan = bridgePlanFor(
      profileOf({ PROGRAMMING_FUNDAMENTALS: 17, PROBLEM_SOLVING: 16, DSA_ARRAYS: 34 }),
      'build', BUILD_DAYS,
    );
    expect(plan).not.toBeNull();
    expect(plan!.sourceStages).toEqual(['foundation']);
    expect(plan!.skills).toEqual(['PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'DSA_ARRAYS']);
    expect(plan!.days).toBe(3 * DAYS_PER_BRIDGE_SKILL);
  });

  it('does NOT bridge a returning Year-1 member — they start on the year they bought', () => {
    const plan = bridgePlanFor(
      profileOf({ PROGRAMMING_FUNDAMENTALS: 78, PROBLEM_SOLVING: 71, DSA_ARRAYS: 66, SQL_BASICS: 62 }),
      'build', BUILD_DAYS,
    );
    expect(plan).toBeNull();
  });

  it('bridges only the skill a returning member is actually weak on', () => {
    const plan = bridgePlanFor(
      profileOf({ PROGRAMMING_FUNDAMENTALS: 80, PROBLEM_SOLVING: 75, SQL_BASICS: 20 }),
      'build', BUILD_DAYS,
    );
    expect(plan!.skills).toEqual(['SQL_BASICS']);
    expect(plan!.days).toBe(DAYS_PER_BRIDGE_SKILL);
  });

  it('treats the ready score as a floor, not a ceiling', () => {
    expect(bridgePlanFor(profileOf({ PROBLEM_SOLVING: BRIDGE_READY_SCORE }), 'build', BUILD_DAYS)).toBeNull();
    expect(bridgePlanFor(profileOf({ PROBLEM_SOLVING: BRIDGE_READY_SCORE - 1 }), 'build', BUILD_DAYS)).not.toBeNull();
  });
});

describe('who is never bridged', () => {
  it('never bridges Foundation — it IS the fundamentals, and there is no earlier stage', () => {
    expect(BRIDGE_SOURCE_STAGE.foundation).toBeUndefined();
    expect(bridgePlanFor(profileOf({ PROGRAMMING_FUNDAMENTALS: 0, PROBLEM_SOLVING: 0 }), 'foundation', 90)).toBeNull();
  });

  it('never bridges a stage that has no bridge configured', () => {
    expect(bridgePlanFor(profileOf({ PROBLEM_SOLVING: 0 }), 'launch', 90)).toBeNull();
    expect(bridgePlanFor(profileOf({ PROBLEM_SOLVING: 0 }), null, 90)).toBeNull();
  });

  /**
   * THE CASE THAT PROTECTS THE RETURNING MEMBER.
   *
   * The entry test measures eight skills, so most of BRIDGE_SKILLS is unmeasured for everybody.
   * If silence counted as weakness every learner would be bridged, including the one this whole
   * feature exists to let through untouched.
   */
  it('does not treat an unmeasured skill as a gap', () => {
    expect(bridgePlanFor(profileOf({}), 'build', BUILD_DAYS)).toBeNull();
    const plan = bridgePlanFor(profileOf({ PROBLEM_SOLVING: 10 }), 'build', BUILD_DAYS);
    expect(plan!.skills).toEqual(['PROBLEM_SOLVING']);
  });

  it('ignores a skill measured without a score', () => {
    const profile: any = { skills: new Map([['PROBLEM_SOLVING', { score: null, confidence: 'LOW' }]]) };
    expect(bridgePlanFor(profile, 'build', BUILD_DAYS)).toBeNull();
  });

  it('survives a profile with no skill map at all rather than throwing', () => {
    expect(bridgePlanFor({} as any, 'build', BUILD_DAYS)).toBeNull();
    expect(bridgePlanFor({ skills: undefined } as any, 'build', BUILD_DAYS)).toBeNull();
  });
});

describe('how much of the programme a bridge may take', () => {
  /**
   * A learner who bought Year 2 must still be taught Year 2. Without this, somebody weak on
   * every measured skill would be sold a second-year membership and handed a first-year plan.
   */
  it('never spends more than a third of the programme, however many gaps there are', () => {
    const everything: Record<string, number> = {};
    for (const key of BRIDGE_SKILLS.build) everything[key] = 5;

    const plan = bridgePlanFor(profileOf(everything), 'build', BUILD_DAYS)!;
    expect(plan.days).toBe(Math.floor(BUILD_DAYS * MAX_BRIDGE_SHARE));
    expect(plan.days).toBeLessThan(BUILD_DAYS - plan.days);
  });

  it('scales the cap with the programme an admin has set', () => {
    const everything: Record<string, number> = {};
    for (const key of BRIDGE_SKILLS.build) everything[key] = 5;

    expect(bridgePlanFor(profileOf(everything), 'build', 60)!.days).toBe(Math.floor(60 * MAX_BRIDGE_SHARE));
    expect(bridgePlanFor(profileOf(everything), 'build', 180)!.days).toBe(Math.floor(180 * MAX_BRIDGE_SHARE));
  });

  it('orders the gaps worst first, so a capped bridge spends its days on the biggest', () => {
    const plan = bridgePlanFor(
      profileOf({ SQL_BASICS: 45, PROBLEM_SOLVING: 5, PROGRAMMING_FUNDAMENTALS: 25 }),
      'build', BUILD_DAYS,
    )!;
    expect(plan.skills).toEqual(['PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'SQL_BASICS']);
  });

  it('gives no bridge at all rather than a zero-day one on a programme too short to spare any', () => {
    expect(bridgePlanFor(profileOf({ PROBLEM_SOLVING: 5 }), 'build', 2)).toBeNull();
  });
});

describe('the skills a second-year is assumed to hold', () => {
  it('names only skills, with no duplicates', () => {
    const skills = BRIDGE_SKILLS.build;
    expect(skills.length).toBeGreaterThan(0);
    expect(new Set(skills).size).toBe(skills.length);
    for (const key of skills) expect(key).toMatch(/^[A-Z0-9_]+$/);
  });
});

/**
 * Year 3 has TWO stages behind it, and that is not a bigger version of Year 2's problem.
 *
 * A fresh third-year may have done neither year, and the two gaps are different shapes: missing
 * objects is a Year-2 gap, missing loops is a Year-1 one. A single source stage could only ever
 * serve one of them, so a third-year who could not write a loop would have been handed Year-2
 * objects as their remediation.
 */
describe('a stage with two stages behind it', () => {
  const SPECIALIZE_DAYS = 130;

  it('borrows from both years, nearest first', () => {
    expect(BRIDGE_SOURCE_STAGE.specialize).toEqual(['build', 'foundation']);
  });

  it('bridges a third-year who is missing the engineering layer', () => {
    const plan = bridgePlanFor(
      profileOf({ OOP_CONCEPTS: 20, DSA_COMPLEXITY: 30, REST_APIS: 15 }),
      'specialize', SPECIALIZE_DAYS,
    );
    expect(plan).not.toBeNull();
    expect(plan!.sourceStages).toEqual(['build', 'foundation']);
    /* Worst first, so a capped bridge spends its days on the biggest gap. */
    expect(plan!.skills[0]).toBe('REST_APIS');
  });

  it('leaves a third-year who has the engineering layer alone', () => {
    const held: Record<string, number> = {};
    for (const key of BRIDGE_SKILLS.specialize) held[key] = BRIDGE_READY_SCORE;
    expect(bridgePlanFor(profileOf(held), 'specialize', SPECIALIZE_DAYS)).toBeNull();
  });

  /**
   * The list is the ENGINEERING layer, not Year 2's fourteen plus Year 3's own. Year 1 reaches
   * a student through the ladder instead: the bridge pulls in each gap topic's predecessors, and
   * for a Year-2 topic those run back into Year 1. Listing both would double-count.
   */
  it('assumes a third-year can already program, and names only what Year 3 stands on', () => {
    const y3 = new Set<string>(BRIDGE_SKILLS.specialize);
    for (const beginner of ['PYTHON_BASICS', 'LOOPS_BASICS', 'CONDITIONALS_BASICS', 'IDE_PROFICIENCY']) {
      expect(y3.has(beginner)).toBe(false);
    }
    for (const engineering of ['OOP_CONCEPTS', 'DSA_COMPLEXITY', 'REST_APIS', 'TESTING_FUNDAMENTALS']) {
      expect(y3.has(engineering)).toBe(true);
    }
  });

  it('still caps a third-year bridge at a third of the programme', () => {
    const weak: Record<string, number> = {};
    for (const key of BRIDGE_SKILLS.specialize) weak[key] = 5;
    const plan = bridgePlanFor(profileOf(weak), 'specialize', SPECIALIZE_DAYS)!;
    expect(plan.days).toBe(Math.floor(SPECIALIZE_DAYS * MAX_BRIDGE_SHARE));
    expect(plan.days).toBeLessThan(SPECIALIZE_DAYS - plan.days);
  });
});

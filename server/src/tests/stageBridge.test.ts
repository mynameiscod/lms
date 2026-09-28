/**
 * Bridging: the rule that decides whether a learner is taught the previous stage first.
 *
 * The product question behind every case here is one sentence: a second-year who did Year 1
 * starts on objects, and a second-year who did not starts on the fundamentals objects are made
 * of. These tests exist because that distinction is made ONLY from Skill DNA — there is no
 * "returning member" flag to inspect — so the rule itself has to be trustworthy.
 */

import { UNITS_PER_UNMEASURED_BRIDGE_SKILL, MAX_BRIDGE_SKILLS, bridgeUnitsPerDay,
  bridgePlanFor, BRIDGE_READY_SCORE, BRIDGE_SKILLS, BRIDGE_SOURCE_STAGE,
  MAX_BRIDGE_SHARE, UNITS_PER_BRIDGE_SKILL,
} from '../data/stageBridgePolicy';
import { densityFor } from '../data/learningDensityPolicy';

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
    /*
     * The three they were measured on and failed come first and in order. This learner showed
     * nothing at or above the line, so their eleven unanswered skills are not taken as held
     * either — the unknowns follow, and the whole list is cut at MAX_BRIDGE_SKILLS.
     */
    expect(plan!.skills.slice(0, 3)).toEqual(['PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'DSA_ARRAYS']);
    expect(plan!.skills.length).toBeLessThanOrEqual(MAX_BRIDGE_SKILLS);
    /*
     * In UNITS. A demonstrated gap implies ten units of Year-1 teaching and an unknown four; the
     * DAYS that takes are the learner's own density, which is why these constants count units.
     */
    expect(plan!.units).toBe(
      3 * UNITS_PER_BRIDGE_SKILL
      + (plan!.skills.length - 3) * UNITS_PER_UNMEASURED_BRIDGE_SKILL,
    );
    expect(plan!.days).toBe(Math.ceil(plan!.units / bridgeUnitsPerDay(densityFor(null, 'build'))));
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
    /**
     * TEN UNITS OF TEACHING, AND THE DAYS ARE THE LEARNER'S OWN.
     *
     * A gap is worth ten units. How many DAYS that takes depends on density, which is the point
     * of the change: this learner is strong enough to be STEADY, so the same ten units cost five
     * days rather than ten, and the five days saved go to the year they actually paid for. The
     * content does not shrink; the calendar it occupies does.
     */
    expect(plan!.units).toBe(UNITS_PER_BRIDGE_SKILL);
    expect(plan!.days).toBe(Math.ceil(UNITS_PER_BRIDGE_SKILL / bridgeUnitsPerDay(densityFor(null, 'build'))));
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
   * THE CASE THAT PROTECTS THE RETURNING MEMBER — AND ITS LIMIT.
   *
   * The entry test measures eight skills and a stage assumes fourteen, so most of BRIDGE_SKILLS
   * is unmeasured for everybody. Treating every silence as weakness would bridge the returning
   * member this whole feature exists to let through; treating every silence as competence gave a
   * fresh third-year a four-day bridge and a member with no Skill DNA no bridge at all.
   *
   * So silence is read in the light of what they DID show: trusted from a learner with any
   * assumed skill at or above the line, and not from one who has shown nothing.
   */
  it('trusts silence from a learner who has shown something', () => {
    const plan = bridgePlanFor(
      profileOf({ PROBLEM_SOLVING: 10, PROGRAMMING_FUNDAMENTALS: 78 }), 'build', BUILD_DAYS,
    )!;
    expect(plan.skills).toEqual(['PROBLEM_SOLVING']);
  });

  it('does not trust silence from a learner who has shown nothing', () => {
    /* No Skill DNA at all: the fresh joiner who was getting no bridge whatsoever. */
    const plan = bridgePlanFor(profileOf({}), 'build', BUILD_DAYS);
    expect(plan).not.toBeNull();
    expect(plan!.skills.length).toBeGreaterThan(0);
    expect(plan!.skills.every(k => (BRIDGE_SKILLS.build as readonly string[]).includes(k))).toBe(true);

    /* Measured, but only below the line — still no reason to believe the year can stand on them. */
    const weak = bridgePlanFor(profileOf({ PROBLEM_SOLVING: 10 }), 'build', BUILD_DAYS)!;
    expect(weak.skills[0]).toBe('PROBLEM_SOLVING');
    expect(weak.skills.length).toBeGreaterThan(1);
  });

  it('treats a skill measured without a score as unmeasured, not as held', () => {
    const profile: any = { skills: new Map([['PROBLEM_SOLVING', { score: null, confidence: 'LOW' }]]) };
    /*
     * A null score is not positive evidence, so it cannot be the thing that makes silence
     * trustworthy — this learner is bridged. Which of the unknowns the bridge reaches is the
     * worst-first ordering's business and the MAX_BRIDGE_SKILLS cut's, not this test's.
     */
    const plan = bridgePlanFor(profile, 'build', BUILD_DAYS);
    expect(plan).not.toBeNull();
    expect(plan!.skills.length).toBeGreaterThan(0);
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
    expect(plan.days).toBeLessThanOrEqual(Math.floor(BUILD_DAYS * MAX_BRIDGE_SHARE));
    expect(plan.days).toBeLessThan(BUILD_DAYS - plan.days);
  });

  /**
   * THE CAP IS A CEILING, NOT A QUOTA.
   *
   * On a short programme the content is larger than a third of it and the cap binds, which is
   * the rule this exists to protect. On a long one the same fourteen gaps now fit inside the
   * third with room to spare, because a bridge day carries three short Year-1 units rather than
   * the year's own two — so the bridge takes what it needs and gives the rest back. Asserting
   * the cap is always REACHED would be asserting that the bridge always spends its whole
   * allowance, which is the opposite of what it should do.
   */
  it('scales the cap with the programme an admin has set, and never exceeds it', () => {
    const everything: Record<string, number> = {};
    for (const key of BRIDGE_SKILLS.build) everything[key] = 5;

    for (const days of [60, 110, 180]) {
      const plan = bridgePlanFor(profileOf(everything), 'build', days)!;
      expect(plan.days).toBeLessThanOrEqual(Math.floor(days * MAX_BRIDGE_SHARE));
      expect(plan.days).toBeGreaterThan(0);
    }
    /* Short programme: the content is bigger than the allowance, so the allowance decides. */
    expect(bridgePlanFor(profileOf(everything), 'build', 60)!.days)
      .toBe(Math.floor(60 * MAX_BRIDGE_SHARE));
  });

  it('orders the gaps worst first, so a capped bridge spends its days on the biggest', () => {
    const plan = bridgePlanFor(
      profileOf({ SQL_BASICS: 45, PROBLEM_SOLVING: 5, PROGRAMMING_FUNDAMENTALS: 25 }),
      'build', BUILD_DAYS,
    )!;
    /* Measured gaps come first and in order; unknowns follow, and the list is cut at MAX_BRIDGE_SKILLS. */
    expect(plan.skills.slice(0, 3)).toEqual(['PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'SQL_BASICS']);
    expect(plan.skills.length).toBeLessThanOrEqual(MAX_BRIDGE_SKILLS);
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
    /*
     * The cap is a ceiling. A bridge acts on the worst MAX_BRIDGE_SKILLS gaps rather than on
     * every one, so it takes what it needs and gives the rest of the year back — which is the
     * whole reason a weak third-year now keeps their specialization and their capstone.
     */
    expect(plan.days).toBeLessThanOrEqual(Math.floor(SPECIALIZE_DAYS * MAX_BRIDGE_SHARE));
    expect(plan.days).toBeLessThan(SPECIALIZE_DAYS - plan.days);
  });
});

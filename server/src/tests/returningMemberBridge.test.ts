/**
 * The case the whole bridge design turns on: a returning Year-1 member arriving at Year 2.
 *
 * stageBridge.test.ts proves the RULE against profiles written by hand. This proves the SEAM —
 * real Skill DNA rows, through the real profile builder, into the real bridge decision — because
 * that is where the two cases actually diverge, and it is the one nobody could try on a live
 * account: both second-years on the tenant are fresh joiners, and no student has yet arrived
 * carrying a year of evidence.
 *
 * If this seam is wrong the failure is silent and expensive: a returning member is handed thirty
 * days of fundamentals they finished last year, or a fresh joiner is dropped straight into
 * objects. Neither shows up as an error anywhere.
 */

const getSkillDna = jest.fn();
const getEvidenceBases = jest.fn();

jest.mock('../services/skillDnaService', () => ({
  getSkillDna: (...a: any[]) => getSkillDna(...a),
  getEvidenceBases: (...a: any[]) => getEvidenceBases(...a),
}));

import { buildFoundationProfile } from '../services/foundationProfileService';
import { UNITS_PER_UNMEASURED_BRIDGE_SKILL, MAX_BRIDGE_SKILLS, bridgeUnitsPerDay, bridgePlanFor, BRIDGE_READY_SCORE, UNITS_PER_BRIDGE_SKILL } from '../data/stageBridgePolicy';
import { densityFor } from '../data/learningDensityPolicy';

const TENANT = '6aa8e4d702b4b0e2097b221d';
const STUDENT = '5f9d1b2c3a4b5c6d7e8f9999';
const BUILD_DAYS = 110;

/** A Skill DNA row as skillDnaService returns one. */
const dna = (skillKey: string, score: number, confidence = 'MEDIUM') => ({
  skillKey, score, confidence, skillActive: true,
});

beforeEach(() => {
  getSkillDna.mockReset();
  getEvidenceBases.mockReset().mockResolvedValue(new Map());
});

/** The bridge decision for this student, taken the way production takes it. */
const bridgeFor = async () => {
  const { profile, summary } = await buildFoundationProfile(TENANT, STUDENT, {});
  return { plan: bridgePlanFor(profile, 'build', BUILD_DAYS), summary, profile };
};

describe('a returning Year-1 member', () => {
  /**
   * What a year of CareerPilot leaves behind: evidence on the skills Year 1 teaches, at the
   * scores somebody who did the work would hold.
   */
  beforeEach(() => {
    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 78, 'HIGH'),
      dna('PROBLEM_SOLVING', 71, 'HIGH'),
      dna('FUNCTIONS_BASICS', 74, 'HIGH'),
      dna('LOOPS_BASICS', 80, 'HIGH'),
      dna('CONDITIONALS_BASICS', 82, 'HIGH'),
      dna('DSA_ARRAYS', 66, 'MEDIUM'),
      dna('PYTHON_BASICS', 69, 'MEDIUM'),
      dna('SQL_BASICS', 62, 'MEDIUM'),
      dna('GIT_FUNDAMENTALS', 58, 'MEDIUM'),
    ]);
  });

  it('is not bridged — they open on the year they bought', async () => {
    const { plan, summary } = await bridgeFor();
    expect(summary.measured).toBeGreaterThan(0);
    expect(plan).toBeNull();
  });

  it('is still not bridged when one skill has faded but stays above the line', async () => {
    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 78),
      dna('PROBLEM_SOLVING', BRIDGE_READY_SCORE),   // exactly ready
      dna('DSA_ARRAYS', 66),
    ]);
    expect((await bridgeFor()).plan).toBeNull();
  });

  /**
   * The case that argues for a per-skill bridge rather than an all-or-nothing one: somebody who
   * did Year 1 well but never touched databases should get databases, not a month of variables.
   */
  it('is bridged only on the one thing that faded', async () => {
    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 80, 'HIGH'),
      dna('PROBLEM_SOLVING', 75, 'HIGH'),
      dna('FUNCTIONS_BASICS', 77, 'HIGH'),
      dna('SQL_BASICS', 18, 'MEDIUM'),
    ]);
    const { plan } = await bridgeFor();
    expect(plan).not.toBeNull();
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
});

describe('a fresh second-year joiner', () => {
  /**
   * What the Year-2 entry test leaves behind: eight skills, measured low, because they have not
   * been taught any of it here.
   */
  beforeEach(() => {
    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 17),
      dna('PROBLEM_SOLVING', 16),
      dna('DSA_ARRAYS', 34),
      dna('DSA_COMPLEXITY', 15),
      dna('DSA_STRINGS', 14),
      dna('OOP_CONCEPTS', 0),
      dna('PATTERN_RECOGNITION', 0),
      dna('DSA_SEARCHING', 0),
    ]);
  });

  it('is bridged, worst gap first', async () => {
    const { plan } = await bridgeFor();
    expect(plan).not.toBeNull();
    expect(plan!.sourceStages).toEqual(['foundation']);
    /*
     * The three they failed, in order, followed by unknowns — this learner showed nothing at or
     * above the line, so their unanswered skills are not taken as held either.
     */
    expect(plan!.skills.slice(0, 3)).toEqual(['PROBLEM_SOLVING', 'PROGRAMMING_FUNDAMENTALS', 'DSA_ARRAYS']);
    expect(plan!.skills.length).toBeLessThanOrEqual(MAX_BRIDGE_SKILLS);
    /*
     * THE CONTENT IS THE INVARIANT; THE CALENDAR IS THE LEARNER'S. Three unmet skills imply
     * thirty UNITS of teaching whoever the learner is. How many DAYS that occupies is their own
     * density — which is the whole reason UNITS_PER_BRIDGE_SKILL is counted in units and not,
     * as it once was, in days.
     */
    /* Ten units per demonstrated gap, four per unknown — see UNITS_PER_UNMEASURED_BRIDGE_SKILL. */
    expect(plan!.units).toBe(
      3 * UNITS_PER_BRIDGE_SKILL
      + (plan!.skills.length - 3) * UNITS_PER_UNMEASURED_BRIDGE_SKILL,
    );
    expect(plan!.days).toBe(Math.ceil(plan!.units / bridgeUnitsPerDay(densityFor(null, 'build'))));
  });

  /**
   * OOP_CONCEPTS is measured at zero and is NOT bridged, which looks wrong until you see why:
   * Year 2 teaches it. Bridging is for what Year 2 assumes, not for what it is about to cover.
   */
  it('is not bridged on the skills Year 2 exists to teach', async () => {
    const { plan } = await bridgeFor();
    expect(plan!.skills).not.toContain('OOP_CONCEPTS');
    expect(plan!.skills).not.toContain('DSA_COMPLEXITY');
  });
});

describe('the two, side by side', () => {
  /**
   * THE WHOLE POINT, IN ONE TEST. The same code, the same stage, the same programme length —
   * and a whole bridge of difference, decided by nothing but the evidence each one carries. No
   * flag distinguishes them, which is what makes it impossible for the flag to be wrong.
   */
  it('differ by a whole bridge on evidence alone', async () => {
    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 17), dna('PROBLEM_SOLVING', 16), dna('DSA_ARRAYS', 34),
    ]);
    const fresh = (await bridgeFor()).plan;

    getSkillDna.mockResolvedValue([
      dna('PROGRAMMING_FUNDAMENTALS', 78), dna('PROBLEM_SOLVING', 71), dna('DSA_ARRAYS', 66),
    ]);
    const returning = (await bridgeFor()).plan;

    /* In UNITS: the gap is the same figure at any pace, where the calendar is not. */
    expect(fresh!.units).toBeGreaterThanOrEqual(3 * UNITS_PER_BRIDGE_SKILL);
    expect(returning).toBeNull();
    expect(fresh!.units - (returning?.units ?? 0)).toBe(fresh!.units);
    expect(fresh!.days).toBeGreaterThan(0);
  });

  /**
   * A retired skill must not decide anybody's plan. The profile drops it, so the bridge cannot
   * see it — worth pinning here, because the failure would be a member bridged on a skill the
   * platform has stopped measuring.
   */
  it('ignores evidence on a skill the registry has retired', async () => {
    getSkillDna.mockResolvedValue([
      { skillKey: 'PROGRAMMING_FUNDAMENTALS', score: 5, confidence: 'HIGH', skillActive: false },
      dna('PROBLEM_SOLVING', 75),
    ]);
    expect((await bridgeFor()).plan).toBeNull();
  });
});

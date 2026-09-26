/**
 * Revision: what a continuing member gets, and why it is not the bridge.
 *
 * The product question is one sentence: somebody who finished Year 2 well should not be dropped
 * into advanced specialization on day one, months after they last wrote a loop — but they also
 * must not be re-taught a year they have already bought and passed.
 *
 * The bridge and this are opposites and they look alike, which is the danger:
 *
 *   bridge    score BELOW the ready mark   ->  teach it
 *   revision  score AT or ABOVE it         ->  practise it
 *
 * Getting that backwards would re-teach the able and hand a refresher to somebody who never
 * learned the thing, so every case here is about which of the two claims a given student.
 */

import { bridgePlanFor, BRIDGE_SKILLS, BRIDGE_READY_SCORE } from '../data/stageBridgePolicy';
import {
  revisionPlanFor, UNITS_PER_REVISION_SKILL, MAX_REVISION_SHARE,
} from '../data/stageRevisionPolicy';

const profileOf = (scores: Record<string, number>): any => ({
  skills: new Map(Object.entries(scores).map(([k, score]) => [k, { score, confidence: 'HIGH' }])),
});

const allAt = (stage: 'build' | 'specialize', score: number): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const key of BRIDGE_SKILLS[stage]) out[key] = score;
  return out;
};

const YEAR3_DAYS = 130;

describe('who gets revision', () => {
  it('refreshes a member who holds everything the year stands on', () => {
    const plan = revisionPlanFor(profileOf(allAt('specialize', 88)), 'specialize', YEAR3_DAYS);
    expect(plan).not.toBeNull();
    expect(plan!.skills.length).toBe(BRIDGE_SKILLS.specialize.length);
    expect(plan!.days).toBeGreaterThan(0);
  });

  /**
   * The rule the whole thing turns on. A student with ANY gap belongs to the bridge, and being
   * taught the fundamentals AND asked to revise them in one programme is the same days spent
   * twice.
   */
  it('gives nothing to a student who has a gap, because the bridge has them', () => {
    const oneGap = { ...allAt('specialize', 88), OOP_CONCEPTS: 20 };
    expect(bridgePlanFor(profileOf(oneGap), 'specialize', YEAR3_DAYS)).not.toBeNull();
    expect(revisionPlanFor(profileOf(oneGap), 'specialize', YEAR3_DAYS)).toBeNull();
  });

  it('gives nothing to a fresh third-year, who needs teaching rather than reminding', () => {
    expect(revisionPlanFor(profileOf(allAt('specialize', 25)), 'specialize', YEAR3_DAYS)).toBeNull();
  });

  /**
   * Unmeasured is not evidence of competence, exactly as it is not evidence of a gap. There is
   * nothing to refresh in a skill nobody has ever asked about.
   */
  it('gives nothing when nothing has been measured', () => {
    expect(revisionPlanFor(profileOf({}), 'specialize', YEAR3_DAYS)).toBeNull();
    expect(revisionPlanFor({ skills: undefined } as any, 'specialize', YEAR3_DAYS)).toBeNull();
  });

  it('treats the ready score as the boundary, the same way the bridge does', () => {
    const at = profileOf(allAt('specialize', BRIDGE_READY_SCORE));
    expect(revisionPlanFor(at, 'specialize', YEAR3_DAYS)).not.toBeNull();
    const below = profileOf(allAt('specialize', BRIDGE_READY_SCORE - 1));
    expect(revisionPlanFor(below, 'specialize', YEAR3_DAYS)).toBeNull();
  });

  it('has nothing to do for a stage with no stage behind it', () => {
    expect(revisionPlanFor(profileOf(allAt('specialize', 88)), 'foundation', 90)).toBeNull();
    expect(revisionPlanFor(profileOf(allAt('specialize', 88)), null, 90)).toBeNull();
  });
});

describe('how much of the programme revision may take', () => {
  /**
   * A bridge may take a third, because a student who cannot write a loop cannot begin. Revision
   * is a warm-up for somebody already able; past a tenth it stops being a refresher and starts
   * being the previous year again.
   */
  it('never spends more than a tenth of the programme', () => {
    const plan = revisionPlanFor(profileOf(allAt('specialize', 88)), 'specialize', YEAR3_DAYS)!;
    expect(plan.days).toBeLessThanOrEqual(Math.floor(YEAR3_DAYS * MAX_REVISION_SHARE));
  });

  it('is far shorter than the bridge for the same number of skills', () => {
    const revision = revisionPlanFor(profileOf(allAt('specialize', 88)), 'specialize', YEAR3_DAYS)!;
    const bridge = bridgePlanFor(profileOf(allAt('specialize', 20)), 'specialize', YEAR3_DAYS)!;
    expect(revision.days).toBeLessThan(bridge.days);
  });

  it('counts three units of practice per held skill, not a lesson each', () => {
    const two = { OOP_CONCEPTS: 90, CLEAN_CODE: 90 };
    const plan = revisionPlanFor(profileOf(two), 'specialize', YEAR3_DAYS)!;
    expect(plan.units).toBe(2 * UNITS_PER_REVISION_SKILL);
  });

  /**
   * Same reasoning as the bridge: the content is the plan's, the days are the learner's.
   *
   * Five skills deliberately, not all fourteen. With fourteen both learners hit the tenth-of
   * -the-programme ceiling, and the difference shows up as the faster one getting MORE
   * practice into the same days rather than finishing sooner — which is correct, and not
   * the property being checked here. A smaller set keeps the cap out of the way.
   */
  it('takes fewer days for a faster learner, for the same practice', () => {
    const five = BRIDGE_SKILLS.specialize.slice(0, 5);
    const at = (score: number) => profileOf(Object.fromEntries(five.map(k => [k, score])));
    const slow = revisionPlanFor(at(55), 'specialize', YEAR3_DAYS)!;
    const fast = revisionPlanFor(at(92), 'specialize', YEAR3_DAYS)!;
    expect(fast.units).toBe(slow.units);
    expect(fast.days).toBeLessThan(slow.days);
  });

  /** And when the cap DOES bind, the faster learner gets more practice in the same days. */
  it('fills a capped revision with more practice for a faster learner', () => {
    const slow = revisionPlanFor(profileOf(allAt('specialize', 55)), 'specialize', YEAR3_DAYS)!;
    const fast = revisionPlanFor(profileOf(allAt('specialize', 92)), 'specialize', YEAR3_DAYS)!;
    expect(fast.days).toBe(slow.days);
    expect(fast.units).toBeGreaterThan(slow.units);
  });
});

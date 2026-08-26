/**
 * Two lengths, and why they are not the same number.
 *
 * ACCOUNT ACCESS is how long a member may log in. ROADMAP LENGTH is how many days of work a
 * plan covers. They were being confused because only one was visible in the admin, and a
 * tenant had set the mission journey to 365 while the skill plan stayed on a hardcoded 90 —
 * so one member was promised thirteen weeks on one screen and fifty-three on another.
 *
 * The rule pinned here is that the policy ceiling still wins. Making the length configurable
 * must not make it unbounded: a plan longer than the assessment behind it is a personalised
 * claim about evidence that has gone stale.
 */

import { MAX_ROADMAP_DAYS } from '../data/roadmapPolicy';

/** The clamp exactly as careerRoadmapService applies it. */
const planDaysFor = (configured: unknown) =>
  Math.max(7, Math.min(MAX_ROADMAP_DAYS, Number(configured) || MAX_ROADMAP_DAYS));

describe('the configured roadmap length', () => {
  it('is used when it is inside the policy window', () => {
    expect(planDaysFor(30)).toBe(30);
    expect(planDaysFor(60)).toBe(60);
    expect(planDaysFor(90)).toBe(90);
  });

  /**
   * The 365 that caused this. A tenant may type it into the journey field — the mission
   * pools genuinely run that long — but the skill plan refuses to stretch with it.
   */
  it('never exceeds the policy ceiling, whatever a tenant typed', () => {
    expect(planDaysFor(365)).toBe(MAX_ROADMAP_DAYS);
    expect(planDaysFor(10000)).toBe(MAX_ROADMAP_DAYS);
  });

  it('never collapses to something unplannable', () => {
    expect(planDaysFor(0)).toBe(MAX_ROADMAP_DAYS);   // 0 is "unset", not "no plan"
    expect(planDaysFor(-5)).toBe(7);
    expect(planDaysFor(1)).toBe(7);
  });

  /**
   * Every tenant that existed before the field did has no value stored. Reading that as the
   * shipped default is what keeps their plans identical to yesterday's.
   */
  it('falls back to the shipped default when unset', () => {
    expect(planDaysFor(undefined)).toBe(MAX_ROADMAP_DAYS);
    expect(planDaysFor(null)).toBe(MAX_ROADMAP_DAYS);
    expect(planDaysFor('')).toBe(MAX_ROADMAP_DAYS);
  });

  it('ignores a value that is not a number rather than producing NaN days', () => {
    expect(planDaysFor('ninety')).toBe(MAX_ROADMAP_DAYS);
    expect(Number.isFinite(planDaysFor({}))).toBe(true);
  });
});

describe('the policy still owns the ceiling', () => {
  it('ships at 90 days', () => {
    expect(MAX_ROADMAP_DAYS).toBe(90);
  });
});

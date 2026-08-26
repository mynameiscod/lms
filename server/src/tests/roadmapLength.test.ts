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

/**
 * Which stored number the length comes from.
 *
 * Exactly as careerRoadmapService resolves it: the content row first, the config row as a
 * fallback for tenants whose content predates the field, the shipped default last.
 */
const configuredDaysFor = (journeyDays: unknown, roadmapDays: unknown) =>
  Number(journeyDays) || Number(roadmapDays) || MAX_ROADMAP_DAYS;

const resolve = (journeyDays: unknown, roadmapDays: unknown) =>
  planDaysFor(configuredDaysFor(journeyDays, roadmapDays));

describe('where the length is read from', () => {
  /**
   * The bug this closes. A tenant sat on journeyDays 100 / roadmapDays 90 and a member was
   * shown a "90-day plan" stacked directly above a "100-Day Roadmap" — two headings, two
   * lengths, one programme. The journey's number wins so the pair cannot disagree.
   */
  it('prefers the journey length over the older config field', () => {
    expect(resolve(100, 90)).toBe(90);   // clamped, but read from journeyDays
    expect(resolve(60, 90)).toBe(60);
    expect(resolve(30, 90)).toBe(30);
  });

  it('falls back to the config field when content has no value', () => {
    expect(resolve(undefined, 45)).toBe(45);
    expect(resolve(0, 45)).toBe(45);
    expect(resolve(null, 45)).toBe(45);
  });

  it('falls back to the shipped default when neither is set', () => {
    expect(resolve(undefined, undefined)).toBe(MAX_ROADMAP_DAYS);
    expect(resolve(null, null)).toBe(MAX_ROADMAP_DAYS);
  });

  /** The ceiling still applies to whichever source won. */
  it('clamps a journey length that exceeds the ceiling', () => {
    expect(resolve(365, undefined)).toBe(MAX_ROADMAP_DAYS);
  });
});

describe('the policy still owns the ceiling', () => {
  it('ships at 90 days', () => {
    expect(MAX_ROADMAP_DAYS).toBe(90);
  });
});

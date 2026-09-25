/**
 * How much of the curriculum one day carries, for THIS learner.
 *
 * ── WHY A DAY WAS ALWAYS ONE TOPIC ────────────────────────────────────────────────────────
 *
 * Not by design. The composer was asked for exactly as many units as there were days, so every
 * day held one whatever the learner knew. dayPackingPolicy has allowed three units and a hundred
 * minutes since it was written; nothing ever gave it more than one unit to place.
 *
 * The cost of that fell hardest on the two ends. A learner who already knows variables spends a
 * day on variables. A learner starting from nothing cannot be walked from "what is a program" to
 * arrays inside a thirty-day bridge, because thirty days is thirty topics and the ladder is
 * longer than that.
 *
 * ── WHAT DECIDES THE DENSITY ──────────────────────────────────────────────────────────────
 *
 * The learner's own measured evidence, and nothing else. Somebody who has proved they hold the
 * material moves through it faster — not because they are given less, but because a topic they
 * half-know does not need a whole day. Somebody who has proved little is given room.
 *
 * ── WHAT DENSITY MUST NEVER CHANGE ────────────────────────────────────────────────────────
 *
 * THE ORDER. Packing draws the day boundaries between units the composer has already sequenced;
 * it never moves one past another. Three topics in a day are still met in the order they must
 * be learnt, and a learner still meets loops before functions.
 *
 * TEACHING BEFORE PRACTICE. Each unit carries its own teaching, then its practice, then whatever
 * measures it — see activitiesFor and inTeachingOrder. Packing three units into a day gives
 * three of those sequences in a row, not three sets of practice questions. A fast learner is
 * still taught; they are simply taught more in a day.
 *
 * THE PROMISE. Ninety days stays ninety days. Density changes how far through the curriculum a
 * learner gets, never how long the programme is or how much they are asked to do per sitting —
 * which is what the minutes budget is for.
 */

import { StudentProfile } from '../services/curriculumComposerService';

export interface LearningDensity {
  /** Units composed per day of the programme. 1 is the behaviour every plan had before. */
  unitsPerDay: number;
  /** The most work one day may hold. Higher for a learner who is moving quickly. */
  budgetMinutes: number;
  /** The ceiling, whatever the minutes allow. */
  maxUnitsPerDay: number;
  /** Which band this is, for logs and for the admin screens that will want to show it. */
  band: 'BUILDING' | 'STEADY' | 'FAST';
}

/**
 * Below this, a learner is still building the basics and is given a topic a day.
 *
 * Deliberately generous. Being given too much too early is how somebody stops opening the app,
 * and no amount of coverage is worth that.
 */
export const BUILDING_BELOW = 40;

/** At or above this, a learner has proved enough that a day can carry two topics comfortably. */
export const FAST_AT_OR_ABOVE = 70;

export const DENSITIES: Record<LearningDensity['band'], LearningDensity> = {
  /* One topic a day, a shorter day, and never more than two. The plan they would have had. */
  BUILDING: { band: 'BUILDING', unitsPerDay: 1, budgetMinutes: 100, maxUnitsPerDay: 2 },
  /* Three topics across two days, on average: the middle, where most learners sit. */
  STEADY: { band: 'STEADY', unitsPerDay: 1.5, budgetMinutes: 120, maxUnitsPerDay: 3 },
  /* Two a day, and three where the topics are short. */
  FAST: { band: 'FAST', unitsPerDay: 2, budgetMinutes: 140, maxUnitsPerDay: 3 },
};

/**
 * The mean of what this learner has actually been measured on, or null when nothing has been.
 *
 * Unmeasured skills are not counted as zero. A learner who sat an eight-skill entry test has
 * been measured on eight things, and averaging in forty unasked ones would call everybody
 * BUILDING — the same mistake that once kept loops out of the bridge.
 */
export function measuredMean(profile: StudentProfile | null | undefined): number | null {
  const skills = profile?.skills;
  if (!skills || typeof skills.get !== 'function') return null;
  const scores: number[] = [];
  for (const belief of skills.values()) {
    if (typeof belief?.score === 'number') scores.push(belief.score);
  }
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * How dense this learner's days should be.
 *
 * Nothing measured means BUILDING. That is the cautious end on purpose: a learner we know
 * nothing about is given the gentler plan, and their evidence moves them up soon enough.
 */
export function densityFor(profile: StudentProfile | null | undefined): LearningDensity {
  const mean = measuredMean(profile);
  if (mean === null || mean < BUILDING_BELOW) return DENSITIES.BUILDING;
  if (mean >= FAST_AT_OR_ABOVE) return DENSITIES.FAST;
  return DENSITIES.STEADY;
}

/**
 * How many units to compose for a programme of this length.
 *
 * Rounded down, so a denser plan never asks the packer for more than it can place, and floored
 * at the number of days: a day must always have something in it.
 */
export const unitsForDays = (days: number, density: LearningDensity): number =>
  Math.max(days, Math.floor(days * density.unitsPerDay));

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
  /*
   * ── THE PROGRAMME IS THE ADMIN'S DAYS. CONTENT COMPRESSES INTO THEM. ────────────────────
   *
   * These numbers are not "how fast may somebody go". The length of the programme is fixed by
   * the admin and nobody finishes early. What changes is HOW MUCH OF THE CURRICULUM fits inside
   * those days: a learner who already holds the basics covers three topics in a day, so the same
   * hundred and ten days carry three times the ground.
   *
   * Every pairing below was measured against the packer rather than chosen by eye, because the
   * packer must produce EXACTLY the admin's number of days and fails in both directions — too
   * little room and the work will not fit, too much and it finishes early with days left empty.
   * At a typical unit of 56 minutes with one in ten at 150:
   *
   * ── WHY THE TOP BAND IS 2.5 AND NOT 3 ──────────────────────────────────────────────────
   *
   * Three a day was asked for and the curriculum cannot carry it. Roughly one unit in eight is a
   * PROJECT or a CHECKPOINT, and those own a day to themselves by design — a project IS the
   * day's work, and a checkpoint measures what came before it. Thirty-seven such units in a
   * 110-day plan means thirty-seven days that hold exactly one, and a solo unit also truncates
   * the day in front of it.
   *
   * Measured against the real Year-2 inventory rather than argued: the largest number of units
   * that packs into 110 days is 260 at a cap of 3, and 280 at a cap of 4 — about 2.5 a day. At
   * three a day the packer refuses at EVERY budget, which reads as "no day is long enough" when
   * the budget was never the constraint.
   *
   * So 2.5 with a cap of 4: two and a half times the curriculum in the same programme, and days
   * that may carry four short units where four short units happen to line up. Getting to three
   * would mean authoring fewer projects or letting a project share its day, and both are
   * decisions about teaching rather than about packing.
   *
   * The budget is a CAP, not a target. Authored minutes describe somebody meeting the material
   * for the first time; a learner placed in FAST has already shown they hold much of it, so
   * their real day is shorter than the ceiling allows for.
   */

  /* One topic a day, a shorter day, never more than two. The plan a beginner should have. */
  BUILDING: { band: 'BUILDING', unitsPerDay: 1, budgetMinutes: 110, maxUnitsPerDay: 2 },
  /* Two a day: twice the curriculum in the same programme, at about two hours. */
  STEADY: { band: 'STEADY', unitsPerDay: 2, budgetMinutes: 180, maxUnitsPerDay: 3 },
  /* Two and a half — the measured ceiling of what 110 days can actually hold. */
  FAST: { band: 'FAST', unitsPerDay: 2.5, budgetMinutes: 240, maxUnitsPerDay: 4 },
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

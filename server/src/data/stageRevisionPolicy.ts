import { StudentProfile } from '../services/curriculumComposerService';
import { BRIDGE_SOURCE_STAGE, BRIDGE_SKILLS, BRIDGE_READY_SCORE, bridgePlanFor } from './stageBridgePolicy';
import { densityFor, unitsForDays } from './learningDensityPolicy';

/**
 * Revision: what a learner is given when they arrive at a stage ALREADY HOLDING what it assumes.
 *
 * ── WHY THIS IS NOT THE BRIDGE ────────────────────────────────────────────────────────────
 *
 * The bridge teaches what somebody never learned. This refreshes what they did. They look
 * similar and they are opposites, and conflating them would do real harm in both directions:
 * re-teaching a student who already knows it wastes the year they paid for, and handing a
 * refresher to somebody who never learned the thing teaches them nothing.
 *
 *   bridge    score BELOW the ready mark   ->  teach it, from the earlier year's lessons
 *   revision  score AT or ABOVE it         ->  practise it, from the earlier year's exercises
 *
 * ── THE GAP THIS FILLS ────────────────────────────────────────────────────────────────────
 *
 * A student who finished Year 2 well arrives at Year 3 with no measured gaps at all, so
 * `bridgePlanFor` returns null and they drop straight into advanced specialization on day one —
 * months after they last wrote a loop or a join. The product owner asked for this directly: a
 * continuing member should get "one revision" and then the specialization.
 *
 * ── WHY IT IS PRACTICE, NOT LESSONS ───────────────────────────────────────────────────────
 *
 * You do not re-teach somebody who has proved they know it; you have them do it again. So the
 * composer is pointed at the practice, debugging and checkpoint units of the earlier year
 * rather than its concept units. Doing is also what re-measures: a revision run produces fresh
 * evidence, so a skill that HAS faded shows up as a gap and is then taught properly.
 *
 * ── WHY IT IS SHORT ───────────────────────────────────────────────────────────────────────
 *
 * A bridge may take a third of the programme because a student who cannot write a loop cannot
 * start. Revision is a warm-up for somebody already able, so it is capped at a tenth. Past that
 * it stops being a refresher and starts being the previous year again — which they have already
 * bought and already passed.
 */

/** Revision draws on the same earlier years the bridge does, nearest first. */
export const REVISION_SOURCE_STAGE = BRIDGE_SOURCE_STAGE;

/** And on the same skills: what the year stands on is what is worth refreshing. */
export const REVISION_SKILLS = BRIDGE_SKILLS;

/**
 * How much practice one held skill is worth. Three units — enough to remember, not to re-learn.
 *
 * Measured in units rather than days for the same reason the bridge is: how long three units
 * takes is the learner's own density, and a fast learner should not spend a fast learner's week
 * on a warm-up.
 */
export const UNITS_PER_REVISION_SKILL = 3;

/**
 * The most of a programme that may be spent revising.
 *
 * A tenth. On a 130-day Year 3 that is 13 days of warm-up against 117 of the year they came
 * for, which is the right proportion for somebody who has already passed the material.
 */
export const MAX_REVISION_SHARE = 1 / 10;

export interface RevisionPlan {
  /** The stages the revision units are taken from, nearest first. */
  sourceStages: readonly string[];
  /** The skills being refreshed — held, not missing. */
  skills: string[];
  /** How many days of the programme the revision may take. */
  days: number;
  /** How many units of practice those days should carry. */
  units: number;
}

/**
 * What this learner should refresh before the stage begins, or null when there is nothing.
 *
 * Null is the common answer and keeps today's behaviour: a stage with no earlier stage, a
 * learner with no measured evidence at all, or one who has gaps — because a gap is the bridge's
 * business and nobody should get both. Being taught the fundamentals AND asked to revise them
 * in the same programme is the same days spent twice.
 */
export function revisionPlanFor(
  profile: StudentProfile,
  stageKey: string | null | undefined,
  programDays: number,
): RevisionPlan | null {
  const stage = String(stageKey || '').toLowerCase().trim();
  const sourceStages = REVISION_SOURCE_STAGE[stage];
  const required = REVISION_SKILLS[stage];
  if (!sourceStages?.length || !required?.length) return null;

  const held = profile?.skills;
  if (!held || typeof held.get !== 'function') return null;

  /*
   * A learner with any gap is the bridge's, not this one's. Checked by asking the bridge rather
   * than by repeating its rule here, so the two can never disagree about who owns a student.
   */
  if (bridgePlanFor(profile, stage, programDays)) return null;

  /*
   * Only skills they have actually been MEASURED on and are holding. An unmeasured skill is not
   * evidence of competence any more than it is evidence of a gap — the same principle the
   * bridge holds — so there is nothing to refresh.
   */
  const holding = required
    .map(key => ({ key, score: held.get(key)?.score }))
    .filter((g): g is { key: string; score: number } =>
      typeof g.score === 'number' && g.score >= BRIDGE_READY_SCORE)
    /* Weakest first: the skill closest to the line is the one most worth the practice. */
    .sort((a, b) => a.score - b.score);

  if (!holding.length) return null;

  const density = densityFor(profile);
  const wantedUnits = holding.length * UNITS_PER_REVISION_SKILL;
  const ceiling = Math.floor(programDays * MAX_REVISION_SHARE);
  const days = Math.min(Math.ceil(wantedUnits / density.unitsPerDay), ceiling);
  if (days < 1) return null;

  return {
    sourceStages,
    skills: holding.map(h => h.key),
    days,
    units: Math.min(wantedUnits, unitsForDays(days, density)),
  };
}

import { TopicSeed } from './year1MegaCurriculum';
import { YEAR3_CORE } from './year3UnitsCore';
import { YEAR3_TRACKS } from './year3UnitsTracks';
import { YEAR3_PROOF } from './year3UnitsProof';

/**
 * The Year-3 curriculum, decomposed into the units it actually teaches. Stage key: `specialize`.
 *
 * ── THREE FILES, ONE DATASET ──────────────────────────────────────────────────────────────
 *
 * Year 2 held its 296 units in a single file. Year 3 has 88 topics across three stages that are
 * genuinely different in kind — the advanced core, one specialization track in full, and the
 * career proof at the end — and a file that long is a file nobody reads to the end. They are
 * split by stage and joined here, so there is still exactly one dataset.
 *
 * ── ONE UNIT IS ONE SITTING ───────────────────────────────────────────────────────────────
 *
 * The same rule Years 1 and 2 hold. "Advanced Algorithms" is a module; "When a greedy choice is
 * provably safe" is a unit. Nothing is called "basics" or "fundamentals": the validator refuses a
 * dataset that hides four lessons behind one title, and it is right to.
 *
 * ── A BANK, NOT A SCHEDULE ────────────────────────────────────────────────────────────────
 *
 * No day numbers, and far more units than 130 days can hold. That is the point. The backbone
 * reaches every student; the specialization reaches only the students in that direction, because
 * `applicableDirections` on the topic keeps the other six tracks out of their plan; and the rest
 * is selected by evidence and by the room the admin's length leaves.
 *
 * A single student therefore meets a fraction of this file, and that fraction is the whole
 * reason the year is personalised rather than a syllabus everybody sits through.
 */

export const YEAR3: Record<string, TopicSeed> = {
  ...YEAR3_CORE,
  ...YEAR3_TRACKS,
  ...YEAR3_PROOF,
};

import { TopicSeed } from './year1MegaCurriculum';
import { YEAR4_BRIDGE } from './year4UnitsBridge';
import { YEAR4_BUILD } from './year4UnitsBuild';
import { YEAR4_TRACKS } from './year4UnitsTracks';
import { YEAR4_PLACEMENT } from './year4UnitsPlacement';
import { YEAR4_CONVERSION } from './year4UnitsConversion';

/**
 * The Year-4 curriculum, decomposed into the units it actually teaches. Stage key: `placement`.
 *
 * ── FIVE FILES, ONE DATASET ───────────────────────────────────────────────────────────────
 *
 * Year 2 held its units in one file; Year 3 split into three. Year 4 has 96 topics across
 * material that is genuinely different in kind — a remedial bridge, an engineering standard,
 * nine specialization tracks, continuous placement drilling and the interview work — and the
 * split follows those seams rather than a line count.
 *
 * ── ONE UNIT IS ONE SITTING ───────────────────────────────────────────────────────────────
 *
 * The rule every year holds. "Interview Preparation" is a module; "What to do in the silence" is
 * a unit. Nothing is called "basics" or "fundamentals": the validator refuses a dataset that
 * hides four lessons behind one title, and it is right to.
 *
 * ── A BANK, NOT A SCHEDULE ────────────────────────────────────────────────────────────────
 *
 * No day numbers, and far more units than 150 days can hold. The bridge reaches only students
 * who need it; the specialization reaches only the students in that direction, because
 * `applicableDirections` keeps the other eight tracks out of their plan; the backbone reaches
 * everybody; and the rest is selected by evidence and by the room the admin's length leaves.
 *
 * A single student meets a fraction of this file, and that fraction is the whole reason the year
 * is personalised rather than a syllabus everybody sits through.
 */

export const YEAR4: Record<string, TopicSeed> = {
  ...YEAR4_BRIDGE,
  ...YEAR4_BUILD,
  ...YEAR4_TRACKS,
  ...YEAR4_PLACEMENT,
  ...YEAR4_CONVERSION,
};

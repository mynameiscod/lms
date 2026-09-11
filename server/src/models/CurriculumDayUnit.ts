import mongoose, { Schema, Document } from 'mongoose';
import { BandKey } from '../data/ninetyDayPolicy';

/**
 * One day of the ninety-day curriculum.
 *
 * ── A DAY IS STRUCTURE, NOT CONTENT ───────────────────────────────────────────────────────
 *
 * This does NOT hold videos, notes or practice. It names a skill and a topic within that skill's
 * authored journey, and the steps come from there.
 *
 * That is the whole point. The Learning Studio already authors journeys — ordered steps carrying
 * a topic, a subtopic, their minutes and their content — and a second place to write steps would
 * fork the editor: two screens to fix a bug in, and authors wondering which one is authoritative.
 * That mistake has already been made once on this codebase, when a duplicate Learning Studio was
 * built beside the one that existed.
 *
 * So a day-unit says "day 24 is the Loops topic of LOOPS_BASICS" and the content is whatever an
 * author has published there. Authoring lengthens the day; it never requires touching this.
 *
 * ── WHY IT IS NOT DERIVED ENTIRELY ────────────────────────────────────────────────────────
 *
 * A journey's topics could in principle be walked in order and cut into days automatically. They
 * are not, because which topic is day 24 rather than day 31 is a teaching decision — it depends
 * on what else is in the band, what a student has already met, and how long the neighbours are.
 * Deriving it would take that decision away from the person best placed to make it and hand it
 * to an arithmetic rule.
 *
 * ── DEPTH IS NOT STORED HERE ──────────────────────────────────────────────────────────────
 *
 * There is no FULL / STANDARD / REVIEW row per day. Depth selects which of a day's steps a
 * particular student is served, and is decided by the selector from their evidence. Storing
 * three variants of every day would triple a content programme that is already the long pole, to
 * express something the steps already say.
 */

export interface IDayUnitAudience {
  languages: string[];
  directions: string[];
  years: string[];
  branches: string[];
}

export interface ICurriculumDayUnit extends Document {
  tenantId: string;

  /**
   * Stable identity, independent of position.
   *
   * A day's completion used to be keyed on where it sat — `curriculum:<week>:<day>` — so
   * rebuilding a plan moved the keys and "I finished day 12" could silently become a different
   * day's content. A student is going to reopen day one a year later and run the whole ninety a
   * second time; that cannot be built on a position.
   */
  dayUnitId: string;

  band: BandKey;
  /** Where it sits inside its band. The band decides the day numbers; this decides the order. */
  displayOrder: number;

  title: string;
  /** Shown under the title on the day screen. One sentence. */
  blurb: string;

  /** The Year-1 curriculum this day came from, for provenance an admin can read. */
  moduleCode: string;
  topicCode: string;

  /** The authored journey this day teaches from. */
  skillKey: string;
  /**
   * The topic label inside that journey. Empty means the whole journey, which is right for a
   * skill small enough to be one day.
   */
  journeyTopic: string;
  /**
   * Narrows further to particular subtopics. Empty means every subtopic of the topic — the
   * common case, and the one an author does not have to think about.
   */
  subtopics: string[];

  audience: IDayUnitAudience;

  /** Cached from the journey's steps so a list can show minutes without resolving every day. */
  estimatedMinutes: number;

  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AudienceSchema = new Schema<IDayUnitAudience>({
  languages:  [{ type: String }],
  directions: [{ type: String }],
  years:      [{ type: String }],
  branches:   [{ type: String }],
}, { _id: false });

const CurriculumDayUnitSchema = new Schema<ICurriculumDayUnit>(
  {
    // String, matching CareerSkillResource and ConceptLearningUnit rather than the ObjectId the
    // roadmap models use. Both conventions exist across CareerPilot; this sits beside the
    // content layer it references, and a mismatch here is the bug that makes a query silently
    // return nothing.
    tenantId:     { type: String, required: true, index: true },
    dayUnitId:    { type: String, required: true, trim: true },
    band:         { type: String, required: true, index: true },
    displayOrder: { type: Number, default: 100 },

    title:  { type: String, required: true, trim: true },
    blurb:  { type: String, default: '', trim: true },

    moduleCode: { type: String, default: '', uppercase: true, trim: true },
    topicCode:  { type: String, default: '', uppercase: true, trim: true },

    skillKey:     { type: String, required: true, uppercase: true, trim: true, index: true },
    journeyTopic: { type: String, default: '', trim: true },
    subtopics:    [{ type: String, trim: true }],

    audience: { type: AudienceSchema, default: () => ({ languages: [], directions: [], years: [], branches: [] }) },

    estimatedMinutes: { type: Number, default: 0 },

    status:    { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT', index: true },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true },
);

/** One day-unit per id per tenant. A second would make "which day is this" unanswerable. */
CurriculumDayUnitSchema.index({ tenantId: 1, dayUnitId: 1 }, { unique: true });
/** The selector's read: every published candidate for a band, in order. */
CurriculumDayUnitSchema.index({ tenantId: 1, band: 1, status: 1, displayOrder: 1 });

export default mongoose.model<ICurriculumDayUnit>('CurriculumDayUnit', CurriculumDayUnitSchema);

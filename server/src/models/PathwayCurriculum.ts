import mongoose, { Document, Schema } from 'mongoose';

/**
 * An admin-authored day-by-day curriculum for one pathway.
 *
 * The roadmap has always been GENERATED — a member's day is computed from their own
 * category scores, so two people on the same pathway get different emphasis. That is
 * good for personalisation and useless when a syllabus has to be taught in order.
 *
 * This is the override. A day that appears here is served verbatim to every member on
 * the pathway; a day that does not falls through to the generator exactly as before.
 * So a curriculum can be one day long or three hundred, and nothing is ever blank.
 *
 * KEYED BY TRACK, NOT BY PATHWAY VARIANT. There are twenty pathways — five tracks in
 * four stages — and authoring all twenty is 7,300 days nobody will ever write. Content
 * lives on the track (`software_dev`) and every stage variant inherits it, so the real
 * job is five curricula. A stage that genuinely needs its own day can still be authored
 * against the full key (`software_dev:placement`), which wins over the track.
 */

export interface ICurriculumItem {
  title: string;
  detail: string;
  /** learn | practice | aptitude | communication | resume | mock */
  type: string;
  xp: number;
  /** In-product destination, e.g. /careerpilot/practice?kind=coding */
  link?: string;
  /** Which of the six scoring categories this counts towards, for the day's badge. */
  category?: string;
}

export interface ICurriculumDay {
  day: number;
  /** Optional heading shown above the day's items. */
  theme?: string;
  items: ICurriculumItem[];
}

export interface IPathwayCurriculum extends Document {
  tenantId: string;
  /** `software_dev`, or `software_dev:placement` to override one stage. */
  pathwayKey: string;
  days: ICurriculumDay[];
  /** Set when the day list was last produced or extended by AI, for provenance. */
  aiDraftedAt?: Date | null;
  updatedBy?: string;
}

const ItemSchema = new Schema<ICurriculumItem>({
  title:  { type: String, required: true, trim: true, maxlength: 160 },
  detail: { type: String, default: '', trim: true, maxlength: 600 },
  type:   { type: String, default: 'learn' },
  xp:     { type: Number, default: 20, min: 0, max: 500 },
  link:   { type: String, default: '' },
  category: { type: String, default: '' },
}, { _id: false });

const DaySchema = new Schema<ICurriculumDay>({
  day:   { type: Number, required: true, min: 1 },
  theme: { type: String, default: '', trim: true, maxlength: 120 },
  items: { type: [ItemSchema], default: [] },
}, { _id: false });

const CurriculumSchema = new Schema<IPathwayCurriculum>({
  tenantId:   { type: String, required: true, index: true },
  pathwayKey: { type: String, required: true, trim: true },
  days:       { type: [DaySchema], default: [] },
  aiDraftedAt:{ type: Date, default: null },
  updatedBy:  { type: String, default: '' },
}, { timestamps: true });

// One curriculum per pathway key per tenant.
CurriculumSchema.index({ tenantId: 1, pathwayKey: 1 }, { unique: true });

export default mongoose.model<IPathwayCurriculum>('PathwayCurriculum', CurriculumSchema);

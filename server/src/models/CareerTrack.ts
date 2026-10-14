import mongoose, { Document, Schema } from 'mongoose';

/**
 * A career track: a role + language roadmap from Year 3 (e.g. "Java Full Stack + AI").
 * See data/careerTrackPolicy.ts for what it means; the admin manages it on the Career Tracks screen.
 *
 * Year 3 is `specializePacks` in order. Year 4 is the same packs again (revision for a member,
 * essentials for a fresh joiner, sized by `split`) followed by `placementPacks`.
 */
export interface ICareerTrack extends Document {
  tenantId: string;
  key: string;
  name: string;
  language: string;
  description?: string;
  /** DRAFT while it is being built; LIVE once students may pick it. */
  status: 'DRAFT' | 'LIVE';
  order: number;
  specializePacks: string[];
  placementPacks: string[];
  split: { memberTrackShare: number; freshTrackShare: number };
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareerTrackSchema = new Schema<ICareerTrack>(
  {
    tenantId:        { type: String, required: true, index: true },
    key:             { type: String, required: true, trim: true },
    name:            { type: String, required: true, trim: true },
    language:        { type: String, required: true, trim: true },
    description:     { type: String },
    status:          { type: String, enum: ['DRAFT', 'LIVE'], default: 'DRAFT' },
    order:           { type: Number, default: 0 },
    specializePacks: { type: [String], default: [] },
    placementPacks:  { type: [String], default: [] },
    split: {
      memberTrackShare: { type: Number, default: 0.15 },
      freshTrackShare:  { type: Number, default: 0.40 },
    },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

CareerTrackSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export default mongoose.model<ICareerTrack>('CareerTrack', CareerTrackSchema);

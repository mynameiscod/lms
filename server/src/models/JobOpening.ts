import mongoose, { Schema, Document } from 'mongoose';

/**
 * A job or internship opening in the market, posted once for every CareerPilot member.
 *
 * Global, not tied to an institute: an opening at a company is the same opening for a student in
 * any college. A college's own placement drives stay in PlacementDrive, per institute.
 *
 * Students apply on the company's own site (applyUrl). Nothing is submitted through us; a student
 * can only mark an opening as applied for their own tracking (JobOpeningMark).
 */
export const OPENING_KINDS = ['job', 'internship'] as const;
export const WORK_MODES = ['onsite', 'hybrid', 'remote'] as const;
export const OPENING_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED'] as const;

export interface IJobOpening extends Document {
  company: string;
  companyLogo: string;
  role: string;
  kind: typeof OPENING_KINDS[number];
  workMode: typeof WORK_MODES[number];
  locations: string[];
  /** Yearly pay in lakhs for a job, monthly stipend in rupees for an internship. Either may be empty. */
  payMin?: number;
  payMax?: number;
  /** Free text, as companies write it: "Freshers", "0–2 years". */
  experience: string;
  /** Graduation years the company asks for, e.g. [2026, 2027]. Empty = not stated. */
  batches: number[];
  skills: string[];
  description: string;
  applyUrl: string;
  /** Last day to apply. After it the opening leaves the Job Board on its own. */
  lastDate?: Date;
  status: typeof OPENING_STATUSES[number];
  publishedAt?: Date;
  createdBy: string;
  createdByName: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobOpeningSchema = new Schema<IJobOpening>(
  {
    company: { type: String, required: true, trim: true, maxlength: 80 },
    companyLogo: { type: String, default: '', trim: true, maxlength: 500 },
    role: { type: String, required: true, trim: true, maxlength: 100 },
    kind: { type: String, enum: OPENING_KINDS, default: 'job' },
    workMode: { type: String, enum: WORK_MODES, default: 'onsite' },
    locations: [{ type: String, trim: true, maxlength: 60 }],
    payMin: { type: Number, min: 0 },
    payMax: { type: Number, min: 0 },
    experience: { type: String, default: '', trim: true, maxlength: 60 },
    batches: [{ type: Number }],
    skills: [{ type: String, trim: true, maxlength: 40 }],
    description: { type: String, default: '', trim: true, maxlength: 4000 },
    applyUrl: { type: String, required: true, trim: true, maxlength: 1000 },
    lastDate: { type: Date },
    status: { type: String, enum: OPENING_STATUSES, default: 'DRAFT' },
    publishedAt: { type: Date },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: '' },
    updatedBy: { type: String },
  },
  { timestamps: true },
);

JobOpeningSchema.index({ status: 1, lastDate: 1, publishedAt: -1 });

export default mongoose.model<IJobOpening>('JobOpening', JobOpeningSchema);

/** A student's own note that they applied on the company site. Only ever read back by that student. */
export interface IJobOpeningMark extends Document {
  userId: mongoose.Types.ObjectId;
  openingId: mongoose.Types.ObjectId;
  appliedAt: Date;
}

const JobOpeningMarkSchema = new Schema<IJobOpeningMark>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  openingId: { type: Schema.Types.ObjectId, ref: 'JobOpening', required: true },
  appliedAt: { type: Date, default: Date.now },
});
JobOpeningMarkSchema.index({ userId: 1, openingId: 1 }, { unique: true });

export const JobOpeningMark = mongoose.model<IJobOpeningMark>('JobOpeningMark', JobOpeningMarkSchema);

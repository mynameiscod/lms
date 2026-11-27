import mongoose, { Schema, Document } from 'mongoose';

/**
 * Website batches (2026-11-26): the "next batch" date and seats your public website shows, typed by
 * staff on the Website Batches screen and read by the site through
 * GET /api/v1/public/:tenantSlug/next-batch.
 *
 * Separate from LMS batches on purpose: a website batch is announced before its LMS batch exists,
 * and "seats left" is a number the team decides, not a count of students.
 */

/** A course your website has a page for, by the key the site sends (e.g. java_full_stack). */
export interface IWebsiteCourse extends Document {
  tenantId: string;
  key: string;
  name: string;
  active: boolean;
  order: number;
  /** What the website shows for this course (Website Content > Courses, 2026-11-27). Typed, not calculated. */
  site?: IWebsiteCourseSite;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWebsiteCourseSite {
  published: boolean;
  title: string;
  tagline: string;
  tags: string[];
  duration: string;
  mode: string;
  seatsText: string;
  fee: string;
  oldFee: string;
  badge: string;
  pageUrl: string;
  brochureUrl: string;
  tools: string[];
  modules: { title: string; days: string; topics: string[] }[];
  projects: { title: string; description: string; tags: string[] }[];
  timeline: { day: string; title: string; points: string[] }[];
  faqs: { q: string; a: string }[];
  history: { at: Date; by?: mongoose.Types.ObjectId; byName?: string; change: string }[];
}

const CourseSiteSchema = new Schema({
  published: { type: Boolean, default: false },
  title: { type: String, trim: true, maxlength: 120, default: '' },
  tagline: { type: String, trim: true, maxlength: 240, default: '' },
  tags: { type: [String], default: [] },
  duration: { type: String, trim: true, maxlength: 40, default: '' },
  mode: { type: String, trim: true, maxlength: 60, default: '' },
  seatsText: { type: String, trim: true, maxlength: 40, default: '' },
  fee: { type: String, trim: true, maxlength: 40, default: '' },
  oldFee: { type: String, trim: true, maxlength: 40, default: '' },
  badge: { type: String, trim: true, maxlength: 30, default: '' },
  pageUrl: { type: String, trim: true, maxlength: 300, default: '' },
  brochureUrl: { type: String, trim: true, maxlength: 500, default: '' },
  tools: { type: [String], default: [] },
  modules: { type: [{ title: String, days: String, topics: [String], _id: false }], default: [] },
  projects: { type: [{ title: String, description: String, tags: [String], _id: false }], default: [] },
  timeline: { type: [{ day: String, title: String, points: [String], _id: false }], default: [] },
  faqs: { type: [{ q: String, a: String, _id: false }], default: [] },
  history: {
    type: [{ at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, change: String, _id: false }],
    default: [],
  },
}, { _id: false });

const WebsiteCourseSchema = new Schema<IWebsiteCourse>(
  {
    tenantId: { type: String, required: true, index: true },
    key: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9_]{2,40}$/ },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    site: { type: CourseSiteSchema, default: undefined },
  },
  { timestamps: true },
);
WebsiteCourseSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const WebsiteCourse = mongoose.model<IWebsiteCourse>('WebsiteCourse', WebsiteCourseSchema);

export interface IWebsiteBatchChange { at: Date; by?: mongoose.Types.ObjectId; byName?: string; change: string }

export interface IWebsiteBatch extends Document {
  tenantId: string;
  courseKey: string;
  /** 'YYYY-MM-DD' (IST). */
  startDate: string;
  seatsLeft: number;
  mode?: string;
  showOnWebsite: boolean;
  /** Who changed what, newest last (kept to the last 50). */
  history: IWebsiteBatchChange[];
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WebsiteBatchSchema = new Schema<IWebsiteBatch>(
  {
    tenantId: { type: String, required: true, index: true },
    courseKey: { type: String, required: true, trim: true, lowercase: true },
    startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    seatsLeft: { type: Number, required: true, min: 0, max: 100000 },
    mode: { type: String, trim: true, maxlength: 80 },
    showOnWebsite: { type: Boolean, default: true },
    history: {
      type: [{ at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, change: String, _id: false }],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
WebsiteBatchSchema.index({ tenantId: 1, courseKey: 1, startDate: 1 });

export const WebsiteBatch = mongoose.model<IWebsiteBatch>('WebsiteBatch', WebsiteBatchSchema);

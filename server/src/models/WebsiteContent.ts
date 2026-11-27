import mongoose, { Schema, Document } from 'mongoose';

/**
 * Website content (2026-11-27): what the public website shows, typed by staff on the Website Content
 * screen and read by the site through GET /api/v1/public/:tenantSlug/placements (and later sections).
 *
 * Nothing here is calculated. Every number, company and student is what the team typed — the
 * website shows exactly that. Only items marked Published leave the LMS, and a placed student can
 * only be published with the student's consent ticked.
 */

export interface IWebsiteChange { at: Date; by?: mongoose.Types.ObjectId; byName?: string; change: string }
const HistorySchema = {
  type: [{ at: { type: Date, default: Date.now }, by: { type: Schema.Types.ObjectId, ref: 'User' }, byName: String, change: String, _id: false }],
  default: [],
};

/* ── Images (student photos, company logos) ─────────────────────────────────────────────────── */

export type WebsiteMediaKind = 'photo' | 'logo';
export interface IWebsiteMedia extends Document {
  tenantId: string;
  kind: WebsiteMediaKind;
  storage: 'bunny' | 'local';
  path: string;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
}
const WebsiteMediaSchema = new Schema<IWebsiteMedia>({
  tenantId: { type: String, required: true, index: true },
  kind: { type: String, enum: ['photo', 'logo'], required: true },
  storage: { type: String, enum: ['bunny', 'local'], required: true },
  path: { type: String, required: true },
  contentType: { type: String, default: 'image/webp' },
  width: Number,
  height: Number,
  bytes: Number,
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const WebsiteMedia = mongoose.model<IWebsiteMedia>('WebsiteMedia', WebsiteMediaSchema);

/* ── Placement numbers ("92% Placement rate") ───────────────────────────────────────────────── */

export interface IWebsiteStat extends Document {
  tenantId: string;
  section: 'placements';
  /** Shown as typed: "92%", "₹11 LPA", "500+". */
  value: string;
  label: string;
  order: number;
  published: boolean;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsiteStatSchema = new Schema<IWebsiteStat>({
  tenantId: { type: String, required: true, index: true },
  section: { type: String, enum: ['placements'], default: 'placements' },
  value: { type: String, required: true, trim: true, maxlength: 20 },
  label: { type: String, required: true, trim: true, maxlength: 60 },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: false },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteStat = mongoose.model<IWebsiteStat>('WebsiteStat', WebsiteStatSchema);

/* ── Hiring companies ────────────────────────────────────────────────────────────────────────── */

export const COMPANY_TYPES = ['product', 'service', 'startup', 'other'] as const;
export type CompanyType = typeof COMPANY_TYPES[number];

export interface IWebsiteCompany extends Document {
  tenantId: string;
  name: string;
  /** Lower-cased name, so "EPAM" and "epam" are one company. */
  nameKey: string;
  type: CompanyType;
  /** e.g. epam.com — kept so the website can still find a logo when none is uploaded. */
  domain: string;
  logoId?: mongoose.Types.ObjectId;
  /** Shown in the hiring-partners logo strip. */
  showInStrip: boolean;
  order: number;
  published: boolean;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsiteCompanySchema = new Schema<IWebsiteCompany>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  nameKey: { type: String, required: true },
  type: { type: String, enum: COMPANY_TYPES as unknown as string[], default: 'other' },
  domain: { type: String, trim: true, lowercase: true, maxlength: 100, default: '' },
  logoId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  showInStrip: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  published: { type: Boolean, default: true },
  history: HistorySchema,
}, { timestamps: true });
WebsiteCompanySchema.index({ tenantId: 1, nameKey: 1 }, { unique: true });
export const WebsiteCompany = mongoose.model<IWebsiteCompany>('WebsiteCompany', WebsiteCompanySchema);

/* ── Placed students ────────────────────────────────────────────────────────────────────────── */

export const PLACEMENT_TAGS = ['career_switcher', 'non_cs', 'tier3', 'female'] as const;
export type PlacementTag = typeof PLACEMENT_TAGS[number];
export const PLACEMENT_TAG_LABEL: Record<PlacementTag, string> = {
  career_switcher: 'Career switcher', non_cs: 'Non-CS background', tier3: 'Tier-3 college', female: 'Female graduate',
};

export interface IWebsitePlacement extends Document {
  tenantId: string;
  name: string;
  photoId?: mongoose.Types.ObjectId;
  /** A course from the Website Batches course list (same keys the website uses). */
  courseKey: string;
  role: string;
  companyId?: mongoose.Types.ObjectId;
  /** Lakhs per annum, e.g. 4.2. */
  packageLpa?: number;
  batch: string;
  year?: number;
  college: string;
  degree: string;
  quote: string;
  tags: PlacementTag[];
  /** 'YYYY-MM' */
  placedOn: string;
  featured: boolean;
  consent: boolean;
  published: boolean;
  order: number;
  /** The LMS student this card was made from, if any (never sent to the website). */
  userId?: mongoose.Types.ObjectId;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsitePlacementSchema = new Schema<IWebsitePlacement>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  photoId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  courseKey: { type: String, trim: true, lowercase: true, default: '' },
  role: { type: String, trim: true, maxlength: 60, default: '' },
  companyId: { type: Schema.Types.ObjectId, ref: 'WebsiteCompany' },
  packageLpa: { type: Number, min: 0, max: 500 },
  batch: { type: String, trim: true, maxlength: 40, default: '' },
  year: { type: Number, min: 2000, max: 2100 },
  college: { type: String, trim: true, maxlength: 100, default: '' },
  degree: { type: String, trim: true, maxlength: 40, default: '' },
  quote: { type: String, trim: true, maxlength: 140, default: '' },
  tags: { type: [String], enum: PLACEMENT_TAGS as unknown as string[], default: [] },
  placedOn: { type: String, match: /^(\d{4}-(0[1-9]|1[0-2]))?$/, default: '' },
  featured: { type: Boolean, default: false },
  consent: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  history: HistorySchema,
}, { timestamps: true });
WebsitePlacementSchema.index({ tenantId: 1, published: 1, order: 1 });
export const WebsitePlacement = mongoose.model<IWebsitePlacement>('WebsitePlacement', WebsitePlacementSchema);

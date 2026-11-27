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

export type WebsiteMediaKind = 'photo' | 'logo' | 'thumb';
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
  kind: { type: String, enum: ['photo', 'logo', 'thumb'], required: true },
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

/** Where a number shows: the placements section, the home page hero, or the Tech Battle page. */
export const STAT_SECTIONS = ['placements', 'home', 'tech_battle'] as const;
export type StatSection = typeof STAT_SECTIONS[number];

export interface IWebsiteStat extends Document {
  tenantId: string;
  section: StatSection;
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
  section: { type: String, enum: STAT_SECTIONS as unknown as string[], default: 'placements', index: true },
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

/* ── Tech Battle (stage 2) ──────────────────────────────────────────────────────────────────────
 * The battle itself (date, registration, exam) lives in Tech Battles (models/TechBattle.ts). These
 * hold only what the website shows around it: the page text and prizes (one per institute), and per
 * battle the partner college and the winners. */

export interface IBattlePrize { place: string; amount: string; items: string[] }
export interface IWebsiteBattleSettings extends Document {
  tenantId: string;
  /** Shown when no battle is live in Tech Battles, e.g. "Every Friday". Empty = nothing. */
  scheduleText: string;
  eligibility: string;
  alsoOpenTo: string;
  durationText: string;
  modeText: string;
  topics: string[];
  prizes: IBattlePrize[];
  /** What every participant gets, e.g. "Participation certificate". */
  everyone: string[];
  history: IWebsiteChange[];
  updatedAt: Date;
}
const BattleSettingsSchema = new Schema<IWebsiteBattleSettings>({
  tenantId: { type: String, required: true, unique: true },
  scheduleText: { type: String, trim: true, maxlength: 80, default: '' },
  eligibility: { type: String, trim: true, maxlength: 80, default: '' },
  alsoOpenTo: { type: String, trim: true, maxlength: 80, default: '' },
  durationText: { type: String, trim: true, maxlength: 40, default: '' },
  modeText: { type: String, trim: true, maxlength: 40, default: '' },
  topics: { type: [String], default: [] },
  prizes: { type: [{ place: String, amount: String, items: [String], _id: false }], default: [] },
  everyone: { type: [String], default: [] },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteBattleSettings = mongoose.model<IWebsiteBattleSettings>('WebsiteBattleSettings', BattleSettingsSchema);

export interface IBattleWinner { place: number; name: string; college: string; photoId?: mongoose.Types.ObjectId; score?: string }
export interface IWebsiteBattleNote extends Document {
  tenantId: string;
  battleId: mongoose.Types.ObjectId;
  partnerCollege: string;
  /** A photo or logo of the partner college (16:9). */
  partnerImageId?: mongoose.Types.ObjectId;
  winners: IBattleWinner[];
  winnersPublished: boolean;
  history: IWebsiteChange[];
  updatedAt: Date;
}
const BattleNoteSchema = new Schema<IWebsiteBattleNote>({
  tenantId: { type: String, required: true, index: true },
  battleId: { type: Schema.Types.ObjectId, ref: 'TechBattle', required: true },
  partnerCollege: { type: String, trim: true, maxlength: 120, default: '' },
  partnerImageId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  winners: {
    type: [{ place: Number, name: String, college: String, photoId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' }, score: String, _id: false }],
    default: [],
  },
  winnersPublished: { type: Boolean, default: false },
  history: HistorySchema,
}, { timestamps: true });
BattleNoteSchema.index({ tenantId: 1, battleId: 1 }, { unique: true });
export const WebsiteBattleNote = mongoose.model<IWebsiteBattleNote>('WebsiteBattleNote', BattleNoteSchema);

/* ── Events: hackathons, workshops (stage 2) ────────────────────────────────────────────────── */

export const EVENT_TYPES = ['hackathon', 'workshop', 'other'] as const;
export const EVENT_MODES = ['online', 'offline', 'hybrid'] as const;
export interface IWebsiteEvent extends Document {
  tenantId: string;
  type: typeof EVENT_TYPES[number];
  title: string;
  summary: string;
  /** 'YYYY-MM-DD'; Upcoming / Ongoing / Past is worked out from these dates. */
  startDate: string;
  endDate: string;
  timeText: string;
  venue: string;
  mode: typeof EVENT_MODES[number];
  teamSize: string;
  feeText: string;
  prizes: string[];
  registerUrl: string;
  pageUrl: string;
  imageId?: mongoose.Types.ObjectId;
  published: boolean;
  order: number;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsiteEventSchema = new Schema<IWebsiteEvent>({
  tenantId: { type: String, required: true, index: true },
  type: { type: String, enum: EVENT_TYPES as unknown as string[], default: 'workshop' },
  title: { type: String, required: true, trim: true, maxlength: 100 },
  summary: { type: String, trim: true, maxlength: 300, default: '' },
  startDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  endDate: { type: String, match: /^(\d{4}-\d{2}-\d{2})?$/, default: '' },
  timeText: { type: String, trim: true, maxlength: 60, default: '' },
  venue: { type: String, trim: true, maxlength: 120, default: '' },
  mode: { type: String, enum: EVENT_MODES as unknown as string[], default: 'online' },
  teamSize: { type: String, trim: true, maxlength: 40, default: '' },
  feeText: { type: String, trim: true, maxlength: 40, default: '' },
  prizes: { type: [String], default: [] },
  registerUrl: { type: String, trim: true, maxlength: 500, default: '' },
  pageUrl: { type: String, trim: true, maxlength: 500, default: '' },
  imageId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  published: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteEvent = mongoose.model<IWebsiteEvent>('WebsiteEvent', WebsiteEventSchema);

/* ── Testimonials (video), trainers (stage 3) ───────────────────────────────────────────────── */

export interface IWebsiteTestimonial extends Document {
  tenantId: string;
  name: string;
  /** The video still shown on the card (16:9). */
  thumbId?: mongoose.Types.ObjectId;
  videoUrl: string;
  companyId?: mongoose.Types.ObjectId;
  packageLpa?: number;
  /** Shown when there is no company, e.g. "Student Review". */
  label: string;
  courseKey: string;
  quote: string;
  consent: boolean;
  published: boolean;
  order: number;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsiteTestimonialSchema = new Schema<IWebsiteTestimonial>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  thumbId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  videoUrl: { type: String, trim: true, maxlength: 500, default: '' },
  companyId: { type: Schema.Types.ObjectId, ref: 'WebsiteCompany' },
  packageLpa: { type: Number, min: 0, max: 500 },
  label: { type: String, trim: true, maxlength: 40, default: '' },
  courseKey: { type: String, trim: true, lowercase: true, default: '' },
  quote: { type: String, trim: true, maxlength: 200, default: '' },
  consent: { type: Boolean, default: false },
  published: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteTestimonial = mongoose.model<IWebsiteTestimonial>('WebsiteTestimonial', WebsiteTestimonialSchema);

export interface IWebsiteTrainer extends Document {
  tenantId: string;
  name: string;
  photoId?: mongoose.Types.ObjectId;
  title: string;
  company: string;
  experience: string;
  skills: string[];
  linkedin: string;
  bio: string;
  published: boolean;
  order: number;
  history: IWebsiteChange[];
  createdAt: Date;
  updatedAt: Date;
}
const WebsiteTrainerSchema = new Schema<IWebsiteTrainer>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  photoId: { type: Schema.Types.ObjectId, ref: 'WebsiteMedia' },
  title: { type: String, trim: true, maxlength: 60, default: '' },
  company: { type: String, trim: true, maxlength: 60, default: '' },
  experience: { type: String, trim: true, maxlength: 20, default: '' },
  skills: { type: [String], default: [] },
  linkedin: { type: String, trim: true, maxlength: 300, default: '' },
  bio: { type: String, trim: true, maxlength: 400, default: '' },
  published: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteTrainer = mongoose.model<IWebsiteTrainer>('WebsiteTrainer', WebsiteTrainerSchema);

/* ── Site settings: top bar (stage 4); home counters are WebsiteStat section 'home' ───────────── */

export interface IWebsiteSettings extends Document {
  tenantId: string;
  topBar: { enabled: boolean; text: string; linkText: string; url: string };
  history: IWebsiteChange[];
  updatedAt: Date;
}
const WebsiteSettingsSchema = new Schema<IWebsiteSettings>({
  tenantId: { type: String, required: true, unique: true },
  topBar: {
    enabled: { type: Boolean, default: false },
    text: { type: String, trim: true, maxlength: 140, default: '' },
    linkText: { type: String, trim: true, maxlength: 40, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' },
  },
  history: HistorySchema,
}, { timestamps: true });
export const WebsiteSettings = mongoose.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsSchema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Talent Pool Sharing — docs/design/talent-pool-sharing.md
 *
 *   TalentPartner     a placement office; has ONE login (User role PLACEMENT_PARTNER)
 *   TalentCandidate   an outside candidate (not an LMS student) with the same profile fields
 *   TalentShare       one candidate shared with one office, and that office's status for them
 *
 * Offices never see each other: every portal query is scoped by the caller's own partner record.
 */

export const TALENT_STATUSES = ['shared', 'viewed', 'shortlisted', 'interview', 'selected', 'rejected', 'on_hold'] as const;
export type TalentStatus = typeof TALENT_STATUSES[number];
/** What an office may set by hand. 'shared' and 'viewed' are set by the system. */
export const PARTNER_SETTABLE: TalentStatus[] = ['shortlisted', 'interview', 'selected', 'rejected', 'on_hold'];

/* ── Office ─────────────────────────────────────────────────────────────── */
export interface IExportColumn { field: string; label: string }
export interface ITalentPartner extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  contactName?: string;
  email: string;
  phone?: string;
  city?: string;
  notes?: string;
  userId?: mongoose.Types.ObjectId | null;
  active: boolean;
  exportColumns: IExportColumn[];
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const ExportColumnSchema = new Schema<IExportColumn>({
  field: { type: String, required: true, trim: true, maxlength: 40 },
  label: { type: String, required: true, trim: true, maxlength: 80 },
}, { _id: false });
const PartnerSchema = new Schema<ITalentPartner>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  contactName: { type: String, trim: true, maxlength: 80 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 20 },
  city: { type: String, trim: true, maxlength: 60 },
  notes: { type: String, trim: true, maxlength: 2000 },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  active: { type: Boolean, default: true },
  exportColumns: { type: [ExportColumnSchema], default: [] },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
PartnerSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: 'objectId' } } });
export const TalentPartner = mongoose.model<ITalentPartner>('TalentPartner', PartnerSchema);

/* ── Outside candidate ──────────────────────────────────────────────────── */
export interface ITalentCandidate extends Document {
  tenantId: mongoose.Types.ObjectId;
  fullName: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: Date;
  address?: string;
  city?: string;
  state?: string;
  linkedInUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  tenth: { school?: string; year?: number; percent?: number };
  twelfth: { college?: string; group?: string; year?: number; percent?: number };
  graduation: { degree?: string; branch?: string; college?: string; university?: string; year?: number; percent?: number };
  skills: string[];
  expectedRole?: string;
  preferredLocation?: string;
  source: 'manual' | 'placement_desk' | 'excel';
  placementDeskCandidateId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const yr = { type: Number, min: 1950, max: 2050 };
const pct = { type: Number, min: 0, max: 100 };
const s = (max: number) => ({ type: String, trim: true, maxlength: max });
const CandidateSchema = new Schema<ITalentCandidate>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  phone: s(20),
  gender: s(30),
  dateOfBirth: Date,
  address: s(500),
  city: s(60),
  state: s(60),
  linkedInUrl: s(300),
  githubUrl: s(300),
  portfolioUrl: s(300),
  resumeUrl: s(500),
  tenth: { school: s(160), year: yr, percent: pct },
  twelfth: { college: s(160), group: s(60), year: yr, percent: pct },
  graduation: { degree: s(80), branch: s(80), college: s(160), university: s(160), year: yr, percent: pct },
  skills: { type: [String], default: [] },
  expectedRole: s(120),
  preferredLocation: s(120),
  source: { type: String, enum: ['manual', 'placement_desk', 'excel'], default: 'manual' },
  placementDeskCandidateId: { type: Schema.Types.ObjectId, ref: 'PlacementDeskCandidate' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
CandidateSchema.index({ tenantId: 1, phone: 1 });
CandidateSchema.index({ tenantId: 1, email: 1 });
export const TalentCandidate = mongoose.model<ITalentCandidate>('TalentCandidate', CandidateSchema);

/* ── Share: one candidate × one office ──────────────────────────────────── */
export interface IStatusEntry { status: TalentStatus; by?: mongoose.Types.ObjectId; byRole: 'admin' | 'partner' | 'system'; note?: string; at: Date }
export interface ITalentShare extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  kind: 'student' | 'external';
  studentId?: mongoose.Types.ObjectId;
  talentCandidateId?: mongoose.Types.ObjectId;
  status: TalentStatus;
  statusHistory: IStatusEntry[];
  partnerNote?: string;
  sharedBy?: mongoose.Types.ObjectId;
  sharedAt: Date;
  firstViewedAt?: Date;
  lastViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const StatusEntrySchema = new Schema<IStatusEntry>({
  status: { type: String, enum: TALENT_STATUSES, required: true },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
  byRole: { type: String, enum: ['admin', 'partner', 'system'], required: true },
  note: { type: String, trim: true, maxlength: 1000 },
  at: { type: Date, default: Date.now },
}, { _id: false });
const ShareSchema = new Schema<ITalentShare>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'TalentPartner', required: true, index: true },
  kind: { type: String, enum: ['student', 'external'], required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User' },
  talentCandidateId: { type: Schema.Types.ObjectId, ref: 'TalentCandidate' },
  status: { type: String, enum: TALENT_STATUSES, default: 'shared' },
  statusHistory: { type: [StatusEntrySchema], default: [] },
  partnerNote: { type: String, trim: true, maxlength: 2000 },
  sharedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  sharedAt: { type: Date, default: Date.now },
  firstViewedAt: Date,
  lastViewedAt: Date,
}, { timestamps: true });
ShareSchema.index({ partnerId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $type: 'objectId' } } });
ShareSchema.index({ partnerId: 1, talentCandidateId: 1 }, { unique: true, partialFilterExpression: { talentCandidateId: { $type: 'objectId' } } });
ShareSchema.index({ tenantId: 1, studentId: 1 });
ShareSchema.index({ tenantId: 1, talentCandidateId: 1 });
export const TalentShare = mongoose.model<ITalentShare>('TalentShare', ShareSchema);

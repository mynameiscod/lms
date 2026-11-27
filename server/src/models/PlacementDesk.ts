import mongoose, { Schema, Document } from 'mongoose';

/**
 * Placement Desk — the institute's daily register of companies brought, drives held, who
 * attended and what happened. Separate from Placement Drives / Partners / Program on purpose:
 * this is an internal record kept by the placement team, not a student-facing feature.
 *
 *   PlacementDeskOfficer    placement officers (no logins; an admin keeps the list)
 *   PlacementDeskCompany    a company, entered once and reused on every visit
 *   PlacementDeskDrive      one company visit / hiring drive on a date
 *   PlacementDeskCandidate  one person put up for a drive (LMS student or outside candidate)
 *   PlacementDeskSettings   public summary switch + share token
 *
 * Candidate outcomes and feedback are ADMIN-ONLY. No student-facing route reads these models.
 */

/* ── Officers ───────────────────────────────────────────────────────────── */
export interface IPlacementDeskOfficer extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  active: boolean;
}
const OfficerSchema = new Schema<IPlacementDeskOfficer>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export const PlacementDeskOfficer = mongoose.model<IPlacementDeskOfficer>('PlacementDeskOfficer', OfficerSchema);

/* ── Companies ──────────────────────────────────────────────────────────── */
export interface ICompanyContact { name: string; designation?: string; phone?: string; email?: string }
export interface IPlacementDeskCompany extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  nameKey: string;
  website?: string;
  careersUrl?: string;
  address?: string;
  city?: string;
  industry?: string;
  contacts: ICompanyContact[];
  notes?: string;
}
const ContactSchema = new Schema<ICompanyContact>({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  designation: { type: String, trim: true, maxlength: 80 },
  phone: { type: String, trim: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
}, { _id: false });
const CompanySchema = new Schema<IPlacementDeskCompany>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  nameKey: { type: String, required: true },
  website: { type: String, trim: true, maxlength: 300 },
  careersUrl: { type: String, trim: true, maxlength: 500 },
  address: { type: String, trim: true, maxlength: 500 },
  city: { type: String, trim: true, maxlength: 60 },
  industry: { type: String, trim: true, maxlength: 60 },
  contacts: { type: [ContactSchema], default: [] },
  notes: { type: String, trim: true, maxlength: 2000 },
}, { timestamps: true });
CompanySchema.index({ tenantId: 1, nameKey: 1 }, { unique: true });
export const PlacementDeskCompany = mongoose.model<IPlacementDeskCompany>('PlacementDeskCompany', CompanySchema);

/* ── Drives ─────────────────────────────────────────────────────────────── */
export const DRIVE_JOB_TYPES = ['full_time', 'internship', 'internship_to_full_time', 'contract'] as const;
export const DRIVE_MODES = ['on_campus', 'virtual', 'walk_in', 'at_company'] as const;
export const DRIVE_STATUSES = ['upcoming', 'ongoing', 'completed', 'cancelled'] as const;

export interface IPlacementDeskDrive extends Document {
  tenantId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  companyName: string;
  date: Date;            // the drive day (IST midnight)
  day: string;           // 'YYYY-MM-DD' (IST) — what reports group by
  role: string;
  openings?: number;
  jobType: typeof DRIVE_JOB_TYPES[number];
  mode: typeof DRIVE_MODES[number];
  location?: string;
  packageMin?: number;   // LPA
  packageMax?: number;   // LPA
  salaryNotes?: string;
  bond: { required: boolean; months?: number; amount?: number; notes?: string };
  conditions?: string;
  eligibility: { passoutYears: number[]; degrees: string[]; minPercent?: number; skills: string[]; batchIds: mongoose.Types.ObjectId[]; notes?: string };
  officerId?: mongoose.Types.ObjectId;
  officerName?: string;
  companyContact: ICompanyContact | null;
  rounds: string[];
  status: typeof DRIVE_STATUSES[number];
  notes?: string;
  createdBy?: mongoose.Types.ObjectId;
}
const DriveSchema = new Schema<IPlacementDeskDrive>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'PlacementDeskCompany', required: true, index: true },
  companyName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  day: { type: String, required: true },
  role: { type: String, required: true, trim: true, maxlength: 120 },
  openings: { type: Number, min: 0 },
  jobType: { type: String, enum: DRIVE_JOB_TYPES, default: 'full_time' },
  mode: { type: String, enum: DRIVE_MODES, default: 'on_campus' },
  location: { type: String, trim: true, maxlength: 120 },
  packageMin: { type: Number, min: 0 },
  packageMax: { type: Number, min: 0 },
  salaryNotes: { type: String, trim: true, maxlength: 1000 },
  bond: {
    required: { type: Boolean, default: false },
    months: { type: Number, min: 0 },
    amount: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 500 },
  },
  conditions: { type: String, trim: true, maxlength: 2000 },
  eligibility: {
    passoutYears: { type: [Number], default: [] },
    degrees: { type: [String], default: [] },
    minPercent: { type: Number, min: 0, max: 100 },
    skills: { type: [String], default: [] },
    batchIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], default: [] },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  officerId: { type: Schema.Types.ObjectId, ref: 'PlacementDeskOfficer' },
  officerName: { type: String, trim: true },
  companyContact: { type: ContactSchema, default: null },
  rounds: { type: [String], default: [] },
  status: { type: String, enum: DRIVE_STATUSES, default: 'upcoming' },
  notes: { type: String, trim: true, maxlength: 2000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
DriveSchema.index({ tenantId: 1, day: -1 });
export const PlacementDeskDrive = mongoose.model<IPlacementDeskDrive>('PlacementDeskDrive', DriveSchema);

/* ── Candidates ─────────────────────────────────────────────────────────── */
export const CANDIDATE_STATUSES = [
  'eligible', 'attended', 'no_show', 'in_process', 'offered', 'rejected', 'offer_accepted', 'offer_declined', 'joined',
] as const;
export type CandidateStatus = typeof CANDIDATE_STATUSES[number];
/** Statuses that mean the person turned up. */
export const ATTENDED_STATUSES: CandidateStatus[] = ['attended', 'in_process', 'offered', 'rejected', 'offer_accepted', 'offer_declined', 'joined'];
/** Statuses that mean the company made an offer. */
export const OFFER_STATUSES: CandidateStatus[] = ['offered', 'offer_accepted', 'offer_declined', 'joined'];
/** Turned up, no result yet. */
export const PENDING_STATUSES: CandidateStatus[] = ['attended', 'in_process'];

export interface IPlacementDeskCandidate extends Document {
  tenantId: mongoose.Types.ObjectId;
  driveId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  day: string;
  kind: 'student' | 'external';
  studentId?: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  college?: string;
  degree?: string;
  passoutYear?: number;
  status: CandidateStatus;
  roundReached?: string;
  offerCtc?: number;     // LPA
  companyFeedback?: string;
  internalRemarks?: string;
  statusAt?: Date;
}
const CandidateSchema = new Schema<IPlacementDeskCandidate>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  driveId: { type: Schema.Types.ObjectId, ref: 'PlacementDeskDrive', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'PlacementDeskCompany', required: true },
  day: { type: String, required: true },
  kind: { type: String, enum: ['student', 'external'], required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  phone: { type: String, trim: true, maxlength: 20 },
  email: { type: String, trim: true, lowercase: true, maxlength: 120 },
  college: { type: String, trim: true, maxlength: 160 },
  degree: { type: String, trim: true, maxlength: 80 },
  passoutYear: { type: Number },
  status: { type: String, enum: CANDIDATE_STATUSES, default: 'eligible' },
  roundReached: { type: String, trim: true, maxlength: 80 },
  offerCtc: { type: Number, min: 0 },
  companyFeedback: { type: String, trim: true, maxlength: 2000 },
  internalRemarks: { type: String, trim: true, maxlength: 2000 },
  statusAt: { type: Date },
}, { timestamps: true });
CandidateSchema.index({ driveId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { studentId: { $exists: true } } });
CandidateSchema.index({ tenantId: 1, studentId: 1 });
CandidateSchema.index({ tenantId: 1, day: -1 });
export const PlacementDeskCandidate = mongoose.model<IPlacementDeskCandidate>('PlacementDeskCandidate', CandidateSchema);

/* ── Settings ───────────────────────────────────────────────────────────── */
export interface IPlacementDeskSettings extends Document {
  tenantId: mongoose.Types.ObjectId;
  publicEnabled: boolean;
  publicToken: string;
  publicTitle?: string;
}
const SettingsSchema = new Schema<IPlacementDeskSettings>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  publicEnabled: { type: Boolean, default: false },
  publicToken: { type: String, required: true, index: true },
  publicTitle: { type: String, trim: true, maxlength: 120 },
}, { timestamps: true });
export const PlacementDeskSettings = mongoose.model<IPlacementDeskSettings>('PlacementDeskSettings', SettingsSchema);

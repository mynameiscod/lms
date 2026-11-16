import mongoose, { Schema, Document } from 'mongoose';

/**
 * Talent Desk — a placement office's own workspace inside the Talent Portal.
 * docs/design/talent-pool-sharing.md (Phase 1b)
 *
 *   TalentCompany      a company the office works with: contact, follow-ups, notes
 *   TalentOpening      a job at that company: JD, openings, experience, salary, bond, process
 *   TalentSubmission   one shared candidate sent to one company (optionally one opening) + status
 *
 * Everything is owned by ONE office (partnerId). The office edits it; the institute admin only
 * reads it. No office can see another office's companies.
 */

const s = (max: number) => ({ type: String, trim: true, maxlength: max });

/* ── Company ───────────────────────────────────────────────────────────── */
export const COMPANY_STAGES = ['prospect', 'contacted', 'active', 'on_hold', 'closed'] as const;
export type CompanyStage = typeof COMPANY_STAGES[number];

export interface IFollowUp {
  _id: mongoose.Types.ObjectId;
  dueAt: Date;
  note?: string;
  done: boolean;
  doneAt?: Date;
  outcome?: string;
  createdAt: Date;
}
export interface ITalentCompany extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  contactName?: string;
  contactDesignation?: string;
  contactEmail?: string;
  contactPhone?: string;
  stage: CompanyStage;
  notes?: string;
  followUps: IFollowUp[];
  nextFollowUpAt?: Date | null;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const FollowUpSchema = new Schema<IFollowUp>({
  dueAt: { type: Date, required: true },
  note: s(1000),
  done: { type: Boolean, default: false },
  doneAt: Date,
  outcome: s(1000),
  createdAt: { type: Date, default: Date.now },
});
const CompanySchema = new Schema<ITalentCompany>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'TalentPartner', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 140 },
  website: s(300),
  industry: s(80),
  location: s(120),
  contactName: s(100),
  contactDesignation: s(80),
  contactEmail: { type: String, trim: true, lowercase: true, maxlength: 140 },
  contactPhone: s(30),
  stage: { type: String, enum: COMPANY_STAGES, default: 'prospect' },
  notes: s(5000),
  followUps: { type: [FollowUpSchema], default: [] },
  nextFollowUpAt: { type: Date, default: null },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
CompanySchema.index({ partnerId: 1, name: 1 });
/** The earliest open follow-up — kept on the company so lists can sort and flag overdue cheaply. */
CompanySchema.pre('save', function (next) {
  const open = (this.followUps || []).filter((f) => !f.done).map((f) => new Date(f.dueAt).getTime()).sort((a, b) => a - b);
  this.nextFollowUpAt = open.length ? new Date(open[0]) : null;
  next();
});
export const TalentCompany = mongoose.model<ITalentCompany>('TalentCompany', CompanySchema);

/* ── Opening (a job at a company) ──────────────────────────────────────── */
export const OPENING_STATUSES = ['open', 'on_hold', 'closed'] as const;
export const WORK_MODES = ['office', 'hybrid', 'remote'] as const;
export interface ITalentOpening extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  title: string;
  jd?: string;
  jdUrl?: string;
  positions?: number;
  expMin?: number;
  expMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  bond?: string;
  location?: string;
  workMode?: typeof WORK_MODES[number];
  qualification?: string;
  skills?: string;
  interviewProcess?: string;
  deadline?: Date;
  status: typeof OPENING_STATUSES[number];
  createdAt: Date;
  updatedAt: Date;
}
const OpeningSchema = new Schema<ITalentOpening>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'TalentPartner', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'TalentCompany', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  jd: s(20000),
  jdUrl: s(500),
  positions: { type: Number, min: 0, max: 100000 },
  expMin: { type: Number, min: 0, max: 60 },
  expMax: { type: Number, min: 0, max: 60 },
  salaryMin: { type: Number, min: 0, max: 10000 },
  salaryMax: { type: Number, min: 0, max: 10000 },
  bond: s(300),
  location: s(160),
  workMode: { type: String, enum: [...WORK_MODES, null] },
  qualification: s(300),
  skills: s(1000),
  interviewProcess: s(5000),
  deadline: Date,
  status: { type: String, enum: OPENING_STATUSES, default: 'open' },
}, { timestamps: true });
export const TalentOpening = mongoose.model<ITalentOpening>('TalentOpening', OpeningSchema);

/* ── Submission (candidate → company) ──────────────────────────────────── */
export const SUBMISSION_STATUSES = ['sent', 'shortlisted', 'interview', 'selected', 'offered', 'joined', 'rejected', 'on_hold', 'withdrawn'] as const;
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  sent: 'Sent', shortlisted: 'Shortlisted', interview: 'Interview', selected: 'Selected', offered: 'Offer made',
  joined: 'Joined', rejected: 'Rejected', on_hold: 'On hold', withdrawn: 'Withdrawn',
};
export interface ISubmissionEntry { status: SubmissionStatus; by?: mongoose.Types.ObjectId; note?: string; at: Date }
export interface ITalentSubmission extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  openingId?: mongoose.Types.ObjectId | null;
  shareId: mongoose.Types.ObjectId;
  status: SubmissionStatus;
  note?: string;
  interviewAt?: Date | null;
  statusHistory: ISubmissionEntry[];
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
const SubmissionEntrySchema = new Schema<ISubmissionEntry>({
  status: { type: String, enum: SUBMISSION_STATUSES, required: true },
  by: { type: Schema.Types.ObjectId, ref: 'User' },
  note: s(1000),
  at: { type: Date, default: Date.now },
}, { _id: false });
const SubmissionSchema = new Schema<ITalentSubmission>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'TalentPartner', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'TalentCompany', required: true, index: true },
  openingId: { type: Schema.Types.ObjectId, ref: 'TalentOpening', default: null },
  shareId: { type: Schema.Types.ObjectId, ref: 'TalentShare', required: true, index: true },
  status: { type: String, enum: SUBMISSION_STATUSES, default: 'sent' },
  note: s(1000),
  interviewAt: { type: Date, default: null },
  statusHistory: { type: [SubmissionEntrySchema], default: [] },
  sentAt: { type: Date, default: Date.now },
}, { timestamps: true });
// One candidate goes to one company/opening once (a null opening counts as "general").
SubmissionSchema.index({ shareId: 1, companyId: 1, openingId: 1 }, { unique: true });
export const TalentSubmission = mongoose.model<ITalentSubmission>('TalentSubmission', SubmissionSchema);

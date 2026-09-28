import mongoose, { Schema, Document } from 'mongoose';

/**
 * Interview Hub automation — closing the loop around every placement drive.
 *
 *   before the drive: each applicant gets that company's PREP PACK (what earlier candidates were
 *                     asked, where they were cut, their tips, a practice set);
 *   after the drive:  everyone who applied is INVITED to share what they were asked;
 *   next drive:       the pack now carries what this batch reported.
 *
 * The institute decides the timing; these collections hold that choice, who was sent what, and
 * per-drive state so nothing is sent twice.
 */

export interface IInterviewHubConfig extends Document {
  tenantId: string;
  prepPack: {
    enabled: boolean;
    /** Send the pack the moment a student applies. */
    onApply: boolean;
    /** Also send it this many days before the drive date (0 = off). Late applicants catch up. */
    daysBefore: number;
    channels: string[];
    /** With no reports and no bank questions, show AI-predicted questions, labelled as such. */
    includePredicted: boolean;
  };
  autoInvite: {
    enabled: boolean;
    /** Days after the drive date to invite applicants to share. */
    daysAfter: number;
    channels: string[];
  };
  /** The site links in emails point to — captured from the admin's browser when saved. */
  siteUrl?: string;
  updatedBy?: string;
}

const ConfigSchema = new Schema<IInterviewHubConfig>({
  tenantId: { type: String, required: true, unique: true },
  prepPack: {
    enabled: { type: Boolean, default: true },
    onApply: { type: Boolean, default: true },
    daysBefore: { type: Number, default: 2, min: 0, max: 30 },
    channels: { type: [String], default: ['email'] },
    includePredicted: { type: Boolean, default: true },
  },
  autoInvite: {
    enabled: { type: Boolean, default: true },
    daysAfter: { type: Number, default: 1, min: 0, max: 14 },
    channels: { type: [String], default: ['email'] },
  },
  siteUrl: String,
  updatedBy: String,
}, { timestamps: true });

export const InterviewHubConfig = mongoose.model<IInterviewHubConfig>('InterviewHubConfig', ConfigSchema);

/** One prep pack sent to one student for one drive. `openedAt` is when they first read it. */
export interface IPrepPackDelivery extends Document {
  tenantId: string;
  driveId: string;
  userId: string;
  companyName: string;
  companySlug: string;
  reason: 'apply' | 'schedule' | 'manual';
  channels: string[];
  emailSent?: boolean;
  whatsappSent?: boolean;
  openedAt?: Date;
  /** Opened before the drive date — the number that says whether the pack did its job. */
  openedBeforeDrive?: boolean;
  createdAt: Date;
}

const DeliverySchema = new Schema<IPrepPackDelivery>({
  tenantId: { type: String, required: true },
  driveId: { type: String, required: true },
  userId: { type: String, required: true },
  companyName: String,
  companySlug: String,
  reason: { type: String, default: 'schedule' },
  channels: [String],
  emailSent: Boolean,
  whatsappSent: Boolean,
  openedAt: Date,
  openedBeforeDrive: Boolean,
}, { timestamps: true });
DeliverySchema.index({ driveId: 1, userId: 1 }, { unique: true });
DeliverySchema.index({ tenantId: 1, userId: 1, createdAt: -1 });

export const PrepPackDelivery = mongoose.model<IPrepPackDelivery>('PrepPackDelivery', DeliverySchema);

/** Per-drive switches and what has already happened for it. */
export interface IDriveAutomation extends Document {
  tenantId: string;
  driveId: string;
  skipPrep?: boolean;
  skipInvite?: boolean;
  inviteSentAt?: Date;
  invitesCreated?: number;
  codingSetId?: string;
}

const DriveAutomationSchema = new Schema<IDriveAutomation>({
  tenantId: { type: String, required: true },
  driveId: { type: String, required: true, unique: true },
  skipPrep: Boolean,
  skipInvite: Boolean,
  inviteSentAt: Date,
  invitesCreated: Number,
  codingSetId: String,
}, { timestamps: true });

export const DriveAutomation = mongoose.model<IDriveAutomation>('DriveAutomation', DriveAutomationSchema);

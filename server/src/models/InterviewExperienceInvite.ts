import mongoose, { Schema, Document } from 'mongoose';

/**
 * An admin's request that a student write up an interview they just faced.
 *
 * The knowledge from an interview is freshest the day after and gone within a fortnight, so
 * an invite carries its own clock: one free email reminder after two days, then it shows as
 * overdue to the admin. It never blocks the student — the institute decided a nudge, not a
 * penalty.
 */
export interface IInterviewExperienceInvite extends Document {
  tenantId: string;
  userId: string;
  studentName: string;
  companyName: string;
  companySlug: string;
  role?: string;
  interviewedOn?: Date;
  /** Set when the invite came from a Placement Drive's applicant list. */
  driveId?: string;
  message?: string;
  /** The site the admin sent it from, so a later reminder links to the same domain. */
  origin?: string;
  channels: string[];
  status: 'sent' | 'submitted' | 'cancelled';
  experienceId?: string;
  emailSent?: boolean;
  whatsappSent?: boolean;
  remindedAt?: Date;
  createdBy?: string;
  createdAt: Date;
}

const InviteSchema = new Schema<IInterviewExperienceInvite>({
  tenantId: { type: String, required: true },
  userId: { type: String, required: true },
  studentName: { type: String, default: '' },
  companyName: { type: String, required: true },
  companySlug: { type: String, required: true },
  role: { type: String, default: '' },
  interviewedOn: Date,
  driveId: String,
  message: { type: String, default: '' },
  origin: String,
  channels: [String],
  status: { type: String, enum: ['sent', 'submitted', 'cancelled'], default: 'sent' },
  experienceId: String,
  emailSent: Boolean,
  whatsappSent: Boolean,
  remindedAt: Date,
  createdBy: String,
}, { timestamps: true });

InviteSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
InviteSchema.index({ userId: 1, status: 1 });
// One open invite per student per company — re-inviting refreshes it rather than stacking.
InviteSchema.index({ tenantId: 1, userId: 1, companySlug: 1, status: 1 });

export const InterviewExperienceInvite = mongoose.model<IInterviewExperienceInvite>('InterviewExperienceInvite', InviteSchema);

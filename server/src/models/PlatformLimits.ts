import mongoose, { Document, Schema } from 'mongoose';

/**
 * CareerPilot limits that the super admin sets once for EVERY institute.
 *
 * One document (key 'careerpilot'). Mock interview plans live in InterviewPlan under the
 * PLATFORM_PLAN_TENANT id; this holds everything else: the Thinking Lab day (questions, coding and
 * practice per year) and how long an unfinished interview stays open.
 *
 * Absent fields fall back to the shipped defaults, so nothing changes for anybody until the super
 * admin saves this screen.
 */
export interface IPlatformLimits extends Document {
  key: string;
  /** Thinking Lab per year: { foundation: { perDay, codingPerDay, practicePerDay }, ... } */
  thinking?: any;
  /** Hours an interview that was left open stays resumable before it is closed and graded. */
  interviewStaleHours?: number;
  updatedBy?: string;
  updatedAt: Date;
}

const PlatformLimitsSchema = new Schema<IPlatformLimits>({
  key:                 { type: String, required: true, unique: true },
  thinking:            { type: Schema.Types.Mixed, default: undefined },
  interviewStaleHours: { type: Number },
  updatedBy:           { type: String },
}, { timestamps: true });

export const PLATFORM_LIMITS_KEY = 'careerpilot';

export default mongoose.model<IPlatformLimits>('PlatformLimits', PlatformLimitsSchema);

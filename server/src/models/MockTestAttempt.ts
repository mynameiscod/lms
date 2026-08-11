import mongoose, { Document, Schema } from 'mongoose';

/**
 * One sitting of a company mock test.
 *
 * The assembled paper is SNAPSHOTTED onto the attempt, including the correct answers. The
 * questions are drawn fresh each time — partly from the bank, partly generated — so there
 * is no stored paper to grade against afterwards. Without the snapshot a submission could
 * not be marked at all.
 *
 * `endsAt` is stored rather than trusting a client timer: a countdown in the browser is a
 * suggestion, and this is the thing that decides whether a late submission counts.
 */

export interface IMockAnswer { questionId: string; chosen: number }

export interface IMockTestAttempt extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  companySlug: string;
  companyName: string;
  sections: {
    name: string;
    category: string;
    durationMins: number;
    questions: {
      id: string; text: string; options: string[]; correctIndex: number;
      category: string; difficulty: string; generated: boolean; explanation?: string;
    }[];
  }[];
  answers: IMockAnswer[];
  startedAt: Date;
  endsAt: Date;
  submittedAt?: Date | null;
  status: 'in_progress' | 'submitted' | 'expired';
  score?: number;
  correctCount?: number;
  totalQuestions: number;
  passingPct: number;
  passed?: boolean;
  generatedCount: number;
  bankedCount: number;
}

const AttemptSchema = new Schema<IMockTestAttempt>({
  tenantId:    { type: String, required: true, index: true },
  studentId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companySlug: { type: String, required: true, index: true },
  companyName: { type: String, default: '' },
  sections: [{
    name: String, category: String, durationMins: Number,
    questions: [{
      id: String, text: String, options: [String], correctIndex: Number,
      category: String, difficulty: String, generated: Boolean, explanation: String,
    }],
  }],
  answers: [{ questionId: String, chosen: Number, _id: false }],
  startedAt:   { type: Date, default: Date.now },
  endsAt:      { type: Date, required: true },
  submittedAt: { type: Date, default: null },
  status:      { type: String, enum: ['in_progress', 'submitted', 'expired'], default: 'in_progress', index: true },
  score:         { type: Number },
  correctCount:  { type: Number },
  totalQuestions:{ type: Number, default: 0 },
  passingPct:    { type: Number, default: 60 },
  passed:        { type: Boolean },
  generatedCount:{ type: Number, default: 0 },
  bankedCount:   { type: Number, default: 0 },
}, { timestamps: true });

AttemptSchema.index({ tenantId: 1, studentId: 1, companySlug: 1, createdAt: -1 });

export default mongoose.model<IMockTestAttempt>('MockTestAttempt', AttemptSchema);

import mongoose, { Document, Schema } from 'mongoose';

/** A student's Career Readiness attempt + computed result (Career Score, categories,
 *  level, strengths/weaknesses, recommended pathway, 7-day preview). */
export interface IPassportAttempt extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  answers: { questionId: string; category: string; chosen: number }[];
  careerScore: number;            // 0–100
  level: string;
  levelKey: string;
  categoryScores: { key: string; label: string; score: number }[];
  strengths: string[];
  weaknesses: string[];
  pathway: string;
  pathwayLabel: string;
  weekPreview: { day: number; title: string; detail: string }[];
  createdAt: Date;
}

const PassportAttemptSchema = new Schema<IPassportAttempt>(
  {
    tenantId:   { type: String, required: true, index: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    answers:    [{ questionId: String, category: String, chosen: Number }],
    careerScore:{ type: Number, default: 0 },
    level:      { type: String },
    levelKey:   { type: String },
    categoryScores: [{ key: String, label: String, score: Number }],
    strengths:  [{ type: String }],
    weaknesses: [{ type: String }],
    pathway:    { type: String },
    pathwayLabel:{ type: String },
    weekPreview:[{ day: Number, title: String, detail: String }],
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PassportAttemptSchema.index({ studentId: 1, createdAt: -1 });

export default mongoose.model<IPassportAttempt>('PassportAttempt', PassportAttemptSchema);

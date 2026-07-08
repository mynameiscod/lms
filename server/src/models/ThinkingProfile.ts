import mongoose, { Schema, Document } from 'mongoose';

// A rolling AI-built "thinking profile" for a student, derived from their journals,
// rubric scores and voice evals over time. Recomputed periodically (not per request).
export interface IThinkingProfile extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  summary?: string;
  strengths: string[];
  weaknesses: string[];
  traits: { label: string; note?: string }[];   // e.g. "Slow decision maker", "Great communication"
  recommendations: string[];
  basedOnCount: number;
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ThinkingProfileSchema = new Schema<IThinkingProfile>(
  {
    tenantId:   { type: String, required: true, index: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    summary:    { type: String },
    strengths:  { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    traits:     { type: [{ label: String, note: String, _id: false }], default: [] },
    recommendations: { type: [String], default: [] },
    basedOnCount: { type: Number, default: 0 },
    computedAt: { type: Date },
  },
  { timestamps: true }
);
ThinkingProfileSchema.index({ tenantId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IThinkingProfile>('ThinkingProfile', ThinkingProfileSchema);

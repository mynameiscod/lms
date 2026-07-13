import mongoose, { Schema, Document } from 'mongoose';

/** Earned/locked achievement badges — one row per (student, achievementCode). */
export interface ICommunicationAchievement extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  achievementCode: string;
  earned: boolean;
  earnedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationAchievementSchema = new Schema<ICommunicationAchievement>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    achievementCode: { type: String, required: true },
    earned: { type: Boolean, default: false },
    earnedAt: { type: Date },
  },
  { timestamps: true }
);

CommunicationAchievementSchema.index({ tenantId: 1, studentId: 1, achievementCode: 1 }, { unique: true });

export default mongoose.model<ICommunicationAchievement>('CommunicationAchievement', CommunicationAchievementSchema);

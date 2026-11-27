import mongoose, { Schema, Document } from 'mongoose';

/**
 * One recording being scored in the background (2026-11-27).
 *
 * Sending a daily answer used to wait for transcription, upload and AI scoring in one long request; a dropped
 * connection lost the report. Now the send returns at once with this job, the page shows its stage as a progress
 * bar, and the CommunicationAttempt is created only when scoring succeeds — so nothing that reads attempts
 * (reports, streaks, leaderboards) ever sees a half-finished one. A failed job does not use up the take.
 *
 * Kept for two days, then removed.
 */
export type CommJobStage = 'transcribing' | 'analysing' | 'saving';
export type CommJobStatus = 'running' | 'done' | 'failed';

export interface ICommunicationJob extends Document {
  tenantId: string;
  studentId: string;
  challengeId: string;
  practiceDate: string;
  stage: CommJobStage;
  status: CommJobStatus;
  attemptId?: mongoose.Types.ObjectId;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationJobSchema = new Schema<ICommunicationJob>(
  {
    tenantId: { type: String, required: true },
    studentId: { type: String, required: true },
    challengeId: { type: String, required: true },
    practiceDate: { type: String, required: true },
    stage: { type: String, enum: ['transcribing', 'analysing', 'saving'], default: 'transcribing' },
    status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
    attemptId: { type: Schema.Types.ObjectId, ref: 'CommunicationAttempt' },
    message: { type: String, maxlength: 500 },
  },
  { timestamps: true },
);
CommunicationJobSchema.index({ tenantId: 1, studentId: 1, practiceDate: 1, status: 1 });
CommunicationJobSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 24 * 3600 });

export default mongoose.model<ICommunicationJob>('CommunicationJob', CommunicationJobSchema);

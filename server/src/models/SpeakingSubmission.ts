import mongoose, { Schema, Document } from 'mongoose';

export interface ISpeakingScore {
  overall: number; fluency: number; clarity: number; structure: number; confidence: number; vocabulary: number;
}
export interface ISpeakingFeedback { summary: string; strengths: string[]; improvements: string[]; }

export interface ISpeakingSubmission extends Document {
  tenantId: string;
  taskId: mongoose.Types.ObjectId;
  taskTitle?: string;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  dueDate: string;                // YYYY-MM-DD of the occurrence this fulfils
  recordingKey: string;           // Bunny storage key
  recordingName: string;
  sizeBytes: number;
  durationSec: number;
  transcript?: string;
  score?: ISpeakingScore;
  feedback?: ISpeakingFeedback;
  status: 'evaluating' | 'evaluated' | 'failed';
  error?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SpeakingSubmissionSchema = new Schema<ISpeakingSubmission>(
  {
    tenantId:      { type: String, required: true, index: true },
    taskId:        { type: Schema.Types.ObjectId, ref: 'SpeakingTask', required: true, index: true },
    taskTitle:     { type: String },
    studentId:     { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName:   { type: String },
    batchId:       { type: Schema.Types.ObjectId, ref: 'Batch' },
    dueDate:       { type: String, required: true },
    recordingKey:  { type: String, required: true },
    recordingName: { type: String },
    sizeBytes:     { type: Number, default: 0 },
    durationSec:   { type: Number, default: 0 },
    transcript:    { type: String },
    score:         { type: Schema.Types.Mixed },
    feedback:      { type: Schema.Types.Mixed },
    status:        { type: String, enum: ['evaluating', 'evaluated', 'failed'], default: 'evaluating' },
    error:         { type: String },
    submittedAt:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);
SpeakingSubmissionSchema.index({ tenantId: 1, taskId: 1, studentId: 1, dueDate: 1 }, { unique: true });
SpeakingSubmissionSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

export default mongoose.model<ISpeakingSubmission>('SpeakingSubmission', SpeakingSubmissionSchema);

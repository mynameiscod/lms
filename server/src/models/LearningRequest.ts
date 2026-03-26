import mongoose, { Schema, Document } from 'mongoose';

export type LearningRequestType = 'notes' | 'interview_qs' | 'practice' | '1on1' | 'clarification';
export type LearningRequestStatus = 'pending' | 'in_progress' | 'fulfilled' | 'scheduled';

export interface ILearningRequest extends Document {
  studentId: mongoose.Types.ObjectId;
  topicId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;

  type: LearningRequestType;
  message: string;
  topicTitle?: string;
  subjectName?: string;

  status: LearningRequestStatus;
  adminNote?: string;
  scheduledAt?: Date;
  fulfilledAt?: Date;
  fulfilledBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const LearningRequestSchema: Schema = new Schema(
  {
    studentId:  { type: Schema.Types.ObjectId, ref: 'User',    required: true, index: true },
    topicId:    { type: Schema.Types.ObjectId, ref: 'Topic',   index: true },
    chapterId:  { type: Schema.Types.ObjectId, ref: 'Chapter', index: true },
    subjectId:  { type: Schema.Types.ObjectId, ref: 'Subject', index: true },
    courseId:   { type: Schema.Types.ObjectId, ref: 'Course',  index: true },
    batchId:    { type: Schema.Types.ObjectId, ref: 'Batch',   index: true },
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant',  required: true, index: true },

    type: {
      type: String,
      enum: ['notes', 'interview_qs', 'practice', '1on1', 'clarification'],
      required: true
    },
    message:     { type: String, required: true, trim: true, maxlength: 2000 },
    topicTitle:  { type: String, trim: true },
    subjectName: { type: String, trim: true },

    status: {
      type: String,
      enum: ['pending', 'in_progress', 'fulfilled', 'scheduled'],
      default: 'pending'
    },
    adminNote:   { type: String, trim: true, maxlength: 2000 },
    scheduledAt: { type: Date },
    fulfilledAt: { type: Date },
    fulfilledBy: { type: Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

LearningRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
LearningRequestSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });
LearningRequestSchema.index({ tenantId: 1, topicId: 1, status: 1 });

export default mongoose.model<ILearningRequest>('LearningRequest', LearningRequestSchema);

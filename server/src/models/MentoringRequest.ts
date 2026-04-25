import mongoose, { Document, Schema } from 'mongoose';

export interface IMentoringRequest extends Document {
  tenantId: string;
  alumniId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  message: string;
  status: 'pending' | 'accepted' | 'declined';
  responseMessage?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MentoringRequestSchema = new Schema<IMentoringRequest>(
  {
    tenantId: { type: String, required: true, index: true },
    alumniId: { type: Schema.Types.ObjectId, ref: 'Alumni', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
    responseMessage: { type: String, default: null },
    respondedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

MentoringRequestSchema.index({ tenantId: 1, alumniId: 1 });
MentoringRequestSchema.index({ tenantId: 1, studentId: 1 });

export default mongoose.model<IMentoringRequest>('MentoringRequest', MentoringRequestSchema);

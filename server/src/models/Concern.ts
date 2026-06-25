import mongoose, { Schema, Document } from 'mongoose';

/**
 * A student-raised concern / doubt routed to a mentor. Lightweight support
 * ticket — student creates it (optionally from a specific plan day), staff list
 * and respond. Powers the "Raise a concern" feature in the learning experience.
 */
export interface IConcern extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  studentEmail?: string;
  category: 'content' | 'technical' | 'mentor' | 'payment' | 'other';
  message: string;
  context?: { enrollmentId?: string; curriculumTitle?: string; dayNumber?: number; page?: string };
  status: 'open' | 'in_progress' | 'resolved';
  response?: string;
  respondedBy?: mongoose.Types.ObjectId;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConcernSchema = new Schema<IConcern>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName:  { type: String },
    studentEmail: { type: String },
    category:     { type: String, enum: ['content', 'technical', 'mentor', 'payment', 'other'], default: 'other' },
    message:      { type: String, required: true, trim: true, maxlength: 2000 },
    context:      { type: { enrollmentId: String, curriculumTitle: String, dayNumber: Number, page: String }, default: undefined },
    status:       { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
    response:     { type: String },
    respondedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    respondedAt:  { type: Date },
  },
  { timestamps: true }
);

ConcernSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IConcern>('Concern', ConcernSchema);

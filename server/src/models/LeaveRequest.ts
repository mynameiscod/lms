import mongoose, { Schema, Document } from 'mongoose';

export interface ILeaveRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  batchId?: mongoose.Types.ObjectId;
  fromDate: Date;
  toDate: Date;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  reviewNote?: string;
  daysMarked?: number;       // weekdays marked as leave in attendance on approval
  createdAt: Date;
  updatedAt: Date;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    studentId:  { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName:{ type: String },
    batchId:    { type: Schema.Types.ObjectId, ref: 'Batch' },
    fromDate:   { type: Date, required: true },
    toDate:     { type: Date, required: true },
    reason:     { type: String, required: true, trim: true },
    status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },
    daysMarked: { type: Number },
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
LeaveRequestSchema.index({ tenantId: 1, studentId: 1, createdAt: -1 });

export default mongoose.model<ILeaveRequest>('LeaveRequest', LeaveRequestSchema);

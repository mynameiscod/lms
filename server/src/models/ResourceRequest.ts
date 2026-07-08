import mongoose, { Schema, Document } from 'mongoose';

export type ResourceRequestStatus = 'requested' | 'approved' | 'rejected' | 'revoked';

export interface IResourceRequest extends Document {
  tenantId: string;
  resourceId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  studentName?: string;
  status: ResourceRequestStatus;
  note?: string;              // student's reason for requesting
  reviewNote?: string;        // admin's note on approve/reject
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceRequestSchema = new Schema<IResourceRequest>(
  {
    tenantId:    { type: String, required: true, index: true },
    resourceId:  { type: Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
    studentId:   { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    studentName: { type: String },
    status:      { type: String, enum: ['requested', 'approved', 'rejected', 'revoked'], default: 'requested', index: true },
    note:        { type: String },
    reviewNote:  { type: String },
    reviewedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt:  { type: Date },
  },
  { timestamps: true }
);
// One live request per student per resource.
ResourceRequestSchema.index({ tenantId: 1, resourceId: 1, studentId: 1 }, { unique: true });

export default mongoose.model<IResourceRequest>('ResourceRequest', ResourceRequestSchema);

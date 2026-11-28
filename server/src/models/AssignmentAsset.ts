import mongoose, { Schema, Types } from 'mongoose';

/**
 * An image an author uploaded for a web assignment: a mockup to match, or a logo / photo / icon the
 * student must use. Re-encoded to WebP and served publicly (a student's page in the preview loads it
 * without a sign-in), by GET /public/assignment-assets/:tenantId/:id.webp.
 */
export interface IAssignmentAsset {
  _id: Types.ObjectId;
  tenantId: string;
  storage: 'bunny' | 'local';
  path: string;
  contentType: string;
  originalName: string;
  width?: number;
  height?: number;
  bytes: number;
  uploadedBy?: Types.ObjectId;
  createdAt: Date;
}

const AssignmentAssetSchema = new Schema<IAssignmentAsset>({
  tenantId: { type: String, required: true, index: true },
  storage: { type: String, enum: ['bunny', 'local'], required: true },
  path: { type: String, required: true },
  contentType: { type: String, default: 'image/webp' },
  originalName: { type: String, default: '' },
  width: Number,
  height: Number,
  bytes: { type: Number, default: 0 },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: { createdAt: true, updatedAt: false } });

export default mongoose.model<IAssignmentAsset>('AssignmentAsset', AssignmentAssetSchema);

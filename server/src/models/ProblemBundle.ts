import mongoose, { Schema, Document } from 'mongoose';

/**
 * A saved selection of library items. Holds references only — fixing an item fixes every bundle
 * that uses it. A global bundle is a ready-made starter a tenant can clone into its own space.
 */
export interface IProblemBundle extends Document {
  scope: 'global' | 'tenant';
  tenantId: string | null;
  name: string;
  description: string;
  tags: string[];
  itemIds: mongoose.Types.ObjectId[];
  status: 'draft' | 'published';
  clonedFrom?: mongoose.Types.ObjectId;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProblemBundleSchema = new Schema<IProblemBundle>({
  scope: { type: String, enum: ['global', 'tenant'], required: true },
  tenantId: { type: String, default: null },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: '', maxlength: 2000 },
  tags: { type: [String], default: [] },
  itemIds: { type: [Schema.Types.ObjectId], default: [] },
  status: { type: String, enum: ['draft', 'published'], default: 'published' },
  clonedFrom: { type: Schema.Types.ObjectId },
  createdBy: String,
}, { timestamps: true });

ProblemBundleSchema.index({ scope: 1, tenantId: 1, status: 1, updatedAt: -1 });
ProblemBundleSchema.index({ tenantId: 1, clonedFrom: 1 });

export default mongoose.model<IProblemBundle>('ProblemBundle', ProblemBundleSchema);

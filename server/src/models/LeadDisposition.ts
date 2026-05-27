import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadDisposition extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  isActive: boolean;
  order: number;
  stageIds: mongoose.Types.ObjectId[]; // empty = applies to ALL stages
  createdAt: Date;
  updatedAt: Date;
}

const LeadDispositionSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    name: { type: String, required: true, trim: true },
    color: { type: String, default: '#6366f1', trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    stageIds: [{ type: mongoose.Types.ObjectId, ref: 'LeadStage' }] // empty = global
  },
  { timestamps: true }
);

LeadDispositionSchema.index({ tenantId: 1, order: 1 });

export default mongoose.model<ILeadDisposition>('LeadDisposition', LeadDispositionSchema);

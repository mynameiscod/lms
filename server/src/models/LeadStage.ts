import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadStage extends Document {
  name: string;
  color: string;
  order: number;
  isDefault: boolean; // Default stages can't be deleted
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadStageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      default: '#005897'
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    }
  },
  { timestamps: true }
);

LeadStageSchema.index({ tenantId: 1, order: 1 });
LeadStageSchema.index({ tenantId: 1, name: 1 }, { unique: true });

export default mongoose.model<ILeadStage>('LeadStage', LeadStageSchema);

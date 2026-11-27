import mongoose, { Schema, Document } from 'mongoose';

/**
 * A reason inside a sub-stage (e.g. Lost → "Not interested" → "Fee too high").
 * Configured per institute on the Pipeline settings page.
 */
export interface ILeadReason extends Document {
  tenantId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  subStageId: mongoose.Types.ObjectId;
  name: string;
  order: number;
  isActive: boolean;
  /** Show a free-text box the counsellor must fill (for "Other"). */
  requiresDetail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadReasonSchema = new Schema<ILeadReason>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    stageId: { type: Schema.Types.ObjectId, ref: 'LeadStage', required: true },
    subStageId: { type: Schema.Types.ObjectId, ref: 'LeadSubStage', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    requiresDetail: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadReasonSchema.index({ tenantId: 1, subStageId: 1, order: 1 });
LeadReasonSchema.index({ tenantId: 1, subStageId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model<ILeadReason>('LeadReason', LeadReasonSchema);

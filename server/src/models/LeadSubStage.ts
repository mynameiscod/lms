import mongoose, { Schema, Document } from 'mongoose';

/**
 * A sub-stage inside a lead stage (e.g. stage "Contacting" → "No answer", "Busy").
 * Configured per institute on the Pipeline settings page.
 */
export interface ILeadSubStage extends Document {
  tenantId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  name: string;
  color?: string;
  order: number;
  isActive: boolean;
  /** Counsellor must pick one of this sub-stage's reasons. */
  requiresReason: boolean;
  /** Counsellor must type a note. */
  requiresNote: boolean;
  /** Counsellor must set the next follow-up date. */
  requiresFollowUp: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSubStageSchema = new Schema<ILeadSubStage>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    stageId: { type: Schema.Types.ObjectId, ref: 'LeadStage', required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    requiresReason: { type: Boolean, default: false },
    requiresNote: { type: Boolean, default: false },
    requiresFollowUp: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadSubStageSchema.index({ tenantId: 1, stageId: 1, order: 1 });
LeadSubStageSchema.index({ tenantId: 1, stageId: 1, name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export default mongoose.model<ILeadSubStage>('LeadSubStage', LeadSubStageSchema);

import mongoose, { Schema, Document } from 'mongoose';

/*
 * PROBABLES — a sales member's call that a lead is likely to join a particular batch.
 * Part of the Sales Teams lead report (services/salesLeadReport.ts). Kept in its own collection so the
 * Lead model and every existing Leads screen stay exactly as they are.
 *
 * One row per lead: marking a lead for another batch moves it. Whether the lead actually joined is read
 * live from the lead's stage (enrolled milestone), never stored here.
 */
export interface ILeadProbable extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  /** Copied when marked, so a renamed or deleted batch still reads sensibly. */
  batchName: string;
  batchStart: Date;
  /** How sure the member is. */
  chance: 'high' | 'medium' | 'low';
  note?: string;
  markedBy: mongoose.Types.ObjectId;
  markedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const PROBABLE_CHANCES = ['high', 'medium', 'low'] as const;

const LeadProbableSchema = new Schema<ILeadProbable>({
  tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  leadId:       { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  batchId:      { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  batchName:    { type: String, required: true, trim: true },
  batchStart:   { type: Date, required: true },
  chance:       { type: String, enum: PROBABLE_CHANCES, default: 'medium' },
  note:         { type: String, trim: true, maxlength: 500 },
  markedBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  markedByName: { type: String },
}, { timestamps: true });

LeadProbableSchema.index({ tenantId: 1, leadId: 1 }, { unique: true });
LeadProbableSchema.index({ tenantId: 1, batchId: 1 });

export default mongoose.model<ILeadProbable>('LeadProbable', LeadProbableSchema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * One archive, restore or permanent delete an admin ran on leads — what was asked, how many it
 * touched, and whether it finished. Holds no personal data, so it survives the leads it describes.
 */
export type ArchiveRunKind = 'archive' | 'restore' | 'purge';

export interface ILeadArchiveRun extends Document {
  tenantId: mongoose.Types.ObjectId;
  kind: ArchiveRunKind;
  filters: Record<string, any>;
  reason?: string;
  matched: number;
  skippedProtected: number;
  processed: number;
  status: 'running' | 'done' | 'failed';
  error?: string;
  /** For a restore: the archive run it undid. */
  undoesRunId?: mongoose.Types.ObjectId;
  startedBy: mongoose.Types.ObjectId;
  startedByName?: string;
  finishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeadArchiveRunSchema = new Schema<ILeadArchiveRun>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  kind: { type: String, enum: ['archive', 'restore', 'purge'], required: true },
  filters: { type: Schema.Types.Mixed, default: {} },
  reason: { type: String, trim: true, maxlength: 300 },
  matched: { type: Number, default: 0 },
  skippedProtected: { type: Number, default: 0 },
  processed: { type: Number, default: 0 },
  status: { type: String, enum: ['running', 'done', 'failed'], default: 'running' },
  error: { type: String, maxlength: 500 },
  undoesRunId: { type: Schema.Types.ObjectId, ref: 'LeadArchiveRun' },
  startedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startedByName: { type: String },
  finishedAt: { type: Date },
}, { timestamps: true, minimize: false });

LeadArchiveRunSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<ILeadArchiveRun>('LeadArchiveRun', LeadArchiveRunSchema);

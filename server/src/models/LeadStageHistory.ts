import mongoose, { Schema, Document } from 'mongoose';

export interface ILeadStageHistory extends Document {
  leadId: mongoose.Types.ObjectId;
  stageId: mongoose.Types.ObjectId;
  stageName: string;
  enteredAt: Date;
  exitedAt: Date | null;
  durationMinutes: number | null;
  enteredBy: mongoose.Types.ObjectId;
  exitedBy?: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  fromStageId?: mongoose.Types.ObjectId;
  subStageId?: mongoose.Types.ObjectId;
  subStageName?: string;
  reasonId?: mongoose.Types.ObjectId;
  reasonName?: string;
  reasonDetail?: string;
  note?: string;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeadStageHistorySchema: Schema = new Schema(
  {
    leadId: {
      type: mongoose.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    stageId: {
      type: mongoose.Types.ObjectId,
      ref: 'LeadStage',
      required: true
    },
    stageName: {
      type: String,
      required: true,
      trim: true
    },
    enteredAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    exitedAt: {
      type: Date,
      default: null
    },
    durationMinutes: {
      type: Number,
      default: null
    },
    enteredBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    exitedBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    // Detail of how the lead entered this stage (written by leadLifecycleService).
    fromStageId: { type: mongoose.Types.ObjectId, ref: 'LeadStage' },
    subStageId: { type: mongoose.Types.ObjectId, ref: 'LeadSubStage' },
    subStageName: { type: String, trim: true },
    reasonId: { type: mongoose.Types.ObjectId, ref: 'LeadReason' },
    reasonName: { type: String, trim: true },
    reasonDetail: { type: String, trim: true },
    note: { type: String, trim: true },
    // Answers to the required qualification questions at the moment the lead was qualified.
    qualificationEvidence: { type: Schema.Types.Mixed },
    source: { type: String, enum: ['manual', 'bulk', 'approval', 'outpero', 'automation', 'convert', 'reopen', 'edit'] }
  },
  { timestamps: true }
);

// Indexes for efficient queries
LeadStageHistorySchema.index({ tenantId: 1, leadId: 1 });
LeadStageHistorySchema.index({ tenantId: 1, stageId: 1 });
LeadStageHistorySchema.index({ tenantId: 1, enteredAt: -1 });
LeadStageHistorySchema.index({ leadId: 1, exitedAt: 1 }); // For finding active stage

// Virtual to calculate current duration for active stages
LeadStageHistorySchema.virtual('currentDurationMinutes').get(function() {
  if (this.exitedAt) {
    return this.durationMinutes;
  }
  // Calculate live duration for active stage
  const now = new Date();
  const diffMs = now.getTime() - this.enteredAt.getTime();
  return Math.floor(diffMs / (1000 * 60));
});

LeadStageHistorySchema.set('toJSON', { virtuals: true });
LeadStageHistorySchema.set('toObject', { virtuals: true });

export default mongoose.model<ILeadStageHistory>('LeadStageHistory', LeadStageHistorySchema);

import mongoose, { Schema, Document } from 'mongoose';

/** Immutable audit trail for sensitive actions (e.g. an instructor overriding an AI score). */
export interface ICommunicationAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  entityType: string;              // 'attempt' | 'feedback' | ...
  entityId: mongoose.Types.ObjectId;
  action: string;                  // 'score_override' | 'reattempt_required' | ...
  performedBy: mongoose.Types.ObjectId;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: Date;
}

const Schema_ = new Schema<ICommunicationAuditLog>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    action: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    previousValue: { type: String },
    newValue: { type: String },
    reason: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<ICommunicationAuditLog>('CommunicationAuditLog', Schema_);

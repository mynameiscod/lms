import mongoose, { Schema, Document } from 'mongoose';

/**
 * The Help & Support trail: who changed what on a ticket, an article or the settings, and every
 * time a support HQ user read another college's data. Append-only; nothing updates a row.
 *
 * `changes` holds field names with old and new values for status-like fields only. Message
 * bodies and diagnostics are never copied here.
 */
export interface ISupportAuditLog extends Document {
  tenantId?: mongoose.Types.ObjectId | null;
  entity: 'ticket' | 'message' | 'faq' | 'config' | 'chat';
  entityId?: mongoose.Types.ObjectId | null;
  action: string;
  actorId?: mongoose.Types.ObjectId | null;
  actorKind: string;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
  /** The request that made the change, to tie a log line, an error and a ticket together. */
  requestId?: string;
  /** True when the actor's own tenant differs from the record's. */
  crossTenant: boolean;
  createdAt: Date;
}

const SupportAuditLogSchema = new Schema<ISupportAuditLog>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    entity:    { type: String, enum: ['ticket', 'message', 'faq', 'config', 'chat'], required: true },
    entityId:  { type: Schema.Types.ObjectId, default: null },
    action:    { type: String, required: true, maxlength: 60 },
    actorId:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorKind: { type: String, required: true, maxlength: 20 },
    changes:   { type: Schema.Types.Mixed, default: undefined },
    requestId: { type: String, maxlength: 64 },
    crossTenant: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SupportAuditLogSchema.index({ entity: 1, entityId: 1, createdAt: 1 });
SupportAuditLogSchema.index({ tenantId: 1, createdAt: -1 });
SupportAuditLogSchema.index({ actorId: 1, createdAt: -1 });

export default mongoose.model<ISupportAuditLog>('SupportAuditLog', SupportAuditLogSchema);

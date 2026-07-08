import mongoose, { Schema, Document } from 'mongoose';

export type ResourceAuditAction =
  | 'upload' | 'publish' | 'archive' | 'update' | 'delete'
  | 'request' | 'approve' | 'reject' | 'revoke' | 'download';

export interface IResourceAudit extends Document {
  tenantId: string;
  resourceId: mongoose.Types.ObjectId;
  resourceTitle?: string;
  actorId?: mongoose.Types.ObjectId;
  actorName?: string;
  actorRole?: string;
  action: ResourceAuditAction;
  meta?: Record<string, any>;   // e.g. { fileName, version, requestId }
  ip?: string;
  at: Date;
}

const ResourceAuditSchema = new Schema<IResourceAudit>({
  tenantId:      { type: String, required: true, index: true },
  resourceId:    { type: Schema.Types.ObjectId, ref: 'Resource', required: true, index: true },
  resourceTitle: { type: String },
  actorId:       { type: Schema.Types.ObjectId, ref: 'User' },
  actorName:     { type: String },
  actorRole:     { type: String },
  action:        { type: String, required: true },
  meta:          { type: Schema.Types.Mixed },
  ip:            { type: String },
  at:            { type: Date, default: Date.now, index: true },
});
ResourceAuditSchema.index({ tenantId: 1, resourceId: 1, at: -1 });

export default mongoose.model<IResourceAudit>('ResourceAudit', ResourceAuditSchema);

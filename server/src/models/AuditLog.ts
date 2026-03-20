import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  module: string;
  targetType: string;
  targetId?: mongoose.Types.ObjectId;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    userId: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      required: true,
      enum: [
        'CREATE', 'UPDATE', 'DELETE', 'VIEW',
        'ASSIGN', 'STAGE_CHANGE', 'CONVERT',
        'EXPORT', 'IMPORT', 'LOGIN', 'LOGOUT'
      ]
    },
    module: {
      type: String,
      required: true,
      enum: ['LEAD', 'USER', 'COURSE', 'QUIZ', 'ATTENDANCE', 'MARKETING', 'SYSTEM']
    },
    targetType: {
      type: String,
      required: true
    },
    targetId: {
      type: mongoose.Types.ObjectId
    },
    details: {
      type: String,
      required: true
    },
    metadata: {
      type: Schema.Types.Mixed
    },
    ipAddress: {
      type: String
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, module: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, targetId: 1 });

export default mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

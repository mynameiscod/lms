import mongoose, { Schema, Document } from 'mongoose';

// Per-user activity/error trail so admins can diagnose "student X can't do Y".
// Captures 4xx/5xx failures + a whitelist of key learning actions, attributed to
// the authenticated user. Self-prunes after 90 days via a TTL index.
export interface IStudentActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role?: string;
  action: string;            // human label, e.g. "Submitted assignment", "API error"
  method: string;
  route: string;             // request path (no query string)
  module: string;            // assignment | quiz | interview | lab | attendance | auth | playground | other
  status: number;            // HTTP status (0 for client-reported)
  errorMessage?: string;
  meta?: any;                // sanitized snippet (request body / response message)
  source: 'server' | 'client';
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const StudentActivityLogSchema = new Schema<IStudentActivityLog>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role:         { type: String },
    action:       { type: String, required: true },
    method:       { type: String },
    route:        { type: String },
    module:       { type: String, index: true },
    status:       { type: Number, default: 0 },
    errorMessage: { type: String },
    meta:         { type: Schema.Types.Mixed },
    source:       { type: String, enum: ['server', 'client'], default: 'server' },
    ip:           { type: String },
    userAgent:    { type: String },
    createdAt:    { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Fast per-student timeline lookups
StudentActivityLogSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
// TTL: auto-delete after 90 days
StudentActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default mongoose.model<IStudentActivityLog>('StudentActivityLog', StudentActivityLogSchema);

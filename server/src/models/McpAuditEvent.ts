import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  // Anonymous authentication failures must also be auditable.
  tenantId: { type: Schema.Types.ObjectId },
  userId: { type: Schema.Types.ObjectId },
  clientId: String,
  requestId: { type: String, required: true },
  tool: { type: String, required: true },
  reason: { type: String, required: true },
  outcome: { type: String, enum: ['allowed', 'denied', 'failed'], required: true },
  attendanceChanges: [{ _id: false, recordId: Schema.Types.ObjectId,
    before: { status: String, inTime: String, outTime: String, revision: String },
    after: { status: String, inTime: String, outTime: String, revision: String } }],
  at: { type: Date, default: Date.now },
}, { autoCreate: false, autoIndex: false });
schema.index({ tenantId: 1, at: -1 });
schema.index({ requestId: 1 });
export default mongoose.model('McpAuditEvent', schema);

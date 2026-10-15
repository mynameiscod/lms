import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  tool: { type: String, required: true },
  outcome: { type: String, enum: ['allowed', 'denied', 'failed'], required: true },
  at: { type: Date, default: Date.now },
});
schema.index({ tenantId: 1, at: -1 });
export default mongoose.model('McpAuditEvent', schema);

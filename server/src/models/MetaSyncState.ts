import mongoose, { Schema } from 'mongoose';
const schema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, unique: true },
  connectionKey: String,
  checkpoint: Date,
  lastAttemptAt: Date,
  lastSuccessAt: Date,
  lastError: String,
  status: { type: String, default: 'idle' },
  leaseToken: String,
  leaseUntil: Date,
  importToken: String,
  importUntil: Date,
  webhookStatus: String,
  webhookError: String,
  webhookCheckedAt: Date,
  tokenExpiresAt: Date,
  created: Number, updated: Number, skipped: Number,
}, { timestamps: true });
export default mongoose.model('MetaSyncState', schema);

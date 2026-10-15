import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  tenantId: { type: Schema.Types.ObjectId, required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  challenge: { type: String, required: true },
  audience: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('McpOAuthCode', schema);

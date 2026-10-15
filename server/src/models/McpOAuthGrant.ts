import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  userId: { type: Schema.Types.ObjectId, required: true },
  tenantId: { type: Schema.Types.ObjectId, required: true },
  clientId: { type: String, required: true },
  issuer: { type: String, required: true },
  audience: { type: String, required: true },
  scopes: { type: [String], required: true },
  credentialVersion: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
  // Every exchange writes this document to serialize rotation and revocation.
  version: { type: Number, default: 0 },
}, { timestamps: true });
schema.index({ userId: 1, tenantId: 1, revokedAt: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('McpOAuthGrant', schema);

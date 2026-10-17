import mongoose, { Schema } from 'mongoose';

/** OAuth access credentials are stored only as SHA-256 digests, never in plaintext. */
const schema = new Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  clientId: { type: String, required: true },
  audience: { type: String, required: true },
  issuer: { type: String, required: true },
  grantId: { type: Schema.Types.ObjectId, required: true, index: true },
  scopes: { type: [String], required: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date },
}, { timestamps: true, autoCreate: false, autoIndex: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ userId: 1, tenantId: 1 });
export default mongoose.model('McpOAuthAccessToken', schema);

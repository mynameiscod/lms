import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  codeHash: { type: String, required: true, unique: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  tenantId: { type: Schema.Types.ObjectId, required: true },
  clientId: { type: String, required: true },
  redirectUri: { type: String, required: true },
  challenge: { type: String, required: true },
  audience: { type: String, required: true },
  issuer: { type: String, required: true },
  grantId: { type: Schema.Types.ObjectId, required: true },
  scopes: { type: [String], required: true },
  expiresAt: { type: Date, required: true },
  // Keep consumed codes until the grant expires so replay can revoke the family.
  purgeAt: { type: Date, required: true },
  consumedAt: { type: Date },
}, { timestamps: true, autoCreate: false, autoIndex: false });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('McpOAuthCode', schema);

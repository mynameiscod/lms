import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  csrfHash: { type: String, required: true },
  purpose: { type: String, enum: ['authorize', 'connections'], required: true },
  parameters: { type: Map, of: String },
  readConsentScopes: [String],
  userId: Schema.Types.ObjectId,
  tenantId: Schema.Types.ObjectId,
  credentialVersion: String,
  expiresAt: { type: Date, required: true },
}, { timestamps: true, autoCreate: false, autoIndex: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('McpOAuthSession', schema);

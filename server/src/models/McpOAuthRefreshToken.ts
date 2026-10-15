import mongoose, { Schema } from 'mongoose';

const schema = new Schema({
  tokenHash: { type: String, required: true, unique: true },
  grantId: { type: Schema.Types.ObjectId, required: true, index: true },
  clientId: { type: String, required: true },
  scopes: { type: [String], required: true },
  expiresAt: { type: Date, required: true },
  usedAt: Date,
  purgeAt: { type: Date, required: true },
}, { timestamps: true });
schema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('McpOAuthRefreshToken', schema);

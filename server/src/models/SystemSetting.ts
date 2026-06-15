import mongoose, { Schema, Document } from 'mongoose';

/**
 * SystemSetting — platform-wide configuration managed from the admin UI instead
 * of the .env file. Secret values (API keys, passwords) are stored AES-encrypted
 * (see settingsService). Non-secret values (models, prices, hosts) are plaintext.
 *
 * Scope is 'platform' for now; a per-tenant scope (tenantId) can be added later
 * without a migration — the resolver already prefers a tenant override when present.
 */
export interface ISystemSetting extends Document {
  key: string;          // canonical key, mirrors the old .env name (e.g. ANTHROPIC_API_KEY)
  value: string;        // encrypted if isSecret, else plaintext
  group: string;        // ui grouping: 'ai' | 'email' | 'storage' | ...
  isSecret: boolean;
  scope: 'platform';
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  createdAt: Date;
}

const SystemSettingSchema = new Schema<ISystemSetting>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: '' },
    group: { type: String, required: true, index: true },
    isSecret: { type: Boolean, default: false },
    scope: { type: String, enum: ['platform'], default: 'platform' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema);

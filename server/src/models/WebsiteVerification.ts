import mongoose, { Schema, Document } from 'mongoose';

/**
 * One phone-verification attempt made from a website form.
 *
 * `requestId` ties the WhatsApp code (stored hashed in AssessmentOtp under the same key) to a phone
 * number. After the code is accepted the website receives a `verificationToken` — a single-use proof
 * that this phone was verified — which the form submit must carry. Only its hash is stored.
 * Removed automatically once `expiresAt` passes.
 */
export interface IWebsiteVerification extends Document {
  tenantId: string;
  requestId: string;
  phone: string;
  purpose: string;
  sendCount: number;
  verifiedAt?: Date;
  tokenHash?: string;
  tokenExpiresAt?: Date;
  usedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

const WebsiteVerificationSchema = new Schema<IWebsiteVerification>({
  tenantId: { type: String, required: true },
  requestId: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  purpose: { type: String, default: 'lead' },
  sendCount: { type: Number, default: 0 },
  verifiedAt: Date,
  tokenHash: { type: String, index: true },
  tokenExpiresAt: Date,
  usedAt: Date,
  expiresAt: { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

WebsiteVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
WebsiteVerificationSchema.index({ tenantId: 1, phone: 1, createdAt: -1 });

export default mongoose.model<IWebsiteVerification>('WebsiteVerification', WebsiteVerificationSchema);

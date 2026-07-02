import mongoose, { Schema, Document } from 'mongoose';

/**
 * PartnerSuppression — an email address that must NOT receive outreach again
 * (one-click unsubscribe, or a hard bounce). Checked before starting a sequence
 * and before every send, so we never re-email someone who opted out — the single
 * biggest lever on complaint rate + deliverability. Unique per tenant + email.
 */
export interface IPartnerSuppression extends Document {
  tenantId: mongoose.Types.ObjectId;
  email: string;                 // lowercased
  reason: 'unsubscribed' | 'bounced' | 'manual';
  partnerId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const schema = new Schema<IPartnerSuppression>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    email:     { type: String, required: true, lowercase: true, trim: true },
    reason:    { type: String, enum: ['unsubscribed', 'bounced', 'manual'], default: 'unsubscribed' },
    partnerId: { type: Schema.Types.ObjectId, ref: 'PlacementPartner' },
    createdAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);

schema.index({ tenantId: 1, email: 1 }, { unique: true });

export default mongoose.model<IPartnerSuppression>('PartnerSuppression', schema);

import mongoose, { Document, Schema } from 'mongoose';

/**
 * Addresses that have opted out of marketing email.
 *
 * Checked before every non-transactional send. Kept deliberately simple and global
 * (not per-tenant): a person who unsubscribes should not have to do it again for
 * each tenant, and honouring an opt-out too broadly is the safe failure direction.
 */
export interface IEmailSuppression extends Document {
  email: string;              // always stored lowercase
  reason?: string;
  source?: string;            // which email they clicked unsubscribe from
  createdAt: Date;
}

const EmailSuppressionSchema = new Schema<IEmailSuppression>(
  {
    email:  { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    reason: { type: String },
    source: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model<IEmailSuppression>('EmailSuppression', EmailSuppressionSchema);

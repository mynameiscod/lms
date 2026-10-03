import mongoose, { Schema, Document } from 'mongoose';

/**
 * One WhatsApp template message we asked Meta to send, and what became of it.
 *
 * WHY THIS EXISTS. Meta answering 200 to a send means "queued", not "delivered". Whether it reached
 * the phone is decided a moment later and reported to the webhook as a status (sent → delivered →
 * read, or failed with a reason). We used to discard Meta's message id and ignore those reports, so
 * a message that never arrived looked exactly like one that did — the only answer to "why didn't
 * they get it?" was a guess.
 *
 * `wamid` is Meta's id for the message and the key every status report carries. A send Meta refused
 * outright has no wamid; it is recorded as failed with Meta's error, so the log shows every attempt.
 */
export type WaMessageStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

export interface IWhatsAppMessageLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  wamid?: string;
  to: string;
  templateName: string;
  templateId?: mongoose.Types.ObjectId;
  source: 'test' | 'broadcast' | 'system';
  broadcastId?: mongoose.Types.ObjectId;
  status: WaMessageStatus;
  /** Meta's error, when a send or a delivery failed. */
  errorCode?: number;
  errorTitle?: string;
  errorDetail?: string;
  /** When Meta reported the current status (from the webhook), or when the send was refused. */
  statusAt?: Date;
  sentBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppMessageLogSchema = new Schema<IWhatsAppMessageLog>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  wamid: { type: String, index: { unique: true, sparse: true } },
  to: { type: String, required: true, index: true },
  templateName: { type: String, required: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'WhatsAppTemplate' },
  source: { type: String, enum: ['test', 'broadcast', 'system'], default: 'system' },
  broadcastId: { type: Schema.Types.ObjectId, ref: 'WhatsAppBroadcast', index: true },
  status: { type: String, enum: ['accepted', 'sent', 'delivered', 'read', 'failed'], default: 'accepted' },
  errorCode: Number,
  errorTitle: String,
  errorDetail: String,
  statusAt: Date,
  sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

WhatsAppMessageLogSchema.index({ tenantId: 1, createdAt: -1 });
// Six months is plenty to answer "did they get it?"; older rows are dropped automatically.
WhatsAppMessageLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 3600 });

export default mongoose.model<IWhatsAppMessageLog>('WhatsAppMessageLog', WhatsAppMessageLogSchema);

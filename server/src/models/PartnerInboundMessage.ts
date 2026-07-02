import mongoose, { Schema, Document } from 'mongoose';

/**
 * PartnerInboundMessage — a reply received from a placement partner, captured by
 * the IMAP poller so it can be read (and replied to) inside the pipeline.
 *
 * Matched to a partner by the sender address OR by the email thread (In-Reply-To
 * / References pointing at one of our sent Message-IDs). Deduped on
 * (tenantId, messageId) so re-scanning the mailbox never inserts twice — which
 * is what lets us leave the mail UNREAD in the real inbox.
 */
export interface IPartnerInboundMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  companyName: string;
  fromEmail: string;
  fromName?: string;
  subject: string;
  text: string;                 // plain-text body (preferred for display)
  html?: string;                // original HTML body if present
  messageId: string;            // RFC Message-ID of the reply (dedup key)
  inReplyTo?: string;
  references?: string[];
  matchedBy: 'address' | 'thread';
  read: boolean;                // admin has opened it in-app
  receivedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPartnerInboundMessage>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    partnerId:  { type: Schema.Types.ObjectId, ref: 'PlacementPartner', required: true, index: true },
    companyName:{ type: String, default: '' },
    fromEmail:  { type: String, default: '' },
    fromName:   { type: String, default: '' },
    subject:    { type: String, default: '' },
    text:       { type: String, default: '' },
    html:       { type: String, default: '' },
    messageId:  { type: String, required: true },
    inReplyTo:  { type: String },
    references: { type: [String], default: [] },
    matchedBy:  { type: String, enum: ['address', 'thread'], default: 'address' },
    read:       { type: Boolean, default: false },
    receivedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Dedup: one row per message per tenant → idempotent polling.
schema.index({ tenantId: 1, messageId: 1 }, { unique: true });
schema.index({ tenantId: 1, partnerId: 1, receivedAt: -1 });

export default mongoose.model<IPartnerInboundMessage>('PartnerInboundMessage', schema);

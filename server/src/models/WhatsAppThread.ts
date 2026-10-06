import mongoose, { Schema, Document } from 'mongoose';

/**
 * One per (tenant, phone): the facts a list or the reply box needs without scanning messages —
 * when the person last wrote (opens Meta's 24-hour reply window), unread count, and whether the
 * qualification bot is paused because a person on our side has taken over.
 */
export interface IWhatsAppThread extends Document {
  tenantId: mongoose.Types.ObjectId;
  phone: string;
  contactName?: string;
  lastInboundAt?: Date;
  lastMessageAt?: Date;
  lastPreview?: string;
  unreadCount: number;
  botPaused: boolean;
  lastStaffReplyAt?: Date;
  lastStaffReplyBy?: mongoose.Types.ObjectId;
}

const WhatsAppThreadSchema = new Schema<IWhatsAppThread>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  phone: { type: String, required: true },
  contactName: String,
  lastInboundAt: Date,
  lastMessageAt: Date,
  lastPreview: String,
  unreadCount: { type: Number, default: 0 },
  botPaused: { type: Boolean, default: false },
  lastStaffReplyAt: Date,
  lastStaffReplyBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

WhatsAppThreadSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
WhatsAppThreadSchema.index({ tenantId: 1, lastMessageAt: -1 });

export default mongoose.model<IWhatsAppThread>('WhatsAppThread', WhatsAppThreadSchema);

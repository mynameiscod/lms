import mongoose, { Schema, Document } from 'mongoose';

/**
 * One per (tenant, phone): the facts a list or the reply box needs without scanning messages —
 * when the person last wrote (opens Meta's 24-hour reply window), unread count, whether the
 * qualification bot is paused because a person on our side has taken over, who on the team owns
 * the conversation, and which records (placement candidate, lead, student) share the number.
 */
export interface IWhatsAppThreadLinks {
  placementId?: mongoose.Types.ObjectId;
  placementName?: string;
  leadId?: mongoose.Types.ObjectId;
  leadName?: string;
  userId?: mongoose.Types.ObjectId;
  userName?: string;
}

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
  assignedTo?: mongoose.Types.ObjectId | null;
  assignedAt?: Date;
  links?: IWhatsAppThreadLinks;
  /** When `links` was last worked out; refreshed so a lead created later still shows up. */
  linkedAt?: Date;
  /** Last time staff were notified about a reply here — keeps a burst of messages to one bell. */
  lastNotifiedAt?: Date;
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
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  assignedAt: Date,
  links: {
    placementId: { type: Schema.Types.ObjectId, ref: 'PlacementCandidate' },
    placementName: String,
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
    leadName: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    userName: String,
  },
  linkedAt: Date,
  lastNotifiedAt: Date,
}, { timestamps: true });

WhatsAppThreadSchema.index({ tenantId: 1, phone: 1 }, { unique: true });
WhatsAppThreadSchema.index({ tenantId: 1, lastMessageAt: -1 });
WhatsAppThreadSchema.index({ tenantId: 1, assignedTo: 1, lastMessageAt: -1 });

export default mongoose.model<IWhatsAppThread>('WhatsAppThread', WhatsAppThreadSchema);

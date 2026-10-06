import mongoose, { Schema, Document } from 'mongoose';

/**
 * One WhatsApp message in a conversation, in either direction — what staff see in the Chat tab.
 *
 * WhatsAppMessageLog is the delivery log for template sends; this is the conversation itself: every
 * reply a person sends us (text, photo, PDF, voice note) and everything we send them (chat replies,
 * templates, broadcasts, bot questions). A thread is (tenantId, phone). Kept for two years.
 */
export type WaChatKind = 'text' | 'template' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'button' | 'contacts' | 'unsupported';
export type WaChatStatus = 'received' | 'accepted' | 'sent' | 'delivered' | 'read' | 'failed';

export interface IWhatsAppChatMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  /** Normalised to 91XXXXXXXXXX (normalizeTo), the same form Meta uses. */
  phone: string;
  direction: 'in' | 'out';
  kind: WaChatKind;
  body: string;
  templateName?: string;
  media?: { metaMediaId?: string; mime?: string; fileName?: string; storedKey?: string; size?: number };
  wamid?: string;
  status: WaChatStatus;
  error?: string;
  sentBy?: mongoose.Types.ObjectId;
  source: 'chat' | 'broadcast' | 'system' | 'bot' | 'test' | 'person';
  createdAt: Date;
}

export const CHAT_RETENTION_SECONDS = 2 * 365 * 24 * 60 * 60; // two years — decided 2026-10-06

const WhatsAppChatMessageSchema = new Schema<IWhatsAppChatMessage>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  phone: { type: String, required: true },
  direction: { type: String, enum: ['in', 'out'], required: true },
  kind: { type: String, default: 'text' },
  body: { type: String, default: '' },
  templateName: String,
  media: { metaMediaId: String, mime: String, fileName: String, storedKey: String, size: Number },
  // Meta retries webhooks; the unique wamid makes a repeat delivery a no-op.
  wamid: { type: String, index: { unique: true, sparse: true } },
  status: { type: String, default: 'received' },
  error: String,
  sentBy: { type: Schema.Types.ObjectId, ref: 'User' },
  source: { type: String, default: 'person' },
}, { timestamps: { createdAt: true, updatedAt: false } });

WhatsAppChatMessageSchema.index({ tenantId: 1, phone: 1, createdAt: -1 });
WhatsAppChatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: CHAT_RETENTION_SECONDS });

export default mongoose.model<IWhatsAppChatMessage>('WhatsAppChatMessage', WhatsAppChatMessageSchema, 'whatsappmessages');

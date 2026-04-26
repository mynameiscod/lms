import mongoose, { Schema, Document } from 'mongoose';

export type ConversationStep =
  | 'initial'
  | 'asked_name'
  | 'asked_year'
  | 'asked_course'
  | 'qualified';

export interface IWhatsAppConversationState extends Document {
  phone: string;
  tenantId: string;
  conversationStep: ConversationStep;
  name?: string;
  yearOfGraduation?: string;
  interestedCourse?: string;
  lastMessageAt: Date;
  expiresAt: Date; // TTL field — auto-deleted after 24h
}

const WhatsAppConversationStateSchema: Schema = new Schema(
  {
    phone: { type: String, required: true, trim: true },
    tenantId: { type: String, required: true },
    conversationStep: {
      type: String,
      enum: ['initial', 'asked_name', 'asked_year', 'asked_course', 'qualified'],
      default: 'initial',
    },
    name: { type: String, trim: true },
    yearOfGraduation: { type: String, trim: true },
    interestedCourse: { type: String, trim: true },
    lastMessageAt: { type: Date, default: Date.now },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  { timestamps: false }
);

// Compound unique: one active state per phone+tenant
WhatsAppConversationStateSchema.index({ phone: 1, tenantId: 1 }, { unique: true });

// TTL index: MongoDB auto-deletes documents after expiresAt
WhatsAppConversationStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<IWhatsAppConversationState>(
  'WhatsAppConversationState',
  WhatsAppConversationStateSchema
);

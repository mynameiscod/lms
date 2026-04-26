import mongoose, { Schema, Document } from 'mongoose';

export type ConversationStep =
  | 'initial'
  | 'in_progress'
  | 'qualified'
  // Legacy steps kept for backward-compat
  | 'asked_name'
  | 'asked_year'
  | 'asked_course';

export interface IWhatsAppConversationState extends Document {
  phone: string;
  tenantId: string;
  conversationStep: ConversationStep;
  /** Index of the current question being asked (0-based into sorted question list) */
  currentQuestionIndex: number;
  /** All collected answers keyed by question.id */
  answers: Map<string, string>;
  /** Accumulated score from answer-scoring rules */
  scoreSoFar: number;
  /** Legacy fields kept for backward-compat */
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
      enum: ['initial', 'in_progress', 'qualified', 'asked_name', 'asked_year', 'asked_course'],
      default: 'initial',
    },
    currentQuestionIndex: { type: Number, default: 0 },
    answers: { type: Map, of: String, default: {} },
    scoreSoFar: { type: Number, default: 0 },
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

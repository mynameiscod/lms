import mongoose, { Schema, Document } from 'mongoose';
import { LIMITS } from '../data/supportPolicy';

/**
 * A conversation with the support assistant. Named SupportChatSession because MentorChat and the
 * WhatsApp inbox already use "chat" for other things.
 *
 * The history is capped (LIMITS.chatHistory) by the service that appends to it; `sources` records
 * which published FAQs an answer was grounded in, so an answer can always be traced.
 */
export interface ISupportChatTurn {
  role: 'user' | 'assistant';
  content: string;
  sources?: { faqId: mongoose.Types.ObjectId; title: string }[];
  /** True when the assistant used the "couldn't confirm" fallback. */
  fallback?: boolean;
  /** Numbered troubleshooting steps, kept apart from the prose so they render as a list. */
  steps?: string[];
  /** The member's thumbs up/down on this answer. */
  helpful?: boolean | null;
  at: Date;
}

export interface ISupportChatSession extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  status: 'active' | 'resolved' | 'escalated' | 'closed';
  turns: ISupportChatTurn[];
  /** Set only after the backend created a ticket from this chat. */
  ticketId?: mongoose.Types.ObjectId | null;
  feedback?: { helpful: boolean; at: Date } | null;
  failures: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TurnSchema = new Schema<ISupportChatTurn>(
  {
    role:     { type: String, enum: ['user', 'assistant'], required: true },
    content:  { type: String, required: true, maxlength: 8000 },
    sources:  { type: [{ faqId: { type: Schema.Types.ObjectId, ref: 'SupportFaq' }, title: String, _id: false }], default: undefined },
    fallback: { type: Boolean },
    steps:    { type: [{ type: String, maxlength: 600 }], default: undefined },
    helpful:  { type: Boolean, default: undefined },
    at:       { type: Date, default: () => new Date() },
  },
  { _id: false }
);

const SupportChatSessionSchema = new Schema<ISupportChatSession>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status:   { type: String, enum: ['active', 'resolved', 'escalated', 'closed'], default: 'active' },
    turns:    {
      type: [TurnSchema],
      default: [],
      validate: { validator: (v: unknown[]) => v.length <= LIMITS.chatHistory, message: `A chat keeps at most ${LIMITS.chatHistory} turns` },
    },
    ticketId: { type: Schema.Types.ObjectId, ref: 'SupportTicket', default: null },
    feedback: { type: { helpful: Boolean, at: Date }, default: null, _id: false },
    failures: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

SupportChatSessionSchema.index({ tenantId: 1, userId: 1, lastActivityAt: -1 });
SupportChatSessionSchema.index({ status: 1, createdAt: -1 });
SupportChatSessionSchema.index({ lastActivityAt: 1 });

export default mongoose.model<ISupportChatSession>('SupportChatSession', SupportChatSessionSchema);

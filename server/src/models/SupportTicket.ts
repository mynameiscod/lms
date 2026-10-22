import mongoose, { Schema, Document } from 'mongoose';
import {
  TICKET_STATUSES, TICKET_PRIORITIES, TICKET_SOURCES, TICKET_CATEGORIES, SUPPORT_MODULES, LIMITS,
  TicketStatus, TicketPriority, TicketSource, TicketCategory, SupportModule,
} from '../data/supportPolicy';

/**
 * A Help & Support ticket (CareerPilot). Separate from Concern, the LMS "raise a concern" inbox,
 * which stays as it is.
 *
 * Who raised it, their institute and their role are copied from the login at creation and never
 * from the request body. `context` is captured by the server (route, request id); `diagnostics`
 * is stored only when the member ticked the consent box, and only in sanitised form.
 */
export interface ISupportTicket extends Document {
  tenantId: mongoose.Types.ObjectId;
  ticketNumber: string;
  requesterId: mongoose.Types.ObjectId;
  /** User.role at the time of raising, for the audit trail and analytics. */
  requesterRole: string;
  subject: string;
  description: string;
  module: SupportModule;
  category: TicketCategory;
  source: TicketSource;
  status: TicketStatus;
  priority: TicketPriority;
  /** 0 low … 3 critical, kept in step with priority so the queue can sort by urgency. */
  priorityRank: number;
  assigneeId?: mongoose.Types.ObjectId | null;
  escalated: boolean;
  escalatedAt?: Date | null;
  context?: { route?: string; requestId?: string; userAgent?: string; appVersion?: string };
  diagnosticsConsent: boolean;
  diagnostics?: { summary?: string; capturedAt?: Date };
  chatSessionId?: mongoose.Types.ObjectId | null;
  firstResponseAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  reopenCount: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    tenantId:      { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    ticketNumber:  { type: String, required: true, unique: true, match: /^SUP-\d{2}-\d{5,}$/ },
    requesterId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requesterRole: { type: String, required: true, maxlength: 40 },
    subject:       { type: String, required: true, trim: true, minlength: 3, maxlength: LIMITS.subject },
    description:   { type: String, required: true, trim: true, minlength: 1, maxlength: LIMITS.body },
    module:        { type: String, enum: SUPPORT_MODULES, default: 'other' },
    category:      { type: String, enum: TICKET_CATEGORIES, default: 'other' },
    source:        { type: String, enum: TICKET_SOURCES, default: 'help_center' },
    status:        { type: String, enum: TICKET_STATUSES, default: 'open' },
    priority:      { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    priorityRank:  { type: Number, min: 0, max: 3, default: 1 },
    assigneeId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    escalated:     { type: Boolean, default: false },
    escalatedAt:   { type: Date, default: null },
    context: {
      type: {
        route:      { type: String, maxlength: 300 },
        requestId:  { type: String, maxlength: 64 },
        userAgent:  { type: String, maxlength: 300 },
        appVersion: { type: String, maxlength: 40 },
      },
      default: undefined,
      _id: false,
    },
    diagnosticsConsent: { type: Boolean, default: false },
    diagnostics: {
      type: { summary: { type: String, maxlength: 4000 }, capturedAt: Date },
      default: undefined,
      _id: false,
    },
    chatSessionId:   { type: Schema.Types.ObjectId, ref: 'SupportChatSession', default: null },
    firstResponseAt: { type: Date, default: null },
    resolvedAt:      { type: Date, default: null },
    closedAt:        { type: Date, default: null },
    reopenCount:     { type: Number, default: 0, min: 0 },
    lastActivityAt:  { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

// Diagnostics without consent are refused at the model, not just in the controller.
SupportTicketSchema.pre('validate', function (next) {
  const rank = TICKET_PRIORITIES.indexOf(this.priority);
  if (rank >= 0) this.priorityRank = rank;
  if (!this.diagnosticsConsent && this.diagnostics) this.invalidate('diagnostics', 'Diagnostics need the member\'s consent');
  next();
});

SupportTicketSchema.index({ tenantId: 1, requesterId: 1, createdAt: -1 });
SupportTicketSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
SupportTicketSchema.index({ tenantId: 1, module: 1, createdAt: -1 });
SupportTicketSchema.index({ assigneeId: 1, status: 1 });
SupportTicketSchema.index({ status: 1, priorityRank: -1, createdAt: -1 });
SupportTicketSchema.index({ createdAt: -1 });

export default mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);

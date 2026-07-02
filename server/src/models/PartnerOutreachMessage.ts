import mongoose, { Schema, Document } from 'mongoose';

/**
 * PartnerOutreachMessage — one outbound email in a partner's outreach sequence.
 *
 * Trust rule: 'cold' / 'followup' may auto-send (status 'queued'); 'vouch' /
 * 'candidate_profile' are always drafted as 'pending_approval' and only sent
 * after the admin approves. A reply/bounce cancels all open messages.
 */

export type OutreachType = 'cold' | 'followup' | 'vouch' | 'candidate_profile';
export type MessageStatus = 'queued' | 'pending_approval' | 'sending' | 'sent' | 'failed' | 'cancelled';

export interface IPartnerOutreachMessage extends Document {
  tenantId: mongoose.Types.ObjectId;
  partnerId: mongoose.Types.ObjectId;
  companyName: string;            // denormalized for the approval queue
  type: OutreachType;
  status: MessageStatus;
  requiresApproval: boolean;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;                   // plain text (wrapped in minimal HTML on send)
  sequenceStep: number;           // 0 = cold, 1.. = follow-ups
  candidateIds: mongoose.Types.ObjectId[]; // for type 'candidate_profile' — PDFs generated at send
  messageId?: string;             // RFC Message-ID we set when sending (for reply threading)
  scheduledFor?: Date;
  sentAt?: Date;
  failedReason?: string;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPartnerOutreachMessage>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    partnerId:   { type: Schema.Types.ObjectId, ref: 'PlacementPartner', required: true, index: true },
    companyName: { type: String, default: '' },
    type:        { type: String, enum: ['cold', 'followup', 'vouch', 'candidate_profile'], required: true },
    status:      { type: String, enum: ['queued', 'pending_approval', 'sending', 'sent', 'failed', 'cancelled'], default: 'queued', index: true },
    requiresApproval: { type: Boolean, default: false },
    toEmail:     { type: String, default: '' },
    toName:      { type: String, default: '' },
    subject:     { type: String, default: '' },
    body:        { type: String, default: '' },
    sequenceStep:{ type: Number, default: 0 },
    candidateIds:{ type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    messageId:   { type: String, index: true },
    scheduledFor:{ type: Date },
    sentAt:      { type: Date },
    failedReason:{ type: String },
    approvedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt:  { type: Date },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schema.index({ tenantId: 1, status: 1, scheduledFor: 1 });
schema.index({ tenantId: 1, partnerId: 1, createdAt: -1 });

export default mongoose.model<IPartnerOutreachMessage>('PartnerOutreachMessage', schema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * What people searched the Help Center (or asked the assistant) for, and whether anything was
 * found. Unanswered searches are how the FAQ list learns what is missing.
 *
 * The query is stored redacted (utils/redact) and trimmed: a member who pastes an e-mail address
 * or a phone number into the search box does not leave it here.
 */
export interface ISupportSearchLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  query: string;
  /** Lower-cased, punctuation-free, for grouping repeats. */
  normalized: string;
  resultCount: number;
  topFaqId?: mongoose.Types.ObjectId | null;
  source: 'help_center' | 'ai_chat';
  createdAt: Date;
}

const SupportSearchLogSchema = new Schema<ISupportSearchLog>(
  {
    tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
    query:       { type: String, required: true, maxlength: 200 },
    normalized:  { type: String, required: true, maxlength: 200 },
    resultCount: { type: Number, required: true, min: 0 },
    topFaqId:    { type: Schema.Types.ObjectId, ref: 'SupportFaq', default: null },
    source:      { type: String, enum: ['help_center', 'ai_chat'], default: 'help_center' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SupportSearchLogSchema.index({ tenantId: 1, createdAt: -1 });
SupportSearchLogSchema.index({ resultCount: 1, createdAt: -1 });
SupportSearchLogSchema.index({ normalized: 1, createdAt: -1 });

export default mongoose.model<ISupportSearchLog>('SupportSearchLog', SupportSearchLogSchema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Outbox of CRM lead-stage events for Meta's Conversions API (Conversion Leads).
 *
 * One row per lead per milestone, created the first time the lead reaches that milestone
 * (leadLifecycleService). `eventId` = `crm-<leadId>-<milestone>` and is unique per institute,
 * so a lead can never produce the same event twice — not on reopen, not on retry.
 * A background job (jobs/metaCrmCron) sends due rows; the CRM never waits on Meta.
 */
export type MetaCrmEventStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface IMetaCrmEvent extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  milestone: string;
  eventName: string;
  eventId: string;
  eventTime: Date;
  status: MetaCrmEventStatus;
  attempts: number;
  nextAttemptAt?: Date;
  sentAt?: Date;
  httpStatus?: number;
  response?: string;
  lastError?: string;
  /** Mode when queued/sent ('test' | 'live'). */
  mode: string;
  testEventCode?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetaCrmEventSchema = new Schema<IMetaCrmEvent>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    milestone: { type: String, required: true },
    eventName: { type: String, required: true, trim: true, maxlength: 100 },
    eventId: { type: String, required: true },
    eventTime: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date },
    sentAt: { type: Date },
    httpStatus: { type: Number },
    response: { type: String, maxlength: 1000 },
    lastError: { type: String, maxlength: 500 },
    mode: { type: String, enum: ['test', 'live'], default: 'test' },
    testEventCode: { type: String },
  },
  { timestamps: true }
);

MetaCrmEventSchema.index({ tenantId: 1, eventId: 1 }, { unique: true });
MetaCrmEventSchema.index({ status: 1, nextAttemptAt: 1 });
MetaCrmEventSchema.index({ tenantId: 1, leadId: 1 });
MetaCrmEventSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

export default mongoose.model<IMetaCrmEvent>('MetaCrmEvent', MetaCrmEventSchema);

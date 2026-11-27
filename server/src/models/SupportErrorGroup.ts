import mongoose, { Schema, Document } from 'mongoose';

/**
 * A group of the same technical problem, seen one or many times: an unhandled exception, a 5xx
 * from one route, a browser error, an AI provider failing, the database dropping.
 *
 * Only a SANITISED summary is kept — enough to recognise the problem and to link it to tickets:
 * a redacted message, the route template (ids replaced), a few request ids. No request bodies,
 * no user data, no stack beyond its top frames.
 */
export const ERROR_KINDS = ['exception', 'server_5xx', 'slow_request', 'client_error', 'client_api', 'ai_failure', 'mongo_connection', 'slow_query'] as const;
export type ErrorKind = typeof ERROR_KINDS[number];
export const SEVERITIES = ['info', 'warning', 'error', 'critical'] as const;
export type Severity = typeof SEVERITIES[number];

export interface ISupportErrorGroup extends Document {
  fingerprint: string;
  kind: ErrorKind;
  severity: Severity;
  /** A manager's override of the configured severity for this one group. */
  severityOverride?: Severity | null;
  title: string;
  message: string;
  /** e.g. GET /api/v1/support/tickets/:id */
  route?: string;
  /** The part of the product (same keys as ticket modules). */
  module: string;
  topFrames: string[];
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  firstRelease?: string;
  lastRelease?: string;
  /** The most recent request ids (capped), which is how a ticket is reliably linked. */
  sampleRequestIds: string[];
  /** Institutes where it happened (capped); used to scope nothing, only to show reach. */
  tenantIds: mongoose.Types.ObjectId[];
  status: 'open' | 'resolved' | 'ignored';
  linkedTicketIds: mongoose.Types.ObjectId[];
  /** When the last alert went out, so one problem does not alert every minute. */
  lastAlertAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupportErrorGroupSchema = new Schema<ISupportErrorGroup>(
  {
    fingerprint: { type: String, required: true, unique: true, maxlength: 128 },
    kind:        { type: String, enum: ERROR_KINDS, required: true },
    severity:    { type: String, enum: SEVERITIES, default: 'error' },
    severityOverride: { type: String, enum: [...SEVERITIES, null], default: null },
    title:       { type: String, required: true, maxlength: 200 },
    message:     { type: String, default: '', maxlength: 1000 },
    route:       { type: String, maxlength: 300 },
    module:      { type: String, default: 'other', maxlength: 40 },
    topFrames:   { type: [{ type: String, maxlength: 300 }], default: [] },
    count:       { type: Number, default: 0, min: 0 },
    firstSeen:   { type: Date, required: true },
    lastSeen:    { type: Date, required: true },
    firstRelease: { type: String, maxlength: 80 },
    lastRelease: { type: String, maxlength: 80 },
    sampleRequestIds: { type: [{ type: String, maxlength: 64 }], default: [] },
    tenantIds:   { type: [{ type: Schema.Types.ObjectId, ref: 'Tenant' }], default: [] },
    status:      { type: String, enum: ['open', 'resolved', 'ignored'], default: 'open' },
    linkedTicketIds: { type: [{ type: Schema.Types.ObjectId, ref: 'SupportTicket' }], default: [] },
    lastAlertAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SupportErrorGroupSchema.index({ status: 1, lastSeen: -1 });
SupportErrorGroupSchema.index({ kind: 1, lastSeen: -1 });
SupportErrorGroupSchema.index({ module: 1, lastSeen: -1 });
SupportErrorGroupSchema.index({ sampleRequestIds: 1 });

export default mongoose.model<ISupportErrorGroup>('SupportErrorGroup', SupportErrorGroupSchema);

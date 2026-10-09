import mongoose, { Schema, Document } from 'mongoose';

/**
 * One phone call made by Outpero's AI employee (Jyothi), as reported by its post-call webhook.
 *
 * Outpero posts a call when it ends and again once it has classified it (summary, outcome and the
 * captured variables "may be null on a call that hasn't classified yet"), so a call is upserted by
 * its id and every delivery is kept raw — the field names are taken from real deliveries, not
 * guessed, and nothing is lost while the mapping is tuned.
 */
export interface IOutperoCall extends Document {
  tenantId: mongoose.Types.ObjectId;
  callId: string;
  leadId?: mongoose.Types.ObjectId | null;
  matchedBy?: 'lms_lead_id' | 'phone' | null;
  phone?: string;
  status?: string;
  outcome?: string;
  summary?: string;
  hangupReason?: string;
  durationSec?: number;
  recordingUrl?: string;
  transcript?: string;
  variables?: Record<string, unknown>;
  startedAt?: Date;
  endedAt?: Date;
  /** Things already done for this call, so a re-delivery never repeats them. */
  actions: string[];
  deliveries: number;
  raw: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const OutperoCallSchema = new Schema<IOutperoCall>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  callId: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null },
  matchedBy: { type: String, default: null },
  phone: String,
  status: String,
  outcome: String,
  summary: String,
  hangupReason: String,
  durationSec: Number,
  recordingUrl: String,
  transcript: String,
  variables: { type: Schema.Types.Mixed, default: {} },
  startedAt: Date,
  endedAt: Date,
  actions: { type: [String], default: [] },
  deliveries: { type: Number, default: 0 },
  // The last few deliveries as received (capped in the service).
  raw: { type: [Schema.Types.Mixed], default: [] },
}, { timestamps: true });

OutperoCallSchema.index({ tenantId: 1, callId: 1 }, { unique: true });
OutperoCallSchema.index({ tenantId: 1, createdAt: -1 });
OutperoCallSchema.index({ tenantId: 1, leadId: 1 });

export default mongoose.model<IOutperoCall>('OutperoCall', OutperoCallSchema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * One phone call made or received on a counsellor's own SIM, as reported by Callyzer (the call
 * tracking app on their phone), and only when the other number is one of our leads — calls to
 * anyone else are never stored (owner decision: personal calls stay out of the CRM).
 *
 * Callyzer reports a call when the phone syncs its call log, and the recording often later, so a
 * call is upserted by Callyzer's id and its lead entry is updated as more arrives.
 */
export interface ICallyzerCall extends Document {
  tenantId: mongoose.Types.ObjectId;
  /** Callyzer's id for the call log row. */
  callyzerId: string;
  leadId: mongoose.Types.ObjectId;
  /** The counsellor, when their Callyzer phone number is matched to a staff user. */
  userId?: mongoose.Types.ObjectId | null;
  empNumber?: string;
  empName?: string;
  clientNumber?: string;
  clientName?: string;
  /** Incoming | Outgoing | Missed | Rejected */
  callType?: string;
  durationSec?: number;
  ringingSec?: number;
  callAt?: Date;
  note?: string;
  crmStatus?: string;
  recordingUrl?: string;
  /** Our own stored copy of the recording (file storage), when one has been made. */
  recordingKey?: string;
  recordingAttempts?: number;
  recordingError?: string;
  /** How often we asked Callyzer again for a recording that had not arrived yet. */
  refreshAttempts?: number;
  /** The lead activity this call is shown as. */
  activityId?: mongoose.Types.ObjectId | null;
  /** 'click' = completed the "Call started" entry from the Call button; 'new' = its own entry. */
  matchedBy?: 'click' | 'new' | null;
  source?: 'webhook' | 'api';
  deliveries: number;
  createdAt: Date;
  updatedAt: Date;
}

const CallyzerCallSchema = new Schema<ICallyzerCall>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  callyzerId: { type: String, required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  empNumber: String,
  empName: String,
  clientNumber: String,
  clientName: String,
  callType: String,
  durationSec: Number,
  ringingSec: Number,
  callAt: Date,
  note: String,
  crmStatus: String,
  recordingUrl: String,
  recordingKey: String,
  recordingAttempts: { type: Number, default: 0 },
  recordingError: String,
  refreshAttempts: { type: Number, default: 0 },
  activityId: { type: Schema.Types.ObjectId, default: null },
  matchedBy: { type: String, default: null },
  source: String,
  deliveries: { type: Number, default: 0 },
}, { timestamps: true });

CallyzerCallSchema.index({ tenantId: 1, callyzerId: 1 }, { unique: true });
CallyzerCallSchema.index({ tenantId: 1, callAt: -1 });
CallyzerCallSchema.index({ tenantId: 1, leadId: 1 });

export default mongoose.model<ICallyzerCall>('CallyzerCall', CallyzerCallSchema);

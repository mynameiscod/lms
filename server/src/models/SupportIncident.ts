import mongoose, { Schema, Document } from 'mongoose';

/**
 * A shared incident: many people reporting the same part of the product at once.
 *
 * Detection only ever produces a POSSIBLE incident — the wording everywhere is "possible shared
 * incident" — until a support manager confirms it. Confirming is what may notify the members
 * whose tickets match; resolving closes it. Detection rules live in SupportConfiguration and
 * are empty (detection off) until the organisation sets them.
 */
export interface ISupportIncident extends Document {
  /** null for an incident seen across institutes by the support HQ. */
  tenantId?: mongoose.Types.ObjectId | null;
  module: string;
  status: 'confirmed' | 'resolved';
  title: string;
  windowStart: Date;
  ticketCount: number;
  peopleCount: number;
  confirmedBy?: mongoose.Types.ObjectId | null;
  confirmedAt?: Date | null;
  resolvedAt?: Date | null;
  notifiedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const SupportIncidentSchema = new Schema<ISupportIncident>(
  {
    tenantId:     { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    module:       { type: String, required: true, maxlength: 40 },
    status:       { type: String, enum: ['confirmed', 'resolved'], default: 'confirmed' },
    title:        { type: String, required: true, trim: true, maxlength: 200 },
    windowStart:  { type: Date, required: true },
    ticketCount:  { type: Number, default: 0, min: 0 },
    peopleCount:  { type: Number, default: 0, min: 0 },
    confirmedBy:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    confirmedAt:  { type: Date, default: null },
    resolvedAt:   { type: Date, default: null },
    notifiedCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

SupportIncidentSchema.index({ status: 1, createdAt: -1 });
SupportIncidentSchema.index({ tenantId: 1, module: 1, status: 1 });

export default mongoose.model<ISupportIncident>('SupportIncident', SupportIncidentSchema);

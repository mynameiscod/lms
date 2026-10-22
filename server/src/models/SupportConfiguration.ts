import mongoose, { Schema, Document } from 'mongoose';

/**
 * The organisation's support settings. EVERY TARGET STARTS EMPTY.
 *
 * Response and resolution targets are commitments to customers, and the code must not make
 * them on the organisation's behalf: until a manager fills them in, the product shows no
 * target, no progress bar and no SLA compliance figure. The same goes for incident rules and
 * retention: empty means the feature is off, not that some default applies.
 *
 * One document per tenant; `tenantId: null` is the support HQ's platform-wide default, which a
 * tenant's own document overrides field by field.
 */
type ByPriority = { low?: number | null; medium?: number | null; high?: number | null; critical?: number | null };

export interface ISupportConfiguration extends Document {
  tenantId?: mongoose.Types.ObjectId | null;
  /** Minutes to first staff reply, per priority. */
  firstResponseMinutes: ByPriority;
  /** Minutes to resolution, per priority. */
  resolutionMinutes: ByPriority;
  reopen: { allowed?: boolean | null; windowDays?: number | null; maxReopens?: number | null };
  /** "Possible shared incident": this many tickets from this many people on one module within the window. */
  incident: { minTickets?: number | null; minDistinctUsers?: number | null; windowMinutes?: number | null };
  retention: { chatDays?: number | null; attachmentDays?: number | null };
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const minutes = { type: Number, min: 1, max: 60 * 24 * 365, default: null };
const byPriority = { low: minutes, medium: minutes, high: minutes, critical: minutes };

const SupportConfigurationSchema = new Schema<ISupportConfiguration>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },
    firstResponseMinutes: { type: byPriority, default: () => ({}), _id: false },
    resolutionMinutes:    { type: byPriority, default: () => ({}), _id: false },
    reopen: {
      type: {
        allowed:    { type: Boolean, default: null },
        windowDays: { type: Number, min: 1, max: 365, default: null },
        maxReopens: { type: Number, min: 0, max: 100, default: null },
      },
      default: () => ({}),
      _id: false,
    },
    incident: {
      type: {
        minTickets:       { type: Number, min: 2, max: 10_000, default: null },
        minDistinctUsers: { type: Number, min: 2, max: 10_000, default: null },
        windowMinutes:    { type: Number, min: 5, max: 60 * 24 * 30, default: null },
      },
      default: () => ({}),
      _id: false,
    },
    retention: {
      type: {
        chatDays:       { type: Number, min: 1, max: 3650, default: null },
        attachmentDays: { type: Number, min: 1, max: 3650, default: null },
      },
      default: () => ({}),
      _id: false,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, minimize: false }
);

// One document per tenant, and exactly one platform default (tenantId null).
SupportConfigurationSchema.index({ tenantId: 1 }, { unique: true });

export default mongoose.model<ISupportConfiguration>('SupportConfiguration', SupportConfigurationSchema);

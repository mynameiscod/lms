import mongoose, { Schema, Document } from 'mongoose';

/**
 * A release of the platform, recorded when a server process starts with a version it has not
 * seen before (services/supportMonitoring.recordRelease). The ticket trend chart draws these as
 * markers, so a spike can be read against what was deployed. There are none until the first
 * start after this ships — the chart shows no markers rather than invented ones.
 */
export interface ISupportRelease extends Document { version: string; deployedAt: Date }

const SupportReleaseSchema = new Schema<ISupportRelease>(
  {
    version:    { type: String, required: true, maxlength: 80 },
    deployedAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false }
);

SupportReleaseSchema.index({ version: 1 }, { unique: true });
SupportReleaseSchema.index({ deployedAt: -1 });

export default mongoose.model<ISupportRelease>('SupportRelease', SupportReleaseSchema);

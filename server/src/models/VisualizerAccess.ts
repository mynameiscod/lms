import mongoose, { Schema, Document } from 'mongoose';

/**
 * Who a tenant has given the Code Visualizer to.
 *
 * Students see the module ONLY when one of these rows reaches them — the default is no
 * access, because it is assigned the way a course is, not switched on for everybody.
 * Staff (admins, instructors) never need a row: they use it to teach.
 *
 * One row per grant, so an admin can see and revoke each one individually:
 *
 *   - `batch`             every student whose User.batchId is `targetId`
 *   - `user`              one account, LMS student or CareerPilot member alike
 *   - `all_lms`           every LMS student in the tenant
 *   - `all_careerpilot`   every CareerPilot member with an active membership
 */
export const VISUALIZER_TARGETS = ['batch', 'user', 'all_lms', 'all_careerpilot'] as const;
export type VisualizerTarget = typeof VISUALIZER_TARGETS[number];

export interface IVisualizerAccess extends Document {
  tenantId: string;
  targetType: VisualizerTarget;
  /** Batch or User id. Absent for the two tenant-wide targets. */
  targetId?: mongoose.Types.ObjectId;
  /** Display name captured at grant time, so the list reads without extra lookups. */
  targetName?: string;
  assignedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisualizerAccessSchema = new Schema<IVisualizerAccess>(
  {
    tenantId:   { type: String, required: true, index: true },
    targetType: { type: String, enum: VISUALIZER_TARGETS, required: true },
    targetId:   { type: Schema.Types.ObjectId },
    targetName: { type: String, default: '' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

/* The same grant twice is meaningless; the unique index makes a double-click harmless. */
VisualizerAccessSchema.index({ tenantId: 1, targetType: 1, targetId: 1 }, { unique: true });

export default mongoose.model<IVisualizerAccess>('VisualizerAccess', VisualizerAccessSchema);

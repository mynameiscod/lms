import mongoose, { Schema, Document } from 'mongoose';

/**
 * Per-user watch log for a live class, accumulated from 100ms peer.join / peer.leave
 * webhook events. Finalised into the main Attendance module when the class ends.
 */
export interface ILiveClassAttendance extends Document {
  tenantId: mongoose.Types.ObjectId;
  liveClassId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role?: string;              // 100ms role at join (broadcaster / viewer / viewer-on-stage)
  firstJoinedAt?: Date;
  lastSeenAt?: Date;
  totalSeconds: number;       // summed across all join/leave cycles
  present: boolean;           // computed at finalise
  finalized: boolean;         // pushed to Attendance module
  createdAt: Date;
  updatedAt: Date;
}

const LiveClassAttendanceSchema = new Schema<ILiveClassAttendance>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    liveClassId: { type: Schema.Types.ObjectId, ref: 'LiveClass', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String },
    firstJoinedAt: { type: Date },
    lastSeenAt: { type: Date },
    totalSeconds: { type: Number, default: 0 },
    present: { type: Boolean, default: false },
    finalized: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LiveClassAttendanceSchema.index({ liveClassId: 1, userId: 1 }, { unique: true });

export default mongoose.model<ILiveClassAttendance>('LiveClassAttendance', LiveClassAttendanceSchema);

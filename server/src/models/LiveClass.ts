import mongoose, { Schema, Document } from 'mongoose';

export type LiveClassMode = 'online' | 'offline' | 'hybrid';
export type LiveClassStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface ILiveClass extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  mode: LiveClassMode;

  // Who teaches
  instructorId: mongoose.Types.ObjectId;
  instructorName: string;

  // Optional links to the rest of the LMS
  batchId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;

  /**
   * Who the class is for. Students of any batch here can see and join it; people invited one by
   * one are in LiveClassInvite. `openToInstitute` lets everyone in the institute in. A class saved
   * before these existed has neither set and keeps its old rule: its one batch, or — with no
   * batch — everyone in the institute (see liveClassAccess).
   */
  batchIds?: mongoose.Types.ObjectId[];
  openToInstitute?: boolean;

  // Schedule
  scheduledAt: Date;
  durationMin: number;

  // 100ms
  hmsRoomId?: string;      // created lazily when the class starts
  hlsUrl?: string;         // set once the broadcaster starts streaming
  status: LiveClassStatus;
  startedAt?: Date;
  endedAt?: Date;
  reminderSent: boolean;   // "starts soon" reminder fired

  // Recording (the host presses Record in the room; the url arrives via webhook)
  recordingReady: boolean;
  recordingUrl?: string;
  recordingContentId?: mongoose.Types.ObjectId; // LearningContentLibrary entry (Class Hub)

  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LiveClassSchema = new Schema<ILiveClass>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online' },

    instructorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    instructorName: { type: String, trim: true },

    batchId: { type: Schema.Types.ObjectId, ref: 'Batch' },
    batchIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], default: undefined },
    openToInstitute: { type: Boolean },
    courseId: { type: Schema.Types.ObjectId, ref: 'Course' },

    scheduledAt: { type: Date, required: true },
    durationMin: { type: Number, default: 60 },

    hmsRoomId: { type: String },
    hlsUrl: { type: String },
    status: { type: String, enum: ['scheduled', 'live', 'ended', 'cancelled'], default: 'scheduled', index: true },
    startedAt: { type: Date },
    endedAt: { type: Date },
    reminderSent: { type: Boolean, default: false },

    recordingReady: { type: Boolean, default: false },
    recordingUrl: { type: String },
    recordingContentId: { type: Schema.Types.ObjectId, ref: 'LearningContentLibrary' },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

LiveClassSchema.index({ tenantId: 1, status: 1, scheduledAt: -1 });
LiveClassSchema.index({ tenantId: 1, batchId: 1 });
LiveClassSchema.index({ tenantId: 1, batchIds: 1 });
LiveClassSchema.index({ hmsRoomId: 1 });

export default mongoose.model<ILiveClass>('LiveClass', LiveClassSchema);

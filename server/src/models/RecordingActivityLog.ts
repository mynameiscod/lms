import mongoose, { Schema, Document } from 'mongoose';

/**
 * End-to-end telemetry for the recording pipeline (class recording + interview
 * video). The actual upload happens browser → Bunny, so the server otherwise has
 * no visibility into where a recording fails. The client posts one event per
 * lifecycle step against a sessionId; this collection stitches them into a
 * timeline + a derived status, so admins can see exactly where it broke.
 */

export interface IRecordingEvent {
  ts: Date;
  type: string;       // session_start, permission_granted, recording_started, recording_stopped, save_clicked, bunny_create_ok, upload_started, upload_progress, upload_success, content_save_ok, *_error, page_unload, discard ...
  message?: string;
  data?: any;
}

export interface IRecordingActivityLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName?: string;
  sessionId: string;
  source: 'class_recording' | 'interview';
  mode?: string;
  status: string;             // derived lifecycle status (started → ... → saved | failed | abandoned)
  startedAt: Date;
  lastEventAt: Date;
  durationSec?: number;
  sizeBytes?: number;
  bunnyVideoId?: string;
  contentId?: string;
  uploadPct?: number;
  error?: string;
  userAgent?: string;
  events: IRecordingEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const RecordingEventSchema = new Schema<IRecordingEvent>({
  ts:      { type: Date, default: Date.now },
  type:    { type: String, required: true },
  message: { type: String },
  data:    { type: Schema.Types.Mixed },
}, { _id: false });

const RecordingActivityLogSchema = new Schema<IRecordingActivityLog>(
  {
    tenantId:  { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName:  { type: String },
    sessionId: { type: String, required: true, unique: true, index: true },
    source:    { type: String, enum: ['class_recording', 'interview'], default: 'class_recording' },
    mode:      { type: String },
    status:    { type: String, default: 'started' },
    startedAt: { type: Date, default: Date.now },
    lastEventAt: { type: Date, default: Date.now },
    durationSec: { type: Number },
    sizeBytes:   { type: Number },
    bunnyVideoId:{ type: String },
    contentId:   { type: String },
    uploadPct:   { type: Number },
    error:       { type: String },
    userAgent:   { type: String },
    events:      { type: [RecordingEventSchema], default: [] },
  },
  { timestamps: true }
);

RecordingActivityLogSchema.index({ tenantId: 1, createdAt: -1 });
RecordingActivityLogSchema.index({ tenantId: 1, source: 1, status: 1 });

export default mongoose.model<IRecordingActivityLog>('RecordingActivityLog', RecordingActivityLogSchema);

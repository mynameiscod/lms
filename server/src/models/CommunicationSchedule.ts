import mongoose, { Schema, Document } from 'mongoose';

// An admin-scheduled communication challenge for a batch on a specific date, with an
// optional availability window (start/end time, IST). When present it overrides the
// daily rotation so a whole batch gets the same challenge, attemptable only in-window.
// Analogous to ScheduledChallenge in the Thinking Lab.
export interface ICommunicationSchedule extends Document {
  tenantId: string;
  batchId: mongoose.Types.ObjectId;
  date: string;                // 'YYYY-MM-DD' (IST)
  challengeId: mongoose.Types.ObjectId;
  startTime?: string;          // 'HH:MM' (IST) — empty = open all day
  endTime?: string;            // 'HH:MM' (IST) — empty = open all day
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationScheduleSchema = new Schema<ICommunicationSchedule>(
  {
    tenantId:    { type: String, required: true, index: true },
    batchId:     { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    date:        { type: String, required: true },
    challengeId: { type: Schema.Types.ObjectId, ref: 'CommunicationChallenge', required: true },
    startTime:   { type: String },
    endTime:     { type: String },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
CommunicationScheduleSchema.index({ tenantId: 1, batchId: 1, date: 1 }, { unique: true });

export default mongoose.model<ICommunicationSchedule>('CommunicationSchedule', CommunicationScheduleSchema);

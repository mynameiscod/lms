import mongoose, { Schema, Document } from 'mongoose';

// Admin-defined recurring speaking-practice task (e.g. "Self Introduction, twice a
// week on Mon & Thu, for Batch X"). Occurrences are computed on the fly from `days`
// within [startDate, endDate] — no cron needed.
export interface ISpeakingTask extends Document {
  tenantId: string;
  title: string;
  prompt: string;                 // the topic to speak on (fallback / single-topic)
  topics: string[];               // if set, rotates one per week
  instructions?: string;
  batchIds: mongoose.Types.ObjectId[];   // empty = all students
  days: string[];                 // e.g. ['Mon','Thu']
  startDate: Date;
  endDate?: Date;
  minSeconds: number;
  maxSeconds: number;
  status: 'active' | 'archived';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SpeakingTaskSchema = new Schema<ISpeakingTask>(
  {
    tenantId:     { type: String, required: true, index: true },
    title:        { type: String, required: true, trim: true },
    prompt:       { type: String, required: true },
    topics:       { type: [String], default: [] },
    instructions: { type: String },
    batchIds:     { type: [{ type: Schema.Types.ObjectId, ref: 'Batch' }], default: [] },
    days:         { type: [String], default: ['Mon', 'Thu'] },   // Mon Tue Wed Thu Fri Sat Sun
    startDate:    { type: Date, default: Date.now },
    endDate:      { type: Date },
    minSeconds:   { type: Number, default: 30 },
    maxSeconds:   { type: Number, default: 120 },
    status:       { type: String, enum: ['active', 'archived'], default: 'active', index: true },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
SpeakingTaskSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ISpeakingTask>('SpeakingTask', SpeakingTaskSchema);

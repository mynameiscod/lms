import mongoose, { Document, Schema } from 'mongoose';

export interface IInterviewCriterion {
  key: string;
  label: string;
}

export interface IScheduledInterview extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  date: Date;
  time: string;          // "14:30"
  duration: number;      // minutes
  interviewerName: string;
  interviewerEmail?: string;
  venue?: string;
  meetLink?: string;
  criteria: IInterviewCriterion[];
  students: mongoose.Types.ObjectId[];
  batchIds: mongoose.Types.ObjectId[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  emailSubject: string;
  emailBody: string;
  emailSent: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CriterionSchema = new Schema<IInterviewCriterion>(
  { key: { type: String, required: true }, label: { type: String, required: true } },
  { _id: false }
);

const ScheduledInterviewSchema = new Schema<IScheduledInterview>(
  {
    tenantId:        { type: Schema.Types.ObjectId, required: true, ref: 'Tenant', index: true },
    title:           { type: String, required: true, trim: true },
    description:     { type: String, default: '' },
    date:            { type: Date, required: true },
    time:            { type: String, required: true },   // "HH:MM"
    duration:        { type: Number, default: 30 },
    interviewerName: { type: String, required: true, trim: true },
    interviewerEmail:{ type: String, trim: true },
    venue:           { type: String, trim: true },
    meetLink:        { type: String, trim: true },
    criteria:        { type: [CriterionSchema], default: [] },
    students:        [{ type: Schema.Types.ObjectId, ref: 'User' }],
    batchIds:        [{ type: Schema.Types.ObjectId, ref: 'Batch' }],
    status:          { type: String, enum: ['scheduled','in_progress','completed','cancelled'], default: 'scheduled' },
    emailSubject:    { type: String, default: '' },
    emailBody:       { type: String, default: '' },
    emailSent:       { type: Boolean, default: false },
    createdBy:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ScheduledInterviewSchema.index({ tenantId: 1, date: -1 });
ScheduledInterviewSchema.index({ tenantId: 1, students: 1 });

export default mongoose.model<IScheduledInterview>('ScheduledInterview', ScheduledInterviewSchema);

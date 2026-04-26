import mongoose, { Document, Schema } from 'mongoose';

export type MeetingType = 'online_demo' | 'trainer_call' | 'campus_visit' | 'payment_discussion';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled';

export interface IMeeting extends Document {
  tenantId: string;
  leadId: mongoose.Types.ObjectId;
  type: MeetingType;
  title: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: MeetingStatus;
  attendees: string[]; // user IDs
  meetingLink?: string;
  location?: string;
  notes?: string;
  sendWhatsApp: boolean;
  sendEmail: boolean;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const MeetingSchema = new Schema<IMeeting>(
  {
    tenantId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    type: {
      type: String,
      enum: ['online_demo', 'trainer_call', 'campus_visit', 'payment_discussion'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60 },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'scheduled',
    },
    attendees: [{ type: String }], // user IDs
    meetingLink: { type: String, trim: true },
    location: { type: String, trim: true },
    notes: { type: String },
    sendWhatsApp: { type: Boolean, default: false },
    sendEmail: { type: Boolean, default: true },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMeeting>('Meeting', MeetingSchema);

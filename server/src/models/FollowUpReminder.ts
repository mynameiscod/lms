import mongoose, { Schema, Document } from 'mongoose';

// ===================== FOLLOW-UP REMINDER MODEL =====================
// Tracks scheduled follow-ups, reminders, and 1-on-1 meetings

export type FollowUpType = 
  | 'call' 
  | 'whatsapp' 
  | 'email' 
  | 'one_on_one' 
  | 'demo' 
  | 'touch_base' 
  | 'payment_reminder'
  | 'custom';

export type FollowUpStatus = 
  | 'scheduled' 
  | 'completed' 
  | 'cancelled' 
  | 'rescheduled' 
  | 'missed'
  | 'pending';

export type FollowUpPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IFollowUpReminder extends Document {
  tenantId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  assignedTo: mongoose.Types.ObjectId;
  
  // Scheduling
  type: FollowUpType;
  title: string;
  description?: string;
  scheduledAt: Date;
  reminderAt?: Date; // Send reminder before scheduled time
  
  // 1-on-1 specific
  meetingLink?: string;
  meetingLocation?: string;
  meetingDuration?: number; // minutes
  
  // Status
  status: FollowUpStatus;
  priority: FollowUpPriority;
  
  // Outcome
  completedAt?: Date;
  outcome?: string;
  notes?: string;
  nextAction?: string;
  
  // Rescheduling
  rescheduledFrom?: Date;
  rescheduledReason?: string;
  rescheduleCount: number;
  
  // Notification
  reminderSent: boolean;
  reminderSentAt?: Date;
  
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FollowUpReminderSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    leadId: {
      type: mongoose.Types.ObjectId,
      ref: 'Lead',
      required: true
    },
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: ['call', 'whatsapp', 'email', 'one_on_one', 'demo', 'touch_base', 'payment_reminder', 'custom'],
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    reminderAt: {
      type: Date
    },
    meetingLink: {
      type: String,
      trim: true
    },
    meetingLocation: {
      type: String,
      trim: true
    },
    meetingDuration: {
      type: Number,
      default: 30
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled', 'missed', 'pending'],
      default: 'scheduled'
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    completedAt: {
      type: Date
    },
    outcome: {
      type: String,
      trim: true
    },
    notes: {
      type: String,
      trim: true
    },
    nextAction: {
      type: String,
      trim: true
    },
    rescheduledFrom: {
      type: Date
    },
    rescheduledReason: {
      type: String,
      trim: true
    },
    rescheduleCount: {
      type: Number,
      default: 0
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    reminderSentAt: {
      type: Date
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Indexes for efficient queries
FollowUpReminderSchema.index({ tenantId: 1, assignedTo: 1, scheduledAt: 1 });
FollowUpReminderSchema.index({ tenantId: 1, leadId: 1 });
FollowUpReminderSchema.index({ tenantId: 1, status: 1, scheduledAt: 1 });
FollowUpReminderSchema.index({ tenantId: 1, reminderAt: 1, reminderSent: 1 });
FollowUpReminderSchema.index({ tenantId: 1, type: 1 });

export default mongoose.model<IFollowUpReminder>('FollowUpReminder', FollowUpReminderSchema);

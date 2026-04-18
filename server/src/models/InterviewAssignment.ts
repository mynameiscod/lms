import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewAssignment extends Document {
  tenantId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;

  // Target
  studentId: mongoose.Types.ObjectId;

  // Push context
  pushReason?: string;                       // e.g. "low_communication_score", "placement_prep", "manual"
  pushNote?: string;

  // Schedule
  availableFrom: Date;
  dueDate?: Date;
  expiresAt?: Date;

  // Attempt tracking
  maxAttempts: number;
  attemptsUsed: number;
  lastAttemptId?: mongoose.Types.ObjectId;
  bestScore?: number;
  latestScore?: number;

  // Status
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

  // Notification tracking
  notifiedOnAssign: boolean;
  notifiedBeforeExpiry: boolean;
  notifiedOnFeedback: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const InterviewAssignmentSchema = new Schema<IInterviewAssignment>(
  {
    tenantId:   { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    templateId: { type: Schema.Types.ObjectId, ref: 'InterviewTemplate', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    pushReason: { type: String },
    pushNote:   { type: String },

    availableFrom: { type: Date, default: Date.now },
    dueDate:       { type: Date },
    expiresAt:     { type: Date },

    maxAttempts:    { type: Number, default: 1 },
    attemptsUsed:   { type: Number, default: 0 },
    lastAttemptId:  { type: Schema.Types.ObjectId, ref: 'InterviewAttempt' },
    bestScore:      { type: Number },
    latestScore:    { type: Number },

    status: {
      type: String,
      enum: ['assigned', 'in_progress', 'completed', 'expired', 'cancelled'],
      default: 'assigned',
    },

    notifiedOnAssign:      { type: Boolean, default: false },
    notifiedBeforeExpiry:  { type: Boolean, default: false },
    notifiedOnFeedback:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Prevent duplicate assignment: same template + student
InterviewAssignmentSchema.index({ tenantId: 1, templateId: 1, studentId: 1 }, { unique: true });
InterviewAssignmentSchema.index({ tenantId: 1, studentId: 1, status: 1 });
InterviewAssignmentSchema.index({ tenantId: 1, assignedBy: 1 });
InterviewAssignmentSchema.index({ tenantId: 1, status: 1, dueDate: 1 });
InterviewAssignmentSchema.index({ expiresAt: 1, status: 1 });

export default mongoose.model<IInterviewAssignment>('InterviewAssignment', InterviewAssignmentSchema);

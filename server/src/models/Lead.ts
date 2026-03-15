import mongoose, { Schema, Document } from 'mongoose';

export type CallOutcome = 'not_answered' | 'not_connected' | 'busy' | 'rejected' | 'connected';
export type InterestConcern = 'only_online' | 'placements' | 'check_with_parents' | 'fee_issue' | 'timing_issue' | 'other';

export interface ILeadActivity {
  type: 'note' | 'call' | 'email' | 'whatsapp' | 'status_change' | 'assignment' | 'created';
  description: string;
  callOutcome?: CallOutcome;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface ILead extends Document {
  name: string;
  email?: string;
  phone: string;
  courseInterest: string[];
  source: string;
  stageId: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  nextFollowUp?: Date;
  notes: string;
  notInterestedReason?: string;
  interestConcerns: string[];
  convertedStudentId?: mongoose.Types.ObjectId;
  activities: ILeadActivity[];
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadActivitySchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'whatsapp', 'status_change', 'assignment', 'created'],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    callOutcome: {
      type: String,
      enum: ['not_answered', 'not_connected', 'busy', 'rejected', 'connected']
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  { _id: true }
);

const LeadSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    courseInterest: [{
      type: String,
      trim: true
    }],
    source: {
      type: String,
      required: true,
      trim: true,
      default: 'other'
    },
    stageId: {
      type: mongoose.Types.ObjectId,
      ref: 'LeadStage',
      required: true
    },
    assignedTo: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    nextFollowUp: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    },
    notInterestedReason: {
      type: String,
      trim: true
    },
    interestConcerns: [{
      type: String,
      enum: ['only_online', 'placements', 'check_with_parents', 'fee_issue', 'timing_issue', 'other']
    }],
    convertedStudentId: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    activities: [LeadActivitySchema],
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

LeadSchema.index({ tenantId: 1, stageId: 1 });
LeadSchema.index({ tenantId: 1, assignedTo: 1 });
LeadSchema.index({ tenantId: 1, nextFollowUp: 1 });
LeadSchema.index({ tenantId: 1, source: 1 });
LeadSchema.index({ tenantId: 1, createdAt: -1 });

export default mongoose.model<ILead>('Lead', LeadSchema);

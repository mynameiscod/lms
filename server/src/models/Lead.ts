import mongoose, { Schema, Document } from 'mongoose';

export type CallOutcome = 'not_answered' | 'not_connected' | 'busy' | 'rejected' | 'connected';
export type CallStatus = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
export type InterestConcern = 'only_online' | 'placements' | 'check_with_parents' | 'fee_issue' | 'timing_issue' | 'other';

export interface IUtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface ILeadActivity {
  type: 'note' | 'call' | 'email' | 'whatsapp' | 'status_change' | 'assignment' | 'created';
  description: string;
  callOutcome?: CallOutcome;
  callStatus?: CallStatus;
  callDuration?: number;  // Duration in seconds
  recordingUrl?: string;
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
  customFields?: Map<string, any>;
  convertedStudentId?: mongoose.Types.ObjectId;
  activities: ILeadActivity[];
  
  // Campaign tracking fields
  campaignId?: mongoose.Types.ObjectId;
  utmParams?: IUtmParams;
  
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
    callStatus: {
      type: String,
      enum: ['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled']
    },
    callDuration: {
      type: Number,
      min: 0
    },
    recordingUrl: {
      type: String,
      trim: true
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
    customFields: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map()
    },
    convertedStudentId: {
      type: mongoose.Types.ObjectId,
      ref: 'User'
    },
    activities: [LeadActivitySchema],
    
    // Campaign tracking
    campaignId: {
      type: mongoose.Types.ObjectId,
      ref: 'AdCampaign'
    },
    utmParams: {
      source: { type: String, trim: true, lowercase: true },
      medium: { type: String, trim: true, lowercase: true },
      campaign: { type: String, trim: true, lowercase: true },
      content: { type: String, trim: true, lowercase: true },
      term: { type: String, trim: true, lowercase: true }
    },
    
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
LeadSchema.index({ tenantId: 1, campaignId: 1 });
LeadSchema.index({ 'utmParams.source': 1, 'utmParams.campaign': 1 });

export default mongoose.model<ILead>('Lead', LeadSchema);

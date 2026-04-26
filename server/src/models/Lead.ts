import mongoose, { Schema, Document } from 'mongoose';

export type CallOutcome = 'not_answered' | 'not_connected' | 'busy' | 'rejected' | 'connected' | 'wrong_number' | 'switched_off';
export type CallStatus = 'scheduled' | 'completed' | 'missed' | 'rescheduled' | 'cancelled';
export type CallSubOutcome = 'interested_follow_up' | 'interested_demo' | 'interested_visit' | 'interested_payment' | 'need_time' | 'not_interested';
export type LeadLanguage = 'english' | 'telugu' | 'hindi';
export type InterestConcern = 'only_online' | 'placements' | 'check_with_parents' | 'fee_issue' | 'timing_issue' | 'other';
export type LeadPriority = 'hot' | 'warm' | 'cold';
export type LeadEligibility = 'eligible' | 'not_eligible' | 'needs_review';
export type WhatsAppStatus = 'not_sent' | 'sent' | 'delivered' | 'read' | 'replied';
export type WhatsAppEngagementStatus = 'not_initiated' | 'initiated' | 'in_progress' | 'completed' | 'no_response';
export type TrainingMode = 'online' | 'offline' | 'hybrid' | 'undecided';
export type LeadUrgency = 'immediate' | 'soon' | 'exploring';
export type LeadAffordability = 'ready' | 'needs_emi' | 'budget_concern' | 'unknown';

export interface IUtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

export interface ISourceDetails {
  platform: 'meta' | 'google' | 'linkedin' | 'website' | 'manual' | 'whatsapp' | 'google_sheet';
  campaignId?: mongoose.Types.ObjectId;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId?: string;
  adName?: string;
  formId?: string;
  landingPage?: string;
  referrerUrl?: string;
}

export interface ICostData {
  costPerLead?: number;
  campaignSpend?: number;
  visible: boolean;
}

export interface IWhatsAppEngagement {
  status: WhatsAppEngagementStatus;
  initiatedAt?: Date;
  lastMessageSentAt?: Date;
  lastReplyAt?: Date;
  questionsAsked: number;
  questionsAnswered: number;
  conversationSummary?: string;
}

export interface IAssignment {
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  previousAssignees?: Array<{
    userId: mongoose.Types.ObjectId;
    from: Date;
    to: Date;
    reason?: string;
  }>;
}

export interface ITelecallerMetrics {
  firstViewedAt?: Date;
  firstActionAt?: Date;
  firstCallAt?: Date;
  totalCalls: number;
  totalActions: number;
  lastActionAt?: Date;
}

export interface IQualificationAnswer {
  questionId: string;
  answer: any;
  answeredBy: mongoose.Types.ObjectId;
  answeredAt: Date;
  skipped: boolean;
}

export interface IQualificationProgress {
  total: number;
  answered: number;
  percentage: number;
}

export interface ILeadInterests {
  courses: string[];
  mode: TrainingMode;
  location: string;
  placement: boolean;
  urgency: LeadUrgency;
  affordability: LeadAffordability;
  demoInterest: boolean;
  campusVisitInterest: boolean;
  technologies: string[];
}

export interface IAISummary {
  generatedAt: Date;
  summary: string;
  keyInsights: string[];
  suggestedNextAction: string;
  seriousnessScore: number;
  conversionProbability: 'high' | 'medium' | 'low';
  generatedBy: string;
}

export interface ILeadActivity {
  type: 'note' | 'call' | 'email' | 'whatsapp' | 'status_change' | 'assignment' | 'created' | 'meeting' | 'content_shared';
  description: string;
  callOutcome?: CallOutcome;
  callSubOutcome?: CallSubOutcome;
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
  
  // NEW: Priority & Scoring
  priority: LeadPriority;
  score: number;
  eligibility: LeadEligibility;
  eligibilityReason?: string;
  
  // NEW: WhatsApp tracking
  whatsappStatus: WhatsAppStatus;
  whatsappReplied?: boolean;
  whatsappRepliedAt?: Date;
  firstResponseTime?: number;
  whatsappEngagement?: IWhatsAppEngagement;
  
  // NEW: Enhanced source tracking
  sourceDetails?: ISourceDetails;
  costData?: ICostData;
  
  // NEW: Assignment tracking
  assignment?: IAssignment;
  
  // NEW: Telecaller metrics
  telecallerMetrics?: ITelecallerMetrics;
  
  // NEW: Qualification
  qualificationAnswers?: Map<string, IQualificationAnswer>;
  qualificationProgress?: IQualificationProgress;
  
  // NEW: Structured interests
  interests?: ILeadInterests;
  
  // NEW: Language preference
  language?: LeadLanguage;

  // NEW: Lost reason
  lostReason?: string;
  lostReasonCategory?: string;
  lostReasonDetail?: string;
  lostAt?: Date;
  reEngagementDate?: Date;
  
  // NEW: Demo booking
  demoBookedAt?: Date;
  demoNotes?: string;
  
  // NEW: Manager approval for stage change
  pendingApproval?: {
    stageId: mongoose.Types.ObjectId;
    stageName: string;
    requestedBy: mongoose.Types.ObjectId;
    requestedAt: Date;
    reason?: string;
  };
  
  // NEW: SLA breach flag
  slaBreach?: boolean;
  slaBreachAt?: Date;

  // P5: Fee & Payment tracking
  feeQuote?: number;
  feeDiscount?: number;
  feeDiscountApproved?: boolean;
  feeDiscountApprovedBy?: mongoose.Types.ObjectId;
  paymentStatus?: 'not_started' | 'deposit_pending' | 'deposit_paid' | 'full_pending' | 'full_paid' | 'refunded';
  paymentNotes?: string;
  depositAmount?: number;
  depositPaidAt?: Date;
  
  // NEW: AI Summary
  aiSummary?: IAISummary;
  
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadActivitySchema: Schema = new Schema(
  {
    type: {
      type: String,
      enum: ['note', 'call', 'email', 'whatsapp', 'status_change', 'assignment', 'created', 'meeting', 'content_shared'],
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
      enum: ['not_answered', 'not_connected', 'busy', 'rejected', 'connected', 'wrong_number', 'switched_off']
    },
    callSubOutcome: {
      type: String,
      enum: ['interested_follow_up', 'interested_demo', 'interested_visit', 'interested_payment', 'need_time', 'not_interested']
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
    
    // NEW: Priority & Scoring
    priority: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
      default: 'cold'
    },
    score: {
      type: Number,
      default: 0
    },
    eligibility: {
      type: String,
      enum: ['eligible', 'not_eligible', 'needs_review'],
      default: 'needs_review'
    },
    eligibilityReason: {
      type: String,
      trim: true
    },
    
    // NEW: WhatsApp tracking
    whatsappStatus: {
      type: String,
      enum: ['not_sent', 'sent', 'delivered', 'read', 'replied'],
      default: 'not_sent'
    },
    whatsappReplied: {
      type: Boolean,
      default: false
    },
    whatsappRepliedAt: {
      type: Date
    },
    firstResponseTime: {
      type: Number  // Minutes from lead creation to first reply
    },
    whatsappEngagement: {
      status: {
        type: String,
        enum: ['not_initiated', 'initiated', 'in_progress', 'completed', 'no_response'],
        default: 'not_initiated'
      },
      initiatedAt: Date,
      lastMessageSentAt: Date,
      lastReplyAt: Date,
      questionsAsked: { type: Number, default: 0 },
      questionsAnswered: { type: Number, default: 0 },
      conversationSummary: { type: String, trim: true }
    },
    
    // NEW: Enhanced source tracking
    sourceDetails: {
      platform: {
        type: String,
        enum: ['meta', 'google', 'linkedin', 'website', 'manual', 'whatsapp', 'google_sheet']
      },
      campaignId: { type: mongoose.Types.ObjectId, ref: 'AdCampaign' },
      campaignName: { type: String, trim: true },
      adSetId: { type: String, trim: true },
      adSetName: { type: String, trim: true },
      adId: { type: String, trim: true },
      adName: { type: String, trim: true },
      formId: { type: String, trim: true },
      landingPage: { type: String, trim: true },
      referrerUrl: { type: String, trim: true }
    },
    
    // NEW: Cost tracking (admin visibility only)
    costData: {
      costPerLead: { type: Number },
      campaignSpend: { type: Number },
      visible: { type: Boolean, default: false }
    },
    
    // NEW: Assignment tracking
    assignment: {
      assignedTo: { type: mongoose.Types.ObjectId, ref: 'User' },
      assignedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
      assignedAt: { type: Date },
      previousAssignees: [{
        userId: { type: mongoose.Types.ObjectId, ref: 'User' },
        from: { type: Date },
        to: { type: Date },
        reason: { type: String, trim: true }
      }]
    },
    
    // NEW: Telecaller metrics
    telecallerMetrics: {
      firstViewedAt: { type: Date },
      firstActionAt: { type: Date },
      firstCallAt: { type: Date },
      totalCalls: { type: Number, default: 0 },
      totalActions: { type: Number, default: 0 },
      lastActionAt: { type: Date }
    },
    
    // NEW: Qualification answers
    qualificationAnswers: {
      type: Map,
      of: {
        questionId: { type: String, required: true },
        answer: { type: Schema.Types.Mixed },
        answeredBy: { type: mongoose.Types.ObjectId, ref: 'User' },
        answeredAt: { type: Date },
        skipped: { type: Boolean, default: false }
      },
      default: new Map()
    },
    qualificationProgress: {
      total: { type: Number, default: 0 },
      answered: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 }
    },
    
    // NEW: Structured interests
    interests: {
      courses: [{ type: String, trim: true }],
      mode: {
        type: String,
        enum: ['online', 'offline', 'hybrid', 'undecided'],
        default: 'undecided'
      },
      location: { type: String, trim: true },
      placement: { type: Boolean, default: false },
      urgency: {
        type: String,
        enum: ['immediate', 'soon', 'exploring'],
        default: 'exploring'
      },
      affordability: {
        type: String,
        enum: ['ready', 'needs_emi', 'budget_concern', 'unknown'],
        default: 'unknown'
      },
      demoInterest: { type: Boolean, default: false },
      campusVisitInterest: { type: Boolean, default: false },
      technologies: [{ type: String, trim: true }]
    },
    
    // NEW: Language preference
    language: {
      type: String,
      enum: ['english', 'telugu', 'hindi'],
      default: 'english'
    },

    // NEW: Lost reason tracking
    lostReason: { type: String, trim: true },
    lostReasonCategory: {
      type: String,
      enum: ['financial', 'competitor', 'timing', 'quality', 'other']
    },
    lostReasonDetail: { type: String, trim: true },
    lostAt: { type: Date },
    reEngagementDate: { type: Date },
    
    // NEW: Demo booking
    demoBookedAt: { type: Date },
    demoNotes: { type: String, trim: true },
    
    // NEW: Manager approval pending
    pendingApproval: {
      stageId: { type: mongoose.Types.ObjectId, ref: 'LeadStage' },
      stageName: { type: String },
      requestedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date },
      reason: { type: String, trim: true },
    },
    
    // NEW: SLA breach
    slaBreach: { type: Boolean, default: false },
    slaBreachAt: { type: Date },

    // P5: Fee & Payment tracking
    feeQuote: { type: Number },
    feeDiscount: { type: Number, default: 0 },
    feeDiscountApproved: { type: Boolean, default: false },
    feeDiscountApprovedBy: { type: mongoose.Types.ObjectId, ref: 'User' },
    paymentStatus: {
      type: String,
      enum: ['not_started', 'deposit_pending', 'deposit_paid', 'full_pending', 'full_paid', 'refunded'],
      default: 'not_started',
    },
    paymentNotes: { type: String, trim: true },
    depositAmount: { type: Number },
    depositPaidAt: { type: Date },
    
    // NEW: AI Summary
    aiSummary: {
      generatedAt: { type: Date },
      summary: { type: String, trim: true },
      keyInsights: [{ type: String, trim: true }],
      suggestedNextAction: { type: String, trim: true },
      seriousnessScore: { type: Number, min: 1, max: 10 },
      conversionProbability: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      generatedBy: { type: String, trim: true }
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
// NEW: Additional indexes for performance
LeadSchema.index({ tenantId: 1, priority: 1 });
LeadSchema.index({ tenantId: 1, score: -1 });
LeadSchema.index({ tenantId: 1, whatsappStatus: 1 });
LeadSchema.index({ tenantId: 1, 'assignment.assignedTo': 1 });
LeadSchema.index({ tenantId: 1, 'telecallerMetrics.lastActionAt': -1 });

export default mongoose.model<ILead>('Lead', LeadSchema);

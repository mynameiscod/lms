import mongoose, { Schema, Document } from 'mongoose';

export type PriorityLevel = 'hot' | 'warm' | 'cold';
export type RuleOperator = 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 
                           'greaterThanOrEqual' | 'lessThanOrEqual' | 'in' | 'notIn' | 
                           'exists' | 'notExists' | 'between';

export interface ILeadPriorityRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  order: number;
  
  // Condition
  condition: {
    field: string;
    operator: RuleOperator;
    value: any;
    secondValue?: any;  // For 'between' operator
  };
  
  // Score impact
  scoreImpact: number;  // Can be positive or negative
  
  // Priority override (optional)
  setPriority?: PriorityLevel;
  
  // Category for grouping in UI
  category?: 'engagement' | 'location' | 'interest' | 'source' | 'urgency' | 'custom';
}

export interface IEligibilityRule {
  id: string;
  name: string;
  enabled: boolean;
  order: number;
  
  condition: {
    field: string;
    operator: RuleOperator;
    value: any;
  };
  
  result: 'eligible' | 'not_eligible' | 'needs_review';
  reason: string;
}

export interface IPriorityThresholds {
  hot: number;      // Score >= this = HOT
  warm: number;     // Score >= this = WARM
  // Below warm = COLD
}

export interface ILeadPriorityConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  // Priority calculation rules
  rules: ILeadPriorityRule[];
  
  // Score thresholds
  thresholds: IPriorityThresholds;
  
  // Eligibility rules
  eligibilityRules: IEligibilityRule[];
  
  // Auto-recalculation settings
  settings?: {
    autoRecalculate: boolean;
    recalculateOnStageChange: boolean;
    recalculateOnWhatsAppReply: boolean;
    recalculateOnCall: boolean;
  };
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PriorityRuleSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    
    condition: {
      field: { type: String, required: true, trim: true },
      operator: {
        type: String,
        enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 
               'greaterThanOrEqual', 'lessThanOrEqual', 'in', 'notIn', 
               'exists', 'notExists', 'between'],
        required: true
      },
      value: { type: Schema.Types.Mixed },
      secondValue: { type: Schema.Types.Mixed }
    },
    
    scoreImpact: { type: Number, required: true },
    setPriority: {
      type: String,
      enum: ['hot', 'warm', 'cold']
    },
    category: {
      type: String,
      enum: ['engagement', 'location', 'interest', 'source', 'urgency', 'custom'],
      default: 'custom'
    }
  },
  { _id: false }
);

const EligibilityRuleSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    
    condition: {
      field: { type: String, required: true, trim: true },
      operator: {
        type: String,
        enum: ['equals', 'notEquals', 'contains', 'greaterThan', 'lessThan', 
               'greaterThanOrEqual', 'lessThanOrEqual', 'in', 'notIn', 
               'exists', 'notExists', 'between'],
        required: true
      },
      value: { type: Schema.Types.Mixed }
    },
    
    result: {
      type: String,
      enum: ['eligible', 'not_eligible', 'needs_review'],
      required: true
    },
    reason: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const LeadPriorityConfigSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true
    },
    
    rules: [PriorityRuleSchema],
    
    thresholds: {
      hot: { type: Number, default: 60 },
      warm: { type: Number, default: 30 }
    },
    
    eligibilityRules: [EligibilityRuleSchema],
    
    settings: {
      autoRecalculate: { type: Boolean, default: true },
      recalculateOnStageChange: { type: Boolean, default: true },
      recalculateOnWhatsAppReply: { type: Boolean, default: true },
      recalculateOnCall: { type: Boolean, default: true }
    },
    
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Default scoring rules
export const DEFAULT_PRIORITY_RULES: ILeadPriorityRule[] = [
  // Engagement-based
  {
    id: 'whatsapp_replied',
    name: 'WhatsApp Replied',
    description: 'Lead replied to WhatsApp message',
    enabled: true,
    order: 1,
    condition: { field: 'whatsappStatus', operator: 'equals', value: 'replied' },
    scoreImpact: 30,
    setPriority: 'hot',  // Auto-mark as HOT when WhatsApp replied
    category: 'engagement'
  },
  {
    id: 'quick_response',
    name: 'Quick Response (< 30 min)',
    description: 'Lead responded within 30 minutes',
    enabled: true,
    order: 2,
    condition: { field: 'firstResponseTime', operator: 'lessThan', value: 30 },
    scoreImpact: 20,
    category: 'engagement'
  },
  {
    id: 'no_wa_reply_24h',
    name: 'No WhatsApp Reply (24h)',
    description: 'No reply to WhatsApp after 24 hours',
    enabled: true,
    order: 3,
    condition: { field: 'noReplyHours', operator: 'greaterThan', value: 24 },
    scoreImpact: -15,
    category: 'engagement'
  },
  
  // Location-based
  {
    id: 'local_city',
    name: 'Local City',
    description: 'Lead is from local city',
    enabled: true,
    order: 10,
    condition: { field: 'city', operator: 'in', value: ['Hyderabad', 'Secunderabad'] },
    scoreImpact: 15,
    category: 'location'
  },
  
  // Interest-based
  {
    id: 'classroom_interest',
    name: 'Classroom Interest',
    description: 'Interested in classroom training',
    enabled: true,
    order: 20,
    condition: { field: 'preferenceMode', operator: 'equals', value: 'Classroom Only' },
    scoreImpact: 10,
    category: 'interest'
  },
  {
    id: 'high_budget',
    name: 'High Budget',
    description: 'Budget range is high',
    enabled: true,
    order: 21,
    condition: { field: 'budget', operator: 'in', value: ['50k-75k', '75k+'] },
    scoreImpact: 15,
    category: 'interest'
  },
  {
    id: 'low_budget',
    name: 'Low Budget',
    description: 'Budget concern indicated',
    enabled: true,
    order: 22,
    condition: { field: 'budget', operator: 'equals', value: 'Below 25k' },
    scoreImpact: -10,
    category: 'interest'
  },
  
  // Source-based
  {
    id: 'walkin_lead',
    name: 'Walk-in Lead',
    description: 'Lead came via walk-in',
    enabled: true,
    order: 30,
    condition: { field: 'source', operator: 'equals', value: 'walkin' },
    scoreImpact: 25,
    category: 'source'
  },
  {
    id: 'referral_lead',
    name: 'Referral Lead',
    description: 'Lead came via referral',
    enabled: true,
    order: 31,
    condition: { field: 'source', operator: 'equals', value: 'referral' },
    scoreImpact: 20,
    category: 'source'
  },
  {
    id: 'ad_lead',
    name: 'Ad Lead',
    description: 'Lead from advertising',
    enabled: true,
    order: 32,
    condition: { field: 'source', operator: 'in', value: ['google_ads', 'meta', 'linkedin'] },
    scoreImpact: 5,
    category: 'source'
  },
  
  // Urgency-based
  {
    id: 'ready_immediately',
    name: 'Ready to Join Immediately',
    description: 'Lead wants to start immediately',
    enabled: true,
    order: 40,
    condition: { field: 'timeline', operator: 'equals', value: 'Immediately' },
    scoreImpact: 25,
    category: 'urgency'
  },
  {
    id: 'within_month',
    name: 'Within 1 Month',
    description: 'Planning to join within a month',
    enabled: true,
    order: 41,
    condition: { field: 'timeline', operator: 'equals', value: 'Within 1 month' },
    scoreImpact: 15,
    category: 'urgency'
  },
  {
    id: 'just_exploring',
    name: 'Just Exploring',
    description: 'Lead is just exploring options',
    enabled: true,
    order: 42,
    condition: { field: 'timeline', operator: 'equals', value: 'Just exploring' },
    scoreImpact: -10,
    category: 'urgency'
  }
];

export const DEFAULT_THRESHOLDS: IPriorityThresholds = {
  hot: 60,
  warm: 30
};

export default mongoose.model<ILeadPriorityConfig>('LeadPriorityConfig', LeadPriorityConfigSchema);

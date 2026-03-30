import mongoose, { Schema, Document } from 'mongoose';

export type LostReasonCategory = 'financial' | 'competitor' | 'timing' | 'quality' | 'contact' | 'other';

export interface ILostReason {
  id: string;
  label: string;
  category: LostReasonCategory;
  requiresDetail: boolean;  // If true, user must provide additional detail
  order: number;
  enabled: boolean;
  
  // Re-engagement settings
  allowReEngagement: boolean;
  suggestedReEngagementDays?: number;  // Suggest re-engagement after N days
  
  // Auto-actions
  autoActions?: {
    sendFeedbackEmail?: boolean;
    notifyManager?: boolean;
    addToReEngagementList?: boolean;
  };
}

export interface ILostReasonConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  
  reasons: ILostReason[];
  
  // Settings
  settings?: {
    requireReasonForLost: boolean;
    requireDetailForSelected: boolean;
    enableReEngagementReminders: boolean;
    defaultReEngagementDays: number;
  };
  
  // Re-engagement email template
  reEngagementEmailTemplate?: string;
  
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LostReasonSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['financial', 'competitor', 'timing', 'quality', 'contact', 'other'],
      required: true
    },
    requiresDetail: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    enabled: { type: Boolean, default: true },
    
    allowReEngagement: { type: Boolean, default: true },
    suggestedReEngagementDays: { type: Number },
    
    autoActions: {
      sendFeedbackEmail: { type: Boolean, default: false },
      notifyManager: { type: Boolean, default: false },
      addToReEngagementList: { type: Boolean, default: true }
    }
  },
  { _id: false }
);

const LostReasonConfigSchema: Schema = new Schema(
  {
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      unique: true
    },
    
    reasons: [LostReasonSchema],
    
    settings: {
      requireReasonForLost: { type: Boolean, default: true },
      requireDetailForSelected: { type: Boolean, default: true },
      enableReEngagementReminders: { type: Boolean, default: true },
      defaultReEngagementDays: { type: Number, default: 90 }
    },
    
    reEngagementEmailTemplate: { type: String, trim: true },
    
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

// Default lost reasons
export const DEFAULT_LOST_REASONS: ILostReason[] = [
  // Financial
  {
    id: 'fee_too_high',
    label: 'Fee too high',
    category: 'financial',
    requiresDetail: false,
    order: 1,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 60,
    autoActions: { addToReEngagementList: true }
  },
  {
    id: 'emi_not_eligible',
    label: 'Needs EMI but not eligible',
    category: 'financial',
    requiresDetail: false,
    order: 2,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 90
  },
  {
    id: 'cannot_afford',
    label: 'Cannot afford at this time',
    category: 'financial',
    requiresDetail: false,
    order: 3,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 90
  },
  
  // Competitor
  {
    id: 'joined_competitor',
    label: 'Joined competitor institute',
    category: 'competitor',
    requiresDetail: true,
    order: 10,
    enabled: true,
    allowReEngagement: false,
    autoActions: { notifyManager: true }
  },
  {
    id: 'free_alternative',
    label: 'Found free alternative (YouTube, etc.)',
    category: 'competitor',
    requiresDetail: false,
    order: 11,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 120
  },
  {
    id: 'college_program',
    label: 'Opted for college/university program',
    category: 'competitor',
    requiresDetail: false,
    order: 12,
    enabled: true,
    allowReEngagement: false
  },
  
  // Timing
  {
    id: 'not_ready_now',
    label: 'Not ready now - will consider later',
    category: 'timing',
    requiresDetail: false,
    order: 20,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 60,
    autoActions: { addToReEngagementList: true }
  },
  {
    id: 'job_conflict',
    label: 'Job conflict - no time',
    category: 'timing',
    requiresDetail: false,
    order: 21,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 90
  },
  {
    id: 'personal_issues',
    label: 'Personal/family issues',
    category: 'timing',
    requiresDetail: false,
    order: 22,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 90
  },
  {
    id: 'batch_timing',
    label: 'Batch timing not suitable',
    category: 'timing',
    requiresDetail: false,
    order: 23,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 30
  },
  
  // Quality
  {
    id: 'course_not_relevant',
    label: 'Course not relevant to their needs',
    category: 'quality',
    requiresDetail: true,
    order: 30,
    enabled: true,
    allowReEngagement: false
  },
  {
    id: 'location_issue',
    label: 'Location not suitable',
    category: 'quality',
    requiresDetail: false,
    order: 31,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 180
  },
  {
    id: 'mode_issue',
    label: 'Training mode not available (online/offline)',
    category: 'quality',
    requiresDetail: false,
    order: 32,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 60
  },
  {
    id: 'placement_concern',
    label: 'Placement guarantee concern',
    category: 'quality',
    requiresDetail: true,
    order: 33,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 30,
    autoActions: { notifyManager: true }
  },
  
  // Contact
  {
    id: 'wrong_number',
    label: 'Wrong number / invalid contact',
    category: 'contact',
    requiresDetail: false,
    order: 40,
    enabled: true,
    allowReEngagement: false
  },
  {
    id: 'not_reachable',
    label: 'Not reachable (switched off, out of service)',
    category: 'contact',
    requiresDetail: false,
    order: 41,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 30
  },
  {
    id: 'no_response',
    label: 'No response after multiple attempts',
    category: 'contact',
    requiresDetail: false,
    order: 42,
    enabled: true,
    allowReEngagement: true,
    suggestedReEngagementDays: 60
  },
  {
    id: 'blocked',
    label: 'Blocked our number / marked spam',
    category: 'contact',
    requiresDetail: false,
    order: 43,
    enabled: true,
    allowReEngagement: false
  },
  
  // Other
  {
    id: 'duplicate_lead',
    label: 'Duplicate lead',
    category: 'other',
    requiresDetail: false,
    order: 50,
    enabled: true,
    allowReEngagement: false
  },
  {
    id: 'test_lead',
    label: 'Test/fake lead',
    category: 'other',
    requiresDetail: false,
    order: 51,
    enabled: true,
    allowReEngagement: false
  },
  {
    id: 'other',
    label: 'Other reason',
    category: 'other',
    requiresDetail: true,
    order: 99,
    enabled: true,
    allowReEngagement: true
  }
];

// Category labels for UI
export const LOST_REASON_CATEGORIES = [
  { key: 'financial', label: 'Financial', icon: '💰' },
  { key: 'competitor', label: 'Competition', icon: '🏢' },
  { key: 'timing', label: 'Timing', icon: '⏰' },
  { key: 'quality', label: 'Quality/Fit', icon: '🎯' },
  { key: 'contact', label: 'Contact Issues', icon: '📞' },
  { key: 'other', label: 'Other', icon: '📝' }
];

export default mongoose.model<ILostReasonConfig>('LostReasonConfig', LostReasonConfigSchema);

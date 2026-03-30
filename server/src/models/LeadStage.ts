import mongoose, { Schema, Document } from 'mongoose';

export type StageCategory = 'new' | 'engaging' | 'qualified' | 'negotiation' | 'converted' | 'lost';
export type UrgencyLevel = 'low' | 'medium' | 'high';

export interface IStageTriggers {
  onEnter?: {
    sendWhatsApp?: boolean;
    whatsAppTemplateId?: string;
    sendEmail?: boolean;
    emailTemplateId?: string;
    assignToRole?: string;
    setFollowUp?: number;  // Days to set follow-up
    notifyManager?: boolean;
  };
  onExit?: {
    recordDuration?: boolean;
    notifyManager?: boolean;
  };
}

export interface IStageSLA {
  maxDurationHours?: number;
  urgencyLevel?: UrgencyLevel;
  alertAfterHours?: number;
  escalateAfterHours?: number;
}

export interface ILeadStage extends Document {
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
  isActive: boolean;
  tenantId: mongoose.Types.ObjectId;
  
  // NEW: Enhanced stage properties
  description?: string;
  category: StageCategory;
  
  // NEW: Stage movement rules
  allowedNextStages: mongoose.Types.ObjectId[];
  allowedPreviousStages: mongoose.Types.ObjectId[];
  allowedRoles: string[];  // Which roles can move leads to this stage
  
  // NEW: Required actions before stage change
  requiredFields?: string[];
  requiresNote?: boolean;
  requiresReason?: boolean;  // For lost stages
  
  // NEW: Automation triggers
  triggers?: IStageTriggers;
  
  // NEW: SLA configuration
  sla?: IStageSLA;
  
  // NEW: Visual & Behavior
  icon?: string;  // Icon identifier
  isFinal?: boolean;  // No further movement allowed
  isLostStage?: boolean;  // Marks as a lost stage
  showInKanban?: boolean;
  showInTable?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

const LeadStageSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    color: {
      type: String,
      required: true,
      default: '#005897'
    },
    order: {
      type: Number,
      required: true,
      default: 0
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tenantId: {
      type: mongoose.Types.ObjectId,
      ref: 'Tenant',
      required: true
    },
    
    // NEW: Enhanced stage properties
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['new', 'engaging', 'qualified', 'negotiation', 'converted', 'lost'],
      default: 'new'
    },
    
    // NEW: Stage movement rules
    allowedNextStages: [{
      type: mongoose.Types.ObjectId,
      ref: 'LeadStage'
    }],
    allowedPreviousStages: [{
      type: mongoose.Types.ObjectId,
      ref: 'LeadStage'
    }],
    allowedRoles: [{
      type: String,
      trim: true
    }],
    
    // NEW: Required actions
    requiredFields: [{
      type: String,
      trim: true
    }],
    requiresNote: {
      type: Boolean,
      default: false
    },
    requiresReason: {
      type: Boolean,
      default: false
    },
    
    // NEW: Automation triggers
    triggers: {
      onEnter: {
        sendWhatsApp: { type: Boolean, default: false },
        whatsAppTemplateId: { type: String, trim: true },
        sendEmail: { type: Boolean, default: false },
        emailTemplateId: { type: String, trim: true },
        assignToRole: { type: String, trim: true },
        setFollowUp: { type: Number },
        notifyManager: { type: Boolean, default: false }
      },
      onExit: {
        recordDuration: { type: Boolean, default: true },
        notifyManager: { type: Boolean, default: false }
      }
    },
    
    // NEW: SLA configuration
    sla: {
      maxDurationHours: { type: Number },
      urgencyLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      alertAfterHours: { type: Number },
      escalateAfterHours: { type: Number }
    },
    
    // NEW: Visual & Behavior
    icon: {
      type: String,
      trim: true
    },
    isFinal: {
      type: Boolean,
      default: false
    },
    isLostStage: {
      type: Boolean,
      default: false
    },
    showInKanban: {
      type: Boolean,
      default: true
    },
    showInTable: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

LeadStageSchema.index({ tenantId: 1, order: 1 });
LeadStageSchema.index({ tenantId: 1, name: 1 }, { unique: true });
LeadStageSchema.index({ tenantId: 1, category: 1 });
LeadStageSchema.index({ tenantId: 1, isLostStage: 1 });

// Default stages to seed for new tenants
export const DEFAULT_STAGES: Partial<ILeadStage>[] = [
  // NEW category
  { name: 'New Lead', color: '#3B82F6', order: 0, category: 'new', isDefault: true },
  { name: 'Auto WhatsApp Sent', color: '#60A5FA', order: 1, category: 'new' },
  { name: 'WhatsApp Replied', color: '#10B981', order: 2, category: 'new' },
  
  // ENGAGING category
  { name: 'Priority Evaluated', color: '#8B5CF6', order: 3, category: 'engaging' },
  { name: 'Assigned', color: '#F59E0B', order: 4, category: 'engaging' },
  { name: 'First Call Pending', color: '#F97316', order: 5, category: 'engaging' },
  { name: 'First Call Attempted', color: '#FB923C', order: 6, category: 'engaging' },
  { name: 'Connected', color: '#22C55E', order: 7, category: 'engaging' },
  
  // QUALIFIED category
  { name: 'Qualified', color: '#06B6D4', order: 8, category: 'qualified', requiresNote: true },
  { name: 'Follow-up Scheduled', color: '#14B8A6', order: 9, category: 'qualified' },
  { name: 'Online Meeting Set', color: '#0EA5E9', order: 10, category: 'qualified' },
  { name: 'Campus Visit Set', color: '#6366F1', order: 11, category: 'qualified' },
  { name: 'Demo Completed', color: '#8B5CF6', order: 12, category: 'qualified' },
  
  // NEGOTIATION category
  { name: 'Payment Link Sent', color: '#EAB308', order: 13, category: 'negotiation' },
  { name: 'Seat Reserved', color: '#84CC16', order: 14, category: 'negotiation' },
  { name: 'Demo Student', color: '#22C55E', order: 15, category: 'negotiation' },
  
  // CONVERTED category
  { name: 'Enrolled Student', color: '#059669', order: 16, category: 'converted', isFinal: true },
  
  // LOST category
  { name: 'No Response', color: '#6B7280', order: 17, category: 'lost', isLostStage: true, requiresReason: true },
  { name: 'Not Interested', color: '#EF4444', order: 18, category: 'lost', isLostStage: true, requiresReason: true },
  { name: 'Lost to Competitor', color: '#DC2626', order: 19, category: 'lost', isLostStage: true, requiresReason: true },
  { name: 'Wrong Number', color: '#9CA3AF', order: 20, category: 'lost', isLostStage: true }
];

export default mongoose.model<ILeadStage>('LeadStage', LeadStageSchema);

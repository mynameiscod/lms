import mongoose, { Schema, Document } from 'mongoose';

export type CampaignPlatform = 'Facebook' | 'Instagram' | 'Google' | 'LinkedIn' | 'YouTube' | 'WhatsApp' | 'Twitter' | 'Other';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';
export type CampaignObjective = 'awareness' | 'traffic' | 'leads' | 'conversions' | 'engagement';

export interface ICampaignMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  conversions: number;
  cpl: number;           // Cost Per Lead
  cpc: number;           // Cost Per Click
  ctr: number;           // Click Through Rate (%)
  conversionRate: number; // Leads to Conversions (%)
}

export interface IAdCampaign extends Document {
  name: string;
  description?: string;
  platform: CampaignPlatform;
  status: CampaignStatus;
  objective: CampaignObjective;
  budget: number;
  spend: number;
  startDate: Date;
  endDate?: Date;
  
  // UTM Parameters for lead tracking
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  
  // Targeting info
  targetAudience?: string;
  targetLocations?: string[];
  ageRange?: { min: number; max: number };
  
  // Metrics (updated manually or via webhook)
  metrics: ICampaignMetrics;
  
  // Links
  landingPageUrl?: string;
  adAccountId?: string;
  externalCampaignId?: string;
  
  // Notes
  notes?: string;
  
  // Multi-tenant
  tenantId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CampaignMetricsSchema: Schema = new Schema(
  {
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    cpl: { type: Number, default: 0 },
    cpc: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 }
  },
  { _id: false }
);

const AdCampaignSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    platform: {
      type: String,
      required: true,
      enum: ['Facebook', 'Instagram', 'Google', 'LinkedIn', 'YouTube', 'WhatsApp', 'Twitter', 'Other']
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'active', 'paused', 'completed', 'archived'],
      default: 'draft'
    },
    objective: {
      type: String,
      required: true,
      enum: ['awareness', 'traffic', 'leads', 'conversions', 'engagement'],
      default: 'leads'
    },
    budget: {
      type: Number,
      required: true,
      min: 0
    },
    spend: {
      type: Number,
      default: 0,
      min: 0
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date
    },
    
    // UTM Parameters
    utmSource: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    utmMedium: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    utmCampaign: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    utmContent: {
      type: String,
      trim: true,
      lowercase: true
    },
    utmTerm: {
      type: String,
      trim: true,
      lowercase: true
    },
    
    // Targeting
    targetAudience: {
      type: String,
      trim: true
    },
    targetLocations: [{
      type: String,
      trim: true
    }],
    ageRange: {
      min: { type: Number, min: 13 },
      max: { type: Number, max: 100 }
    },
    
    // Metrics
    metrics: {
      type: CampaignMetricsSchema,
      default: () => ({
        impressions: 0,
        reach: 0,
        clicks: 0,
        leads: 0,
        conversions: 0,
        cpl: 0,
        cpc: 0,
        ctr: 0,
        conversionRate: 0
      })
    },
    
    // Links
    landingPageUrl: {
      type: String,
      trim: true
    },
    adAccountId: {
      type: String,
      trim: true
    },
    externalCampaignId: {
      type: String,
      trim: true
    },
    
    notes: {
      type: String,
      trim: true
    },
    
    // Multi-tenant
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

// Indexes
AdCampaignSchema.index({ tenantId: 1, status: 1 });
AdCampaignSchema.index({ tenantId: 1, platform: 1 });
AdCampaignSchema.index({ tenantId: 1, createdAt: -1 });
AdCampaignSchema.index({ tenantId: 1, utmCampaign: 1 });
AdCampaignSchema.index({ utmSource: 1, utmMedium: 1, utmCampaign: 1 }); // For lead attribution

// Virtual: ROI calculation
AdCampaignSchema.virtual('roi').get(function() {
  if (!this.spend || this.spend === 0) return 0;
  // Assuming average lead value - can be customized
  const estimatedLeadValue = 5000; // INR per lead
  const revenue = this.metrics.conversions * estimatedLeadValue;
  return ((revenue - this.spend) / this.spend) * 100;
});

// Virtual: Budget utilization
AdCampaignSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget || this.budget === 0) return 0;
  return (this.spend / this.budget) * 100;
});

// Pre-save: Calculate derived metrics
AdCampaignSchema.pre('save', function(next) {
  // Calculate CPL
  if (this.metrics.leads > 0) {
    this.metrics.cpl = Math.round((this.spend / this.metrics.leads) * 100) / 100;
  }
  
  // Calculate CPC
  if (this.metrics.clicks > 0) {
    this.metrics.cpc = Math.round((this.spend / this.metrics.clicks) * 100) / 100;
  }
  
  // Calculate CTR
  if (this.metrics.impressions > 0) {
    this.metrics.ctr = Math.round((this.metrics.clicks / this.metrics.impressions) * 10000) / 100;
  }
  
  // Calculate Conversion Rate
  if (this.metrics.leads > 0) {
    this.metrics.conversionRate = Math.round((this.metrics.conversions / this.metrics.leads) * 10000) / 100;
  }
  
  next();
});

AdCampaignSchema.set('toJSON', { virtuals: true });
AdCampaignSchema.set('toObject', { virtuals: true });

export default mongoose.model<IAdCampaign>('AdCampaign', AdCampaignSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetitorAd extends Document {
  tenantId: mongoose.Types.ObjectId;
  competitorId: mongoose.Types.ObjectId;
  platform: string;
  headline: string;
  primaryText: string;
  cta: string;
  landingPageUrl: string;
  mediaUrl: string;
  notes: string;
  isAnalyzed: boolean;
  analyzedAt: Date | null;
  capturedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorAdSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    competitorId: { type: mongoose.Types.ObjectId, ref: 'Competitor', required: true },
    platform: { type: String, required: true, enum: ['Facebook', 'Instagram', 'LinkedIn', 'Google Ads', 'YouTube', 'Twitter', 'WhatsApp', 'Other'] },
    headline: { type: String, required: true, trim: true },
    primaryText: { type: String, default: '' },
    cta: { type: String, default: '' },
    landingPageUrl: { type: String, default: '' },
    mediaUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    isAnalyzed: { type: Boolean, default: false },
    analyzedAt: { type: Date, default: null },
    capturedBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CompetitorAdSchema.index({ tenantId: 1, competitorId: 1 });
CompetitorAdSchema.index({ tenantId: 1, isAnalyzed: 1 });

export default mongoose.model<ICompetitorAd>('CompetitorAd', CompetitorAdSchema);

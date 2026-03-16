import mongoose, { Document, Schema } from 'mongoose';

export interface IGeneratedContent {
  type: 'instagram_reel' | 'ad_copy' | 'linkedin_post' | 'whatsapp_message';
  content: string;
  generatedAt: Date;
}

export interface IAdInsight extends Document {
  tenantId: mongoose.Types.ObjectId;
  adId: mongoose.Types.ObjectId;
  competitorId: mongoose.Types.ObjectId;
  hookType: string;
  painPoint: string;
  targetAudience: string;
  emotionalTrigger: string;
  offerType: string;
  ctaType: string;
  tone: string;
  strengths: string[];
  weaknesses: string[];
  suggestedPositioning: string;
  generatedContent: IGeneratedContent[];
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedContentSchema: Schema = new Schema(
  {
    type: { type: String, enum: ['instagram_reel', 'ad_copy', 'linkedin_post', 'whatsapp_message'], required: true },
    content: { type: String, required: true },
    generatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const AdInsightSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    adId: { type: mongoose.Types.ObjectId, ref: 'CompetitorAd', required: true },
    competitorId: { type: mongoose.Types.ObjectId, ref: 'Competitor', required: true },
    hookType: { type: String, default: '' },
    painPoint: { type: String, default: '' },
    targetAudience: { type: String, default: '' },
    emotionalTrigger: { type: String, default: '' },
    offerType: { type: String, default: '' },
    ctaType: { type: String, default: '' },
    tone: { type: String, default: '' },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
    suggestedPositioning: { type: String, default: '' },
    generatedContent: [GeneratedContentSchema],
  },
  { timestamps: true }
);

AdInsightSchema.index({ tenantId: 1, competitorId: 1 });
AdInsightSchema.index({ tenantId: 1, adId: 1 }, { unique: true });

export default mongoose.model<IAdInsight>('AdInsight', AdInsightSchema);

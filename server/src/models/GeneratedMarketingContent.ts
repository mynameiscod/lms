import mongoose, { Document, Schema } from 'mongoose';

export interface IGeneratedMarketingContent extends Document {
  tenantId: mongoose.Types.ObjectId;
  type: 'instagram_reel' | 'ad_copy' | 'linkedin_post' | 'whatsapp_message';
  content: string;
  relatedInsight: mongoose.Types.ObjectId;
  languageStyle: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const GeneratedMarketingContentSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    type: {
      type: String,
      enum: ['instagram_reel', 'ad_copy', 'linkedin_post', 'whatsapp_message'],
      required: true,
    },
    content: { type: String, required: true },
    relatedInsight: { type: mongoose.Types.ObjectId, ref: 'AdInsight' },
    languageStyle: { type: String, default: 'professional' },
    createdBy: { type: mongoose.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

GeneratedMarketingContentSchema.index({ tenantId: 1, type: 1 });
GeneratedMarketingContentSchema.index({ tenantId: 1, relatedInsight: 1 });

export default mongoose.model<IGeneratedMarketingContent>('GeneratedMarketingContent', GeneratedMarketingContentSchema);

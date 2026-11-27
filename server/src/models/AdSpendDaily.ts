import mongoose, { Schema, Document } from 'mongoose';

/**
 * Meta ad spend per ad per day, pulled from the Marketing API insights endpoint
 * (services/metaAdSpendService). Joined to leads by sourceDetails.metaCampaignId /
 * metaAdSetId / adId for cost per lead, per qualified lead and per enrolment.
 */
export interface IAdSpendDaily extends Document {
  tenantId: mongoose.Types.ObjectId;
  /** Ad-account day as Meta reports it, 'YYYY-MM-DD'. */
  day: string;
  /** Start of that day in IST — for range queries. */
  date: Date;
  campaignId?: string;
  campaignName?: string;
  adSetId?: string;
  adSetName?: string;
  adId: string;
  adName?: string;
  spend: number;
  impressions: number;
  clicks: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdSpendDailySchema = new Schema<IAdSpendDaily>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    date: { type: Date, required: true },
    campaignId: { type: String },
    campaignName: { type: String },
    adSetId: { type: String },
    adSetName: { type: String },
    adId: { type: String, required: true },
    adName: { type: String },
    spend: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    currency: { type: String },
  },
  { timestamps: true }
);

AdSpendDailySchema.index({ tenantId: 1, day: 1, adId: 1 }, { unique: true });
AdSpendDailySchema.index({ tenantId: 1, date: 1 });
AdSpendDailySchema.index({ tenantId: 1, campaignId: 1, date: 1 });

export default mongoose.model<IAdSpendDaily>('AdSpendDaily', AdSpendDailySchema);

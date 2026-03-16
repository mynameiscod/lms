import mongoose, { Document, Schema } from 'mongoose';

export interface ICompetitor extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  website: string;
  platforms: string[];
  logo: string;
  notes: string;
  status: 'active' | 'inactive';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema: Schema = new Schema(
  {
    tenantId: { type: mongoose.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true, default: '' },
    platforms: [{ type: String, enum: ['Facebook', 'Instagram', 'LinkedIn', 'Google Ads', 'YouTube', 'Twitter', 'WhatsApp', 'Other'] }],
    logo: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CompetitorSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ICompetitor>('Competitor', CompetitorSchema);

import mongoose, { Schema, Document } from 'mongoose';

/** A named set of Leads-list filters (and sort). Private to its owner unless shared. */
export interface ILeadSavedView extends Document {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  filters: Record<string, string>;
  shared: boolean;
}

const LeadSavedViewSchema = new Schema<ILeadSavedView>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    filters: { type: Schema.Types.Mixed, default: {} },
    shared: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LeadSavedViewSchema.index({ tenantId: 1, userId: 1, name: 1 }, { unique: true });
LeadSavedViewSchema.index({ tenantId: 1, shared: 1 });

export default mongoose.model<ILeadSavedView>('LeadSavedView', LeadSavedViewSchema);

import mongoose, { Schema, Document } from 'mongoose';
import { TrialItems } from '../data/trialPolicy';

/**
 * A trial an admin can give a chosen student: how long it runs and what it opens
 * (CareerPilot → Trial plans). Giving one copies it onto the member, so editing a plan never
 * changes a trial already running.
 */
export interface ITrialPlan extends Document {
  tenantId: string;
  name: string;
  description: string;
  days: number;
  items: TrialItems;
  active: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrialPlanSchema = new Schema<ITrialPlan>(
  {
    tenantId:    { type: String, required: true, index: true },
    name:        { type: String, required: true, trim: true, maxlength: 60 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    days:        { type: Number, required: true, min: 1 },
    items:       { type: Schema.Types.Mixed, default: {} },
    active:      { type: Boolean, default: true },
    updatedBy:   { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<ITrialPlan>('TrialPlan', TrialPlanSchema);

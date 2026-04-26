import mongoose, { Document, Schema } from 'mongoose';

export type DistributionMode = 'round_robin' | 'weighted' | 'manual';

export interface IAgentWeight {
  userId: string;
  weight: number; // percentage (0-100) for weighted mode, or just a relative weight
  maxLeadsPerDay?: number;
}

export interface ILeadDistributionConfig extends Document {
  tenantId: string;
  mode: DistributionMode;
  eligibleRoles: string[]; // role IDs or names eligible for auto-assignment
  maxLeadsPerDayDefault: number;
  weights: IAgentWeight[];
  roundRobinPointer: string | null; // last assigned userId for round-robin
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentWeightSchema = new Schema<IAgentWeight>(
  {
    userId: { type: String, required: true },
    weight: { type: Number, default: 1 },
    maxLeadsPerDay: { type: Number },
  },
  { _id: false }
);

const LeadDistributionConfigSchema = new Schema<ILeadDistributionConfig>(
  {
    tenantId: { type: String, required: true, unique: true },
    mode: {
      type: String,
      enum: ['round_robin', 'weighted', 'manual'],
      default: 'manual',
    },
    eligibleRoles: [{ type: String }],
    maxLeadsPerDayDefault: { type: Number, default: 20 },
    weights: [AgentWeightSchema],
    roundRobinPointer: { type: String, default: null },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<ILeadDistributionConfig>(
  'LeadDistributionConfig',
  LeadDistributionConfigSchema
);

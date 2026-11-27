import mongoose, { Document, Schema } from 'mongoose';

/**
 * The ONE place an institute decides how new leads get a counsellor (owner decision 2026-11-09).
 * Replaces Lead Distribution and the assignment part of Lead Scoring.
 *
 *   manual       nobody is assigned automatically; admins assign by hand
 *   round_robin  rotate between the members who are switched on as available
 *   rules        first matching rule (source / course) rotates between its own members;
 *                a lead no rule matches falls back to round robin over all members
 */
export type LeadAssignmentMode = 'manual' | 'round_robin' | 'rules';

export interface IAssignmentMember {
  userId: mongoose.Types.ObjectId;
  available: boolean;         // off = on leave / not taking leads; skipped by every method
  maxPerDay?: number | null;  // optional daily cap (IST day); empty = no cap
}

export interface IAssignmentRuleV2 {
  name: string;
  enabled: boolean;
  sources: string[];          // lead.source values; empty = any source
  courses: string[];          // matched (case-insensitive, contains) against lead.courseInterest; empty = any
  members: mongoose.Types.ObjectId[];
}

export interface ILeadAssignmentConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  mode: LeadAssignmentMode;
  members: IAssignmentMember[];
  rules: IAssignmentRuleV2[];
  /** Who got each pool's last lead, one entry per pool ("all" or "rule:<index>"). */
  pointers: Map<string, string>;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MemberSchema = new Schema<IAssignmentMember>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  available: { type: Boolean, default: true },
  maxPerDay: { type: Number, default: null, min: 0 },
}, { _id: false });

const RuleSchema = new Schema<IAssignmentRuleV2>({
  name: { type: String, trim: true, default: '' },
  enabled: { type: Boolean, default: true },
  sources: [{ type: String, trim: true }],
  courses: [{ type: String, trim: true }],
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
}, { _id: false });

const LeadAssignmentConfigSchema = new Schema<ILeadAssignmentConfig>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  mode: { type: String, enum: ['manual', 'round_robin', 'rules'], default: 'manual' },
  members: { type: [MemberSchema], default: [] },
  rules: { type: [RuleSchema], default: [] },
  pointers: { type: Map, of: String, default: {} },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model<ILeadAssignmentConfig>('LeadAssignmentConfig', LeadAssignmentConfigSchema);

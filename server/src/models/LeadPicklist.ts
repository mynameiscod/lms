import mongoose, { Schema, Document } from 'mongoose';
import { CALL_OUTCOMES } from './Lead';

/**
 * Per-institute option lists used while working a lead — call outcomes and follow-up
 * reasons. Labels, order and on/off are the institute's; `code` is what gets stored on
 * activities, so renaming a label never changes history.
 *
 * The built-in call outcome codes (CALL_OUTCOMES) are always valid and cannot be deleted
 * (only renamed or switched off): reports and the Outpero/AI-call code rely on them.
 */
export const PICKLISTS = ['call_outcome', 'followup_reason'] as const;
export type PicklistName = typeof PICKLISTS[number];

export interface ILeadPicklistItem extends Document {
  tenantId: mongoose.Types.ObjectId;
  list: PicklistName;
  code: string;
  label: string;
  order: number;
  isActive: boolean;
  isSystem: boolean;
  /** call_outcome: the call reached the person (counts toward "connected"). */
  countsAsConnected?: boolean;
  /** call_outcome: suggest the next try this many hours later (0 = no suggestion). */
  retryHours?: number;
}

const LeadPicklistSchema = new Schema<ILeadPicklistItem>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    list: { type: String, enum: PICKLISTS as unknown as string[], required: true },
    code: { type: String, required: true, trim: true, maxlength: 60, match: /^[a-z0-9_]+$/ },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    countsAsConnected: { type: Boolean, default: false },
    retryHours: { type: Number, min: 0, max: 720, default: 0 },
  },
  { timestamps: true }
);

LeadPicklistSchema.index({ tenantId: 1, list: 1, code: 1 }, { unique: true });
LeadPicklistSchema.index({ tenantId: 1, list: 1, order: 1 });

/** Starter values. Call outcomes mirror CALL_OUTCOMES (system codes). */
export const DEFAULT_PICKLISTS: Record<PicklistName, { code: string; label: string; countsAsConnected?: boolean; retryHours?: number; isSystem?: boolean }[]> = {
  call_outcome: [
    { code: 'connected', label: 'Answered', countsAsConnected: true },
    { code: 'not_answered', label: 'No answer', retryHours: 3 },
    { code: 'not_connected', label: 'Not connected', retryHours: 3 },
    { code: 'busy', label: 'Busy', retryHours: 1 },
    { code: 'switched_off', label: 'Switched off', retryHours: 6 },
    { code: 'rejected', label: 'Call rejected', retryHours: 24 },
    { code: 'wrong_number', label: 'Invalid number' },
    { code: 'callback_requested', label: 'Callback requested', countsAsConnected: true },
  ].map(o => ({ ...o, isSystem: (CALL_OUTCOMES as readonly string[]).includes(o.code) })),
  followup_reason: [
    { code: 'callback_requested', label: 'Callback requested' },
    { code: 'need_time', label: 'Need time' },
    { code: 'fee_discussion', label: 'Fee discussion pending' },
    { code: 'parent_discussion', label: 'Parent discussion pending' },
    { code: 'decision_pending', label: 'Decision pending' },
    { code: 'next_batch', label: 'Next batch interest' },
    { code: 'demo_follow_up', label: 'Demo follow-up' },
    { code: 'payment_follow_up', label: 'Payment follow-up' },
  ],
};

export default mongoose.model<ILeadPicklistItem>('LeadPicklist', LeadPicklistSchema);

import mongoose, { Schema, Document } from 'mongoose';

/**
 * Per-institute CRM automation rules. Every rule is OFF until an admin switches it on.
 * Rules only create follow-up tasks and reminders — none of them ever changes a lead's
 * stage, and nothing marks a lead lost automatically.
 */
export interface ILeadAutomationRules {
  firstContactSla: { enabled: boolean; minutes: number };
  callRetry: { enabled: boolean; maxAttempts: number };
  overdueReminder: { enabled: boolean; hours: number };
  demoReminder: { enabled: boolean; hoursBefore: number };
  noShowFollowUp: { enabled: boolean; hoursAfter: number };
  seatReservedFollowUp: { enabled: boolean; days: number };
  nurtureReactivation: { enabled: boolean };
}

export interface ILeadAutomationConfig extends Document {
  tenantId: mongoose.Types.ObjectId;
  rules: ILeadAutomationRules;
  updatedBy?: mongoose.Types.ObjectId;
}

export const DEFAULT_AUTOMATION_RULES: ILeadAutomationRules = {
  firstContactSla: { enabled: false, minutes: 15 },
  callRetry: { enabled: false, maxAttempts: 5 },
  overdueReminder: { enabled: false, hours: 24 },
  demoReminder: { enabled: false, hoursBefore: 2 },
  noShowFollowUp: { enabled: false, hoursAfter: 24 },
  seatReservedFollowUp: { enabled: false, days: 2 },
  nurtureReactivation: { enabled: false },
};

/** Allowed ranges for the numbers (the API clamps to these). */
export const AUTOMATION_LIMITS = {
  'firstContactSla.minutes': [5, 1440],
  'callRetry.maxAttempts': [1, 20],
  'overdueReminder.hours': [1, 168],
  'demoReminder.hoursBefore': [1, 48],
  'noShowFollowUp.hoursAfter': [1, 168],
  'seatReservedFollowUp.days': [1, 30],
} as const;

const LeadAutomationConfigSchema = new Schema<ILeadAutomationConfig>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    rules: { type: Schema.Types.Mixed, default: () => DEFAULT_AUTOMATION_RULES },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model<ILeadAutomationConfig>('LeadAutomationConfig', LeadAutomationConfigSchema);

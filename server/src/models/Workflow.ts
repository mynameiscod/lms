import mongoose, { Schema, Document } from 'mongoose';

/**
 * Workflow Builder — admin-built automations for leads and WhatsApp.
 * docs/design/workflow-builder.md
 *
 *   Workflow          WHEN (trigger) → steps (a tree: a "paths" step splits into branches)
 *   WorkflowRun       one person going through one workflow: where they are, what happened
 *   WorkflowSettings  the institute's office hours and holidays (used by out-of-office replies and
 *                     by "send only in office hours")
 *
 * A run remembers the id of the step it waits on, not a position, so editing a live workflow never
 * sends a waiting person to the wrong step: if their step was deleted the run stops and says so.
 */

export const TRIGGER_TYPES = ['lead_created', 'stage_changed', 'message_received', 'demo_booked', 'demo_outcome', 'call_result', 'manual'] as const;
export type TriggerType = typeof TRIGGER_TYPES[number];

export const STEP_TYPES = [
  'send_message', 'send_template', 'send_media', 'ask_question', 'ai_reply',
  'wait', 'wait_until', 'paths',
  'update_lead', 'assign', 'follow_up', 'notify', 'handoff', 'webhook', 'stop',
] as const;
export type StepType = typeof STEP_TYPES[number];

export interface WfCondition { field: string; op: string; value?: any }
export interface WfPath { id: string; name: string; match: 'all' | 'any'; conditions: WfCondition[]; steps: WfStep[] }
export interface WfStep { id: string; type: StepType; config: Record<string, any>; paths?: WfPath[] }

export interface IWorkflow extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  trigger: { type: TriggerType; config: Record<string, any> };
  steps: WfStep[];
  settings: {
    /** 'any' time, or hold automated sends until the office is open. */
    sendWindow: 'any' | 'office_hours';
    /** May the same person go through this workflow again (after the cooldown)? */
    allowReentry: boolean;
    cooldownMinutes: number;
    /** A message from the person stops the run (for follow-up sequences). */
    stopOnReply: boolean;
    /** Also runs when a person on our side has taken over the chat (out-of-office replies). */
    runWhenHumanTakenOver: boolean;
    /** The run stops when the lead reaches one of these stages (e.g. Enrolled, Lost). */
    stopStageIds: string[];
  };
  stats: { started: number; completed: number; stopped: number; failed: number; lastRunAt?: Date };
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  activatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowSchema = new Schema<IWorkflow>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ['draft', 'active', 'paused'], default: 'draft' },
  trigger: {
    type: { type: String, enum: TRIGGER_TYPES, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  // The step tree is validated in the service (workflowShape.ts) — Mixed keeps nested paths simple.
  steps: { type: Schema.Types.Mixed, default: [] },
  settings: {
    sendWindow: { type: String, enum: ['any', 'office_hours'], default: 'any' },
    allowReentry: { type: Boolean, default: false },
    cooldownMinutes: { type: Number, default: 0, min: 0, max: 525600 },
    stopOnReply: { type: Boolean, default: false },
    runWhenHumanTakenOver: { type: Boolean, default: false },
    stopStageIds: { type: [String], default: [] },
  },
  stats: {
    started: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    stopped: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    lastRunAt: Date,
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  activatedAt: Date,
}, { timestamps: true, minimize: false });
WorkflowSchema.index({ tenantId: 1, status: 1, 'trigger.type': 1 });
export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);

/* ── Run ─────────────────────────────────────────────────────────────────── */
export const RUN_STATUSES = ['running', 'waiting', 'completed', 'stopped', 'failed'] as const;
export type RunStatus = typeof RUN_STATUSES[number];

export interface WfLogEntry { at: Date; stepId?: string; type?: string; ok: boolean; note: string }
export interface IWorkflowRun extends Document {
  tenantId: mongoose.Types.ObjectId;
  workflowId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId | null;
  phone?: string;
  meetingId?: mongoose.Types.ObjectId | null;
  /** Same workflow + same key never starts twice (e.g. one run per lead, one per demo time). */
  dedupeKey: string;
  status: RunStatus;
  /** The step to run (or the step waiting) next; empty = start from the top. */
  stepId?: string | null;
  waitingFor?: 'time' | 'reply' | null;
  /** ask_question: 'window' = waiting for the person to message first; 'answer' = question sent. */
  phase?: string | null;
  resumeAt?: Date | null;
  lockedAt?: Date | null;
  vars: Record<string, any>;
  log: WfLogEntry[];
  endedAt?: Date;
  endReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
const LogSchema = new Schema<WfLogEntry>({
  at: { type: Date, default: Date.now }, stepId: String, type: String, ok: Boolean, note: { type: String, maxlength: 1000 },
}, { _id: false });
const RunSchema = new Schema<IWorkflowRun>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  workflowId: { type: Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead', default: null, index: true },
  phone: { type: String, index: true },
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', default: null },
  dedupeKey: { type: String, required: true },
  status: { type: String, enum: RUN_STATUSES, default: 'running' },
  stepId: { type: String, default: null },
  waitingFor: { type: String, enum: ['time', 'reply', null], default: null },
  phase: { type: String, default: null },
  resumeAt: { type: Date, default: null },
  lockedAt: { type: Date, default: null },
  vars: { type: Schema.Types.Mixed, default: {} },
  log: { type: [LogSchema], default: [] },
  endedAt: Date,
  endReason: { type: String, maxlength: 300 },
}, { timestamps: true, minimize: false });
RunSchema.index({ workflowId: 1, dedupeKey: 1 }, { unique: true });
RunSchema.index({ status: 1, resumeAt: 1 });
RunSchema.index({ tenantId: 1, phone: 1, status: 1 });
export const WorkflowRun = mongoose.model<IWorkflowRun>('WorkflowRun', RunSchema);

/* ── Office hours ────────────────────────────────────────────────────────── */
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export interface DayHours { open: boolean; start: string; end: string }
export interface IWorkflowSettings extends Document {
  tenantId: mongoose.Types.ObjectId;
  timezone: string;
  days: Record<typeof WEEKDAYS[number], DayHours>;
  /** YYYY-MM-DD in the institute's timezone. */
  holidays: { date: string; name?: string }[];
  /** Off = office hours are not used: always open, no out-of-office replies. */
  enabled: boolean;
  updatedBy?: mongoose.Types.ObjectId;
}
const day = (open: boolean) => ({ open: { type: Boolean, default: open }, start: { type: String, default: '09:30' }, end: { type: String, default: '18:30' } });
const SettingsSchema = new Schema<IWorkflowSettings>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
  timezone: { type: String, default: 'Asia/Kolkata' },
  days: {
    sun: day(false), mon: day(true), tue: day(true), wed: day(true), thu: day(true), fri: day(true), sat: day(true),
  },
  holidays: { type: [{ date: String, name: String, _id: false }], default: [] },
  enabled: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const WorkflowSettings = mongoose.model<IWorkflowSettings>('WorkflowSettings', SettingsSchema);

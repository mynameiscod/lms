import mongoose, { Schema, Document } from 'mongoose';

/*
 * SALES TEAMS — an add-on to Leads (services/salesTeamService.ts).
 *
 * A team is one manager (any staff role) and its members (BDAs or any role). One level only, and a
 * person is a member of one active team at a time. Every member gets an automatic daily report built
 * from what they did in the CRM; the manager reviews it. A manager also sees their members' leads
 * (middleware/leadScope.ts).
 *
 * Deliberately NOT User.managerId: lead visibility already reads that field, and the teams here are
 * set up by the super admin on their own screen.
 */

/* ───────────────────────── Targets (optional) ───────────────────────── */

export const TARGET_KEYS = ['fastCalls', 'calls', 'connected', 'followUpsDone', 'demos', 'enrollments'] as const;
export type TargetKey = typeof TARGET_KEYS[number];
export type Targets = Partial<Record<TargetKey, number>>;

const TargetsSchema = new Schema({
  /** New leads called within 5 minutes of being assigned. */
  fastCalls:     { type: Number, min: 0 },
  calls:         { type: Number, min: 0 },
  connected:     { type: Number, min: 0 },
  followUpsDone: { type: Number, min: 0 },
  demos:         { type: Number, min: 0 },
  enrollments:   { type: Number, min: 0 },
}, { _id: false });

/* ───────────────────────── Team ───────────────────────── */

export interface ISalesTeam extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  color: string;
  managerId: mongoose.Types.ObjectId;
  memberIds: mongoose.Types.ObjectId[];
  /** Daily target for every member of the team (optional). */
  defaultTargets?: Targets;
  /** A member's own target, which replaces the team's for that member. */
  memberTargets: { userId: mongoose.Types.ObjectId; targets: Targets }[];
  active: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SalesTeamSchema = new Schema<ISalesTeam>({
  tenantId:       { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name:           { type: String, required: true, trim: true, maxlength: 60 },
  color:          { type: String, default: '#051D64' },
  managerId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  memberIds:      { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
  defaultTargets: { type: TargetsSchema, default: undefined },
  memberTargets:  { type: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, targets: TargetsSchema, _id: false }], default: [] },
  active:         { type: Boolean, default: true },
  createdBy:      { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

SalesTeamSchema.index({ tenantId: 1, active: 1 });
SalesTeamSchema.index({ tenantId: 1, managerId: 1 });
SalesTeamSchema.index({ tenantId: 1, memberIds: 1 });

export const SalesTeam = mongoose.model<ISalesTeam>('SalesTeam', SalesTeamSchema);

/* ───────────────────────── A member's day ───────────────────────── */

/**
 * A member's day (v2, 2026-11-21). Counted around LEADS, not raw timeline entries:
 *  - a "call" is the Call button / a logged call on one lead, counted once per 10 minutes; connected and
 *    not connected come only from a recorded outcome, presses with none are "outcome missing";
 *  - speed to call is per new lead, from assignment to that person to their first call;
 *  - entries the system writes on someone's behalf (drips, workflows, AI calls, "follow-up done") never count;
 *  - follow-ups are today's, plus older ones still open; the automatic "call this new lead" tasks are left out.
 */
export interface DayMetrics {
  v: 2;
  // Calls
  calls: number;
  leadsCalled: number;
  connected: number;
  notConnected: number;
  outcomeMissing: number;
  outcomes: Record<string, number>;
  talkSeconds: number;
  // Messages and notes
  whatsapp: number;
  leadsMessaged: number;
  notes: number;
  // New leads and speed to call
  newAssigned: number;
  calledWithin5: number;
  calledWithin30: number;
  calledLate: number;
  notCalled: number;
  avgFirstCallMin: number | null;
  // Work
  leadsWorked: number;
  stageMoves: number;
  leadsMovedForward: number;
  // Follow-ups
  followUpsDue: number;
  followUpsDone: number;
  followUpsMissed: number;
  carriedOver: number;
  // Results
  demos: number;
  seats: number;
  enrollments: number;
}

export const RATINGS = ['good', 'ok', 'needs_work'] as const;
export type Rating = typeof RATINGS[number];

export interface IDailyTeamReport extends Document {
  tenantId: mongoose.Types.ObjectId;
  /** IST day, YYYY-MM-DD. */
  day: string;
  userId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  managerId: mongoose.Types.ObjectId;
  metrics?: DayMetrics;
  targets?: Targets;
  generatedAt?: Date;
  note?: { done?: string; blockers?: string; tomorrow?: string; at?: Date };
  review: { status: 'pending' | 'reviewed'; rating?: Rating; comment?: string; by?: mongoose.Types.ObjectId; byName?: string; at?: Date };
  createdAt: Date;
  updatedAt: Date;
}

const DailyTeamReportSchema = new Schema<IDailyTeamReport>({
  tenantId:    { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  day:         { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teamId:      { type: Schema.Types.ObjectId, ref: 'SalesTeam', required: true },
  managerId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  metrics:     { type: Schema.Types.Mixed },
  targets:     { type: TargetsSchema, default: undefined },
  generatedAt: { type: Date },
  note: {
    done:     { type: String, maxlength: 2000 },
    blockers: { type: String, maxlength: 2000 },
    tomorrow: { type: String, maxlength: 2000 },
    at:       { type: Date },
  },
  review: {
    status:  { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    rating:  { type: String, enum: RATINGS },
    comment: { type: String, maxlength: 1000 },
    by:      { type: Schema.Types.ObjectId, ref: 'User' },
    byName:  { type: String },
    at:      { type: Date },
  },
}, { timestamps: true });

DailyTeamReportSchema.index({ tenantId: 1, userId: 1, day: 1 }, { unique: true });
DailyTeamReportSchema.index({ tenantId: 1, managerId: 1, day: -1 });
DailyTeamReportSchema.index({ tenantId: 1, day: -1 });

export const DailyTeamReport = mongoose.model<IDailyTeamReport>('DailyTeamReport', DailyTeamReportSchema);

/* ───────────────────────── "A lead was assigned to you" alerts ───────────────────────── */

/** One row per assignment we have already alerted about (unique), so each assignment alerts once, on any instance. */
const SalesAssignAlertSchema = new Schema({
  leadId:     { type: Schema.Types.ObjectId, required: true },
  assignedAt: { type: Date, required: true },
  createdAt:  { type: Date, default: Date.now, expires: 60 * 60 * 24 * 3 },
});
SalesAssignAlertSchema.index({ leadId: 1, assignedAt: 1 }, { unique: true });

export const SalesAssignAlert = mongoose.model('SalesAssignAlert', SalesAssignAlertSchema);

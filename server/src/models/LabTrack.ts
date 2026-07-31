import mongoose, { Schema, Document } from 'mongoose';

/**
 * Daily-lab delivery: content, sequence and per-batch configuration.
 *
 * Three models, deliberately separated the same way AssessmentSchedule separates a quiz
 * from its delivery, because the failure this replaces was a scheduling one. Today an
 * admin must create one ScheduledChallenge row per batch per day; production has three
 * of them, which is why students are told "no challenge scheduled yet". At 145 days
 * across every batch that approach needs thousands of hand-made rows and will always be
 * behind.
 *
 *   LabTrack            an ordered 145-day plan, authored ONCE
 *   LabTrackItem        one slot in that plan (day 12 -> this problem)
 *   LabTrackAssignment  a track attached to a batch, with its start date and config
 *
 * A new batch reuses an existing track by attaching it with a different start date, so
 * onboarding a batch costs one row rather than 145. The day's item is DERIVED from
 * working days elapsed, never stored per date.
 */

export type LabKind = 'thinking' | 'communication';

/* ── 1. Track: the reusable plan ─────────────────────────────────────────── */

export interface ILabTrack extends Document {
  tenantId: string;
  name: string;
  lab: LabKind;
  description?: string;
  totalDays: number;
  daysPerWeek: number;          // how the builder groups days into weeks
  status: 'draft' | 'published';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LabTrackSchema = new Schema<ILabTrack>({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  lab: { type: String, enum: ['thinking', 'communication'], required: true, index: true },
  description: String,
  totalDays: { type: Number, default: 145, min: 1 },
  daysPerWeek: { type: Number, default: 5, min: 1, max: 7 },
  // Draft tracks are invisible to students, so a half-authored plan can never be served.
  status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

LabTrackSchema.index({ tenantId: 1, lab: 1, status: 1 });

/* ── 2. Track item: one day in the plan ──────────────────────────────────── */

export interface ILabTrackItem extends Document {
  tenantId: string;
  trackId: mongoose.Types.ObjectId;
  dayIndex: number;             // 1..totalDays
  contentId: mongoose.Types.ObjectId;   // ThinkingProblem | CommunicationChallenge
  concept?: string;
  optional: boolean;            // counts for streak but never gates
  createdAt: Date;
  updatedAt: Date;
}

const LabTrackItemSchema = new Schema<ILabTrackItem>({
  tenantId: { type: String, required: true, index: true },
  trackId: { type: Schema.Types.ObjectId, ref: 'LabTrack', required: true, index: true },
  dayIndex: { type: Number, required: true, min: 1 },
  contentId: { type: Schema.Types.ObjectId, required: true },
  concept: String,
  optional: { type: Boolean, default: false },
}, { timestamps: true });

// One item per day per track — stops a day silently holding two problems.
LabTrackItemSchema.index({ trackId: 1, dayIndex: 1 }, { unique: true });

/* ── 3. Assignment: track → batch, and every knob ────────────────────────── */

export interface IGateEscalation { missedDays: number; mode: 'banner' | 'interstitial' | 'block' }

export interface ILabTrackAssignment extends Document {
  tenantId: string;
  batchId: mongoose.Types.ObjectId;
  trackId: mongoose.Types.ObjectId;
  lab: LabKind;
  startDate: Date;

  /** Which weekdays count as learning days. 0=Sun … 6=Sat. Weekends skipped by default;
   *  a skipped day does not consume a dayIndex, so the plan simply resumes. */
  workingDays: number[];
  /** Holidays pause the plan without shifting content off its sequence. */
  holidays: string[];           // 'YYYY-MM-DD'
  /** Cadence: every working day, or only on these weekdays (alternating labs). */
  cadence: 'daily' | 'custom';
  cadenceDays: number[];        // used when cadence === 'custom'

  window: { startTime: string; endTime: string; tz: string };

  gate: {
    mode: 'off' | 'banner' | 'interstitial' | 'block';
    escalation: IGateEscalation[];
    blockedAreas: string[];
    neverBlock: string[];
    /** A Whisper/Claude outage must not lock out the whole student body. */
    bypassOnAiFailure: boolean;
    /** Manual per-student release, e.g. broken microphone. */
    bypassStudentIds: mongoose.Types.ObjectId[];
    /** Cleared nightly: finishing today's item releases the student for the rest of the day. */
    unblockOnCompletion: boolean;
  };

  status: 'active' | 'paused';
  createdAt: Date;
  updatedAt: Date;
}

const LabTrackAssignmentSchema = new Schema<ILabTrackAssignment>({
  tenantId: { type: String, required: true, index: true },
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true, index: true },
  trackId: { type: Schema.Types.ObjectId, ref: 'LabTrack', required: true },
  lab: { type: String, enum: ['thinking', 'communication'], required: true },
  startDate: { type: Date, required: true },

  workingDays: { type: [Number], default: [1, 2, 3, 4, 5] },
  holidays: { type: [String], default: [] },
  cadence: { type: String, enum: ['daily', 'custom'], default: 'daily' },
  cadenceDays: { type: [Number], default: [] },

  window: {
    startTime: { type: String, default: '07:00' },
    endTime: { type: String, default: '23:59' },
    tz: { type: String, default: 'Asia/Kolkata' },
  },

  gate: {
    // Ships OFF. Gating is switched on deliberately, per batch, never by deploying.
    mode: { type: String, enum: ['off', 'banner', 'interstitial', 'block'], default: 'off' },
    escalation: {
      type: [{ missedDays: Number, mode: { type: String, enum: ['banner', 'interstitial', 'block'] } }],
      default: [
        { missedDays: 1, mode: 'banner' },
        { missedDays: 2, mode: 'interstitial' },
        { missedDays: 3, mode: 'block' },
      ],
    },
    blockedAreas: { type: [String], default: ['courses', 'lessons', 'playground', 'resources'] },
    // Never gate anything with a deadline, a legal/financial consequence, or a support
    // path. A student must not lose an exam because a microphone failed.
    neverBlock: {
      type: [String],
      default: ['exams', 'live_classes', 'assignment_submit', 'quiz_attempt', 'fees', 'support', 'profile'],
    },
    bypassOnAiFailure: { type: Boolean, default: true },
    bypassStudentIds: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    unblockOnCompletion: { type: Boolean, default: true },
  },

  status: { type: String, enum: ['active', 'paused'], default: 'active', index: true },
}, { timestamps: true });

// One active plan per lab per batch — two would make "today's item" ambiguous.
LabTrackAssignmentSchema.index({ tenantId: 1, batchId: 1, lab: 1, status: 1 });

export const LabTrack = mongoose.model<ILabTrack>('LabTrack', LabTrackSchema);
export const LabTrackItem = mongoose.model<ILabTrackItem>('LabTrackItem', LabTrackItemSchema);
export const LabTrackAssignment = mongoose.model<ILabTrackAssignment>('LabTrackAssignment', LabTrackAssignmentSchema);

export default LabTrack;

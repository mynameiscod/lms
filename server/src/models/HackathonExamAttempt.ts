import mongoose, { Document, Schema } from 'mongoose';
import { AssessmentItemType } from '../constants/assessment';

/**
 * HackathonExamAttempt — one row per PERSON sitting the hackathon round.
 *
 * A team registers once (HackathonRegistration, code `HK-XXXX-XXXX`) and every member on that
 * sheet gets an attempt. The team's published score is the average across these rows, so this
 * is the grain everything else is computed from: the live dashboard counts them, the leaderboard
 * groups them, and the result message is addressed to one of them.
 *
 * ── WHY VIOLATIONS LIVE HERE AND NOT IN THE BROWSER ───────────────────────────────────────
 *
 * The previous exam counted tab switches in React state and auto-submitted from the client. A
 * refresh reset the count to zero, devtools removed it entirely, and an admin reviewing a
 * suspicious result had nothing to look at. Every signal is appended to `violations` by the
 * server, the count is authoritative, and the force-submit decision is the server's.
 *
 * ── WHY THE DRAW IS STORED, NOT RECOMPUTED ────────────────────────────────────────────────
 *
 * `drawnItems` is the paper this person actually sat. Recomputing it later from the seed would
 * work right up until somebody edits the bank — then a disputed question could not be produced,
 * and a re-grade would mark answers against items the candidate never saw. The seed is kept too,
 * because it makes the draw auditable; the stored list is what anything downstream reads.
 *
 * ── GRADING IS ASYNCHRONOUS, AND THAT IS A CORRECTNESS DECISION ───────────────────────────
 *
 * Code is graded by running it, a Java run costs ~7s of a core, and 800 people submit inside a
 * few minutes. Grading inline would either time out the request or melt the execution tier, and
 * a candidate would be told their correct solution failed. Submitting stores answers and queues;
 * a worker grades with retries; only an attempt that exhausts them lands in `review_required`
 * for a human. Results are admin-published anyway, so nobody is waiting on this.
 */

export type AttemptStatus =
  /** Row exists, invitation may or may not have gone out. */
  | 'invited'
  /** Member passed OTP on their own number — the identity check. */
  | 'verified'
  /** Inside the paper. */
  | 'started'
  /** Finished by the candidate. */
  | 'submitted'
  /** Finished by the server: time ran out, or proctoring tripped. */
  | 'auto_submitted'
  /** Window closed and they never started. Scores zero into the team average. */
  | 'no_show';

export type GradingStatus = 'pending' | 'grading' | 'graded' | 'review_required';

export type ViolationKind =
  | 'tab_switch'
  | 'window_blur'
  | 'fullscreen_exit'
  | 'paste_blocked'
  | 'copy_blocked'
  | 'second_device'
  | 'run_throttled'
  | 'camera_denied'
  | 'camera_lost';

export interface IViolation {
  kind: ViolationKind;
  at: Date;
  /** Free-form context — which question, which session, how long the blur lasted. */
  meta?: Record<string, any>;
}

/** One question as it was put to this candidate, frozen at draw time. */
export interface IDrawnItem {
  itemId: mongoose.Types.ObjectId;
  sectionKey: string;
  /** Position within the section, 0-based. */
  order: number;
  type: AssessmentItemType;
  /** Resolved at draw time from the section override or the item's own points. */
  marks: number;
}

export interface IAttemptAnswer {
  itemId: mongoose.Types.ObjectId;
  sectionKey: string;
  /** mcq */
  selectedOptionIds?: string[];
  /** live_code / sql */
  code?: string;
  language?: string;
  /** predict_output / complete_code / debug */
  text?: string;
  /** How many times this candidate ran code for this question. Enforced against the run policy. */
  runCount: number;
  lastRunAt?: Date;
  /** Server clock, not the browser's. */
  answeredAt?: Date;

  /* ── filled by the grader ── */
  graded: boolean;
  correct?: boolean;
  score?: number;
  maxScore?: number;
  testCasesPassed?: number;
  testCasesTotal?: number;
  /** Why an item could not be graded — a Piston timeout, a missing item, a bad language. */
  gradingNote?: string;
}

export interface IHackathonExamAttempt extends Document {
  tenantId: string;
  examId: mongoose.Types.ObjectId;
  hackathonId: mongoose.Types.ObjectId;

  /** The team. `registrationCode` is the HK- code the member types to reach their paper. */
  registrationId: mongoose.Types.ObjectId;
  registrationCode: string;
  teamName: string;

  /** The person. Mobile is the identity: OTP goes to this number and nowhere else. */
  memberName: string;
  memberMobile: string;
  memberEmail: string;
  isLead: boolean;

  /** Credential for the exam link. Issued at invite, unique across the whole collection. */
  examToken: string;
  otpVerifiedAt?: Date | null;
  /**
   * Set when an admin verified this candidate by hand instead of by code.
   *
   * This exam is sat remotely, so nobody saw the person. A manual verification is therefore
   * an assertion that somebody trusted them, not a check that was performed — and it must
   * be visible as that, on the attempt, next to the score it made possible.
   */
  otpVerifiedBy?: string;

  status: AttemptStatus;

  /** Reproducibility of the per-candidate draw. See the docblock. */
  drawSeed: string;
  drawnItems: IDrawnItem[];
  answers: IAttemptAnswer[];

  startedAt?: Date | null;
  submittedAt?: Date | null;
  /** Server-computed from startedAt → submittedAt. The browser does not get a vote. */
  timeSpentSec?: number;
  /** Hard deadline for this candidate: min(startedAt + duration, exam.endAt). */
  expiresAt?: Date | null;

  /** Single-device lock. */
  activeSessionId?: string;
  lastHeartbeat?: Date | null;

  /**
   * The webcam recording, and whether there is one.
   *
   * `state` is the whole point. A reviewer looking at a suspicious paper has to be able to
   * tell three things apart: recorded and here, refused by the candidate, and meant to record
   * but broken. Treating the last two the same is how somebody concludes a candidate hid
   * from the camera when in fact the camera never worked.
   *
   * `chunks` is what the browser said it uploaded. The reviewer compares it with what plays.
   */
  recording: {
    state: 'off' | 'recording' | 'done' | 'denied' | 'unavailable';
    startedAt?: Date | null;
    endedAt?: Date | null;
    chunks: number;
    bytes: number;
    note?: string;
  };

  violations: IViolation[];
  violationCount: number;
  /** Set when the server ends the paper itself, so the reason survives into review. */
  autoSubmitReason?: string;

  grading: {
    status: GradingStatus;
    attempts: number;
    lastError?: string;
    startedAt?: Date | null;
    completedAt?: Date | null;
  };

  score?: number;
  totalMarks?: number;
  percentage?: number;

  /** Clustering evidence. Cheap to store, and the only thing that catches impersonation. */
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;

  invitesSent: { email: boolean; whatsapp: boolean };
  /** Keyed by `minutesBefore` so adding a reminder later cannot re-fire the old ones. */
  remindersSent: string[];
  resultSent: { email: boolean; whatsapp: boolean };

  createdAt: Date;
  updatedAt: Date;
}

const ViolationSchema = new Schema<IViolation>({
  kind: { type: String, required: true },
  at:   { type: Date, required: true },
  meta: { type: Schema.Types.Mixed },
}, { _id: false });

const DrawnItemSchema = new Schema<IDrawnItem>({
  itemId:     { type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true },
  sectionKey: { type: String, required: true },
  order:      { type: Number, required: true },
  type:       { type: String, required: true },
  marks:      { type: Number, required: true, min: 0 },
}, { _id: false });

const AnswerSchema = new Schema<IAttemptAnswer>({
  itemId:            { type: Schema.Types.ObjectId, ref: 'AssessmentItem', required: true },
  sectionKey:        { type: String, required: true },
  selectedOptionIds: { type: [String], default: undefined },
  code:              { type: String },
  language:          { type: String },
  text:              { type: String },
  runCount:          { type: Number, default: 0 },
  lastRunAt:         { type: Date },
  answeredAt:        { type: Date },

  graded:           { type: Boolean, default: false },
  correct:          { type: Boolean },
  score:            { type: Number },
  maxScore:         { type: Number },
  testCasesPassed:  { type: Number },
  testCasesTotal:   { type: Number },
  gradingNote:      { type: String },
}, { _id: false });

const HackathonExamAttemptSchema = new Schema<IHackathonExamAttempt>({
  tenantId:    { type: String, required: true, index: true },
  examId:      { type: Schema.Types.ObjectId, ref: 'HackathonExam', required: true, index: true },
  hackathonId: { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true },

  registrationId:   { type: Schema.Types.ObjectId, ref: 'HackathonRegistration', required: true },
  registrationCode: { type: String, required: true, uppercase: true, trim: true },
  teamName:         { type: String, required: true },

  memberName:   { type: String, required: true },
  memberMobile: { type: String, required: true },
  memberEmail:  { type: String, required: true, lowercase: true, trim: true },
  isLead:       { type: Boolean, default: false },

  examToken:     { type: String, required: true, unique: true, index: true },
  otpVerifiedAt: { type: Date, default: null },
  otpVerifiedBy: { type: String },

  status: {
    type: String,
    enum: ['invited', 'verified', 'started', 'submitted', 'auto_submitted', 'no_show'],
    default: 'invited',
    index: true,
  },

  drawSeed:   { type: String, required: true },
  drawnItems: { type: [DrawnItemSchema], default: [] },
  answers:    { type: [AnswerSchema], default: [] },

  startedAt:    { type: Date, default: null },
  submittedAt:  { type: Date, default: null },
  timeSpentSec: { type: Number },
  expiresAt:    { type: Date, default: null },

  activeSessionId: { type: String },
  lastHeartbeat:   { type: Date, default: null },

  recording: {
    state:     { type: String, enum: ['off', 'recording', 'done', 'denied', 'unavailable'], default: 'off', index: true },
    startedAt: { type: Date, default: null },
    endedAt:   { type: Date, default: null },
    chunks:    { type: Number, default: 0 },
    bytes:     { type: Number, default: 0 },
    note:      { type: String },
  },

  violations:       { type: [ViolationSchema], default: [] },
  violationCount:   { type: Number, default: 0, index: true },
  autoSubmitReason: { type: String },

  grading: {
    status:      { type: String, enum: ['pending', 'grading', 'graded', 'review_required'], default: 'pending', index: true },
    attempts:    { type: Number, default: 0 },
    lastError:   { type: String },
    startedAt:   { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },

  score:      { type: Number },
  totalMarks: { type: Number },
  percentage: { type: Number },

  ipAddress:         { type: String },
  userAgent:         { type: String },
  deviceFingerprint: { type: String },

  invitesSent:   { email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
  remindersSent: { type: [String], default: [] },
  resultSent:    { email: { type: Boolean, default: false }, whatsapp: { type: Boolean, default: false } },
}, { timestamps: true });

/** One attempt per person per exam. The mobile is the identity, so it is the key. */
HackathonExamAttemptSchema.index({ examId: 1, memberMobile: 1 }, { unique: true });

/** A team's members, for the average and for the team view on the dashboard. */
HackathonExamAttemptSchema.index({ examId: 1, registrationCode: 1 });

/**
 * The live dashboard counts attempts by status, once every few seconds, for 800 rows.
 *
 * Covered by the index rather than fetched: the same mistake on BattleRegistration pulled
 * 22,275 documents off disk to answer one count, and adding `status` to the index took that
 * query from 215ms to 58ms. Same shape, same reason.
 */
HackathonExamAttemptSchema.index({ examId: 1, status: 1 });

/** The grading worker claims the oldest pending attempt. */
HackathonExamAttemptSchema.index({ 'grading.status': 1, submittedAt: 1 });

/**
 * Leaderboard ordering, and it is the same rule everywhere so the live table, the export and
 * the published result can never disagree: higher score, then FASTER time, then who finished
 * first.
 */
HackathonExamAttemptSchema.index({ examId: 1, score: -1, timeSpentSec: 1, submittedAt: 1 });

/** Clustering: everyone who sat the paper from one address. */
HackathonExamAttemptSchema.index({ examId: 1, ipAddress: 1 });

export default mongoose.model<IHackathonExamAttempt>('HackathonExamAttempt', HackathonExamAttemptSchema);

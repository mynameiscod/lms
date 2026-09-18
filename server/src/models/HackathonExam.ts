import mongoose, { Document, Schema } from 'mongoose';
import { ASSESSMENT_ITEM_TYPES, AssessmentItemType } from '../constants/assessment';

/**
 * HackathonExam — the online round a registered hackathon TEAM sits, and every rule the
 * exam runtime is judged against.
 *
 * ── WHY THIS IS NOT TechBattle ────────────────────────────────────────────────────────────
 *
 * TechBattle registers ONE PERSON per row and runs a Quiz. This round is sat by the members
 * of a team that registered through Hackathon/HackathonRegistration, the paper mixes MCQ and
 * live code, and the published result is a TEAM average. Bending TechBattle to cover it would
 * make half its fields mean "depending on which product this row is", which is exactly what
 * the Hackathon model was split out to avoid.
 *
 * ── WHY THE QUESTIONS COME FROM AssessmentItem ────────────────────────────────────────────
 *
 * That bank already holds mcq, live_code and sql with hidden, weighted test cases, it already
 * has an authoring screen, and assessmentCodeGradingService already grades it against Piston.
 * A second bank would be a second authoring UI, a second grader and two places for a question
 * to be wrong. Sections below SELECT from it by (type, dimension, difficulty, tags, language).
 *
 * ── EVERY LIMIT IS A FACT THE SERVER HOLDS ────────────────────────────────────────────────
 *
 * The exam runs in a browser on someone else's machine, which can send anything at all. Time,
 * the number of questions, how many times code may be run, what counts as a violation and when
 * an attempt is force-submitted are decided HERE and enforced server-side. The client's copy of
 * any of these is a convenience for the person sitting the paper, never the authority.
 */

export type HackathonExamStatus =
  /** Being configured. No invitations exist and no one can reach it. */
  | 'draft'
  /** Configured and question draw validated. Invitations may be sent. */
  | 'ready'
  /** Inside the window; attempts may start. */
  | 'live'
  /** Window over. Grading may still be running. */
  | 'closed'
  /** Admin has released results. Only now do candidates and the leaderboard see scores. */
  | 'published';

/**
 * One block of the paper — "six MCQs from the DSA bank at difficulty 2-3", "two Java problems".
 *
 * DRAWN PER CANDIDATE, NOT PER EXAM. Every member of a team gets their own draw, because
 * teammates share a team score and are therefore motivated to share answers. See `drawSeed`
 * on the attempt for how a draw stays reproducible after the fact.
 */
export interface IExamSection {
  /** Stable key used by the attempt's answers. Never reuse one for a different section. */
  key: string;
  label: string;
  /** Item types eligible for this section. */
  types: AssessmentItemType[];
  /** How many items to draw. The draw fails loudly at validation if the bank cannot fill it. */
  drawCount: number;
  /** Optional narrowing of the bank. Empty array = no constraint on that axis. */
  dimensions: string[];
  tags: string[];
  languages: string[];
  /** Inclusive difficulty band, 1–5. */
  minDifficulty: number;
  maxDifficulty: number;
  /**
   * Marks per item, overriding the item's own `points`.
   *
   * Zero means "use the item's points". An override exists because the same bank item can be
   * worth three marks in a screening round and ten in a final, and editing the bank to change
   * one event's weighting would silently reweight every other event using it.
   */
  marksPerItem: number;
}

/**
 * What a candidate may do with the code editor during the exam.
 *
 * RUN IS THE EXPENSIVE ONE. A single Java execution costs about seven seconds of a full core
 * (measured — see executionQueue), so an unthrottled Run button is how a coding round takes the
 * execution tier down. These are the controls that keep the queue a queue instead of a cliff.
 */
export interface IRunPolicy {
  enabled: boolean;
  /** Per question, per candidate. 0 = unlimited, which is only safe for tiny cohorts. */
  maxRunsPerQuestion: number;
  /** Seconds a candidate must wait between runs. Blunt, and very effective. */
  cooldownSeconds: number;
  /**
   * Sample cases a Run is allowed to execute. Hidden cases are never run by the candidate —
   * running them would hand over the answer key one test at a time.
   */
  maxSampleCases: number;
}

/**
 * Proctoring, and what the SERVER does about each signal.
 *
 * The previous generation of this counted tab switches in React state and auto-submitted from
 * the browser, which a refresh reset to zero and devtools removed entirely. Every field here
 * describes something recorded on the attempt and acted on by the server.
 */
export interface IProctoringPolicy {
  tabSwitch: { enabled: boolean; maxWarnings: number; autoSubmit: boolean };
  fullscreen: { required: boolean; maxExits: number; autoSubmit: boolean };
  /** Blocks paste INTO the editor and copy OUT of the question. Every attempt is recorded. */
  copyPasteBlocked: boolean;
  /**
   * Webcam. `snapshotEverySec` of 0 keeps the preview and stores nothing, which is a deterrent
   * and not evidence — worth choosing deliberately rather than by accident.
   */
  camera: { enabled: boolean; snapshotEverySec: number };
  /**
   * Flag a team whose members sit the paper from one IP or one device fingerprint.
   *
   * THE CHEAPEST CONTROL THAT MATCHES THE THREAT. Scores average into a team result, so the
   * cheat this design invites is one strong member sitting several papers. Clustering catches
   * that; a webcam pointed at the right person does not.
   */
  clusterDetection: boolean;
}

export interface IReminderOffset {
  /** Minutes before `startAt`. 1440 = one day, 60 = one hour, 0 = at the gun. */
  minutesBefore: number;
  channels: ('email' | 'whatsapp')[];
}

export interface IHackathonExam extends Document {
  tenantId: string;
  hackathonId: mongoose.Types.ObjectId;
  title: string;
  /** Shown on the instructions page before the candidate starts. Admin HTML. */
  instructions: string;

  status: HackathonExamStatus;

  /** The window. Everyone sits it at once, which is what makes impersonation hard. */
  startAt: Date;
  endAt: Date;
  /** Minutes each candidate gets once they start, clamped to `endAt`. */
  durationMins: number;
  /** Cannot START later than startAt + this. 0 = may start until endAt. */
  joinCutoffMins: number;

  sections: IExamSection[];
  /**
   * 'free' lets a candidate answer sections in any order and move between them — which is what
   * makes "finish the coding first" possible. 'sequential' locks them to section order.
   */
  navigation: 'free' | 'sequential';

  runPolicy: IRunPolicy;
  proctoring: IProctoringPolicy;

  /** Reminders before the gun. Fired once each, tracked per attempt. */
  reminders: IReminderOffset[];
  inviteChannels: ('email' | 'whatsapp')[];
  resultChannels: ('email' | 'whatsapp')[];

  /**
   * Team score = sum of member scores ÷ member count.
   *
   * 'registered' divides by everyone on the team sheet, so a no-show scores zero and pulls the
   * average down. 'attempted' divides only by those who sat it. The first is the stricter rule
   * and the one this event was specified with; it is recorded here because the two produce very
   * different league tables and nobody should have to infer which was used.
   */
  teamScoreDenominator: 'registered' | 'attempted';

  /** Set when an admin releases results. Until then candidates see only "submitted". */
  publishedAt?: Date | null;
  publishedBy?: string;

  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<IExamSection>({
  key:           { type: String, required: true, trim: true },
  label:         { type: String, required: true, trim: true },
  types:         { type: [String], enum: ASSESSMENT_ITEM_TYPES as unknown as string[], default: ['mcq'] },
  drawCount:     { type: Number, required: true, min: 1 },
  dimensions:    { type: [String], default: [] },
  tags:          { type: [String], default: [] },
  languages:     { type: [String], default: [] },
  minDifficulty: { type: Number, default: 1, min: 1, max: 5 },
  maxDifficulty: { type: Number, default: 5, min: 1, max: 5 },
  marksPerItem:  { type: Number, default: 0, min: 0 },
}, { _id: false });

const HackathonExamSchema = new Schema<IHackathonExam>({
  tenantId:     { type: String, required: true, index: true },
  hackathonId:  { type: Schema.Types.ObjectId, ref: 'Hackathon', required: true, index: true },
  title:        { type: String, required: true, trim: true },
  instructions: { type: String, default: '' },

  status: { type: String, enum: ['draft', 'ready', 'live', 'closed', 'published'], default: 'draft', index: true },

  startAt:        { type: Date, required: true },
  endAt:          { type: Date, required: true },
  durationMins:   { type: Number, required: true, min: 1 },
  joinCutoffMins: { type: Number, default: 15, min: 0 },

  sections:   { type: [SectionSchema], default: [] },
  navigation: { type: String, enum: ['free', 'sequential'], default: 'free' },

  runPolicy: {
    enabled:            { type: Boolean, default: true },
    maxRunsPerQuestion: { type: Number, default: 15, min: 0 },
    cooldownSeconds:    { type: Number, default: 5, min: 0 },
    maxSampleCases:     { type: Number, default: 2, min: 0 },
  },

  proctoring: {
    tabSwitch:  {
      enabled:     { type: Boolean, default: true },
      maxWarnings: { type: Number, default: 3, min: 1 },
      autoSubmit:  { type: Boolean, default: true },
    },
    fullscreen: {
      required:   { type: Boolean, default: true },
      maxExits:   { type: Number, default: 3, min: 1 },
      autoSubmit: { type: Boolean, default: false },
    },
    copyPasteBlocked: { type: Boolean, default: true },
    camera: {
      enabled:          { type: Boolean, default: false },
      snapshotEverySec: { type: Number, default: 0, min: 0 },
    },
    clusterDetection: { type: Boolean, default: true },
  },

  reminders: {
    type: [new Schema<IReminderOffset>({
      minutesBefore: { type: Number, required: true, min: 0 },
      channels:      { type: [String], enum: ['email', 'whatsapp'], default: ['email', 'whatsapp'] },
    }, { _id: false })],
    default: [],
  },
  inviteChannels: { type: [String], enum: ['email', 'whatsapp'], default: ['email', 'whatsapp'] },
  resultChannels: { type: [String], enum: ['email', 'whatsapp'], default: ['email', 'whatsapp'] },

  teamScoreDenominator: { type: String, enum: ['registered', 'attempted'], default: 'registered' },

  publishedAt: { type: Date, default: null },
  publishedBy: { type: String },

  createdBy: { type: String },
}, { timestamps: true });

/** One exam per hackathon for now; the index is what will make a second one a deliberate change. */
HackathonExamSchema.index({ tenantId: 1, hackathonId: 1 }, { unique: true });
/** The reminder and open/close sweeps both scan by status and time. */
HackathonExamSchema.index({ status: 1, startAt: 1 });

export default mongoose.model<IHackathonExam>('HackathonExam', HackathonExamSchema);

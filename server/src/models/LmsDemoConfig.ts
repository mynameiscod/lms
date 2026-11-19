import mongoose, { Document, Schema } from 'mongoose';

/**
 * LMS DEMO SETTINGS: one document for the whole platform.
 *
 * A demo student is an ordinary LMS student account on CodeBegun's own institute (the platform
 * owner, so their lead lands in the CRM the team works from), marked with User.lmsDemo. Every demo
 * student gets EVERY course listed here, each with all of its days open. How long the demo lasts
 * (`lengthDays`) is separate from how many days a course has: a course can hold five days and the
 * demo still end after three.
 *
 * The courses themselves are ordinary Learning Plans built in Curriculum Builder, so videos and
 * notes are uploaded the way they always are; this only says which ones the demo shows.
 *
 * Managed by a super admin, or anyone holding `manage_lms_demo` (a permission only a super admin
 * can put on a role).
 */
export interface ILmsDemoCourse {
  curriculumId: mongoose.Types.ObjectId;
  /** Shown on the demo page and the student's course card. Falls back to the plan's own title. */
  title?: string;
  blurb?: string;
  /** Accent colour for the course card. */
  color?: string;
  order: number;
  active: boolean;
}

/**
 * The platform features a demo student can be given. My Learning Plan is always on — it is the
 * demo — and each of the others is a switch on the LMS Demo screen.
 */
export const LMS_DEMO_FEATURES = [
  'thinkingLab', 'communicationLab', 'codingPractice', 'quizzes', 'assignments',
  'questionBooks', 'mockInterview', 'playground', 'visualizer', 'aiMentor', 'resumeBuilder',
] as const;
export type LmsDemoFeature = typeof LMS_DEMO_FEATURES[number];

/** What each feature shows: only these items, in this order. Empty = the feature has nothing to show. */
export interface ILmsDemoContent {
  problemIds: mongoose.Types.ObjectId[];
  thinkingIds: mongoose.Types.ObjectId[];
  quizIds: mongoose.Types.ObjectId[];
  assignmentIds: mongoose.Types.ObjectId[];
  bookKeys: string[];
  speakingIds: mongoose.Types.ObjectId[];
  interviewIds: mongoose.Types.ObjectId[];
}

export interface ILmsDemoConfig extends Document {
  key: 'global';
  enabled: boolean;
  /** How long a demo account stays open, in days. */
  lengthDays: number;
  /** AI study-assistant questions a demo student may ask per day. 0 turns AI off. */
  aiPerDay: number;
  /** Mock interviews a demo student may start per day. */
  mockPerDay: number;
  /** AI Communication Lab sessions a demo student may start per day. */
  commPerDay: number;
  /** Feature switches. Absent key = off. */
  features: Partial<Record<LmsDemoFeature, boolean>>;
  content: ILmsDemoContent;
  /** A Learning Plan shown first to every demo student ("Start here"), e.g. the common Day 1 videos. */
  startCurriculumId?: mongoose.Types.ObjectId | null;
  courses: ILmsDemoCourse[];
  counsellorPhone?: string;
  counsellorWhatsApp?: string;
  /** Line under "Talk to a counsellor" on the end screen. */
  endMessage?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const LMS_DEMO_DEFAULTS = { enabled: true, lengthDays: 3, aiPerDay: 10, mockPerDay: 2, commPerDay: 2 } as const;
export const LMS_DEMO_LIMITS = { lengthDays: { min: 1, max: 60 }, aiPerDay: { min: 0, max: 200 }, perDay: { min: 0, max: 50 } } as const;

const CourseSchema = new Schema<ILmsDemoCourse>(
  {
    curriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },
    title:  { type: String, trim: true, maxlength: 120 },
    blurb:  { type: String, trim: true, maxlength: 300 },
    color:  { type: String, trim: true, maxlength: 20 },
    order:  { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const LmsDemoConfigSchema = new Schema<ILmsDemoConfig>(
  {
    key:        { type: String, enum: ['global'], default: 'global', unique: true },
    enabled:    { type: Boolean, default: LMS_DEMO_DEFAULTS.enabled },
    lengthDays: { type: Number, default: LMS_DEMO_DEFAULTS.lengthDays, min: LMS_DEMO_LIMITS.lengthDays.min, max: LMS_DEMO_LIMITS.lengthDays.max },
    aiPerDay:   { type: Number, default: LMS_DEMO_DEFAULTS.aiPerDay, min: LMS_DEMO_LIMITS.aiPerDay.min, max: LMS_DEMO_LIMITS.aiPerDay.max },
    mockPerDay: { type: Number, default: LMS_DEMO_DEFAULTS.mockPerDay, min: 0, max: LMS_DEMO_LIMITS.perDay.max },
    commPerDay: { type: Number, default: LMS_DEMO_DEFAULTS.commPerDay, min: 0, max: LMS_DEMO_LIMITS.perDay.max },
    features:   { type: Schema.Types.Mixed, default: () => ({}) },
    content: {
      type: new Schema({
        problemIds:    [{ type: Schema.Types.ObjectId }],
        thinkingIds:   [{ type: Schema.Types.ObjectId }],
        quizIds:       [{ type: Schema.Types.ObjectId }],
        assignmentIds: [{ type: Schema.Types.ObjectId }],
        bookKeys:      [{ type: String }],
        speakingIds:   [{ type: Schema.Types.ObjectId }],
        interviewIds:  [{ type: Schema.Types.ObjectId }],
      }, { _id: false }),
      default: () => ({}),
    },
    startCurriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', default: null },
    courses:    { type: [CourseSchema], default: [] },
    counsellorPhone:    { type: String, trim: true, maxlength: 20 },
    counsellorWhatsApp: { type: String, trim: true, maxlength: 20 },
    endMessage:         { type: String, trim: true, maxlength: 300 },
    updatedBy:     { type: String },
    updatedByName: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<ILmsDemoConfig>('LmsDemoConfig', LmsDemoConfigSchema);

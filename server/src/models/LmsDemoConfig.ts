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

export interface ILmsDemoConfig extends Document {
  key: 'global';
  enabled: boolean;
  /** How long a demo account stays open, in days. */
  lengthDays: number;
  /** AI study-assistant questions a demo student may ask per day. 0 turns AI off. */
  aiPerDay: number;
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

export const LMS_DEMO_DEFAULTS = { enabled: true, lengthDays: 3, aiPerDay: 10 } as const;
export const LMS_DEMO_LIMITS = { lengthDays: { min: 1, max: 60 }, aiPerDay: { min: 0, max: 200 } } as const;

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

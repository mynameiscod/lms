import mongoose, { Document, Schema } from 'mongoose';

export interface ICurriculumTopic {
  _id?: any;
  title: string;
  description?: string;
  order: number;
  startDay: number;
  endDay: number;
  color?: string;
  // Which assessment dimension this topic builds. Used to personalize a
  // master-track per candidate (compress mastered areas, expand weak ones).
  // One of: aptitude | fundamentals | dsa | core_stack | problem_solving |
  // system_design. Leave empty for "always include" topics (e.g. interview prep).
  dimension?: string;
}

// Suggested study pace for a master-track, copied onto a candidate's enrollment.
export interface ITrackPace {
  hoursPerDay?: number;       // e.g. 1.5 for working professionals (evenings)
  weekends?: boolean;         // study on weekends too?
  targetWeeks?: number;       // intended completion window
}

export interface ILearningCurriculum extends Document {
  tenantId: string;
  title: string;
  description?: string;
  targetCourse?: string;
  totalDays: number;
  topics: ICurriculumTopic[];
  isPublished: boolean;
  shared: boolean;            // published to the cross-tenant template library
  clonedFrom?: mongoose.Types.ObjectId;
  createdBy: string;
  enrollmentCount: number;
  // ── Master-track hybrid (assessment funnel) ──────────────────────────────
  isMasterTrack: boolean;     // a mentor-approved template the funnel personalizes from
  role?: string;              // e.g. 'java_fullstack' | 'mern' — matches candidate target role
  audienceLevel?: 'fresher' | 'professional';
  pace?: ITrackPace;
  personalizedFor?: mongoose.Types.ObjectId; // set on a candidate-specific clone (the student/user id)
  createdAt: Date;
  updatedAt: Date;
}

const CurriculumTopicSchema = new Schema<ICurriculumTopic>(
  {
    title:       { type: String, required: true, trim: true },
    description: { type: String },
    order:       { type: Number, default: 0 },
    startDay:    { type: Number, required: true, min: 1 },
    endDay:      { type: Number, required: true, min: 1 },
    color:       { type: String, default: '#3b82f6' },
    dimension:   { type: String },
  },
  { _id: true }
);

const LearningCurriculumSchema = new Schema<ILearningCurriculum>(
  {
    tenantId:        { type: String, required: true, index: true },
    title:           { type: String, required: true, trim: true },
    description:     { type: String, trim: true },
    targetCourse:    { type: String, trim: true },
    totalDays:       { type: Number, default: 145, min: 1 },
    topics:          [CurriculumTopicSchema],
    isPublished:     { type: Boolean, default: false },
    shared:          { type: Boolean, default: false, index: true },
    clonedFrom:      { type: Schema.Types.ObjectId, ref: 'LearningCurriculum' },
    createdBy:       { type: String, required: true },
    enrollmentCount: { type: Number, default: 0 },
    isMasterTrack:   { type: Boolean, default: false, index: true },
    role:            { type: String, index: true },
    audienceLevel:   { type: String, enum: ['fresher', 'professional'] },
    pace:            { type: { hoursPerDay: Number, weekends: Boolean, targetWeeks: Number }, default: undefined },
    personalizedFor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LearningCurriculumSchema.index({ tenantId: 1, isPublished: 1 });
LearningCurriculumSchema.index({ tenantId: 1, isMasterTrack: 1, role: 1, audienceLevel: 1 });

export default mongoose.model<ILearningCurriculum>('LearningCurriculum', LearningCurriculumSchema);

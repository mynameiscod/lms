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
  //
  // SUPERSEDED BY skillKeys, and kept. Dimension personalization resizes a topic by one of six
  // broad scores; skill personalization decides depth per capability. Removing it would break
  // every existing master-track and the public funnel that reads them, so both run side by side
  // and the adaptive planner simply prefers skillKeys when they are present.
  dimension?: string;

  /* ---- adaptive curriculum (ADAPTIVE_CURRICULUM_V1) — all optional ---- */

  /** Stable identifier for the module this topic belongs to, e.g. 'M03_PROGRAMMING'. */
  moduleCode?: string;
  /** Stable identifier for the topic itself, so an assignment can survive a title edit. */
  topicCode?: string;

  /**
   * Canonical CareerSkill keys this topic teaches.
   *
   * THE BRIDGE. Until this existed there was no route from a measured skill to anything a
   * student could be given to learn — the two halves of the product could not see each other.
   * Keys, not ObjectIds, matching every other skill reference in the codebase: the key is the
   * contract and survives a reseed.
   */
  skillKeys?: string[];

  /**
   * Skills that must be reached before this topic is useful.
   *
   * Usually derivable from CareerSkill.prerequisiteKeys; stated here only when a topic needs
   * something the skill graph does not say — a pedagogical order rather than a logical one.
   */
  prerequisiteSkillKeys?: string[];

  /** Depth to use when no measurement exists to choose one. */
  defaultDepth?: 'FOUNDATION' | 'GUIDED' | 'STANDARD' | 'REVISION' | 'CHALLENGE';

  /**
   * Part of the universal foundation, and therefore never removed by direction filtering.
   *
   * Git does not stop mattering because a student chose AI. Mandatory topics are exempt from
   * every relevance filter and can only be satisfied by being learned.
   */
  mandatory?: boolean;

  /** Directions this topic serves. Empty means everyone — see careerDirectionPolicy. */
  applicableDirections?: string[];

  /** What a student can do after it, in their words. Shown in the plan and passed to AI generation. */
  learningOutcomes?: string[];
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

    // Adaptive curriculum. Every field optional with no default, so existing topic
    // subdocuments are untouched and read back exactly as they were written.
    moduleCode:            { type: String, trim: true },
    topicCode:             { type: String, trim: true },
    skillKeys:             { type: [String], default: undefined },
    prerequisiteSkillKeys: { type: [String], default: undefined },
    defaultDepth:          { type: String, enum: ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'] },
    mandatory:             { type: Boolean },
    applicableDirections:  { type: [String], default: undefined },
    learningOutcomes:      { type: [String], default: undefined },
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

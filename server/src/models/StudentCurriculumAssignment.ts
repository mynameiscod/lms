/**
 * What THIS student should learn from a curriculum, and why.
 *
 * THE MODEL THAT WAS MISSING. Personalization was previously expressed by cloning an entire
 * LearningCurriculum per student and resizing its day ranges — which meant the decision and the
 * content were the same object, so a decision could not be revisited without rebuilding the
 * content, and the reasoning behind it was thrown away the moment it was applied. A student
 * asking "why am I doing this?" had no answer anywhere in the database.
 *
 * Splitting them gives three things the clone could not:
 *   · a plan that can be REPLANNED without touching a completed day
 *   · a REASON stored against every topic, so the product can explain itself
 *   · a VERSION history, so "what changed and when" is answerable
 *
 * WHAT THIS IS NOT. It is not progress — CurriculumEnrollment owns where the student has got
 * to. It is not mastery — StudentSkillProfile owns what they can do. This owns only the
 * decision: given what they know and where they are heading, what should they be taught.
 *
 * ONE ACTIVE ASSIGNMENT PER STUDENT PER CURRICULUM, enforced by a partial unique index. Two
 * live plans for one student is not a state anything downstream could interpret.
 */
import mongoose, { Document, Schema } from 'mongoose';
import type { AssignmentState, AssignmentReason, LearningDepth } from '../data/adaptiveCurriculumPolicy';

export const ASSIGNMENT_STATES: AssignmentState[] = [
  'NOT_EXPOSED', 'FOUNDATION_REQUIRED', 'GUIDED', 'STANDARD',
  'REVISION', 'VERIFIED', 'ENRICHMENT', 'NOT_RELEVANT', 'LOCKED',
];

export const ASSIGNMENT_REASONS: AssignmentReason[] = [
  'DIAGNOSTIC_GAP', 'NOT_YET_EXPOSED', 'PREREQUISITE', 'STANDARD_FOUNDATION',
  'STUDENT_DIRECTION', 'CAREER_EXPLORATION', 'MASTERY_VERIFIED', 'MODULE_REASSESSMENT',
  'MENTOR_OVERRIDE', 'PREREQUISITE_LOCKED', 'OUTSIDE_DIRECTION',
];

export const LEARNING_DEPTHS: LearningDepth[] = ['FOUNDATION', 'GUIDED', 'STANDARD', 'REVISION', 'CHALLENGE'];

export interface ITopicAssignment {
  /** Subdocument id of the topic inside the curriculum, when it has one. */
  topicId?: string;
  /** Stable code, preferred over topicId because it survives a curriculum rebuild. */
  topicCode?: string;
  title: string;

  /** Canonical skills this topic teaches. Empty for a topic nobody has mapped yet. */
  skillKeys: string[];

  state: AssignmentState;

  /**
   * Ordering weight. Higher is more urgent.
   *
   * Carried from the readiness engine's priorityScore where a role blueprint exists, so the
   * adaptive plan and the roadmap agree about what matters rather than ranking by two different
   * rules and disagreeing in front of the student.
   */
  priority: number;

  contentDepth: LearningDepth;
  difficultyMin: number;
  difficultyMax: number;
  practiceCount: number;

  /** Resolved LearningContentLibrary rows, in delivery order. */
  assignedContentIds: mongoose.Types.ObjectId[];

  reason: AssignmentReason;
  /** The sentence shown to the student, frozen at generation so it cannot drift from the state. */
  reasonText: string;

  /** False when the student may skip this without falling behind. */
  mandatory: boolean;

  /**
   * Held back until a prerequisite is reached.
   *
   * A TARGET ROLE MUST NEVER UNLOCK THIS. A student aiming at machine learning with weak
   * programming does not get to skip programming because of their ambition; the lock is about
   * readiness, and wanting something is not readiness.
   */
  locked: boolean;
  /** Which skill is holding it, so the student can be told what to finish first. */
  lockedBy?: string;

  /** Score at generation time, kept so the reason can be re-read without re-querying. */
  scoreAtAssignment?: number | null;
}

export interface IModuleAssignment {
  moduleCode: string;
  moduleName?: string;
  displayOrder: number;
  topicAssignments: ITopicAssignment[];
}

export interface IStudentCurriculumAssignment extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  curriculumId: mongoose.Types.ObjectId;

  stage: string;
  academicYear?: string;

  selectedDirection?: string;
  directionStatus: 'SELECTED' | 'EXPLORING' | 'UNDECIDED';
  /** Directions being sampled, for a student who has not chosen. */
  explorationDirections: string[];

  availability: {
    hoursPerDay: number;
    daysPerWeek: number;
    weeklyPlannableMinutes: number;
    activeTopicsPerWeek: number;
  };

  moduleAssignments: IModuleAssignment[];

  /** Total mandatory minutes, and what that means at this student's pace. */
  totalAssignedMinutes: number;
  estimatedWeeks: number;

  version: number;
  status: 'ACTIVE' | 'SUPERSEDED';
  supersededAt?: Date;
  supersededBy?: mongoose.Types.ObjectId;

  generatedFromAssessmentId?: mongoose.Types.ObjectId;
  generatedReason: string;
  policyVersion: string;

  generatedAt: Date;
  lastReplannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TopicAssignmentSchema = new Schema<ITopicAssignment>(
  {
    topicId:   { type: String },
    topicCode: { type: String, trim: true },
    title:     { type: String, required: true, trim: true },

    skillKeys: { type: [String], default: [] },

    state:    { type: String, enum: ASSIGNMENT_STATES, required: true },
    priority: { type: Number, default: 0 },

    contentDepth:  { type: String, enum: LEARNING_DEPTHS, required: true },
    difficultyMin: { type: Number, default: 1, min: 1, max: 4 },
    difficultyMax: { type: Number, default: 4, min: 1, max: 4 },
    practiceCount: { type: Number, default: 0, min: 0 },

    assignedContentIds: [{ type: Schema.Types.ObjectId, ref: 'LearningContentLibrary' }],

    reason:     { type: String, enum: ASSIGNMENT_REASONS, required: true },
    reasonText: { type: String, default: '' },

    mandatory: { type: Boolean, default: true },
    locked:    { type: Boolean, default: false },
    lockedBy:  { type: String },

    scoreAtAssignment: { type: Number, default: null },
  },
  { _id: false },
);

const ModuleAssignmentSchema = new Schema<IModuleAssignment>(
  {
    moduleCode:   { type: String, required: true, trim: true },
    moduleName:   { type: String, trim: true },
    displayOrder: { type: Number, default: 100 },
    topicAssignments: { type: [TopicAssignmentSchema], default: [] },
  },
  { _id: false },
);

const StudentCurriculumAssignmentSchema = new Schema<IStudentCurriculumAssignment>(
  {
    tenantId:     { type: String, required: true, index: true },
    studentId:    { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    curriculumId: { type: Schema.Types.ObjectId, ref: 'LearningCurriculum', required: true },

    stage:        { type: String, required: true, trim: true },
    academicYear: { type: String, trim: true },

    selectedDirection: { type: String, trim: true, uppercase: true },
    directionStatus:   { type: String, enum: ['SELECTED', 'EXPLORING', 'UNDECIDED'], default: 'UNDECIDED' },
    explorationDirections: { type: [String], default: [] },

    availability: {
      hoursPerDay:            { type: Number, default: 1 },
      daysPerWeek:            { type: Number, default: 5 },
      weeklyPlannableMinutes: { type: Number, default: 0 },
      activeTopicsPerWeek:    { type: Number, default: 3 },
    },

    moduleAssignments: { type: [ModuleAssignmentSchema], default: [] },

    totalAssignedMinutes: { type: Number, default: 0 },
    estimatedWeeks:       { type: Number, default: 0 },

    version:      { type: Number, default: 1 },
    status:       { type: String, enum: ['ACTIVE', 'SUPERSEDED'], default: 'ACTIVE' },
    supersededAt: { type: Date },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'StudentCurriculumAssignment' },

    generatedFromAssessmentId: { type: Schema.Types.ObjectId },
    generatedReason: { type: String, default: 'DIAGNOSTIC_COMPLETED' },
    policyVersion:   { type: String, default: 'ADAPTIVE_CURRICULUM_V1' },

    generatedAt:     { type: Date, default: Date.now },
    lastReplannedAt: { type: Date },
  },
  { timestamps: true },
);

/**
 * One ACTIVE plan per student per curriculum — enforced by the database, not by a read-then-write
 * check that two concurrent requests would both pass. Superseded versions are kept, so the
 * partial filter is what makes history and uniqueness coexist.
 */
StudentCurriculumAssignmentSchema.index(
  { tenantId: 1, studentId: 1, curriculumId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } },
);

/** Reading a student's plans, newest first. */
StudentCurriculumAssignmentSchema.index({ tenantId: 1, studentId: 1, generatedAt: -1 });

/** Analytics: which skills are being taught at what state across a cohort. */
StudentCurriculumAssignmentSchema.index({ tenantId: 1, 'moduleAssignments.topicAssignments.skillKeys': 1 });

export default mongoose.model<IStudentCurriculumAssignment>(
  'StudentCurriculumAssignment',
  StudentCurriculumAssignmentSchema,
);

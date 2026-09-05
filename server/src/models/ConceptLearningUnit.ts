import mongoose, { Schema, Document } from 'mongoose';
import {
  LearningPhase, LEARNING_PHASES, LearningUnitStatus, LEARNING_UNIT_STATUSES,
} from '../data/conceptLearningPolicy';
import { IResourceAudience, EMPTY_AUDIENCE, IScoreWindow } from './CareerSkillResource';

/**
 * The ordered learning journey for ONE CareerPilot skill.
 *
 * WHY THIS EXISTS. CareerSkillResource already stores the content — the video, the notes, the
 * practice problem. What it never stored is the ORDER. The mission orchestrator resolved one
 * resource per skill and work type and kept the first by priority, with no memory of what the
 * student had already been shown, so a concept with six pieces of material served the same
 * piece every day. An admin could author a complete lesson and a student would meet one
 * seventh of it, repeatedly.
 *
 * WHAT IT DOES NOT DO. It never decides that a student needs this skill. That is the
 * roadmap's job and stays there: a unit is inert until an objective asks for its skill, and
 * deleting every unit would change what students are taught, not what they are assigned.
 *
 * IT REFERENCES CONTENT, IT DOES NOT HOLD IT. A step points at a CareerSkillResource by id.
 * Copying the material in would fork it — an admin fixing a typo in the notes would fix it in
 * one place and not the other, and there would be no way to tell which copy a student saw.
 *
 * VERSIONED, BECAUSE STUDENTS ARE MID-JOURNEY. Publishing an edit to a unit that thirty
 * people are three steps into must not renumber the steps underneath them. Each publish
 * increments `version`; StudentConceptProgress records the version it started, and old
 * versions are retained rather than copied, so a student's sequence stays the one they began.
 */

export interface IConceptLearningStep {
  /** Stable across edits and reorders. Progress refers to this, never to a position. */
  stepId: string;
  /** Display order. Contiguous from 1 after any reorder; the validator enforces it. */
  sequence: number;
  phase: LearningPhase;
  /**
   * Absent for CHECK steps, which route to the assessment engine rather than to content —
   * the same way the orchestrator already builds ASSESS missions without a resource.
   */
  resourceId?: string;
  /** Shown instead of the resource's own title, when the journey needs different wording. */
  titleOverride?: string;
  estimatedMinutes: number;
  /** Optional steps are offered when there is room and never block completion of the unit. */
  required: boolean;
  /**
   * Serve this step only while the member's measured score sits in the window. The adaptive
   * entry point: a student at 55 skips the introduction and starts at practice, without
   * anybody authoring a second unit for them.
   */
  scoreWindow?: IScoreWindow;
  /** Narrows a step further than the unit's own audience. Empty inherits the unit's. */
  audience?: IResourceAudience;
  notes?: string;
}

export interface IConceptLearningUnit extends Document {
  tenantId: string;
  skillKey: string;
  title: string;
  description?: string;
  learningOutcomes: string[];
  estimatedMinutes: number;
  version: number;
  status: LearningUnitStatus;
  steps: IConceptLearningStep[];
  audience: IResourceAudience;
  /** Fraction of REQUIRED steps that completes the unit. 1 means all of them. */
  completionThreshold: number;
  publishedAt?: Date | null;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AudienceSchema = new Schema<IResourceAudience>({
  years:     [{ type: String }],
  courses:   [{ type: String }],
  branches:  [{ type: String }],
  roles:     [{ type: String }],
  languages: [{ type: String }],
  stages:    [{ type: String }],
}, { _id: false });

const StepSchema = new Schema<IConceptLearningStep>({
  stepId:        { type: String, required: true },
  sequence:      { type: Number, required: true },
  phase:         { type: String, enum: LEARNING_PHASES, required: true },
  resourceId:    { type: String, default: '' },
  titleOverride: { type: String, default: '' },
  estimatedMinutes: { type: Number, default: 15 },
  required:      { type: Boolean, default: true },
  scoreWindow:   { min: { type: Number, default: null }, max: { type: Number, default: null } },
  audience:      { type: AudienceSchema, default: EMPTY_AUDIENCE },
  notes:         { type: String, default: '' },
}, { _id: false });

const ConceptLearningUnitSchema = new Schema<IConceptLearningUnit>(
  {
    // String, matching CareerSkillResource rather than the ObjectId the roadmap models use.
    // The two conventions coexist across CareerPilot; this layer sits beside the resources it
    // references, and a mismatch here is the bug that makes a query silently return nothing.
    tenantId:  { type: String, required: true, index: true },
    skillKey:  { type: String, required: true, uppercase: true, trim: true, index: true },
    title:     { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    learningOutcomes: [{ type: String }],
    estimatedMinutes: { type: Number, default: 0 },
    version:   { type: Number, default: 1 },
    status:    { type: String, enum: LEARNING_UNIT_STATUSES, default: 'DRAFT', index: true },
    steps:     { type: [StepSchema], default: [] },
    audience:  { type: AudienceSchema, default: EMPTY_AUDIENCE },
    completionThreshold: { type: Number, default: 1, min: 0, max: 1 },
    publishedAt: { type: Date, default: null },
    createdBy: { type: String, default: '' },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
);

/** The resolver's read: the live unit for one skill. */
ConceptLearningUnitSchema.index({ tenantId: 1, skillKey: 1, status: 1, version: -1 });
/** A student mid-journey reads the exact version they started, whatever has been published since. */
ConceptLearningUnitSchema.index({ tenantId: 1, skillKey: 1, version: 1 });
/** The admin list. */
ConceptLearningUnitSchema.index({ tenantId: 1, status: 1, updatedAt: -1 });

/**
 * ONE PUBLISHED UNIT PER SKILL, enforced by the database rather than by the service.
 *
 * Two live units for JAVA_OOP would make "the journey for this concept" a question with two
 * answers, and which one a student got would depend on sort order. Partial, so DRAFT and
 * ARCHIVED rows are free to coexist — an admin needs a draft open while the current version
 * is still serving students, which is the whole point of the lifecycle.
 */
ConceptLearningUnitSchema.index(
  { tenantId: 1, skillKey: 1 },
  { unique: true, partialFilterExpression: { status: 'PUBLISHED' } }
);

export default mongoose.model<IConceptLearningUnit>('ConceptLearningUnit', ConceptLearningUnitSchema);

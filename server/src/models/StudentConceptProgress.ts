import mongoose, { Schema, Document } from 'mongoose';

/**
 * How far one student has moved through one concept's learning journey.
 *
 * THE MEMORY THE MISSION ENGINE NEVER HAD. Daily missions were resolved from the roadmap and
 * the resource table alone, and neither records what a student has already been shown — so
 * the orchestrator handed out the same first resource every morning. This is the row that
 * lets "step 3 comes after step 2" mean something.
 *
 * LEARNING COMPLETION IS NOT SKILL MASTERY, and this model must never be mistaken for Skill
 * DNA. Finishing every step here says the student was SHOWN the material and said they were
 * done with it. What they can actually demonstrate is StudentSkillProfile's answer, and it
 * moves only on evidence — an assessment, a graded problem, an interview. Keeping the two
 * apart is what stops a journey of clicked-through videos reading as competence, which is the
 * failure that would make the whole score untrustworthy.
 *
 * VERSION-PINNED. `learningUnitVersion` is the version the student started, and the resolver
 * reads that version's steps for as long as they are mid-journey. An admin republishing a
 * unit renumbers nothing underneath anybody.
 *
 * STEP IDS, NEVER POSITIONS. Completed work is recorded by `stepId`, so reordering a
 * published journey cannot silently mark a student as having done a step they never saw.
 */

export type ConceptProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export const CONCEPT_PROGRESS_STATUSES: ConceptProgressStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'];

export interface ICompletedStep {
  stepId: string;
  completedAt: Date;
  /** The daily-mission key this came from, so a completion can be traced to its mission. */
  missionKey?: string;
  resourceId?: string;
  /** The server's own figure for the slice, never a duration supplied by the client. */
  creditedMinutes?: number;
}

export interface IStudentConceptProgress extends Document {
  tenantId: string;
  studentId: mongoose.Types.ObjectId;
  learningUnitId: mongoose.Types.ObjectId;
  learningUnitVersion: number;
  skillKey: string;
  status: ConceptProgressStatus;
  completedSteps: ICompletedStep[];
  /** Steps deliberately passed over — out of score window, or optional and not offered. */
  skippedStepIds: string[];
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CompletedStepSchema = new Schema<ICompletedStep>({
  stepId:      { type: String, required: true },
  completedAt: { type: Date, default: Date.now },
  missionKey:  { type: String, default: '' },
  resourceId:  { type: String, default: '' },
  creditedMinutes: { type: Number, default: 0 },
}, { _id: false });

const StudentConceptProgressSchema = new Schema<IStudentConceptProgress>(
  {
    tenantId:       { type: String, required: true, index: true },
    studentId:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    learningUnitId: { type: Schema.Types.ObjectId, ref: 'ConceptLearningUnit', required: true },
    learningUnitVersion: { type: Number, required: true },
    // Denormalised so the resolver can find a student's progress for a skill without first
    // resolving which unit is live — the roadmap gives it a skillKey, not a unit id.
    skillKey:       { type: String, required: true, uppercase: true, trim: true },
    status:         { type: String, enum: CONCEPT_PROGRESS_STATUSES, default: 'NOT_STARTED', index: true },
    completedSteps: { type: [CompletedStepSchema], default: [] },
    skippedStepIds: [{ type: String }],
    startedAt:      { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    completedAt:    { type: Date, default: null },
  },
  { timestamps: true }
);

/** The resolver's read, once per skill per plan build. */
StudentConceptProgressSchema.index({ tenantId: 1, studentId: 1, skillKey: 1 });

/**
 * ONE ROW PER STUDENT PER UNIT VERSION.
 *
 * The version is part of the key rather than a field on a single row: a student who finished
 * version 1 and later meets version 2 has two distinct journeys, and collapsing them would
 * either lose the first or make the second look already finished. It also makes progress
 * writes safely idempotent under upsert, which matters because mission completion can be
 * retried and must not append a second copy of the same step.
 */
StudentConceptProgressSchema.index(
  { tenantId: 1, studentId: 1, learningUnitId: 1, learningUnitVersion: 1 },
  { unique: true }
);

export default mongoose.model<IStudentConceptProgress>('StudentConceptProgress', StudentConceptProgressSchema);

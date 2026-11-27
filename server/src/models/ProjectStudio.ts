import mongoose, { Schema, Document } from 'mongoose';

/**
 * Project Studio — guided end-to-end projects (docs/design/project-studio.md).
 *
 * An admin writes a project once: sprints → days → small tasks, each with a brief, "done when"
 * checks, the proof a student must give and a few interview questions. The admin releases it to
 * batches; a student picks ONE project (no switching — only an admin can reset), works through the
 * tasks at their own pace in their own GitHub repo, and submits proof per task. A mentor approves
 * (or the project auto-approves). Completion % = approved task weight / total task weight.
 *
 * Not the CareerPilot "Project Builder" (models/ProjectPlan.ts), which is an AI plan per member.
 */

export const PROOF_TYPES = ['commit', 'pr', 'url', 'text'] as const;
export type ProofType = typeof PROOF_TYPES[number];

export interface IProjectQuestion { q: string; a: string }

export interface IProjectTask {
  _id: mongoose.Types.ObjectId;
  title: string;
  /** One-line user story: "As a user I can log in and receive a JWT". */
  story: string;
  /** Markdown: what to build, steps, hints, starter snippets. */
  brief: string;
  /** "Done when" checklist. */
  acceptance: string[];
  proofType: ProofType;
  /** Share of the project's completion %. */
  weight: number;
  questions: IProjectQuestion[];
}

export interface IProjectDay { _id: mongoose.Types.ObjectId; title: string; tasks: IProjectTask[] }
export interface IProjectSprint { _id: mongoose.Types.ObjectId; title: string; goal: string; days: IProjectDay[] }

export interface IProjectTemplate extends Document {
  tenantId: string;
  title: string;
  /** Markdown: what the finished app does. */
  summary: string;
  domain: string;
  /** Fixed by the admin — students do not choose. */
  techStack: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  status: 'draft' | 'published' | 'archived';
  releasedBatchIds: string[];
  /** mentor = a mentor approves each submission; auto = a submission counts as done at once. */
  reviewMode: 'mentor' | 'auto';
  sprints: IProjectSprint[];
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IProjectQuestion>({
  q: { type: String, required: true, trim: true, maxlength: 1000 },
  a: { type: String, default: '', trim: true, maxlength: 5000 },
}, { _id: false });

const TaskSchema = new Schema<IProjectTask>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  story: { type: String, default: '', trim: true, maxlength: 500 },
  brief: { type: String, default: '', maxlength: 20000 },
  acceptance: { type: [String], default: [] },
  proofType: { type: String, enum: PROOF_TYPES, default: 'commit' },
  weight: { type: Number, default: 1, min: 1, max: 10 },
  questions: { type: [QuestionSchema], default: [] },
});

const DaySchema = new Schema<IProjectDay>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  tasks: { type: [TaskSchema], default: [] },
});

const SprintSchema = new Schema<IProjectSprint>({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  goal: { type: String, default: '', trim: true, maxlength: 1000 },
  days: { type: [DaySchema], default: [] },
});

const ProjectTemplateSchema = new Schema<IProjectTemplate>({
  tenantId: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  summary: { type: String, default: '', maxlength: 20000 },
  domain: { type: String, default: '', trim: true, maxlength: 100 },
  techStack: { type: [String], default: [] },
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  releasedBatchIds: { type: [String], default: [] },
  reviewMode: { type: String, enum: ['mentor', 'auto'], default: 'mentor' },
  sprints: { type: [SprintSchema], default: [] },
  createdBy: String,
  updatedBy: String,
}, { timestamps: true });

export const ProjectTemplate = mongoose.model<IProjectTemplate>('ProjectTemplate', ProjectTemplateSchema);

/* ── A student's run through one project ──────────────────────────────────────────────────── */

export type TaskStatus = 'submitted' | 'changes' | 'done';

export interface ITaskState {
  taskId: string;
  status: TaskStatus;
  proofUrl?: string;
  note?: string;
  /** Every submission, so Practice Pass can count the day each one was made. */
  submissions: { at: Date; proofUrl?: string; note?: string }[];
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
  doneAt?: Date;
  /** Self-check on the interview questions: index → knew it or not. */
  selfCheck: { i: number; knew: boolean }[];
}

export interface IProjectEnrollment extends Document {
  tenantId: string;
  studentId: string;
  batchId: string;
  templateId: mongoose.Types.ObjectId;
  /** false once an admin resets the student; the history stays. */
  active: boolean;
  repoUrl?: string;
  tasks: ITaskState[];
  doneWeight: number;
  totalWeight: number;
  completionPct: number;
  startedAt: Date;
  completedAt?: Date;
  lastActivityAt: Date;
  resetAt?: Date;
  resetBy?: string;
  resetReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskStateSchema = new Schema<ITaskState>({
  taskId: { type: String, required: true },
  status: { type: String, enum: ['submitted', 'changes', 'done'], required: true },
  proofUrl: { type: String, maxlength: 1000 },
  note: { type: String, maxlength: 2000 },
  submissions: { type: [{ at: Date, proofUrl: String, note: String, _id: false }], default: [] },
  submittedAt: Date,
  reviewedAt: Date,
  reviewedBy: String,
  reviewNote: { type: String, maxlength: 2000 },
  doneAt: Date,
  selfCheck: { type: [{ i: Number, knew: Boolean, _id: false }], default: [] },
}, { _id: false });

const ProjectEnrollmentSchema = new Schema<IProjectEnrollment>({
  tenantId: { type: String, required: true },
  studentId: { type: String, required: true },
  batchId: { type: String, default: '' },
  templateId: { type: Schema.Types.ObjectId, ref: 'ProjectTemplate', required: true },
  active: { type: Boolean, default: true },
  repoUrl: { type: String, maxlength: 500 },
  tasks: { type: [TaskStateSchema], default: [] },
  doneWeight: { type: Number, default: 0 },
  totalWeight: { type: Number, default: 0 },
  completionPct: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  lastActivityAt: { type: Date, default: Date.now },
  resetAt: Date,
  resetBy: String,
  resetReason: String,
}, { timestamps: true });
// One active project per student — the "no switching" rule, enforced by the database.
ProjectEnrollmentSchema.index({ tenantId: 1, studentId: 1 }, { unique: true, partialFilterExpression: { active: true } });
ProjectEnrollmentSchema.index({ tenantId: 1, templateId: 1, active: 1 });
ProjectEnrollmentSchema.index({ tenantId: 1, 'tasks.status': 1 });
ProjectEnrollmentSchema.index({ studentId: 1, 'tasks.submissions.at': 1 });

export const ProjectEnrollment = mongoose.model<IProjectEnrollment>('ProjectEnrollment', ProjectEnrollmentSchema);

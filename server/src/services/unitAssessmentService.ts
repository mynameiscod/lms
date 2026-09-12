/**
 * Binding an assessment to a Learning Unit.
 *
 * ── NOTHING HERE IS A SECOND ASSESSMENT ENGINE ────────────────────────────────────────────
 *
 * Quiz and Assignment already exist, with attempts, scoring, grading, submissions and the
 * screens that run them. A "checkpoint" content type or a curriculum-owned project would
 * duplicate all of it, and the two copies would drift the first time somebody fixed a bug in
 * one. A unit therefore POINTS at an assessment: `Quiz.unitCode` and `Assignment.unitCode`,
 * both of which already existed and, until now, could only be set by a seed.
 *
 * ── WHY A CODE ON THE ASSESSMENT AND NOT A JOIN COLLECTION ────────────────────────────────
 *
 * The same argument the content bundle settled. A join table would let one quiz be the
 * checkpoint of two units, and the readiness rule would then have to answer "whose quiz is
 * this" with no way to know. One optional code says it exactly: an assessment belongs to at
 * most one unit, and a unit may have several.
 *
 * ── THE TENANT TRAP, WHICH HAS ALREADY COST THIS CODEBASE ONCE ────────────────────────────
 *
 * Quiz scopes by `tenantId` (String). Assignment scopes by `tenant` (ObjectId ref). Querying
 * Assignment with the string returns nothing and reports no error — a bound assignment simply
 * would not count, and a PROJECT unit could never reach READY for a reason no screen showed.
 * Every Assignment query here goes through `tenantFilter`, which is the only place that knows.
 *
 * ── A QUIZ CANNOT SATISFY A PROJECT ───────────────────────────────────────────────────────
 *
 * Deliberately not enforced here, because it is already enforced where it belongs: the
 * readiness policy separates `assessment` from `submission`, and only an Assignment sets the
 * second. Re-checking it at bind time would mean refusing a perfectly reasonable act — putting
 * a short quiz on a project unit as well as its brief — while the rule that matters, "this unit
 * is not READY until something can receive submitted work", holds on its own.
 */

import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import Assignment, { AssignmentType, AssignmentStatus } from '../models/Assignment';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';

const clean = (v: any, n = 200): string => String(v ?? '').trim().slice(0, n);
const authorError = (message: string, status = 400) =>
  Object.assign(new Error(message), { status });

/** Assignment's tenant is an ObjectId ref; an id that is not one can match nothing. */
const tenantFilter = (tenantId: string): { tenant: mongoose.Types.ObjectId } | null =>
  mongoose.Types.ObjectId.isValid(tenantId)
    ? { tenant: new mongoose.Types.ObjectId(tenantId) }
    : null;

export interface BoundAssessment {
  _id: string;
  kind: 'QUIZ' | 'ASSIGNMENT';
  title: string;
  /** Whether a student could actually meet it today. Bound-but-inactive teaches nobody. */
  live: boolean;
  /** Only an ASSIGNMENT can receive submitted work. See the readiness policy. */
  countsAsSubmission: boolean;
  type?: string;
  totalMarks?: number;
}

const quizRow = (q: any): BoundAssessment => ({
  _id: String(q._id),
  kind: 'QUIZ',
  title: String(q.title || 'Untitled quiz'),
  live: q.isActive !== false,
  countsAsSubmission: false,
  totalMarks: Number(q.totalMarks) || 0,
});

const assignmentRow = (a: any): BoundAssessment => ({
  _id: String(a._id),
  kind: 'ASSIGNMENT',
  title: String(a.title || 'Untitled assignment'),
  live: a.status !== AssignmentStatus.ARCHIVED,
  countsAsSubmission: true,
  type: String(a.type || ''),
  totalMarks: Number(a.totalPoints) || 0,
});

async function requireUnit(tenantId: string, unitCode: string) {
  const unit = await CurriculumLearningUnit
    .findOne({ tenantId, unitCode }).select('unitCode title unitType').lean() as any;
  if (!unit) throw authorError('No such unit.', 404);
  return unit;
}

/**
 * What this unit measures with, and what it could.
 *
 * Candidates are assessments carrying NO unit code at all. Offering ones already bound
 * elsewhere would let a single click quietly remove another unit's checkpoint, which is the
 * same mistake content attachment refuses to make.
 */
export async function listUnitAssessments(tenantId: string, unitCode: string) {
  const unit = await requireUnit(tenantId, unitCode);
  const tf = tenantFilter(tenantId);
  const unbound = { $or: [{ unitCode: { $exists: false } }, { unitCode: null }, { unitCode: '' }] };

  const [boundQuizzes, boundAssignments, quizCandidates, assignmentCandidates] = await Promise.all([
    Quiz.find({ tenantId, unitCode }).select('title isActive totalMarks').lean() as any,
    tf ? Assignment.find({ ...tf, unitCode }).select('title status type totalPoints').lean() as any
       : Promise.resolve([] as any[]),
    Quiz.find({ tenantId, ...unbound }).select('title isActive totalMarks')
      .sort({ createdAt: -1 }).limit(50).lean() as any,
    tf ? Assignment.find({ ...tf, ...unbound }).select('title status type totalPoints')
          .sort({ createdAt: -1 }).limit(50).lean() as any
       : Promise.resolve([] as any[]),
  ]);

  const bound = [
    ...(boundQuizzes as any[]).map(quizRow),
    ...(boundAssignments as any[]).map(assignmentRow),
  ];

  return {
    unitCode: unit.unitCode,
    unitType: unit.unitType,
    bound,
    candidates: [
      ...(quizCandidates as any[]).map(quizRow),
      ...(assignmentCandidates as any[]).map(assignmentRow),
    ],
    /** The two readiness axes, answered directly so a screen need not infer them. */
    hasAssessment: bound.length > 0,
    hasSubmission: bound.some(b => b.countsAsSubmission),
  };
}

/* ------------------------------------------------------------------ *
 * Binding
 * ------------------------------------------------------------------ */

export async function bindQuiz(tenantId: string, unitCode: string, quizId: string) {
  await requireUnit(tenantId, unitCode);
  if (!mongoose.Types.ObjectId.isValid(quizId)) throw authorError('No such quiz.', 404);

  const quiz = await Quiz.findOne({ tenantId, _id: quizId }).select('unitCode title').lean() as any;
  if (!quiz) throw authorError('No such quiz.', 404);

  if (quiz.unitCode && String(quiz.unitCode) !== unitCode) {
    throw authorError(
      `"${quiz.title}" is already the assessment for ${quiz.unitCode}. Unbind it there first.`,
      409,
    );
  }

  await Quiz.updateOne({ tenantId, _id: quizId }, { $set: { unitCode } });
  return { bound: true, kind: 'QUIZ' as const, unitCode, id: String(quizId) };
}

/**
 * Release a quiz from its unit.
 *
 * UNSETS the code; it never deletes the quiz. A quiz may already hold student attempts, and
 * unbinding is a curriculum decision, not a reason to destroy results.
 */
export async function unbindQuiz(tenantId: string, unitCode: string, quizId: string) {
  const r = await Quiz.updateOne(
    { tenantId, _id: quizId, unitCode }, { $unset: { unitCode: '' } },
  );
  if (!r.matchedCount) throw authorError('That quiz is not bound to this unit.', 404);
  return { unbound: true, kind: 'QUIZ' as const, unitCode, id: String(quizId) };
}

export async function bindAssignment(tenantId: string, unitCode: string, assignmentId: string) {
  await requireUnit(tenantId, unitCode);
  const tf = tenantFilter(tenantId);
  if (!tf || !mongoose.Types.ObjectId.isValid(assignmentId)) {
    throw authorError('No such assignment.', 404);
  }

  const row = await Assignment.findOne({ ...tf, _id: assignmentId })
    .select('unitCode title').lean() as any;
  if (!row) throw authorError('No such assignment.', 404);

  if (row.unitCode && String(row.unitCode) !== unitCode) {
    throw authorError(
      `"${row.title}" is already the assignment for ${row.unitCode}. Unbind it there first.`,
      409,
    );
  }

  await Assignment.updateOne({ ...tf, _id: assignmentId }, { $set: { unitCode } });
  return { bound: true, kind: 'ASSIGNMENT' as const, unitCode, id: String(assignmentId) };
}

export async function unbindAssignment(tenantId: string, unitCode: string, assignmentId: string) {
  const tf = tenantFilter(tenantId);
  if (!tf) throw authorError('That assignment is not bound to this unit.', 404);

  const r = await Assignment.updateOne(
    { ...tf, _id: assignmentId, unitCode }, { $unset: { unitCode: '' } },
  );
  if (!r.matchedCount) throw authorError('That assignment is not bound to this unit.', 404);
  return { unbound: true, kind: 'ASSIGNMENT' as const, unitCode, id: String(assignmentId) };
}

/* ------------------------------------------------------------------ *
 * Creating one from the unit screen
 * ------------------------------------------------------------------ */

/**
 * A checkpoint quiz shell, bound on creation.
 *
 * DELIBERATELY EMPTY OF QUESTIONS. Authoring questions is the quiz builder's job and this must
 * not grow into a second one; what an author cannot do from the quiz builder is discover that
 * a particular CHECKPOINT unit is the thing needing a quiz. So this creates the shell, binds
 * it, and leaves the author to fill it in where questions already live.
 *
 * It is created INACTIVE. An empty quiz that students could open would be worse than no quiz,
 * and `live: false` is reported on the unit screen so the half-finished state is visible rather
 * than mistaken for progress.
 */
export async function createQuizForUnit(
  tenantId: string,
  unitCode: string,
  actor: string,
  title?: string,
) {
  const unit = await requireUnit(tenantId, unitCode);

  const now = new Date();
  const farOff = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  const quiz = await Quiz.create({
    title: clean(title) || `Checkpoint — ${unit.title}`,
    description: `Measures ${unit.unitCode}. Created from the curriculum authoring screen.`,
    tenantId,
    createdBy: actor || 'curriculum-admin',
    unitCode,
    // The quiz engine requires a window; a checkpoint is taken when the plan reaches it, so the
    // window is wide and the real gating is the unit's place in the plan.
    startDate: now,
    endDate: farOff,
    startTime: '00:00',
    endTime: '23:59',
    totalMarks: 0,
    totalTime: 15,
    isActive: false,
  } as any);

  return { created: true, kind: 'QUIZ' as const, unitCode, id: String(quiz._id) };
}

/**
 * A project assignment shell, bound on creation.
 *
 * Type PROJECT and status DRAFT: it is the submission surface for a curriculum project, and it
 * is not open to anybody until the author finishes it in the assignment screens.
 */
export async function createAssignmentForUnit(
  tenantId: string,
  unitCode: string,
  createdBy: string,
  title?: string,
) {
  const unit = await requireUnit(tenantId, unitCode);
  const tf = tenantFilter(tenantId);
  if (!tf) throw authorError('This tenant cannot own assignments.', 400);
  if (!mongoose.Types.ObjectId.isValid(createdBy)) {
    throw authorError('An assignment records who created it, and this session has no user id.', 400);
  }

  const row = await Assignment.create({
    ...tf,
    title: clean(title) || `Project — ${unit.title}`,
    description: `Submission for ${unit.unitCode}. Created from the curriculum authoring screen.`,
    type: AssignmentType.PROJECT,
    status: AssignmentStatus.DRAFT,
    totalPoints: 100,
    unitCode,
    createdBy: new mongoose.Types.ObjectId(createdBy),
  } as any);

  return { created: true, kind: 'ASSIGNMENT' as const, unitCode, id: String(row._id) };
}

/**
 * Release every assessment bound to a unit. Used when the unit itself is deleted.
 *
 * Same reasoning as content: leaving a code pointing at a unit that no longer exists would
 * strand the quiz — it would measure nothing and never be offered as a candidate anywhere else,
 * because a bound assessment is filtered out of every other unit's list.
 */
export async function releaseUnitAssessments(tenantId: string, unitCode: string) {
  const tf = tenantFilter(tenantId);
  const [q, a] = await Promise.all([
    Quiz.updateMany({ tenantId, unitCode }, { $unset: { unitCode: '' } }),
    tf ? Assignment.updateMany({ ...tf, unitCode }, { $unset: { unitCode: '' } })
       : Promise.resolve({ modifiedCount: 0 } as any),
  ]);
  return { quizzes: q.modifiedCount ?? 0, assignments: (a as any).modifiedCount ?? 0 };
}

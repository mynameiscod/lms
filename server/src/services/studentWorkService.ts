/**
 * The single answer to "what work is assigned to this student, and where do they
 * stand on it?"
 *
 * This exists because the admin profile and the student's own screens each grew
 * their own copy of the rule and drifted apart. The student list checked
 * AssessmentSchedule delivery; the admin profile did not, so a student with five
 * schedule-delivered quizzes showed ONE quiz to staff and six to himself. Staff were
 * reading a number that was never going to match what the student saw.
 *
 * Both sides now call in here. If the visibility rule changes, it changes once.
 */

import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import { studentSchedulesMap, policyFromRow } from './assessmentDeliveryService';
import { computeStatus, mergePolicy, DEFAULT_POLICY, AssessmentStatusKind } from './deadlinePolicyService';

/** Statuses that mean "the student has actually done it". */
export const DONE_STATUSES: AssessmentStatusKind[] = ['submitted', 'late', 'graded'];
/** Statuses that mean "still owed". */
export const PENDING_STATUSES: AssessmentStatusKind[] = ['not_started', 'in_progress', 'overdue'];

export interface AssignedQuiz {
  quiz: any;
  schedule: any | null;
  attempts: any[];              // newest first
  latestAttempt: any | null;
  attemptCount: number;         // finished attempts only
  hasInProgress: boolean;
  dueAt: Date | null;
  startAt: Date | null;
  source: 'schedule' | 'baked';
  latePolicy: string;
  status: AssessmentStatusKind;
}

/** The quiz's own baked close time, or null when it hasn't got a valid one. */
function bakedEndTime(quiz: any): Date | null {
  if (!quiz?.endDate) return null;
  try {
    const day = new Date(quiz.endDate).toISOString().split('T')[0];
    const at = new Date(`${day}T${quiz.endTime || '23:59'}`);
    return isNaN(at.getTime()) ? null : at;
  } catch { return null; }
}

/**
 * Every quiz this student can see, with their attempt state and current status.
 *
 * `autoAbandon` closes out in-progress attempts whose window has passed. That is a
 * write, so it stays off for read-only admin views and on for the student's own
 * screen, which is where the behaviour has always lived.
 */
export async function resolveAssignedQuizzes(
  tenantId: string,
  studentId: string,
  batchId: string | null,
  opts: { autoAbandon?: boolean } = {},
): Promise<AssignedQuiz[]> {
  const all = await Quiz.find({
    tenantId, isActive: true, isExternalQuiz: { $ne: true }, archivedAt: null,
  }).lean();

  const schedMap = await studentSchedulesMap(tenantId, studentId, batchId, 'quiz');

  const visible = all.filter((quiz: any) => {
    if (quiz.accessibleTo === 'batch_wise') {
      if (batchId && (quiz.selectedBatches || []).includes(batchId)) return true;
    } else if (quiz.accessibleTo === 'individual') {
      if ((quiz.selectedStudents || []).includes(studentId)) return true;
    } else if (quiz.accessibleTo === 'everyone') {
      return true;
    }
    // Delivery via schedule grants access on its own — that IS the assignment.
    return schedMap.has(String(quiz._id));
  });

  if (!visible.length) return [];

  const attemptsAll = await QuizAttempt.find({
    quizId: { $in: visible.map((q: any) => q._id) }, studentId,
  }).sort({ createdAt: -1 });

  const byQuiz = new Map<string, any[]>();
  for (const a of attemptsAll) {
    const k = String(a.quizId);
    if (!byQuiz.has(k)) byQuiz.set(k, []);
    byQuiz.get(k)!.push(a);
  }

  const now = new Date();
  const out: AssignedQuiz[] = [];

  for (const quiz of visible as any[]) {
    const attempts = byQuiz.get(String(quiz._id)) || [];
    const endTime = bakedEndTime(quiz);
    let finished = attempts.filter(a => a.status === 'submitted' || a.status === 'abandoned' || a.status === 'grading');
    let inProgress = attempts.filter(a => a.status === 'in_progress');

    if (opts.autoAbandon && endTime && now > endTime && inProgress.length) {
      for (const ip of inProgress) {
        ip.status = 'abandoned';
        ip.abandonedAt = now;
        await ip.save();
        finished.push(ip);
      }
      inProgress = [];
    }

    const latestAttempt = finished[0] || inProgress[0] || null;
    const row = schedMap.get(String(quiz._id)) || null;
    const dueAt = row?.dueAt ? new Date(row.dueAt) : endTime;
    const policy = row ? policyFromRow(row) : mergePolicy(DEFAULT_POLICY, { latePolicy: 'hard_lock' });

    // Only a FINISHED attempt counts as a submission for status purposes; an
    // in-progress one keeps the student in 'in_progress' rather than 'submitted'.
    const done = finished[0];
    const submission = done
      ? { status: done.status === 'grading' ? 'submitted' : 'submitted', submittedAt: done.submittedAt || done.createdAt }
      : (inProgress.length ? { status: 'in_progress', submittedAt: null } : null);

    out.push({
      quiz,
      schedule: row,
      attempts,
      latestAttempt,
      attemptCount: finished.length,
      hasInProgress: inProgress.length > 0 && (!endTime || now <= endTime),
      dueAt,
      startAt: row?.startAt ? new Date(row.startAt) : null,
      source: row ? 'schedule' : 'baked',
      latePolicy: policy.latePolicy,
      status: computeStatus({ policy, dueAt, submission }),
    });
  }

  return out;
}

export interface AssignedSnippet {
  assessment: any;
  submission: any | null;
  status: AssessmentStatusKind;
}

/** Code-snippet assessments assigned to this student's batch. */
export async function resolveAssignedSnippets(
  tenantId: string,
  studentId: string,
  batchId: string | null,
): Promise<AssignedSnippet[]> {
  if (!batchId) return [];   // no batch → nothing assigned (matches the student view)

  const assessments = await CodeSnippetAssessment.find({
    tenantId, status: 'published', batchIds: batchId,
  }).sort({ createdAt: -1 }).lean();
  if (!assessments.length) return [];

  const subs = await CodeSnippetSubmission.find({
    assessmentId: { $in: assessments.map((a: any) => a._id) },
    studentId: new mongoose.Types.ObjectId(studentId),
  }).sort({ createdAt: -1 }).lean();

  const byAssessment = new Map<string, any>();
  for (const s of subs) if (!byAssessment.has(String(s.assessmentId))) byAssessment.set(String(s.assessmentId), s);

  return (assessments as any[]).map(a => {
    const sub = byAssessment.get(String(a._id)) || null;
    const dueAt = a.dueDate ? new Date(a.dueDate) : null;
    return {
      assessment: a,
      submission: sub,
      status: computeStatus({
        policy: DEFAULT_POLICY,
        dueAt,
        submission: sub ? { status: sub.status, submittedAt: sub.submittedAt || sub.createdAt, graded: sub.status === 'graded' } : null,
      }),
    };
  });
}

/** Roll a list of statuses into the counts every summary screen needs. */
export function tallyStatuses(statuses: AssessmentStatusKind[]) {
  const done = statuses.filter(s => DONE_STATUSES.includes(s)).length;
  const missed = statuses.filter(s => s === 'missed').length;
  return {
    total: statuses.length,
    completed: done,
    pending: statuses.filter(s => PENDING_STATUSES.includes(s)).length,
    missed,
    completionRate: statuses.length ? Math.round((done / statuses.length) * 100) : 0,
  };
}

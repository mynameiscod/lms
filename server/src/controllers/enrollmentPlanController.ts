import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import WeekendPlan from '../models/WeekendPlan';
import LearningContentLibrary from '../models/LearningContentLibrary';
import User from '../models/User';
import QuizAttempt from '../models/QuizAttempt';
import Submission from '../models/Submission';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import InterviewAttempt from '../models/InterviewAttempt';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';
import InterviewTemplate from '../models/InterviewTemplate';
import { ensureDayContentGenerated } from '../services/dayContentGeneratorService';
import { milestoneForDay } from '../utils/planMilestones';
import InterviewAssignment from '../models/InterviewAssignment';
import BatchOffering from '../models/BatchOffering';
import { effectiveItemsForDay, holidaySet } from './batchOfferingController';
import { workingDateForDay, planDayForDate, workingDayCount } from '../utils/planSchedule';
import * as razorpay from '../services/razorpayService';

const tenantId = (req: Request): string => (req as any).user?.tenantId || '';
const userId   = (req: Request): string => (req as any).user?.id || '';

const toOid = (s: any) => (mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : s);

// Deep-link a module activity to its student-facing page.
function launchPath(kind: string, sourceId: string): string {
  switch (kind) {
    case 'quiz':          return `/quiz/${sourceId}/take`;
    case 'assignment':    return `/assignments/${sourceId}/workspace`;
    case 'mockInterview': return `/student/interviews/take/${sourceId}`;
    case 'codeSnippet':   return `/coding-snippets`;
    default:              return '';
  }
}

/**
 * Resolve the per-student status of module activities (quiz/assignment/code
 * snippet/mock interview) referenced on a day. "attempted" = has any submission/
 * attempt (drives must-attempt gating + day completion). Also returns a display
 * status + best score. Queried in bulk per kind.
 */
export async function resolveModuleStatuses(
  studentId: string,
  items: Array<{ kind?: string; sourceId?: any }>
): Promise<Record<string, { attempted: boolean; status: string; score: number | null }>> {
  const out: Record<string, { attempted: boolean; status: string; score: number | null }> = {};
  const byKind: Record<string, string[]> = {};
  for (const it of items) {
    if (it.kind && it.kind !== 'content' && it.sourceId) {
      (byKind[it.kind] ||= []).push(it.sourceId.toString());
    }
  }

  // Quiz — QuizAttempt {quizId:String, studentId:String, status, percentage, passed}
  if (byKind.quiz?.length) {
    const rows = await QuizAttempt.find({ studentId, quizId: { $in: byKind.quiz }, status: { $in: ['submitted', 'grading'] } })
      .select('quizId percentage passed').lean();
    const best: Record<string, { score: number | null; passed: boolean }> = {};
    rows.forEach((r: any) => {
      const k = r.quizId.toString();
      const sc = typeof r.percentage === 'number' ? r.percentage : null;
      if (!best[k] || (sc ?? -1) > (best[k].score ?? -1)) best[k] = { score: sc, passed: !!r.passed };
    });
    for (const id of byKind.quiz) out[id] = best[id]
      ? { attempted: true, status: best[id].passed ? 'passed' : 'submitted', score: best[id].score }
      : { attempted: false, status: 'not_started', score: null };
  }

  // Assignment — Submission {assignment:ObjectId, student:ObjectId, status, percentage, submittedAt}
  if (byKind.assignment?.length) {
    const ids = byKind.assignment.map(toOid);
    const rows = await Submission.find({ student: toOid(studentId), assignment: { $in: ids }, submittedAt: { $ne: null } })
      .select('assignment percentage status').lean();
    const map: Record<string, any> = {};
    rows.forEach((r: any) => { map[r.assignment.toString()] = r; });
    for (const id of byKind.assignment) {
      const r = map[id];
      out[id] = r
        ? { attempted: true, status: r.status === 'graded' ? 'graded' : 'submitted', score: typeof r.percentage === 'number' ? r.percentage : null }
        : { attempted: false, status: 'not_started', score: null };
    }
  }

  // Code Snippet — CodeSnippetSubmission {assessmentId:ObjectId, studentId:ObjectId, status, score}
  if (byKind.codeSnippet?.length) {
    const ids = byKind.codeSnippet.map(toOid);
    const rows = await CodeSnippetSubmission.find({ studentId: toOid(studentId), assessmentId: { $in: ids } })
      .select('assessmentId status score').lean();
    const map: Record<string, any> = {};
    rows.forEach((r: any) => { map[r.assessmentId.toString()] = r; });
    for (const id of byKind.codeSnippet) {
      const r = map[id];
      out[id] = r
        ? { attempted: true, status: r.status === 'graded' ? 'graded' : 'submitted', score: typeof r.score === 'number' ? r.score : null }
        : { attempted: false, status: 'not_started', score: null };
    }
  }

  // Mock Interview — InterviewAttempt {templateId:ObjectId, studentId:ObjectId, status, overallPercentage}
  if (byKind.mockInterview?.length) {
    const ids = byKind.mockInterview.map(toOid);
    const rows = await InterviewAttempt.find({
      studentId: toOid(studentId), templateId: { $in: ids },
      status: { $in: ['submitted', 'under_review', 'evaluated', 'published'] },
    }).select('templateId overallPercentage status').lean();
    const best: Record<string, any> = {};
    rows.forEach((r: any) => {
      const k = r.templateId.toString();
      const sc = typeof r.overallPercentage === 'number' ? r.overallPercentage : null;
      if (!best[k] || (sc ?? -1) > (best[k].score ?? -1)) best[k] = { score: sc, status: r.status };
    });
    for (const id of byKind.mockInterview) out[id] = best[id]
      ? { attempted: true, status: ['evaluated', 'published'].includes(best[id].status) ? 'evaluated' : 'submitted', score: best[id].score }
      : { attempted: false, status: 'not_started', score: null };
  }

  return out;
}

// True when a day item is "done" for must-attempt gating/day-completion.
export function itemDone(
  item: any,
  dayNumber: number,
  completedItems: Array<{ contentId: string; dayNumber: number }>,
  moduleStatus: Record<string, { attempted: boolean }>
): boolean {
  // Optional / informational items (e.g. a physical in-person mock interview that
  // the trainer schedules separately) never block day completion or gating.
  if (item.required === false) return true;
  const kind = item.kind || 'content';
  if (kind === 'content') {
    return !!item.contentId && completedItems.some(ci => ci.contentId === item.contentId.toString() && ci.dayNumber === dayNumber);
  }
  return !!item.sourceId && !!moduleStatus[item.sourceId.toString()]?.attempted;
}

// ─── Weekday calculator ──────────────────────────────────────────────────────
// Returns the calendar date for a given plan day number starting from startDate.
// weekdays only (Mon-Fri), startDate is day 1.
function weekdayForDay(startDate: Date, dayNumber: number): Date {
  const d = new Date(startDate);
  d.setHours(0, 0, 0, 0);
  let remaining = dayNumber - 1;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--; // skip sat(6) and sun(0)
  }
  return d;
}

// Returns which plan day number corresponds to today, or null if before start
export function currentPlanDay(startDate: Date, totalDays: number): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  if (today < start) return null;

  let weekdayCount = 0;
  const cursor = new Date(start);
  while (cursor <= today) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) weekdayCount++;
    if (cursor.getTime() === today.getTime()) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return Math.min(weekdayCount, totalDays);
}

// ─── Cohort schedule anchor ──────────────────────────────────────────────────
// Real batch students share ONE curriculum day regardless of when they enrolled.
// The cohort's anchor is the CLASS start date — the earliest enrollment start date for
// that batch+curriculum (what the admin set when the batch began), NOT the batch record's
// creation date. A late joiner (later enrollment start) still anchors to that earliest
// date, so the whole cohort is on the same day and they can catch up on earlier days.
// The batch's holiday list is skipped in the day count. Assessment free-preview
// enrollments keep their own per-student start (funnel pacing).
export async function resolveSchedule(enrollment: any, tId: any): Promise<{ start: Date; cohort: boolean; holidays: Set<string> }> {
  if (!enrollment?.previewOnly && enrollment?.batchId) {
    const BatchModel = mongoose.model('Batch');
    const [batch, firstEnrollment] = await Promise.all([
      BatchModel.findOne({ _id: enrollment.batchId, tenantId: tId }).select('holidays').lean() as any,
      CurriculumEnrollment.findOne({ tenantId: tId, batchId: enrollment.batchId, curriculumId: enrollment.curriculumId })
        .sort({ startDate: 1 }).select('startDate').lean() as any,
    ]);
    const start = firstEnrollment?.startDate || enrollment.startDate;
    return { start: new Date(start), cohort: true, holidays: new Set<string>(batch?.holidays || []) };
  }
  return { start: new Date(enrollment.startDate), cohort: false, holidays: new Set<string>() };
}

// Bulk version for admin lists — resolve the cohort start (earliest enrollment start) +
// holidays per batch in a couple of queries, then a sync resolver per enrollment.
async function bulkScheduleResolver(enrollments: any[], tId: any): Promise<(e: any) => { start: Date; cohort: boolean; holidays: Set<string> }> {
  const batchIds = [...new Set(enrollments.filter(e => !e.previewOnly && e.batchId).map(e => String(e.batchId)))];
  const startByBatchCurr: Record<string, Date> = {};
  const holidaysByBatch: Record<string, Set<string>> = {};
  if (batchIds.length) {
    const BatchModel = mongoose.model('Batch');
    const [batches, firsts] = await Promise.all([
      BatchModel.find({ _id: { $in: batchIds }, tenantId: tId }).select('holidays').lean() as any,
      CurriculumEnrollment.aggregate([
        { $match: { tenantId: tId, batchId: { $in: batchIds.map(id => new mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: { batchId: '$batchId', curriculumId: '$curriculumId' }, start: { $min: '$startDate' } } },
      ]),
    ]);
    (batches as any[]).forEach(b => { holidaysByBatch[String(b._id)] = new Set<string>(b.holidays || []); });
    (firsts as any[]).forEach(f => { startByBatchCurr[`${f._id.batchId}_${f._id.curriculumId}`] = new Date(f.start); });
  }
  return (e: any) => {
    if (!e.previewOnly && e.batchId) {
      const start = startByBatchCurr[`${e.batchId}_${e.curriculumId}`] || new Date(e.startDate);
      return { start: new Date(start), cohort: true, holidays: holidaysByBatch[String(e.batchId)] || new Set<string>() };
    }
    return { start: new Date(e.startDate), cohort: false, holidays: new Set<string>() };
  };
}

// ─── Admin: List all enrollments for a curriculum ────────────────────────────

export const listEnrollmentsByCurriculum = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId } = req.params;
    const { status, batchId, search } = req.query;

    const filter: any = { tenantId: tId, curriculumId };
    if (status)  filter.status  = status;
    if (batchId) filter.batchId = batchId;
    if (search)  filter.studentName = { $regex: search, $options: 'i' };

    const enrollments = await CurriculumEnrollment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // Attach computed currentDay from today's date
    const curriculum = await LearningCurriculum.findById(curriculumId).select('totalDays').lean();
    const totalDays = curriculum?.totalDays || 145;

    const sched = await bulkScheduleResolver(enrollments, tId);
    const enriched = enrollments.map(e => {
      const s = sched(e);
      return {
        ...e,
        todayPlanDay: e.status === 'active' ? workingDayCount(s.start, totalDays, s.holidays) : null,
        progressPct: Math.round(((e.completedDays?.length || 0) / totalDays) * 100),
      };
    });

    res.json({ enrollments: enriched, total: enriched.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list enrollments', error: err });
  }
};

// ─── Admin: List all enrollments (across curricula) ──────────────────────────

export const listAllEnrollments = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { status, curriculumId, batchId, search } = req.query;

    const filter: any = { tenantId: tId };
    if (status)       filter.status       = status;
    if (curriculumId) filter.curriculumId = curriculumId;
    if (batchId)      filter.batchId      = batchId;
    if (search)       filter.studentName  = { $regex: search, $options: 'i' };

    const enrollments = await CurriculumEnrollment.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    res.json({ enrollments, total: enrollments.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list enrollments', error: err });
  }
};

// ─── Enroll a single student ──────────────────────────────────────────────────

export const enrollStudent = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const {
      curriculumId, studentId, startDate, batchId, batchName, offeringId,
      settings,
    } = req.body;

    // Validate curriculum
    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    if (!curriculum.isPublished) return res.status(400).json({ message: 'Curriculum is not published' });

    // Get student info
    const student = await User.findById(studentId).select('firstName lastName email').lean() as any;
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const enrollment = await CurriculumEnrollment.create({
      tenantId: tId,
      curriculumId,
      curriculumTitle: curriculum.title,
      studentId,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      studentEmail: student.email,
      batchId: batchId || undefined,
      batchName: batchName || undefined,
      offeringId: offeringId || undefined,
      startDate: new Date(startDate),
      settings: settings || {},
      enrolledBy: userId(req),
    });

    // Increment enrollment count on curriculum
    await LearningCurriculum.updateOne({ _id: curriculumId }, { $inc: { enrollmentCount: 1 } });

    res.status(201).json(enrollment);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Student is already enrolled in this curriculum' });
    }
    res.status(500).json({ message: 'Failed to enroll student', error: err });
  }
};

// ─── Enroll an entire batch ───────────────────────────────────────────────────

export const enrollBatch = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId, batchId, startDate, settings, offeringId } = req.body;

    // Validate curriculum
    const curriculum = await LearningCurriculum.findOne({ _id: curriculumId, tenantId: tId }).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });
    if (!curriculum.isPublished) return res.status(400).json({ message: 'Curriculum is not published' });

    // Get batch info
    const BatchModel = mongoose.model('Batch');
    const batch = await BatchModel.findOne({ _id: batchId, tenantId: tId }).lean() as any;
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    // Get all students in the batch via User.batchId
    const batchStudents = await User.find({
      batchId: new mongoose.Types.ObjectId(batchId),
      tenantId: tId,
    }).select('firstName lastName email').lean() as any[];

    if (batchStudents.length === 0) {
      return res.status(400).json({ message: 'No students found in this batch' });
    }

    const start = new Date(startDate);
    const docs = batchStudents.map((student: any) => ({
      tenantId: tId,
      curriculumId,
      curriculumTitle: curriculum.title,
      studentId: student._id,
      studentName: `${student.firstName} ${student.lastName}`.trim(),
      studentEmail: student.email,
      batchId,
      batchName: batch.name,
      offeringId: offeringId || undefined,
      startDate: start,
      settings: settings || {},
      enrolledBy: userId(req),
    }));

    const result = await CurriculumEnrollment.insertMany(docs, { ordered: false });
    await LearningCurriculum.updateOne({ _id: curriculumId }, { $inc: { enrollmentCount: result.length } });

    res.status(201).json({
      enrolled: result.length,
      skipped: docs.length - result.length,
      message: `Enrolled ${result.length} students`,
    });
  } catch (err: any) {
    const writeErrors = err.writeErrors || err.result?.result?.writeErrors || [];
    if (writeErrors.length > 0 || err.code === 11000) {
      const ok = err.result?.nInserted ?? err.result?.insertedCount ?? 0;
      await LearningCurriculum.updateOne({ _id: req.body.curriculumId }, { $inc: { enrollmentCount: ok } });
      return res.status(207).json({
        enrolled: ok,
        skipped: writeErrors.length,
        message: ok > 0
          ? `Enrolled ${ok} students (${writeErrors.length} already enrolled)`
          : `All ${writeErrors.length} student(s) already enrolled in this curriculum`,
      });
    }
    res.status(500).json({ message: 'Failed to enroll batch', error: err });
  }
};

// ─── Get single enrollment ────────────────────────────────────────────────────

export const getEnrollment = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const enrollment = await CurriculumEnrollment.findOne({ _id: req.params.id, tenantId: tId }).lean();
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const curriculum = await LearningCurriculum.findById(enrollment.curriculumId).select('totalDays').lean();
    const totalDays = curriculum?.totalDays || 145;
    const { start: anchorStart, holidays: anchorHolidays } = await resolveSchedule(enrollment, tId);

    res.json({
      ...enrollment,
      todayPlanDay: enrollment.status === 'active' ? workingDayCount(anchorStart, totalDays, anchorHolidays) : null,
      progressPct: Math.round(((enrollment.completedDays?.length || 0) / totalDays) * 100),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get enrollment', error: err });
  }
};

// ─── Update enrollment status ─────────────────────────────────────────────────

export const updateStatus = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { status } = req.body;
    const allowed: string[] = ['active', 'paused', 'completed', 'dropped'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const update: any = { status };
    if (status === 'completed') update.completedAt = new Date();

    const enrollment = await CurriculumEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId },
      { $set: update },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err });
  }
};

// ─── Update enrollment settings ───────────────────────────────────────────────

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { startDate, settings } = req.body;
    const patch: any = {};
    if (settings)  patch.settings  = settings;
    if (startDate) patch.startDate = new Date(startDate);

    const enrollment = await CurriculumEnrollment.findOneAndUpdate(
      { _id: req.params.id, tenantId: tId },
      { $set: patch },
      { new: true }
    );
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings', error: err });
  }
};

// ─── Student: get my enrollments ─────────────────────────────────────────────

export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);

    const enrollments = await CurriculumEnrollment.find({ tenantId: tId, studentId: sId, status: { $in: ['active', 'paused'] } })
      .sort({ createdAt: -1 })
      .lean();

    // For each enrollment, compute today's plan day and today's content
    const curricula = await LearningCurriculum.find({
      _id: { $in: enrollments.map(e => e.curriculumId) }
    }).select('totalDays').lean();
    const currMap: Record<string, number> = {};
    curricula.forEach(c => { currMap[c._id.toString()] = c.totalDays; });

    const enriched = await Promise.all(enrollments.map(async e => {
      const totalDays = currMap[e.curriculumId.toString()] || 145;
      const { start: anchorStart, holidays: anchorHolidays } = await resolveSchedule(e, tId);
      const todayDay  = workingDayCount(anchorStart, totalDays, anchorHolidays);

      let todayPlan = null;
      if (todayDay) {
        todayPlan = await DayPlan.findOne({ curriculumId: e.curriculumId, dayNumber: todayDay }).lean();
      }

      return {
        ...e,
        totalDays,
        todayPlanDay: todayDay,
        progressPct: Math.round(((e.completedDays?.length || 0) / totalDays) * 100),
        todayPlan,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get enrollments', error: err });
  }
};

// ─── Student: mark content as complete ──────────────────────────────────────

export const markContentComplete = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);
    const { contentId, dayNumber } = req.body;

    const enrollment = await CurriculumEnrollment.findOne({
      _id: req.params.id, tenantId: tId, studentId: sId,
    });
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    // Add completed item if not already recorded
    const alreadyDone = enrollment.completedItems.some(
      i => i.contentId === contentId && i.dayNumber === dayNumber
    );
    if (!alreadyDone) {
      enrollment.completedItems.push({ contentId, dayNumber, completedAt: new Date() });
      (enrollment as any).xp = ((enrollment as any).xp || 0) + 10; // +10 XP per item
    }
    // Record today's activity (streak) + timestamp.
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!(enrollment as any).activityDates?.includes(todayStr)) {
      (enrollment as any).activityDates = [...((enrollment as any).activityDates || []), todayStr];
    }

    // Check if all items in this day are done
    const dayPlan = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber }).lean();
    if (dayPlan) {
      // A day is complete when every (override-applied) item is done — content
      // (via completedItems) and module activities (via a submission; must-attempt).
      const offering = enrollment.offeringId
        ? await BatchOffering.findOne({ _id: enrollment.offeringId, tenantId: tId }).lean()
        : null;
      const dayItems = effectiveItemsForDay(dayPlan.items, offering, dayNumber);
      const moduleStatus = await resolveModuleStatuses(sId, dayItems);
      const allDone = dayItems.every((item: any) => itemDone(item, dayNumber, enrollment.completedItems, moduleStatus));
      if (allDone && !enrollment.completedDays.includes(dayNumber)) {
        enrollment.completedDays.push(dayNumber);
        // Advance currentDay
        enrollment.currentDay = Math.max(enrollment.currentDay, dayNumber + 1);
        (enrollment as any).xp = ((enrollment as any).xp || 0) + 50; // +50 XP for finishing a day
      }
    }

    enrollment.lastActivityAt = new Date();
    await enrollment.save();

    res.json({
      completedItems: enrollment.completedItems.length,
      completedDays: enrollment.completedDays,
      currentDay: enrollment.currentDay,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark complete', error: err });
  }
};

// Pending standalone (ad-hoc, non-plan) module assignments for a student, using
// each module's own targeting. Deduped against plan task keys (`kind:sourceId`).
async function getAdhocTasks(sId: string, tId: string, planKeys: Set<string>): Promise<any[]> {
  const out: any[] = [];
  const user = await User.findById(sId).select('batchId').lean() as any;
  const batchId = user?.batchId ? user.batchId.toString() : null;
  const oid = (x: string) => (mongoose.Types.ObjectId.isValid(x) ? new mongoose.Types.ObjectId(x) : x);
  const push = (kind: string, id: string, title: string, due: any, launch: string) => {
    if (planKeys.has(`${kind}:${id}`)) return;
    out.push({
      source: 'adhoc', enrollmentId: null, curriculumTitle: 'Direct assignment', dayNumber: null,
      kind, title, contentType: kind,
      dueAt: due ? new Date(due).toISOString() : null,
      overdue: due ? new Date(due).getTime() < Date.now() : false,
      launchPath: launch,
    });
  };

  // Quiz
  try {
    const access: any[] = [{ accessibleTo: 'everyone' }, { access: 'public' }, { accessibleTo: 'individual', selectedStudents: sId }];
    if (batchId) access.push({ accessibleTo: 'batch_wise', selectedBatches: batchId });
    const quizzes = await Quiz.find({ tenantId: tId, isActive: true, isExternalQuiz: { $ne: true }, archivedAt: null, $or: access }).select('title endDate').lean();
    if (quizzes.length) {
      const ids = quizzes.map((q: any) => q._id.toString());
      const done = await QuizAttempt.find({ studentId: sId, quizId: { $in: ids }, status: 'submitted' }).select('quizId').lean();
      const doneSet = new Set(done.map((d: any) => d.quizId.toString()));
      quizzes.forEach((q: any) => { if (!doneSet.has(q._id.toString())) push('quiz', q._id.toString(), q.title, q.endDate, `/quiz/${q._id}/take`); });
    }
  } catch (e) { console.warn('[my-tasks] quiz adhoc failed', e); }

  // Assignment
  try {
    const access: any[] = [{ accessibleTo: 'everyone' }, { accessibleTo: 'individual', selectedStudents: sId }];
    if (batchId) access.push({ accessibleTo: 'batch_wise', batch: oid(batchId) });
    const asgs = await Assignment.find({ tenant: oid(tId), status: 'published', $or: access }).select('title dueDate').lean();
    if (asgs.length) {
      const ids = asgs.map((a: any) => a._id);
      const subs = await Submission.find({ student: oid(sId), assignment: { $in: ids }, status: { $in: ['submitted', 'graded'] } }).select('assignment').lean();
      const doneSet = new Set(subs.map((s: any) => s.assignment.toString()));
      asgs.forEach((a: any) => { if (!doneSet.has(a._id.toString())) push('assignment', a._id.toString(), a.title, a.dueDate, `/assignments/${a._id}/workspace`); });
    }
  } catch (e) { console.warn('[my-tasks] assignment adhoc failed', e); }

  // Code Snippet (batch-targeted)
  try {
    if (batchId) {
      const snips = await CodeSnippetAssessment.find({ tenantId: oid(tId), status: 'published', batchIds: batchId }).select('title dueDate').lean();
      if (snips.length) {
        const ids = snips.map((s: any) => s._id);
        const subs = await CodeSnippetSubmission.find({ studentId: oid(sId), assessmentId: { $in: ids } }).select('assessmentId').lean();
        const doneSet = new Set(subs.map((s: any) => s.assessmentId.toString()));
        snips.forEach((s: any) => { if (!doneSet.has(s._id.toString())) push('codeSnippet', s._id.toString(), s.title, s.dueDate, `/coding-snippets`); });
      }
    }
  } catch (e) { console.warn('[my-tasks] snippet adhoc failed', e); }

  // Mock Interview (direct assignments)
  try {
    const asn = await InterviewAssignment.find({ studentId: oid(sId), status: { $in: ['assigned', 'in_progress'] } }).select('templateId dueDate expiresAt').lean();
    if (asn.length) {
      const tplIds = asn.map((a: any) => a.templateId);
      const tpls = await InterviewTemplate.find({ _id: { $in: tplIds } }).select('title').lean();
      const tMap: Record<string, string> = {};
      tpls.forEach((t: any) => { tMap[t._id.toString()] = t.title; });
      asn.forEach((a: any) => { const tid = a.templateId.toString(); push('mockInterview', tid, tMap[tid] || 'Mock Interview', a.dueDate || a.expiresAt, `/student/interviews/take/${tid}`); });
    }
  } catch (e) { console.warn('[my-tasks] interview adhoc failed', e); }

  return out;
}

// ─── Student: unified to-do feed across all active enrollments ────────────────
// Aggregates pending plan activities (content + module) from a window around each
// enrollment's currentDay into one source-tagged list (overdue / today / upcoming).
export const getMyTasks = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);
    const enrolls = await CurriculumEnrollment.find({ tenantId: tId, studentId: sId, status: 'active' }).lean();

    const tasks: any[] = [];
    const planKeys = new Set<string>(); // `${kind}:${sourceId}` of plan module tasks, for ad-hoc dedupe
    for (const en of enrolls) {
      const curriculum = await LearningCurriculum.findById(en.curriculumId).select('title totalDays').lean();
      if (!curriculum) continue;
      const offering = en.offeringId ? await BatchOffering.findOne({ _id: en.offeringId, tenantId: tId }).lean() : null;
      const hSet = offering ? holidaySet(offering) : new Set<string>();
      const { start: anchorStart, holidays: anchorHolidays } = await resolveSchedule(en, tId);

      const from = Math.max(1, en.currentDay - 7);
      const to = Math.min(curriculum.totalDays, en.currentDay + 2);
      const plans = await DayPlan.find({ curriculumId: en.curriculumId, dayNumber: { $gte: from, $lte: to } }).lean();
      const planMap: Record<number, any> = {};
      plans.forEach(p => { planMap[p.dayNumber] = p; });

      for (let day = from; day <= to; day++) {
        const dp = planMap[day];
        if (!dp) continue;
        const items = effectiveItemsForDay(dp.items, offering, day);
        if (items.length === 0) continue;
        const moduleStatus = await resolveModuleStatuses(sId, items);
        const dayDate = offering ? workingDateForDay(offering.startDate, day, hSet) : workingDateForDay(anchorStart, day, anchorHolidays);
        for (const it of items) {
          if (itemDone(it, day, en.completedItems, moduleStatus)) continue;
          const kind = it.kind || 'content';
          const sid = it.sourceId ? it.sourceId.toString() : '';
          if (kind !== 'content' && sid) planKeys.add(`${kind}:${sid}`);
          tasks.push({
            source: 'plan',
            enrollmentId: en._id,
            curriculumTitle: en.curriculumTitle,
            dayNumber: day,
            kind,
            title: it.contentTitle,
            contentType: it.contentType,
            dueAt: dayDate.toISOString(),
            overdue: day < en.currentDay,
            launchPath: kind === 'content' ? `/my-learning/${en._id}/day/${day}` : launchPath(kind, sid),
          });
        }
      }
    }

    // Fold in ad-hoc (non-plan) standalone module assignments.
    const adhoc = await getAdhocTasks(sId, tId, planKeys);
    tasks.push(...adhoc);

    // Sort by due date; tasks with no due date sort last.
    const t = (x: any) => (x.dueAt ? new Date(x.dueAt).getTime() : Number.MAX_SAFE_INTEGER);
    tasks.sort((a, b) => t(a) - t(b));
    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load tasks', error: String(err) });
  }
};

// ─── Admin: stats for a curriculum's enrollments ─────────────────────────────

export const getCurriculumEnrollmentStats = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const { curriculumId } = req.params;

    const [total, active, paused, completed, dropped] = await Promise.all([
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'active' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'paused' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'completed' }),
      CurriculumEnrollment.countDocuments({ tenantId: tId, curriculumId, status: 'dropped' }),
    ]);

    res.json({ total, active, paused, completed, dropped });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get stats', error: err });
  }
};

// ─── Student: get a specific day's plan with full content populated ──────────

export const getStudentDayPlan = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);
    const { id: enrollmentId, day } = req.params;
    const dayNumber = parseInt(day, 10);

    const enrollment = await CurriculumEnrollment.findOne({ _id: enrollmentId, tenantId: tId, studentId: sId }).lean();
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

    const curriculum = await LearningCurriculum.findById(enrollment.curriculumId).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });

    if (dayNumber < 1 || dayNumber > curriculum.totalDays) {
      return res.status(400).json({ message: 'Invalid day number' });
    }

    // Cohort offering (optional): provides the calendar (start + holidays) and
    // per-batch day overrides. Absent → self-paced from enrollment.startDate.
    const offering = enrollment.offeringId
      ? await BatchOffering.findOne({ _id: enrollment.offeringId, tenantId: tId }).lean()
      : null;
    const hSet = offering ? holidaySet(offering) : new Set<string>();

    // Cohort schedule anchor: real batch students share the class start date so the whole
    // cohort is on the same curriculum day (offering, if present, is the calendar).
    const { start: anchorStart, cohort: cohortMode, holidays: anchorHolidays } = await resolveSchedule(enrollment, tId);

    // Sequential lock check: if enforceSequential, previous day must be completed.
    // Skipped for assessment-personalized plans — there the preview paywall is the
    // only intended gate (no confusing "finish day N" on a paid-but-teased day).
    let isLocked = false;
    let lockReason: 'sequential' | 'preview' | 'schedule' | null = null;
    const personalized = !!(curriculum as any).personalizedFor;
    if (enrollment.settings.enforceSequential && dayNumber > 1 && !personalized) {
      const prevDayPlan = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber: dayNumber - 1 }).lean();
      if (prevDayPlan) {
        const gatingItems = effectiveItemsForDay(prevDayPlan.items, offering, dayNumber - 1).filter((i: any) => i.isGating);
        if (gatingItems.length > 0) {
          const prevModuleStatus = await resolveModuleStatuses(sId, gatingItems);
          const allGatingDone = gatingItems.every(gi => itemDone(gi, dayNumber - 1, enrollment.completedItems, prevModuleStatus));
          isLocked = !allGatingDone;
          if (isLocked) lockReason = 'sequential';
        }
      }
    }

    // Assessment-funnel preview gating: free taste, then locked behind the paywall.
    if ((enrollment as any).previewOnly && dayNumber > ((enrollment as any).previewDays || 2)) {
      isLocked = true;
      lockReason = 'preview';
    }

    // Which curriculum day the schedule is on today (cohort batch calendar, or offering).
    const todayPlanDay = offering
      ? planDayForDate(offering.startDate, curriculum.totalDays, hSet)
      : workingDayCount(anchorStart, curriculum.totalDays, anchorHolidays);

    // Cohort schedule gate: you can open any day up to the cohort's current day (to catch
    // up), but future days stay locked until the cohort reaches them.
    if (cohortMode && todayPlanDay != null && dayNumber > todayPlanDay && !isLocked) {
      isLocked = true;
      lockReason = 'schedule';
    }

    // Compute calendar date for this day (offering = holiday-aware cohort calendar)
    const dayDate = offering
      ? workingDateForDay(offering.startDate, dayNumber, hSet)
      : workingDateForDay(anchorStart, dayNumber, anchorHolidays);
    const dueAtForItem = (item: any): string => {
      const off = Number(item.dueOffsetDays || 0);
      return off > 0
        ? (offering ? workingDateForDay(offering.startDate, dayNumber + off, hSet) : workingDateForDay(anchorStart, dayNumber + off, anchorHolidays)).toISOString()
        : dayDate.toISOString();
    };

    // Find topic for this day
    const topic = curriculum.topics.find(t => dayNumber >= t.startDay && dayNumber <= t.endDay);

    // Fetch day plan + apply offering's per-batch overrides
    const dayPlan = await DayPlan.findOne({ curriculumId: enrollment.curriculumId, dayNumber }).lean();
    const dayItems: any[] = dayPlan ? effectiveItemsForDay(dayPlan.items, offering, dayNumber) : [];

    // Phase 2: lazy AI content generation for assessment-personalized plans. When an
    // accessible day has no content yet, kick off generation in the background (atomic
    // claim prevents duplicates); the lesson appears on the next fetch. Status is
    // surfaced so the client can show "preparing" + auto-refresh.
    let aiGenStatus: string | undefined = (dayPlan as any)?.aiGenStatus;
    if ((curriculum as any).personalizedFor && !isLocked && dayPlan && dayItems.length === 0) {
      aiGenStatus = 'generating';
      // Background, best-effort; the service's atomic claim de-dupes concurrent opens.
      ensureDayContentGenerated(curriculum as any, dayNumber, dayPlan._id as any)
        .catch((e) => console.error('[dayGen] background generation failed:', e?.message || e));
    }

    // Populate items — library content AND module activities (quiz/assignment/
    // code snippet/mock interview). Module items resolve their per-student status
    // on demand and carry a launchPath to their own student UI.
    let populatedItems: any[] = [];
    let dayJustCompleted = false;
    if (dayItems.length > 0) {
      const contentItems = dayItems.filter((it: any) => (!it.kind || it.kind === 'content') && it.contentId);
      const contentIds = contentItems.map((i: any) => i.contentId);
      const contents = await LearningContentLibrary.find({ _id: { $in: contentIds } }).lean();
      const contentMap: Record<string, any> = {};
      contents.forEach(c => { contentMap[c._id.toString()] = c; });

      const moduleStatus = await resolveModuleStatuses(sId, dayItems);

      populatedItems = dayItems.map((item: any) => {
        const kind = item.kind || 'content';
        if (kind === 'content') {
          const cid = item.contentId!.toString();
          return {
            ...item, kind,
            content: contentMap[cid] || null,
            dueAt: dueAtForItem(item),
            isCompleted: enrollment.completedItems.some(ci => ci.contentId === cid && ci.dayNumber === dayNumber),
          };
        }
        const sid = item.sourceId ? item.sourceId.toString() : '';
        // Physical / in-person mock interview placeholder: no AI source; the real
        // session is scheduled separately and shown in "My Interviews".
        const isPhysical = kind === 'mockInterview' && (item.sourceModel === 'physical' || !sid);
        const st = moduleStatus[sid] || { attempted: false, status: 'not_started', score: null };
        return {
          ...item, kind,
          content: null,
          moduleStatus: isPhysical ? 'in_person' : st.status,
          moduleScore: isPhysical ? null : st.score,
          launchPath: isPhysical ? '/my-interviews' : launchPath(kind, sid),
          dueAt: dueAtForItem(item),
          isCompleted: isPhysical ? false : st.attempted,
        };
      });

      // Derive day completion (must-attempt): when every item is done, mark the
      // day complete and advance currentDay. Persisted idempotently.
      const allDone = dayItems.every((it: any) => itemDone(it, dayNumber, enrollment.completedItems, moduleStatus));
      if (allDone && !enrollment.completedDays.includes(dayNumber)) {
        await CurriculumEnrollment.updateOne(
          { _id: enrollmentId },
          { $addToSet: { completedDays: dayNumber }, $max: { currentDay: dayNumber + 1 }, $set: { lastActivityAt: new Date() } }
        );
        dayJustCompleted = true;
      }
    }

    // Get completion info
    const isDayCompleted = enrollment.completedDays.includes(dayNumber) || dayJustCompleted;

    res.json({
      enrollment: {
        _id: enrollment._id,
        curriculumId: enrollment.curriculumId,
        curriculumTitle: enrollment.curriculumTitle,
        status: enrollment.status,
        settings: enrollment.settings,
        currentDay: enrollment.currentDay,
        completedDays: enrollment.completedDays,
        totalDays: curriculum.totalDays,
        startDate: enrollment.startDate,
      },
      curriculum: { title: curriculum.title, totalDays: curriculum.totalDays, topics: curriculum.topics },
      dayNumber,
      dayDate: dayDate.toISOString(),
      topic: topic || null,
      items: populatedItems,
      isDayCompleted,
      isLocked,
      lockReason,
      todayPlanDay,
      aiGenStatus: aiGenStatus || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get day plan', error: err });
  }
};

// ─── Student: "My Journey" — the full structured plan (weeks, milestones,
// progress, preview/lock). Powers the Result-page preview + the Journey view. ──
export const getJourney = async (req: Request, res: Response) => {
  try {
    const tId = tenantId(req);
    const sId = userId(req);
    const { id: enrollmentId } = req.params;

    const enrollment = await CurriculumEnrollment.findOne({ _id: enrollmentId, tenantId: tId, studentId: sId }).lean();
    if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });
    const curriculum = await LearningCurriculum.findById(enrollment.curriculumId).lean();
    if (!curriculum) return res.status(404).json({ message: 'Curriculum not found' });

    const totalDays = curriculum.totalDays;
    const previewOnly = !!(enrollment as any).previewOnly;
    const previewDays = (enrollment as any).previewDays || 2;
    const completed = new Set((enrollment.completedDays || []).filter((d) => d >= 1 && d <= totalDays));
    const currentDay = enrollment.currentDay || 1;

    // Cohort schedule: batch students share the batch's start date so everyone is on the
    // same curriculum "today". A late joiner lands on the cohort's current day and can go
    // back to catch up on earlier days; future days stay locked until the cohort reaches them.
    const { start: anchorStart, cohort: cohortMode, holidays: anchorHolidays } = await resolveSchedule(enrollment, tId);
    const todayPlanDay = workingDayCount(anchorStart, totalDays, anchorHolidays);
    const cohortDay = cohortMode && todayPlanDay != null ? todayPlanDay : null;

    const plans = await DayPlan.find({ curriculumId: curriculum._id }).select('dayNumber title items aiGenStatus').lean();
    const planByDay: Record<number, any> = {};
    plans.forEach((p) => { planByDay[p.dayNumber] = p; });
    const topicForDay = (d: number) => (curriculum.topics || []).find((t) => d >= t.startDay && d <= t.endDay);

    // Milestones: a mock interview at the end of every 3rd week; projects mid + final.
    const STUDY_PER_WEEK = 5;
    const totalWeeks = Math.max(1, Math.ceil(totalDays / STUDY_PER_WEEK));
    const milestoneByDay: Record<number, { kind: string; title: string }> = {};
    for (let d = 1; d <= totalDays; d++) { const mi = milestoneForDay(totalDays, d); if (mi) milestoneByDay[d] = mi; }

    const weeks: any[] = [];
    for (let d = 1; d <= totalDays; d++) {
      const w = Math.ceil(d / STUDY_PER_WEEK);
      if (!weeks[w - 1]) weeks[w - 1] = { week: w, title: '', days: [], milestones: [] };
      const t = topicForDay(d);
      const dp = planByDay[d];
      // Locked: preview paywall, or (cohort) a future day the cohort hasn't reached yet.
      const locked = previewOnly ? d > previewDays : (cohortDay != null ? d > cohortDay : false);
      const status = completed.has(d)
        ? 'completed'
        : cohortDay != null
          ? (d === cohortDay ? 'current' : d < cohortDay ? 'available' : 'locked')
          : (d === currentDay ? 'current' : locked ? 'locked' : 'available');
      weeks[w - 1].days.push({
        day: d,
        title: dp?.title || (t ? t.title : `Day ${d}`),
        topic: t ? t.title : null,
        status,
        locked,
        hasContent: !!(dp && dp.items && dp.items.length > 0),
        generating: dp?.aiGenStatus === 'generating',
        milestone: milestoneByDay[d] || null,
        date: workingDateForDay(anchorStart, d, anchorHolidays).toISOString(),
      });
    }
    weeks.forEach((wk) => {
      const counts: Record<string, number> = {};
      wk.days.forEach((dd: any) => { if (dd.topic) counts[dd.topic] = (counts[dd.topic] || 0) + 1; });
      wk.title = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || [])[0] || `Week ${wk.week}`;
      wk.milestones = wk.days.filter((dd: any) => dd.milestone).map((dd: any) => ({ day: dd.day, ...dd.milestone }));
    });

    const completedCount = completed.size;
    const percent = totalDays ? Math.round((completedCount / totalDays) * 100) : 0;

    res.json({
      plan: {
        title: curriculum.title,
        targetRole: (curriculum as any).targetCourse || null,
        totalDays,
        totalWeeks,
        pace: (curriculum as any).pace || null,
        weeks,
        milestones: Object.entries(milestoneByDay).map(([d, m]) => ({ day: Number(d), ...m })).sort((a, b) => a.day - b.day),
      },
      progress: { completedDays: completedCount, currentDay: cohortDay != null ? cohortDay : currentDay, todayPlanDay, percent },
      access: {
        previewOnly,
        previewDays,
        lockedFromDay: previewOnly ? previewDays + 1 : null,
        priceInr: razorpay.getPriceInr(tId),
        paymentAvailable: razorpay.isConfigured(tId),
      },
      estimatedEndDate: workingDateForDay(anchorStart, totalDays, anchorHolidays).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to get journey', error: err });
  }
};

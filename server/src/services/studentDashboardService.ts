/**
 * Everything the redesigned student profile screen shows, in one call.
 *
 * Every number here is computed from something the platform actually recorded. Where a
 * source genuinely does not exist the field comes back null or an empty array so the UI
 * can hide that panel — a dashboard that invents a plausible-looking score is worse than
 * one with a gap, because staff will act on it.
 */

import mongoose from 'mongoose';
import User from '../models/User';
import Batch from '../models/Batch';
import Attendance from '../models/Attendance';
import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import Submission from '../models/Submission';
import Assignment from '../models/Assignment';
import LiveClass from '../models/LiveClass';
import LiveClassAttendance from '../models/LiveClassAttendance';
import StudentProgress from '../models/StudentProgress';
import StudentGameStats from '../models/StudentGameStats';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import Subject from '../models/Subject';
import { resolveAssignedQuizzes, tallyStatuses } from './studentWorkService';
import assignmentService from './assignmentService';

const oid = (v: any) => (v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

/** Coder-score band. Thresholds are fixed and stated so the label is reproducible. */
function coderBand(score: number): string {
  if (score >= 2000) return 'Master';
  if (score >= 1000) return 'Expert';
  if (score >= 500) return 'Advanced';
  if (score >= 200) return 'Intermediate';
  return 'Beginner';
}

function perfLabel(p: number): string {
  if (p >= 85) return 'Excellent';
  if (p >= 65) return 'Good';
  if (p >= 40) return 'Average';
  return 'Needs Work';
}

export async function buildStudentDashboard(userId: string, tenantId: string) {
  const uOid = oid(userId)!;
  const tOid = oid(tenantId);
  const tStr = String(tenantId);

  const student: any = await User.findById(uOid)
    .select('firstName lastName email phone profilePicture batchId batchJoinedDate role createdAt')
    .lean();
  if (!student) return null;

  const batchStr = student.batchId ? String(student.batchId) : '';
  const batch: any = batchStr ? await Batch.findById(batchStr).select('name').lean() : null;

  const [
    assignedQuizzes, assignedAssignments, attendanceRows,
    progress, gameStats, snippetSubs,
  ] = await Promise.all([
    resolveAssignedQuizzes(tStr, userId, batchStr || null),
    tOid ? assignmentService.getStudentAssignments(tOid, uOid, oid(batchStr) || undefined) : Promise.resolve([] as any[]),
    Attendance.find({ studentId: uOid, ...(tOid ? { tenantId: tOid } : {}) }).sort({ date: -1 }).lean(),
    StudentProgress.find({ userId: uOid, ...(tOid ? { tenantId: tOid } : {}) }).lean(),
    StudentGameStats.findOne({ tenantId: tStr, studentId: uOid }).lean(),
    CodeSnippetSubmission.find({ studentId: uOid, ...(tOid ? { tenantId: tOid } : {}) }).sort({ createdAt: -1 }).lean(),
  ]);

  // ── Live classes: attended vs scheduled for this batch ──────────────────────
  let classesAttended = 0, classesTotal = 0;
  if (tOid) {
    const classFilter: any = { tenantId: tOid, ...(oid(batchStr) ? { batchId: oid(batchStr) } : {}) };
    classesTotal = await LiveClass.countDocuments(classFilter);
    if (classesTotal > 0) {
      const ids = (await LiveClass.find(classFilter).select('_id').lean()).map((c: any) => c._id);
      classesAttended = await LiveClassAttendance.countDocuments({
        userId: uOid, liveClassId: { $in: ids }, present: true,
      });
    }
  }

  // ── Headline tallies ────────────────────────────────────────────────────────
  const quizTally = tallyStatuses(assignedQuizzes.map(q => q.status));
  const asgTally = tallyStatuses((assignedAssignments as any[]).map(a => a.delivery?.status || 'not_started'));

  const scoredQuizzes = assignedQuizzes.filter(q => q.latestAttempt && q.quiz?.totalMarks > 0);
  const avgQuizScore = scoredQuizzes.length
    ? Math.round(scoredQuizzes.reduce((s, q) =>
        s + ((q.latestAttempt.obtainedMarks || 0) / q.quiz.totalMarks) * 100, 0) / scoredQuizzes.length)
    : 0;

  const present = attendanceRows.filter((a: any) => a.status === 'present').length;
  const late = attendanceRows.filter((a: any) => a.status === 'late').length;
  const attendancePct = pct(present + late, attendanceRows.length);

  const coderScore = (gameStats as any)?.xpTotal || 0;

  // Overall progress: the average of the things we can actually measure. Panels with
  // no data are excluded rather than counted as zero, which would drag it down unfairly.
  const parts: number[] = [];
  if (quizTally.total) parts.push(quizTally.completionRate);
  if (asgTally.total) parts.push(asgTally.completionRate);
  if (attendanceRows.length) parts.push(attendancePct);
  if (classesTotal) parts.push(pct(classesAttended, classesTotal));
  const overallProgress = parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;

  // ── Rank within batch, by average quiz score ────────────────────────────────
  // Stated explicitly because "rank" is meaningless without a basis. Null when the
  // student has no batch or nobody in it has attempted anything.
  let rank: number | null = null, rankOf: number | null = null;
  if (batchStr) {
    const peers = await User.find({ tenantId: tStr, role: 'STUDENT', isActive: true, batchId: oid(batchStr) })
      .select('_id').lean();
    const peerIds = peers.map((p: any) => String(p._id));

    // One aggregation for the whole batch. This was a query per peer, which made the
    // page take ~2.8s for a batch of 18 and would have scaled straight into timeouts on
    // a batch of 200 — a page-load cost that grows with class size is a bug waiting.
    const scores = await QuizAttempt.aggregate([
      {
        $match: {
          tenantId: tStr, studentId: { $in: peerIds },
          status: { $in: ['submitted', 'grading'] }, totalMarks: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$studentId',
          avg: { $avg: { $multiply: [{ $divide: ['$obtainedMarks', '$totalMarks'] }, 100] } },
        },
      },
      { $sort: { avg: -1 } },
    ]);

    if (scores.length) {
      rankOf = scores.length;
      const idx = scores.findIndex((s: any) => String(s._id) === String(uOid));
      rank = idx >= 0 ? idx + 1 : null;
    }
  }

  // ── Learning progress by subject ────────────────────────────────────────────
  const subjectIds: any[] = [];
  for (const p of progress as any[]) for (const s of (p.subjectProgress || [])) subjectIds.push(s.subjectId);
  const subjects = subjectIds.length
    ? await Subject.find({ _id: { $in: subjectIds } }).select('name').lean()
    : [];
  const subjectName = new Map(subjects.map((s: any) => [String(s._id), s.name]));

  const learningProgress = (progress as any[])
    .flatMap(p => (p.subjectProgress || []))
    .map((s: any) => ({
      subject: subjectName.get(String(s.subjectId)) || 'Subject',
      percentage: Math.round(s.completionPercentage || 0),
      completedChapters: s.completedChapters || 0,
      totalChapters: s.totalChapters || 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // ── Weekly activity: last 7 days, by weekday ────────────────────────────────
  const since = new Date(Date.now() - 6 * 86400000);
  since.setHours(0, 0, 0, 0);
  const dayKey = (d: Date) => new Date(d).toISOString().slice(0, 10);
  const days: { date: string; label: string; classes: number; quizzes: number; assignments: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(since.getTime() + i * 86400000);
    days.push({ date: dayKey(d), label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()], classes: 0, quizzes: 0, assignments: 0 });
  }
  const byDate = new Map(days.map(d => [d.date, d]));

  for (const q of assignedQuizzes) {
    const at = q.latestAttempt?.submittedAt || q.latestAttempt?.createdAt;
    if (at && byDate.has(dayKey(at))) byDate.get(dayKey(at))!.quizzes++;
  }
  for (const a of assignedAssignments as any[]) {
    const at = a.submission?.submittedAt;
    if (at && byDate.has(dayKey(at))) byDate.get(dayKey(at))!.assignments++;
  }
  if (tOid) {
    const recentClasses = await LiveClassAttendance.find({ userId: uOid, present: true, firstJoinedAt: { $gte: since } })
      .select('firstJoinedAt').lean();
    for (const c of recentClasses as any[]) {
      const k = dayKey(c.firstJoinedAt);
      if (byDate.has(k)) byDate.get(k)!.classes++;
    }
  }
  const weekTotals = {
    classes: days.reduce((s, d) => s + d.classes, 0),
    quizzes: days.reduce((s, d) => s + d.quizzes, 0),
    assignments: days.reduce((s, d) => s + d.assignments, 0),
    minutes: (progress as any[]).reduce((s, p) => s + (p.totalTimeSpent || 0), 0),
  };

  // ── Recent activity feed ────────────────────────────────────────────────────
  type Act = { kind: string; title: string; detail: string; at: Date; badge?: string };
  const acts: Act[] = [];
  for (const q of assignedQuizzes) {
    const at = q.latestAttempt?.submittedAt || q.latestAttempt?.createdAt;
    if (!at) continue;
    const p = q.quiz?.totalMarks ? Math.round(((q.latestAttempt.obtainedMarks || 0) / q.quiz.totalMarks) * 100) : null;
    acts.push({ kind: 'quiz', title: 'Completed Quiz', detail: q.quiz.title, at: new Date(at), badge: p !== null ? `${p}%` : undefined });
  }
  for (const a of assignedAssignments as any[]) {
    if (!a.submission?.submittedAt) continue;
    acts.push({ kind: 'assignment', title: 'Submitted Assignment', detail: a.title, at: new Date(a.submission.submittedAt), badge: a.submission.status });
  }
  for (const s of snippetSubs as any[]) {
    if (!s.createdAt) continue;
    acts.push({ kind: 'code', title: 'Code Submitted', detail: s.assessmentTitle || 'Code assessment', at: new Date(s.createdAt), badge: s.status });
  }
  for (const a of attendanceRows.slice(0, 10) as any[]) {
    acts.push({ kind: 'attendance', title: 'Attendance', detail: a.remarks || 'Class attendance', at: new Date(a.date), badge: a.status });
  }
  acts.sort((x, y) => y.at.getTime() - x.at.getTime());

  // ── Subject-wise performance ────────────────────────────────────────────────
  const subjectPerf = learningProgress.map(s => ({
    subject: s.subject,
    progress: s.percentage,
    status: perfLabel(s.percentage),
  }));

  // ── Upcoming: live classes, then quiz/assignment deadlines ──────────────────
  const now = new Date();
  const upcoming: { kind: string; title: string; detail: string; at: Date }[] = [];
  if (tOid) {
    const next = await LiveClass.find({
      tenantId: tOid, ...(oid(batchStr) ? { batchId: oid(batchStr) } : {}),
      scheduledAt: { $gte: now },
    }).sort({ scheduledAt: 1 }).limit(5).select('title instructorName scheduledAt').lean();
    for (const c of next as any[]) {
      upcoming.push({ kind: 'class', title: `Live Class: ${c.title}`, detail: c.instructorName ? `Trainer: ${c.instructorName}` : '', at: new Date(c.scheduledAt) });
    }
  }
  for (const q of assignedQuizzes) {
    if (q.dueAt && q.dueAt > now && !['submitted', 'graded', 'late'].includes(q.status)) {
      upcoming.push({ kind: 'quiz', title: `Quiz: ${q.quiz.title}`, detail: 'Due', at: new Date(q.dueAt) });
    }
  }
  for (const a of assignedAssignments as any[]) {
    const due = a.delivery?.dueAt || a.dueDate;
    if (due && new Date(due) > now && !a.submission?.submittedAt) {
      upcoming.push({ kind: 'assignment', title: `Assignment: ${a.title}`, detail: 'Submission', at: new Date(due) });
    }
  }
  upcoming.sort((x, y) => x.at.getTime() - y.at.getTime());

  return {
    student: {
      _id: String(student._id),
      name: `${student.firstName || ''} ${student.lastName || ''}`.trim(),
      email: student.email,
      phone: student.phone || null,
      photo: student.profilePicture || null,
      batch: batch?.name || null,
      joinedAt: student.batchJoinedDate || student.createdAt || null,
    },
    headline: {
      overallProgress,
      rank, rankOf, rankBasis: 'Average quiz score within batch',
      streak: (progress as any[])[0]?.currentStreak ?? (gameStats as any)?.currentStreak ?? 0,
      longestStreak: (progress as any[])[0]?.longestStreak ?? (gameStats as any)?.longestStreak ?? 0,
    },
    stats: {
      classes: { done: classesAttended, total: classesTotal },
      quizzes: { done: quizTally.completed, total: quizTally.total },
      assignments: { done: asgTally.completed, total: asgTally.total },
      avgQuizScore,
      attendance: attendancePct,
      coderScore, coderBand: coderBand(coderScore),
    },
    learningProgress,
    weekly: { days, totals: weekTotals },
    recent: acts.slice(0, 12).map(a => ({ ...a, at: a.at.toISOString() })),
    subjectPerf,
    upcoming: upcoming.slice(0, 6).map(u => ({ ...u, at: u.at.toISOString() })),
  };
}

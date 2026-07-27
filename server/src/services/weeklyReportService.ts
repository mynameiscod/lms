import { Types } from 'mongoose';
import User from '../models/User';
import Attendance from '../models/Attendance';
import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import Submission, { SubmissionStatus } from '../models/Submission';
import Assignment from '../models/Assignment';
import InterviewAttempt from '../models/InterviewAttempt';
import CommunicationSchedule from '../models/CommunicationSchedule';
import CommunicationAttempt from '../models/CommunicationAttempt';
import ScheduledChallenge from '../models/ScheduledChallenge';
import DailyChallenge from '../models/DailyChallenge';

// ── Types ────────────────────────────────────────────────────────────────
export interface WeeklyReportData {
  student: { id: string; name: string; firstName: string; email: string; batchId: string; batchName: string };
  period: { startISO: string; endISO: string; label: string; generatedAtISO: string };
  overall: { score: number; grade: string; label: string; message: string; hasData: boolean };
  quizzes: { assigned: number; attempted: number; avgScore: number; topScore: number; timeLabel: string };
  assignments: { assigned: number; submitted: number; avgScore: number; scoredCount: number; awaitingGrading: number; pending: number; timeLabel: string };
  attendance: { percentage: number; present: number; absent: number; late: number; leave: number; totalClasses: number };
  interview: { taken: number; avgRating: number; avgScore: number; breakdown: { label: string; rating: number }[] };
  challenges: {
    communication: { assigned: number; completed: number; missed: number };
    thinking: { assigned: number; completed: number; missed: number };
    totalAssigned: number; totalCompleted: number; totalMissed: number;
  };
}

export interface StudentWeeklySummary {
  id: string;
  name: string;
  email: string;
  score: number;
  grade: string;
  hasData: boolean;
}

// ── Week helpers ─────────────────────────────────────────────────────────
// Monday 00:00:00.000 of the week containing `d`
function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();               // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift back to Monday
  x.setDate(x.getDate() + diff);
  return x;
}

/**
 * Resolve a Mon–Sun window.
 * - weekStartISO given ("YYYY-MM-DD"): the Mon–Sun week containing that date.
 * - omitted: the LAST COMPLETED week (the full Mon–Sun that just ended).
 */
export function resolveWeek(weekStartISO?: string): { start: Date; end: Date; label: string } {
  let base: Date;
  if (weekStartISO && /^\d{4}-\d{2}-\d{2}$/.test(weekStartISO)) {
    base = new Date(`${weekStartISO}T00:00:00`);
  } else {
    base = new Date();
    base.setDate(base.getDate() - 7); // previous week
  }
  const start = startOfWeekMonday(base);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return { start, end, label: `${fmt(start)} – ${fmt(end)}` };
}

// Date → 'YYYY-MM-DD' (for matching challenge date strings)
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// seconds → "2h 35m" / "45m" / "0m"
function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function gradeFor(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  return 'D';
}
function labelFor(score: number): { label: string; message: string } {
  if (score >= 85) return { label: 'Excellent!', message: "Outstanding week — you're setting the pace. Keep this momentum going!" };
  if (score >= 70) return { label: 'Good Job!', message: "You're doing great. Stay focused and aim even higher next week!" };
  if (score >= 50) return { label: 'Keep Going', message: 'Steady progress. A little more consistency will lift your score next week.' };
  return { label: 'Needs Focus', message: "Let's turn it around — attend classes, attempt quizzes and submit assignments this week." };
}

// ── Core computation ─────────────────────────────────────────────────────
export class WeeklyReportService {
  private async attendance(studentId: string, tenantId: string, start: Date, end: Date) {
    const records = await Attendance.find({ studentId, tenantId, date: { $gte: start, $lte: end } });
    const present = records.filter(r => r.status === 'present').length;
    const absent = records.filter(r => r.status === 'absent').length;
    const leave = records.filter(r => r.status === 'leave').length;
    const late = records.filter(r => {
      if (r.status === 'present' && r.inTime) {
        const [h, m] = r.inTime.split(':').map(Number);
        return h > 9 || (h === 9 && m > 30); // after 09:30 = late (derived)
      }
      return false;
    }).length;
    const totalClasses = records.length;
    return { totalClasses, present, absent, leave, late, percentage: totalClasses ? Math.round((present / totalClasses) * 100) : 0 };
  }

  private async quizzes(studentId: string, tenantId: string, batchId: string, start: Date, end: Date) {
    const attempts = await QuizAttempt.find({ studentId, tenantId, submittedAt: { $gte: start, $lte: end } });
    const done = attempts.filter(a => a.status === 'submitted' || a.status === 'grading');
    const pct = (a: any) => (typeof a.percentage === 'number' && a.percentage > 0)
      ? a.percentage
      : (a.totalMarks ? Math.round(((a.obtainedMarks || 0) / a.totalMarks) * 100) : 0);
    const avgScore = done.length ? Math.round(done.reduce((s, a) => s + pct(a), 0) / done.length) : 0;
    const topScore = done.length ? Math.max(...done.map(pct)) : 0;
    const timeSec = done.reduce((s, a) => s + Math.min(a.timeSpent || 0, 4 * 3600), 0); // cap 4h/attempt

    // "Assigned" = quizzes accessible to this student whose window overlapped the week
    const assigned = await Quiz.countDocuments({
      tenantId,
      startDate: { $lte: end },
      endDate: { $gte: start },
      $and: [
        { $or: [{ archivedAt: null }, { archivedAt: { $exists: false } }] },
        accessibleFilter(batchId, studentId),
      ],
    });

    return { assigned: Math.max(assigned, done.length), attempted: done.length, avgScore, topScore, timeLabel: fmtDuration(timeSec) };
  }

  private async assignments(studentId: string, tenantId: string, batchId: string, start: Date, end: Date) {
    const subs = await Submission.find({ student: studentId, tenant: tenantId, submittedAt: { $gte: start, $lte: end } })
      .populate('assignment', 'totalPoints dueDate');
    const submitted = subs.filter(s => s.status !== SubmissionStatus.NOT_STARTED).length;
    const pending = subs.filter(s => s.status === SubmissionStatus.IN_PROGRESS || s.status === SubmissionStatus.SUBMITTED).length;
    // "Scored" = has an actual score (auto-graded coding/MCQ set finalScore on submit; theory only
    // after a mentor grades it). Average over SCORED — not just status==='graded' — so auto-graded
    // coding/MCQ count, and un-graded theory shows as "awaiting grading" instead of a misleading 0%.
    const hasScore = (s: any) => s.finalScore !== undefined && s.finalScore !== null;
    const scored = subs.filter(hasScore);
    const pct = (s: any) => {
      if (typeof s.percentage === 'number') return s.percentage;
      const total = (s.assignment as any)?.totalPoints || 0;
      return total ? Math.round(((s.finalScore ?? s.totalScore ?? 0) / total) * 100) : 0;
    };
    const avgScore = scored.length ? Math.round(scored.reduce((sum, s) => sum + pct(s), 0) / scored.length) : 0;
    const awaitingGrading = Math.max(0, submitted - scored.length);
    // Cap each submission's time — it's wall-clock (open→submit), so leaving one open for days
    // inflates it to 100+ hours. Cap at 4h/submission for a sane weekly total.
    const CAP = 4 * 3600;
    const timeSec = subs.reduce((sum, s) => sum + Math.min((s as any).timeSpent || 0, CAP), 0);

    const assigned = await Assignment.countDocuments({
      tenant: tenantId,
      status: 'published',
      $and: [
        { $or: [{ dueDate: { $gte: start, $lte: end } }, { startDate: { $gte: start, $lte: end } }, { startDate: { $lte: end }, dueDate: { $gte: start } }] },
        { $or: accessibleFilterAssignment(batchId, studentId) },
      ],
    });

    return { assigned: Math.max(assigned, submitted), submitted, avgScore, scoredCount: scored.length, awaitingGrading, pending, timeLabel: fmtDuration(timeSec) };
  }

  private async interviews(studentId: string, tenantId: string, start: Date, end: Date) {
    const attempts = await InterviewAttempt.find({
      studentId, tenantId,
      status: { $in: ['evaluated', 'published'] },
      submittedAt: { $gte: start, $lte: end },
    });
    const taken = attempts.length;
    const avgScore = taken ? Math.round(attempts.reduce((s, a) => s + (a.overallPercentage || 0), 0) / taken) : 0;

    // Aggregate section percentages by sectionType across the week's attempts
    const buckets: Record<string, number[]> = {};
    attempts.forEach(a => (a.sectionAttempts || []).forEach((sec: any) => {
      if (typeof sec.percentage === 'number') (buckets[sec.sectionType] ||= []).push(sec.percentage);
    }));
    const labelMap: Record<string, string> = { communication: 'Communication', technical: 'Technical', hr: 'HR / Behavioural' };
    const breakdown = Object.entries(buckets).map(([type, arr]) => ({
      label: labelMap[type] || type,
      rating: Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) / 20 * 10) / 10, // % → /5, 1 decimal
    }));

    return { taken, avgScore, avgRating: Math.round((avgScore / 20) * 10) / 10, breakdown };
  }

  // Daily-lab challenges: assigned (admin-scheduled for the batch) vs completed vs missed.
  // Only SCHEDULED challenges count (the ones with a window) — free daily practice is not "assigned".
  private async challenges(studentId: string, tenantId: string, batchId: string, start: Date, end: Date) {
    const empty = { communication: { assigned: 0, completed: 0, missed: 0 }, thinking: { assigned: 0, completed: 0, missed: 0 }, totalAssigned: 0, totalCompleted: 0, totalMissed: 0 };
    if (!batchId) return empty;
    const startYmd = ymd(start), endYmd = ymd(end);

    // Communication Lab
    const [commSched, commDone] = await Promise.all([
      CommunicationSchedule.find({ tenantId, batchId, date: { $gte: startYmd, $lte: endYmd } }).select('date').lean(),
      CommunicationAttempt.find({ tenantId, studentId, status: 'completed', practiceDate: { $gte: startYmd, $lte: endYmd } }).select('practiceDate').lean(),
    ]);
    const commDates = new Set(commSched.map((s: any) => s.date));
    const commCompletedDates = new Set(commDone.map((a: any) => a.practiceDate));
    const commAssigned = commDates.size;
    const commCompleted = [...commDates].filter(d => commCompletedDates.has(d)).length;

    // Thinking Lab
    const [thinkSched, thinkDone] = await Promise.all([
      ScheduledChallenge.find({ tenantId, batchId, date: { $gte: startYmd, $lte: endYmd } }).select('date').lean(),
      DailyChallenge.find({ tenantId, studentId, date: { $gte: startYmd, $lte: endYmd }, $or: [{ passed: true }, { status: 'solved' }] }).select('date').lean(),
    ]);
    const thinkDates = new Set(thinkSched.map((s: any) => s.date));
    const thinkSolvedDates = new Set(thinkDone.map((c: any) => c.date));
    const thinkAssigned = thinkDates.size;
    const thinkCompleted = [...thinkDates].filter(d => thinkSolvedDates.has(d)).length;

    const communication = { assigned: commAssigned, completed: commCompleted, missed: Math.max(0, commAssigned - commCompleted) };
    const thinking = { assigned: thinkAssigned, completed: thinkCompleted, missed: Math.max(0, thinkAssigned - thinkCompleted) };
    return {
      communication, thinking,
      totalAssigned: commAssigned + thinkAssigned,
      totalCompleted: commCompleted + thinkCompleted,
      totalMissed: communication.missed + thinking.missed,
    };
  }

  /** Full weekly report for one student. Returns null if the student doesn't exist. */
  async getReport(studentId: string, tenantId: string, weekStartISO?: string): Promise<WeeklyReportData | null> {
    const student = await User.findOne({ _id: studentId, tenantId, role: 'STUDENT' })
      .populate('batchId', 'name')
      .select('firstName lastName email batchId');
    if (!student) return null;

    const { start, end, label } = resolveWeek(weekStartISO);
    const batchId = (student.batchId as any)?._id?.toString() || '';
    const sid = student._id.toString();

    const [attendance, quizzes, assignments, interview, challenges] = await Promise.all([
      this.attendance(sid, tenantId, start, end),
      this.quizzes(sid, tenantId, batchId, start, end),
      this.assignments(sid, tenantId, batchId, start, end),
      this.interviews(sid, tenantId, start, end),
      this.challenges(sid, tenantId, batchId, start, end),
    ]);

    // Completion-aware weighted overall score. A section that was ASSIGNED but not done drags
    // the score down (performance × completion), so skipping all assignments can't still read
    // "Excellent". Weights: Quizzes 30 / Assignments 30 / Attendance 20 / Interview 20, normalized
    // over the sections that applied this week.
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    const comps: { v: number; w: number }[] = [];
    if (quizzes.assigned > 0) comps.push({ v: clamp(quizzes.avgScore * (quizzes.attempted / quizzes.assigned)), w: 30 });
    if (assignments.assigned > 0) comps.push({ v: clamp(assignments.avgScore * (assignments.submitted / assignments.assigned)), w: 30 });
    if (attendance.totalClasses > 0) comps.push({ v: attendance.percentage, w: 20 });
    if (interview.taken > 0) comps.push({ v: interview.avgScore, w: 20 });
    const hasData = comps.length > 0;
    const totW = comps.reduce((s, c) => s + c.w, 0);
    const score = hasData ? Math.round(comps.reduce((s, c) => s + c.v * c.w, 0) / totW) : 0;
    const { label: perfLabel, message } = labelFor(score);

    return {
      student: {
        id: sid,
        name: `${student.firstName} ${student.lastName || ''}`.trim(),
        firstName: student.firstName,
        email: student.email,
        batchId,
        batchName: (student.batchId as any)?.name || '',
      },
      period: { startISO: start.toISOString(), endISO: end.toISOString(), label, generatedAtISO: new Date().toISOString() },
      overall: { score, grade: gradeFor(score), label: perfLabel, message, hasData },
      quizzes,
      assignments,
      attendance,
      interview,
      challenges,
    };
  }

  /** Active students of a batch (for the admin picker). */
  async getBatchStudents(tenantId: string, batchId: string) {
    return User.find({ tenantId, role: 'STUDENT', isActive: true, batchId })
      .select('firstName lastName email')
      .sort({ firstName: 1 })
      .lean();
  }

  /** Lightweight per-student score/grade summaries for a batch + week (for the list view). */
  async getBatchSummaries(tenantId: string, batchId: string, weekStartISO?: string): Promise<StudentWeeklySummary[]> {
    const students = await this.getBatchStudents(tenantId, batchId);
    const out: StudentWeeklySummary[] = [];
    for (const s of students) {
      const report = await this.getReport(s._id.toString(), tenantId, weekStartISO);
      out.push({
        id: s._id.toString(),
        name: `${s.firstName} ${s.lastName || ''}`.trim(),
        email: s.email,
        score: report?.overall.score ?? 0,
        grade: report?.overall.grade ?? 'D',
        hasData: report?.overall.hasData ?? false,
      });
    }
    return out;
  }
}

// Quiz accessibility ($or fragment merged into the query object)
function accessibleFilter(batchId: string, studentId: string) {
  const or: any[] = [{ accessibleTo: 'everyone' }, { accessibleTo: { $exists: false } }];
  if (batchId) or.push({ accessibleTo: 'batch_wise', selectedBatches: batchId });
  or.push({ accessibleTo: 'individual', selectedStudents: studentId });
  return { $or: or };
}
// Assignment accessibility (returns an array for use inside a $and/$or)
function accessibleFilterAssignment(batchId: string, studentId: string): any[] {
  const or: any[] = [{ accessibleTo: 'everyone' }, { accessibleTo: { $exists: false } }];
  if (batchId) or.push({ accessibleTo: 'batch_wise', selectedBatches: batchId });
  or.push({ accessibleTo: 'individual', selectedStudents: studentId });
  return or;
}

export const weeklyReportService = new WeeklyReportService();

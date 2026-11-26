import { Types } from 'mongoose';
import User from '../models/User';
import Attendance from '../models/Attendance';
import QuizAttempt from '../models/QuizAttempt';
import Submission, { SubmissionStatus } from '../models/Submission';
import InterviewAttempt from '../models/InterviewAttempt';
import ScheduledInterview from '../models/ScheduledInterview';
import InterviewScheduleFeedback from '../models/InterviewScheduleFeedback';
import { PracticeDay, PracticeStanding, PracticePolicy } from '../models/PracticePass';
import { PlacementDeskCandidate, PlacementDeskDrive, ATTENDED_STATUSES } from '../models/PlacementDesk';
import { recomputeStudent } from './practicePassService';
import { resolveAssignedQuizzes } from './studentWorkService';
import assignmentService from './assignmentService';
import { communicationWeek, thinkingWeek, labScore, weekDates, CommunicationWeek, ThinkingWeek } from './weeklyReportLabs';

// ── Types ────────────────────────────────────────────────────────────────
export interface WeeklyReportData {
  student: { id: string; name: string; firstName: string; email: string; batchId: string; batchName: string };
  period: { startISO: string; endISO: string; label: string; generatedAtISO: string };
  overall: { score: number; grade: string; label: string; message: string; hasData: boolean };
  quizzes: { assigned: number; attempted: number; missed: number; pending: number; missedTitles: string[]; avgScore: number; topScore: number; timeLabel: string };
  assignments: { assigned: number; submitted: number; missed: number; missedTitles: string[]; avgScore: number; scoredCount: number; awaitingGrading: number; pending: number; timeLabel: string };
  attendance: { percentage: number; present: number; absent: number; late: number; leave: number; totalClasses: number };
  interview: { taken: number; avgRating: number; avgScore: number; scheduled: number; absent: number; remarks: string; breakdown: { label: string; rating: number }[] };
  communication: CommunicationWeek;
  thinking: ThinkingWeek;
  /** One line per area for the "This week at a glance" strip and the staff table. */
  /**
   * Company drives the student attended this week (Placement Desk). Empty = the section is not
   * shown. Only that they went: outcomes and company feedback stay admin-only.
   */
  drives: { company: string; role: string; day: string; mode: string }[];
  glance: GlanceItem[];
  /** Nothing happened and nothing was expected — batch and automatic sends skip this student. */
  isEmpty: boolean;
  /** Daily Practice Pass for the week — null when the institute has not switched it on. */
  practice: {
    days: { date: string; weekday: string; met: boolean; excused: string | null; done: Record<string, number>; required: Record<string, number> }[];
    metDays: number;
    countedDays: number;
    pct: number;
    thresholdPct: number;
    onHold: boolean;
    streak: number;
  } | null;
}

export type GlanceState = 'done' | 'partial' | 'missed' | 'pending' | 'none';
export type GlanceKey = 'classes' | 'quizzes' | 'assignments' | 'interview' | 'communication' | 'thinking';
export interface GlanceItem { key: GlanceKey; label: string; state: GlanceState; detail: string }

export interface StudentWeeklySummary {
  id: string;
  name: string;
  email: string;
  score: number;
  grade: string;
  hasData: boolean;
  practiceDays?: string;
  practicePct?: number;
  onHold?: boolean;
  glance: GlanceItem[];
  isEmpty: boolean;
  drivesAttended: number;
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

// -- At a glance -------------------------------------------------------------
function ratioState(done: number, expected: number): GlanceState {
  if (expected <= 0) return 'none';
  if (done >= expected) return 'done';
  return done > 0 ? 'partial' : 'missed';
}
function workState(done: number, assigned: number, missed: number): GlanceState {
  if (!assigned) return 'none';
  if (done >= assigned) return 'done';
  if (done > 0) return 'partial';
  return missed > 0 ? 'missed' : 'pending';
}
function labGlance(key: GlanceKey, label: string, w: CommunicationWeek | ThinkingWeek): GlanceItem {
  if (w.expectedDays) return { key, label, state: ratioState(w.doneDays, w.expectedDays), detail: `${w.doneDays}/${w.expectedDays} days` };
  if (w.activeDays) return { key, label, state: 'done', detail: `Practised ${w.activeDays} day${w.activeDays > 1 ? 's' : ''}` };
  return { key, label, state: 'none', detail: 'Nothing set' };
}
export function buildGlance(r: Pick<WeeklyReportData, 'attendance' | 'quizzes' | 'assignments' | 'interview' | 'communication' | 'thinking'>): GlanceItem[] {
  const { attendance: at, quizzes: q, assignments: a, interview: iv } = r;
  return [
    { key: 'classes', label: 'Classes', state: ratioState(at.present, at.totalClasses - at.leave), detail: at.totalClasses ? `${at.present}/${at.totalClasses} attended` : 'No classes' },
    { key: 'quizzes', label: 'Quizzes', state: workState(q.attempted, q.assigned, q.missed), detail: q.assigned ? `${q.attempted}/${q.assigned} done` : 'None set' },
    { key: 'assignments', label: 'Assignments', state: workState(a.submitted, a.assigned, a.missed), detail: a.assigned ? `${a.submitted}/${a.assigned} submitted` : 'None set' },
    {
      key: 'interview', label: 'Mock interview',
      state: iv.taken > 0 ? 'done' : iv.absent > 0 ? 'missed' : iv.scheduled > 0 ? 'pending' : 'none',
      detail: iv.taken > 0 ? `${iv.taken} taken` : iv.absent > 0 ? 'Absent' : iv.scheduled > 0 ? 'Scheduled' : 'None this week',
    },
    labGlance('communication', 'Communication Lab', r.communication),
    labGlance('thinking', 'Thinking Lab', r.thinking),
  ];
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

    // "Assigned this week" = the quizzes on the student's own list (batch assignment, picked
    // students, or the quiz's audience) that opened or fell due this week, or that they took this
    // week. Same rule as the student's screen, so staff and student read the same number.
    const list = await resolveAssignedQuizzes(tenantId, studentId, batchId || null).catch(() => []);
    const takenThisWeek = new Set(done.map(a => String(a.quizId)));
    const inWeek = (d: Date | null | undefined) => !!d && d >= start && d <= end;
    const now = new Date();
    let assigned = 0, attempted = 0, missed = 0;
    const missedTitles: string[] = [];
    for (const q of list) {
      const id = String(q.quiz._id);
      const opened = q.startAt
        || (q.schedule?.createdAt ? new Date(q.schedule.createdAt) : null)
        || (q.source === 'baked' && q.quiz.startDate ? new Date(q.quiz.startDate) : null);
      if (!(inWeek(q.dueAt) || inWeek(opened) || takenThisWeek.has(id))) continue;
      assigned++;
      const finished = q.attempts.some((a: any) => (a.status === 'submitted' || a.status === 'grading') && new Date(a.submittedAt || a.createdAt) <= end);
      if (finished) attempted++;
      else if (q.dueAt && inWeek(q.dueAt) && q.dueAt < now) { missed++; missedTitles.push(String(q.quiz.title || 'Quiz')); }
    }
    assigned = Math.max(assigned, attempted, takenThisWeek.size);
    attempted = Math.max(attempted, takenThisWeek.size);
    return {
      assigned, attempted, missed, pending: Math.max(0, assigned - attempted - missed), missedTitles: missedTitles.slice(0, 3),
      avgScore, topScore, timeLabel: fmtDuration(timeSec),
    };
  }

  private async assignments(studentId: string, tenantId: string, batchId: string, start: Date, end: Date) {
    const subs = await Submission.find({ student: studentId, tenant: tenantId, submittedAt: { $gte: start, $lte: end } })
      .populate('assignment', 'totalPoints dueDate');
    // DISTINCT assignments handed in this week (a student can have several attempts per assignment).
    const submittedThisWeek = new Set(
      subs.filter(s => s.status !== SubmissionStatus.NOT_STARTED)
        .map(s => String((s.assignment as any)?._id || s.assignment))
    );
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
    // Cap each submission's time — it's wall-clock (open→submit), so leaving one open for days
    // inflates it to 100+ hours. Cap at 4h/submission for a sane weekly total.
    const CAP = 4 * 3600;
    const timeSec = subs.reduce((sum, s) => sum + Math.min((s as any).timeSpent || 0, CAP), 0);

    // "Assigned this week" from the student's own assignment list (batch assignment, picked
    // students, or the assignment's own batches) — opened or due this week, or handed in this week.
    const list: any[] = await assignmentService.getStudentAssignments(
      new Types.ObjectId(tenantId), new Types.ObjectId(studentId), batchId ? new Types.ObjectId(batchId) : undefined,
    ).catch(() => []);
    const inWeek = (d: any) => !!d && new Date(d) >= start && new Date(d) <= end;
    const DONE = ['submitted', 'grading', 'graded', 'late'];
    const now = new Date();
    let assigned = 0, submitted = 0, missed = 0;
    const missedTitles: string[] = [];
    for (const a of list) {
      const id = String(a._id);
      const dueAt = a.delivery?.dueAt ? new Date(a.delivery.dueAt) : null;
      if (!(inWeek(dueAt) || inWeek(a.delivery?.startAt) || submittedThisWeek.has(id))) continue;
      assigned++;
      const sub = a.submission;
      const handedIn = submittedThisWeek.has(id)
        || (!!sub && DONE.includes(sub.status) && (!sub.submittedAt || new Date(sub.submittedAt) <= end));
      if (handedIn) submitted++;
      else if (dueAt && inWeek(dueAt) && dueAt < now) { missed++; missedTitles.push(String(a.title || 'Assignment')); }
    }
    assigned = Math.max(assigned, submitted, submittedThisWeek.size);
    submitted = Math.max(submitted, submittedThisWeek.size);
    const awaitingGrading = Math.max(0, submittedThisWeek.size - new Set(scored.map(s => String((s.assignment as any)?._id || s.assignment))).size);
    return {
      assigned, submitted, missed, missedTitles: missedTitles.slice(0, 3), avgScore, scoredCount: scored.length, awaitingGrading,
      pending: Math.max(0, assigned - submitted - missed), timeLabel: fmtDuration(timeSec),
    };
  }

  /** Placement Desk drives held this week that the student turned up to (not cancelled ones). */
  private async drives(studentId: string, tenantId: string, start: Date) {
    const days = weekDates(ymd(start));
    const rows: any[] = await PlacementDeskCandidate.find({
      tenantId, studentId, day: { $gte: days[0], $lte: days[6] }, status: { $in: ATTENDED_STATUSES },
    }).select('driveId day').lean().catch(() => []);
    if (!rows.length) return [];
    const drives: any[] = await PlacementDeskDrive.find({ _id: { $in: rows.map((r) => r.driveId) }, status: { $ne: 'cancelled' } })
      .select('companyName role day mode').lean();
    const modes: Record<string, string> = { on_campus: 'On campus', virtual: 'Online', walk_in: 'Walk-in', at_company: 'At the company' };
    return drives
      .sort((a, b) => String(a.day).localeCompare(String(b.day)))
      .map((d) => ({ company: String(d.companyName || ''), role: String(d.role || ''), day: String(d.day || ''), mode: modes[d.mode] || '' }));
  }

  private async interviews(studentId: string, tenantId: string, start: Date, end: Date) {
    const labelMap: Record<string, string> = { communication: 'Communication', technical: 'Technical', hr: 'HR / Behavioural', behavioral: 'Behavioral', coding: 'Coding' };

    // AI virtual interviews — count anything actually TAKEN this week (not only evaluated/published,
    // which left most attempts uncounted).
    const aiAttempts = await InterviewAttempt.find({
      studentId, tenantId,
      status: { $in: ['submitted', 'under_review', 'evaluated', 'published'] },
      submittedAt: { $gte: start, $lte: end },
    });

    // Scheduled / manual MOCK interviews for the student this week. Include ALL feedbacks
    // (present AND absent) so we can show attendance — previously absent showed as "none".
    const scheduledList = await ScheduledInterview.find({ tenantId, date: { $gte: start, $lte: end }, students: studentId as any }).select('_id').lean();
    const schedIds = scheduledList.map((s: any) => s._id);
    const allFbs: any[] = schedIds.length
      ? await InterviewScheduleFeedback.find({ tenantId, studentId, interviewId: { $in: schedIds } }).lean()
      : [];
    const feedbacks = allFbs.filter(f => f.attendanceStatus !== 'absent');   // attended
    const absent = allFbs.filter(f => f.attendanceStatus === 'absent').length;

    const taken = aiAttempts.length + feedbacks.length;

    // Normalize every score to a 0–100 percentage. AI: overallPercentage. Manual: overallScore is /10.
    const pcts: number[] = [];
    aiAttempts.forEach(a => { if (typeof a.overallPercentage === 'number') pcts.push(a.overallPercentage); });
    feedbacks.forEach(f => { if (typeof f.overallScore === 'number') pcts.push(Math.round(f.overallScore * 10)); });
    const avgScore = pcts.length ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length) : 0;

    // Per-criterion breakdown (rating /5). Manual criteria are /10; AI sections are %.
    const buckets: Record<string, { label: string; arr: number[] }> = {};
    feedbacks.forEach(f => (f.criteriaRatings || []).forEach((c: any) => {
      if (typeof c.score === 'number' && c.key !== 'remarks') (buckets[c.key] ||= { label: c.label || labelMap[c.key] || c.key, arr: [] }).arr.push(c.score / 2);
    }));
    aiAttempts.forEach(a => (a.sectionAttempts || []).forEach((sec: any) => {
      if (typeof sec.percentage === 'number') (buckets[sec.sectionType] ||= { label: labelMap[sec.sectionType] || sec.sectionType, arr: [] }).arr.push(sec.percentage / 20);
    }));
    const breakdown = Object.entries(buckets).map(([, v]) => ({ label: v.label, rating: Math.round((v.arr.reduce((s, x) => s + x, 0) / v.arr.length) * 10) / 10 }));

    // Mentor's overall remark/comment from the latest attended feedback (shown inline).
    const remarks = feedbacks
      .flatMap(f => [f.overallComment, ...(f.criteriaRatings || []).filter((c: any) => c.key === 'remarks').map((c: any) => c.comment)])
      .filter((s: any) => s && String(s).trim())[0] || '';

    return { taken, avgScore, avgRating: Math.round((avgScore / 20) * 10) / 10, scheduled: scheduledList.length, absent, remarks: String(remarks).slice(0, 240), breakdown };
  }

  /** Both labs, each counted against the batch that supplies it (a placement batch may take it over). */
  private async labs(studentId: string, tenantId: string, batchId: string, start: Date, practice: WeeklyReportData['practice']) {
    const dates = weekDates(ymd(start));
    const { labBatchFor } = await import('./placementBatchService');
    const [commBatch, thinkBatch] = batchId
      ? await Promise.all([
        labBatchFor(tenantId, studentId, batchId, 'communication'),
        labBatchFor(tenantId, studentId, batchId, 'thinking'),
      ])
      : [null, null];
    const days = practice ? practice.days.map((d) => ({ date: d.date, excused: d.excused, required: d.required })) : null;
    const [communication, thinking] = await Promise.all([
      communicationWeek(tenantId, studentId, commBatch, dates, days),
      thinkingWeek(tenantId, studentId, thinkBatch, dates, days),
    ]);
    return { communication, thinking };
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

    const [attendance, quizzes, assignments, interview, practice, drives] = await Promise.all([
      this.attendance(sid, tenantId, start, end),
      this.quizzes(sid, tenantId, batchId, start, end),
      this.assignments(sid, tenantId, batchId, start, end),
      this.interviews(sid, tenantId, start, end),
      this.practice(sid, tenantId, start),
      this.drives(sid, tenantId, start),
    ]);
    // The labs read the practice days to know which days a lab was expected.
    const { communication, thinking } = await this.labs(sid, tenantId, batchId, start, practice);

    // Completion-aware weighted overall score. A section that was ASSIGNED but not done drags
    // the score down (performance x completion), so skipping everything can't still read
    // "Excellent". Weights: Quizzes 25 / Assignments 25 / Attendance 15 / Interview 15 /
    // Communication Lab 10 / Thinking Lab 10, normalized over the sections that applied this week.
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    const comps: { v: number; w: number }[] = [];
    if (quizzes.assigned > 0) comps.push({ v: clamp(quizzes.avgScore * (quizzes.attempted / quizzes.assigned)), w: 25 });
    if (assignments.assigned > 0) comps.push({ v: clamp(assignments.avgScore * (assignments.submitted / assignments.assigned)), w: 25 });
    if (attendance.totalClasses > 0) comps.push({ v: attendance.percentage, w: 15 });
    if (interview.taken > 0) comps.push({ v: interview.avgScore, w: 15 });
    const comm = labScore(communication);
    if (comm !== null) comps.push({ v: clamp(comm), w: 10 });
    const think = labScore(thinking);
    if (think !== null) comps.push({ v: clamp(think), w: 10 });
    const hasData = comps.length > 0;
    const totW = comps.reduce((s, c) => s + c.w, 0);
    const score = hasData ? Math.round(comps.reduce((s, c) => s + c.v * c.w, 0) / totW) : 0;
    const { label: perfLabel, message } = labelFor(score);

    const glance = buildGlance({ attendance, quizzes, assignments, interview, communication, thinking });
    const isEmpty = !hasData && !practice
      && glance.every((g) => g.state === 'none')
      && !communication.recordings && !thinking.attempted && !drives.length;

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
      communication,
      thinking,
      practice,
      drives,
      glance,
      isEmpty,
    };
  }

  /**
   * The Daily Practice Pass for the reported week: each day met / missed / excused, with what
   * was done. Recomputed first so the email reflects the latest rules and approved leave.
   */
  private async practice(studentId: string, tenantId: string, start: Date) {
    const on = await PracticePolicy.exists({ tenantId, scope: 'tenant', startDate: { $exists: true, $ne: null } });
    if (!on) return null;
    await recomputeStudent(tenantId, studentId).catch(() => null);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(d.getDate() + i);
      dates.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }
    const [rows, standing] = await Promise.all([
      PracticeDay.find({ studentId, date: { $in: dates } }).lean(),
      PracticeStanding.findOne({ studentId }).lean(),
    ]);
    const byDate = new Map(rows.map((r) => [r.date, r]));
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const days = dates.map((date) => {
      const r: any = byDate.get(date);
      return {
        date, weekday: names[new Date(`${date}T00:00:00Z`).getUTCDay()],
        met: !!r?.met, excused: r ? (r.excused || null) : 'before_start',
        done: (r?.done || {}) as Record<string, number>, required: (r?.required || {}) as Record<string, number>,
      };
    });
    const counted = days.filter((d) => !d.excused);
    return {
      days,
      metDays: counted.filter((d) => d.met).length,
      countedDays: counted.length,
      pct: standing?.pct ?? 100,
      thresholdPct: standing?.thresholdPct ?? 80,
      onHold: !!standing?.onHold,
      streak: standing?.streak ?? 0,
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
        glance: report?.glance ?? [],
        isEmpty: report?.isEmpty ?? true,
        drivesAttended: report?.drives.length ?? 0,
        ...(report?.practice ? {
          practiceDays: `${report.practice.metDays} of ${report.practice.countedDays}`,
          practicePct: report.practice.pct,
          onHold: report.practice.onHold,
        } : {}),
      });
    }
    return out;
  }
}

export const weeklyReportService = new WeeklyReportService();

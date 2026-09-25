import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import Submission from '../models/Submission';
import QuizAttempt from '../models/QuizAttempt';
import StudentProfile from '../models/StudentProfile';
import { computeProfileCompleteness } from '../utils/profileCompleteness';

/**
 * Everything the Users export knows about a student, gathered in a fixed number of queries.
 *
 * ── WHY THIS IS AGGREGATED AND NOT LOOPED ──────────────────────────────────────────────────
 *
 * The obvious way to build "name, attendance, assignments, quizzes" is a loop over users with
 * four lookups inside it. At 184 students that is 736 round trips, and it grows with the
 * cohort — on a standalone MongoDB that is already the platform's single point of failure, an
 * admin pressing Export would compete with an exam in progress.
 *
 * So each section below is ONE aggregation that groups by student and returns a map. The
 * export is five queries regardless of whether there are 184 students or 5,000.
 *
 * ── AND WHY EVERY FIGURE CARRIES ITS DENOMINATOR ───────────────────────────────────────────
 *
 * "Attendance: 80%" is unusable on its own — 4 of 5 and 80 of 100 are different facts about a
 * student, and an admin deciding who to call needs to tell them apart. Every rate here ships
 * with the counts it was computed from, and a student with no records shows blank rather than
 * 0%, because "never marked" and "marked absent every time" must not look identical.
 */

export interface StudentStats {
  attendance: {
    present: number;
    absent: number;
    leave: number;
    total: number;
    /** null when nothing has ever been marked. Never 0 in that case. */
    rate: number | null;
    firstMarked: Date | null;
    lastMarked: Date | null;
  };
  assignments: {
    attempted: number;
    submitted: number;
    graded: number;
    passed: number;
    /** Mean percentage over graded work only. null when nothing is graded yet. */
    avgScore: number | null;
    lastSubmittedAt: Date | null;
  };
  quizzes: {
    attempts: number;
    completed: number;
    passed: number;
    avgScore: number | null;
    bestScore: number | null;
    lastAttemptAt: Date | null;
  };
  profileComplete: number | null;
}

export const EMPTY_STATS: StudentStats = {
  attendance: { present: 0, absent: 0, leave: 0, total: 0, rate: null, firstMarked: null, lastMarked: null },
  assignments: { attempted: 0, submitted: 0, graded: 0, passed: 0, avgScore: null, lastSubmittedAt: null },
  quizzes: { attempts: 0, completed: 0, passed: 0, avgScore: null, bestScore: null, lastAttemptAt: null },
  profileComplete: null,
};

const oid = (v: unknown) => new mongoose.Types.ObjectId(String(v));
const pct = (n: number, d: number): number | null =>
  d > 0 ? Math.round((n / d) * 1000) / 10 : null;

/**
 * Build the stats map for a set of students.
 *
 * Scoped to the ids passed in rather than to the whole tenant, so an export that was filtered
 * by role or batch does not quietly aggregate over people who are not in the file.
 */
export async function collectStudentStats(
  tenantId: string,
  studentIds: string[],
): Promise<Map<string, StudentStats>> {
  const out = new Map<string, StudentStats>();
  if (!studentIds.length) return out;

  const ids = studentIds.map(oid);
  const asObj = (v: any) => String(v);

  /* ── attendance ──────────────────────────────────────────────────────────────────────── */
  const attendance = await Attendance.aggregate([
    { $match: { tenantId: oid(tenantId), studentId: { $in: ids } } },
    {
      $group: {
        _id: '$studentId',
        present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
        absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
        leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
        total: { $sum: 1 },
        firstMarked: { $min: '$date' },
        lastMarked: { $max: '$date' },
      },
    },
  ]);

  /* ── assignments ─────────────────────────────────────────────────────────────────────
   * `Submission` keys on `tenant` / `student`, not tenantId / studentId. Getting that wrong
   * returns an empty result rather than an error, which is the kind of bug that ships.
   *
   * avgScore averages GRADED work only. Including ungraded submissions as zero would drag a
   * good student's average down for work nobody has marked yet.
   */
  const assignments = await Submission.aggregate([
    { $match: { tenant: oid(tenantId), student: { $in: ids } } },
    {
      $group: {
        _id: '$student',
        attempted: { $sum: 1 },
        submitted: {
          $sum: { $cond: [{ $in: ['$status', ['submitted', 'graded', 'late']] }, 1, 0] },
        },
        graded: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
        passed: { $sum: { $cond: [{ $eq: ['$isPassing', true] }, 1, 0] } },
        scoreSum: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, '$percentage', 0] } },
        scoreCount: { $sum: { $cond: [{ $eq: ['$status', 'graded'] }, 1, 0] } },
        lastSubmittedAt: { $max: '$submittedAt' },
      },
    },
  ]);

  /* ── quizzes ─────────────────────────────────────────────────────────────────────────
   * QuizAttempt stores tenantId and studentId as STRINGS, not ObjectIds. Matching with
   * ObjectIds here silently returns nothing.
   */
  const quizzes = await QuizAttempt.aggregate([
    { $match: { tenantId: String(tenantId), studentId: { $in: studentIds.map(String) } } },
    {
      $group: {
        _id: '$studentId',
        attempts: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        passed: { $sum: { $cond: [{ $eq: ['$passed', true] }, 1, 0] } },
        scoreSum: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, '$percentage', 0] } },
        scoreCount: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
        bestScore: { $max: '$percentage' },
        lastAttemptAt: { $max: '$submittedAt' },
      },
    },
  ]);

  /* ── profile completeness ────────────────────────────────────────────────────────────
   * Computed by the same function the student's own profile page uses, so the number in the
   * spreadsheet is the number they were shown. Duplicating the rule here would drift.
   */
  const profiles = await StudentProfile.find({ userId: { $in: ids } }).lean();

  for (const id of studentIds) {
    out.set(String(id), JSON.parse(JSON.stringify(EMPTY_STATS)));
  }

  for (const a of attendance) {
    const s = out.get(asObj(a._id));
    if (!s) continue;
    s.attendance = {
      present: a.present, absent: a.absent, leave: a.leave, total: a.total,
      /* Leave is excluded from the denominator: an approved absence is not a missed class
         the student should be judged on. */
      rate: pct(a.present, a.present + a.absent),
      firstMarked: a.firstMarked || null,
      lastMarked: a.lastMarked || null,
    };
  }

  for (const a of assignments) {
    const s = out.get(asObj(a._id));
    if (!s) continue;
    s.assignments = {
      attempted: a.attempted, submitted: a.submitted, graded: a.graded, passed: a.passed,
      avgScore: a.scoreCount > 0 ? Math.round((a.scoreSum / a.scoreCount) * 10) / 10 : null,
      lastSubmittedAt: a.lastSubmittedAt || null,
    };
  }

  for (const q of quizzes) {
    const s = out.get(asObj(q._id));
    if (!s) continue;
    s.quizzes = {
      attempts: q.attempts, completed: q.completed, passed: q.passed,
      avgScore: q.scoreCount > 0 ? Math.round((q.scoreSum / q.scoreCount) * 10) / 10 : null,
      bestScore: typeof q.bestScore === 'number' ? Math.round(q.bestScore * 10) / 10 : null,
      lastAttemptAt: q.lastAttemptAt || null,
    };
  }

  for (const p of profiles as any[]) {
    const s = out.get(asObj(p.userId));
    if (!s) continue;
    try {
      s.profileComplete = computeProfileCompleteness(p);
    } catch {
      /* A profile shape the checker cannot read must not fail the whole export. */
      s.profileComplete = null;
    }
  }

  return out;
}

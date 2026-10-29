import mongoose, { Types } from 'mongoose';
import * as XLSX from 'xlsx';
import Assignment, { AssignmentStatus, AssignmentType, IAssignment } from '../models/Assignment';
import PoolExamAttempt, { IPoolExamAttempt } from '../models/PoolExamAttempt';
import AssessmentSchedule from '../models/AssessmentSchedule';
import User from '../models/User';
import Batch from '../models/Batch';
import CodingProblem from '../models/CodingProblem';
import { PbError } from './problemBankService';
import { gradeAttempt } from './poolExamGradingService';

/**
 * Pool exams — the teacher's side: who sat it, how they did, each student's paper, how every
 * question performed, releasing results, re-marking, and the spreadsheet.
 *
 * ── WHICH ATTEMPT COUNTS ───────────────────────────────────────────────────────────────────
 * A student with several attempts is ranked on their BEST marked attempt — the same rule a
 * retake usually means — and every attempt stays one click away on their row.
 *
 * ── QUESTION STATISTICS ARE THE POOL'S HEALTH CHECK ────────────────────────────────────────
 * Because every student gets different questions, a "hard" paper may just be one bad question
 * drawn often. Per-question rates across all marked attempts show which questions are too hard,
 * too easy, or probably broken (nobody gets them right).
 */

export { PbError as ResultsError };

const oid = (id: string, what = 'Exam') => {
  if (!mongoose.isValidObjectId(id)) throw new PbError(`${what} not found`, 404);
  return new Types.ObjectId(id);
};
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);
const name = (u: any) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.email || 'Student';

async function loadExam(tenantId: string, assignmentId: string) {
  const exam = await Assignment.findOne({ _id: oid(assignmentId), tenant: tenantId, type: AssignmentType.EXAM }) as IAssignment | null;
  if (!exam) throw new PbError('Exam not found', 404);
  return exam;
}

/**
 * Everyone this exam was given to: its own audience once published (everyone, batches or named
 * students), every Assign-to-Batches schedule, and anyone who has already sat it.
 */
async function assignedStudents(tenantId: string, exam: IAssignment, attempts: IPoolExamAttempt[]) {
  const T = new Types.ObjectId(tenantId);
  const or: any[] = [{ _id: { $in: attempts.map(a => a.student) } }];
  if (exam.status === AssignmentStatus.PUBLISHED) {
    const to = exam.accessibleTo || (exam.batch ? 'batch_wise' : 'everyone');
    if (to === 'everyone') or.push({});
    else if (to === 'batch_wise') or.push({ batchId: { $in: [...(exam.selectedBatches || []), ...(exam.batch ? [exam.batch] : [])].filter(b => mongoose.isValidObjectId(b)).map(b => new Types.ObjectId(String(b))) } });
    else if (to === 'individual') or.push({ _id: { $in: (exam.selectedStudents || []).filter(s => mongoose.isValidObjectId(s)).map(s => new Types.ObjectId(s)) } });
  }
  const schedules = await AssessmentSchedule.find({ tenantId, contentType: 'assignment', contentId: exam._id, status: { $ne: 'archived' } }).lean() as any[];
  const batchIds = schedules.filter(s => s.batchId).map(s => s.batchId);
  const studentIds = schedules.flatMap(s => s.studentIds || []);
  if (batchIds.length) or.push({ batchId: { $in: batchIds } });
  if (studentIds.length) or.push({ _id: { $in: studentIds } });

  const everyone = or.some(c => !Object.keys(c).length);
  const users = await User.find({ tenantId: T, ...(everyone ? { role: 'STUDENT', isActive: true } : { $or: or }) })
    .select('firstName lastName email batchId role').lean() as any[];
  // Staff who opened the exam to look at it are not students in its results.
  const students = users.filter(u => u.role === 'STUDENT' || attempts.some(a => String(a.student) === String(u._id)));
  const batches = await Batch.find({ _id: { $in: students.map(u => u.batchId).filter(Boolean) } }).select('name').lean() as any[];
  const batchName = new Map(batches.map(b => [String(b._id), b.name]));
  return students.map(u => ({ id: String(u._id), name: name(u), email: u.email, batch: u.batchId ? batchName.get(String(u.batchId)) || '' : '' }));
}

/** The attempt a student is ranked on: their best marked one, else their latest. */
function countedAttempt(list: IPoolExamAttempt[]) {
  const graded = list.filter(a => a.status === 'graded').sort((a, b) => (b.score || 0) - (a.score || 0));
  return graded[0] || list.slice().sort((a, b) => b.attemptNumber - a.attemptNumber)[0] || null;
}

const statusOf = (a: IPoolExamAttempt | null) => (!a ? 'not_started' : a.status === 'submitted' ? 'marking' : a.status);

export async function results(tenantId: string, assignmentId: string) {
  const exam = await loadExam(tenantId, assignmentId);
  const attempts = await PoolExamAttempt.find({ assignment: exam._id, tenant: tenantId }).sort({ attemptNumber: 1 });
  const students = await assignedStudents(tenantId, exam, attempts);
  const passMark = Number((exam as any).passingPoints ?? 0);

  const rows = students.map(s => {
    const mine = attempts.filter(a => String(a.student) === s.id);
    const a = countedAttempt(mine);
    const graded = a?.status === 'graded';
    return {
      ...s,
      status: statusOf(a),
      attempts: mine.length,
      attemptId: a ? String(a._id) : null,
      score: graded ? a!.score : null,
      maxScore: a?.maxScore ?? exam.totalPoints,
      percentage: graded ? a!.percentage : null,
      passed: graded ? (a!.score || 0) >= passMark : null,
      startedAt: a?.startedAt || null,
      submittedAt: a?.submittedAt || null,
      submitReason: a?.submitReason || null,
      minutes: a?.submittedAt ? Math.round((a.submittedAt.getTime() - a.startedAt.getTime()) / 60000) : null,
      tabSwitches: a?.tabSwitches || 0,
      pasteAttempts: (a?.violations || []).filter(v => v.type === 'paste').length,
      copyAttempts: (a?.violations || []).filter(v => v.type === 'copy').length,
      allAttempts: mine.map(x => ({ id: String(x._id), attemptNumber: x.attemptNumber, status: statusOf(x), score: x.status === 'graded' ? x.score : null })),
    };
  }).sort((x, y) => (y.percentage ?? -1) - (x.percentage ?? -1) || x.name.localeCompare(y.name));

  const marked = rows.filter(r => r.status === 'graded');
  return {
    exam: {
      id: String(exam._id), title: exam.title, totalMarks: exam.totalPoints, passMark,
      released: !!exam.poolExam?.resultsReleasedAt, releasedAt: exam.poolExam?.resultsReleasedAt || null,
      showImmediately: !!exam.poolExam?.showResultsImmediately,
    },
    summary: {
      assigned: rows.length,
      started: rows.filter(r => r.status !== 'not_started').length,
      inProgress: rows.filter(r => r.status === 'in_progress').length,
      submitted: rows.filter(r => r.status === 'marking' || r.status === 'graded').length,
      marking: rows.filter(r => r.status === 'marking').length,
      graded: marked.length,
      average: marked.length ? Math.round(marked.reduce((n, r) => n + (r.percentage || 0), 0) / marked.length * 10) / 10 : null,
      passRate: marked.length ? pct(marked.filter(r => r.passed).length, marked.length) : null,
      highest: marked.length ? Math.max(...marked.map(r => r.percentage || 0)) : null,
      flagged: rows.filter(r => r.tabSwitches > 0 || r.pasteAttempts > 0).length,
    },
    rows,
  };
}

/** One student's paper as marked: every question, their answer, the key, and what the proctoring saw. */
export async function attemptDetail(tenantId: string, attemptId: string) {
  const a = await PoolExamAttempt.findOne({ _id: oid(attemptId, 'Attempt'), tenant: tenantId });
  if (!a) throw new PbError('Attempt not found', 404);
  const [student, exam] = await Promise.all([
    User.findById(a.student).select('firstName lastName email').lean(),
    Assignment.findById(a.assignment).select('title passingPoints').lean() as any,
  ]);
  const problems = new Map((await CodingProblem.find({ _id: { $in: a.items.filter(i => i.kind === 'coding').map(i => i.refId) } }).select('title').lean() as any[])
    .map(p => [String(p._id), p.title]));
  return {
    id: String(a._id), examTitle: exam?.title || 'Exam', student: { name: name(student), email: (student as any)?.email || '' },
    attemptNumber: a.attemptNumber, status: statusOf(a), startedAt: a.startedAt, submittedAt: a.submittedAt, deadlineAt: a.deadlineAt,
    submitReason: a.submitReason || null, score: a.score ?? null, maxScore: a.maxScore, percentage: a.percentage ?? null,
    passed: a.status === 'graded' ? (a.score || 0) >= Number(exam?.passingPoints ?? 0) : null,
    tabSwitches: a.tabSwitches, violations: a.violations.map(v => ({ type: v.type, at: v.at })),
    items: a.items.map((i, n) => ({
      n: n + 1, key: i.key, section: i.sectionTitle, kind: i.kind, difficulty: i.difficulty, marks: i.marks, score: i.score ?? null,
      ...(i.kind === 'mcq'
        ? { question: i.question, options: i.options || [], key: i.mcqKey || [], selected: i.answer?.selected || [], correct: i.result?.correct ?? null }
        : { title: problems.get(String(i.refId)) || i.title || 'Problem', language: i.answer?.language || '', code: i.answer?.code || '', result: i.result || null, runs: i.runs }),
    })),
  };
}

/** How every question drawn into this exam performed across all marked attempts. */
export async function questionStats(tenantId: string, assignmentId: string) {
  const exam = await loadExam(tenantId, assignmentId);
  const attempts = await PoolExamAttempt.find({ assignment: exam._id, tenant: tenantId, status: 'graded' }).select('items').lean() as any[];
  const by = new Map<string, any>();
  for (const a of attempts) {
    for (const i of a.items) {
      const k = String(i.refId);
      const row = by.get(k) || { id: k, kind: i.kind, title: i.kind === 'mcq' ? i.question : i.title, difficulty: i.difficulty, section: i.sectionTitle, drawn: 0, answered: 0, full: 0, scoreSum: 0, marksSum: 0 };
      row.drawn += 1;
      if (i.kind === 'mcq' ? (i.answer?.selected || []).length : (i.answer?.code || '').trim()) row.answered += 1;
      if (i.marks > 0 && (i.score || 0) >= i.marks) row.full += 1;
      row.scoreSum += i.score || 0;
      row.marksSum += i.marks || 0;
      by.set(k, row);
    }
  }
  const rows = Array.from(by.values()).map(r => {
    const rate = r.marksSum > 0 ? r.scoreSum / r.marksSum : 0;
    const flag = r.drawn >= 3 && r.full === 0 ? 'check' : rate < 0.3 ? 'hard' : rate > 0.9 ? 'easy' : '';
    return {
      id: r.id, kind: r.kind, title: String(r.title || '').slice(0, 300), difficulty: r.difficulty, section: r.section,
      drawn: r.drawn, answered: r.answered, fullMarks: r.full, scoreRate: Math.round(rate * 1000) / 10, flag,
    };
  }).sort((a, b) => a.scoreRate - b.scoreRate || b.drawn - a.drawn);
  return { graded: attempts.length, rows };
}

export async function setReleased(tenantId: string, assignmentId: string, released: boolean) {
  const exam = await loadExam(tenantId, assignmentId);
  await Assignment.updateOne({ _id: exam._id }, { $set: { 'poolExam.resultsReleasedAt': released ? new Date() : null } });
  return { released, releasedAt: released ? new Date() : null };
}

/** Mark an attempt again — for a paper the code runner was too busy to finish, or after fixing a question's tests. */
export async function regrade(tenantId: string, attemptId: string) {
  const a = await PoolExamAttempt.findOne({ _id: oid(attemptId, 'Attempt'), tenant: tenantId });
  if (!a) throw new PbError('Attempt not found', 404);
  if (a.status === 'in_progress') throw new PbError('This attempt is still being taken.', 409);
  await PoolExamAttempt.updateOne({ _id: a._id }, { $set: { status: 'submitted' } });
  await gradeAttempt(String(a._id));
  return attemptDetail(tenantId, attemptId);
}

const REASON: Record<string, string> = { student: 'Submitted', time_up: 'Time ran out', tab_switch: 'Left the tab too often' };
const STATUS: Record<string, string> = { not_started: 'Not started', in_progress: 'In progress', marking: 'Being marked', graded: 'Marked' };

/** The results and the question statistics as a two-sheet spreadsheet. */
export async function exportWorkbook(tenantId: string, assignmentId: string) {
  const [r, q] = await Promise.all([results(tenantId, assignmentId), questionStats(tenantId, assignmentId)]);
  const students = r.rows.map((x, i) => ({
    Rank: x.status === 'graded' ? i + 1 : '', Student: x.name, Email: x.email, Batch: x.batch, Status: STATUS[x.status] || x.status,
    Score: x.score ?? '', 'Out of': x.maxScore, 'Percent': x.percentage ?? '', Result: x.passed === null ? '' : x.passed ? 'Pass' : 'Fail',
    Attempts: x.attempts, 'Minutes taken': x.minutes ?? '', 'How it ended': x.submitReason ? REASON[x.submitReason] : '',
    'Tab switches': x.tabSwitches, 'Paste attempts': x.pasteAttempts, 'Copy attempts': x.copyAttempts,
    'Submitted at': x.submittedAt ? new Date(x.submittedAt).toLocaleString('en-IN') : '',
  }));
  const questions = q.rows.map(x => ({
    Question: x.title, Type: x.kind === 'mcq' ? 'MCQ' : 'Coding', Level: x.difficulty, Section: x.section,
    'Times drawn': x.drawn, Answered: x.answered, 'Full marks': x.fullMarks, 'Average score %': x.scoreRate,
    Note: x.flag === 'check' ? 'Nobody got full marks - check the question' : x.flag === 'hard' ? 'Hard for students' : x.flag === 'easy' ? 'Very easy' : '',
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(students.length ? students : [{ Student: 'No students yet' }]), 'Results');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(questions.length ? questions : [{ Question: 'No marked attempts yet' }]), 'Questions');
  const safe = r.exam.title.replace(/[^\w\- ]+/g, '').trim().slice(0, 60) || 'exam';
  return { filename: `${safe} - results.xlsx`, buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer };
}

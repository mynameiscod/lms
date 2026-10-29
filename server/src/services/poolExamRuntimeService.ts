import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import Assignment, { AssignmentType, IAssignment, IPoolExamSection } from '../models/Assignment';
import PoolExamAttempt, { IExamItem, IPoolExamAttempt, SubmitReason } from '../models/PoolExamAttempt';
import Question from '../models/Question';
import CodingProblem, { CodingProblemTestCase } from '../models/CodingProblem';
import assignmentService from './assignmentService';
import { poolsForExam, PoolQuestion } from './questionPoolService';
import { mcqAnswerKey } from './mcqAnswerKey';
import { normalizePoolExam } from './poolExamService';
import { PbError } from './problemBankService';
import { assertLanguage, runSamples } from './problemDeliveryService';
import { gradeAttempt } from './poolExamGradingService';

/**
 * Pool exams — the student side: who may sit one, drawing their paper, answering, running code,
 * proctoring, and handing it in. See models/PoolExamAttempt.ts for what is frozen and why.
 *
 * Every rule is enforced here, never only in the browser: whether this student was given the exam,
 * the exam window, the number of attempts, the deadline, how often code may run, and what the
 * tab-switch limit does.
 */

export { PbError as ExamError };
export interface Student { userId: string; tenantId: string }

/** Seconds of slack after the deadline for an answer already in flight when the clock hit zero. */
const SAVE_GRACE_MS = 15_000;
const MAX_RUNS_PER_QUESTION = 30;
const RUN_COOLDOWN_MS = 3_000;
const MAX_CODE = 100_000;

const oid = (id: string, what = 'Exam') => {
  if (!mongoose.isValidObjectId(id)) throw new PbError(`${what} not found`, 404);
  return new Types.ObjectId(id);
};

/** Fisher–Yates with a cryptographic source: the draw must not be predictable from the outside. */
function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Plain text with its line breaks, for a bank question written in the rich editor. */
const plainText = (html: string) => String(html || '')
  .replace(/<\s*br\s*\/?>/gi, '\n').replace(/<\/\s*(p|div|li|pre|h\d)\s*>/gi, '\n')
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/\n{3,}/g, '\n\n').trim();

/* ── Access ──────────────────────────────────────────────────────────────────────────────── */

/**
 * The exam as this student may see it, and its window. "Given to this student" is decided by the
 * same query that builds their assignment list — batch, individual, everyone, or a schedule — so
 * the exam opens exactly when it is listed and never otherwise.
 */
async function examFor(s: Student, assignmentId: string) {
  const id = oid(assignmentId);
  const mine = await assignmentService.getStudentAssignments(new Types.ObjectId(s.tenantId), new Types.ObjectId(s.userId));
  const listed = mine.find(a => String(a._id) === String(id));
  if (!listed || listed.type !== AssignmentType.EXAM) throw new PbError('This exam has not been given to you.', 404);
  const exam = await Assignment.findOne({ _id: id, tenant: s.tenantId }) as IAssignment | null;
  if (!exam?.poolExam) throw new PbError('This exam has not been given to you.', 404);
  const startAt: Date | null = listed.delivery?.startAt ? new Date(listed.delivery.startAt) : null;
  const dueAt: Date | null = listed.delivery?.dueAt ? new Date(listed.delivery.dueAt) : null;
  return { exam, rules: normalizePoolExam(exam.poolExam), startAt, dueAt };
}

const resultsVisible = (exam: IAssignment) => !!(exam.poolExam?.showResultsImmediately || exam.poolExam?.resultsReleasedAt);

async function myAttempt(s: Student, attemptId: string) {
  const attempt = await PoolExamAttempt.findOne({ _id: oid(attemptId, 'Attempt'), student: s.userId, tenant: s.tenantId });
  if (!attempt) throw new PbError('Attempt not found', 404);
  return attempt;
}

/* ── Finishing ───────────────────────────────────────────────────────────────────────────── */

/**
 * Hand an attempt in. Only the first caller wins — the student's Submit, the clock and the tab-switch
 * limit can all race for it — and only the winner starts the marking.
 */
async function finish(attempt: IPoolExamAttempt, reason: SubmitReason) {
  if (attempt.status !== 'in_progress') return attempt;
  const submittedAt = new Date();
  const r = await PoolExamAttempt.updateOne({ _id: attempt._id, status: 'in_progress' }, { $set: { status: 'submitted', submittedAt, submitReason: reason } });
  attempt.status = 'submitted';
  if (!r.modifiedCount) return attempt;
  attempt.submittedAt = submittedAt;
  attempt.submitReason = reason;
  // Marking runs code against hidden tests and can take a while; the student is not kept waiting.
  gradeAttempt(String(attempt._id)).catch(e => console.error('[pool-exam] grading failed', attempt._id, e));
  return attempt;
}

/**
 * Change one question of a running attempt in a single atomic update, so two answers saved at the
 * same moment (or an answer and a proctoring event) can never overwrite each other. Refused once the
 * attempt is no longer running.
 */
async function updateItem(attemptId: unknown, key: string, set: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  const fields = Object.fromEntries(Object.entries(set).map(([k, v]) => [`items.$.${k}`, v]));
  const r = await PoolExamAttempt.updateOne({ _id: attemptId, status: 'in_progress', items: { $elemMatch: { key, ...extra } } }, { $set: fields });
  if (!r.matchedCount) throw new PbError('This exam has already been submitted.', 409);
}

/** An attempt whose clock ran out is handed in, whoever notices first. */
async function closeIfExpired(attempt: IPoolExamAttempt, graceMs = 0) {
  if (attempt.status === 'in_progress' && attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + graceMs) {
    await finish(attempt, 'time_up');
    return true;
  }
  return false;
}

/* ── The draw ────────────────────────────────────────────────────────────────────────────── */

/**
 * One student's paper. Per section: the asked-for number at each level, then "any level" from what
 * is left. A question is never drawn twice in one paper, even across sections sharing a pool. With
 * `preferUnseen`, questions this student met in earlier attempts (of any exam) are drawn only when
 * the unseen ones run out.
 */
export async function drawPaper(s: Student, sections: IPoolExamSection[], preferUnseen: boolean): Promise<IExamItem[]> {
  const pools = await poolsForExam({ tenantId: s.tenantId, userId: s.userId, role: '' }, sections.map(x => String(x.poolId)));
  const seen = new Set<string>();
  if (preferUnseen) {
    const past = await PoolExamAttempt.find({ tenant: s.tenantId, student: s.userId }).select('items.refId').lean() as any[];
    past.forEach(p => (p.items || []).forEach((i: any) => seen.add(String(i.refId))));
  }
  const used = new Set<string>();
  const order = (qs: PoolQuestion[]) => {
    const fresh = qs.filter(q => !used.has(q.id));
    return [...shuffle(fresh.filter(q => !seen.has(q.id))), ...shuffle(fresh.filter(q => seen.has(q.id)))];
  };

  const drawn: { section: IPoolExamSection; kind: 'mcq' | 'coding'; q: PoolQuestion }[] = [];
  for (const section of sections) {
    const pool = pools.get(String(section.poolId));
    if (!pool) throw new PbError(`"${section.title}" cannot be drawn: its pool no longer exists. Tell your instructor.`, 409);
    const usable = pool.questions.filter(q => !q.problem);
    const take = (qs: PoolQuestion[], n: number) => {
      const picked = order(qs).slice(0, n);
      if (picked.length < n) throw new PbError(`"${section.title}" cannot be drawn: its pool is short of questions. Tell your instructor.`, 409);
      picked.forEach(q => used.add(q.id));
      return picked;
    };
    const mine = [
      ...take(usable.filter(q => q.difficulty === 'easy'), section.easy),
      ...take(usable.filter(q => q.difficulty === 'medium'), section.medium),
      ...take(usable.filter(q => q.difficulty === 'hard'), section.hard),
    ];
    mine.push(...take(usable, section.any));
    // Within a section, levels are mixed so the paper does not run easy-to-hard for everyone.
    shuffle(mine).forEach(q => drawn.push({ section, kind: pool.kind, q }));
  }

  const mcqIds = drawn.filter(d => d.kind === 'mcq').map(d => d.q.id);
  const mcqs = new Map((await Question.find({ _id: { $in: mcqIds }, tenantId: s.tenantId }).lean() as any[]).map(q => [String(q._id), q]));
  const counter = new Map<string, number>();
  return drawn.map(({ section, kind, q }) => {
    const n = (counter.get(section.key) || 0) + 1;
    counter.set(section.key, n);
    const base = {
      key: `${section.key}:${n}`, sectionKey: section.key, sectionTitle: section.title, kind,
      refId: new Types.ObjectId(q.id), difficulty: q.difficulty, marks: section.marksPerQuestion, runs: 0,
    };
    if (kind === 'coding') return { ...base, title: q.title } as IExamItem;
    const doc = mcqs.get(q.id);
    const key = mcqAnswerKey(doc || {});
    return { ...base, question: plainText(doc?.question || q.title), options: key.options, multiple: key.multiple, mcqKey: key.correct } as IExamItem;
  });
}

/* ── Student endpoints ───────────────────────────────────────────────────────────────────── */

/** The lobby: what the exam is, its rules, the student's attempts, and whether they may start. */
export async function overview(s: Student, assignmentId: string) {
  const { exam, rules, startAt, dueAt } = await examFor(s, assignmentId);
  const attempts = await PoolExamAttempt.find({ assignment: exam._id, student: s.userId }).sort({ attemptNumber: 1 });
  for (const a of attempts) await closeIfExpired(a);
  const visible = resultsVisible(exam);
  const pools = await poolsForExam({ tenantId: s.tenantId, userId: s.userId, role: '' }, rules.sections.map(x => String(x.poolId)));
  const live = attempts.find(a => a.status === 'in_progress');
  const now = Date.now();
  const used = attempts.length;
  let blocked = '';
  if (startAt && now < startAt.getTime()) blocked = 'not_open';
  else if (dueAt && now > dueAt.getTime()) blocked = 'closed';
  else if (!live && rules.maxAttempts > 0 && used >= rules.maxAttempts) blocked = 'no_attempts';
  return {
    id: String(exam._id), title: exam.title, description: exam.description, instructions: exam.instructions,
    totalMarks: exam.totalPoints, passMark: (exam as any).passingPoints ?? null,
    durationMinutes: rules.durationMinutes, maxAttempts: rules.maxAttempts,
    rules: { tabSwitch: rules.tabSwitch, blockCopyPaste: rules.blockCopyPaste },
    sections: rules.sections.map(x => ({
      title: x.title, kind: pools.get(String(x.poolId))?.kind || 'mcq',
      questions: x.easy + x.medium + x.hard + x.any, marks: (x.easy + x.medium + x.hard + x.any) * x.marksPerQuestion,
    })),
    window: { startAt, dueAt },
    attempts: attempts.map(a => ({
      id: String(a._id), attemptNumber: a.attemptNumber, status: a.status, startedAt: a.startedAt, submittedAt: a.submittedAt,
      ...(visible && a.status === 'graded' ? { score: a.score, maxScore: a.maxScore, percentage: a.percentage } : {}),
    })),
    inProgress: live ? String(live._id) : null,
    canStart: !blocked,
    blocked,
    resultsVisible: visible,
  };
}

/** Start a new attempt (drawing its paper), or carry on with the one already running. */
export async function start(s: Student, assignmentId: string) {
  const { exam, rules, startAt, dueAt } = await examFor(s, assignmentId);
  const attempts = await PoolExamAttempt.find({ assignment: exam._id, student: s.userId }).sort({ attemptNumber: -1 });
  for (const a of attempts) await closeIfExpired(a);
  const live = attempts.find(a => a.status === 'in_progress');
  if (live) return { attemptId: String(live._id), resumed: true };

  const now = Date.now();
  if (startAt && now < startAt.getTime()) throw new PbError('This exam has not opened yet.', 409);
  if (dueAt && now > dueAt.getTime()) throw new PbError('This exam has closed.', 409);
  if (rules.maxAttempts > 0 && attempts.length >= rules.maxAttempts) throw new PbError('You have used all your attempts.', 409);

  const items = await drawPaper(s, rules.sections, rules.preferUnseen);
  const byDuration = rules.durationMinutes > 0 ? now + rules.durationMinutes * 60_000 : null;
  const deadline = [byDuration, dueAt?.getTime() ?? null].filter((x): x is number => x !== null);
  try {
    const attempt = await PoolExamAttempt.create({
      tenant: s.tenantId, assignment: exam._id, student: s.userId, attemptNumber: (attempts[0]?.attemptNumber || 0) + 1,
      startedAt: new Date(now), deadlineAt: deadline.length ? new Date(Math.min(...deadline)) : null,
      items, maxScore: items.reduce((n, i) => n + i.marks, 0),
    });
    return { attemptId: String(attempt._id), resumed: false };
  } catch (e: any) {
    // Two Start clicks at once: the other one won; carry on with its attempt.
    if (e?.code === 11000) {
      const winner = await PoolExamAttempt.findOne({ assignment: exam._id, student: s.userId, status: 'in_progress' });
      if (winner) return { attemptId: String(winner._id), resumed: true };
    }
    throw e;
  }
}

/** The paper as the student sees it: no answer keys, no hidden tests, the coding statements read live. */
export async function paper(s: Student, attemptId: string) {
  const attempt = await myAttempt(s, attemptId);
  await closeIfExpired(attempt);
  const exam = await Assignment.findById(attempt.assignment).select('title poolExam').lean() as any;
  const rules = normalizePoolExam(exam?.poolExam);

  const codingIds = attempt.items.filter(i => i.kind === 'coding').map(i => i.refId);
  const [problems, samples] = await Promise.all([
    CodingProblem.find({ _id: { $in: codingIds } })
      .select('title kind statement inputFormat outputFormat constraints limits languages.language languages.starterCode').lean() as any,
    CodingProblemTestCase.find({ problemId: { $in: codingIds }, isSample: true }).sort({ order: 1 }).select('problemId input expectedOutput explanation').lean() as any,
  ]);
  const byId = new Map((problems as any[]).map(p => [String(p._id), p]));

  return {
    id: String(attempt._id), examId: String(attempt.assignment), title: exam?.title || 'Exam',
    status: attempt.status, attemptNumber: attempt.attemptNumber,
    startedAt: attempt.startedAt, deadlineAt: attempt.deadlineAt, submittedAt: attempt.submittedAt, submitReason: attempt.submitReason,
    serverNow: new Date(),
    rules: { tabSwitch: rules.tabSwitch, blockCopyPaste: rules.blockCopyPaste },
    tabSwitches: attempt.tabSwitches,
    maxScore: attempt.maxScore,
    items: attempt.items.map(i => {
      const base = { key: i.key, sectionKey: i.sectionKey, sectionTitle: i.sectionTitle, kind: i.kind, difficulty: i.difficulty, marks: i.marks, answer: i.answer || null, answeredAt: i.answeredAt || null };
      if (i.kind === 'mcq') return { ...base, question: i.question, options: i.options, multiple: !!i.multiple };
      const p = byId.get(String(i.refId));
      return {
        ...base, runsLeft: Math.max(MAX_RUNS_PER_QUESTION - i.runs, 0),
        problem: p ? {
          title: p.title, kind: p.kind, statement: p.statement, inputFormat: p.inputFormat, outputFormat: p.outputFormat,
          constraints: p.constraints, limits: p.limits,
          languages: (p.languages || []).map((l: any) => ({ language: l.language, starterCode: l.starterCode })),
          samples: (samples as any[]).filter(t => String(t.problemId) === String(p._id)).map(t => ({ input: t.input, expectedOutput: t.expectedOutput, explanation: t.explanation })),
        } : { title: i.title, statement: 'This problem is no longer available. Tell your instructor.', languages: [], samples: [] },
      };
    }),
  };
}

async function openItem(s: Student, attemptId: string, key: string) {
  const attempt = await myAttempt(s, attemptId);
  if (await closeIfExpired(attempt, SAVE_GRACE_MS)) throw new PbError('Time is up — your exam has been submitted.', 409);
  if (attempt.status !== 'in_progress') throw new PbError('This exam has already been submitted.', 409);
  const item = attempt.items.find(i => i.key === key);
  if (!item) throw new PbError('Question not found', 404);
  return { attempt, item };
}

/** Save one answer. MCQ: chosen option indexes. Coding: language and code. */
export async function saveAnswer(s: Student, attemptId: string, key: string, body: any) {
  const { attempt, item } = await openItem(s, attemptId, key);
  if (item.kind === 'mcq') {
    const n = item.options?.length || 0;
    let selected: number[] = Array.from(new Set<number>((Array.isArray(body?.selected) ? body.selected : []).map(Number)))
      .filter(x => Number.isInteger(x) && x >= 0 && x < n).sort((a, b) => a - b);
    if (!item.multiple) selected = selected.slice(0, 1);
    await updateItem(attempt._id, key, { answer: { selected }, answeredAt: new Date() });
  } else {
    const code = String(body?.code ?? '');
    if (code.length > MAX_CODE) throw new PbError('Code is limited to 100 KB.');
    const p = await CodingProblem.findById(item.refId).select('kind languages.language').lean() as any;
    const language = p?.kind === 'sql' ? 'sql' : String(body?.language || '');
    if (!p?.languages?.some((l: any) => l.language === language)) throw new PbError('That language is not enabled for this problem.');
    await updateItem(attempt._id, key, { answer: { language, code }, answeredAt: new Date() });
  }
  return { key, savedAt: new Date() };
}

/** Run code on the problem's example tests (or the student's own input). Limited per question. */
export async function run(s: Student, attemptId: string, key: string, body: any) {
  const { attempt, item } = await openItem(s, attemptId, key);
  if (item.kind !== 'coding') throw new PbError('Only coding questions can be run.');
  if (item.runs >= MAX_RUNS_PER_QUESTION) throw new PbError(`You have used all ${MAX_RUNS_PER_QUESTION} runs for this question.`, 429);
  const wait = item.lastRunAt ? RUN_COOLDOWN_MS - (Date.now() - item.lastRunAt.getTime()) : 0;
  if (wait > 0) throw new PbError(`Wait ${Math.ceil(wait / 1000)} s before running again.`, 429);
  const problem = await CodingProblem.findById(item.refId);
  if (!problem) throw new PbError('This problem is no longer available.', 404);

  const language = assertLanguage(problem, String(body?.language || ''));
  if (String(body?.code || '').length > MAX_CODE) throw new PbError('Code is limited to 100 KB.');

  // Counted with the same conditions it was checked against, so two runs fired together cannot
  // both slip under the limit. The code being run is the student's latest work: keep it too.
  const now = new Date();
  const counted = await PoolExamAttempt.updateOne(
    { _id: attempt._id, status: 'in_progress', items: { $elemMatch: { key, runs: item.runs } } },
    { $inc: { 'items.$.runs': 1 }, $set: { 'items.$.lastRunAt': now, 'items.$.answer': { language, code: String(body?.code || '') }, 'items.$.answeredAt': now } },
  );
  if (!counted.modifiedCount) throw new PbError('Another run is in progress — wait a moment.', 429);
  const r = await runSamples(problem, item.marks, {
    language, code: String(body?.code || ''), stdin: body?.stdin, mode: body?.mode === 'custom' ? 'custom' : 'samples',
  });
  return { ...r, runsLeft: MAX_RUNS_PER_QUESTION - item.runs - 1 };
}

/**
 * A proctoring signal from the browser. Tab switches count against the exam's limit: past the
 * last warning, the paper is handed in when the exam says so. Copy and paste attempts are recorded.
 */
export async function violation(s: Student, attemptId: string, type: any) {
  const attempt = await myAttempt(s, attemptId);
  if (attempt.status !== 'in_progress') return { tabSwitches: attempt.tabSwitches, submitted: true };
  if (!['tab_switch', 'copy', 'paste'].includes(type)) throw new PbError('Unknown event.');
  const exam = await Assignment.findById(attempt.assignment).select('poolExam').lean() as any;
  const rules = normalizePoolExam(exam?.poolExam);
  const after = await PoolExamAttempt.findOneAndUpdate(
    { _id: attempt._id, status: 'in_progress' },
    { $push: { violations: { $each: [{ type, at: new Date() }], $slice: -500 } }, $inc: { tabSwitches: type === 'tab_switch' ? 1 : 0 } },
    { new: true },
  );
  if (!after) return { tabSwitches: attempt.tabSwitches, maxWarnings: rules.tabSwitch.maxWarnings, submitted: true };
  const over = type === 'tab_switch' && rules.tabSwitch.enabled && rules.tabSwitch.autoSubmit && after.tabSwitches > rules.tabSwitch.maxWarnings;
  if (over) await finish(after, 'tab_switch');
  return { tabSwitches: after.tabSwitches, maxWarnings: rules.tabSwitch.maxWarnings, submitted: over };
}

export async function submit(s: Student, attemptId: string) {
  const attempt = await myAttempt(s, attemptId);
  if (attempt.status !== 'in_progress') return { status: attempt.status };
  if (!(await closeIfExpired(attempt, SAVE_GRACE_MS))) await finish(attempt, 'student');
  return { status: attempt.status };
}

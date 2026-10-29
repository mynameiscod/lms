import PoolExamAttempt from '../models/PoolExamAttempt';
import CodingProblem, { CodingProblemTestCase } from '../models/CodingProblem';
import { judge } from './problemJudgeService';
import { judgeView } from './problemDeliveryService';
import codeRunner from './codeRunnerService';

/**
 * Marking a submitted pool-exam attempt.
 *
 * MCQ: full marks when the chosen options are exactly the frozen key, otherwise none — there is no
 * negative marking, and "some of the right options" on a multi-answer question is not the answer.
 *
 * Coding: the saved code is run against EVERY test of the problem, hidden ones included, and earns
 * the item's marks in proportion to the weighted tests it passes. Unanswered scores zero without
 * running anything.
 *
 * A code runner that was too busy to run (verdict BUSY) is not a wrong answer: the attempt stays
 * "submitted" and is tried again, so a student is never failed by the server's load.
 */
const BUSY_RETRIES = 3;
const BUSY_WAIT_MS = 20_000;

const sameSet = (a: number[] = [], b: number[] = []) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const round2 = (n: number) => Math.round(n * 100) / 100;

export async function gradeAttempt(attemptId: string, tries = 0): Promise<void> {
  const attempt = await PoolExamAttempt.findById(attemptId);
  if (!attempt || attempt.status !== 'submitted') return;

  let busy = false;
  for (const item of attempt.items) {
    if (item.kind === 'mcq') {
      const chosen = item.answer?.selected || [];
      const correct = chosen.length > 0 && sameSet(chosen, item.mcqKey || []);
      item.score = correct ? item.marks : 0;
      item.result = { correct };
      continue;
    }
    const code = item.answer?.code || '';
    if (!code.trim()) { item.score = 0; item.result = { verdict: 'UNANSWERED', passed: 0, total: 0 }; continue; }
    const problem = await CodingProblem.findById(item.refId);
    if (!problem) { item.score = 0; item.result = { verdict: 'UNAVAILABLE' }; continue; }
    const tests = await CodingProblemTestCase.find({ problemId: problem._id }).sort({ order: 1 }).lean();
    const lang = problem.kind === 'sql' ? 'sql' : String(item.answer?.language || '');
    const r = await judge(judgeView(problem.toObject(), item.marks) as any, lang, code, tests.map(t => ({ ...t })), { revealHidden: false });
    if (r.verdict === 'BUSY') { busy = true; continue; }
    item.score = r.maxScore > 0 ? round2(item.marks * (r.score / r.maxScore)) : 0;
    item.result = { verdict: r.verdict, passed: r.passed, total: r.total, ...(codeRunner.isRealExecutionEnabled() ? {} : { simulated: true }) };
  }

  // Written with a conditional update, not save(): a late proctoring event can touch the attempt
  // while the code runs, and a version clash must not throw the marks away.
  const items = attempt.toObject().items;
  if (busy) {
    await PoolExamAttempt.updateOne({ _id: attempt._id, status: 'submitted' }, { $set: { items } });
    if (tries < BUSY_RETRIES) setTimeout(() => gradeAttempt(attemptId, tries + 1).catch(() => undefined), BUSY_WAIT_MS);
    return;
  }

  const score = round2(attempt.items.reduce((n, i) => n + (i.score || 0), 0));
  await PoolExamAttempt.updateOne({ _id: attempt._id, status: 'submitted' }, {
    $set: {
      items, score, percentage: attempt.maxScore > 0 ? round2((score / attempt.maxScore) * 100) : 0,
      status: 'graded', gradedAt: new Date(),
    },
  });
}

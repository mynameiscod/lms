import Question from '../models/Question';
import Quiz from '../models/Quiz';
import BattleRegistration from '../models/BattleRegistration';
import { resolveCorrectAnswerTexts } from './quizService';

/** Grade one MCQ answer for a battle (mirrors the main quiz grader, incl. option isCorrect flags). */
export function gradeMcq(question: any, selectedOptions: string[]): { isCorrect: boolean; marksAwarded: number } {
  if (question.type !== 'mcq_single' && question.type !== 'mcq_multiple') return { isCorrect: false, marksAwarded: 0 };
  const opts: any[] = Array.isArray(question.options) ? question.options : [];
  const resolve = (ref: any): string => {
    const s = String(ref ?? '').trim();
    if (!isNaN(Number(s)) && opts.length) {
      const o = opts[parseInt(s)];
      if (o !== undefined) return typeof o === 'string' ? o.trim() : (o?.text?.trim() || s);
    }
    return s;
  };
  const selected = (selectedOptions || []).map(resolve).filter(Boolean).sort();
  const correct = resolveCorrectAnswerTexts(question);
  const isCorrect = selected.length > 0 && correct.length > 0 && JSON.stringify(selected) === JSON.stringify(correct);
  return { isCorrect, marksAwarded: isCorrect ? (question.marks || 1) : 0 };
}

/**
 * Sanitized question sets, cached in process.
 *
 * Every entrant in a battle is served the SAME questions, so loading them from Mongo on
 * each exam fetch meant one identical query per person — 100,000 reads of the same rows
 * for a 100k battle, all inside the opening seconds when everyone hits "start" at once.
 *
 * Deliberately an in-process Map rather than Redis: the app has no Redis client today,
 * and putting a live exam behind a new network dependency trades a load problem for an
 * outage risk. Per-worker caching costs one load per worker instead of one per student,
 * which is the same win without the new failure mode. The short TTL bounds how long an
 * edit made mid-battle would take to appear.
 */
const QUESTION_TTL_MS = 60_000;
const questionCache = new Map<string, { at: number; questions: any[] }>();

/** Drop a quiz's cached questions — call after editing questions so a battle picks it up. */
export function invalidateBattleQuestions(quizId: string): void {
  questionCache.delete(String(quizId));
}

async function fetchQuestions(quiz: any): Promise<any[]> {
  const questions = quiz.questionIds?.length
    ? await Question.find({ _id: { $in: quiz.questionIds } }).select('-explanation -correctAnswers -correctAnswerText -__v')
    : await Question.find({ quizId: String(quiz._id) }).select('-explanation -correctAnswers -correctAnswerText -__v');

  return questions.map((q: any) => {
    const obj = q.toObject();
    if (Array.isArray(obj.options)) {
      obj.options = obj.options.map((o: any) => (typeof o === 'string' ? { text: o } : { text: o?.text || String(o) }));
    }
    return obj;
  });
}

/** Unbiased Fisher-Yates. `sort(() => Math.random() - 0.5)` is not a shuffle: comparator
 *  results are inconsistent, so some orderings are far likelier than others — which
 *  matters when shuffling is being relied on to make neighbours' screens differ. */
function shuffled<T>(src: T[]): T[] {
  const a = src.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Load a quiz's questions, sanitized (no answers) for the exam. */
export async function loadBattleQuestions(quiz: any, shuffle = false): Promise<any[]> {
  const key = String(quiz._id);
  const hit = questionCache.get(key);
  let base: any[];

  if (hit && Date.now() - hit.at < QUESTION_TTL_MS) {
    base = hit.questions;
  } else {
    base = await fetchQuestions(quiz);
    questionCache.set(key, { at: Date.now(), questions: base });
  }

  // Always hand back a copy. The cached array is shared by every concurrent request,
  // so shuffling in place would reorder it underneath other students mid-battle.
  return shuffle ? shuffled(base) : base.slice();
}

/**
 * Ordering for the whole battle, in one place so the live rank, the leaderboard, the
 * export and the final freeze can never disagree:
 *   1. higher score wins
 *   2. same score → FASTER time wins (time is a real tiebreaker, not decoration —
 *      five students on 40/40 are ranked 1..5 by how long they took)
 *   3. same score AND same time → whoever submitted first wins
 */
export const BATTLE_SORT = { score: -1, timeSpentSec: 1, submittedAt: 1 } as const;

export interface RankKey {
  score?: number | null;
  timeSpentSec?: number | null;
  submittedAt?: Date | null;
}

/**
 * One student's live rank = (how many people beat them) + 1.
 *
 * This replaces a routine that re-ranked EVERY submitted registration on EVERY submit,
 * one write each. That cost N(N+1)/2 writes per battle — 5 billion at 100k entrants —
 * and made each submission slower than the last, because a student had to wait for
 * everyone ahead of them to be rewritten before their own response returned.
 *
 * Rank is not a fact worth storing during a live battle; it changes every time anyone
 * finishes. Counting it on demand is one indexed query and never writes at all, so the
 * hundred-thousandth submission costs exactly what the first one did. The three clauses
 * below are the tiebreakers above, expressed as "strictly better than me", and they are
 * served by the existing {battleId, score, timeSpentSec} index.
 */
export async function rankOf(battleId: string, me: RankKey): Promise<number> {
  const score = me.score ?? 0;
  const time = me.timeSpentSec ?? 0;
  const at = me.submittedAt ?? new Date();

  const better = await BattleRegistration.countDocuments({
    battleId, status: 'submitted',
    $or: [
      { score: { $gt: score } },
      { score, timeSpentSec: { $lt: time } },
      { score, timeSpentSec: time, submittedAt: { $lt: at } },
    ],
  });
  return better + 1;
}

/**
 * Freeze final ranks onto the documents — once, after a battle closes, so exports and
 * historical records have a stored number without recomputing.
 *
 * Deliberately NOT called from the submit path. One bulkWrite of N ops, versus the
 * N sequential updates per submission this used to do.
 */
export async function finalizeBattleRanks(battleId: string): Promise<number> {
  const subs = await BattleRegistration.find({ battleId, status: 'submitted' })
    .sort(BATTLE_SORT)
    .select('_id')
    .lean();
  if (!subs.length) return 0;

  await BattleRegistration.bulkWrite(
    subs.map((s: any, i: number) => ({
      updateOne: { filter: { _id: s._id }, update: { $set: { rank: i + 1 } } },
    })),
    { ordered: false },
  );
  return subs.length;
}

/** Leaderboard rows for a battle (optionally filtered by door/college). */
export async function getBattleLeaderboard(
  battleId: string,
  opts: { door?: string; college?: string; limit?: number } = {},
): Promise<any[]> {
  const q: any = { battleId, status: 'submitted' };
  if (opts.door) q.doorCode = opts.door;
  if (opts.college) q.college = opts.college;
  const filtered = !!(opts.door || opts.college);
  const rows = await BattleRegistration.find(q)
    .sort(BATTLE_SORT)
    .limit(opts.limit || 100)
    .select('name college score totalMarks percentage timeSpentSec submittedAt doorLabel')
    .lean();

  // Unfiltered, the board IS the overall order, so position is the overall rank and
  // costs nothing. Only a door/college view needs the real overall position looked up,
  // and that is at most `limit` counting queries, run concurrently, on a page view —
  // never on the submit path.
  const overall = filtered
    ? await Promise.all(rows.map((r: any) => rankOf(battleId, r)))
    : rows.map((_: any, i: number) => i + 1);

  // Re-rank within the filtered view so a college-only board reads 1..N.
  return rows.map((r: any, i: number) => ({
    position: i + 1,
    name: r.name,
    college: r.college || '',
    score: r.score ?? 0,
    totalMarks: r.totalMarks ?? 0,
    percentage: Math.round(r.percentage ?? 0),
    timeSpentSec: r.timeSpentSec ?? 0,
    overallRank: overall[i],
  }));
}

/** Load quiz + validate for a battle. */
export async function getBattleQuiz(quizId: string) {
  return Quiz.findById(quizId).select(
    'title totalMarks totalTime passPercentage passingMarks shuffleQuestions instructions questionIds enableCamera enableMicrophone requireFullScreen tabSwitchWarnings warningCount negativeMarking negativeMarkingValue'
  );
}

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

/** Load a quiz's questions, sanitized (no answers) for the exam. */
export async function loadBattleQuestions(quiz: any, shuffle = false): Promise<any[]> {
  let questions: any[] = [];
  if (quiz.questionIds?.length) {
    questions = await Question.find({ _id: { $in: quiz.questionIds } }).select('-explanation -correctAnswers -correctAnswerText -__v');
  } else {
    questions = await Question.find({ quizId: String(quiz._id) }).select('-explanation -correctAnswers -correctAnswerText -__v');
  }
  const out = questions.map((q: any) => {
    const obj = q.toObject();
    if (Array.isArray(obj.options)) {
      obj.options = obj.options.map((o: any) => (typeof o === 'string' ? { text: o } : { text: o?.text || String(o) }));
    }
    return obj;
  });
  // Deterministic-ish shuffle by _id when requested (avoids Math.random determinism concerns is fine here client-side).
  return shuffle ? out.sort(() => Math.random() - 0.5) : out;
}

/** Recompute ranks for a battle: score desc, then time asc. Only submitted registrations. */
export async function computeBattleRanks(battleId: string): Promise<void> {
  const subs = await BattleRegistration.find({ battleId, status: 'submitted' })
    .sort({ score: -1, timeSpentSec: 1, submittedAt: 1 })
    .select('_id');
  let rank = 0;
  for (const s of subs) {
    rank++;
    await BattleRegistration.updateOne({ _id: s._id }, { $set: { rank } });
  }
}

/** Leaderboard rows for a battle (optionally filtered by door/college). */
export async function getBattleLeaderboard(
  battleId: string,
  opts: { door?: string; college?: string; limit?: number } = {},
): Promise<any[]> {
  const q: any = { battleId, status: 'submitted' };
  if (opts.door) q.doorCode = opts.door;
  if (opts.college) q.college = opts.college;
  const rows = await BattleRegistration.find(q)
    .sort({ score: -1, timeSpentSec: 1, submittedAt: 1 })
    .limit(opts.limit || 100)
    .select('name college score totalMarks percentage timeSpentSec rank doorLabel')
    .lean();
  // Re-rank within the filtered view so a college-only board reads 1..N.
  return rows.map((r: any, i: number) => ({
    position: i + 1,
    name: r.name,
    college: r.college || '',
    score: r.score ?? 0,
    totalMarks: r.totalMarks ?? 0,
    percentage: Math.round(r.percentage ?? 0),
    timeSpentSec: r.timeSpentSec ?? 0,
    overallRank: r.rank,
  }));
}

/** Load quiz + validate for a battle. */
export async function getBattleQuiz(quizId: string) {
  return Quiz.findById(quizId).select(
    'title totalMarks totalTime passPercentage passingMarks shuffleQuestions instructions questionIds enableCamera enableMicrophone requireFullScreen tabSwitchWarnings warningCount negativeMarking negativeMarkingValue'
  );
}

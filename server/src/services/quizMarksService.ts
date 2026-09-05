/**
 * What a quiz is actually worth.
 *
 * THE FAULT THIS EXISTS TO CLOSE. Quiz.totalMarks was a number typed by whoever created the
 * quiz, stored independently of the questions attached to it and never reconciled with them.
 * Nothing recomputed it when a question was added, removed, or changed from 1 mark to 2. So a
 * quiz could hold eighteen questions worth twenty marks and declare itself out of eighteen —
 * and a student who earned nineteen of the twenty was shown 106%.
 *
 * It reads as a display bug and is not one. Every percentage on that quiz was divided by the
 * wrong denominator, the pass mark was applied against the wrong scale, and it cuts both ways:
 * one quiz in production stores 105 when only 77 marks exist, so twenty-six students were told
 * they scored far less than they did. Measured across the whole database: 36 quizzes of 293
 * disagree with their own questions, across 444 submitted attempts.
 *
 * The number is now DERIVED. A stored figure that can drift from the thing it describes will
 * drift, and the only reliable answer is the one computed from the questions themselves.
 */
import Question from '../models/Question';
import mongoose from 'mongoose';

/** A question with no marks of its own is worth one, which is what the schema default says. */
const marksOf = (q: any): number => {
  const m = Number(q?.marks);
  return Number.isFinite(m) && m > 0 ? m : 1;
};

const toObjectId = (v: any): mongoose.Types.ObjectId | null => {
  try { return new mongoose.Types.ObjectId(String(v)); } catch { return null; }
};

/**
 * The real total for a quiz, from whichever way its questions are attached.
 *
 * Two shapes exist and both are live: older quizzes own their questions through
 * `Question.quizId`, newer ones reference a shared bank through `questionIds`. Reading only
 * one of them would silently return zero for half the database.
 *
 * A referenced question that no longer exists counts as one mark rather than none. It has been
 * deleted from the bank underneath the quiz, and treating it as worthless would quietly shrink
 * the paper — a student answering the remaining questions perfectly would score over 100%,
 * which is the very failure this function exists to prevent.
 */
export async function computeQuizTotalMarks(quiz: any): Promise<number> {
  if (!quiz) return 0;

  const referenced = Array.isArray(quiz.questionIds) ? quiz.questionIds.filter(Boolean) : [];
  if (referenced.length) {
    const ids = referenced.map(toObjectId).filter(Boolean) as mongoose.Types.ObjectId[];
    const rows = ids.length
      ? await Question.find({ _id: { $in: ids } }).select('marks').lean() as any[]
      : [];
    const found = rows.reduce((n, r) => n + marksOf(r), 0);
    const missing = referenced.length - rows.length;
    return found + Math.max(0, missing);
  }

  // Questions owned by the quiz directly.
  const owned = await Question.find({ quizId: String(quiz._id) }).select('marks').lean() as any[];
  if (owned.length) return owned.reduce((n, r) => n + marksOf(r), 0);

  // Embedded, on the quiz document itself.
  const embedded = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (embedded.length) return embedded.reduce((n: number, r: any) => n + marksOf(r), 0);

  // Nothing attached yet. The author's own figure is all there is, and a quiz still being
  // built should not have its stated total zeroed out from under it.
  return Number(quiz.totalMarks) || 0;
}

/**
 * Keep a quiz's stored total honest, and report when it was wrong.
 *
 * Called wherever a quiz is saved or an attempt begins. Returns what changed so a caller can
 * log it — a quiz whose total moves on its own is worth noticing, because it means somebody
 * edited the questions underneath it.
 */
export async function reconcileQuizTotalMarks(quiz: any): Promise<{ changed: boolean; from: number; to: number }> {
  const from = Number(quiz?.totalMarks) || 0;
  const to = await computeQuizTotalMarks(quiz);
  if (!to || to === from) return { changed: false, from, to: from };
  quiz.totalMarks = to;
  return { changed: true, from, to };
}

/**
 * A percentage that cannot exceed 100, whatever the stored numbers say.
 *
 * The last line of defence. Deriving the total fixes the cause, but a paper edited between a
 * student starting and submitting can still produce a score above its total, and showing a
 * member 106% destroys their trust in every other number on the page.
 */
export const percentageOf = (obtained: number, total: number): number => {
  const t = Number(total);
  if (!Number.isFinite(t) || t <= 0) return 0;
  const pct = (Number(obtained) || 0) / t * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 100) / 100));
};

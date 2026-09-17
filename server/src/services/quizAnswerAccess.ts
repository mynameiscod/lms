/**
 * Who may see a quiz's answers, and the order a student sees its options in.
 *
 * ── ANSWERS ARE AUTHORISED ON THE SERVER, NOT REQUESTED BY A QUERY STRING ─────────────────
 *
 * GET /quizzes/:id/questions/list?includeAnswers=true returned every option's `isCorrect`, the correct answers
 * and the explanation to anybody signed in, for any quiz id, in any tenant. The result screen asks for answers
 * after a student submits, and the question builder asks for them to edit — so the parameter stays, and the server
 * decides whether it is honoured:
 *
 *   an author or grader (create/edit/delete quizzes or questions, or view reports) — always;
 *   a student — only for a quiz they have themselves submitted, and only where the quiz allows answers to be
 *   reviewed after submission (showAnswersAfterSubmit and allowReview, both on by default);
 *   anyone else — never, and the explanation, which usually states the answer, goes with it.
 *
 * ── OPTION ORDER IS STABLE PER STUDENT, AND SAYS NOTHING ABOUT CORRECTNESS ───────────────
 *
 * All 827 Foundation checkpoint questions store the correct option first, and options were served in stored order,
 * so choosing the first option passed every checkpoint — and wrote mastery into Skill DNA. A student's options are
 * now ordered by a deterministic shuffle seeded by the student and the question: the same student sees the same
 * order on every reload and every attempt, different students see different orders, and the correct option is
 * uniformly placed. Grading is unaffected and cannot be steered by the order: an answer is the option's TEXT,
 * compared against the correct answers resolved from the stored question on the server. Authors see stored order.
 */

import crypto from 'crypto';
import QuizAttempt from '../models/QuizAttempt';
import { permissionsOf } from '../middleware/roleGuard';

const AUTHORING = ['create_quiz', 'edit_quiz', 'delete_quiz', 'create_question', 'edit_question', 'view_reports'];

export async function isQuizAuthor(user: { role?: string; customRoleId?: any } | undefined): Promise<boolean> {
  if (!user?.role) return false;
  const held = await permissionsOf(user as { role: string; customRoleId?: any });
  return AUTHORING.some(p => held.includes(p));
}

/** Has this student handed in an attempt at this quiz? */
export async function hasSubmittedAttempt(studentId: string, quizId: string): Promise<boolean> {
  if (!studentId) return false;
  return !!(await QuizAttempt.exists({ studentId: String(studentId), quizId: String(quizId), status: { $in: ['submitted', 'grading'] } }));
}

/** Whether answer keys may be sent to this caller for this quiz. */
export async function answersAllowed(
  user: { role?: string; customRoleId?: any } | undefined,
  userId: string,
  quiz: { _id: any; showAnswersAfterSubmit?: boolean; allowReview?: boolean } | null,
): Promise<boolean> {
  if (!quiz) return false;
  if (await isQuizAuthor(user)) return true;
  if (quiz.showAnswersAfterSubmit === false || quiz.allowReview === false) return false;
  return hasSubmittedAttempt(userId, String(quiz._id));
}

/** A question as a student may see it before they are allowed its answers. */
export function withoutAnswers<T extends Record<string, any>>(q: T): T {
  const out: any = { ...q };
  delete out.correctAnswers;
  delete out.correctAnswerText;
  delete out.explanation;
  if (Array.isArray(out.options)) out.options = out.options.map((o: any) => (o && typeof o === 'object' ? { ...o, isCorrect: false } : o));
  return out;
}

/** A deterministic permutation of `items`, the same for the same seed on every call. */
export function stableShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let counter = 0;
  const next = (): number => {
    const h = crypto.createHash('sha256').update(`${seed}:${counter++}`).digest();
    return h.readUInt32BE(0) / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The options of an MCQ question in the order this student sees them. Other question types are returned unchanged. */
export function orderOptionsForStudent<T extends { _id?: any; type?: string; options?: any[] }>(q: T, studentId: string): T {
  if (!Array.isArray(q.options) || !['mcq_single', 'mcq_multiple'].includes(String(q.type))) return q;
  return { ...q, options: stableShuffle(q.options, `${studentId}:${String(q._id)}`) };
}

/**
 * The answer key of a Question Bank MCQ, read the one way every consumer must read it.
 *
 * The bank stores options in two shapes — plain strings (older rows) and `{ text, isCorrect }`
 * (the editor and the CSV import) — and records the correct answer as option TEXT in
 * `correctAnswers`, sometimes with `isCorrect` flags as well. An option is correct when either
 * says so. A pool refuses a question with no correct option, and a grader marks against these
 * indexes, so both agree on what "correct" means.
 */
export interface McqKey {
  options: string[];
  /** Indexes into `options`, ascending. */
  correct: number[];
  multiple: boolean;
}

const textOf = (o: any): string => (typeof o === 'string' ? o : String(o?.text ?? '')).trim();

export function mcqAnswerKey(q: { type?: string; options?: any[]; correctAnswers?: string[] }): McqKey {
  const options = (q.options || []).map(textOf);
  const byText = new Set((q.correctAnswers || []).map(a => String(a).trim()));
  const correct = options
    .map((t, i) => ((q.options || [])[i]?.isCorrect === true || (t && byText.has(t)) ? i : -1))
    .filter(i => i >= 0);
  return { options, correct, multiple: q.type === 'mcq_multiple' };
}

/** Why an MCQ cannot be drawn into a paper, or '' when it can. */
export function mcqProblem(q: { type?: string; options?: any[]; correctAnswers?: string[] }): string {
  if (q.type !== 'mcq_single' && q.type !== 'mcq_multiple') return 'Not a multiple-choice question';
  const key = mcqAnswerKey(q);
  if (key.options.filter(Boolean).length < 2) return 'Fewer than two options';
  if (!key.correct.length) return 'No correct answer is marked';
  return '';
}

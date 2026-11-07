/**
 * The Thinking Lab question bank: what a question is, and what it needs before members see it.
 * Pure: no database.
 *
 * One bank for every institute (models/ThinkingQuestion.ts), written once and approved by a super
 * admin or a role they gave `manage_thinking_bank`. Four kinds of question: math puzzles, logical
 * thinking, critical thinking, and coding (served only from Year 2, after the track's basics).
 *
 * A non-coding question is answered with a final answer AND the member's reasoning. The answer is
 * checked against `answer` (or one of `acceptedAnswers`); the reasoning against the 3–6 `keySteps`
 * a correct solution must contain, which is what lets a partly right answer earn part of the XP.
 */

export const QUESTION_TYPES = ['math', 'logical', 'critical', 'coding'] as const;
export type QuestionType = typeof QUESTION_TYPES[number];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  math: 'Math puzzle', logical: 'Logical thinking', critical: 'Critical thinking', coding: 'Coding',
};

/** Suggestions only: an admin may type any sub-category. */
export const SUBCATEGORY_SUGGESTIONS: Record<QuestionType, string[]> = {
  math: ['Number puzzles', 'Arithmetic reasoning', 'Percentages and ratios', 'Sequences and series', 'Probability', 'Time, speed and work', 'Ages', 'Guesstimates'],
  logical: ['Seating arrangement', 'Blood relations', 'Direction sense', 'Syllogisms', 'Coding and decoding', 'Classic puzzles', 'Pattern recognition', 'Lateral thinking'],
  critical: ['Spot the flaw', 'Cause and effect', 'Assumptions', 'Strengthen or weaken', 'Inference', 'Decision making', 'Data interpretation'],
  coding: ['Conditions', 'Loops', 'Strings', 'Arrays', 'Functions', 'Hashing', 'Sorting and searching', 'Recursion'],
};

export const QUESTION_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type QuestionDifficulty = typeof QUESTION_DIFFICULTIES[number];

/** The CareerPilot years, by stage key. A question with none listed suits every year. */
export const QUESTION_YEARS = [
  { key: 'foundation', label: 'Year 1' },
  { key: 'build', label: 'Year 2' },
  { key: 'specialize', label: 'Year 3' },
  { key: 'placement', label: 'Year 4' },
] as const;
export const QUESTION_YEAR_KEYS: string[] = QUESTION_YEARS.map((y) => y.key);

/** How a non-coding answer is given. */
export const ANSWER_FORMATS = ['number', 'text', 'choice'] as const;
export type AnswerFormat = typeof ANSWER_FORMATS[number];

export const QUESTION_STATUSES = ['DRAFT', 'PUBLISHED', 'RETIRED'] as const;
export type QuestionStatus = typeof QUESTION_STATUSES[number];

export const KEY_STEPS_MIN = 3;
export const KEY_STEPS_MAX = 6;
export const HINTS_MAX = 3;
export const CHOICES_MIN = 2;
export const CHOICES_MAX = 6;
/** Most questions one AI request may draft. */
export const AI_BATCH_MAX = 10;

export interface QuestionDraft {
  type?: string; subCategory?: string; difficulty?: string; years?: string[];
  title?: string; statement?: string;
  answerFormat?: string; choices?: string[]; answer?: string; acceptedAnswers?: string[];
  keySteps?: string[]; explanation?: string; hints?: string[];
  language?: string; testCases?: { input?: string; expectedOutput?: string; hidden?: boolean }[];
}

const filled = (v: any) => typeof v === 'string' && v.trim().length > 0;

/**
 * Why this question cannot be published yet, in words an admin can act on. Empty = ready.
 * A draft may be saved half-written; only publishing asks for all of it.
 */
export function publishProblems(q: QuestionDraft): string[] {
  const out: string[] = [];
  if (!QUESTION_TYPES.includes(q.type as QuestionType)) out.push('Choose the type of question.');
  if (!QUESTION_DIFFICULTIES.includes(q.difficulty as QuestionDifficulty)) out.push('Choose a difficulty.');
  if (!filled(q.title)) out.push('Give it a title.');
  if (!filled(q.statement) || String(q.statement).trim().length < 20) out.push('Write the question (at least 20 characters).');

  if (q.type === 'coding') {
    const tests = (q.testCases || []).filter((t) => filled(t.expectedOutput));
    if (!tests.length) out.push('Add at least one test case with an expected output.');
    if (!filled(q.language)) out.push('Choose the starting language.');
    return out;
  }

  if (!ANSWER_FORMATS.includes(q.answerFormat as AnswerFormat)) out.push('Choose how the answer is given.');
  if (!filled(q.answer)) out.push('Write the correct answer.');
  if (q.answerFormat === 'number' && filled(q.answer) && !Number.isFinite(Number(String(q.answer).replace(/,/g, '')))) out.push('A number answer must be a number.');
  if (q.answerFormat === 'choice') {
    const choices = (q.choices || []).filter(filled);
    if (choices.length < CHOICES_MIN) out.push(`Give at least ${CHOICES_MIN} choices.`);
    else if (filled(q.answer) && !choices.some((c) => c.trim() === String(q.answer).trim())) out.push('The answer must be one of the choices.');
  }
  const steps = (q.keySteps || []).filter(filled);
  if (steps.length < KEY_STEPS_MIN) out.push(`List at least ${KEY_STEPS_MIN} key steps of the reasoning.`);
  if (steps.length > KEY_STEPS_MAX) out.push(`Keep it to ${KEY_STEPS_MAX} key steps at most.`);
  if (!filled(q.explanation)) out.push('Write the model explanation shown after answering.');
  return out;
}

/** "a , B ,, c" → ['a', 'B', 'c'], trimmed, de-duplicated, bounded. */
export function cleanList(v: any, max: number, each = 300): string[] {
  const arr = Array.isArray(v) ? v : String(v ?? '').split('\n');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const s = String(x ?? '').trim().slice(0, each);
    if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
    if (out.length >= max) break;
  }
  return out;
}

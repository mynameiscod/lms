import ThinkingQuestion from '../models/ThinkingQuestion';
import { aiComplete } from './aiGateway';
import { generateThinkingProblem } from './thinkingLabService';
import {
  QUESTION_TYPES, QUESTION_DIFFICULTIES, QUESTION_YEAR_KEYS, ANSWER_FORMATS, QUESTION_STATUSES,
  QUESTION_TYPE_LABEL, KEY_STEPS_MAX, HINTS_MAX, CHOICES_MAX, AI_BATCH_MAX, QuestionType,
  publishProblems, cleanList,
} from '../data/thinkingBankPolicy';

/**
 * The shared Thinking Lab question bank (models/ThinkingQuestion.ts): list, save, AI drafts.
 * Serving questions to members is the daily-set engine's job, not this file's.
 */

const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const oneOf = <T extends readonly string[]>(v: any, list: T, fallback?: T[number]) =>
  (list.includes(v) ? v : fallback) as T[number] | undefined;

/** Everything an admin may set on a question, checked and trimmed. Publishing is checked separately. */
export function cleanQuestion(b: any) {
  const type = oneOf(b.type, QUESTION_TYPES);
  const coding = type === 'coding';
  const answerFormat = coding ? undefined : oneOf(b.answerFormat, ANSWER_FORMATS, 'text');
  const est = Number(b.estimatedMinutes);
  const order = b.order === '' || b.order == null ? undefined : Number(b.order);
  return {
    type,
    subCategory: str(b.subCategory, 60),
    difficulty: oneOf(b.difficulty, QUESTION_DIFFICULTIES, 'easy'),
    // Coding is never given in Year 1, so it is never stored as a Year 1 question either.
    years: cleanList(b.years, 4, 20).filter((y) => QUESTION_YEAR_KEYS.includes(y) && !(coding && y === 'foundation')),
    title: str(b.title, 120),
    statement: str(b.statement, 6000),
    imageUrl: /^https?:\/\//i.test(str(b.imageUrl, 500)) ? str(b.imageUrl, 500) : undefined,
    answerFormat,
    choices: answerFormat === 'choice' ? cleanList(b.choices, CHOICES_MAX, 200) : [],
    answer: coding ? undefined : str(b.answer, 300) || undefined,
    acceptedAnswers: coding ? [] : cleanList(b.acceptedAnswers, 10, 300),
    keySteps: coding ? [] : cleanList(b.keySteps, KEY_STEPS_MAX + 2, 400),
    explanation: str(b.explanation, 4000) || undefined,
    hints: cleanList(b.hints, HINTS_MAX, 400),
    estimatedMinutes: Number.isFinite(est) && est >= 1 ? Math.min(120, Math.round(est)) : undefined,
    language: coding ? (str(b.language, 20) || 'python') : undefined,
    starterCode: coding ? str(b.starterCode, 6000) : undefined,
    examples: coding && Array.isArray(b.examples)
      ? b.examples.slice(0, 6).map((e: any) => ({ input: str(e?.input, 2000), expectedOutput: str(e?.expectedOutput, 2000), explanation: str(e?.explanation, 1000) || undefined }))
      : [],
    testCases: coding && Array.isArray(b.testCases)
      ? b.testCases.slice(0, 30).map((t: any) => ({ input: String(t?.input ?? '').slice(0, 5000), expectedOutput: String(t?.expectedOutput ?? '').slice(0, 5000), hidden: !!t?.hidden }))
      : [],
    referenceSolution: coding ? str(b.referenceSolution, 10000) || undefined : undefined,
    topics: cleanList(b.topics, 10, 60),
    order: Number.isInteger(order) && (order as number) >= 0 ? order : undefined,
  };
}

/** The next TQ number. A clash under a race is caught by the unique index and retried by the caller. */
async function nextNumber(): Promise<number> {
  const last: any = await ThinkingQuestion.findOne({}).sort({ number: -1 }).select('number').lean();
  return (last?.number || 0) + 1;
}

/** Create with a fresh number, retrying if two saves raced for the same one. */
export async function createQuestion(data: any): Promise<any> {
  for (let i = 0; i < 5; i++) {
    try { return await ThinkingQuestion.create({ ...data, number: await nextNumber() }); }
    catch (e: any) { if (e?.code !== 11000 || !String(e?.message || '').includes('number')) throw e; }
  }
  throw new Error('Could not number the question. Try again.');
}

export const adminRow = (q: any) => ({
  id: String(q._id), number: q.number, code: `TQ-${String(q.number).padStart(4, '0')}`,
  type: q.type, subCategory: q.subCategory || '', difficulty: q.difficulty, years: q.years || [],
  title: q.title, status: q.status, source: q.source, order: q.order ?? null,
  timesServed: q.timesServed || 0, timesSolved: q.timesSolved || 0,
  ready: publishProblems(q).length === 0, updatedAt: q.updatedAt,
});

export const adminDetail = (q: any) => ({
  ...adminRow(q),
  statement: q.statement || '', imageUrl: q.imageUrl || '',
  answerFormat: q.answerFormat || 'text', choices: q.choices || [], answer: q.answer || '', acceptedAnswers: q.acceptedAnswers || [],
  keySteps: q.keySteps || [], explanation: q.explanation || '', hints: q.hints || [], estimatedMinutes: q.estimatedMinutes ?? null,
  language: q.language || 'python', starterCode: q.starterCode || '', examples: q.examples || [], testCases: q.testCases || [],
  referenceSolution: q.referenceSolution || '', topics: q.topics || [],
  problems: publishProblems(q), approvedAt: q.approvedAt || null,
});

export interface BankFilters { type?: string; difficulty?: string; year?: string; status?: string; q?: string }

export function bankQuery(f: BankFilters): Record<string, any> {
  const q: Record<string, any> = {};
  if (QUESTION_TYPES.includes(f.type as any)) q.type = f.type;
  if (QUESTION_DIFFICULTIES.includes(f.difficulty as any)) q.difficulty = f.difficulty;
  if (QUESTION_STATUSES.includes(f.status as any)) q.status = f.status;
  // A year filter includes the questions that suit every year.
  if (QUESTION_YEAR_KEYS.includes(String(f.year))) {
    q.$or = [{ years: f.year }, { years: { $size: 0 } }];
    if (f.year === 'foundation') q.type = q.type === 'coding' ? '__none__' : (q.type || { $ne: 'coding' });
  }
  const text = String(f.q || '').trim();
  if (text) {
    const rx = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 80), 'i');
    const num = /^(?:tq-?)?0*(\d+)$/i.exec(text);
    q.$and = [{ $or: [{ title: rx }, { subCategory: rx }, ...(num ? [{ number: Number(num[1]) }] : [])] }];
  }
  return q;
}

/** Counts for the header: by type (published / all) and by status. */
export async function bankStats() {
  const rows = await ThinkingQuestion.aggregate([{ $group: { _id: { type: '$type', status: '$status' }, n: { $sum: 1 } } }]);
  const byType: Record<string, { published: number; total: number }> = Object.fromEntries(QUESTION_TYPES.map((t) => [t, { published: 0, total: 0 }]));
  const byStatus: Record<string, number> = Object.fromEntries(QUESTION_STATUSES.map((s) => [s, 0]));
  for (const r of rows) {
    if (byType[r._id.type]) { byType[r._id.type].total += r.n; if (r._id.status === 'PUBLISHED') byType[r._id.type].published += r.n; }
    if (byStatus[r._id.status] != null) byStatus[r._id.status] += r.n;
  }
  return { byType, byStatus, total: rows.reduce((n: number, r: any) => n + r.n, 0) };
}

// ── AI drafts ────────────────────────────────────────────────────────────────

const stripJson = (s: string) => (s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

const YEAR_HINT: Record<string, string> = {
  foundation: 'first-year engineering students (no coding background assumed)',
  build: 'second-year engineering students',
  specialize: 'third-year engineering students',
  placement: 'final-year students preparing for campus placement tests',
};

const TYPE_BRIEF: Record<Exclude<QuestionType, 'coding'>, string> = {
  math: 'a math puzzle that needs reasoning, not just a formula — the kind asked in placement aptitude rounds',
  logical: 'a logical-thinking puzzle (arrangements, relations, deduction, patterns)',
  critical: 'a critical-thinking question: a short scenario or argument the student must analyse (flaws, assumptions, cause and effect, best decision)',
};

/**
 * Draft up to AI_BATCH_MAX questions. Every draft is saved as DRAFT and needs an admin's approval
 * before any member sees it — the model is a fast first writer, not a publisher.
 */
export async function generateDrafts(opts: {
  tenantId: string; userId: string; type: QuestionType; subCategory?: string; difficulty: string; year?: string; count: number; brief?: string;
}): Promise<{ created: any[]; failed: number }> {
  const count = Math.min(AI_BATCH_MAX, Math.max(1, Math.round(opts.count || 1)));
  const years = opts.year && QUESTION_YEAR_KEYS.includes(opts.year) ? [opts.year] : [];
  const created: any[] = [];
  let failed = 0;

  if (opts.type === 'coding') {
    // One verified coding problem per call: the generator runs its own tests.
    for (let i = 0; i < Math.min(count, 3); i++) {
      try {
        const p = await generateThinkingProblem(opts.tenantId, opts.subCategory || 'Arrays', opts.difficulty, 'python', opts.brief);
        if (!p) { failed++; continue; }
        created.push(await createQuestion({
          ...cleanQuestion({ ...p, type: 'coding', subCategory: opts.subCategory || p.category, difficulty: opts.difficulty, years }),
          status: 'DRAFT', source: 'ai', createdBy: opts.userId, updatedBy: opts.userId,
        }));
      } catch { failed++; }
    }
    return { created, failed };
  }

  const system = [
    'You write original reasoning questions for Indian engineering students. Every question must have ONE correct answer that you have checked step by step.',
    'Avoid well-known puzzles copied word for word. Use Indian names and everyday Indian contexts where a setting helps. Plain English, short sentences.',
    'Output ONLY raw JSON, no prose.',
  ].join(' ');
  const user = [
    `Write ${count} question(s). Each is ${TYPE_BRIEF[opts.type]}.`,
    opts.subCategory ? `Sub-category: ${opts.subCategory}.` : '',
    `Difficulty: ${opts.difficulty}. Audience: ${YEAR_HINT[opts.year || ''] || 'engineering students in any year'}.`,
    opts.brief ? `Admin's note: ${opts.brief.slice(0, 400)}` : '',
    'For each: a short title; the statement; answerFormat "number", "text" or "choice" (use "choice" with 4 options for critical thinking); choices (only for "choice"); the answer (exactly one of the choices when "choice");',
    'acceptedAnswers (other ways to write the same answer, may be empty); 3 to 5 keySteps — the reasoning steps a correct solution MUST contain, each one short sentence;',
    'an explanation (the model solution, 3-6 sentences); 2-3 hints from gentle to almost-complete; estimatedMinutes.',
    'Return {"questions":[{"title":"","statement":"","answerFormat":"","choices":[],"answer":"","acceptedAnswers":[],"keySteps":[],"explanation":"","hints":[],"estimatedMinutes":5}]}',
  ].filter(Boolean).join('\n');

  let parsed: any[] = [];
  try {
    const text = await aiComplete({ tenantId: opts.tenantId, module: 'thinking_bank_gen', product: 'careerpilot', system, user, maxTokens: Math.min(4000, 700 * count + 300) });
    const j = JSON.parse(stripJson(text));
    parsed = Array.isArray(j?.questions) ? j.questions : [];
  } catch (e: any) {
    throw new Error(`The AI could not write questions just now (${String(e?.message || e).slice(0, 120)}). Try again.`);
  }
  for (const raw of parsed.slice(0, count)) {
    try {
      const data = cleanQuestion({ ...raw, type: opts.type, subCategory: opts.subCategory || raw.subCategory, difficulty: opts.difficulty, years });
      if (!data.title || !data.statement) { failed++; continue; }
      created.push(await createQuestion({ ...data, status: 'DRAFT', source: 'ai', createdBy: opts.userId, updatedBy: opts.userId }));
    } catch { failed++; }
  }
  failed += Math.max(0, count - parsed.length);
  return { created, failed };
}

export const typeLabel = (t: string) => QUESTION_TYPE_LABEL[t as QuestionType] || t;

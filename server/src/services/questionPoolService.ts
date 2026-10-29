import mongoose from 'mongoose';
import QuestionPool, { IQuestionPool, PoolKind, POOL_KINDS } from '../models/QuestionPool';
import CodingProblem from '../models/CodingProblem';
import Question from '../models/Question';
import { Actor, PbError, listProblems, visibilityFilter } from './problemBankService';
import { mcqProblem } from './mcqAnswerKey';

/**
 * Question Pools — see models/QuestionPool.ts for what a pool is and why it only holds links.
 *
 * Every read resolves the links against the banks, so the admin always sees the truth: a problem
 * that was unpublished, lost its tests or was deleted shows up as "cannot be drawn" with the
 * reason, instead of an exam discovering it when a student presses Start.
 */

export { PbError as PoolError };
export type Difficulty = 'easy' | 'medium' | 'hard';
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const MCQ_TYPES = ['mcq_single', 'mcq_multiple'];
const MAX_ITEMS = 2000;

export interface PoolQuestion {
  id: string;
  title: string;
  difficulty: Difficulty;
  topics: string[];
  marks: number;
  /** '' when it can be drawn into a paper. */
  problem: string;
}

const oid = (id: string) => {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Pool not found', 404);
  return new mongoose.Types.ObjectId(id);
};
const diff = (d: any): Difficulty => (DIFFICULTIES.includes(d) ? d : 'medium');
const plain = (html: string) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/** The bank rows behind a set of ids, as pool questions. Ids the actor may not see come back missing. */
export async function resolveQuestions(a: Actor, kind: PoolKind, ids: string[]): Promise<Map<string, PoolQuestion>> {
  const out = new Map<string, PoolQuestion>();
  const valid = ids.filter(id => mongoose.isValidObjectId(id));
  if (!valid.length) return out;

  if (kind === 'coding') {
    const rows = await CodingProblem.find({ _id: { $in: valid }, ...(await visibilityFilter(a)) })
      .select('title difficulty topics marks status testCount').lean() as any[];
    for (const p of rows) {
      out.set(String(p._id), {
        id: String(p._id), title: p.title, difficulty: diff(p.difficulty), topics: p.topics || [], marks: p.marks || 0,
        problem: p.status !== 'published' ? `Not published (${p.status})` : !(p.testCount > 0) ? 'Has no test cases' : '',
      });
    }
  } else {
    const rows = await Question.find({ _id: { $in: valid }, tenantId: a.tenantId, quizId: { $exists: false } })
      .select('question type options correctAnswers difficultyLevel subject topic marks').lean() as any[];
    for (const q of rows) {
      out.set(String(q._id), {
        id: String(q._id), title: plain(q.question).slice(0, 200), difficulty: diff(q.difficultyLevel),
        topics: [q.subject, q.topic].filter(Boolean), marks: q.marks || 0, problem: mcqProblem(q),
      });
    }
  }
  return out;
}

const counts = (qs: PoolQuestion[]) => {
  const usable = qs.filter(q => !q.problem);
  return {
    total: qs.length,
    usable: usable.length,
    easy: usable.filter(q => q.difficulty === 'easy').length,
    medium: usable.filter(q => q.difficulty === 'medium').length,
    hard: usable.filter(q => q.difficulty === 'hard').length,
  };
};

async function load(a: Actor, id: string) {
  const pool = await QuestionPool.findOne({ _id: oid(id), tenantId: a.tenantId });
  if (!pool) throw new PbError('Pool not found', 404);
  return pool;
}

/** A pool with every link resolved. A link the bank no longer has is listed as missing, not dropped. */
async function view(a: Actor, pool: IQuestionPool) {
  const ids = pool.items.map(i => String(i.refId));
  const found = await resolveQuestions(a, pool.kind, ids);
  const questions: PoolQuestion[] = ids.map(id => found.get(id) || {
    id, title: '(removed from the bank)', difficulty: 'medium' as Difficulty, topics: [], marks: 0, problem: 'No longer in the bank',
  });
  return {
    id: String(pool._id), name: pool.name, description: pool.description, kind: pool.kind,
    updatedAt: pool.updatedAt, counts: counts(questions), questions,
  };
}

export async function listPools(a: Actor) {
  const pools = await QuestionPool.find({ tenantId: a.tenantId }).sort({ updatedAt: -1 });
  return Promise.all(pools.map(async p => {
    const v = await view(a, p);
    return { id: v.id, name: v.name, description: v.description, kind: v.kind, updatedAt: v.updatedAt, counts: v.counts };
  }));
}

export async function getPool(a: Actor, id: string) {
  return view(a, await load(a, id));
}

const cleanName = (v: any) => {
  const name = String(v || '').trim().slice(0, 120);
  if (!name) throw new PbError('Give the pool a name.');
  return name;
};

const duplicateName = (e: any) => {
  if (e?.code === 11000) throw new PbError('A pool with this name already exists.', 409);
  throw e;
};

export async function createPool(a: Actor, body: any) {
  const kind = body?.kind as PoolKind;
  if (!POOL_KINDS.includes(kind)) throw new PbError('Choose whether this pool holds coding problems or MCQs.');
  const pool = await QuestionPool.create({
    tenantId: a.tenantId, name: cleanName(body?.name), description: String(body?.description || '').slice(0, 1000),
    kind, createdBy: a.userId,
  }).catch(duplicateName);
  return view(a, pool);
}

/** Name and description only: a pool's kind is fixed, because its questions would no longer fit it. */
export async function updatePool(a: Actor, id: string, body: any) {
  const pool = await load(a, id);
  if (body?.name !== undefined) pool.name = cleanName(body.name);
  if (body?.description !== undefined) pool.description = String(body.description || '').slice(0, 1000);
  await pool.save().catch(duplicateName);
  return view(a, pool);
}

export async function deletePool(a: Actor, id: string) {
  const pool = await load(a, id);
  await pool.deleteOne();
  return { deleted: true };
}

/**
 * Link bank questions to a pool. Each is checked first: a question that cannot be drawn is refused
 * with its reason, so a pool never fills up with questions that would break a paper.
 */
export async function addQuestions(a: Actor, id: string, ids: any) {
  const pool = await load(a, id);
  const wanted = Array.from(new Set((Array.isArray(ids) ? ids : []).map(String)));
  if (!wanted.length) throw new PbError('Choose at least one question.');
  const have = new Set(pool.items.map(i => String(i.refId)));
  const found = await resolveQuestions(a, pool.kind, wanted.filter(w => !have.has(w)));

  const added: string[] = [];
  const refused: { id: string; title: string; reason: string }[] = [];
  for (const w of wanted) {
    if (have.has(w)) continue;
    const q = found.get(w);
    if (!q) { refused.push({ id: w, title: '', reason: 'Not found in the bank' }); continue; }
    if (q.problem) { refused.push({ id: w, title: q.title, reason: q.problem }); continue; }
    added.push(w);
  }
  if (pool.items.length + added.length > MAX_ITEMS) throw new PbError(`A pool holds at most ${MAX_ITEMS} questions.`);
  pool.items.push(...added.map(w => ({ refId: new mongoose.Types.ObjectId(w), addedAt: new Date(), addedBy: a.userId })));
  await pool.save();
  return { added: added.length, refused, pool: await view(a, pool) };
}

/** Unlink questions. They stay in their bank. */
export async function removeQuestions(a: Actor, id: string, ids: any) {
  const pool = await load(a, id);
  const drop = new Set((Array.isArray(ids) ? ids : []).map(String));
  pool.items = pool.items.filter(i => !drop.has(String(i.refId))) as any;
  await pool.save();
  return view(a, pool);
}

/**
 * The bank, browsed from inside a pool: the same filters as the bank screens, each row marked
 * with whether it is already in this pool and whether it could be drawn.
 */
export async function browseBank(a: Actor, id: string, q: any) {
  const pool = await load(a, id);
  const inPool = new Set(pool.items.map(i => String(i.refId)));
  const page = Math.max(Number(q?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(q?.limit) || 25, 1), 100);
  const difficulty = DIFFICULTIES.includes(q?.difficulty) ? q.difficulty : '';

  if (pool.kind === 'coding') {
    const r = await listProblems(a, {
      q: q?.q, difficulty, topic: q?.topic, language: q?.language, status: 'published', sort: 'number', page, limit,
    });
    const rows = (r.items as any[]).map(p => ({
      id: String(p._id), title: p.title, number: p.number, difficulty: diff(p.difficulty), topics: p.topics || [],
      marks: p.marks || 0, problem: !(p.testCount > 0) ? 'Has no test cases' : '', inPool: inPool.has(String(p._id)),
    }));
    return { items: rows, total: r.total, page: r.page, pages: r.pages };
  }

  const filter: any = { tenantId: a.tenantId, quizId: { $exists: false }, type: { $in: MCQ_TYPES } };
  if (difficulty) filter.difficultyLevel = difficulty;
  const rx = (s: any) => ({ $regex: String(s).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' });
  if (String(q?.subject || '').trim()) filter.subject = rx(q.subject);
  if (String(q?.topic || '').trim()) filter.topic = rx(q.topic);
  if (String(q?.q || '').trim()) filter.$or = [{ question: rx(q.q) }, { tags: rx(q.q) }];
  const [rows, total] = await Promise.all([
    Question.find(filter).select('question type options correctAnswers difficultyLevel subject topic marks')
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean() as any,
    Question.countDocuments(filter),
  ]);
  return {
    items: (rows as any[]).map(r => ({
      id: String(r._id), title: plain(r.question).slice(0, 200), difficulty: diff(r.difficultyLevel),
      topics: [r.subject, r.topic].filter(Boolean), marks: r.marks || 0, problem: mcqProblem(r), inPool: inPool.has(String(r._id)),
    })),
    total, page, pages: Math.ceil(total / limit),
  };
}

export interface McqImportRow {
  question: string; options: string[]; correct: string;
  difficulty?: string; marks?: number; tags?: string[]; subject?: string; topic?: string;
}

/**
 * MCQs from a spreadsheet: written into the Question Bank (same shape as the bank's own CSV import,
 * source 'csv') and linked to this pool. A row whose answer matches no option is refused rather than
 * saved without a key — the bank's import keeps those, but a pool must never hold one.
 */
export async function importMcqs(a: Actor, id: string, rows: any) {
  const pool = await load(a, id);
  if (pool.kind !== 'mcq') throw new PbError('Only an MCQ pool can import MCQs.');
  const list: McqImportRow[] = Array.isArray(rows) ? rows.slice(0, 1000) : [];
  if (!list.length) throw new PbError('The file has no questions.');

  const refused: { row: number; reason: string }[] = [];
  const docs: any[] = [];
  list.forEach((r, i) => {
    const text = String(r?.question || '').trim();
    const options = (Array.isArray(r?.options) ? r.options : []).map(o => String(o || '').trim()).filter(Boolean);
    const answer = String(r?.correct || '').trim();
    const letter = /^[A-Za-z]$/.test(answer) ? answer.toUpperCase().charCodeAt(0) - 65 : -1;
    const idx = letter >= 0 && letter < options.length ? letter
      : /^\d+$/.test(answer) && Number(answer) >= 1 && Number(answer) <= options.length ? Number(answer) - 1
        : options.findIndex(o => o.toLowerCase() === answer.toLowerCase());
    if (!text) return refused.push({ row: i + 1, reason: 'No question text' });
    if (options.length < 2) return refused.push({ row: i + 1, reason: 'Fewer than two options' });
    if (idx < 0) return refused.push({ row: i + 1, reason: `Answer "${answer}" matches no option` });
    docs.push({
      tenantId: a.tenantId, createdBy: a.userId, type: 'mcq_single', question: text,
      options: options.map((t, j) => ({ text: t, isCorrect: j === idx })), correctAnswers: [options[idx]],
      marks: Math.max(Number(r?.marks) || 1, 0), difficultyLevel: diff(String(r?.difficulty || '').toLowerCase()),
      tags: Array.isArray(r?.tags) ? r.tags.map(String).filter(Boolean) : [],
      subject: String(r?.subject || '').trim() || undefined, topic: String(r?.topic || '').trim() || undefined,
      source: 'csv', usageCount: 0, usedInQuizzes: [],
    });
  });
  if (pool.items.length + docs.length > MAX_ITEMS) throw new PbError(`A pool holds at most ${MAX_ITEMS} questions.`);

  const created = docs.length ? await Question.insertMany(docs) : [];
  pool.items.push(...created.map(c => ({ refId: c._id as any, addedAt: new Date(), addedBy: a.userId })));
  await pool.save();
  return { imported: created.length, refused, pool: await view(a, pool) };
}

import mongoose from 'mongoose';
import * as XLSX from 'xlsx';
import QuestionPool, { IQuestionPool, PoolKind, POOL_KINDS } from '../models/QuestionPool';
import CodingProblem, { CodingProblemTestCase, isAvailableTo } from '../models/CodingProblem';
import PoolExamAttempt from '../models/PoolExamAttempt';
import Question from '../models/Question';
import Assignment from '../models/Assignment';
import { Actor, PbError, createProblem, listProblems, normalizeInput, visibilityFilter } from './problemBankService';
import { parseImport } from './problemImportService';
import { mcqProblem } from './mcqAnswerKey';
import { looseRow, pick, textCell } from './importText';

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
      .select('title difficulty topics marks status testCount audiences').lean() as any[];
    for (const p of rows) {
      out.set(String(p._id), {
        id: String(p._id), title: p.title, difficulty: diff(p.difficulty), topics: p.topics || [], marks: p.marks || 0,
        // Pool exams are LMS assignments: a problem kept for CareerPilot alone cannot be drawn into one.
        problem: p.status !== 'published' ? `Not published (${p.status})` : !(p.testCount > 0) ? 'Has no test cases'
          : !isAvailableTo(p, 'lms') ? 'Not available to the LMS' : '',
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

/** The pools an exam names, each with its questions resolved. Pools of another institute are absent. */
export async function poolsForExam(a: Actor, ids: string[]) {
  const pools = await QuestionPool.find({ _id: { $in: ids.filter(i => mongoose.isValidObjectId(i)) }, tenantId: a.tenantId });
  return new Map((await Promise.all(pools.map(p => view(a, p)))).map(v => [v.id, v]));
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

/** An item without the imported flag counts as imported when its question was created as it was added. */
const IMPORT_WINDOW_MS = 60_000;

/**
 * Of these pool items, the questions the pool itself imported and nothing has used — they are
 * deleted with the pool, or when removed from it, so test imports do not pile up in the banks.
 * While the pool exists they are ordinary questions, drawn into exams like any other.
 *
 * NEVER A BANK QUESTION. A question picked from the Problem Bank or the Question Bank was not
 * imported here and is only unlinked. On top of that, a question is kept when it is:
 *   - a CodeBegun library problem, or another institute's;
 *   - given to CareerPilot (the practice library), or not an imported Exam-tagged LMS problem;
 *   - an MCQ that belongs to a quiz;
 *   - in any other pool;
 *   - on any student's exam paper, so past results still open.
 */
async function ownedQuestions(pool: IQuestionPool, items: IQuestionPool['items']): Promise<mongoose.Types.ObjectId[]> {
  if (!items.length) return [];
  const ids = items.map(i => i.refId);
  const docs: any[] = pool.kind === 'coding'
    ? await CodingProblem.find({ _id: { $in: ids } }).select('scope tenantId audiences source tags createdAt').lean()
    : await Question.find({ _id: { $in: ids } }).select('tenantId source quizId usedInQuizzes createdAt').lean();
  const byId = new Map(docs.map(d => [String(d._id), d]));
  const candidates = items.filter(i => {
    const d = byId.get(String(i.refId));
    if (!d || String(d.tenantId) !== String(pool.tenantId)) return false;
    const imported = i.imported === true
      || (i.imported === undefined && Math.abs(new Date(i.addedAt).getTime() - new Date(d.createdAt).getTime()) <= IMPORT_WINDOW_MS);
    if (!imported) return false;
    if (pool.kind === 'coding') {
      return d.scope === 'tenant' && d.source === 'import' && !isAvailableTo(d, 'careerpilot')
        && (d.tags || []).some((t: string) => t.toLowerCase() === EXAM_TAG.toLowerCase());
    }
    return d.source === 'csv' && !d.quizId && !(d.usedInQuizzes || []).length;
  }).map(i => i.refId);
  if (!candidates.length) return [];
  const [elsewhere, onPapers] = await Promise.all([
    QuestionPool.find({ _id: { $ne: pool._id }, 'items.refId': { $in: candidates } }).select('items.refId').lean() as Promise<any[]>,
    PoolExamAttempt.distinct('items.refId', { 'items.refId': { $in: candidates } }),
  ]);
  const keep = new Set([
    ...elsewhere.flatMap(p => p.items.map((i: any) => String(i.refId))),
    ...onPapers.map(String),
  ]);
  return candidates.filter(c => !keep.has(String(c)));
}

async function deleteOwned(pool: IQuestionPool, ids: mongoose.Types.ObjectId[]): Promise<number> {
  if (!ids.length) return 0;
  if (pool.kind === 'coding') {
    await CodingProblemTestCase.deleteMany({ problemId: { $in: ids } });
    return (await CodingProblem.deleteMany({ _id: { $in: ids }, scope: 'tenant', tenantId: pool.tenantId })).deletedCount || 0;
  }
  return (await Question.deleteMany({ _id: { $in: ids }, tenantId: pool.tenantId })).deletedCount || 0;
}

export async function deletePool(a: Actor, id: string) {
  const pool = await load(a, id);
  const exams = await Assignment.find({ tenant: a.tenantId, 'poolExam.sections.poolId': pool._id }).select('title').limit(5).lean() as any[];
  if (exams.length) throw new PbError(`This pool is used by ${exams.map(e => `"${e.title}"`).join(', ')}. Remove it from those exams first.`, 409);
  const owned = await ownedQuestions(pool, pool.items);
  await pool.deleteOne();
  return { deleted: true, questionsDeleted: await deleteOwned(pool, owned) };
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

/** Unlink questions. Bank questions stay in their bank; ones only this pool imported and used go (ownedQuestions). */
export async function removeQuestions(a: Actor, id: string, ids: any) {
  const pool = await load(a, id);
  const drop = new Set((Array.isArray(ids) ? ids : []).map(String));
  const owned = await ownedQuestions(pool, pool.items.filter(i => drop.has(String(i.refId))));
  pool.items = pool.items.filter(i => !drop.has(String(i.refId))) as any;
  await pool.save();
  await deleteOwned(pool, owned);
  return view(a, pool);
}

/** Question text or title, compared without case or spacing, to spot the same question imported twice. */
const sameText = (s: unknown) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** What this pool already holds, by text: an import skips these instead of adding a second copy. */
async function textsInPool(pool: IQuestionPool): Promise<Set<string>> {
  const ids = pool.items.map(i => i.refId);
  if (!ids.length) return new Set();
  const docs: any[] = pool.kind === 'coding'
    ? await CodingProblem.find({ _id: { $in: ids } }).select('title').lean()
    : await Question.find({ _id: { $in: ids } }).select('question').lean();
  return new Set(docs.map(d => sameText(pool.kind === 'coding' ? d.title : d.question)));
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
      q: q?.q, difficulty, topic: q?.topic, tag: q?.tag, language: q?.language, status: 'published', product: 'lms', sort: 'number', page, limit,
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
  /** Why the answer is right — shown with the result. */
  explanation?: string;
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
  const seen = await textsInPool(pool);
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
    if (seen.has(sameText(text))) return refused.push({ row: i + 1, reason: 'Already in this pool' });
    seen.add(sameText(text));
    docs.push({
      tenantId: a.tenantId, createdBy: a.userId, type: 'mcq_single', question: text,
      options: options.map((t, j) => ({ text: t, isCorrect: j === idx })), correctAnswers: [options[idx]],
      marks: Math.max(Number(r?.marks) || 1, 0), difficultyLevel: diff(String(r?.difficulty || '').toLowerCase()),
      tags: Array.isArray(r?.tags) ? r.tags.map(String).filter(Boolean) : [],
      subject: String(r?.subject || '').trim() || undefined, topic: String(r?.topic || '').trim() || undefined,
      explanation: String(r?.explanation || '').trim() || undefined,
      source: 'csv', usageCount: 0, usedInQuizzes: [],
    });
  });
  if (pool.items.length + docs.length > MAX_ITEMS) throw new PbError(`A pool holds at most ${MAX_ITEMS} questions.`);

  const created = docs.length ? await Question.insertMany(docs) : [];
  pool.items.push(...created.map(c => ({ refId: c._id as any, addedAt: new Date(), addedBy: a.userId, imported: true })));
  await pool.save();
  return { imported: created.length, refused, pool: await view(a, pool) };
}

/* ── Spreadsheet imports (CSV or Excel) ───────────────────────────────────────────────────────── */

const MAX_FILE_ROWS = 1000;
/** Tag every imported coding problem carries, so the Problem Bank can list exam questions. */
export const EXAM_TAG = 'Exam';
const SHEET_FILE = /\.(csv|xlsx|xls)$/i;

const sheetRows = (filename: string, base64: string): Record<string, string>[] => {
  if (!SHEET_FILE.test(filename)) throw new PbError('Upload a .csv, .xlsx or .xls file.');
  let wb: XLSX.WorkBook;
  // raw: CSV cells exactly as typed — "0", "007" and "0 5" stay text, never numbers or dates.
  try { wb = XLSX.read(Buffer.from(base64, 'base64'), { type: 'buffer', raw: true }); } catch { throw new PbError('That file could not be read as a spreadsheet.'); }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new PbError('The file has no sheets.');
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
};

/** Header names are matched loosely ("Option A", "option_a", "optionA"). */
const looseKey = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');

/** MCQ rows from a CSV or Excel file, in the shape importMcqs takes. */
/**
 * MCQ rows from a CSV or Excel file, in the shape importMcqs takes. Column names are read loosely
 * ("Question Text", "Option 1", "Correct Answer" all work), a question or option written on one line
 * with typed \n between its lines gets its line breaks back, and an answer may be a letter (B), a
 * number (2) or the option's own text.
 */
export function mcqRowsFromFile(filename: string, base64: string): McqImportRow[] {
  return sheetRows(filename, base64).map(raw => {
    const { row } = looseRow(raw);
    const get = (...names: string[]) => pick(row, ...names);
    const optionNames = (l: string, i: number) => [`option${l}`, `option_${l}`, l, `option${i + 1}`, `choice${l}`, `choice${i + 1}`, `opt${l}`, `opt${i + 1}`, `answer${l}`];
    const options = ['a', 'b', 'c', 'd', 'e', 'f'].map((l, i) => textCell(get(...optionNames(l, i)).trim())).filter(Boolean);
    let correct = get('correct', 'correctAnswer', 'answer', 'correctOption', 'ans', 'key', 'answerKey', 'rightAnswer', 'solution').trim();
    // "Option B" / "option 2" → the letter or number on its own.
    correct = correct.replace(/^(option|choice)\s*/i, '');
    return {
      question: textCell(get('question', 'questionText', 'questions', 'q', 'mcq', 'problem', 'statement', 'title').trim()),
      options,
      correct: textCell(correct),
      difficulty: get('difficulty', 'level').trim(), marks: Number(get('marks', 'mark', 'points', 'score')) || 1,
      subject: get('subject').trim(), topic: get('topic').trim(),
      tags: get('tags', 'tag').split(/[;|,]/).map(t => t.trim()).filter(Boolean),
      explanation: textCell(get('explanation', 'answerExplanation', 'reason', 'rationale', 'solutionExplanation').trim()),
    };
  }).filter(r => r.question || r.options.length);
}

/**
 * Coding problems from a CSV or Excel file (the Problem Bank's columns): each row becomes a
 * published problem in this institute's bank, "Available to" the LMS only and tagged Exam, and is
 * linked to this pool. LMS-only keeps it out of the CareerPilot practice library, and the LMS has
 * no open library, so a student meets it only inside an exam paper. A row that could not be drawn
 * into a paper as it stands (no tests, no sample, a test without its expected output…) is refused
 * with the reason, never saved half-done.
 */
export async function importCoding(a: Actor, id: string, filename: string, base64: string) {
  const pool = await load(a, id);
  if (pool.kind !== 'coding') throw new PbError('Only a coding pool can import coding problems.');
  if (!SHEET_FILE.test(filename)) throw new PbError('Upload a .csv, .xlsx or .xls file.');
  const items: any[] = parseImport(filename, base64, undefined);
  if (!items.length) throw new PbError('The file has no problems.');
  if (items.length > MAX_FILE_ROWS) throw new PbError(`At most ${MAX_FILE_ROWS} problems per file — split it.`);
  if (pool.items.length + items.length > MAX_ITEMS) throw new PbError(`A pool holds at most ${MAX_ITEMS} questions.`);

  const refused: { row: number; reason: string }[] = [];
  const created: mongoose.Types.ObjectId[] = [];
  const seen = await textsInPool(pool);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.__error) { refused.push({ row: i + 1, reason: item.__error }); continue; }
    const n = normalizeInput(item);
    const reasons = [...n.errors, ...n.publishErrors];
    if (reasons.length) { refused.push({ row: i + 1, reason: reasons.join(' ') }); continue; }
    if (seen.has(sameText(n.clean.title))) { refused.push({ row: i + 1, reason: 'Already in this pool' }); continue; }
    seen.add(sameText(n.clean.title));
    const tags = n.clean.tags.some((t: string) => t.toLowerCase() === EXAM_TAG.toLowerCase()) ? n.clean.tags : [...n.clean.tags, EXAM_TAG];
    try {
      const { problem } = await createProblem(a, { ...item, tags, audiences: ['lms'], scope: 'tenant', status: 'published' }, 'import');
      created.push(problem._id as mongoose.Types.ObjectId);
    } catch (e: any) {
      refused.push({ row: i + 1, reason: e?.message || 'Could not be saved' });
    }
  }
  pool.items.push(...created.map(c => ({ refId: c, addedAt: new Date(), addedBy: a.userId, imported: true })) as any);
  await pool.save();
  const notRead = Array.from(new Set(items.flatMap((it: any) => it.__unused || [])));
  return { imported: created.length, refused, notRead, pool: await view(a, pool) };
}

/** One upload for either kind of pool: MCQs go to the Question Bank, coding problems to the Problem Bank. */
export async function importFile(a: Actor, id: string, body: any) {
  const pool = await load(a, id);
  const filename = String(body?.filename || ''), data = String(body?.data || '');
  if (!data) throw new PbError('Choose a file to import.');
  // A file in the other kind's format gets told where it belongs, not a list of failed rows.
  const head = new Set(Object.keys(sheetRows(filename, data)[0] || {}).map(looseKey));
  const any = (...names: string[]) => names.some(n => head.has(n));
  const mcqFile = any('question', 'questiontext', 'questions', 'q', 'mcq') && any('optiona', 'a', 'option1', 'choicea', 'choice1', 'opta', 'opt1');
  const codingFile = any('title', 'name', 'problemtitle', 'problemname')
    && any('statement', 'description', 'problemstatement', 'problemdescription', 'sampleinput1', 'input1', 'testinput1');
  if (pool.kind === 'coding' && mcqFile && !codingFile) {
    throw new PbError('This file is in the MCQ format. Import it into an MCQ pool — this pool holds coding problems. Download the coding template for the coding format.');
  }
  if (pool.kind === 'mcq' && codingFile && !mcqFile) {
    throw new PbError('This file is in the coding format. Import it into a coding pool — this pool holds MCQs. Download the MCQ template for the MCQ format.');
  }
  if (pool.kind === 'coding') return importCoding(a, id, filename, data);
  const rows = mcqRowsFromFile(filename, data);
  if (!rows.length) throw new PbError('No questions found. The first row must be the column names — download the template to see them.');
  return importMcqs(a, id, rows);
}

export const MCQ_TEMPLATE = 'question,optionA,optionB,optionC,optionD,correct,explanation,difficulty,marks,subject,topic,tags\n'
  + '"What does JVM stand for?",Java Virtual Machine,Java Variable Method,Joint Virtual Memory,,A,"The JVM runs compiled Java bytecode.",easy,1,Java,Basics,jvm;intro\n'
  + '"Which keyword stops a Java variable from being reassigned?",static,final,const,volatile,B,"A final variable can be assigned once.",medium,2,Java,Keywords,\n'
  + '"What does this print?\nfor (int i = 1; i <= 3; i++) {\n  System.out.print(i + "" "");\n}",1 2 3,"1\n2\n3",0 1 2,Compile error,A,"print keeps the cursor on the same line, so the numbers share one line.",easy,1,Java,Loops,loops;output\n';

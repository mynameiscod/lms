import mongoose from 'mongoose';
import User from '../models/User';
import { QuestionBook, BookQuestion, BookProgress } from '../models/QuestionBook';
import { learnerAudienceOf, LEARNER_AUDIENCE_FIELDS } from './learnerAudience';

export class BookError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

type Actor = { tenantId: string; userId: string; role: string };
const isSuper = (a: Actor) => a.role === 'SUPER_ADMIN';
const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const slugify = (s: string) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'book';
const isId = (v: any) => mongoose.isValidObjectId(v);
const COLORS = ['#4f46e5', '#0d9488', '#be123c', '#b45309', '#0369a1', '#7c3aed', '#15803d', '#c2410c', '#1e293b'];

/* ── Who may see what ───────────────────────────────────────────────────────────────────── */

/** Books a student may read: published, CodeBegun's or their institute's, for their product. */
async function readerFilter(tenantId: string, userId: string) {
  const u: any = await User.findById(userId).select(LEARNER_AUDIENCE_FIELDS).lean();
  /* Shared CareerPilot rule (learnerAudience.ts): unlike the old inline `passport.active` test it
     also honours expiry, so a lapsed member reads as LMS here, exactly like a never-member. */
  const cp = learnerAudienceOf(u).careerpilot;
  return {
    status: 'published',
    $or: [{ scope: 'global' }, { scope: 'tenant', tenantId }],
    audience: { $in: ['all', cp ? 'careerpilot' : 'lms'] },
  };
}

/** Books a staff member may edit: their institute's; a super admin edits CodeBegun's too. */
function editable(a: Actor) {
  return isSuper(a) ? { $or: [{ scope: 'global' }, { scope: 'tenant', tenantId: a.tenantId }] } : { scope: 'tenant', tenantId: a.tenantId };
}
async function bookForEdit(a: Actor, id: string) {
  if (!isId(id)) throw new BookError('Book not found', 404);
  const b = await QuestionBook.findOne({ _id: id, ...editable(a) });
  if (!b) throw new BookError('Book not found, or it belongs to CodeBegun and only a super admin can edit it.', 404);
  return b;
}
async function recount(bookId: any) {
  const n = await BookQuestion.countDocuments({ bookId });
  await QuestionBook.updateOne({ _id: bookId }, { $set: { questionCount: n } });
}

/* ── Staff: books, chapters, questions ──────────────────────────────────────────────────── */

export async function adminBooks(a: Actor) {
  const rows = await QuestionBook.find(editable(a)).sort({ kind: 1, order: 1, title: 1 }).lean();
  return rows.map((b: any) => ({ ...b, id: String(b._id), canEdit: b.scope === 'tenant' || isSuper(a) }));
}

export async function saveBook(a: Actor, id: string | null, b: any) {
  const title = str(b.title, 120);
  if (!title) throw new BookError('Give the book a title.');
  const doc: any = {
    title,
    kind: b.kind === 'company' ? 'company' : 'topic',
    subject: str(b.subject, 80),
    description: str(b.description, 600),
    color: /^#[0-9a-f]{6}$/i.test(b.color) ? b.color : COLORS[title.length % COLORS.length],
    emblem: str(b.emblem, 4),
    audience: ['all', 'lms', 'careerpilot'].includes(b.audience) ? b.audience : 'all',
    status: b.status === 'published' ? 'published' : 'draft',
    order: Number(b.order) || 0,
  };
  if (id) {
    const book = await bookForEdit(a, id);
    if (doc.status === 'published' && !book.questionCount) throw new BookError('Add at least one question before publishing.');
    Object.assign(book, doc);
    await book.save();
    return book;
  }
  const scope = isSuper(a) && b.scope === 'global' ? 'global' : 'tenant';
  const tenantId = scope === 'global' ? null : a.tenantId;
  let slug = slugify(title);
  for (let i = 2; await QuestionBook.exists({ scope, tenantId, slug }); i++) slug = `${slugify(title)}-${i}`;
  return QuestionBook.create({
    ...doc, status: 'draft', scope, tenantId, slug, createdBy: a.userId,
    chapters: (Array.isArray(b.chapters) && b.chapters.length ? b.chapters : ['Chapter 1']).slice(0, 40)
      .map((t: any, i: number) => ({ title: str(typeof t === 'string' ? t : t?.title, 120) || `Chapter ${i + 1}`, order: i })),
  });
}

export async function deleteBook(a: Actor, id: string) {
  const book = await bookForEdit(a, id);
  await BookQuestion.deleteMany({ bookId: book._id });
  await BookProgress.deleteMany({ bookId: String(book._id) });
  await QuestionBook.deleteOne({ _id: book._id });
  return { deleted: true };
}

/** Replace the chapter list: rename, reorder, add, and delete (only an empty chapter). */
export async function saveChapters(a: Actor, id: string, chapters: { id?: string; title: string }[]) {
  const book = await bookForEdit(a, id);
  const list = (Array.isArray(chapters) ? chapters : []).slice(0, 60);
  if (!list.length) throw new BookError('A book needs at least one chapter.');
  const keep = new Set(list.filter((c) => c.id).map((c) => String(c.id)));
  const removed = book.chapters.filter((c) => !keep.has(String(c._id)));
  for (const c of removed) {
    if (await BookQuestion.exists({ bookId: book._id, chapterId: String(c._id) })) throw new BookError(`"${c.title}" still has questions — move or delete them first.`);
  }
  book.chapters = list.map((c, i) => ({
    ...(c.id && isId(c.id) ? { _id: new mongoose.Types.ObjectId(String(c.id)) } : {}),
    title: str(c.title, 120) || `Chapter ${i + 1}`, order: i,
  })) as any;
  await book.save();
  return book;
}

export async function adminBook(a: Actor, id: string) {
  const book = await bookForEdit(a, id);
  const qs = await BookQuestion.find({ bookId: book._id }).sort({ order: 1, createdAt: 1 }).lean();
  return { book: { ...book.toObject(), id: String(book._id) }, questions: qs.map((q: any) => ({ ...q, id: String(q._id) })) };
}

function cleanQ(b: any) {
  return {
    question: str(b.question, 4000),
    answer: str(b.answer, 12000),
    difficulty: ['easy', 'medium', 'hard'].includes(b.difficulty) ? b.difficulty : 'medium',
    askedAt: str(b.askedAt, 200),
    tip: str(b.tip, 600),
  };
}

export async function saveQuestion(a: Actor, bookId: string, qid: string | null, b: any) {
  const book = await bookForEdit(a, bookId);
  const chapterId = String(b.chapterId || book.chapters[0]?._id || '');
  if (!book.chapters.some((c) => String(c._id) === chapterId)) throw new BookError('Pick a chapter.');
  const data = cleanQ(b);
  if (data.question.length < 3) throw new BookError('Write the question.');
  if (qid) {
    const q = await BookQuestion.findOne({ _id: qid, bookId: book._id });
    if (!q) throw new BookError('Question not found', 404);
    Object.assign(q, data, { chapterId });
    await q.save();
    return q;
  }
  const last: any = await BookQuestion.findOne({ bookId: book._id, chapterId }).sort({ order: -1 }).lean();
  const q = await BookQuestion.create({ ...data, bookId: book._id, chapterId, order: (last?.order ?? -1) + 1 });
  await recount(book._id);
  return q;
}

export async function deleteQuestion(a: Actor, bookId: string, qid: string) {
  const book = await bookForEdit(a, bookId);
  await BookQuestion.deleteOne({ _id: qid, bookId: book._id });
  await recount(book._id);
  return { deleted: true };
}

export async function reorderQuestions(a: Actor, bookId: string, chapterId: string, ids: string[]) {
  const book = await bookForEdit(a, bookId);
  await Promise.all((ids || []).filter(isId).map((id, i) => BookQuestion.updateOne({ _id: id, bookId: book._id }, { $set: { order: i, chapterId } })));
  return { ok: true };
}

/**
 * Paste many at once. Blocks separated by a blank line; each block is "Q: …" then "A: …"
 * (the answer may run over several lines). Numbered lines like "1. …" start a new question.
 */
export function parseBulk(text: string) {
  const out: { question: string; answer: string }[] = [];
  let cur: { question: string; answer: string } | null = null;
  let mode: 'q' | 'a' = 'q';
  const push = () => { if (cur && cur.question.trim()) out.push({ question: cur.question.trim(), answer: cur.answer.trim() }); cur = null; };
  for (const raw of String(text || '').replace(/\r/g, '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const q = line.match(/^\s*(?:Q(?:uestion)?\s*\d*\s*[:.)-]|\d+\s*[.)]\s+)(.*)$/i);
    const aM = line.match(/^\s*A(?:ns(?:wer)?)?\s*[:.)-]\s*(.*)$/i);
    if (q) { push(); cur = { question: q[1], answer: '' }; mode = 'q'; continue; }
    if (aM && cur) { cur.answer = aM[1]; mode = 'a'; continue; }
    if (!cur) { if (line.trim()) { cur = { question: line.trim(), answer: '' }; mode = 'q'; } continue; }
    if (mode === 'q') cur.question += `\n${line}`; else cur.answer += `\n${line}`;
  }
  push();
  return out.filter((x) => x.question.length >= 3).slice(0, 300);
}

export async function bulkAdd(a: Actor, bookId: string, chapterId: string, text: string, dryRun: boolean) {
  const book = await bookForEdit(a, bookId);
  if (!book.chapters.some((c) => String(c._id) === chapterId)) throw new BookError('Pick a chapter.');
  const rows = parseBulk(text);
  if (dryRun) return { parsed: rows };
  if (!rows.length) throw new BookError('Nothing to add — start each question with "Q:" and its answer with "A:".');
  const last: any = await BookQuestion.findOne({ bookId: book._id, chapterId }).sort({ order: -1 }).lean();
  let order = (last?.order ?? -1) + 1;
  await BookQuestion.insertMany(rows.map((r) => ({ bookId: book._id, chapterId, order: order++, question: r.question.slice(0, 4000), answer: r.answer.slice(0, 12000) })));
  await recount(book._id);
  return { added: rows.length };
}

/* ── Students: the shelf, the book, progress ────────────────────────────────────────────── */

export async function shelf(tenantId: string, userId: string) {
  const books = await QuestionBook.find(await readerFilter(tenantId, userId)).sort({ kind: 1, order: 1, title: 1 }).lean();
  const prog = await BookProgress.find({ userId, bookId: { $in: books.map((b: any) => String(b._id)) } }).lean();
  const pm = new Map(prog.map((p: any) => [p.bookId, p]));
  return books.map((b: any) => {
    const p: any = pm.get(String(b._id));
    const marks = p?.marks ? Object.values(p.marks instanceof Map ? Object.fromEntries(p.marks) : p.marks) : [];
    return {
      id: String(b._id), slug: b.slug, title: b.title, kind: b.kind, subject: b.subject, description: b.description,
      color: b.color, emblem: b.emblem, questionCount: b.questionCount, chapters: b.chapters.length, global: b.scope === 'global',
      knew: marks.filter((m) => m === 'knew').length, revise: marks.filter((m) => m === 'revise').length,
      favorites: p?.favorites?.length || 0, started: !!p,
    };
  });
}

async function readable(tenantId: string, userId: string, slugOrId: string) {
  const f: any = await readerFilter(tenantId, userId);
  const book: any = await QuestionBook.findOne({ ...f, ...(isId(slugOrId) ? { _id: slugOrId } : { slug: slugOrId }) }).lean();
  if (!book) throw new BookError('Book not found', 404);
  return book;
}

export async function readBook(tenantId: string, userId: string, slugOrId: string) {
  const book = await readable(tenantId, userId, slugOrId);
  const [qs, p] = await Promise.all([
    BookQuestion.find({ bookId: book._id }).sort({ order: 1, createdAt: 1 }).lean(),
    BookProgress.findOne({ userId, bookId: String(book._id) }).lean() as any,
  ]);
  const chapters = [...book.chapters].sort((x: any, y: any) => x.order - y.order);
  const order = new Map(chapters.map((c: any, i: number) => [String(c._id), i]));
  const questions = qs
    .filter((q: any) => order.has(q.chapterId))
    .sort((x: any, y: any) => (order.get(x.chapterId)! - order.get(y.chapterId)!) || x.order - y.order)
    .map((q: any) => ({ id: String(q._id), chapterId: q.chapterId, question: q.question, answer: q.answer, difficulty: q.difficulty, askedAt: q.askedAt, tip: q.tip }));
  const toObj = (m: any) => (m instanceof Map ? Object.fromEntries(m) : m || {});
  return {
    book: { id: String(book._id), slug: book.slug, title: book.title, kind: book.kind, subject: book.subject, description: book.description, color: book.color, emblem: book.emblem, global: book.scope === 'global' },
    chapters: chapters.map((c: any) => ({ id: String(c._id), title: c.title, count: questions.filter((q) => q.chapterId === String(c._id)).length })),
    questions,
    progress: { marks: toObj(p?.marks), favorites: p?.favorites || [], notes: toObj(p?.notes), lastQuestionId: p?.lastQuestionId || '' },
  };
}

export async function saveProgress(tenantId: string, userId: string, bookId: string, b: { questionId?: string; mark?: 'knew' | 'revise' | null; favorite?: boolean; note?: string; last?: string; reset?: boolean }) {
  const book = await readable(tenantId, userId, bookId);
  const id = String(book._id);
  if (b.reset) { await BookProgress.updateOne({ userId, bookId: id }, { $set: { marks: {} } }); return { ok: true }; }
  const set: any = {}; const unset: any = {}; const add: any = {}; const pull: any = {};
  const q = b.questionId && isId(b.questionId) ? String(b.questionId) : '';
  if (q && !(await BookQuestion.exists({ _id: q, bookId: book._id }))) throw new BookError('Question not in this book', 404);
  if (q && b.mark !== undefined) { if (b.mark) set[`marks.${q}`] = b.mark; else unset[`marks.${q}`] = ''; }
  if (q && typeof b.favorite === 'boolean') { if (b.favorite) add.favorites = q; else pull.favorites = q; }
  if (q && b.note !== undefined) { const n = str(b.note, 1000); if (n) set[`notes.${q}`] = n; else unset[`notes.${q}`] = ''; }
  if (b.last && isId(b.last)) set.lastQuestionId = String(b.last);
  const upd: any = { $setOnInsert: { userId, tenantId, bookId: id } };
  if (Object.keys(set).length) upd.$set = set;
  if (Object.keys(unset).length) upd.$unset = unset;
  if (Object.keys(add).length) upd.$addToSet = add;
  if (Object.keys(pull).length) upd.$pull = pull;
  await BookProgress.updateOne({ userId, bookId: id }, upd, { upsert: true });
  return { ok: true };
}

/** Every favourite across every book, with the student's notes — the personal cheat sheet. */
export async function cheatSheet(tenantId: string, userId: string) {
  const progs = await BookProgress.find({ userId, 'favorites.0': { $exists: true } }).lean();
  const f: any = await readerFilter(tenantId, userId);
  const books = await QuestionBook.find({ ...f, _id: { $in: progs.map((p: any) => p.bookId).filter(isId) } }).lean();
  const bm = new Map(books.map((b: any) => [String(b._id), b]));
  const ids = progs.flatMap((p: any) => bm.has(p.bookId) ? p.favorites : []);
  const qs = await BookQuestion.find({ _id: { $in: ids.filter(isId) } }).lean();
  const qm = new Map(qs.map((q: any) => [String(q._id), q]));
  return progs.filter((p: any) => bm.has(p.bookId)).map((p: any) => {
    const b: any = bm.get(p.bookId);
    const notes = p.notes instanceof Map ? Object.fromEntries(p.notes) : p.notes || {};
    return {
      book: { id: String(b._id), slug: b.slug, title: b.title, color: b.color, emblem: b.emblem },
      items: p.favorites.map((qid: string) => qm.get(qid)).filter(Boolean).map((q: any) => ({ id: String(q._id), question: q.question, answer: q.answer, note: notes[String(q._id)] || '' })),
    };
  }).filter((g: any) => g.items.length);
}

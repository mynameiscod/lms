import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import LibraryItem, { LIBRARY_KINDS, LIBRARY_DIFFICULTIES } from '../models/LibraryItem';
import ProblemBundle from '../models/ProblemBundle';
import Question from '../models/Question';
import CodingProblem from '../models/CodingProblem';
import { InterviewQuestion } from '../models/InterviewQuestion';

/**
 * Problem Bundles API — one library of every assessable item plus saved bundles of them.
 * Additive: it reads the older stores only when asked to copy from them, and writes nothing to them.
 */
interface Actor { userId: string; tenantId: string; role: string }
const actor = (req: Request): Actor => ({
  userId: String((req as any).user?.id || (req as any).user?._id || ''),
  tenantId: String((req as any).tenantId || ''),
  role: String((req as any).user?.role || ''),
});
const isSuper = (a: Actor) => a.role === 'SUPER_ADMIN';

class LibError extends Error { constructor(msg: string, public status = 400) { super(msg); } }
const wrap = (fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try { await fn(req, res); } catch (e: any) {
    const status = e instanceof LibError ? e.status : 500;
    if (status === 500) console.error('[content-library]', e);
    res.status(status).json({ success: false, message: e instanceof LibError ? e.message : 'Something went wrong' });
  }
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const list = (v: any): string[] => (Array.isArray(v) ? v : typeof v === 'string' && v ? v.split(',') : []).map((x: any) => String(x).trim()).filter(Boolean);
const oid = (id: string) => { if (!mongoose.isValidObjectId(id)) throw new LibError('Invalid id'); return new mongoose.Types.ObjectId(id); };

/** What this actor may see: their own copies plus CodeBegun's published content (a super admin sees all global). */
const visible = (a: Actor): any => isSuper(a)
  ? { $or: [{ scope: 'global' }, { scope: 'tenant', tenantId: a.tenantId }] }
  : { $or: [{ scope: 'tenant', tenantId: a.tenantId }, { scope: 'global', status: 'published' }] };

const canEdit = (a: Actor, row: { scope: string; tenantId: string | null }) =>
  row.scope === 'global' ? isSuper(a) : row.tenantId === a.tenantId;

const hashOf = (kind: string, title: string, body: string) =>
  crypto.createHash('sha1').update(`${kind}|${(title + ' ' + body).toLowerCase().replace(/\s+/g, ' ').trim()}`).digest('hex');

/** Validates and normalises incoming item fields (create, update and import share this). */
function clean(raw: any) {
  const kind = String(raw?.kind || '');
  if (!(LIBRARY_KINDS as readonly string[]).includes(kind)) throw new LibError(`Unknown type "${kind}"`);
  const title = String(raw?.title || '').trim();
  if (!title) throw new LibError('A title is required');
  const options = (Array.isArray(raw?.options) ? raw.options : [])
    .map((o: any) => ({ text: String(o?.text ?? '').trim(), isCorrect: !!o?.isCorrect })).filter((o: any) => o.text);
  if (kind === 'mcq_single' || kind === 'mcq_multiple') {
    const right = options.filter((o: any) => o.isCorrect).length;
    if (options.length < 2) throw new LibError('A multiple-choice question needs at least 2 options');
    if (!right) throw new LibError('Mark at least one correct option');
    if (kind === 'mcq_single' && right !== 1) throw new LibError('A single-answer question needs exactly one correct option');
  }
  const difficulty = (LIBRARY_DIFFICULTIES as readonly string[]).includes(raw?.difficulty) ? raw.difficulty : 'medium';
  const audiences = list(raw?.audiences).filter(x => x === 'lms' || x === 'careerpilot');
  return {
    kind, title, body: String(raw?.body || ''), options, answer: String(raw?.answer || ''),
    explanation: String(raw?.explanation || ''), difficulty,
    subject: String(raw?.subject || '').trim(), topic: String(raw?.topic || '').trim(),
    tags: list(raw?.tags), companies: list(raw?.companies),
    audiences: audiences.length ? audiences : ['lms', 'careerpilot'],
    marks: Math.max(0, Number(raw?.marks) || 1),
    status: ['draft', 'published', 'archived'].includes(raw?.status) ? raw.status : 'published',
    data: raw?.data && typeof raw.data === 'object' ? raw.data : {},
  };
}

/** The owner fields for a new item: a super admin may write global content; everyone else writes their own. */
function ownerFor(a: Actor, wantGlobal: boolean) {
  if (wantGlobal) {
    if (!isSuper(a)) throw new LibError('Only CodeBegun can add shared content', 403);
    return { scope: 'global' as const, tenantId: null };
  }
  if (!a.tenantId) throw new LibError('No institute selected', 400);
  return { scope: 'tenant' as const, tenantId: a.tenantId };
}

/* ── Items ───────────────────────────────────────────────────────────────────────────────────── */

export const search = wrap(async (req, res) => {
  const a = actor(req);
  const q = req.query as any;
  const and: any[] = [visible(a)];
  const text = String(q.q || '').trim();
  const kinds = list(q.kind); if (kinds.length) and.push({ kind: { $in: kinds } });
  const diffs = list(q.difficulty); if (diffs.length) and.push({ difficulty: { $in: diffs } });
  if (q.subject) and.push({ subject: String(q.subject) });
  if (q.topic) and.push({ topic: String(q.topic) });
  const tags = list(q.tag); if (tags.length) and.push({ tags: { $in: tags } });
  if (q.company) and.push({ companies: String(q.company) });
  if (q.audience) and.push({ audiences: String(q.audience) });
  if (q.source === 'mine') and.push({ scope: 'tenant' });
  else if (q.source === 'codebegun') and.push({ scope: 'global' });
  and.push(q.status && q.status !== 'any' ? { status: String(q.status) } : { status: { $ne: 'archived' } });
  if (q.bundleId) {
    const b = await ProblemBundle.findById(oid(String(q.bundleId))).select('itemIds').lean();
    and.push({ _id: { $in: b?.itemIds || [] } });
  }
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));

  const run = async (match: any, useText: boolean) => {
    const cursor = LibraryItem.find(match, useText ? { score: { $meta: 'textScore' } } : undefined)
      .sort(useText ? { score: { $meta: 'textScore' } } : { updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    return { rows: await cursor, total: await LibraryItem.countDocuments(match) };
  };

  let match: any = text ? { $and: [...and, { $text: { $search: text } }] } : { $and: and };
  let { rows, total } = await run(match, !!text);
  if (text && !total) {
    // Typo-tolerant fallback: every word must appear somewhere in title/tags/topic/subject/body.
    const words = text.split(/\s+/).filter(Boolean).slice(0, 6);
    match = { $and: [...and, ...words.map(w => {
      const re = new RegExp(esc(w), 'i');
      return { $or: [{ title: re }, { tags: re }, { topic: re }, { subject: re }, { companies: re }, { body: re }] };
    })] };
    ({ rows, total } = await run(match, false));
  }

  const fac = await LibraryItem.aggregate([
    { $match: { $and: (match.$and as any[]).filter((c: any) => !c.$text) } },
    { $facet: {
      kind: [{ $group: { _id: '$kind', n: { $sum: 1 } } }],
      difficulty: [{ $group: { _id: '$difficulty', n: { $sum: 1 } } }],
      subject: [{ $match: { subject: { $ne: '' } } }, { $group: { _id: '$subject', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 30 }],
      topic: [{ $match: { topic: { $ne: '' } } }, { $group: { _id: '$topic', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 40 }],
      source: [{ $group: { _id: '$scope', n: { $sum: 1 } } }],
    } },
  ]);
  const f = fac[0] || {};
  const shape = (arr: any[] = []) => arr.map(x => ({ value: x._id, count: x.n }));

  // Which of the shown global items this tenant already has its own copy of.
  const globalIds = rows.filter((r: any) => r.scope === 'global').map((r: any) => r._id);
  const copies = globalIds.length && a.tenantId
    ? await LibraryItem.find({ tenantId: a.tenantId, clonedFrom: { $in: globalIds } }).select('clonedFrom').lean() : [];
  const copyOf = new Map(copies.map((c: any) => [String(c.clonedFrom), String(c._id)]));
  const items = rows.map((r: any) => ({ ...r, myCopyId: copyOf.get(String(r._id)) || null, canEdit: canEdit(a, r) }));

  res.json({ success: true, data: {
    items, total, page, pages: Math.max(1, Math.ceil(total / limit)),
    facets: { kind: shape(f.kind), difficulty: shape(f.difficulty), subject: shape(f.subject), topic: shape(f.topic), source: shape(f.source) },
  } });
});

export const meta = wrap(async (req, res) => {
  const a = actor(req);
  const [mine, shared, bundles] = await Promise.all([
    LibraryItem.countDocuments({ scope: 'tenant', tenantId: a.tenantId, status: { $ne: 'archived' } }),
    LibraryItem.countDocuments({ scope: 'global', status: 'published' }),
    ProblemBundle.countDocuments({ $or: [{ scope: 'tenant', tenantId: a.tenantId }, { scope: 'global', status: 'published' }] }),
  ]);
  res.json({ success: true, data: { kinds: LIBRARY_KINDS, difficulties: LIBRARY_DIFFICULTIES, canEditGlobal: isSuper(a), counts: { mine, shared, bundles } } });
});

export const getOne = wrap(async (req, res) => {
  const a = actor(req);
  const row: any = await LibraryItem.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] }).lean();
  if (!row) throw new LibError('Item not found', 404);
  res.json({ success: true, data: { ...row, canEdit: canEdit(a, row) } });
});

export const create = wrap(async (req, res) => {
  const a = actor(req);
  const owner = ownerFor(a, req.body?.scope === 'global');
  const f = clean(req.body);
  const contentHash = hashOf(f.kind, f.title, f.body);
  const dup = await LibraryItem.findOne({ ...owner, contentHash, status: { $ne: 'archived' } }).select('_id title').lean();
  if (dup && !req.body?.allowDuplicate) throw new LibError(`A similar item already exists: "${(dup as any).title}"`, 409);
  const row = await LibraryItem.create({ ...owner, ...f, contentHash, createdBy: a.userId });
  res.status(201).json({ success: true, data: row });
});

export const update = wrap(async (req, res) => {
  const a = actor(req);
  const row = await LibraryItem.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] });
  if (!row) throw new LibError('Item not found', 404);
  if (!canEdit(a, row)) throw new LibError('CodeBegun content cannot be edited. Clone it to make your own copy.', 403);
  const f = clean({ kind: row.kind, ...req.body });
  Object.assign(row, f, { contentHash: hashOf(f.kind, f.title, f.body) });
  await row.save();
  res.json({ success: true, data: row });
});

/** Soft delete: an archived item drops out of search but bundles that name it keep working. */
export const archive = wrap(async (req, res) => {
  const a = actor(req);
  const row = await LibraryItem.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] });
  if (!row) throw new LibError('Item not found', 404);
  if (!canEdit(a, row)) throw new LibError('CodeBegun content cannot be removed by an institute.', 403);
  row.status = req.query.restore ? 'published' : 'archived';
  await row.save();
  res.json({ success: true, data: row });
});

/** Copies items into the caller's own space. A source already cloned returns the existing copy. */
async function cloneItems(a: Actor, ids: mongoose.Types.ObjectId[]): Promise<Map<string, string>> {
  if (!a.tenantId) throw new LibError('No institute selected');
  const sources: any[] = await LibraryItem.find({ $and: [{ _id: { $in: ids } }, visible(a), { status: { $ne: 'archived' } }] }).lean();
  const out = new Map<string, string>();
  const existing: any[] = await LibraryItem.find({ tenantId: a.tenantId, clonedFrom: { $in: sources.map(s => s._id) } }).select('clonedFrom').lean();
  existing.forEach(e => out.set(String(e.clonedFrom), String(e._id)));
  for (const s of sources) {
    if (out.has(String(s._id))) continue;
    if (s.scope === 'tenant' && s.tenantId === a.tenantId) { out.set(String(s._id), String(s._id)); continue; }
    const { _id, createdAt, updatedAt, scope, tenantId, source, ...rest } = s;
    const copy = await LibraryItem.create({ ...rest, scope: 'tenant', tenantId: a.tenantId, clonedFrom: s._id, status: 'published', createdBy: a.userId });
    out.set(String(s._id), String(copy._id));
  }
  return out;
}

export const clone = wrap(async (req, res) => {
  const a = actor(req);
  const ids = list(req.body?.ids).slice(0, 500).map(oid);
  if (!ids.length) throw new LibError('Choose at least one item');
  const map = await cloneItems(a, ids);
  res.json({ success: true, data: { copied: map.size, map: Object.fromEntries(map) } });
});

/** Bulk create (CSV / JSON import). Skips duplicates and reports per-row problems. */
export const importItems = wrap(async (req, res) => {
  const a = actor(req);
  const owner = ownerFor(a, req.body?.scope === 'global');
  const rows: any[] = Array.isArray(req.body?.items) ? req.body.items.slice(0, 5000) : [];
  if (!rows.length) throw new LibError('Nothing to import');
  const dry = !!req.body?.dryRun;
  const errors: { row: number; message: string }[] = [];
  const good: any[] = [];
  const seen = new Set<string>();
  const hashes = new Set((await LibraryItem.find({ ...owner }).select('contentHash').lean()).map((r: any) => r.contentHash));
  let duplicates = 0;
  rows.forEach((raw, i) => {
    try {
      const f = clean(raw);
      const contentHash = hashOf(f.kind, f.title, f.body);
      if (hashes.has(contentHash) || seen.has(contentHash)) { duplicates++; return; }
      seen.add(contentHash);
      good.push({ ...owner, ...f, contentHash, createdBy: a.userId });
    } catch (e: any) { errors.push({ row: i + 1, message: e.message }); }
  });
  if (!dry && good.length) await LibraryItem.insertMany(good, { ordered: false });
  res.json({ success: true, data: { dryRun: dry, total: rows.length, imported: good.length, duplicates, errors: errors.slice(0, 100), errorCount: errors.length } });
});

/**
 * Copies the caller's items from the OLD stores into the library. Non-destructive and repeatable:
 * the source row is remembered, so running it again only adds what is new.
 */
export const syncFromOldStores = wrap(async (req, res) => {
  const a = actor(req);
  if (!a.tenantId) throw new LibError('No institute selected');
  const asked = list(req.body?.stores);
  const stores = new Set(asked.length ? asked : ['questions', 'problems', 'interview']);
  const wantGlobal = isSuper(a) && req.body?.scope === 'global';
  const owner = wantGlobal ? { scope: 'global' as const, tenantId: null } : { scope: 'tenant' as const, tenantId: a.tenantId };
  const report: Record<string, { found: number; added: number }> = {};

  const add = async (store: string, docs: any[], map: (d: any) => any) => {
    const have = new Set((await LibraryItem.find({ ...owner, 'source.store': store }).select('source.id').lean()).map((r: any) => r.source?.id));
    const fresh = docs.filter(d => !have.has(String(d._id)));
    const items: any[] = [];
    for (const d of fresh) {
      try {
        const m = map(d);
        items.push({ ...owner, ...m, contentHash: hashOf(m.kind, m.title, m.body), source: { store, id: String(d._id) }, createdBy: a.userId });
      } catch { /* skip a malformed legacy row */ }
    }
    if (items.length) await LibraryItem.insertMany(items, { ordered: false });
    report[store] = { found: docs.length, added: items.length };
  };

  if (stores.has('questions') && !wantGlobal) {
    const docs = await Question.find({ tenantId: a.tenantId, $or: [{ quizId: { $exists: false } }, { quizId: null }, { quizId: '' }] }).limit(20000).lean();
    await add('questions', docs, (d: any) => {
      const right = new Set((d.correctAnswers || []).map(String));
      const options = (d.options || []).map((o: any) => typeof o === 'string' ? { text: o, isCorrect: right.has(o) } : { text: String(o.text ?? ''), isCorrect: !!o.isCorrect });
      const kind = d.type === 'coding' ? 'coding' : d.type === 'short_answer' ? 'short_answer' : d.type === 'mcq_multiple' ? 'mcq_multiple' : 'mcq_single';
      const title = String(d.question || '').slice(0, 300);
      if (!title) throw new Error('empty');
      return {
        kind, title, body: d.description || (String(d.question).length > 300 ? d.question : ''), options: kind.startsWith('mcq') ? options : [],
        answer: d.correctAnswerText || (d.correctAnswers || []).join(', '), explanation: d.explanation || '',
        difficulty: d.difficultyLevel || 'medium', subject: d.subject || '', topic: d.topic || '', tags: d.tags || [],
        marks: d.marks || 1, status: 'published', data: kind === 'coding' ? { testCases: d.testCases || [], languages: d.codingLanguages || [] } : {},
      };
    });
  }
  if (stores.has('problems')) {
    const filter: any = wantGlobal ? { scope: 'global' } : { scope: 'tenant', tenantId: a.tenantId };
    const docs = await CodingProblem.find({ ...filter, status: 'published' }).limit(20000).lean();
    await add('problems', docs, (d: any) => ({
      kind: 'coding', title: d.title, body: d.statement || '', answer: '', explanation: d.editorial || '',
      difficulty: d.difficulty || 'medium', subject: 'Coding', topic: (d.topics || [])[0] || '', tags: [...(d.topics || []), ...(d.tags || [])],
      companies: d.companies || [], audiences: d.audiences?.length ? d.audiences : ['lms', 'careerpilot'], marks: d.marks || 1, status: 'published',
      data: { problemBankId: String(d._id), languages: (d.languages || []).map((l: any) => l.language), testCount: d.testCount || 0 },
    }));
  }
  if (stores.has('interview') && !wantGlobal) {
    const docs = await InterviewQuestion.find({ tenantId: a.tenantId, isActive: { $ne: false } }).limit(20000).lean();
    await add('interview', docs, (d: any) => {
      const q = String(d.question || '');
      if (!q) throw new Error('empty');
      return {
        kind: 'interview_qa', title: q.slice(0, 300), body: q.length > 300 ? q : '', answer: d.answer || '',
        explanation: d.explanation || '', difficulty: d.difficulty || 'medium', subject: '', topic: d.category || '',
        tags: d.tags || [], companies: d.companyTags || [], marks: 1, status: 'published', data: {},
      };
    });
  }
  res.json({ success: true, data: { scope: owner.scope, report } });
});

/* ── Bundles ─────────────────────────────────────────────────────────────────────────────────── */

export const listBundles = wrap(async (req, res) => {
  const a = actor(req);
  const rows: any[] = await ProblemBundle.find(visible(a)).sort({ updatedAt: -1 }).limit(500).lean();
  const globalIds = rows.filter(r => r.scope === 'global').map(r => r._id);
  const copies = globalIds.length && a.tenantId ? await ProblemBundle.find({ tenantId: a.tenantId, clonedFrom: { $in: globalIds } }).select('clonedFrom').lean() : [];
  const copyOf = new Map(copies.map((c: any) => [String(c.clonedFrom), String(c._id)]));
  res.json({ success: true, data: rows.map(r => ({ ...r, itemCount: r.itemIds.length, itemIds: undefined, myCopyId: copyOf.get(String(r._id)) || null, canEdit: canEdit(a, r) })) });
});

export const getBundle = wrap(async (req, res) => {
  const a = actor(req);
  const b: any = await ProblemBundle.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] }).lean();
  if (!b) throw new LibError('Bundle not found', 404);
  const found = await LibraryItem.find({ _id: { $in: b.itemIds } }).select('title kind difficulty subject topic scope status').lean();
  const byId = new Map(found.map((i: any) => [String(i._id), i]));
  res.json({ success: true, data: { ...b, canEdit: canEdit(a, b), items: b.itemIds.map((id: any) => byId.get(String(id))).filter(Boolean) } });
});

export const createBundle = wrap(async (req, res) => {
  const a = actor(req);
  const owner = ownerFor(a, req.body?.scope === 'global');
  const name = String(req.body?.name || '').trim();
  if (!name) throw new LibError('A name is required');
  const row = await ProblemBundle.create({
    ...owner, name, description: String(req.body?.description || ''), tags: list(req.body?.tags),
    itemIds: list(req.body?.itemIds).map(oid), status: req.body?.status === 'draft' ? 'draft' : 'published', createdBy: a.userId,
  });
  res.status(201).json({ success: true, data: row });
});

export const updateBundle = wrap(async (req, res) => {
  const a = actor(req);
  const b = await ProblemBundle.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] });
  if (!b) throw new LibError('Bundle not found', 404);
  if (!canEdit(a, b)) throw new LibError('CodeBegun bundles cannot be edited. Clone it to make your own.', 403);
  const body = req.body || {};
  if (body.name !== undefined) { const n = String(body.name).trim(); if (!n) throw new LibError('A name is required'); b.name = n; }
  if (body.description !== undefined) b.description = String(body.description);
  if (body.tags !== undefined) b.tags = list(body.tags);
  if (body.status) b.status = body.status === 'draft' ? 'draft' : 'published';
  if (body.itemIds !== undefined) b.itemIds = list(body.itemIds).map(oid);
  if (body.addIds) { const have = new Set(b.itemIds.map(String)); list(body.addIds).forEach(id => { if (!have.has(id)) b.itemIds.push(oid(id)); }); }
  if (body.removeIds) { const drop = new Set(list(body.removeIds)); b.itemIds = b.itemIds.filter(i => !drop.has(String(i))); }
  await b.save();
  res.json({ success: true, data: b });
});

export const deleteBundle = wrap(async (req, res) => {
  const a = actor(req);
  const b = await ProblemBundle.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] });
  if (!b) throw new LibError('Bundle not found', 404);
  if (!canEdit(a, b)) throw new LibError('CodeBegun bundles cannot be removed by an institute.', 403);
  await b.deleteOne();
  res.json({ success: true });
});

/** Clones a bundle and every item in it into the caller's own space. */
export const cloneBundle = wrap(async (req, res) => {
  const a = actor(req);
  if (!a.tenantId) throw new LibError('No institute selected');
  const src: any = await ProblemBundle.findOne({ $and: [{ _id: oid(req.params.id) }, visible(a)] }).lean();
  if (!src) throw new LibError('Bundle not found', 404);
  const existing: any = await ProblemBundle.findOne({ tenantId: a.tenantId, clonedFrom: src._id }).lean();
  if (existing) return res.json({ success: true, data: { id: String(existing._id), alreadyCloned: true } });
  const map = await cloneItems(a, src.itemIds);
  const copy = await ProblemBundle.create({
    scope: 'tenant', tenantId: a.tenantId, name: src.name, description: src.description, tags: src.tags, status: 'published',
    itemIds: src.itemIds.map((i: any) => map.get(String(i))).filter(Boolean).map((i: string) => new mongoose.Types.ObjectId(i)),
    clonedFrom: src._id, createdBy: a.userId,
  });
  res.status(201).json({ success: true, data: { id: String(copy._id), items: copy.itemIds.length } });
});

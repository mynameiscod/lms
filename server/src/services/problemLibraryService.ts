import mongoose from 'mongoose';
import CodingProblem, { CodingProblemTestCase, DSA_TAG, availableTo } from '../models/CodingProblem';
import ProblemSubmission from '../models/ProblemSubmission';
import { PbError } from './problemBankService';
import { Learner, runSamples, gradeAndRecord } from './problemDeliveryService';
import { globalPracticeClause, onGrantChange } from './contentGrantService';

/**
 * The practice library: every published Problem Bank problem a CareerPilot member may choose to
 * solve, with search and filters, their own progress, and the same judge and rewards as a
 * problem set. No set is needed and nothing here is assigned: the member picks.
 *
 * What a member can open: published problems that are global (CodeBegun's library) or belong to
 * their own institute. Drafts and archived problems never appear. Hidden tests, reference
 * solutions and the code wrappers are never sent to the browser.
 */

/**
 * The problems a member may open here: published, tagged DSA, available to CareerPilot, and either
 * the institute's own or shared with it by the super admin.
 *
 * DSA ONLY. Everything else in the bank — exam questions above all — reaches a student only when it
 * is assigned (an exam pool, a problem set). Without this rule every new problem would turn up here
 * the moment it was published.
 */
const visible = async (tenantId: string) => {
  const shared = await globalPracticeClause(tenantId);
  return {
    status: 'published', tags: DSA_TAG,
    $and: [{ $or: [...(shared ? [shared] : []), { scope: 'tenant', tenantId }] }, availableTo('careerpilot')],
  };
};
// Totals and filter choices are cached per tenant; a grant change must show at once.
onGrantChange(() => cache.clear());

export function assertMayUseLibrary(l: Learner) {
  if (!l.isCareerPilot && !l.isStaff) throw new PbError('The problem library is for CareerPilot members.', 403);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const csv = (v: unknown) => String(v ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const DIFFS = ['easy', 'medium', 'hard'] as const;

/** Which problems this member has solved, and which they tried but have not solved. */
async function myResults(userId: string) {
  const rows: any[] = await ProblemSubmission.aggregate([
    { $match: { userId } },
    { $group: { _id: '$problemId', solved: { $max: { $cond: [{ $eq: ['$verdict', 'AC'] }, 1, 0] } } } },
  ]);
  const solved: any[] = []; const triedOnly: any[] = [];
  for (const r of rows) (r.solved ? solved : triedOnly).push(r._id);
  return { solved, triedOnly, solvedSet: new Set(solved.map(String)), triedSet: new Set(triedOnly.map(String)) };
}

// ── Totals and filter choices (cached briefly: they are the same for everyone in an institute) ──

const cache = new Map<string, { at: number; data: any }>();
const TTL_MS = 10 * 60_000;
export const __clearLibraryCache = () => cache.clear();

async function cached<T>(key: string, build: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data as T;
  const data = await build();
  cache.set(key, { at: Date.now(), data });
  return data;
}

export async function libraryTotals(tenantId: string): Promise<{ total: number; byDifficulty: Record<string, number> }> {
  return cached(`totals:${tenantId}`, async () => {
    const rows: any[] = await CodingProblem.aggregate([{ $match: (await visible(tenantId)) }, { $group: { _id: '$difficulty', n: { $sum: 1 } } }]);
    const byDifficulty: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    for (const r of rows) byDifficulty[r._id] = r.n;
    return { total: rows.reduce((s, r) => s + r.n, 0), byDifficulty };
  });
}

/** The filter choices, with how many problems each has. */
export async function libraryFacets(l: Learner) {
  assertMayUseLibrary(l);
  return cached(`facets:${l.tenantId}`, async () => {
    const m = { $match: (await visible(l.tenantId)) };
    const top = (field: string, limit: number) => CodingProblem.aggregate([m, { $unwind: `$${field}` }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: limit }]);
    const [totals, topics, tags, companies, langs] = await Promise.all([
      libraryTotals(l.tenantId),
      top('topics', 200), top('tags', 150), top('companies', 150),
      CodingProblem.aggregate([m, { $unwind: '$languages' }, { $group: { _id: '$languages.language', n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
    ]);
    const shape = (rows: any[]) => rows.filter((r) => r._id).map((r) => ({ name: String(r._id), count: r.n as number }));
    return { total: totals.total, difficulties: totals.byDifficulty, topics: shape(topics), tags: shape(tags), companies: shape(companies), languages: shape(langs) };
  });
}

// ── The list ─────────────────────────────────────────────────────────────────────────────────

export interface LibraryQuery {
  q?: string; difficulty?: string; topic?: string; tag?: string; company?: string; language?: string;
  status?: string; sort?: string; page?: string | number; limit?: string | number;
}

export async function listLibrary(l: Learner, q: LibraryQuery) {
  assertMayUseLibrary(l);
  const limit = Math.min(100, Math.max(1, Math.round(Number(q.limit)) || 25));
  const page = Math.max(1, Math.round(Number(q.page)) || 1);
  const mine = await myResults(l.userId);

  const and: any[] = [(await visible(l.tenantId))];
  const diffs = csv(q.difficulty).filter((d) => (DIFFS as readonly string[]).includes(d));
  if (diffs.length) and.push({ difficulty: { $in: diffs } });
  if (csv(q.topic).length) and.push({ topics: { $in: csv(q.topic) } });
  if (csv(q.tag).length) and.push({ tags: { $in: csv(q.tag) } });
  if (csv(q.company).length) and.push({ companies: { $in: csv(q.company) } });
  if (csv(q.language).length) and.push({ 'languages.language': { $in: csv(q.language) } });

  const text = String(q.q || '').trim().slice(0, 80);
  if (text) {
    const re = new RegExp(escapeRe(text), 'i');
    const or: any[] = [{ title: re }, { slug: re }, { topics: re }, { tags: re }, { companies: re }];
    if (/^#?\d{1,9}$/.test(text)) or.push({ number: Number(text.replace('#', '')) });
    and.push({ $or: or });
  }
  if (q.status === 'solved') and.push({ _id: { $in: mine.solved } });
  else if (q.status === 'attempted') and.push({ _id: { $in: mine.triedOnly } });
  else if (q.status === 'todo') and.push({ _id: { $nin: [...mine.solved, ...mine.triedOnly] } });
  const match = { $and: and };

  const sort: Record<string, 1 | -1> =
    q.sort === 'easiest' ? { rank: 1, number: 1, _id: 1 }
      : q.sort === 'hardest' ? { rank: -1, number: 1, _id: 1 }
        : q.sort === 'acceptance' ? { acceptance: -1, number: 1, _id: 1 }
          : q.sort === 'newest' ? { createdAt: -1, _id: 1 }
            : { number: 1, _id: 1 };

  const [rows, total, totals] = await Promise.all([
    CodingProblem.aggregate([
      { $match: match },
      { $addFields: {
        rank: { $switch: { branches: [{ case: { $eq: ['$difficulty', 'easy'] }, then: 1 }, { case: { $eq: ['$difficulty', 'medium'] }, then: 2 }], default: 3 } },
        acceptance: { $cond: [{ $gt: ['$stats.attempts', 0] }, { $divide: ['$stats.accepted', '$stats.attempts'] }, 0] },
      } },
      { $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit },
      { $project: { number: 1, slug: 1, title: 1, difficulty: 1, topics: 1, tags: 1, companies: 1, kind: 1, 'languages.language': 1, stats: 1 } },
    ]),
    CodingProblem.countDocuments(match),
    libraryTotals(l.tenantId),
  ]);

  // Progress is measured against the whole library, whatever the filters on the page.
  const solvedByDiff: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  if (mine.solved.length) {
    const rowsSolved: any[] = await CodingProblem.aggregate([{ $match: { $and: [(await visible(l.tenantId)), { _id: { $in: mine.solved } }] } }, { $group: { _id: '$difficulty', n: { $sum: 1 } } }]);
    for (const r of rowsSolved) solvedByDiff[r._id] = r.n;
  }
  const solvedTotal = solvedByDiff.easy + solvedByDiff.medium + solvedByDiff.hard;

  // "Next up": the easiest problem not solved yet.
  let next: any = null;
  for (const d of DIFFS) {
    next = await CodingProblem.findOne({ $and: [(await visible(l.tenantId)), { difficulty: d }, { _id: { $nin: mine.solved } }] }).sort({ number: 1, _id: 1 }).select('number title difficulty').lean();
    if (next) break;
  }

  return {
    rows: rows.map((r) => ({
      _id: String(r._id), number: r.number, slug: r.slug, title: r.title, difficulty: r.difficulty, kind: r.kind,
      topics: r.topics || [], tags: r.tags || [], companies: r.companies || [],
      languages: (r.languages || []).map((x: any) => x.language),
      acceptance: r.stats?.attempts ? Math.round((r.stats.accepted / r.stats.attempts) * 100) : null,
      attempts: r.stats?.attempts || 0,
      status: mine.solvedSet.has(String(r._id)) ? 'solved' : mine.triedSet.has(String(r._id)) ? 'attempted' : 'todo',
    })),
    total, page, limit, pages: Math.max(1, Math.ceil(total / limit)),
    progress: {
      solved: solvedTotal, total: totals.total,
      byDifficulty: Object.fromEntries(DIFFS.map((d) => [d, { solved: solvedByDiff[d], total: totals.byDifficulty[d] || 0 }])),
    },
    next: next ? { _id: String(next._id), number: next.number, title: next.title, difficulty: next.difficulty } : null,
  };
}

// ── One problem ──────────────────────────────────────────────────────────────────────────────

async function loadProblem(l: Learner, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Problem not found', 404);
  const p = await CodingProblem.findOne({ _id: id, ...(await visible(l.tenantId)) });
  if (!p) throw new PbError('This problem is not available.', 404);
  return p;
}

/** The problem as a member sees it: examples only, starter code only, no solutions or wrappers. */
export async function libraryProblem(l: Learner, id: string) {
  assertMayUseLibrary(l);
  const p = await loadProblem(l, id);
  const [samples, subs, prev, next, totals] = await Promise.all([
    CodingProblemTestCase.find({ problemId: p._id, isSample: true }).sort({ order: 1 }).select('input expectedOutput explanation').lean(),
    ProblemSubmission.find({ userId: l.userId, problemId: p._id }).sort({ createdAt: -1 }).limit(30)
      .select('language code verdict passed total score maxScore timeMs late createdAt compileError').lean(),
    CodingProblem.findOne({ $and: [(await visible(l.tenantId)), { $or: [{ number: { $lt: p.number } }, { number: p.number, _id: { $lt: p._id } }] }] }).sort({ number: -1, _id: -1 }).select('_id').lean(),
    CodingProblem.findOne({ $and: [(await visible(l.tenantId)), { $or: [{ number: { $gt: p.number } }, { number: p.number, _id: { $gt: p._id } }] }] }).sort({ number: 1, _id: 1 }).select('_id').lean(),
    libraryTotals(l.tenantId),
  ]);
  return {
    _id: p._id, number: p.number, title: p.title, kind: p.kind, statement: p.statement, inputFormat: p.inputFormat,
    outputFormat: p.outputFormat, constraints: p.constraints, hints: p.hints, difficulty: p.difficulty, topics: p.topics,
    companies: p.companies, marks: p.marks, limits: p.limits,
    solvedBy: (p as any).stats?.accepted || 0,
    // The editorial is the worked answer: shown once the member has solved the problem (or to staff).
    editorial: l.isStaff || subs.some((s: any) => s.verdict === 'AC') ? p.editorial : '',
    languages: p.languages.map((x) => ({ language: x.language, starterCode: x.starterCode })),
    samples, submissions: subs,
    // The solve page was built around a problem set; the library fills the same slot.
    set: { _id: 'library', title: 'Practice library', dueAt: undefined, status: 'published', allowLate: true,
      prevId: prev ? (prev as any)._id : null, nextId: next ? (next as any)._id : null, position: p.number, count: totals.total },
  };
}

export async function runLibrary(l: Learner, id: string, body: { language: string; code: string; stdin?: string; mode?: 'samples' | 'custom' }) {
  assertMayUseLibrary(l);
  const p = await loadProblem(l, id);
  return runSamples(p, p.marks || 0, body);
}

export async function submitLibrary(l: Learner, id: string, body: { language: string; code: string }) {
  assertMayUseLibrary(l);
  const p = await loadProblem(l, id);
  return gradeAndRecord(l, p, p.marks || 0, { refType: 'practice-library' }, body);
}

/** For the CareerPilot dashboard: how many library problems this member has solved, out of how many exist. */
export async function memberLibraryStats(tenantId: string, userId: string) {
  const [totals, mine] = await Promise.all([libraryTotals(tenantId), myResults(userId)]);
  const solved = mine.solved.length
    ? await CodingProblem.countDocuments({ $and: [(await visible(tenantId)), { _id: { $in: mine.solved } }] })
    : 0;
  return { solved, total: totals.total };
}

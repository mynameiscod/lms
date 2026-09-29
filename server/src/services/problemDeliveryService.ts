import mongoose from 'mongoose';
import ProblemSet, { IProblemSet, SET_AUDIENCE_TYPES } from '../models/ProblemSet';
import ProblemSubmission from '../models/ProblemSubmission';
import CodingProblem, { CodingProblemTestCase } from '../models/CodingProblem';
import User from '../models/User';
import Batch from '../models/Batch';
import { judge, runCustom } from './problemJudgeService';
import { PbError, visibilityFilter } from './problemBankService';
import StudentGameStats from '../models/StudentGameStats';
import * as game from './gamificationService';
import { getOrCreateProgress, addXp } from './passportXpService';
import { awardCoins } from './coinService';
import { learnerAudienceOf, LEARNER_AUDIENCE_FIELDS } from './learnerAudience';

/**
 * Delivery of Problem Bank problems to learners, through Problem Sets.
 *
 * Access is decided here and nowhere else: a learner may open a problem only through a
 * published set that targets them and has opened. Staff can open any set to preview it, and
 * their submissions are recorded as 'practice' so they never pollute a class's results.
 */

const STAFF = new Set(['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF']);

export interface Learner {
  userId: string;
  tenantId: string;
  role: string;
  batchId: string;
  isLms: boolean;
  isCareerPilot: boolean;
  isStaff: boolean;
}

export async function loadLearner(userId: string, tenantId: string): Promise<Learner> {
  const u: any = await User.findById(userId).select(LEARNER_AUDIENCE_FIELDS).lean();
  if (!u) throw new PbError('Account not found', 401);
  // One definition shared with the Code Visualizer and content audience gating (learnerAudience.ts).
  const aud = learnerAudienceOf(u);
  return {
    userId: String(userId), tenantId, role: u.role, batchId: u.batchId ? String(u.batchId) : '',
    isLms: aud.lms,
    isCareerPilot: aud.careerpilot,
    isStaff: STAFF.has(u.role),
  };
}

/** Does this set target this learner? (Status and dates are checked separately.) */
export function inAudience(set: Pick<IProblemSet, 'audience'>, l: Learner): boolean {
  return (set.audience || []).some((a) =>
    (a.type === 'user' && a.id === l.userId)
    || (a.type === 'batch' && !!l.batchId && a.id === l.batchId)
    || (a.type === 'all_lms' && l.isLms)
    || (a.type === 'all_careerpilot' && l.isCareerPilot));
}

function learnerFilter(l: Learner): any {
  const or: any[] = [{ audience: { $elemMatch: { type: 'user', id: l.userId } } }];
  if (l.batchId) or.push({ audience: { $elemMatch: { type: 'batch', id: l.batchId } } });
  if (l.isLms) or.push({ 'audience.type': 'all_lms' });
  if (l.isCareerPilot) or.push({ 'audience.type': 'all_careerpilot' });
  return {
    tenantId: l.tenantId,
    status: { $in: ['published', 'closed'] },
    $and: [{ $or: or }, { $or: [{ opensAt: null }, { opensAt: { $exists: false } }, { opensAt: { $lte: new Date() } }] }],
  };
}

const productFor = (l: Learner) => (l.isStaff ? 'practice' : l.isLms ? 'lms' : l.isCareerPilot ? 'careerpilot' : 'practice');

/** Load a set the learner may open; staff may open any set of their institute. */
async function openSet(l: Learner, setId: string) {
  if (!mongoose.isValidObjectId(setId)) throw new PbError('Problem set not found', 404);
  const set = await ProblemSet.findOne({ _id: setId, tenantId: l.tenantId });
  if (!set) throw new PbError('Problem set not found', 404);
  if (l.isStaff) return set;
  const opened = !set.opensAt || set.opensAt.getTime() <= Date.now();
  if (set.status === 'draft' || !opened || !inAudience(set, l)) throw new PbError('This problem set is not assigned to you.', 403);
  return set;
}

/* ── Best results ─────────────────────────────────────────────────────────────────────────── */

async function bestByProblem(userId: string, setId: string) {
  const rows = await ProblemSubmission.aggregate([
    { $match: { userId, 'context.setId': setId } },
    { $sort: { score: -1, createdAt: 1 } },
    { $group: {
      _id: '$problemId',
      bestScore: { $first: '$score' }, bestVerdict: { $first: '$verdict' }, maxScore: { $first: '$maxScore' },
      attempts: { $sum: 1 }, solved: { $max: { $cond: [{ $eq: ['$verdict', 'AC'] }, 1, 0] } }, lastAt: { $max: '$createdAt' },
    } },
  ]);
  return new Map(rows.map((r: any) => [String(r._id), r]));
}

const itemMarks = (item: any, problem: any) => (typeof item.marks === 'number' ? item.marks : problem?.marks ?? 0);

/* ── Learner API ──────────────────────────────────────────────────────────────────────────── */

export async function mySets(l: Learner) {
  const sets = await ProblemSet.find(learnerFilter(l)).sort({ dueAt: 1, createdAt: -1 }).lean();
  const out = [];
  for (const s of sets) {
    const best = await bestByProblem(l.userId, String(s._id));
    const problems = await CodingProblem.find({ _id: { $in: s.items.map((i) => i.problemId) } }).select('marks difficulty').lean();
    const pm = new Map(problems.map((p: any) => [String(p._id), p]));
    const total = s.items.reduce((sum, i) => sum + itemMarks(i, pm.get(String(i.problemId))), 0);
    let score = 0, solved = 0;
    for (const i of s.items) {
      const b: any = best.get(String(i.problemId));
      if (!b) continue;
      const m = itemMarks(i, pm.get(String(i.problemId)));
      score += b.maxScore ? (b.bestScore / b.maxScore) * m : 0;
      if (b.solved) solved++;
    }
    out.push({
      _id: s._id, title: s.title, description: s.description, kind: s.kind, status: s.status,
      opensAt: s.opensAt, dueAt: s.dueAt, allowLate: s.allowLate,
      problemCount: s.items.length, solved, score: Math.round(score * 100) / 100, totalMarks: total,
      counts: {
        easy: problems.filter((p: any) => p.difficulty === 'easy').length,
        medium: problems.filter((p: any) => p.difficulty === 'medium').length,
        hard: problems.filter((p: any) => p.difficulty === 'hard').length,
      },
    });
  }
  return out;
}

export async function setForLearner(l: Learner, setId: string) {
  const set = await openSet(l, setId);
  const ids = set.items.map((i) => i.problemId);
  const problems = await CodingProblem.find({ _id: { $in: ids } }).select('number title difficulty topics marks kind languages.language status').lean();
  const pm = new Map(problems.map((p: any) => [String(p._id), p]));
  const best = await bestByProblem(l.userId, setId);
  return {
    _id: set._id, title: set.title, description: set.description, kind: set.kind, status: set.status,
    opensAt: set.opensAt, dueAt: set.dueAt, allowLate: set.allowLate, isStaff: l.isStaff,
    problems: set.items.map((i, idx) => {
      const p: any = pm.get(String(i.problemId));
      const b: any = best.get(String(i.problemId));
      return p ? {
        _id: p._id, order: idx + 1, title: p.title, difficulty: p.difficulty, topics: p.topics, kind: p.kind,
        marks: itemMarks(i, p), languages: (p.languages || []).map((x: any) => x.language),
        status: b ? (b.solved ? 'solved' : 'attempted') : 'todo',
        bestScore: b ? Math.round((b.maxScore ? (b.bestScore / b.maxScore) * itemMarks(i, p) : 0) * 100) / 100 : 0,
        attempts: b?.attempts || 0,
      } : { _id: i.problemId, order: idx + 1, title: 'Problem no longer available', missing: true };
    }),
  };
}

async function problemInSet(l: Learner, setId: string, problemId: string) {
  const set = await openSet(l, setId);
  const item = set.items.find((i) => String(i.problemId) === String(problemId));
  if (!item) throw new PbError('This problem is not part of the set.', 404);
  const p = await CodingProblem.findById(problemId);
  if (!p || p.status === 'archived') throw new PbError('This problem is no longer available.', 404);
  return { set, item, problem: p };
}

/** The problem as a learner sees it: samples only, starter code only, no solutions or wrappers. */
export async function problemForLearner(l: Learner, setId: string, problemId: string) {
  const { set, item, problem: p } = await problemInSet(l, setId, problemId);
  const samples = await CodingProblemTestCase.find({ problemId: p._id, isSample: true }).sort({ order: 1 }).select('input expectedOutput explanation').lean();
  const subs = await ProblemSubmission.find({ userId: l.userId, problemId: p._id, 'context.setId': setId })
    .sort({ createdAt: -1 }).limit(30).select('language code verdict passed total score maxScore timeMs late createdAt compileError').lean();
  const idx = set.items.findIndex((i) => String(i.problemId) === String(problemId));
  return {
    _id: p._id, number: p.number, title: p.title, kind: p.kind, statement: p.statement, inputFormat: p.inputFormat,
    outputFormat: p.outputFormat, constraints: p.constraints, hints: p.hints, difficulty: p.difficulty, topics: p.topics,
    companies: p.companies, marks: itemMarks(item, p), limits: p.limits,
    // The editorial is the worked answer: show it once the learner has solved the problem (or to staff).
    editorial: l.isStaff || subs.some((s) => s.verdict === 'AC') ? p.editorial : '',
    languages: p.languages.map((x) => ({ language: x.language, starterCode: x.starterCode })),
    samples,
    submissions: subs,
    set: {
      _id: set._id, title: set.title, dueAt: set.dueAt, status: set.status, allowLate: set.allowLate,
      prevId: idx > 0 ? set.items[idx - 1].problemId : null, nextId: idx < set.items.length - 1 ? set.items[idx + 1].problemId : null,
      position: idx + 1, count: set.items.length,
    },
  };
}

function judgeView(p: any, marks: number) {
  return { kind: p.kind, languages: p.languages, sqlSetup: p.sqlSetup, limits: p.limits, comparisonMode: p.comparisonMode, marks };
}

function assertLanguage(p: any, language: string) {
  const lang = p.kind === 'sql' ? 'sql' : language;
  if (!p.languages.some((x: any) => x.language === lang)) throw new PbError('That language is not enabled for this problem.');
  return lang;
}

export async function runForLearner(l: Learner, setId: string, problemId: string, body: { language: string; code: string; stdin?: string; mode?: 'samples' | 'custom' }) {
  const { item, problem: p } = await problemInSet(l, setId, problemId);
  const lang = assertLanguage(p, body.language);
  const jp: any = judgeView(p.toObject(), itemMarks(item, p));
  if (body.mode === 'custom') return { custom: await runCustom(jp, lang, body.code, String(body.stdin || '')) };
  const samples = await CodingProblemTestCase.find({ problemId: p._id, isSample: true }).sort({ order: 1 }).lean();
  if (!samples.length) throw new PbError('This problem has no sample tests to run.');
  const r = await judge(jp, lang, body.code, samples.map((t) => ({ ...t, isSample: true })), { revealHidden: false });
  return { result: r };
}

export async function submitForLearner(l: Learner, setId: string, problemId: string, body: { language: string; code: string }) {
  const { set, item, problem: p } = await problemInSet(l, setId, problemId);
  if (!l.isStaff) {
    if (set.status === 'closed') throw new PbError('This problem set is closed for submissions.');
    if (set.dueAt && set.dueAt.getTime() < Date.now() && !set.allowLate) throw new PbError('The due date has passed and late submissions are not accepted.');
  }
  const lang = assertLanguage(p, body.language);
  if (String(body.code || '').length > 100_000) throw new PbError('Code is limited to 100 KB.');
  const tests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean();
  const marks = itemMarks(item, p);
  const r = await judge(judgeView(p.toObject(), marks) as any, lang, body.code, tests.map((t) => ({ ...t })), { revealHidden: false });

  // A sandbox that was too busy to run is not an attempt — do not record it against the learner.
  if (r.verdict === 'BUSY') return { result: r, recorded: false };

  const late = !!(set.dueAt && set.dueAt.getTime() < Date.now());
  const firstAccept = r.verdict === 'AC'
    && !(await ProblemSubmission.exists({ userId: l.userId, problemId: p._id, verdict: 'AC' }));
  const sub = await ProblemSubmission.create({
    tenantId: l.tenantId, userId: l.userId, problemId: p._id, problemVersion: p.version,
    context: { product: productFor(l), setId: String(set._id) },
    language: lang, code: body.code, verdict: r.verdict, passed: r.passed, total: r.total,
    score: r.score, maxScore: r.maxScore, timeMs: r.timeMs, late,
    cases: r.cases.map((c) => ({ verdict: c.verdict, timeMs: c.timeMs, weight: c.weight, isSample: c.isSample })),
    compileError: r.compileError,
  });
  let reward: { xp: number } | null = null;
  if (!l.isStaff) {
    await CodingProblem.updateOne({ _id: p._id }, { $inc: { 'stats.attempts': 1, ...(firstAccept ? { 'stats.accepted': 1 } : {}) } });
    if (firstAccept) reward = await rewardFirstSolve(l, p);
  }
  return { result: r, recorded: true, submissionId: sub._id, late, firstAccept, reward };
}

/**
 * XP, streak and coins for the first time a learner solves a problem — through the same
 * engines the Thinking Lab (LMS) and CareerPilot practice already use, so a bank problem counts
 * towards the leaderboards and streaks learners already have. Never allowed to fail a
 * submission: a rewards hiccup is logged, the verdict stands.
 */
const XP_BY_DIFFICULTY: Record<string, number> = { easy: 10, medium: 20, hard: 40 };
const istDate = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

async function rewardFirstSolve(l: Learner, p: any): Promise<{ xp: number } | null> {
  const xp = XP_BY_DIFFICULTY[p.difficulty] || 10;
  try {
    if (l.isLms) {
      const u: any = await User.findById(l.userId).select('firstName lastName batchId').lean();
      const gs: any = await StudentGameStats.findOneAndUpdate(
        { tenantId: l.tenantId, studentId: l.userId },
        { $setOnInsert: { tenantId: l.tenantId, studentId: l.userId, studentName: [u?.firstName, u?.lastName].filter(Boolean).join(' '), batchId: u?.batchId } },
        { new: true, upsert: true },
      );
      game.applySolve(gs, { xpEarned: xp, category: p.topics?.[0] || 'coding', difficulty: p.difficulty, hintsUsed: 0, perfect: true, dateStr: istDate() });
      await gs.save();
    }
    if (l.isCareerPilot) {
      const progress: any = await getOrCreateProgress(l.tenantId, l.userId);
      addXp(progress, xp, true, new Date(), 'practice');
      await progress.save();
      await awardCoins({
        tenantId: l.tenantId, studentId: l.userId, eventKey: 'practice_solved',
        idempotencyKey: `problem-bank:${l.userId}:${p._id}`, note: `Solved "${p.title}"`,
      });
    }
    return { xp };
  } catch (e: any) {
    console.error('[problem-sets] reward failed', l.userId, String(p._id), e?.message);
    return null;
  }
}

/* ── Admin: sets ──────────────────────────────────────────────────────────────────────────── */

export interface SetInput {
  title: string; description?: string; kind?: 'assignment' | 'practice';
  items?: { problemId: string; marks?: number }[];
  audience?: { type: string; id?: string }[];
  opensAt?: string | null; dueAt?: string | null; allowLate?: boolean; status?: 'draft' | 'published' | 'closed';
}

async function resolveAudience(tenantId: string, raw: SetInput['audience']) {
  const out: { type: any; id?: string; name: string }[] = [];
  const seen = new Set<string>();
  for (const a of raw || []) {
    if (!SET_AUDIENCE_TYPES.includes(a.type as any)) continue;
    const key = `${a.type}:${a.id || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (a.type === 'all_lms') out.push({ type: 'all_lms', name: 'All LMS students' });
    else if (a.type === 'all_careerpilot') out.push({ type: 'all_careerpilot', name: 'All CareerPilot members' });
    else if (a.type === 'batch' && mongoose.isValidObjectId(a.id)) {
      const b: any = await Batch.findOne({ _id: a.id, tenantId: new mongoose.Types.ObjectId(tenantId) }).select('name').lean()
        || await Batch.findOne({ _id: a.id, tenantId }).select('name').lean();
      if (b) out.push({ type: 'batch', id: String(b._id), name: b.name || 'Batch' });
    } else if (a.type === 'user' && mongoose.isValidObjectId(a.id)) {
      const u: any = await User.findOne({ _id: a.id }).select('firstName lastName name email tenantId').lean();
      if (u && String(u.tenantId) === tenantId) out.push({ type: 'user', id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email });
    }
  }
  return out;
}

async function validateItems(tenantId: string, role: string, userId: string, items: SetInput['items']) {
  const ids = Array.from(new Set((items || []).map((i) => String(i.problemId)).filter((id) => mongoose.isValidObjectId(id))));
  const found = await CodingProblem.find({
    _id: { $in: ids }, ...visibilityFilter({ tenantId, role, userId }), status: 'published',
  }).select('_id').lean();
  const ok = new Set(found.map((f: any) => String(f._id)));
  const missing = ids.filter((id) => !ok.has(id));
  if (missing.length) throw new PbError(`${missing.length} problem(s) are not published or not available to your institute. Publish them in the Problem Bank first.`);
  const seen = new Set<string>();
  return (items || []).filter((i) => ok.has(String(i.problemId)) && !seen.has(String(i.problemId)) && seen.add(String(i.problemId)))
    .map((i) => ({ problemId: new mongoose.Types.ObjectId(String(i.problemId)), ...(Number.isFinite(Number(i.marks)) && i.marks !== null && (i.marks as any) !== '' ? { marks: Math.max(0, Number(i.marks)) } : {}) }));
}

export async function saveSet(a: { tenantId: string; userId: string; role: string }, id: string | null, input: SetInput) {
  const title = String(input.title || '').trim();
  if (!title) throw new PbError('Give the set a title.');
  const items = await validateItems(a.tenantId, a.role, a.userId, input.items);
  const audience = await resolveAudience(a.tenantId, input.audience);
  const opensAt = input.opensAt ? new Date(input.opensAt) : undefined;
  const dueAt = input.dueAt ? new Date(input.dueAt) : undefined;
  if (opensAt && dueAt && dueAt <= opensAt) throw new PbError('The due date must be after the opening date.');
  const status = input.status || 'draft';
  if (status === 'published') {
    if (!items.length) throw new PbError('Add at least one problem before publishing.');
    if (!audience.length) throw new PbError('Choose who this set is for before publishing.');
  }
  const doc = {
    tenantId: a.tenantId, title, description: String(input.description || ''), kind: input.kind === 'practice' ? 'practice' : 'assignment',
    items, audience, opensAt, dueAt, allowLate: input.allowLate !== false, status,
  };
  if (!id) return ProblemSet.create({ ...doc, createdBy: a.userId });
  const set = await ProblemSet.findOne({ _id: id, tenantId: a.tenantId });
  if (!set) throw new PbError('Problem set not found', 404);
  Object.assign(set, doc);
  if (!opensAt) set.opensAt = undefined;
  if (!dueAt) set.dueAt = undefined;
  await set.save();
  return set;
}

export async function listSetsAdmin(tenantId: string) {
  const sets = await ProblemSet.find({ tenantId }).sort({ updatedAt: -1 }).lean();
  const counts = await ProblemSubmission.aggregate([
    { $match: { tenantId, 'context.setId': { $in: sets.map((s) => String(s._id)) }, 'context.product': { $ne: 'practice' } } },
    { $group: { _id: '$context.setId', submissions: { $sum: 1 }, learners: { $addToSet: '$userId' } } },
  ]);
  const cm = new Map(counts.map((c: any) => [c._id, c]));
  return sets.map((s) => ({
    ...s, problemCount: s.items.length,
    submissions: cm.get(String(s._id))?.submissions || 0,
    learners: cm.get(String(s._id))?.learners?.length || 0,
  }));
}

export async function getSetAdmin(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Problem set not found', 404);
  const set: any = await ProblemSet.findOne({ _id: id, tenantId }).lean();
  if (!set) throw new PbError('Problem set not found', 404);
  const problems = await CodingProblem.find({ _id: { $in: set.items.map((i: any) => i.problemId) } })
    .select('number title difficulty topics marks status scope languages.language testCount verification.status').lean();
  const pm = new Map(problems.map((p: any) => [String(p._id), p]));
  return { ...set, items: set.items.map((i: any) => ({ ...i, problem: pm.get(String(i.problemId)) || null })) };
}

export async function deleteSet(tenantId: string, id: string) {
  const set = await ProblemSet.findOne({ _id: id, tenantId });
  if (!set) throw new PbError('Problem set not found', 404);
  const used = await ProblemSubmission.exists({ 'context.setId': String(set._id), 'context.product': { $ne: 'practice' } });
  if (used) { set.status = 'closed'; await set.save(); return { closed: true }; }
  await set.deleteOne();
  return { deleted: true };
}

/**
 * Who should be doing this set, and how far each has got.
 *
 * The roster is everyone the audience names (batch members, named users, and for the
 * all-students targets everyone in the institute up to a cap), plus anyone who submitted —
 * so a student moved out of the batch after submitting still shows up.
 */
export async function setReport(tenantId: string, id: string) {
  const set: any = await getSetAdmin(tenantId, id);
  const tid = mongoose.isValidObjectId(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId;
  const or: any[] = [];
  const batchIds = set.audience.filter((a: any) => a.type === 'batch').map((a: any) => new mongoose.Types.ObjectId(a.id));
  const userIds = set.audience.filter((a: any) => a.type === 'user').map((a: any) => new mongoose.Types.ObjectId(a.id));
  if (batchIds.length) or.push({ batchId: { $in: batchIds } });
  if (userIds.length) or.push({ _id: { $in: userIds } });
  if (set.audience.some((a: any) => a.type === 'all_lms')) or.push({ role: 'STUDENT', batchId: { $ne: null } });
  if (set.audience.some((a: any) => a.type === 'all_careerpilot')) or.push({ 'passport.active': true });

  const subs = await ProblemSubmission.aggregate([
    { $match: { tenantId, 'context.setId': String(set._id), 'context.product': { $ne: 'practice' } } },
    { $sort: { score: -1, createdAt: 1 } },
    { $group: {
      _id: { u: '$userId', p: '$problemId' },
      bestScore: { $first: '$score' }, maxScore: { $first: '$maxScore' }, verdict: { $first: '$verdict' },
      attempts: { $sum: 1 }, solved: { $max: { $cond: [{ $eq: ['$verdict', 'AC'] }, 1, 0] } },
      lastAt: { $max: '$createdAt' }, late: { $max: { $cond: ['$late', 1, 0] } },
    } },
  ]);
  const submitters = Array.from(new Set(subs.map((s: any) => s._id.u))).filter((x) => mongoose.isValidObjectId(x)).map((x) => new mongoose.Types.ObjectId(x));
  if (submitters.length) or.push({ _id: { $in: submitters } });

  const users: any[] = or.length
    ? await User.find({ tenantId: tid, $or: or }).select('firstName lastName name email batchId').limit(3000).lean()
    : [];
  const byUser = new Map<string, Map<string, any>>();
  for (const s of subs) {
    if (!byUser.has(s._id.u)) byUser.set(s._id.u, new Map());
    byUser.get(s._id.u)!.set(String(s._id.p), s);
  }
  const problems = set.items.filter((i: any) => i.problem);
  const totalMarks = problems.reduce((sum: number, i: any) => sum + itemMarks(i, i.problem), 0);

  const rows = users.map((u) => {
    const m = byUser.get(String(u._id)) || new Map();
    let score = 0, solved = 0, attempted = 0, lastAt: Date | null = null;
    const cells = problems.map((i: any) => {
      const s = m.get(String(i.problemId));
      if (!s) return { status: 'todo' };
      attempted++;
      if (s.solved) solved++;
      const marks = itemMarks(i, i.problem);
      const got = s.maxScore ? (s.bestScore / s.maxScore) * marks : 0;
      score += got;
      if (!lastAt || s.lastAt > lastAt) lastAt = s.lastAt;
      return { status: s.solved ? 'solved' : 'attempted', score: Math.round(got * 100) / 100, attempts: s.attempts, late: !!s.late };
    });
    return {
      userId: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || u.email, email: u.email,
      solved, attempted, score: Math.round(score * 100) / 100, totalMarks, lastAt, cells,
    };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return {
    set: { _id: set._id, title: set.title, dueAt: set.dueAt, status: set.status },
    problems: problems.map((i: any) => ({ _id: i.problemId, title: i.problem.title, difficulty: i.problem.difficulty, marks: itemMarks(i, i.problem) })),
    rows,
    summary: {
      learners: rows.length,
      started: rows.filter((r) => r.attempted > 0).length,
      completed: rows.filter((r) => r.solved === problems.length && problems.length > 0).length,
      averageScore: rows.length ? Math.round((rows.reduce((s, r) => s + r.score, 0) / rows.length) * 100) / 100 : 0,
      totalMarks,
    },
  };
}

/** Submissions for one learner in one set — for an instructor reviewing code. */
export async function learnerSubmissions(tenantId: string, setId: string, userId: string) {
  return ProblemSubmission.find({ tenantId, 'context.setId': setId, userId })
    .sort({ createdAt: -1 }).limit(200)
    .select('problemId language code verdict passed total score maxScore timeMs late createdAt compileError').lean();
}

import mongoose from 'mongoose';
import CodingProblem, { CodingProblemTestCase, ICodingProblem, nextProblemNumber, ProblemScope } from '../models/CodingProblem';
import {
  PB_DEFAULT_MARKS, PB_LANGUAGE_KEYS, PB_TOPIC_KEYS, normalizeDifficulty, normalizeLanguage, normalizeTopic,
} from '../config/problemBankTaxonomy';
import { judge, JudgeProblem, generateExpectedOutputs } from './problemJudgeService';

/**
 * Problem Bank — authoring, visibility and verification.
 *
 * Visibility: an institute sees the published global library plus its own problems (any
 * status). A super admin sees everything global. Only a super admin may write global problems.
 */

export class PbError extends Error {
  constructor(message: string, public status = 400, public details?: any) { super(message); }
}

export interface Actor { userId: string; tenantId: string; role: string }
export const isSuperAdmin = (a: Actor) => a.role === 'SUPER_ADMIN';

/* ── Input shape (what the studio, bulk import and AI all produce) ──────────────────────────── */

export interface TestInput { input: string; expectedOutput: string; isSample?: boolean; weight?: number; explanation?: string }
export interface ProblemInput {
  title: string;
  kind?: 'code' | 'sql';
  statement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  hints?: string[];
  editorial?: string;
  difficulty?: string;
  rating?: number;
  marks?: number;
  topics?: string[];
  tags?: string[];
  companies?: string[];
  languages?: { language: string; starterCode?: string; headerCode?: string; footerCode?: string; solutionCode?: string }[];
  sqlSetup?: string;
  limits?: { timeMs?: number; memoryMb?: number };
  comparisonMode?: 'lenient' | 'exact' | 'case_insensitive' | 'numeric';
  tests?: TestInput[];
  scope?: ProblemScope;
  status?: 'draft' | 'published' | 'archived';
}

// Stress tests (n = 10^5..10^6) run to a few MB. Piston is patched in docker-compose (16 MB
// request limit, and stdin no longer truncated at ~214 KB) to carry them; each test is its own document, so Mongo's 16 MB is not in play.
const MAX_TEST_MB = 4;
const MAX_TEST_BYTES = MAX_TEST_MB * 1024 * 1024;
const MAX_TESTS = 200;
const cleanList = (v: unknown, max = 30) =>
  Array.from(new Set((Array.isArray(v) ? v : String(v || '').split(/[,|;]/)).map((s) => String(s).trim()).filter(Boolean))).slice(0, max);

export function slugify(s: string) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'problem';
}

/**
 * Normalise and validate. Returns the clean problem plus errors (block saving) and warnings
 * (allowed on a draft, shown to the author). Publishing additionally requires `publishErrors`
 * to be empty — a draft may be half-written, a published problem may not.
 */
export function normalizeInput(raw: ProblemInput) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const kind = raw.kind === 'sql' ? 'sql' : 'code';

  const title = String(raw.title || '').trim();
  if (!title) errors.push('Title is required.');
  if (title.length > 200) errors.push('Title is limited to 200 characters.');

  const difficulty = normalizeDifficulty(raw.difficulty);
  const topics: string[] = [];
  const unknownTopics: string[] = [];
  for (const t of cleanList(raw.topics)) {
    const k = normalizeTopic(t);
    if (k && PB_TOPIC_KEYS.has(k)) topics.push(k); else unknownTopics.push(t);
  }
  const tags = cleanList([...(raw.tags || []), ...unknownTopics]);
  if (unknownTopics.length) warnings.push(`Kept as tags (not standard topics): ${unknownTopics.join(', ')}.`);

  const languages: any[] = [];
  const seen = new Set<string>();
  for (const l of raw.languages || []) {
    const key = kind === 'sql' ? 'sql' : normalizeLanguage(l.language);
    if (!key) { warnings.push(`Language "${l.language}" is not supported by the judge and was dropped.`); continue; }
    if (seen.has(key)) continue;
    seen.add(key);
    languages.push({
      language: key,
      starterCode: String(l.starterCode || ''),
      headerCode: kind === 'sql' ? '' : String(l.headerCode || ''),
      footerCode: kind === 'sql' ? '' : String(l.footerCode || ''),
      solutionCode: String(l.solutionCode || ''),
    });
  }
  if (kind === 'sql' && !languages.length) languages.push({ language: 'sql', starterCode: '', headerCode: '', footerCode: '', solutionCode: '' });

  const tests: TestInput[] = [];
  (raw.tests || []).slice(0, MAX_TESTS + 1).forEach((t, i) => {
    const input = String(t?.input ?? '').replace(/\r\n?/g, '\n');
    const expectedOutput = String(t?.expectedOutput ?? (t as any)?.output ?? '').replace(/\r\n?/g, '\n');
    if (Buffer.byteLength(input) > MAX_TEST_BYTES || Buffer.byteLength(expectedOutput) > MAX_TEST_BYTES) {
      errors.push(`Test ${i + 1} is larger than ${MAX_TEST_MB} MB.`);
    }
    const weight = Number(t?.weight ?? 1);
    tests.push({
      input, expectedOutput,
      isSample: !!(t?.isSample ?? (t as any)?.sample),
      weight: Number.isFinite(weight) && weight >= 0 ? weight : 1,
      explanation: String(t?.explanation || ''),
    });
  });
  if (tests.length > MAX_TESTS) errors.push(`At most ${MAX_TESTS} test cases per problem.`);

  const timeMs = Math.min(Math.max(Number(raw.limits?.timeMs) || 2000, 250), 20000);
  const memoryMb = Math.min(Math.max(Number(raw.limits?.memoryMb) || 256, 32), 1024);
  const marksRaw = Number(raw.marks);
  const marks = Number.isFinite(marksRaw) && marksRaw >= 0 ? marksRaw : PB_DEFAULT_MARKS[difficulty];

  const clean = {
    title, kind,
    statement: String(raw.statement || ''),
    inputFormat: String(raw.inputFormat || ''),
    outputFormat: String(raw.outputFormat || ''),
    constraints: String(raw.constraints || ''),
    hints: (Array.isArray(raw.hints) ? raw.hints : String(raw.hints || '').split('\n'))
      .map((h) => String(h).trim()).filter(Boolean).slice(0, 10),
    editorial: String(raw.editorial || ''),
    difficulty,
    rating: Number.isFinite(Number(raw.rating)) && Number(raw.rating) > 0 ? Math.round(Number(raw.rating)) : undefined,
    marks,
    topics, tags,
    companies: cleanList(raw.companies),
    languages,
    sqlSetup: kind === 'sql' ? String(raw.sqlSetup || '') : '',
    limits: { timeMs, memoryMb },
    comparisonMode: (['lenient', 'exact', 'case_insensitive', 'numeric'].includes(String(raw.comparisonMode)) ? raw.comparisonMode : 'lenient') as any,
  };

  // What a problem needs before a student may see it.
  const publishErrors: string[] = [];
  if (!clean.statement.trim()) publishErrors.push('Write the problem statement.');
  if (!tests.length) publishErrors.push('Add at least one test case.');
  if (tests.length && !tests.some((t) => t.isSample)) publishErrors.push('Mark at least one test as a sample so solvers can see an example.');
  if (tests.length && tests.every((t) => t.isSample)) warnings.push('Every test is a sample — add hidden tests so solutions cannot be hard-coded.');
  if (!languages.length) publishErrors.push('Enable at least one language.');
  if (tests.some((t) => !t.expectedOutput.trim())) publishErrors.push('Some tests have no expected output — fill them or generate them from a reference solution.');
  if (!languages.some((l) => l.solutionCode.trim())) warnings.push('No reference solution — the problem cannot be verified automatically.');

  return { clean, tests, errors, warnings, publishErrors };
}

/* ── Access ───────────────────────────────────────────────────────────────────────────────── */

export function visibilityFilter(a: Actor): any {
  const own = { scope: 'tenant', tenantId: a.tenantId };
  const global = isSuperAdmin(a) ? { scope: 'global' } : { scope: 'global', status: 'published' };
  return { $or: [own, global] };
}

export async function loadVisible(a: Actor, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Problem not found', 404);
  const p = await CodingProblem.findOne({ _id: id, ...visibilityFilter(a) });
  if (!p) throw new PbError('Problem not found', 404);
  return p;
}

export function canEdit(a: Actor, p: ICodingProblem) {
  return p.scope === 'global' ? isSuperAdmin(a) : p.tenantId === a.tenantId;
}

async function loadEditable(a: Actor, id: string) {
  const p = await loadVisible(a, id);
  if (!canEdit(a, p)) {
    throw new PbError(p.scope === 'global'
      ? 'This is a CodeBegun library problem. Use "Duplicate" to make an editable copy for your institute.'
      : 'You cannot edit this problem.', 403);
  }
  return p;
}

/* ── Read ─────────────────────────────────────────────────────────────────────────────────── */

export interface ListQuery {
  q?: string; difficulty?: string; topic?: string; language?: string; company?: string;
  scope?: 'all' | 'global' | 'tenant'; status?: string; verification?: string; source?: string;
  sort?: 'number' | 'newest' | 'updated' | 'title' | 'difficulty'; page?: number; limit?: number;
}

const LIST_FIELDS = 'scope tenantId number slug title kind difficulty rating marks topics tags companies status testCount sampleCount verification.status verification.checkedAt source updatedAt createdAt languages.language stats';

export async function listProblems(a: Actor, q: ListQuery) {
  const and: any[] = [visibilityFilter(a)];
  if (q.scope === 'global') and.push({ scope: 'global' });
  if (q.scope === 'tenant') and.push({ scope: 'tenant', tenantId: a.tenantId });
  if (q.difficulty) and.push({ difficulty: { $in: String(q.difficulty).split(',') } });
  if (q.topic) and.push({ topics: { $all: String(q.topic).split(',') } });
  if (q.language) and.push({ 'languages.language': { $in: String(q.language).split(',') } });
  if (q.company) and.push({ companies: { $in: String(q.company).split(',') } });
  if (q.status) and.push({ status: { $in: String(q.status).split(',') } });
  else and.push({ status: { $ne: 'archived' } });
  if (q.verification) and.push({ 'verification.status': { $in: String(q.verification).split(',') } });
  if (q.source) and.push({ source: q.source });

  const text = String(q.q || '').trim();
  if (text) {
    if (/^#?\d+$/.test(text)) and.push({ number: Number(text.replace('#', '')) });
    else {
      // Substring match so search-as-you-type finds "fibon". At catalogue scale this moves to a
      // search engine; the $text index is there for whole-word search from the API.
      const rx = { $regex: text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
      and.push({ $or: [{ title: rx }, { tags: rx }, { companies: rx }] });
    }
  }
  const filter = { $and: and };
  const limit = Math.min(Math.max(Number(q.limit) || 25, 1), 100);
  const page = Math.max(Number(q.page) || 1, 1);
  const sort: any = {
    number: { scope: 1, number: 1 }, newest: { createdAt: -1 }, updated: { updatedAt: -1 },
    title: { title: 1 }, difficulty: { difficulty: 1, number: 1 },
  }[q.sort || 'updated'] || { updatedAt: -1 };

  const [items, total] = await Promise.all([
    CodingProblem.find(filter).select(LIST_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    CodingProblem.countDocuments(filter),
  ]);
  return {
    items: items.map((p: any) => ({ ...p, languages: (p.languages || []).map((l: any) => l.language), editable: canEdit(a, p) })),
    total, page, limit, pages: Math.ceil(total / limit),
  };
}

export async function bankStats(a: Actor) {
  const rows = await CodingProblem.aggregate([
    { $match: { ...visibilityFilter(a), status: { $ne: 'archived' } } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      easy: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
      medium: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
      hard: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
      global: { $sum: { $cond: [{ $eq: ['$scope', 'global'] }, 1, 0] } },
      mine: { $sum: { $cond: [{ $eq: ['$scope', 'tenant'] }, 1, 0] } },
      published: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
      verified: { $sum: { $cond: [{ $eq: ['$verification.status', 'verified'] }, 1, 0] } },
    } },
  ]);
  const companies = await CodingProblem.distinct('companies', visibilityFilter(a));
  return { ...(rows[0] || { total: 0, easy: 0, medium: 0, hard: 0, global: 0, mine: 0, published: 0, verified: 0 }), companies: companies.filter(Boolean).sort() };
}

export async function getProblem(a: Actor, id: string) {
  const p = await loadVisible(a, id);
  const editable = canEdit(a, p);
  // Hidden tests and reference solutions are for the people who can edit the problem.
  const tests = await CodingProblemTestCase.find({ problemId: p._id, ...(editable ? {} : { isSample: true }) }).sort({ order: 1 }).lean();
  const obj: any = p.toObject();
  if (!editable) obj.languages = obj.languages.map((l: any) => ({ ...l, solutionCode: '', headerCode: '', footerCode: '' }));
  return { ...obj, tests, editable };
}

/* ── Write ────────────────────────────────────────────────────────────────────────────────── */

async function uniqueSlug(scope: ProblemScope, tenantId: string | null, title: string, exceptId?: any) {
  const base = slugify(title);
  for (let i = 0; i < 50; i++) {
    const slug = i ? `${base}-${i + 1}` : base;
    const clash = await CodingProblem.exists({ scope, tenantId, slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
    if (!clash) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function replaceTests(problemId: any, tests: TestInput[]) {
  await CodingProblemTestCase.deleteMany({ problemId });
  if (tests.length) {
    await CodingProblemTestCase.insertMany(tests.map((t, i) => ({ problemId, order: i, ...t })));
  }
}

export async function createProblem(a: Actor, raw: ProblemInput, source: ICodingProblem['source'] = 'manual', legacyRef?: { model: string; id: string }) {
  const { clean, tests, errors, warnings, publishErrors } = normalizeInput(raw);
  if (errors.length) throw new PbError(errors.join(' '), 400, { errors, warnings });
  const scope: ProblemScope = raw.scope === 'global' ? 'global' : 'tenant';
  if (scope === 'global' && !isSuperAdmin(a)) throw new PbError('Only CodeBegun super admins can add problems to the global library.', 403);
  const tenantId = scope === 'global' ? null : a.tenantId;
  const wantsPublish = raw.status === 'published';
  if (wantsPublish && publishErrors.length) throw new PbError(`Cannot publish yet: ${publishErrors.join(' ')}`, 400, { publishErrors });

  const p = await CodingProblem.create({
    ...clean, scope, tenantId,
    number: await nextProblemNumber(scope, tenantId),
    slug: await uniqueSlug(scope, tenantId, clean.title),
    status: wantsPublish ? 'published' : 'draft',
    publishedAt: wantsPublish ? new Date() : undefined,
    testCount: tests.length, sampleCount: tests.filter((t) => t.isSample).length,
    verification: { status: 'unverified', byLanguage: [] },
    source, legacyRef, createdBy: a.userId, updatedBy: a.userId,
  });
  await replaceTests(p._id, tests);
  return { problem: p, warnings, publishErrors };
}

export async function updateProblem(a: Actor, id: string, raw: ProblemInput) {
  const p = await loadEditable(a, id);
  const { clean, tests, errors, warnings, publishErrors } = normalizeInput(raw);
  if (errors.length) throw new PbError(errors.join(' '), 400, { errors, warnings });
  const nextStatus = raw.status || p.status;
  if (nextStatus === 'published' && publishErrors.length) throw new PbError(`Cannot publish yet: ${publishErrors.join(' ')}`, 400, { publishErrors });

  const judgedBefore = JSON.stringify([p.kind, p.languages, p.sqlSetup, p.comparisonMode]);
  const oldTests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean();
  const testsChanged = JSON.stringify(oldTests.map((t) => [t.input, t.expectedOutput, t.isSample, t.weight]))
    !== JSON.stringify(tests.map((t) => [t.input, t.expectedOutput, !!t.isSample, t.weight]));

  if (clean.title !== p.title) p.slug = await uniqueSlug(p.scope, p.tenantId, clean.title, p._id);
  Object.assign(p, clean);
  const judgedChanged = testsChanged || judgedBefore !== JSON.stringify([p.kind, p.languages, p.sqlSetup, p.comparisonMode]);
  if (judgedChanged) {
    // Whatever was verified before no longer describes this problem.
    if (['verified', 'failed'].includes(p.verification.status)) p.verification.status = 'stale';
    p.version += 1;
  }
  if (nextStatus !== p.status) {
    p.status = nextStatus;
    if (nextStatus === 'published' && !p.publishedAt) p.publishedAt = new Date();
  }
  p.testCount = tests.length;
  p.sampleCount = tests.filter((t) => t.isSample).length;
  p.updatedBy = a.userId;
  await p.save();
  if (testsChanged) await replaceTests(p._id, tests);
  return { problem: p, warnings, publishErrors };
}

export async function setStatus(a: Actor, id: string, status: 'draft' | 'published' | 'archived') {
  const p = await loadEditable(a, id);
  if (status === 'published') {
    const tests = await CodingProblemTestCase.find({ problemId: p._id }).lean();
    const { publishErrors } = normalizeInput({ ...(p.toObject() as any), tests });
    if (publishErrors.length) throw new PbError(`Cannot publish yet: ${publishErrors.join(' ')}`, 400, { publishErrors });
    if (!p.publishedAt) p.publishedAt = new Date();
  }
  p.status = status;
  p.updatedBy = a.userId;
  await p.save();
  return p;
}

export async function deleteProblem(a: Actor, id: string) {
  const p = await loadEditable(a, id);
  // Once published it may be referenced by assignments and results: archive, never delete.
  if (p.publishedAt || p.stats?.attempts) {
    p.status = 'archived';
    await p.save();
    return { archived: true };
  }
  await CodingProblemTestCase.deleteMany({ problemId: p._id });
  await p.deleteOne();
  return { deleted: true };
}

/** Copy a problem (typically a global one) into the caller's institute, where they can edit it. */
export async function duplicateProblem(a: Actor, id: string, toScope: ProblemScope = 'tenant') {
  const p = await loadVisible(a, id);
  const tests = canEdit(a, p) || p.scope === 'global'
    ? await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean()
    : [];
  const src: any = p.toObject();
  return createProblem(a, {
    ...src,
    title: toScope === p.scope ? `${src.title} (copy)` : src.title,
    scope: toScope,
    status: 'draft',
    tests: tests.map((t) => ({ input: t.input, expectedOutput: t.expectedOutput, isSample: t.isSample, weight: t.weight, explanation: t.explanation })),
  }, p.source === 'migrated' ? 'manual' : p.source);
}

/** Super admin: move an institute problem into the global CodeBegun library. */
export async function promoteToGlobal(a: Actor, id: string) {
  if (!isSuperAdmin(a)) throw new PbError('Only CodeBegun super admins can publish to the global library.', 403);
  const p = await loadEditable(a, id);
  if (p.scope === 'global') return p;
  p.scope = 'global';
  p.tenantId = null;
  p.number = await nextProblemNumber('global', null);
  p.slug = await uniqueSlug('global', null, p.title, p._id);
  p.updatedBy = a.userId;
  await p.save();
  return p;
}

/* ── Running & verification ───────────────────────────────────────────────────────────────── */

/** Run code for an author: against a saved problem, or against the unsaved draft in the studio. */
export async function runForAuthor(a: Actor, body: {
  problemId?: string; draft?: ProblemInput; language: string; code: string; mode: 'samples' | 'all';
}) {
  let problem: JudgeProblem;
  let tests: TestInput[];
  if (body.draft) {
    const n = normalizeInput(body.draft);
    problem = n.clean as any;
    tests = n.tests;
  } else {
    const p = await loadVisible(a, String(body.problemId));
    problem = p.toObject() as any;
    tests = await CodingProblemTestCase.find({ problemId: p._id, ...(canEdit(a, p) ? {} : { isSample: true }) }).sort({ order: 1 }).lean();
  }
  const cases = body.mode === 'samples' ? tests.filter((t) => t.isSample) : tests;
  if (!cases.length) throw new PbError(body.mode === 'samples' ? 'No sample tests to run — mark at least one test as a sample.' : 'No tests to run.');
  const language = problem.kind === 'sql' ? 'sql' : String(body.language);
  if (problem.kind !== 'sql' && !PB_LANGUAGE_KEYS.includes(language)) throw new PbError('Unsupported language.');
  return judge(problem, language, body.code, cases.map((t) => ({ ...t, isSample: !!t.isSample })), { revealHidden: true });
}

export async function fillOutputsFromSolution(body: { draft: ProblemInput; language: string; onlyEmpty?: boolean }) {
  const n = normalizeInput(body.draft);
  const language = n.clean.kind === 'sql' ? 'sql' : String(body.language);
  const lang = n.clean.languages.find((l: any) => l.language === language);
  if (!lang?.solutionCode?.trim()) throw new PbError(`Add a ${language} reference solution first.`);
  const targets = n.tests.map((t, i) => ({ t, i })).filter(({ t }) => !body.onlyEmpty || !t.expectedOutput.trim());
  if (!targets.length) return { tests: n.tests, filled: 0, failures: [] };
  const { outputs, failures } = await generateExpectedOutputs(n.clean as any, language, lang.solutionCode, targets.map(({ t }) => t.input));
  const tests = n.tests.map((t) => ({ ...t }));
  let filled = 0;
  targets.forEach(({ i }, k) => { if (outputs[k] !== null) { tests[i].expectedOutput = outputs[k] as string; filled++; } });
  return { tests, filled, failures: failures.map((f) => ({ ...f, index: targets[f.index].i })) };
}

/**
 * Verify: run every language's reference solution against every test (Polygon's "invocation
 * matrix"). Runs in the background — nine languages times a few dozen tests is minutes, not an
 * HTTP request — and writes progress onto the problem, which the studio polls.
 */
const verifyQueue: string[] = [];
let verifyRunning = false;

export async function queueVerification(a: Actor | null, id: string) {
  const p = a ? await loadEditable(a, id) : await CodingProblem.findById(id);
  if (!p) throw new PbError('Problem not found', 404);
  if (!p.languages.some((l) => l.solutionCode.trim())) {
    throw new PbError('Add a reference solution in at least one language before verifying.');
  }
  p.verification.status = 'queued';
  p.verification.message = 'Waiting to run…';
  await p.save();
  if (!verifyQueue.includes(String(p._id))) verifyQueue.push(String(p._id));
  void drainVerification();
  return p.verification;
}

async function drainVerification() {
  if (verifyRunning) return;
  verifyRunning = true;
  try {
    while (verifyQueue.length) {
      const id = verifyQueue.shift()!;
      try { await verifyNow(id); } catch (e: any) {
        console.error('[problem-bank] verify failed', id, e?.message);
        await CodingProblem.updateOne({ _id: id }, { $set: { 'verification.status': 'failed', 'verification.message': e?.message || 'Verification failed', 'verification.checkedAt': new Date() } });
      }
    }
  } finally { verifyRunning = false; }
}

async function verifyNow(id: string) {
  const p = await CodingProblem.findById(id);
  if (!p) return;
  let tests: TestInput[] = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean();
  const withSolution = p.languages.filter((l) => l.solutionCode.trim());
  await CodingProblem.updateOne({ _id: id }, { $set: { 'verification.status': 'running', 'verification.message': `Running ${withSolution.length} solution(s)…` } });

  // A bulk-imported problem may arrive with inputs only: fill its answers from the first solution.
  if (tests.some((t) => !t.expectedOutput.trim()) && withSolution.length) {
    const first = withSolution[0];
    const empty = tests.map((t, i) => ({ t, i })).filter(({ t }) => !t.expectedOutput.trim());
    const { outputs } = await generateExpectedOutputs(p.toObject() as any, first.language, first.solutionCode, empty.map(({ t }) => t.input));
    for (let k = 0; k < empty.length; k++) {
      if (outputs[k] !== null) {
        await CodingProblemTestCase.updateOne({ problemId: p._id, order: empty[k].i }, { $set: { expectedOutput: outputs[k] } });
      }
    }
    tests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean();
  }

  const byLanguage: any[] = [];
  for (const l of withSolution) {
    try {
      const r = await judge(p.toObject() as any, l.language, l.solutionCode, tests.map((t) => ({ ...t })), { revealHidden: true });
      const firstBad = r.cases.find((c) => !c.passed);
      byLanguage.push({
        language: l.language, passed: r.passed, total: r.total, verdict: r.verdict, timeMs: r.timeMs,
        message: firstBad ? `Test ${firstBad.index + 1}: ${firstBad.verdict}${firstBad.error ? ` — ${String(firstBad.error).slice(0, 200)}` : ''}` : undefined,
      });
    } catch (e: any) {
      byLanguage.push({ language: l.language, passed: 0, total: tests.length, verdict: 'RE', message: e?.message });
    }
  }
  const ok = byLanguage.length > 0 && byLanguage.every((b) => b.verdict === 'AC');
  const busy = byLanguage.some((b) => b.verdict === 'BUSY');
  await CodingProblem.updateOne({ _id: id }, { $set: {
    'verification.status': ok ? 'verified' : 'failed',
    'verification.byLanguage': byLanguage,
    'verification.checkedAt': new Date(),
    'verification.message': ok
      ? `All ${byLanguage.length} reference solution(s) pass every test.`
      : busy ? 'The code runner was busy — run verification again.' : 'Some reference solutions fail — see each language.',
  } });
}

export async function getVerification(a: Actor, id: string) {
  const p = await loadVisible(a, id);
  return { ...(p.toObject() as any).verification, testCount: p.testCount };
}

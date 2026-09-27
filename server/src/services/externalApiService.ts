import crypto from 'crypto';
import mongoose from 'mongoose';
import { Request, Response, NextFunction } from 'express';
import ApiClient, { ApiUsage, IApiClient, API_SCOPES, ApiScope } from '../models/ApiClient';
import CodingProblem, { CodingProblemTestCase } from '../models/CodingProblem';
import ProblemSet from '../models/ProblemSet';
import ProblemSubmission from '../models/ProblemSubmission';
import { judge, runCustom } from './problemJudgeService';
import { PbError } from './problemBankService';

/**
 * The Problem Bank's external API — the same problems and the same judge, for consumers
 * outside the LMS: partner colleges, customers' hiring tools, and CodeBegun's Interview Pilot.
 *
 * Everything a client can reach is published content in its learner shape. Hidden tests,
 * reference solutions and wrapper code never leave the server; a submission's hidden cases come
 * back as verdicts only. Keys are hashed at rest, rate-limited per minute and capped per day on
 * judge calls, because every judge call spends execution capacity shared with students.
 */

/* ── Keys ─────────────────────────────────────────────────────────────────────────────────── */

const B62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
export function generateKey(): string {
  const bytes = crypto.randomBytes(32);
  let s = '';
  for (const b of bytes) s += B62[b % 62];
  return `cbk_live_${s}`;
}
export const hashKey = (k: string) => crypto.createHash('sha256').update(k).digest('hex');
const keyPrefix = (k: string) => k.slice(0, 13);
const istDate = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/* ── Authentication & limits ──────────────────────────────────────────────────────────────── */

export interface ApiRequest extends Request { apiClient?: IApiClient }

const minuteBuckets = new Map<string, { count: number; resetAt: number }>();

function apiError(res: Response, status: number, code: string, message: string, extra: Record<string, any> = {}) {
  return res.status(status).json({ error: { code, message, ...extra } });
}

/** Resolve the API key, enforce status/expiry and the per-minute limit, count the request. */
export async function authenticateApiKey(req: ApiRequest, res: Response, next: NextFunction) {
  try {
    const auth = String(req.headers.authorization || '');
    const key = String(req.headers['x-api-key'] || (auth.startsWith('Bearer ') ? auth.slice(7) : '')).trim();
    if (!key || !key.startsWith('cbk_')) return apiError(res, 401, 'missing_api_key', 'Send your API key in the X-API-Key header.');
    const client = await ApiClient.findOne({ keyHash: hashKey(key) });
    if (!client || client.status !== 'active') return apiError(res, 401, 'invalid_api_key', 'This API key is not valid or has been revoked.');
    if (client.expiresAt && client.expiresAt.getTime() < Date.now()) return apiError(res, 401, 'expired_api_key', 'This API key has expired.');

    const now = Date.now();
    const id = String(client._id);
    let b = minuteBuckets.get(id);
    if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + 60_000 }; minuteBuckets.set(id, b); }
    b.count++;
    res.setHeader('X-RateLimit-Limit', String(client.limits.perMinute));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, client.limits.perMinute - b.count)));
    if (b.count > client.limits.perMinute) {
      const retry = Math.ceil((b.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retry));
      return apiError(res, 429, 'rate_limited', `Rate limit of ${client.limits.perMinute} requests per minute exceeded.`, { retryAfterSeconds: retry });
    }
    if (minuteBuckets.size > 5000) for (const [k, v] of minuteBuckets) if (v.resetAt <= now) minuteBuckets.delete(k);

    req.apiClient = client;
    // Usage accounting must never slow or fail the call.
    ApiUsage.updateOne({ clientId: id, date: istDate() }, { $inc: { requests: 1 } }, { upsert: true }).catch(() => undefined);
    if (!client.lastUsedAt || now - client.lastUsedAt.getTime() > 60_000) {
      ApiClient.updateOne({ _id: client._id }, { $set: { lastUsedAt: new Date() } }).catch(() => undefined);
    }
    next();
  } catch (e) {
    console.error('[external-api] auth', e);
    apiError(res, 500, 'server_error', 'Something went wrong.');
  }
}

export const requireScope = (scope: ApiScope) => (req: ApiRequest, res: Response, next: NextFunction) => {
  if (!req.apiClient?.scopes.includes(scope)) return apiError(res, 403, 'insufficient_scope', `This key does not have the "${scope}" scope.`);
  next();
};

/** Judge calls are capped per day: they spend execution capacity shared with students. */
async function chargeJudge(client: IApiClient, kind: 'runs' | 'submissions') {
  const id = String(client._id);
  const u = await ApiUsage.findOneAndUpdate(
    { clientId: id, date: istDate() }, { $inc: { [kind]: 1 } }, { upsert: true, new: true },
  );
  const used = (u?.runs || 0) + (u?.submissions || 0);
  if (client.limits.judgePerDay > 0 && used > client.limits.judgePerDay) {
    await ApiUsage.updateOne({ _id: u!._id }, { $inc: { [kind]: -1 } });
    throw new PbError(`Daily judge quota of ${client.limits.judgePerDay} runs + submissions reached. It resets at midnight IST.`, 429);
  }
}

/* ── What a client may see ────────────────────────────────────────────────────────────────── */

async function problemFilter(client: IApiClient): Promise<any> {
  const owners: any[] = [{ scope: 'global' }];
  if (client.entitlement.includeTenantProblems) owners.push({ scope: 'tenant', tenantId: client.tenantId });
  const f: any = { status: 'published', testCount: { $gt: 0 }, $or: owners };
  const e = client.entitlement;
  if (e.mode === 'filter') {
    if (e.difficulties?.length) f.difficulty = { $in: e.difficulties };
    if (e.topics?.length) f.topics = { $in: e.topics };
  }
  if (e.mode === 'sets') {
    const sets = await ProblemSet.find({ _id: { $in: (e.setIds || []).filter((x) => mongoose.isValidObjectId(x)) }, tenantId: client.tenantId }).select('items').lean();
    f._id = { $in: sets.flatMap((s: any) => s.items.map((i: any) => i.problemId)) };
  }
  return f;
}

async function loadProblem(client: IApiClient, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Problem not found.', 404);
  const p = await CodingProblem.findOne({ _id: id, ...(await problemFilter(client)) });
  if (!p) throw new PbError('Problem not found.', 404);
  return p;
}

const summary = (p: any) => ({
  id: String(p._id), number: p.number, title: p.title, kind: p.kind, difficulty: p.difficulty,
  topics: p.topics, tags: p.tags, companies: p.companies, marks: p.marks,
  languages: (p.languages || []).map((l: any) => l.language),
  source: p.scope === 'global' ? 'codebegun' : 'institute',
  updatedAt: p.updatedAt,
});

/* ── Endpoints ────────────────────────────────────────────────────────────────────────────── */

export async function listProblems(client: IApiClient, q: Record<string, any>) {
  const and: any[] = [await problemFilter(client)];
  if (q.difficulty) and.push({ difficulty: { $in: String(q.difficulty).split(',') } });
  if (q.topic) and.push({ topics: { $in: String(q.topic).split(',') } });
  if (q.language) and.push({ 'languages.language': { $in: String(q.language).split(',') } });
  if (q.company) and.push({ companies: { $in: String(q.company).split(',') } });
  if (q.q) {
    const rx = { $regex: String(q.q).slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    and.push({ $or: [{ title: rx }, { tags: rx }] });
  }
  if (q.updatedSince && !isNaN(Date.parse(q.updatedSince))) and.push({ updatedAt: { $gte: new Date(q.updatedSince) } });
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
  const page = Math.max(Number(q.page) || 1, 1);
  const filter = { $and: and };
  const [rows, total] = await Promise.all([
    CodingProblem.find(filter).select('scope number title kind difficulty topics tags companies marks languages.language updatedAt')
      .sort({ scope: 1, number: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    CodingProblem.countDocuments(filter),
  ]);
  return { data: rows.map(summary), page, limit, total, pages: Math.ceil(total / limit) };
}

/** A random problem for an interview — optionally excluding ones the candidate has already seen. */
export async function randomProblem(client: IApiClient, q: Record<string, any>) {
  const and: any[] = [await problemFilter(client)];
  if (q.difficulty) and.push({ difficulty: { $in: String(q.difficulty).split(',') } });
  if (q.topic) and.push({ topics: { $in: String(q.topic).split(',') } });
  if (q.language) and.push({ 'languages.language': { $in: String(q.language).split(',') } });
  const exclude = String(q.exclude || '').split(',').filter((x) => mongoose.isValidObjectId(x)).map((x) => new mongoose.Types.ObjectId(x));
  if (exclude.length) and.push({ _id: { $nin: exclude } });
  const [p] = await CodingProblem.aggregate([{ $match: { $and: and } }, { $sample: { size: 1 } }, { $project: { _id: 1 } }]);
  if (!p) throw new PbError('No problem matches those filters.', 404);
  return getProblem(client, String(p._id));
}

export async function getProblem(client: IApiClient, id: string) {
  const p = await loadProblem(client, id);
  const samples = await CodingProblemTestCase.find({ problemId: p._id, isSample: true }).sort({ order: 1 }).select('input expectedOutput explanation').lean();
  return {
    ...summary(p),
    statement: p.statement, inputFormat: p.inputFormat, outputFormat: p.outputFormat, constraints: p.constraints,
    hints: p.hints, limits: p.limits,
    starterCode: Object.fromEntries(p.languages.map((l) => [l.language, l.starterCode])),
    samples: samples.map((s) => ({ input: s.input, output: s.expectedOutput, explanation: s.explanation || undefined })),
    testCount: p.testCount,
  };
}

function judgeView(p: any) {
  return { kind: p.kind, languages: p.languages, sqlSetup: p.sqlSetup, limits: p.limits, comparisonMode: p.comparisonMode, marks: p.marks };
}

function checkLanguage(p: any, language: string) {
  const lang = p.kind === 'sql' ? 'sql' : String(language || '');
  if (!p.languages.some((l: any) => l.language === lang)) {
    throw new PbError(`Language "${language}" is not available for this problem. Use one of: ${p.languages.map((l: any) => l.language).join(', ')}.`);
  }
  return lang;
}

function checkCode(code: unknown) {
  if (typeof code !== 'string' || !code.trim()) throw new PbError('"code" is required.');
  if (code.length > 100_000) throw new PbError('"code" is limited to 100 KB.');
}

const publicCases = (cases: any[]) => cases.map((c) => ({
  index: c.index, sample: c.isSample, verdict: c.verdict, passed: c.passed, timeMs: c.timeMs, weight: c.weight,
  ...(c.isSample ? { input: c.input, expectedOutput: c.expectedOutput, output: c.output } : {}),
  ...(c.error ? { error: c.error } : {}),
}));

/** Run against the samples, or against custom stdin. Nothing is recorded. */
export async function run(client: IApiClient, id: string, body: any) {
  const p = await loadProblem(client, id);
  const lang = checkLanguage(p, body.language);
  checkCode(body.code);
  await chargeJudge(client, 'runs');
  if (typeof body.stdin === 'string') {
    const r = await runCustom(judgeView(p) as any, lang, body.code, body.stdin);
    return { mode: 'custom', verdict: r.verdict, output: r.output, error: r.error || undefined, timeMs: r.timeMs };
  }
  const samples = await CodingProblemTestCase.find({ problemId: p._id, isSample: true }).sort({ order: 1 }).lean();
  const r = await judge(judgeView(p) as any, lang, body.code, samples.map((t) => ({ ...t, isSample: true })), { revealHidden: false });
  return { mode: 'samples', verdict: r.verdict, passed: r.passed, total: r.total, timeMs: r.timeMs, compileError: r.compileError, cases: publicCases(r.cases) };
}

/** Judge against every test and record the submission against the caller's end user. */
export async function submit(client: IApiClient, id: string, body: any) {
  const p = await loadProblem(client, id);
  const lang = checkLanguage(p, body.language);
  checkCode(body.code);
  const externalUserId = String(body.externalUserId || '').trim();
  if (!externalUserId || externalUserId.length > 128) throw new PbError('"externalUserId" is required (your identifier for the person submitting, up to 128 characters).');
  await chargeJudge(client, 'submissions');
  const tests = await CodingProblemTestCase.find({ problemId: p._id }).sort({ order: 1 }).lean();
  const r = await judge(judgeView(p) as any, lang, body.code, tests.map((t) => ({ ...t })), { revealHidden: false });
  const base = {
    verdict: r.verdict, passed: r.passed, total: r.total, score: r.score, maxScore: r.maxScore, timeMs: r.timeMs,
    compileError: r.compileError, cases: publicCases(r.cases),
  };
  if (r.verdict === 'BUSY') return { id: null, recorded: false, ...base, message: 'The judge was busy; this submission was not recorded. Retry shortly.' };
  const sub = await ProblemSubmission.create({
    tenantId: client.tenantId, userId: `api:${client._id}:${externalUserId}`, problemId: p._id, problemVersion: p.version,
    context: { product: 'api', refType: 'api_client', refId: String(client._id), ...(body.reference ? { setId: String(body.reference).slice(0, 128) } : {}) },
    language: lang, code: body.code, verdict: r.verdict, passed: r.passed, total: r.total, score: r.score, maxScore: r.maxScore,
    timeMs: r.timeMs, late: false,
    cases: r.cases.map((c) => ({ verdict: c.verdict, timeMs: c.timeMs, weight: c.weight, isSample: c.isSample })),
    compileError: r.compileError,
  });
  await CodingProblem.updateOne({ _id: p._id }, { $inc: { 'stats.attempts': 1, ...(r.verdict === 'AC' ? { 'stats.accepted': 1 } : {}) } });
  return { id: String(sub._id), recorded: true, problemId: String(p._id), externalUserId, language: lang, createdAt: sub.createdAt, ...base };
}

const subView = (s: any, clientId: string) => ({
  id: String(s._id), problemId: String(s.problemId), externalUserId: String(s.userId).replace(`api:${clientId}:`, ''),
  reference: s.context?.setId, language: s.language, verdict: s.verdict, passed: s.passed, total: s.total,
  score: s.score, maxScore: s.maxScore, timeMs: s.timeMs, createdAt: s.createdAt, code: s.code,
});

export async function getSubmission(client: IApiClient, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('Submission not found.', 404);
  const s = await ProblemSubmission.findOne({ _id: id, 'context.product': 'api', 'context.refId': String(client._id) }).lean();
  if (!s) throw new PbError('Submission not found.', 404);
  return subView(s, String(client._id));
}

export async function listSubmissions(client: IApiClient, q: Record<string, any>) {
  const f: any = { 'context.product': 'api', 'context.refId': String(client._id) };
  if (q.externalUserId) f.userId = `api:${client._id}:${String(q.externalUserId)}`;
  if (q.problemId && mongoose.isValidObjectId(q.problemId)) f.problemId = q.problemId;
  if (q.reference) f['context.setId'] = String(q.reference);
  const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
  const rows = await ProblemSubmission.find(f).sort({ createdAt: -1 }).limit(limit).lean();
  return { data: rows.map((s) => subView(s, String(client._id))) };
}

export async function usage(client: IApiClient) {
  const rows = await ApiUsage.find({ clientId: String(client._id) }).sort({ date: -1 }).limit(30).lean();
  const today = rows.find((r) => r.date === istDate());
  return {
    client: client.name, scopes: client.scopes, limits: client.limits,
    today: { date: istDate(), requests: today?.requests || 0, judgeCalls: (today?.runs || 0) + (today?.submissions || 0) },
    last30Days: rows.map((r) => ({ date: r.date, requests: r.requests, runs: r.runs, submissions: r.submissions })),
  };
}

/* ── Admin: managing clients ──────────────────────────────────────────────────────────────── */

export interface ClientInput {
  name?: string; description?: string; scopes?: string[];
  entitlement?: { mode?: string; setIds?: string[]; difficulties?: string[]; topics?: string[]; includeTenantProblems?: boolean };
  limits?: { perMinute?: number; judgePerDay?: number };
  expiresAt?: string | null;
}

function cleanInput(i: ClientInput) {
  const scopes = (i.scopes || []).filter((s) => (API_SCOPES as string[]).includes(s)) as ApiScope[];
  const e = i.entitlement || {};
  const mode = ['all', 'sets', 'filter'].includes(String(e.mode)) ? e.mode as any : 'all';
  return {
    ...(i.name !== undefined ? { name: String(i.name).trim().slice(0, 120) } : {}),
    ...(i.description !== undefined ? { description: String(i.description).slice(0, 1000) } : {}),
    ...(i.scopes ? { scopes } : {}),
    ...(i.entitlement ? { entitlement: {
      mode,
      setIds: (e.setIds || []).filter((x) => mongoose.isValidObjectId(x)),
      difficulties: (e.difficulties || []).filter((d) => ['easy', 'medium', 'hard'].includes(d)),
      topics: (e.topics || []).map(String).slice(0, 60),
      includeTenantProblems: !!e.includeTenantProblems,
    } } : {}),
    ...(i.limits ? { limits: {
      perMinute: Math.min(Math.max(Number(i.limits.perMinute) || 60, 1), 6000),
      judgePerDay: Math.min(Math.max(Number(i.limits.judgePerDay ?? 2000), 0), 1_000_000),
    } } : {}),
    ...(i.expiresAt !== undefined ? { expiresAt: i.expiresAt ? new Date(i.expiresAt) : undefined } : {}),
  };
}

const adminView = (c: any) => ({
  _id: c._id, name: c.name, description: c.description, keyPrefix: c.keyPrefix, scopes: c.scopes, entitlement: c.entitlement,
  limits: c.limits, status: c.status, expiresAt: c.expiresAt, lastUsedAt: c.lastUsedAt, createdAt: c.createdAt,
});

export async function createClient(a: { tenantId: string; userId: string }, input: ClientInput) {
  const clean = cleanInput(input);
  if (!clean.name) throw new PbError('Give the client a name (e.g. "ABC College portal").');
  const key = generateKey();
  const c = await ApiClient.create({
    ...clean, tenantId: a.tenantId, keyHash: hashKey(key), keyPrefix: keyPrefix(key), createdBy: a.userId,
    ...(clean.scopes ? {} : { scopes: API_SCOPES }),
  });
  return { client: adminView(c), key };
}

export async function listClients(tenantId: string) {
  const clients = await ApiClient.find({ tenantId }).sort({ createdAt: -1 }).lean();
  const today = istDate();
  const since = new Date(Date.now() - 30 * 86400_000 + 5.5 * 3600_000).toISOString().slice(0, 10);
  const usageRows = await ApiUsage.aggregate([
    { $match: { clientId: { $in: clients.map((c) => String(c._id)) }, date: { $gte: since } } },
    { $group: {
      _id: '$clientId',
      requests30: { $sum: '$requests' }, judge30: { $sum: { $add: ['$runs', '$submissions'] } },
      requestsToday: { $sum: { $cond: [{ $eq: ['$date', today] }, '$requests', 0] } },
      judgeToday: { $sum: { $cond: [{ $eq: ['$date', today] }, { $add: ['$runs', '$submissions'] }, 0] } },
    } },
  ]);
  const um = new Map(usageRows.map((u: any) => [u._id, u]));
  return clients.map((c) => ({ ...adminView(c), usage: um.get(String(c._id)) || { requests30: 0, judge30: 0, requestsToday: 0, judgeToday: 0 } }));
}

async function ownClient(tenantId: string, id: string) {
  if (!mongoose.isValidObjectId(id)) throw new PbError('API client not found.', 404);
  const c = await ApiClient.findOne({ _id: id, tenantId });
  if (!c) throw new PbError('API client not found.', 404);
  return c;
}

export async function updateClient(tenantId: string, id: string, input: ClientInput & { status?: string }) {
  const c = await ownClient(tenantId, id);
  const clean = cleanInput(input);
  Object.assign(c, clean);
  if (input.expiresAt === null) c.expiresAt = undefined;
  if (input.status === 'revoked' || input.status === 'active') c.status = input.status;
  await c.save();
  return adminView(c);
}

export async function rotateKey(tenantId: string, id: string) {
  const c = await ownClient(tenantId, id);
  const key = generateKey();
  c.keyHash = hashKey(key);
  c.keyPrefix = keyPrefix(key);
  c.status = 'active';
  await c.save();
  return { client: adminView(c), key };
}

export async function deleteClient(tenantId: string, id: string) {
  const c = await ownClient(tenantId, id);
  const used = await ProblemSubmission.exists({ 'context.product': 'api', 'context.refId': String(c._id) });
  if (used) { c.status = 'revoked'; await c.save(); return { revoked: true }; }
  await c.deleteOne();
  await ApiUsage.deleteMany({ clientId: String(c._id) });
  return { deleted: true };
}

/** What this client's entitlement currently resolves to — shown next to the key in the admin UI. */
export async function previewEntitlement(tenantId: string, id: string) {
  const c = await ownClient(tenantId, id);
  const count = await CodingProblem.countDocuments(await problemFilter(c));
  return { problems: count };
}

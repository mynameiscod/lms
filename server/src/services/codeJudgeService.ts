import crypto from 'crypto';
import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import * as settings from './settingsService';

/**
 * The CodeBegun Judge — what Interview Pilot's "CodeBegun judge" provider talks to.
 *
 * Contract (Interview Pilot packages/provider-adapters/src/judge):
 *   GET  /v1/languages            → { languages: [...] }
 *   POST /v1/submissions          → { token }      body: { language, source, tests[], limits }
 *   GET  /v1/submissions/:token   → { status: QUEUED|RUNNING|DONE, result? }
 * Every request is signed: x-cb-timestamp (unix s) + x-cb-signature = hex HMAC-SHA256(secret,
 * `${ts}.${METHOD}.${path}.${sha256hex(body)}`), ±5 minutes.
 *
 * The code itself runs where every other program in the LMS runs — the Piston sandbox on the
 * execution host — through the same runner, in its own queue slots (scope 'judge') so live
 * interviews and students never take each other's capacity. Jobs live in memory: the server is
 * single-process (clustering is refused at boot) and Interview Pilot waits at most 20 s for one.
 */

export class JudgeError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

// ── Signature ────────────────────────────────────────────────────────────────

export const CLOCK_WINDOW_MS = 5 * 60_000;

const canonical = (ts: string, method: string, path: string, body: string) =>
  `${ts}.${method.toUpperCase()}.${path}.${crypto.createHash('sha256').update(body).digest('hex')}`;

/** Same algorithm as Interview Pilot's signJudgeRequest — used by the tests and by nothing else. */
export function signJudgeRequest(secret: string, method: string, path: string, body: string, now = Date.now()) {
  const ts = String(Math.floor(now / 1000));
  return { 'x-cb-timestamp': ts, 'x-cb-signature': crypto.createHmac('sha256', secret).update(canonical(ts, method, path, body)).digest('hex') };
}

function signatureMatches(secret: string, ts: string, method: string, path: string, body: string, signature: string): boolean {
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(canonical(ts, method, path, body)).digest('hex'));
  const given = Buffer.from(signature.toLowerCase());
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** The current secret and, during a rotation, the previous one (both accepted). */
export function judgeSecrets(): string[] {
  return [settings.getStr('JUDGE_SIGNING_SECRET', ''), settings.getStr('JUDGE_SIGNING_SECRET_PREVIOUS', '')]
    .map((s) => s.trim()).filter((s) => s.length >= 32);
}

/** POSTs are not idempotent, so a captured one must not be replayable inside the clock window. */
const seenPostSignatures = new Map<string, number>();

export function verifyRequest(req: { method: string; path: string; body: string; timestamp?: string; signature?: string }, now = Date.now()): { ok: true } | { ok: false; status: number; reason: string } {
  const secrets = judgeSecrets();
  if (!secrets.length) return { ok: false, status: 503, reason: 'The judge is not configured (JUDGE_SIGNING_SECRET).' };
  const { timestamp, signature } = req;
  if (!timestamp || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return { ok: false, status: 401, reason: 'Missing or malformed signature.' };
  const ts = Number(timestamp);
  if (!Number.isInteger(ts) || Math.abs(now - ts * 1000) > CLOCK_WINDOW_MS) return { ok: false, status: 401, reason: 'Timestamp outside the 5-minute window — check both clocks.' };
  if (!secrets.some((s) => signatureMatches(s, timestamp, req.method, req.path, req.body, signature))) return { ok: false, status: 401, reason: 'Signature does not match — the two secrets differ.' };
  if (req.method.toUpperCase() === 'POST') {
    for (const [k, at] of seenPostSignatures) if (now - at > 2 * CLOCK_WINDOW_MS) seenPostSignatures.delete(k);
    const key = signature.toLowerCase();
    if (seenPostSignatures.has(key)) return { ok: false, status: 401, reason: 'Replayed request.' };
    seenPostSignatures.set(key, now);
  }
  return { ok: true };
}

// ── Languages ────────────────────────────────────────────────────────────────

/** Interview Pilot's language names → the runner's. Kotlin is not offered: the runner has no Kotlin mapping. */
const LANGS: Record<string, ProgrammingLanguage> = {
  python: ProgrammingLanguage.PYTHON,
  javascript: ProgrammingLanguage.JAVASCRIPT,
  typescript: ProgrammingLanguage.TYPESCRIPT,
  java: ProgrammingLanguage.JAVA,
  cpp: ProgrammingLanguage.CPP,
  c: ProgrammingLanguage.C,
  csharp: ProgrammingLanguage.CSHARP,
  go: ProgrammingLanguage.GO,
  rust: ProgrammingLanguage.RUST,
  sql: ProgrammingLanguage.SQL,
};

let langCache: { at: number; list: string[] } | null = null;

/** What the sandbox can actually run now. Throws if it is unreachable (Test connection should fail then). */
export async function listLanguages(): Promise<string[]> {
  if (langCache && Date.now() - langCache.at < 5 * 60_000) return langCache.list;
  if (!codeRunner.isRealExecutionEnabled()) throw new JudgeError('No code sandbox is configured (Sandbox URL).', 503);
  const installed = new Set(await codeRunner.installedLanguages());
  const list = Object.entries(LANGS).filter(([, l]) => installed.has(l)).map(([name]) => name);
  langCache = { at: Date.now(), list };
  return list;
}

// ── Submissions ──────────────────────────────────────────────────────────────

export type Verdict = 'ACCEPTED' | 'WRONG_ANSWER' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'MEMORY_LIMIT' | 'JUDGE_ERROR';
type Compare = 'EXACT' | 'UNORDERED_LINES' | 'NONE';
interface TestSpec { input: string; expectedOutput: string; prelude?: string; compare?: Compare }
interface TestResult { verdict: Verdict; stdout: string | null; stderr: string | null; timeMs: number | null; memoryKb: number | null }
interface Job {
  status: 'QUEUED' | 'RUNNING' | 'DONE';
  createdAt: number;
  result?: { compileOutput: string | null; tests: TestResult[] };
}

const jobs = new Map<string, Job>();
const JOB_TTL_MS = 10 * 60_000;
const MAX_JOBS = 300;
const MAX_TESTS = 60;
const MAX_SOURCE = 64 * 1024;
const MAX_IO = 256 * 1024;
const OUT_CAP = 64 * 1024;

function sweep() {
  const now = Date.now();
  for (const [k, j] of jobs) if (now - j.createdAt > JOB_TTL_MS) jobs.delete(k);
}

/** Output comparison for EXACT tests: line endings and trailing whitespace never decide a verdict. */
export function sameOutput(expected: string, actual: string): boolean {
  const norm = (s: string) => String(s ?? '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
  return norm(expected) === norm(actual);
}

const cap = (s: string | undefined | null) => (s == null ? null : s.length > OUT_CAP ? `${s.slice(0, OUT_CAP)}\n…(truncated)` : s);

export function validateSubmission(body: any): { language: ProgrammingLanguage; source: string; tests: TestSpec[]; cpuMs: number; memoryMb: number } {
  const language = LANGS[String(body?.language || '')];
  if (!language) throw new JudgeError(`Unsupported language "${body?.language}".`);
  const source = String(body?.source ?? '');
  if (!source.trim()) throw new JudgeError('Empty source.');
  if (source.length > MAX_SOURCE) throw new JudgeError('Source is larger than 64 KB.');
  const tests = Array.isArray(body?.tests) ? body.tests : [];
  if (!tests.length) throw new JudgeError('At least one test is required.');
  if (tests.length > MAX_TESTS) throw new JudgeError(`At most ${MAX_TESTS} tests per submission.`);
  let io = 0;
  const clean: TestSpec[] = tests.map((t: any) => {
    const spec: TestSpec = {
      input: String(t?.input ?? ''), expectedOutput: String(t?.expectedOutput ?? ''),
      prelude: t?.prelude != null ? String(t.prelude) : undefined,
      compare: ['EXACT', 'UNORDERED_LINES', 'NONE'].includes(t?.compare) ? t.compare : 'EXACT',
    };
    io += spec.input.length + spec.expectedOutput.length + (spec.prelude?.length || 0);
    return spec;
  });
  if (io > MAX_IO) throw new JudgeError('Test data is larger than 256 KB.');
  const cpuMs = Math.min(Math.max(Number(body?.limits?.cpuMs) || 2000, 100), 10_000);
  const memoryMb = Math.min(Math.max(Number(body?.limits?.memoryMb) || 256, 16), 1024);
  return { language, source, tests: clean, cpuMs, memoryMb };
}

/** Compiled languages compile inside the run stage on this sandbox, so they get room for javac. */
const COMPILED = new Set([ProgrammingLanguage.JAVA, ProgrammingLanguage.CPP, ProgrammingLanguage.C, ProgrammingLanguage.CSHARP, ProgrammingLanguage.GO, ProgrammingLanguage.RUST, ProgrammingLanguage.TYPESCRIPT]);

async function runOne(sub: ReturnType<typeof validateSubmission>, t: TestSpec): Promise<TestResult & { compileError?: string }> {
  const code = t.prelude ? `${t.prelude}\n${sub.source}` : sub.source;
  // Interpreted: the requested CPU limit, with headroom for interpreter start. Compiled: room for compilation.
  const runLimitMs = COMPILED.has(sub.language) ? 15_000 : Math.min(Math.max(sub.cpuMs * 2, 3_000), 10_000);
  const r = await codeRunner.execute({
    code, language: sub.language, input: t.input, expectedOutput: '', timeLimit: sub.cpuMs, memoryLimit: sub.memoryMb,
    queueScope: 'judge', runLimitMs,
  });
  const timeMs = r.timing?.runMs || r.executionTime || null;
  const memoryKb = r.memoryUsed ? Math.round(r.memoryUsed * 1024) : null;
  if (r.graderUnavailable) return { verdict: 'JUDGE_ERROR', stdout: null, stderr: cap(r.error), timeMs: null, memoryKb: null };
  if (r.compilationError) return { verdict: 'COMPILE_ERROR', stdout: null, stderr: null, timeMs: null, memoryKb: null, compileError: r.compilationError };
  if (r.killed) return { verdict: 'TIME_LIMIT', stdout: cap(r.output), stderr: cap(r.error), timeMs, memoryKb };
  if (r.error) return { verdict: 'RUNTIME_ERROR', stdout: cap(r.output), stderr: cap(r.error), timeMs, memoryKb };
  // Interpreted programs: hold them to the CPU limit Interview Pilot asked for.
  if (!COMPILED.has(sub.language) && r.timing?.runMs && r.timing.runMs > sub.cpuMs) {
    return { verdict: 'TIME_LIMIT', stdout: cap(r.output), stderr: null, timeMs, memoryKb };
  }
  // Only EXACT is compared here; UNORDERED_LINES is compared by Interview Pilot, NONE never.
  const accepted = t.compare !== 'EXACT' || sameOutput(t.expectedOutput, r.output);
  return { verdict: accepted ? 'ACCEPTED' : 'WRONG_ANSWER', stdout: cap(r.output), stderr: null, timeMs, memoryKb };
}

async function runJob(token: string, sub: ReturnType<typeof validateSubmission>) {
  const job = jobs.get(token);
  if (!job) return;
  job.status = 'RUNNING';
  try {
    // Tests run concurrently; the 'judge' queue slots decide how many actually execute at once.
    const results = await Promise.all(sub.tests.map((t) => runOne(sub, t).catch((e) => ({
      verdict: 'JUDGE_ERROR' as Verdict, stdout: null, stderr: cap(e?.message || 'judge error'), timeMs: null, memoryKb: null,
    }))));
    const compileOutput = (results.find((r: any) => r.compileError) as any)?.compileError ?? null;
    job.result = {
      compileOutput: compileOutput ? cap(compileOutput) : null,
      // One compile error fails every test the same way; say so on each rather than mixing verdicts.
      tests: results.map(({ verdict, stdout, stderr, timeMs, memoryKb }) => (compileOutput
        ? { verdict: 'COMPILE_ERROR' as Verdict, stdout: null, stderr: null, timeMs: null, memoryKb: null }
        : { verdict, stdout, stderr, timeMs, memoryKb })),
    };
  } catch (e: any) {
    job.result = { compileOutput: null, tests: sub.tests.map(() => ({ verdict: 'JUDGE_ERROR' as Verdict, stdout: null, stderr: cap(e?.message), timeMs: null, memoryKb: null })) };
  }
  job.status = 'DONE';
}

export function submit(body: any): { token: string } {
  sweep();
  if (jobs.size >= MAX_JOBS) throw new JudgeError('The judge is busy — too many submissions in flight.', 503);
  if (!codeRunner.isRealExecutionEnabled()) throw new JudgeError('No code sandbox is configured (Sandbox URL).', 503);
  const sub = validateSubmission(body);
  const token = crypto.randomBytes(18).toString('hex');
  jobs.set(token, { status: 'QUEUED', createdAt: Date.now() });
  runJob(token, sub).catch((e) => console.error('[judge] job failed', e));
  return { token };
}

export function status(token: string): { status: Job['status']; result?: Job['result'] } {
  const job = jobs.get(String(token));
  if (!job) throw new JudgeError('Unknown or expired token.', 404);
  return job.status === 'DONE' ? { status: 'DONE', result: job.result } : { status: job.status };
}

/** For tests only. */
export const __reset = () => { jobs.clear(); seenPostSignatures.clear(); langCache = null; };

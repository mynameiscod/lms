import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { generateItems } from './assessmentQuestionGeneratorService';
import { aiComplete } from './aiGateway';

const RUNNABLE: Record<string, ProgrammingLanguage> = {
  javascript: ProgrammingLanguage.JAVASCRIPT, python: ProgrammingLanguage.PYTHON, java: ProgrammingLanguage.JAVA,
  cpp: ProgrammingLanguage.CPP, c: ProgrammingLanguage.C,
};
const norm = (s: string) => (s || '').replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/g, '').trim();
const diffNum = (d: string) => (d === 'hard' ? 4 : d === 'medium' ? 3 : 1);

// ── Generate a fully Piston-verified micro-problem for a concept + level ──────
export async function generateProblem(tenantId: string, concept: string, difficulty: string, language: string, promptHint?: string) {
  const base = `Beginner-friendly problem-solving drill on: ${concept}. Keep it SMALL and single-concept — one clear task, reads from stdin, prints to stdout.`;
  const context = promptHint ? `${base}\nBase the problem on this instructor brief: ${promptHint}` : base;
  // Verified generation can flake (Piston busy / AI returns no usable test cases) — retry a couple of times.
  let it: any = null;
  for (let attempt = 0; attempt < 3 && !it; attempt++) {
    try {
      const items = await generateItems(tenantId, {
        type: 'live_code' as any, dimension: 'dsa' as any, difficulty: diffNum(difficulty),
        language, count: 1, context,
      } as any, { persist: false });
      const cand: any = items && items[0];
      if (cand && Array.isArray(cand.testCases) && cand.testCases.length) it = cand;
    } catch (e: any) { console.error(`[drill] generateProblem attempt ${attempt + 1} failed:`, e?.message); }
  }
  if (!it || !Array.isArray(it.testCases) || !it.testCases.length) return null;
  const examples = it.testCases.filter((t: any) => !t.hidden).slice(0, 2).map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '' }));
  return {
    prompt: it.prompt as string,
    language: it.language || language,
    starterCode: it.starterCode || '',
    testCases: it.testCases.map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '', hidden: t.hidden !== false })),
    examples: examples.length ? examples : it.testCases.slice(0, 1).map((t: any) => ({ input: t.input || '', expectedOutput: t.expectedOutput || '' })),
  };
}

async function ai(system: string, user: string, maxTokens = 500): Promise<string> {
  // Gateway = auto failover OpenAI↔Claude + cost logging (module: drill).
  try { return await aiComplete({ module: 'drill', system, user, maxTokens }); }
  catch { return ''; }
}

const stripJson = (s: string) => (s || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

// Evaluate the student's plain-English plan for the problem — the logic, not syntax.
export async function evaluatePlan(prompt: string, plan: string): Promise<{ ok: boolean; hint: string }> {
  if ((plan || '').trim().length < 10) return { ok: false, hint: 'Write your approach in a few plain-English steps first — what will you read, what will you check/compute, and what will you print?' };
  const sys = 'You are a patient coding tutor checking a beginner\'s PLAIN-ENGLISH plan (pseudocode) for a small problem. Judge the LOGIC/approach only, not code or syntax. Output ONLY raw JSON.';
  const usr = `Problem: ${prompt}\n\nStudent's plan:\n"""${(plan || '').slice(0, 1500)}"""\n\nIs the approach essentially correct and complete for this problem? Return JSON: {"ok": true|false, "hint": "<if not ok: ONE short guiding hint or question that nudges them to the missing/incorrect step — do NOT give the full plan or any code>"}`;
  try {
    const p = JSON.parse(stripJson(await ai(sys, usr, 400)));
    return { ok: !!p.ok, hint: typeof p.hint === 'string' ? p.hint : '' };
  } catch { return { ok: true, hint: '' }; }
}

/**
 * Run the student's code against every test case.
 *
 * These used to run one after another, each a full round-trip to the sandbox. Measured on
 * production that is ~0.4s for Python but ~3.8s for Java, because every execution pays for
 * a fresh javac — so a five-test Java problem took the best part of twenty seconds before
 * the student saw anything.
 *
 * Two changes, in order of how much they save:
 *
 *  1. THE FIRST TEST RUNS ALONE. If the code does not compile, every remaining execution
 *     was guaranteed to fail the same way, and the student waited through all of them to
 *     be told about a missing semicolon. Compile errors now cost ONE run instead of N.
 *
 *  2. THE REST RUN CONCURRENTLY. They are independent — same code, different stdin — so
 *     there is nothing to serialise. Wall-clock becomes the slowest single test rather
 *     than the sum, and the results are reassembled in order.
 */
export async function runAgainstTests(language: string, code: string, testCases: { input: string; expectedOutput: string; hidden: boolean }[]) {
  const lang = RUNNABLE[(language || '').toLowerCase()] || ProgrammingLanguage.JAVASCRIPT;
  if (!testCases.length) return { results: [], allPassed: true, firstFail: null as any, compileError: '' };

  const runOne = (tc: { input: string; expectedOutput: string; hidden: boolean }) =>
    codeRunner.execute({ code, language: lang, input: tc.input || '', expectedOutput: '', timeLimit: 10000, memoryLimit: 256 });

  const first = await runOne(testCases[0]);
  if (first.compilationError) {
    // Nothing else can pass, so do not spend the sandbox time proving it.
    return {
      results: testCases.map((tc, i) => ({ passed: false, hidden: tc.hidden, index: i })),
      allPassed: false,
      firstFail: { input: testCases[0].input, expected: testCases[0].expectedOutput, actual: first.compilationError },
      compileError: first.compilationError,
    };
  }

  const rest = testCases.length > 1
    ? await Promise.all(testCases.slice(1).map(runOne))
    : [];
  const runs = [first, ...rest];

  const results: { passed: boolean; hidden: boolean; index: number }[] = [];
  let firstFail: { input: string; expected: string; actual: string } | null = null;
  let compileError = '';

  // Reassembled in test order, so "test 3 failed" still means the third one.
  runs.forEach((r, i) => {
    const tc = testCases[i];
    if (r.compilationError) {
      compileError = compileError || r.compilationError;
      results.push({ passed: false, hidden: tc.hidden, index: i });
      if (!firstFail) firstFail = { input: tc.input, expected: tc.expectedOutput, actual: r.compilationError };
      return;
    }
    const actual = norm(r.output || '');
    const passed = actual === norm(tc.expectedOutput);
    results.push({ passed, hidden: tc.hidden, index: i });
    if (!passed && !firstFail) firstFail = { input: tc.input, expected: tc.expectedOutput, actual: r.error ? `${actual}
${r.error}`.trim() : (actual || '(no output)') };
  });

  return { results, allPassed: results.every((r) => r.passed), firstFail, compileError };
}


// A hint for a failing attempt — never the fix/solution.
export async function hintForFailure(prompt: string, code: string, fail: { input: string; expected: string; actual: string }): Promise<string> {
  const sys = 'You are a patient coding tutor. The student\'s code failed a test. Give ONE short, specific hint that points them toward the bug in THEIR code — never rewrite it, never give the corrected code or the full approach. A nudge, not the answer.';
  const usr = `Problem: ${prompt}\n\nTheir code:\n"""${(code || '').slice(0, 2000)}"""\n\nOn input:\n${fail.input}\nExpected: ${fail.expected}\nGot: ${fail.actual}\n\nOne-sentence hint:`;
  try { return (await ai(sys, usr, 200)).slice(0, 400) || 'Trace your code by hand on that input — where does the actual output first differ from what you expected?'; }
  catch { return 'Trace your code by hand on that input — where does the actual output first differ from what you expected?'; }
}

// Score a solved drill: reward planning + first-try success; penalise many attempts/hints.
export function scoreDrill(planOk: boolean, attempts: number, hintsUsed: number): number {
  let s = 100;
  s -= Math.max(0, attempts - 1) * 8;
  s -= hintsUsed * 6;
  if (planOk) s += 5; else s -= 5;
  return Math.max(30, Math.min(100, Math.round(s)));
}

export const DRILL_CONCEPTS = [
  'Variables & Input/Output', 'Conditionals (if/else)', 'Loops', 'Arrays / Lists',
  'Strings', 'Functions', 'Basic Math', 'Searching', 'Sorting basics', 'Dictionaries / Maps',
];

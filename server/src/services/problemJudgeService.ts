import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';

/**
 * The Problem Bank's judge — the one place a bank problem's code is assembled, run and scored.
 *
 * Every older module scored code its own way: three weighted scorers, two output comparers,
 * five different time limits. Anything that runs a bank problem (the authoring studio today;
 * assignments, CareerPilot, exams and the external API next) comes through here, so a verdict
 * means the same thing everywhere.
 *
 * Pure with respect to storage: callers pass the problem and tests in, so the studio can run an
 * unsaved draft exactly the way a saved problem will be judged.
 */

export type Verdict = 'AC' | 'WA' | 'TLE' | 'RE' | 'CE' | 'BUSY' | 'SKIPPED';

export interface JudgeProblem {
  kind: 'code' | 'sql';
  languages: { language: string; starterCode?: string; headerCode?: string; footerCode?: string; solutionCode?: string }[];
  sqlSetup?: string;
  limits?: { timeMs?: number; memoryMb?: number };
  comparisonMode?: 'lenient' | 'exact' | 'case_insensitive' | 'numeric';
  marks?: number;
}

export interface JudgeCase { input: string; expectedOutput: string; isSample?: boolean; weight?: number }

export interface CaseResult {
  index: number;
  isSample: boolean;
  verdict: Verdict;
  passed: boolean;
  timeMs: number;
  weight: number;
  input?: string;
  expectedOutput?: string;
  output?: string;
  error?: string;
}

export interface JudgeResult {
  verdict: Verdict;
  passed: number;
  total: number;
  score: number;
  maxScore: number;
  timeMs: number;
  compileError?: string;
  cases: CaseResult[];
}

const LANG_MAP: Record<string, ProgrammingLanguage> = {
  python: ProgrammingLanguage.PYTHON, java: ProgrammingLanguage.JAVA, cpp: ProgrammingLanguage.CPP,
  c: ProgrammingLanguage.C, javascript: ProgrammingLanguage.JAVASCRIPT, typescript: ProgrammingLanguage.TYPESCRIPT,
  csharp: ProgrammingLanguage.CSHARP, go: ProgrammingLanguage.GO, rust: ProgrammingLanguage.RUST,
  sql: ProgrammingLanguage.SQL,
};

export function runnerLanguage(language: string): ProgrammingLanguage {
  const l = LANG_MAP[language];
  if (!l) throw new Error(`Language "${language}" is not supported by the judge.`);
  return l;
}

/** Hidden header + the solver's code + hidden footer, in that order. Empty parts are dropped. */
export function assembleSource(problem: JudgeProblem, language: string, code: string): string {
  if (problem.kind === 'sql') return code;
  const lang = problem.languages.find((l) => l.language === language);
  return [lang?.headerCode, code, lang?.footerCode].filter((p) => p && p.trim()).join('\n');
}

/** For SQL, each test's input is its own dataset script, run after the shared schema and before the query. */
function sqlProgram(problem: JudgeProblem, testInput: string, code: string): string {
  return [problem.sqlSetup, testInput, code].filter((p) => p && p.trim()).join('\n');
}

export function classify(r: { passed: boolean; error?: string; compilationError?: string }): Verdict {
  if (r.compilationError) return 'CE';
  if (r.error) {
    if (/busy|queue|not a problem with your code/i.test(r.error)) return 'BUSY';
    if (/time limit exceeded/i.test(r.error)) return 'TLE';
    return 'RE';
  }
  return r.passed ? 'AC' : 'WA';
}

/** The first failure a solver should fix: compile errors, then the sandbox, then runtime, time, wrong answer. */
const PRIORITY: Verdict[] = ['CE', 'BUSY', 'RE', 'TLE', 'WA'];

export function overallVerdict(cases: { verdict: Verdict }[]): Verdict {
  for (const v of PRIORITY) if (cases.some((c) => c.verdict === v)) return v;
  return cases.length ? 'AC' : 'SKIPPED';
}

const MAX_CASES_PER_RUN = 200;
const clip = (s: string | undefined, n = 20000) => (s && s.length > n ? `${s.slice(0, n)}\n… (${s.length - n} more characters)` : s || '');

/**
 * Run code against test cases.
 *
 * `revealHidden` decides whether hidden cases come back with their input, expected and actual
 * output. Authors get everything; a solver (later phases) only sees samples in full.
 */
export async function judge(
  problem: JudgeProblem,
  language: string,
  code: string,
  cases: JudgeCase[],
  opts: { revealHidden: boolean },
): Promise<JudgeResult> {
  if (!String(code || '').trim()) throw new Error('There is no code to run.');
  if (!cases.length) throw new Error('This problem has no test cases to run against.');
  if (cases.length > MAX_CASES_PER_RUN) throw new Error(`At most ${MAX_CASES_PER_RUN} test cases per run.`);

  const mode = problem.comparisonMode || 'lenient';
  const memoryLimit = problem.limits?.memoryMb || 256;
  const timeLimit = problem.limits?.timeMs || 2000;
  let raw: { passed: boolean; output: string; error?: string; compilationError?: string; executionTime: number }[];

  if (problem.kind === 'sql') {
    raw = [];
    for (const c of cases) {
      raw.push(await codeRunner.execute({
        code: sqlProgram(problem, c.input, code), language: ProgrammingLanguage.SQL, input: '',
        expectedOutput: c.expectedOutput, timeLimit, memoryLimit, comparisonMode: mode,
      }));
    }
  } else {
    raw = await codeRunner.executeBatch({
      code: assembleSource(problem, language, code),
      language: runnerLanguage(language),
      cases: cases.map((c) => ({ input: c.input || '', expectedOutput: c.expectedOutput || '', timeLimit })),
      memoryLimit,
      comparisonMode: mode,
    });
  }

  const results: CaseResult[] = raw.map((r, i) => {
    const c = cases[i];
    const verdict = classify(r);
    const show = opts.revealHidden || !!c.isSample;
    return {
      index: i,
      isSample: !!c.isSample,
      verdict,
      passed: verdict === 'AC',
      timeMs: r.executionTime || 0,
      weight: c.weight ?? 1,
      ...(show ? {
        input: clip(c.input), expectedOutput: clip(c.expectedOutput), output: clip(r.output),
        error: clip(r.error || r.compilationError),
      } : {
        // A hidden case still says WHY it failed, never what it contained.
        error: verdict === 'AC' || verdict === 'WA' ? undefined : clip(r.error || r.compilationError, 400),
      }),
    };
  });

  const totalWeight = results.reduce((s, c) => s + c.weight, 0);
  const passedWeight = results.filter((c) => c.passed).reduce((s, c) => s + c.weight, 0);
  const maxScore = problem.marks ?? 0;
  const compileError = raw.find((r) => r.compilationError)?.compilationError;

  return {
    verdict: overallVerdict(results),
    passed: results.filter((c) => c.passed).length,
    total: results.length,
    score: totalWeight ? Math.round((passedWeight / totalWeight) * maxScore * 100) / 100 : 0,
    maxScore,
    timeMs: results.reduce((m, c) => Math.max(m, c.timeMs), 0),
    compileError: compileError ? clip(compileError, 4000) : undefined,
    cases: results,
  };
}

/** Run code once against arbitrary input — the studio's "Custom input" button. */
export async function runCustom(problem: JudgeProblem, language: string, code: string, stdin: string) {
  if (!String(code || '').trim()) throw new Error('There is no code to run.');
  const r = problem.kind === 'sql'
    ? await codeRunner.execute({
      code: sqlProgram(problem, stdin, code), language: ProgrammingLanguage.SQL, input: '',
      expectedOutput: '', timeLimit: problem.limits?.timeMs || 2000, memoryLimit: problem.limits?.memoryMb || 256,
    })
    : await codeRunner.execute({
      code: assembleSource(problem, language, code), language: runnerLanguage(language), input: stdin || '',
      expectedOutput: '', timeLimit: problem.limits?.timeMs || 2000, memoryLimit: problem.limits?.memoryMb || 256,
    });
  const verdict = r.compilationError ? 'CE' : r.error ? classify(r) : 'OK';
  return { verdict, output: clip(r.output), error: clip(r.error || r.compilationError), timeMs: r.executionTime || 0 };
}

/**
 * Produce expected outputs by running the reference solution on each input.
 *
 * How problem setters work on Codeforces/Polygon: write the inputs, let the trusted solution
 * produce the answers. A case whose run fails keeps its old expected output and is reported.
 */
export async function generateExpectedOutputs(
  problem: JudgeProblem, language: string, solution: string, inputs: string[],
): Promise<{ outputs: (string | null)[]; failures: { index: number; error: string }[] }> {
  if (!String(solution || '').trim()) throw new Error(`There is no ${language} reference solution to generate outputs from.`);
  const outputs: (string | null)[] = [];
  const failures: { index: number; error: string }[] = [];
  const tidy = (s: string) => String(s || '').replace(/\r\n?/g, '\n').replace(/\s+$/, '');

  if (problem.kind !== 'sql') {
    // One batch, so Java compiles once rather than once per input.
    const raw = await codeRunner.executeBatch({
      code: assembleSource(problem, language, solution), language: runnerLanguage(language),
      cases: inputs.map((input) => ({ input, expectedOutput: '', timeLimit: problem.limits?.timeMs || 2000 })),
      memoryLimit: problem.limits?.memoryMb || 256,
    });
    raw.forEach((r, i) => {
      if (r.compilationError || r.error) {
        outputs.push(null);
        failures.push({ index: i, error: `${r.compilationError ? 'CE' : classify(r)}: ${String(r.compilationError || r.error).slice(0, 300)}` });
      } else outputs.push(tidy(r.output));
    });
    return { outputs, failures };
  }

  for (let i = 0; i < inputs.length; i++) {
    const r = await runCustom(problem, language, solution, inputs[i]);
    if (r.verdict === 'OK') outputs.push(tidy(r.output));
    else { outputs.push(null); failures.push({ index: i, error: `${r.verdict}: ${String(r.error || '').slice(0, 300)}` }); }
  }
  return { outputs, failures };
}

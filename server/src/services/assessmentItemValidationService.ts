import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { IAssessmentItem } from '../models/AssessmentItem';

/**
 * Run a reference solution against a bank item's test cases, and report what a candidate
 * would actually score.
 *
 * ── WHY AN AUTHOR CANNOT DO WITHOUT THIS ──────────────────────────────────────────────────
 *
 * A coding item is a statement, a starter, and a set of hidden test cases with expected
 * output typed by hand. Nothing checks that the expected output is what a correct program
 * prints. A trailing newline, a space before a comma, `4.0` where the program prints `4` —
 * each of those makes a well-written question fail EVERY candidate, and the first sign of it
 * is a support queue during the event.
 *
 * ── IT MUST BE THE SAME EXECUTION CALL THE GRADER MAKES ───────────────────────────────────
 *
 * Correct-by-construction rather than by agreement: `gradeCodeItem` decides a case by passing
 * `expectedOutput` into `codeRunner.execute` and reading `passed`, so this does exactly that,
 * with the same timeout and memory limit. A validator with its own comparison would eventually
 * say "passes" about a question that fails for every candidate, which is worse than having no
 * validator — an author would trust it.
 *
 * ── HIDDEN CASES ARE SHOWN, AND ONLY HERE ─────────────────────────────────────────────────
 *
 * The author is the one person who must see them; they wrote them. Every other surface keeps
 * hidden cases hidden, including the candidate's Run button, because running a hidden case is
 * how an answer key is read out one test at a time.
 */

export interface CaseResult {
  index: number;
  hidden: boolean;
  weight: number;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
  executionTimeMs: number;
}

export interface ValidationReport {
  runnable: boolean;
  /** Why validation could not run at all — no cases, wrong type, no code. */
  reason?: string;
  language: string;
  totalCases: number;
  passedCases: number;
  /** Exactly what `gradeCodeItem` would award, so the author sees the candidate's score. */
  score: number;
  maxScore: number;
  /** True only when every case passes — the bar a reference solution has to clear. */
  allPassed: boolean;
  cases: CaseResult[];
}

const LANG_MAP: Record<string, ProgrammingLanguage> = {
  java: ProgrammingLanguage.JAVA,
  python: ProgrammingLanguage.PYTHON,
  py: ProgrammingLanguage.PYTHON,
  javascript: ProgrammingLanguage.JAVASCRIPT,
  js: ProgrammingLanguage.JAVASCRIPT,
  typescript: ProgrammingLanguage.TYPESCRIPT,
  ts: ProgrammingLanguage.TYPESCRIPT,
  cpp: ProgrammingLanguage.CPP,
  'c++': ProgrammingLanguage.CPP,
  c: ProgrammingLanguage.C,
  csharp: ProgrammingLanguage.CSHARP,
  go: ProgrammingLanguage.GO,
  rust: ProgrammingLanguage.RUST,
  sql: ProgrammingLanguage.SQL,
};

/** Same resolution the grader uses: SQL by type, otherwise the item's declared language. */
export const languageFor = (item: Pick<IAssessmentItem, 'type' | 'language'>, override?: string): ProgrammingLanguage => {
  if (!override && item.type === 'sql') return ProgrammingLanguage.SQL;
  const key = String(override || item.language || '').toLowerCase();
  return LANG_MAP[key] || ProgrammingLanguage.JAVASCRIPT;
};

export async function validateItemSolution(
  item: IAssessmentItem,
  code: string,
  languageOverride?: string,
): Promise<ValidationReport> {
  const tests = item.testCases || [];
  const language = languageFor(item, languageOverride);
  const maxScore = item.points ?? 1;

  const empty: ValidationReport = {
    runnable: false, language, totalCases: tests.length,
    passedCases: 0, score: 0, maxScore, allPassed: false, cases: [],
  };

  if (item.type !== 'live_code' && item.type !== 'sql') {
    return { ...empty, reason: `Only live_code and sql items are run. This item is "${item.type}".` };
  }
  if (!tests.length) return { ...empty, reason: 'This item has no test cases to run against.' };
  if (!code || !code.trim()) return { ...empty, reason: 'Paste a reference solution to validate against.' };

  /*
   * Sequential, not Promise.all.
   *
   * The grader parallelises because it is grading one candidate among many and the queue is
   * what paces it. An author validating a Java item would otherwise fire eight compiles at
   * once into a pool of two and wait out a queue they have no reason to be in — and while
   * they sat there, they would be holding slots a live exam needs.
   */
  const cases: CaseResult[] = [];
  for (const [index, tc] of tests.entries()) {
    let r: any;
    try {
      r = await codeRunner.execute({
        code, language,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        timeLimit: 15000,
        memoryLimit: 256,
      });
    } catch (e: any) {
      r = { passed: false, output: '', error: e?.message || 'Execution failed', executionTime: 0 };
    }
    cases.push({
      index,
      hidden: tc.hidden !== false,
      weight: tc.weight ?? 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput: r.output ?? '',
      passed: !!r.passed,
      error: r.compilationError || r.error || undefined,
      executionTimeMs: r.executionTime ?? 0,
    });
  }

  const totalWeight = cases.reduce((s, c) => s + c.weight, 0);
  const passedWeight = cases.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const passedCases = cases.filter(c => c.passed).length;

  return {
    runnable: true,
    language,
    totalCases: cases.length,
    passedCases,
    score: totalWeight ? Math.round((passedWeight / totalWeight) * maxScore * 100) / 100 : 0,
    maxScore,
    allPassed: passedCases === cases.length,
    cases,
  };
}

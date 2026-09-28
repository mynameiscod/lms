import codeRunner from './codeRunnerService';
import { ProgrammingLanguage } from '../models/Assignment';
import { IAssessmentItem } from '../models/AssessmentItem';
import { ISubmissionItem } from '../models/AssessmentSubmission';

/**
 * Wave B grading — runs a candidate's live-code / SQL answer against the item's
 * test cases via the Piston code runner and awards a proportional score.
 *
 * Skipped items (no code submitted — e.g. an optional mobile bonus) are left
 * ungraded so they're excluded from the sub-score totals and never penalize.
 */

function toProgrammingLanguage(item: IAssessmentItem): ProgrammingLanguage {
  if (item.type === 'sql') return ProgrammingLanguage.SQL;
  const l = (item.language || '').toLowerCase();
  const map: Record<string, ProgrammingLanguage> = {
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
  return map[l] || ProgrammingLanguage.JAVASCRIPT;
}

/** Grade one live-code / SQL response in place. Safe to call concurrently. */
export async function gradeCodeItem(item: IAssessmentItem, resp: ISubmissionItem): Promise<void> {
  const tests = item.testCases || [];
  resp.maxScore = item.points ?? 1;
  resp.testCasesTotal = tests.length;

  // No code or no tests → leave ungraded (excluded from totals).
  if (!resp.code || !resp.code.trim() || tests.length === 0) {
    resp.graded = false;
    resp.testCasesPassed = 0;
    return;
  }

  const language = toProgrammingLanguage(item);

  /*
   * ONE execution job for the whole item, not one per test case.
   *
   * This was Promise.all over every test case, each a separate execute() call, against a
   * global concurrency cap of a handful of jobs. Two consequences, both bad: a Java answer
   * compiled identical source once per case — and compilation is nearly the whole cost — and
   * one candidate's seven-case answer occupied every execution slot on the platform while it
   * ran. executeBatch compiles once and forks a fresh process per case, so it is one slot and
   * one compilation, with the per-case isolation unchanged.
   */
  let raw: Awaited<ReturnType<typeof codeRunner.executeBatch>>;
  try {
    raw = await codeRunner.executeBatch({
      code: resp.code as string,
      language,
      cases: tests.map((tc) => ({
        input: tc.input, expectedOutput: tc.expectedOutput, timeLimit: 15000,
      })),
      memoryLimit: 256,
    });
  } catch {
    /*
     * WE COULD NOT RUN IT — which is not the same as the program being wrong.
     *
     * This used to be `.catch(() => ({ passed: false }))`, so a queue timeout or a sandbox
     * outage scored the candidate zero and told them their correct solution failed. An
     * execution failure now leaves the item ungraded, which excludes it from the totals
     * rather than penalising it, and leaves it visible for a re-grade.
     */
    resp.graded = false;
    resp.testCasesPassed = 0;
    return;
  }

  const results = tests.map((tc, i) => ({
    passed: !!raw[i]?.passed,
    weight: tc.weight ?? 1,
  }));

  const totalWeight = results.reduce((s, r) => s + r.weight, 0);
  const passedWeight = results.reduce((s, r) => s + (r.passed ? r.weight : 0), 0);
  const passedCount = results.filter((r) => r.passed).length;

  resp.testCasesPassed = passedCount;
  resp.score = totalWeight ? Math.round((passedWeight / totalWeight) * resp.maxScore * 100) / 100 : 0;
  resp.isCorrect = passedCount === tests.length;
  resp.graded = true;
}

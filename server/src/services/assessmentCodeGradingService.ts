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

  const results = await Promise.all(
    tests.map((tc) =>
      codeRunner
        .execute({ code: resp.code as string, language, input: tc.input, expectedOutput: tc.expectedOutput, timeLimit: 15000, memoryLimit: 256 })
        .then((r) => ({ passed: r.passed, weight: tc.weight ?? 1 }))
        .catch(() => ({ passed: false, weight: tc.weight ?? 1 }))
    )
  );

  const totalWeight = results.reduce((s, r) => s + r.weight, 0);
  const passedWeight = results.reduce((s, r) => s + (r.passed ? r.weight : 0), 0);
  const passedCount = results.filter((r) => r.passed).length;

  resp.testCasesPassed = passedCount;
  resp.score = totalWeight ? Math.round((passedWeight / totalWeight) * resp.maxScore * 100) / 100 : 0;
  resp.isCorrect = passedCount === tests.length;
  resp.graded = true;
}

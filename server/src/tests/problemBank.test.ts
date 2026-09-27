/**
 * Problem Bank — the rules that decide what a problem is and how it is judged.
 *
 * Every older module scored code its own way and each drifted; these pin the one definition.
 * The code runner is mocked: what is under test is how the bank assembles, classifies and
 * scores, not Piston.
 */
jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  default: { execute: jest.fn(), executeBatch: jest.fn() },
}));

import codeRunner from '../services/codeRunnerService';
import { assembleSource, classify, overallVerdict, judge } from '../services/problemJudgeService';
import { normalizeInput, slugify } from '../services/problemBankService';
import { parseImport, previewImport, csvTemplate } from '../services/problemImportService';
import { normalizeDifficulty, normalizeLanguage, normalizeTopic } from '../config/problemBankTaxonomy';

const runner = codeRunner as unknown as { execute: jest.Mock; executeBatch: jest.Mock };

describe('vocabulary', () => {
  it('maps every legacy difficulty scale onto easy/medium/hard', () => {
    expect(normalizeDifficulty('beginner')).toBe('easy');
    expect(normalizeDifficulty(2)).toBe('easy');
    expect(normalizeDifficulty(3)).toBe('medium');
    expect(normalizeDifficulty('interview')).toBe('hard');
    expect(normalizeDifficulty('expert')).toBe('hard');
    expect(normalizeDifficulty(undefined)).toBe('medium');
  });

  it('recognises topic aliases and languages by their common names', () => {
    expect(normalizeTopic('DP')).toBe('dynamic-programming');
    expect(normalizeTopic('Two Pointers')).toBe('two-pointers');
    expect(normalizeTopic('Sliding Window')).toBe('sliding-window');
    expect(normalizeTopic('underwater basket weaving')).toBeNull();
    expect(normalizeLanguage('C++')).toBe('cpp');
    expect(normalizeLanguage('py')).toBe('python');
    expect(normalizeLanguage('cobol')).toBeNull();
  });

  it('slugifies titles safely', () => {
    expect(slugify('Two Sum — II!')).toBe('two-sum-ii');
    expect(slugify('')).toBe('problem');
  });
});

describe('validation', () => {
  const base = {
    title: 'Sum', statement: 'Add them', difficulty: 'easy',
    languages: [{ language: 'python', starterCode: '', solutionCode: 'print(1)' }],
    tests: [{ input: '1 2', expectedOutput: '3', isSample: true }, { input: '2 2', expectedOutput: '4' }],
  };

  it('accepts a complete problem with nothing blocking publish', () => {
    const n = normalizeInput(base);
    expect(n.errors).toEqual([]);
    expect(n.publishErrors).toEqual([]);
    expect(n.clean.marks).toBe(10); // easy default
  });

  it('keeps unknown topics as tags instead of rejecting them', () => {
    const n = normalizeInput({ ...base, topics: ['Arrays', 'Bitwise tricks'] });
    expect(n.clean.topics).toEqual(['array']);
    expect(n.clean.tags).toContain('Bitwise tricks');
  });

  it('drops languages the judge cannot run, and de-duplicates', () => {
    const n = normalizeInput({ ...base, languages: [{ language: 'Python3' }, { language: 'py' }, { language: 'kotlin' }] as any });
    expect(n.clean.languages.map((l: any) => l.language)).toEqual(['python']);
    expect(n.warnings.join(' ')).toMatch(/kotlin/);
  });

  it('lets a draft be incomplete but says exactly what blocks publishing', () => {
    const n = normalizeInput({ title: 'Half done' });
    expect(n.errors).toEqual([]);
    expect(n.publishErrors.join(' ')).toMatch(/statement/);
    expect(n.publishErrors.join(' ')).toMatch(/test case/);
    expect(n.publishErrors.join(' ')).toMatch(/language/);
  });

  it('requires a sample and complete expected outputs before publishing', () => {
    expect(normalizeInput({ ...base, tests: [{ input: '1', expectedOutput: '1' }] }).publishErrors.join(' ')).toMatch(/sample/);
    expect(normalizeInput({ ...base, tests: [{ input: '1', expectedOutput: '', isSample: true }] }).publishErrors.join(' ')).toMatch(/expected output/);
  });

  it('rejects a missing title and oversized tests outright', () => {
    expect(normalizeInput({ ...base, title: '' }).errors.join(' ')).toMatch(/Title/);
    const big = 'x'.repeat(600 * 1024);
    expect(normalizeInput({ ...base, tests: [{ input: big, expectedOutput: '1', isSample: true }] }).errors.join(' ')).toMatch(/512 KB/);
  });

  it('clamps limits to what the runner can honour', () => {
    const n = normalizeInput({ ...base, limits: { timeMs: 999999, memoryMb: 1 } });
    expect(n.clean.limits).toEqual({ timeMs: 20000, memoryMb: 32 });
  });
});

describe('judging', () => {
  const problem: any = {
    kind: 'code', marks: 20, comparisonMode: 'lenient',
    languages: [{ language: 'java', headerCode: 'import java.util.*;', footerCode: 'class Driver {}' }],
  };

  it('wraps the solver code in the hidden header and footer, in order', () => {
    expect(assembleSource(problem, 'java', 'class Solution {}')).toBe('import java.util.*;\nclass Solution {}\nclass Driver {}');
    expect(assembleSource({ ...problem, languages: [] }, 'java', 'X')).toBe('X');
  });

  it('classifies runner results into verdicts', () => {
    expect(classify({ passed: true })).toBe('AC');
    expect(classify({ passed: false })).toBe('WA');
    expect(classify({ passed: false, compilationError: 'x' })).toBe('CE');
    expect(classify({ passed: false, error: 'Time limit exceeded — your program ran too long' })).toBe('TLE');
    expect(classify({ passed: false, error: 'The server was busy and had to stop your program' })).toBe('BUSY');
    expect(classify({ passed: false, error: 'NullPointerException' })).toBe('RE');
  });

  it('reports the failure a solver should fix first', () => {
    expect(overallVerdict([{ verdict: 'WA' }, { verdict: 'CE' }])).toBe('CE');
    expect(overallVerdict([{ verdict: 'WA' }, { verdict: 'TLE' }])).toBe('TLE');
    expect(overallVerdict([{ verdict: 'AC' }])).toBe('AC');
  });

  it('scores by test weight and hides hidden cases from solvers', async () => {
    runner.executeBatch.mockResolvedValueOnce([
      { passed: true, output: '3', executionTime: 10 },
      { passed: false, output: '9', executionTime: 12 },
      { passed: true, output: '7', executionTime: 11 },
    ]);
    const r = await judge(problem, 'java', 'code', [
      { input: '1 2', expectedOutput: '3', isSample: true, weight: 1 },
      { input: 'secret', expectedOutput: '8', weight: 1 },
      { input: 'secret2', expectedOutput: '7', weight: 2 },
    ], { revealHidden: false });
    expect(r.verdict).toBe('WA');
    expect(r.passed).toBe(2);
    expect(r.score).toBe(15); // 3 of 4 weight x 20 marks
    expect(r.cases[0].input).toBe('1 2');
    expect(r.cases[1].input).toBeUndefined();
    expect(r.cases[1].output).toBeUndefined();
    expect(runner.executeBatch.mock.calls[0][0].code).toContain('import java.util.*;');
  });

  it('runs SQL per test with the shared schema, the test dataset, then the query', async () => {
    runner.execute.mockResolvedValue({ passed: true, output: '1', executionTime: 5 });
    await judge({ kind: 'sql', languages: [{ language: 'sql' }], sqlSetup: 'CREATE TABLE t(a);', marks: 10 } as any,
      'sql', 'SELECT 1;', [{ input: 'INSERT INTO t VALUES(1);', expectedOutput: '1', isSample: true }], { revealHidden: true });
    expect(runner.execute.mock.calls.at(-1)[0].code).toBe('CREATE TABLE t(a);\nINSERT INTO t VALUES(1);\nSELECT 1;');
  });

  it('refuses to run without code or tests', async () => {
    await expect(judge(problem, 'java', '  ', [{ input: '', expectedOutput: '' }], { revealHidden: true })).rejects.toThrow(/no code/);
    await expect(judge(problem, 'java', 'x', [], { revealHidden: true })).rejects.toThrow(/no test cases/);
  });
});

describe('bulk import', () => {
  it('reads the CSV template round-trip, including numbered tests and per-language columns', () => {
    const items = parseImport('t.csv', Buffer.from(csvTemplate()).toString('base64'), undefined);
    expect(items).toHaveLength(1);
    const p = items[0];
    expect(p.title).toBe('Sum of Two Numbers');
    expect(p.topics).toEqual(['basics', 'math']);
    expect(p.tests!.filter((t) => t.isSample)).toHaveLength(1);
    expect(p.tests).toHaveLength(3);
    expect(p.languages!.map((l) => l.language).sort()).toEqual(['java', 'python']);
    expect(p.hints).toHaveLength(1);
  });

  it('accepts JSON with {problems:[]}, "output" and "sample" aliases, and solutions maps', () => {
    const items = parseImport('x.json', undefined, JSON.stringify({ problems: [{
      title: 'A', statement: 's', tests: [{ input: '1', output: '1', sample: true }], solutions: { python: 'print(1)' },
    }] }));
    expect(items[0].tests![0]).toMatchObject({ input: '1', expectedOutput: '1', isSample: true });
    expect(items[0].languages![0]).toMatchObject({ language: 'python', solutionCode: 'print(1)' });
  });

  it('previews without saving: blanks with a solution are fillable, blanks without one are errors', () => {
    const rows = previewImport([
      { title: 'Ok', statement: 's', languages: [{ language: 'python', solutionCode: 'print(1)' }], tests: [{ input: '1', expectedOutput: '', isSample: true }] },
      { title: 'Bad', statement: 's', languages: [{ language: 'python' }], tests: [{ input: '1', expectedOutput: '', isSample: true }] },
    ]);
    expect(rows[0].errors).toEqual([]);
    expect(rows[0].warnings.join(' ')).toMatch(/generated/);
    expect(rows[1].errors.join(' ')).toMatch(/no reference solution/);
  });

  it('rejects files it cannot read', () => {
    expect(() => parseImport('x.pdf', 'AAAA', undefined)).toThrow(/json, .csv/);
    expect(() => parseImport('x.json', undefined, '{bad')).toThrow(/not valid JSON/);
  });
});

import { inAudience } from '../services/problemDeliveryService';
import { problemBankFilter } from '../services/hackathonExamDrawService';

describe('who a problem set is for', () => {
  const base = { userId: 'u1', tenantId: 't1', role: 'STUDENT', batchId: 'b1', isLms: true, isCareerPilot: false, isStaff: false };
  const set = (audience: any[]) => ({ audience } as any);

  it('matches a batch, a named user, and the all-students targets', () => {
    expect(inAudience(set([{ type: 'batch', id: 'b1' }]), base)).toBe(true);
    expect(inAudience(set([{ type: 'batch', id: 'b2' }]), base)).toBe(false);
    expect(inAudience(set([{ type: 'user', id: 'u1' }]), { ...base, batchId: '' })).toBe(true);
    expect(inAudience(set([{ type: 'all_lms' }]), base)).toBe(true);
  });

  it('keeps LMS-only sets away from CareerPilot members and vice versa', () => {
    const member = { ...base, batchId: '', isLms: false, isCareerPilot: true };
    expect(inAudience(set([{ type: 'all_lms' }]), member)).toBe(false);
    expect(inAudience(set([{ type: 'all_careerpilot' }]), member)).toBe(true);
    expect(inAudience(set([{ type: 'all_careerpilot' }]), base)).toBe(false);
  });

  it('matches nobody when the set has no audience yet', () => {
    expect(inAudience(set([]), base)).toBe(false);
  });
});

describe('exam sections drawing from the Problem Bank', () => {
  const section: any = { source: 'problem_bank', pbDifficulties: ['easy', 'medium'], topics: ['array'], tags: [], languages: ['java'] };

  it('draws only published problems with tests, from the institute or the global library', () => {
    const f = problemBankFilter('t1', section);
    expect(f.status).toBe('published');
    expect(f.testCount).toEqual({ $gt: 0 });
    expect(f.$or).toEqual([{ scope: 'tenant', tenantId: 't1' }, { scope: 'global' }]);
  });

  it('narrows by difficulty, topic and language only when set', () => {
    const f = problemBankFilter('t1', section);
    expect(f.difficulty).toEqual({ $in: ['easy', 'medium'] });
    expect(f.topics).toEqual({ $in: ['array'] });
    expect(f['languages.language']).toEqual({ $in: ['java'] });
    expect(f.tags).toBeUndefined();
    expect(problemBankFilter('t1', { source: 'problem_bank' } as any).difficulty).toBeUndefined();
  });
});

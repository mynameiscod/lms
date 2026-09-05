/**
 * Verified test cases, and the JavaScript prompt() shim.
 *
 * Two failures used to reach students as one confusing symptom — "my correct code fails".
 *
 *   THE EXPECTED OUTPUT WAS A GUESS. The model was asked what its own solution would print
 *   and we stored the answer. It is wrong often enough that students failed correct programs
 *   with no way to tell whose fault it was. The fix is that the expected output is now
 *   MEASURED by running the reference solution, so these tests care about exactly one thing:
 *   that a model-supplied expectedOutput can never survive into a saved test case.
 *
 *   JAVASCRIPT COULD NOT READ ITS INPUT. Node has no prompt(), so students were pushed
 *   toward async readline and their programs produced nothing. The shim's edge cases are
 *   where this gets subtly wrong — a trailing newline handing out a phantom empty answer,
 *   an exhausted input returning "" instead of failing — so they are pinned here.
 */

import vm from 'vm';
import { JS_PROMPT_PRELUDE } from '../services/codeRunnerService';

// ── The prompt() shim, executed for real ─────────────────────────────────────

/**
 * Run `code` the way Piston would: the prelude, then the program, with `stdin` on fd 0.
 *
 * A real vm rather than assertions about the string, because the whole value of the shim is
 * its runtime behaviour — reading the source and believing it is what shipped the bug.
 */
function runWithShim(stdin: string, code: string): { stdout: string; error?: string } {
  const out: string[] = [];
  const sandbox: any = {
    console: { log: (...a: any[]) => out.push(a.map(String).join(' ')) },
    require: (m: string) => {
      if (m !== 'fs') throw new Error(`unexpected require(${m})`);
      return { readFileSync: (fd: number) => { if (fd !== 0) throw new Error('not stdin'); return stdin; } };
    },
  };
  sandbox.globalThis = sandbox;
  try {
    vm.runInNewContext(`${JS_PROMPT_PRELUDE}\n${code}`, sandbox, { timeout: 2000 });
    return { stdout: out.join('\n') };
  } catch (e: any) {
    return { stdout: out.join('\n'), error: e?.message || String(e) };
  }
}

describe('the JavaScript prompt() shim', () => {
  it('hands the input lines out one call at a time', () => {
    const r = runWithShim('10\n20', 'let a=Number(prompt());let b=Number(prompt());console.log(a+b);');
    expect(r.error).toBeUndefined();
    expect(r.stdout).toBe('30');
  });

  it('returns STRINGS, so converting stays the student\'s decision', () => {
    // "10" + "20" is "1020" for a string, 30 for a number. This is the whole distinction.
    expect(runWithShim('10\n20', 'console.log(prompt()+prompt());').stdout).toBe('1020');
  });

  it('never prints the prompt message', () => {
    // A message in stdout would be graded as part of the answer.
    const r = runWithShim('5\n', 'let n=prompt("Enter a number:");console.log(n);');
    expect(r.stdout).toBe('5');
  });

  it('serves three values in order', () => {
    const r = runWithShim('Rahul\n22\nHyderabad',
      'let n=prompt();let a=prompt();let c=prompt();console.log(n);console.log(a);console.log(c);');
    expect(r.stdout).toBe('Rahul\n22\nHyderabad');
  });

  it('ignores a trailing newline instead of inventing a fourth empty answer', () => {
    // "10\n20\n".split("\n") is ["10","20",""] — the empty string would silently become an
    // answer, and the program would run on past the end of its input.
    const r = runWithShim('10\n20\n', 'prompt();prompt();prompt();');
    expect(r.error).toMatch(/more input than this test case provides/);
  });

  it('handles Windows line endings', () => {
    expect(runWithShim('10\r\n20', 'console.log(Number(prompt())+Number(prompt()));').stdout).toBe('30');
  });

  it('fails clearly when the program asks for more input than exists', () => {
    const r = runWithShim('7', 'prompt();prompt();');
    expect(r.error).toMatch(/called prompt\(\) 2 time\(s\), but only 1 input value/);
  });

  it('fails on empty input rather than returning an empty string', () => {
    const r = runWithShim('', 'console.log(prompt());');
    expect(r.error).toMatch(/more input than this test case provides/);
    expect(r.stdout).toBe('');
  });

  it('reads stdin lazily, so code that never calls prompt() is untouched', () => {
    // The safety argument for switching this on for every JS assignment: a program that
    // reads stdin the old way must not have it consumed out from under it.
    let touched = false;
    const sandbox: any = {
      console: { log: () => {} },
      require: () => ({ readFileSync: () => { touched = true; return '1\n2'; } }),
    };
    sandbox.globalThis = sandbox;
    vm.runInNewContext(`${JS_PROMPT_PRELUDE}\nlet x = 1 + 1;`, sandbox, { timeout: 2000 });
    expect(touched).toBe(false);
  });

  it('occupies exactly one line, so stack traces can be shifted back', () => {
    expect(JS_PROMPT_PRELUDE.includes('\n')).toBe(false);
  });
});

// ── Generation: the expected output must be measured, never taken from the model ──

const completion = (payload: any) => ({
  choices: [{ message: { content: JSON.stringify(payload) } }],
});

let aiPayload: any;
let runs: { code: string; input: string; enablePromptInput?: boolean }[] = [];
let runResult: (input: string) => any;

jest.mock('../services/aiClients', () => ({
  __esModule: true,
  getOpenAI: () => ({
    chat: { completions: { create: async () => completion(aiPayload) } },
  }),
}));

jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  JS_PROMPT_PRELUDE: jest.requireActual('../services/codeRunnerService').JS_PROMPT_PRELUDE,
  default: {
    execute: async (o: any) => {
      runs.push({ code: o.code, input: o.input, enablePromptInput: o.enablePromptInput });
      return runResult(o.input);
    },
  },
}));

import { generateCodingAssignmentWithAI } from '../services/aiService';

const SOLUTION = 'let a=Number(prompt());let b=Number(prompt());console.log(a+b);';

const basePayload = (over: any = {}) => ({
  description: 'Add two numbers',
  instructions: 'Read two numbers and print the sum',
  starterCode: '// TODO',
  solutionCode: SOLUTION,
  testCases: [
    { input: '10\n20', description: 'sum', isHidden: false },
    { input: '5\n7', description: 'sum again', isHidden: true },
  ],
  topics: ['math'],
  ...over,
});

const ok = (output: string) => ({ passed: true, output, executionTime: 5, memoryUsed: 1 });

const params = {
  title: 'Add two numbers', concept: 'arithmetic', language: 'javascript',
  difficulty: 'easy' as const, testCaseCount: 2,
};

beforeEach(() => {
  runs = [];
  aiPayload = basePayload();
  runResult = (input: string) => ok(String(input.split('\n').reduce((n, x) => n + Number(x), 0)));
});

describe('generateCodingAssignmentWithAI', () => {
  it('uses the output of the executed solution as the expected output', async () => {
    const r = await generateCodingAssignmentWithAI(params);
    expect(r.testCases.map(t => t.expectedOutput)).toEqual(['30', '12']);
  });

  it('ignores an expectedOutput the model supplied, even a plausible one', async () => {
    // The exact failure this whole change exists to make impossible.
    aiPayload = basePayload({
      testCases: [
        { input: '10\n20', expectedOutput: '40', description: 'sum', isHidden: false },
        { input: '5\n7', expectedOutput: '35', description: 'product?', isHidden: true },
      ],
    });
    const r = await generateCodingAssignmentWithAI(params);
    expect(r.testCases.map(t => t.expectedOutput)).toEqual(['30', '12']);
  });

  it('runs the reference the same way the student will be run', async () => {
    await generateCodingAssignmentWithAI(params);
    expect(runs).toHaveLength(2);
    // Same code, same inputs, same prompt() support — otherwise the two outputs are not
    // comparable and the verification proves nothing.
    expect(runs.every(x => x.code === SOLUTION)).toBe(true);
    expect(runs.every(x => x.enablePromptInput === true)).toBe(true);
    expect(runs.map(x => x.input)).toEqual(['10\n20', '5\n7']);
  });

  it('drops a test case the reference could not run, and says why', async () => {
    aiPayload = basePayload({
      testCases: [
        { input: '10\n20', description: 'ok', isHidden: false },
        { input: '1', description: 'not enough input for the solution', isHidden: false },
        { input: '5\n7', description: 'ok', isHidden: true },
      ],
    });
    runResult = (input: string) => (input === '1'
      ? { passed: false, output: '', error: 'Your program asked for more input than this test case provides', executionTime: 3, memoryUsed: 0 }
      : ok(String(input.split('\n').reduce((n, x) => n + Number(x), 0))));

    const r = await generateCodingAssignmentWithAI({ ...params, testCaseCount: 3 });
    expect(r.testCases).toHaveLength(2);
    expect(r.verification).toMatchObject({ requested: 3, verified: 2 });
    expect(r.verification!.dropped[0]).toMatch(/Test case 2/);
  });

  it('redistributes the points over what survived, so the paper is still out of 100', async () => {
    const r = await generateCodingAssignmentWithAI(params);
    expect(r.testCases.reduce((n, t) => n + t.points, 0)).toBe(100);
  });

  it('refuses to return a draft when the solution never ran', async () => {
    runResult = () => ({ passed: false, output: '', compilationError: 'SyntaxError: unexpected token', executionTime: 0, memoryUsed: 0 });
    await expect(generateCodingAssignmentWithAI(params)).rejects.toThrow(/did not run against any of its test inputs/);
  });

  it('treats a silent reference as a failure, not as an empty answer', async () => {
    // An empty expectedOutput would mark every student who printed the right thing wrong.
    runResult = () => ok('   \n  ');
    await expect(generateCodingAssignmentWithAI(params)).rejects.toThrow(/did not run/);
  });

  it('refuses a nondeterministic reference before wasting an execution on it', async () => {
    aiPayload = basePayload({ solutionCode: 'console.log(Math.random());' });
    await expect(generateCodingAssignmentWithAI(params)).rejects.toThrow(/Math\.random/);
    expect(runs).toHaveLength(0);
  });

  it('refuses when there is no reference solution to verify against', async () => {
    aiPayload = basePayload({ solutionCode: '' });
    await expect(generateCodingAssignmentWithAI(params)).rejects.toThrow(/no reference solution/);
  });

  it('keeps the reference solution on the draft so it can re-verify later', async () => {
    const r = await generateCodingAssignmentWithAI(params);
    expect(r.solutionCode).toBe(SOLUTION);
  });

  it('verifies other languages through the same path, unchanged', async () => {
    aiPayload = basePayload({ solutionCode: 'import java.util.*; // ...' });
    const r = await generateCodingAssignmentWithAI({ ...params, language: 'java' });
    expect(r.testCases.map(t => t.expectedOutput)).toEqual(['30', '12']);
    // The flag is still passed; codeRunnerService ignores it for everything but JavaScript.
    expect(runs.every(x => x.enablePromptInput === true)).toBe(true);
  });
});

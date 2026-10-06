const settingsValues: Record<string, string> = {};
jest.mock('../services/settingsService', () => ({
  getStr: (k: string, fallback = '') => settingsValues[k] ?? fallback,
  getNum: (_k: string, fallback: number) => fallback,
}));

const execute = jest.fn();
jest.mock('../services/codeRunnerService', () => ({
  __esModule: true,
  default: {
    execute: (...a: any[]) => execute(...a),
    isRealExecutionEnabled: () => true,
    installedLanguages: async () => ['python', 'java', 'sqlite' /* not mapped */],
  },
}));

import * as judge from '../services/codeJudgeService';

const SECRET = 'x'.repeat(40);
const PATH = '/api/v1/judge/v1/submissions';
const waitDone = async (token: string) => {
  for (let i = 0; i < 50; i++) {
    const s = judge.status(token);
    if (s.status === 'DONE') return s.result!;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error('job did not finish');
};
const sub = (over: any = {}) => ({ language: 'python', source: 'print(input())', tests: [{ input: '5', expectedOutput: '5' }], limits: { cpuMs: 2000, memoryMb: 256 }, ...over });
const ok = (output: string, extra: any = {}) => ({ passed: true, output, executionTime: 30, memoryUsed: 8, timing: { runMs: 30 }, ...extra });

beforeEach(() => {
  judge.__reset();
  execute.mockReset();
  for (const k of Object.keys(settingsValues)) delete settingsValues[k];
  settingsValues.JUDGE_SIGNING_SECRET = SECRET;
});

describe('signature — same algorithm as Interview Pilot', () => {
  const body = JSON.stringify(sub());

  it('accepts a request signed by Interview Pilot\'s signJudgeRequest', () => {
    const h = judge.signJudgeRequest(SECRET, 'POST', PATH, body);
    expect(judge.verifyRequest({ method: 'POST', path: PATH, body, timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] })).toEqual({ ok: true });
  });

  it('refuses a wrong secret, a changed body, or a changed path', () => {
    const h = judge.signJudgeRequest('y'.repeat(40), 'POST', PATH, body);
    expect(judge.verifyRequest({ method: 'POST', path: PATH, body, timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] }).ok).toBe(false);
    const g = judge.signJudgeRequest(SECRET, 'POST', PATH, body);
    expect(judge.verifyRequest({ method: 'POST', path: PATH, body: body + ' ', timestamp: g['x-cb-timestamp'], signature: g['x-cb-signature'] }).ok).toBe(false);
    expect(judge.verifyRequest({ method: 'POST', path: '/api/v1/judge/v1/other', body, timestamp: g['x-cb-timestamp'], signature: g['x-cb-signature'] }).ok).toBe(false);
  });

  it('refuses a timestamp outside the 5-minute window', () => {
    const old = Date.now() - 6 * 60_000;
    const h = judge.signJudgeRequest(SECRET, 'GET', '/api/v1/judge/v1/languages', '', old);
    expect(judge.verifyRequest({ method: 'GET', path: '/api/v1/judge/v1/languages', body: '', timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] })).toMatchObject({ ok: false, status: 401 });
  });

  it('refuses a replayed POST, but lets identical GET polls through', () => {
    const h = judge.signJudgeRequest(SECRET, 'POST', PATH, body);
    const req = { method: 'POST', path: PATH, body, timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] };
    expect(judge.verifyRequest(req).ok).toBe(true);
    expect(judge.verifyRequest(req).ok).toBe(false);
    const g = judge.signJudgeRequest(SECRET, 'GET', `${PATH}/abc`, '');
    const poll = { method: 'GET', path: `${PATH}/abc`, body: '', timestamp: g['x-cb-timestamp'], signature: g['x-cb-signature'] };
    expect(judge.verifyRequest(poll).ok).toBe(true);
    expect(judge.verifyRequest(poll).ok).toBe(true);
  });

  it('is off (503) with no secret, and ignores secrets under 32 characters', () => {
    settingsValues.JUDGE_SIGNING_SECRET = 'short';
    const h = judge.signJudgeRequest('short', 'GET', '/x', '');
    expect(judge.verifyRequest({ method: 'GET', path: '/x', body: '', timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] })).toMatchObject({ ok: false, status: 503 });
  });

  it('accepts the previous secret during a rotation', () => {
    settingsValues.JUDGE_SIGNING_SECRET = 'n'.repeat(40);
    settingsValues.JUDGE_SIGNING_SECRET_PREVIOUS = SECRET;
    const h = judge.signJudgeRequest(SECRET, 'GET', '/x', '');
    expect(judge.verifyRequest({ method: 'GET', path: '/x', body: '', timestamp: h['x-cb-timestamp'], signature: h['x-cb-signature'] }).ok).toBe(true);
  });
});

describe('languages', () => {
  it('offers only languages that are both mapped and installed on the sandbox', async () => {
    expect(await judge.listLanguages()).toEqual(['python', 'java']);
  });
});

describe('submissions and verdicts', () => {
  it('rejects unsupported languages and empty or oversized input', () => {
    expect(() => judge.submit(sub({ language: 'kotlin' }))).toThrow(/Unsupported/);
    expect(() => judge.submit(sub({ source: '  ' }))).toThrow(/Empty/);
    expect(() => judge.submit(sub({ tests: [] }))).toThrow(/At least one/);
    expect(() => judge.submit(sub({ source: 'x'.repeat(70 * 1024) }))).toThrow(/64 KB/);
  });

  it('runs in the judge queue and returns verdicts in test order', async () => {
    execute.mockImplementation(async (i: any) => ok(i.input === '1' ? '1\n' : 'nope'));
    const { token } = judge.submit(sub({ tests: [{ input: '1', expectedOutput: '1' }, { input: '2', expectedOutput: '2' }] }));
    const r = await waitDone(token);
    expect(r.tests.map((t) => t.verdict)).toEqual(['ACCEPTED', 'WRONG_ANSWER']);
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ queueScope: 'judge' }));
  });

  it('compares only EXACT tests; UNORDERED_LINES and NONE are just run', async () => {
    execute.mockResolvedValue(ok('b\na'));
    const { token } = judge.submit(sub({ tests: [
      { input: '', expectedOutput: 'a\nb', compare: 'UNORDERED_LINES' },
      { input: '', expectedOutput: '', compare: 'NONE' },
      { input: '', expectedOutput: 'a\nb', compare: 'EXACT' },
    ] }));
    expect((await waitDone(token)).tests.map((t) => t.verdict)).toEqual(['ACCEPTED', 'ACCEPTED', 'WRONG_ANSWER']);
  });

  it('reports a compile error once in compileOutput and on every test', async () => {
    execute.mockResolvedValue({ passed: false, output: '', compilationError: 'Main.java:3: error: ; expected', executionTime: 0, memoryUsed: 0 });
    const { token } = judge.submit(sub({ language: 'java', source: 'class Main {}', tests: [{ input: '', expectedOutput: '' }, { input: '', expectedOutput: '' }] }));
    const r = await waitDone(token);
    expect(r.compileOutput).toContain('expected');
    expect(r.tests.every((t) => t.verdict === 'COMPILE_ERROR')).toBe(true);
  });

  it('maps a killed program to TIME_LIMIT and a crash to RUNTIME_ERROR', async () => {
    execute
      .mockResolvedValueOnce({ passed: false, output: '', error: 'Time limit exceeded', executionTime: 3000, memoryUsed: 0, killed: true })
      .mockResolvedValueOnce({ passed: false, output: '', error: 'ZeroDivisionError', executionTime: 20, memoryUsed: 0, killed: false, exitCode: 1 });
    const { token } = judge.submit(sub({ tests: [{ input: '', expectedOutput: '' }, { input: '', expectedOutput: '' }] }));
    const r = await waitDone(token);
    expect(r.tests.map((t) => t.verdict).sort()).toEqual(['RUNTIME_ERROR', 'TIME_LIMIT']);
  });

  it('holds scripted languages to the CPU limit Interview Pilot asked for', async () => {
    execute.mockResolvedValue(ok('5', { timing: { runMs: 2500 } }));
    const { token } = judge.submit(sub({ limits: { cpuMs: 2000, memoryMb: 256 } }));
    expect((await waitDone(token)).tests[0].verdict).toBe('TIME_LIMIT');
  });

  it('says JUDGE_ERROR, not WRONG_ANSWER, when the sandbox is busy', async () => {
    execute.mockResolvedValue({ passed: false, output: '', error: 'busy', executionTime: 0, memoryUsed: 0, graderUnavailable: true });
    const { token } = judge.submit(sub());
    expect((await waitDone(token)).tests[0].verdict).toBe('JUDGE_ERROR');
  });

  it('puts a SQL prelude before the query in the same program', async () => {
    execute.mockResolvedValue(ok('1|a'));
    const { token } = judge.submit(sub({ language: 'sql', source: 'SELECT * FROM t;', tests: [{ input: '', expectedOutput: '1|a', prelude: 'CREATE TABLE t(a,b); INSERT INTO t VALUES(1,\'a\');' }] }));
    await waitDone(token);
    expect(execute.mock.calls[0][0].code).toBe("CREATE TABLE t(a,b); INSERT INTO t VALUES(1,'a');\nSELECT * FROM t;");
  });

  it('answers 404 for an unknown token', () => {
    expect(() => judge.status('nope')).toThrow(/Unknown/);
  });
});

describe('sameOutput', () => {
  it('ignores line endings and trailing whitespace, nothing else', () => {
    expect(judge.sameOutput('1 2\n3', '1 2  \r\n3\n\n')).toBe(true);
    expect(judge.sameOutput('1 2\n3', '1  2\n3')).toBe(false);
  });
});

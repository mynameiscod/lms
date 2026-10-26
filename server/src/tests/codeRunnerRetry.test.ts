import { isRunnerUnreachable, RUNNER_ATTEMPTS, RUNNER_BUSY_MESSAGE } from '../services/codeRunnerService';

describe('when the code runner cannot be reached', () => {
  it('recognises a request that never arrived, and nothing else', () => {
    for (const e of ['fetch failed', 'ConnectTimeoutError: Connect Timeout Error', 'read ECONNRESET', 'connect ECONNREFUSED 172.18.0.5:2000', 'getaddrinfo EAI_AGAIN piston', 'socket hang up']) {
      expect([e, isRunnerUnreachable(e)]).toEqual([e, true]);
    }
    for (const e of ['Compilation failed', 'Time limit exceeded', 'Runtime error: NullPointerException', 'Wrong answer', '', undefined]) {
      expect([String(e), isRunnerUnreachable(e as any)]).toEqual([String(e), false]);
    }
  });

  it('tries a few times, then tells the student plainly that nothing ran', () => {
    expect(RUNNER_ATTEMPTS).toBeGreaterThanOrEqual(2);
    expect(RUNNER_BUSY_MESSAGE).toMatch(/did not run/);
    expect(RUNNER_BUSY_MESSAGE).toMatch(/not a problem with your code/);
    expect(RUNNER_BUSY_MESSAGE).not.toMatch(/fetch failed/);
  });
});

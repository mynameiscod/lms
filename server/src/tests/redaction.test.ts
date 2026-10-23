/**
 * Nothing secret, and no personal detail in clear, reaches a log line: the redactor itself, the
 * logger that every server log goes through, and the request id that ties logs to tickets.
 */
import { redact, redactText, REDACTED } from '../utils/redact';
import { logger } from '../utils/logger';
import { requestId } from '../middleware/requestId';

describe('redact', () => {
  it('replaces secrets at any depth, whatever the key casing', () => {
    const out: any = redact({
      password: 'hunter2',
      user: { Password: 'x', profile: { apiKey: 'sk-live', 'X-Api-Key': 'k' } },
      headers: { Authorization: 'Bearer abc.def', cookie: 'sid=1' },
      list: [{ token: 't1' }, { refresh_token: 'r' }],
      otp: '123456',
    });
    expect(out.password).toBe(REDACTED);
    expect(out.user.Password).toBe(REDACTED);
    expect(out.user.profile.apiKey).toBe(REDACTED);
    expect(out.user.profile['X-Api-Key']).toBe(REDACTED);
    expect(out.headers.Authorization).toBe(REDACTED);
    expect(out.headers.cookie).toBe(REDACTED);
    expect(out.list[0].token).toBe(REDACTED);
    expect(out.otp).toBe(REDACTED);
  });

  it('masks personal details but keeps them tellable apart', () => {
    const out: any = redact({ email: 'priya.sharma@college.edu', mobile: '9876543210', name: 'Priya' });
    expect(out.email).toBe('p***@c***');
    expect(out.mobile).toBe('******10');
    expect(out.name).toBe('Priya');
  });

  it('scrubs secrets and contact details inside free text', () => {
    const s = redactText('call 9876543210 or mail a.b@x.io with Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEifQ.sig and key sk-proj-abcdefghijklmnopqrstu');
    expect(s).not.toMatch(/9876543210|a\.b@x\.io|eyJhbGci|sk-proj/);
    expect(redactText('/reset?token=abc123&x=1')).toBe(`/reset?token=${REDACTED}&x=1`);
  });

  it('leaves ids, timestamps and ordinary numbers alone', () => {
    expect(redactText('user 6aa9390649fae12e6a01264e at 1791547726590 scored 42')).toBe('user 6aa9390649fae12e6a01264e at 1791547726590 scored 42');
  });

  it('does not mutate the input and survives cycles', () => {
    const input: any = { password: 'p', nested: { a: 1 } };
    input.self = input;
    const out: any = redact(input);
    expect(input.password).toBe('p');
    expect(out.self).toBe('[Circular]');
  });

  it('reduces an Error to a safe name and message', () => {
    const out: any = redact({ err: new Error('failed for x@y.com') });
    expect(out.err).toEqual({ name: 'Error', message: 'failed for x***@y***' });
  });
});

describe('logger', () => {
  it('writes redacted lines', () => {
    const spy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      logger.warn('login failed for a.b@x.io', { reqBody: { email: 'a.b@x.io', password: 'hunter2' }, headers: { authorization: 'Bearer t' } });
      const line = String(spy.mock.calls.map(c => c[0]).find(l => String(l).includes('login failed')));
      expect(line).not.toMatch(/hunter2|a\.b@x\.io|Bearer t/);
      expect(line).toContain(REDACTED);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('request id', () => {
  const run = (header?: string) => {
    const req: any = { headers: header ? { 'x-request-id': header } : {} };
    const headers: Record<string, string> = {};
    const res: any = { setHeader: (k: string, v: string) => { headers[k] = v; } };
    const next = jest.fn();
    requestId(req, res, next);
    return { req, headers, next };
  };

  it('issues an id, exposes it and calls on', () => {
    const { req, headers, next } = run();
    expect(req.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(headers['X-Request-Id']).toBe(req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('keeps a well-formed incoming id and replaces anything else', () => {
    expect(run('abc-12345-def').req.requestId).toBe('abc-12345-def');
    expect(run('bad id\ninjected').req.requestId).not.toContain('injected');
    expect(run('x').req.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

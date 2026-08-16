/**
 * Rate limiting for the endpoints where a retry costs real money.
 *
 * The product had none. Entitlement gates, the one-live-interview lock and `maxAttempts`
 * bounded some of it, but nothing stopped a script hammering resume analysis or a bored
 * member restarting interviews all afternoon — each call a paid AI generation.
 *
 * What it is NOT for matters too: it does not make a double-clicked button safe. That is
 * the job of the state guards and idempotency keys the modules already have, and a limiter
 * is a poor substitute because it would refuse the second click instead of returning the
 * first click's result.
 */

import fs from 'fs';
import path from 'path';
import {
  consume, rateLimit, rateLimitKey, POLICIES, __resetRateLimits,
} from '../middleware/rateLimit';

const req = (over: any = {}): any => ({ ip: '1.2.3.4', headers: {}, ...over });

const run = (name: any, r: any) => {
  const res: any = { statusCode: 200, headers: {}, body: null };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  let passed = false;
  rateLimit(name)(r, res, () => { passed = true; });
  return { res, passed };
};

beforeEach(__resetRateLimits);

describe('counting', () => {
  it('allows normal use right up to the limit', () => {
    const policy = { max: 5, windowMs: 60_000, message: 'slow down' };
    for (let i = 0; i < 5; i += 1) {
      expect(consume('k', policy).allowed).toBe(true);
    }
  });

  it('refuses the request after the limit, and says when to come back', () => {
    const policy = { max: 2, windowMs: 60_000, message: 'slow down' };
    consume('k', policy); consume('k', policy);

    const third = consume('k', policy);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSec).toBeGreaterThan(0);
  });

  it('lets the caller back in once the window has passed', () => {
    const policy = { max: 1, windowMs: 60_000, message: 'slow down' };
    const t0 = 1_000_000;
    expect(consume('k', policy, t0).allowed).toBe(true);
    expect(consume('k', policy, t0 + 1_000).allowed).toBe(false);
    expect(consume('k', policy, t0 + 61_000).allowed).toBe(true);
  });
});

describe('who gets counted', () => {
  it('counts an authenticated member by user, not by address', () => {
    // A college behind one NAT would otherwise lock out everybody the moment one student
    // hit a limit.
    const a = rateLimitKey(req({ user: { id: 'stu-a' } }), 'aiGenerate');
    const b = rateLimitKey(req({ user: { id: 'stu-b' } }), 'aiGenerate');

    expect(a).not.toBe(b);
    expect(a).toContain('u:stu-a');
  });

  it('falls back to the address only when there is no user', () => {
    expect(rateLimitKey(req(), 'signup')).toContain('ip:1.2.3.4');
  });

  it('keeps one member’s exhausted allowance from touching another', () => {
    const policy = POLICIES.aiGenerate;
    const a = rateLimitKey(req({ user: { id: 'stu-a' } }), 'aiGenerate');
    const b = rateLimitKey(req({ user: { id: 'stu-b' } }), 'aiGenerate');

    for (let i = 0; i < policy.max; i += 1) consume(a, policy);

    expect(consume(a, policy).allowed).toBe(false);
    expect(consume(b, policy).allowed).toBe(true);
  });

  it('keeps policies apart, so exhausting one does not close another', () => {
    const r = req({ user: { id: 'stu-a' } });
    for (let i = 0; i < POLICIES.aiGenerate.max; i += 1) consume(rateLimitKey(r, 'aiGenerate'), POLICIES.aiGenerate);

    expect(consume(rateLimitKey(r, 'aiGenerate'), POLICIES.aiGenerate).allowed).toBe(false);
    // Their interview allowance is untouched.
    expect(consume(rateLimitKey(r, 'aiInterview'), POLICIES.aiInterview).allowed).toBe(true);
  });
});

describe('the middleware', () => {
  it('passes a request through under the limit', () => {
    const { passed, res } = run('signup', req());
    expect(passed).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('answers 429 with Retry-After once exhausted', () => {
    const r = req();
    for (let i = 0; i < POLICIES.signup.max; i += 1) run('signup', r);

    const { passed, res } = run('signup', r);

    expect(passed).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(res.headers['Retry-After']).toBeTruthy();
  });

  it('tells the person what to do without describing the policy', () => {
    const r = req();
    for (let i = 0; i < POLICIES.signup.max; i += 1) run('signup', r);
    const { res } = run('signup', r);

    expect(res.body.message).toMatch(/try again/i);
    // An attacker should learn nothing about the limit from being refused by it.
    expect(res.body.message).not.toMatch(/\d+\s*(requests|per|\/)/i);
    expect(JSON.stringify(res.body)).not.toContain(String(POLICIES.signup.max));
  });
});

describe('what is protected, and what deliberately is not', () => {
  const routes = (f: string) =>
    fs.readFileSync(path.join(__dirname, '..', 'routes', f), 'utf8');

  it('covers the public account and code endpoints', () => {
    const s = routes('publicPassportRoutes.ts');
    for (const r of ['/signup', '/verify', '/resend', '/login-otp']) {
      expect(s).toMatch(new RegExp(`'${r}',\\s*rateLimit\\(`));
    }
  });

  it('covers every path that spends money on an AI call', () => {
    const s = routes('passportRoutes.ts');
    for (const r of [
      '/me/assessment/personalized/start',
      '/me/reassessment/start',
      '/interview/start',
      '/interview/:id/turn',
      '/resume/import',
      '/companies/:slug/mock-test/start',
      '/company-admin/:slug/predict',
      '/company-admin/:slug/draft-profile',
    ]) {
      expect(s).toMatch(new RegExp(`'${r.replace(/\//g, '\\/')}',[^\\n]*rateLimit\\(`));
    }
  });

  it('covers payment and redemption', () => {
    const s = routes('passportRoutes.ts');
    expect(s).toMatch(/'\/membership\/order',[^\n]*rateLimit\('payment'\)/);
    expect(s).toMatch(/'\/me\/rewards\/:key\/redeem',[^\n]*rateLimit\('redemption'\)/);
  });

  it('does NOT limit finishing an interview', () => {
    /**
     * That path returns a member their graded result. It is already idempotent behind the
     * finalize claim, and the client polls it while grading completes — refusing it would
     * strand somebody mid-interview to save nothing, because the AI call has already been
     * paid for by then.
     */
    const s = routes('passportRoutes.ts');
    expect(s).toMatch(/'\/interview\/:id\/finish',\s*MEMBER,\s*interview\.finish/);
  });

  it('does NOT limit ordinary dashboard reads', () => {
    const s = routes('passportRoutes.ts');
    // A dashboard that 429s under normal use is a worse outage than the spend it protects.
    const limitedGets = s.split('\n').filter(l => l.includes('router.get(') && l.includes('rateLimit('));
    expect(limitedGets).toEqual([]);
  });
});

describe('the policies themselves', () => {
  it('are generous enough for a real member', () => {
    // The limit exists for the request that wants three hundred, not the one that wants
    // three.
    expect(POLICIES.aiInterview.max).toBeGreaterThanOrEqual(10);
    expect(POLICIES.aiGenerate.max).toBeGreaterThanOrEqual(10);
  });

  it('are all bounded windows with a human message', () => {
    for (const [name, p] of Object.entries(POLICIES)) {
      expect(p.max).toBeGreaterThan(0);
      expect(p.windowMs).toBeGreaterThan(0);
      expect(p.message.length).toBeGreaterThan(15);
      expect(name).toBeTruthy();
    }
  });
});

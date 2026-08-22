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
  consume, rateLimit, rateLimitKey, humanWait, POLICIES, __resetRateLimits,
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


/**
 * Counting sign-ups by address was the bug that made this limiter look like an outage.
 *
 * A college computer lab, a hostel, an office - all one public IP. Five registrations from
 * that address and the sixth student was told to come back in an hour, having done nothing
 * wrong and with no way to tell that a classmate had used up the allowance. Worse, nginx
 * sits in front in production and `trust proxy` was unset, so `req.ip` was the proxy for
 * every request on earth and the whole internet shared ONE bucket.
 *
 * These pin the property that fixes it: the limit follows the mobile number being
 * registered, which is the thing the sign-up actually spends money on.
 */
describe('sign-up is counted per mobile number, not per address', () => {
  const from = (ip: string, mobile: string) => req({ ip, body: { mobile } });

  it('lets a whole lecture hall register from one address', () => {
    // Far more than the old per-address allowance, all on the same network.
    for (let i = 0; i < POLICIES.signup.max * 3; i += 1) {
      const mobile = `98765${String(10000 + i).slice(-5)}`;
      expect(run('signup', from('10.0.0.1', mobile)).passed).toBe(true);
    }
  });

  it('still bounds one number being pushed through over and over', () => {
    const r = from('10.0.0.1', '9876543210');
    for (let i = 0; i < POLICIES.signup.max; i += 1) expect(run('signup', r).passed).toBe(true);
    expect(run('signup', r).passed).toBe(false);
  });

  it('does not let one exhausted number block a different one', () => {
    const mine = from('10.0.0.1', '9876543210');
    for (let i = 0; i < POLICIES.signup.max; i += 1) run('signup', mine);
    expect(run('signup', mine).passed).toBe(false);
    expect(run('signup', from('10.0.0.1', '9000000001')).passed).toBe(true);
  });

  it('identifies a number however it was typed', () => {
    const forms = ['9876543210', '919876543210', '+91-98765 43210'];
    const keys = forms.map(m => rateLimitKey(from('10.0.0.1', m), 'signup'));
    expect(new Set(keys).size).toBe(1);
  });

  it('falls back to the address when the request names no usable number', () => {
    // A malformed or hostile request must still be bounded by something.
    expect(rateLimitKey(from('10.0.0.9', 'nonsense'), 'signup')).toContain('ip:10.0.0.9');
    expect(rateLimitKey(req({ ip: '10.0.0.9' }), 'signup')).toContain('ip:10.0.0.9');
  });

  it('keeps a broad per-address backstop so a script cannot walk a list of numbers', () => {
    // The per-number limit cannot see a caller trying a thousand DIFFERENT numbers.
    expect(POLICIES.signupBurst.max).toBeGreaterThan(POLICIES.signup.max);
    const r = req({ ip: '10.0.0.2', body: { mobile: '9876543210' } });
    for (let i = 0; i < POLICIES.signupBurst.max; i += 1) run('signupBurst', r);
    expect(run('signupBurst', r).passed).toBe(false);
  });
});

describe('code requests are counted per account, not per address', () => {
  it('does not let one member guessing codes lock out everyone on their network', () => {
    const mine = req({ ip: '10.0.0.1', body: { token: 'user-a' } });
    for (let i = 0; i < POLICIES.otp.max; i += 1) run('otp', mine);
    expect(run('otp', mine).passed).toBe(false);

    expect(run('otp', req({ ip: '10.0.0.1', body: { token: 'user-b' } })).passed).toBe(true);
  });

  it('still bounds guessing at one account', () => {
    const r = req({ ip: '10.0.0.1', body: { token: 'user-a' } });
    for (let i = 0; i < POLICIES.otp.max; i += 1) expect(run('otp', r).passed).toBe(true);
    expect(run('otp', r).passed).toBe(false);
  });
});

/**
 * Being refused without being told for how long is the part that reads as broken: there is
 * nothing to do but keep clicking. Retry-After already carries the number for machines.
 */
describe('the refusal says how long to wait', () => {
  it('puts the wait in the message and in the body', () => {
    const r = req({ ip: '10.0.0.1', body: { mobile: '9876543210' } });
    for (let i = 0; i < POLICIES.signup.max; i += 1) run('signup', r);
    const { res } = run('signup', r);

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toMatch(/try again in .+(second|minute|hour)/i);
    expect(res.body.retryAfterSec).toBeGreaterThan(0);
    expect(res.headers['Retry-After']).toBe(String(res.body.retryAfterSec));
  });

  it('says it the way a person would', () => {
    expect(humanWait(8)).toBe('10 seconds');
    expect(humanWait(45)).toBe('50 seconds');
    expect(humanWait(120)).toBe('2 minutes');
    expect(humanWait(60 * 60)).toBe('1 hour');
    expect(humanWait(3 * 60 * 60)).toBe('3 hours');
  });
});

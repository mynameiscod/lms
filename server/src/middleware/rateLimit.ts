import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting for the endpoints where a retry costs real money.
 *
 * WHY IN-MEMORY, AND NO NEW DEPENDENCY. This deployment runs ONE active server process at a
 * time — blue/green, with the idle slot serving nothing — so a per-process counter is a
 * per-deployment counter. `express-rate-limit` plus a Redis store would buy correctness
 * across instances we do not run, and a dependency that must then be kept patched. If the
 * product is ever scaled out horizontally this needs a shared store, and the note in
 * `RateLimitPolicy` says so rather than leaving it to be discovered.
 *
 * WHAT IT IS FOR, AND WHAT IT IS NOT. This bounds ABUSE — a script hammering resume
 * analysis, a bored member restarting interviews, somebody enumerating OTPs. It is not what
 * stops a double-clicked button from doing the work twice: that is the job of the state
 * guards and idempotency keys the modules already have, and a rate limiter is a poor
 * substitute because it would refuse the second click rather than returning the first
 * click's result.
 *
 * ORDINARY READS ARE NOT LIMITED. A dashboard that 429s under normal use is a worse outage
 * than the spend it was protecting.
 */

export interface RateLimitPolicy {
  /** Requests allowed inside the window. */
  max: number;
  windowMs: number;
  /** What the caller is told. Written for the person, not the log. */
  message: string;
}

/**
 * Every policy in one place, so the limits can be read and reasoned about together rather
 * than discovered one route at a time.
 *
 * The numbers are deliberately generous. A member who genuinely wants three mock interviews
 * this hour should get them; the limit exists for the case that wants three hundred.
 */
export const POLICIES = {
  /** Public, unauthenticated, and the door to account creation. */
  signup: {
    max: 5, windowMs: 60 * 60_000,
    message: 'Too many sign-up attempts. Please try again in an hour.',
  },
  /** Each send costs a WhatsApp message; each verify is a guess at a 6-digit code. */
  otp: {
    max: 10, windowMs: 60 * 60_000,
    message: 'Too many code requests. Please wait a few minutes and try again.',
  },
  /** Every call here is a paid AI generation. */
  aiGenerate: {
    max: 12, windowMs: 60 * 60_000,
    message: 'You have made a lot of requests just now. Please try again shortly.',
  },
  /** Interview start and evaluation — expensive, and already state-guarded. */
  aiInterview: {
    max: 20, windowMs: 60 * 60_000,
    message: 'Too many interview requests. Please try again shortly.',
  },
  /** Admin AI drafting. Rarer, but a loop here bills the tenant. */
  adminAi: {
    max: 30, windowMs: 60 * 60_000,
    message: 'Too many generation requests. Please try again shortly.',
  },
  /** Money moves. Bounded so a stuck client cannot open orders indefinitely. */
  payment: {
    max: 20, windowMs: 60 * 60_000,
    message: 'Too many payment attempts. Please wait a moment and try again.',
  },
  redemption: {
    max: 20, windowMs: 60 * 60_000,
    message: 'Too many redemption attempts. Please wait a moment and try again.',
  },
} satisfies Record<string, RateLimitPolicy>;

export type PolicyName = keyof typeof POLICIES;

interface Bucket { count: number; resetAt: number }

/**
 * The counters.
 *
 * Swept lazily on read rather than on a timer: a timer would keep the process awake and
 * would have to be torn down in tests, and an entry nobody asks about again costs one map
 * slot until the next sweep touches it.
 */
const buckets = new Map<string, Bucket>();
let lastSweep = 0;
const SWEEP_EVERY_MS = 5 * 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_EVERY_MS) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/**
 * Who is being counted.
 *
 * An authenticated user is counted BY USER, so one member exhausting their allowance cannot
 * lock out everybody behind the same office NAT — which is the normal case for a college.
 * Only unauthenticated traffic falls back to the address, where there is nothing else.
 */
export function rateLimitKey(req: Request, name: PolicyName): string {
  const userId = (req as any).user?.id;
  const who = userId ? `u:${userId}` : `ip:${req.ip || 'unknown'}`;
  return `${name}:${who}`;
}

/** Test seam. Nothing in production calls this. */
export const __resetRateLimits = () => { buckets.clear(); lastSweep = 0; };

export interface ConsumeResult { allowed: boolean; remaining: number; retryAfterSec: number }

/** The decision, without Express — so it can be reasoned about and tested directly. */
export function consume(key: string, policy: RateLimitPolicy, now = Date.now()): ConsumeResult {
  sweep(now);
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowMs });
    return { allowed: true, remaining: policy.max - 1, retryAfterSec: 0 };
  }
  if (b.count >= policy.max) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { allowed: true, remaining: policy.max - b.count, retryAfterSec: 0 };
}

/**
 * Express middleware for a named policy.
 *
 * 429 with `Retry-After`, so a well-behaved client backs off rather than tightening its
 * loop. The message names no limit and no counter — an attacker learns nothing about the
 * policy from being refused by it.
 */
export const rateLimit = (name: PolicyName) => (req: Request, res: Response, next: NextFunction) => {
  const policy = POLICIES[name];
  const result = consume(rateLimitKey(req, name), policy);

  if (!result.allowed) {
    res.setHeader('Retry-After', String(result.retryAfterSec));
    return res.status(429).json({ success: false, message: policy.message });
  }
  next();
};

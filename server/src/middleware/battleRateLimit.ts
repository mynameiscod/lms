/**
 * Abuse brake for the public battle exam endpoints.
 *
 * Two decisions worth stating, because the obvious implementation is wrong here:
 *
 * 1. Keyed by EXAM TOKEN, not IP. College labs sit behind a single NAT address, so
 *    hundreds of legitimate candidates share one IP during a battle. An IP-based limit
 *    would lock an entire college out of a live exam — far worse than the load it saves.
 *    The token identifies one candidate, which is the thing actually worth limiting.
 *
 * 2. Generous, and it fails OPEN. This exists to stop a script hammering an endpoint
 *    thousands of times a second, not to police normal use. Anything ambiguous is
 *    allowed through: during a timed exam, wrongly blocking a real candidate costs them
 *    their attempt, while wrongly allowing one costs a database query.
 *
 * Counters are per-process, so under clustering the effective ceiling is multiplied by
 * the worker count. That is fine for a coarse brake; it is not a quota system.
 */

import { Request, Response, NextFunction } from 'express';

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

// Sweep expired buckets so a battle with 100k tokens doesn't hold them all forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}, 5 * WINDOW_MS).unref();

/**
 * @param max requests allowed per token per minute
 * @param name label used in the log line when something is actually throttled
 */
export function battleRateLimit(max: number, name: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = String(req.params?.token || '').trim();
    if (!token) return next();            // nothing to key on → let the handler decide

    const now = Date.now();
    let b = buckets.get(token);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(token, b);
    }
    b.count++;

    if (b.count > max) {
      // Logged once per window per token, so the log itself can't become the flood.
      if (b.count === max + 1) {
        console.warn(`[BATTLE-RL] ${name}: token ${token.slice(0, 8)}… exceeded ${max}/min`);
      }
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      return res.status(429).json({
        message: 'Too many requests — please wait a moment and try again.',
        code: 'RATE_LIMITED',
      });
    }
    next();
  };
}

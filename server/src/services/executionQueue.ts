import * as settings from './settingsService';

/**
 * A hard cap on how many programs run at once.
 *
 * WHY THIS EXISTS, measured on production: one Java execution takes ~7 seconds and
 * saturates a core, because every run pays for a fresh javac. Six concurrent runs on this
 * 8-core box drove load from 1.2 to 7.6 and ALL SIX were SIGKILLed at ~32s — past Piston's
 * 20s limit. Not one of them was a bad program.
 *
 * Without a cap the failure mode is catastrophic and self-inflicted: the more students
 * press Run, the slower every execution gets, the more of them cross the kill threshold,
 * and a busy class turns into a total outage. With a cap, the same load becomes a short
 * queue — everyone is a little slower, nobody is told their correct code has an infinite
 * loop.
 *
 * This does not create capacity. It converts a cliff into a slope, which is the difference
 * between a demo that feels slow and a demo that is broken.
 */

type Waiter = { resolve: () => void; reject: (e: Error) => void; queuedAt: number; timer: NodeJS.Timeout };

/**
 * Two pools, because the two kinds of execution cost wildly different amounts.
 *
 * Measured on production, same box, same 20-concurrent test:
 *   Java   — 7,000ms single, 8/20 correct in 52s
 *   Python —   203ms single, 20/20 correct in 6s
 *
 * A compiled run is ~35x a scripted one, because it pays for a fresh compiler every time.
 * Holding Python to Java's cap throttles it for no reason: twenty concurrent Python runs
 * do not trouble this box at all.
 */
type Pool = { active: number; waiting: Waiter[] };
const pools: Record<'heavy' | 'light', Pool> = {
  heavy: { active: 0, waiting: [] },
  light: { active: 0, waiting: [] },
};

/** Languages that invoke a compiler on every run. */
const HEAVY = new Set(['java', 'cpp', 'c', 'csharp', 'go', 'rust', 'kotlin', 'scala']);
export const poolFor = (language?: string): 'heavy' | 'light' =>
  (HEAVY.has(String(language || '').toLowerCase()) ? 'heavy' : 'light');

/**
 * Concurrency cap. Settable from Platform Settings so it can be tuned without a deploy.
 *
 * TWO, not four. Measured on this 8-core box: at a cap of 4, twenty concurrent Java runs
 * produced ZERO correct results — each execution needs a full core for ~7s of javac, so
 * four at once still stretched past the 30s kill. The honest ceiling here is about one
 * concurrent Java run per two cores, and the box shares those cores with five other
 * services.
 *
 * Raise it only after adding cores, and re-run the load test before believing it.
 */
const limit = (kind: 'heavy' | 'light') => kind === 'heavy'
  ? Math.max(1, settings.getNum('CODE_EXEC_CONCURRENCY', 2))
  : Math.max(1, settings.getNum('CODE_EXEC_CONCURRENCY_LIGHT', 12));
/** How long someone may wait before we admit defeat honestly. */
const maxWaitMs = () => Math.max(5_000, settings.getNum('CODE_EXEC_MAX_WAIT_MS', 45_000));

export interface QueueStats { heavy: Pool; light: Pool }
export const queueStats = () => ({
  heavy: { active: pools.heavy.active, waiting: pools.heavy.waiting.length, limit: limit('heavy') },
  light: { active: pools.light.active, waiting: pools.light.waiting.length, limit: limit('light') },
});

function releaseOne(kind: 'heavy' | 'light'): void {
  const pool = pools[kind];
  const next = pool.waiting.shift();
  if (!next) { pool.active--; return; }
  clearTimeout(next.timer);
  // `active` stays as it is — one slot passes straight from the finisher to the waiter.
  next.resolve();
}

/**
 * Run `fn` when a slot is free.
 *
 * Rejects rather than queueing forever: a student staring at a spinner for two minutes is
 * worse served than one told the server is busy. The caller turns that into a message
 * that says so plainly.
 */
export async function withExecutionSlot<T>(fn: () => Promise<T>, language?: string): Promise<T> {
  const waitedFrom = Date.now();
  const kind = poolFor(language);
  const pool = pools[kind];

  if (pool.active >= limit(kind)) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = pool.waiting.findIndex(w => w.timer === timer);
        if (i >= 0) pool.waiting.splice(i, 1);
        reject(new Error('QUEUE_TIMEOUT'));
      }, maxWaitMs());
      pool.waiting.push({ resolve, reject, queuedAt: Date.now(), timer });
    });
  } else {
    pool.active++;
  }

  const queuedMs = Date.now() - waitedFrom;
  try {
    const out = await fn();
    // Attached so the caller can show queue wait separately from run time — without it,
    // a slow queue is indistinguishable from slow code, which is how this became
    // invisible in the first place.
    if (out && typeof out === 'object') (out as any).queuedMs = queuedMs;
    return out;
  } finally {
    releaseOne(kind);
  }
}

/** True when the failure was the queue, not the program. */
export const isQueueTimeout = (e: any): boolean => e?.message === 'QUEUE_TIMEOUT';

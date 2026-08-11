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

let active = 0;
const waiting: Waiter[] = [];

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
const limit = () => Math.max(1, settings.getNum('CODE_EXEC_CONCURRENCY', 2));
/** How long someone may wait before we admit defeat honestly. */
const maxWaitMs = () => Math.max(5_000, settings.getNum('CODE_EXEC_MAX_WAIT_MS', 45_000));

export interface QueueStats { active: number; waiting: number; limit: number }
export const queueStats = (): QueueStats => ({ active, waiting: waiting.length, limit: limit() });

function releaseOne(): void {
  const next = waiting.shift();
  if (!next) { active--; return; }
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
export async function withExecutionSlot<T>(fn: () => Promise<T>): Promise<T> {
  const waitedFrom = Date.now();

  if (active >= limit()) {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const i = waiting.findIndex(w => w.timer === timer);
        if (i >= 0) waiting.splice(i, 1);
        reject(new Error('QUEUE_TIMEOUT'));
      }, maxWaitMs());
      waiting.push({ resolve, reject, queuedAt: Date.now(), timer });
    });
  } else {
    active++;
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
    releaseOne();
  }
}

/** True when the failure was the queue, not the program. */
export const isQueueTimeout = (e: any): boolean => e?.message === 'QUEUE_TIMEOUT';

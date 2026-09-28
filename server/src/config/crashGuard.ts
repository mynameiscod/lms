/**
 * Keep one bad background job from ending everybody's exam.
 *
 * On 22 September the IMAP poller's socket timed out. ImapFlow emits that as an
 * EventEmitter 'error'; nothing was listening, so Node turned it into an uncaught
 * exception and the default handler killed the process. Every candidate writing at
 * that moment lost their session, and the container crash-looped because the poller
 * timed out again on each restart.
 *
 * The usual advice -- "an uncaught exception means the process is corrupt, exit
 * immediately" -- is right for a synchronous fault in request-handling code. It is the
 * wrong trade here: the fault was in a poller that the exam does not depend on, and
 * exiting cost an exam to protect a mailbox sync. So the rule is:
 *
 *   - Log every one loudly, with enough context to find it the next morning.
 *   - Stay up, because staying up is almost always better for the candidates.
 *   - Unless the same failure is repeating, which means it is NOT an isolated blip and
 *     the process genuinely is wedged -- then exit and let Docker's restart policy
 *     give us a clean one.
 *   - Unless it happened during boot, before the server is listening, in which case
 *     there is nothing to protect and a fast, visible failure is what a deploy needs.
 *
 * This is a backstop, not a licence. An error reaching here is still a bug: the right
 * fix is an 'error' listener on the emitter that produced it.
 */

/** Flipped once the HTTP server is actually accepting connections. */
let serving = false;

/** Timestamps of recent uncaught exceptions, newest last. */
const recent: number[] = [];

/** More than this many uncaught exceptions inside the window means "wedged", not "blip". */
const STORM_COUNT = 5;
const STORM_WINDOW_MS = 60_000;

function describe(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code;
    return `${err.name}${code ? ` [${code}]` : ''}: ${err.message}\n${err.stack || '(no stack)'}`;
  }
  try {
    return `non-Error thrown: ${JSON.stringify(err)}`;
  } catch {
    return `non-Error thrown: ${String(err)}`;
  }
}

/** True once this exception makes the count inside the window exceed STORM_COUNT. */
function isStorm(now: number): boolean {
  recent.push(now);
  while (recent.length && now - recent[0] > STORM_WINDOW_MS) recent.shift();
  return recent.length >= STORM_COUNT;
}

export function markServing(): void {
  serving = true;
}

export function installCrashGuard(): void {
  process.on('uncaughtException', (err, origin) => {
    const now = Date.now();
    console.error(
      `\n[CRASH-GUARD] uncaughtException (origin=${origin}) at ${new Date(now).toISOString()}\n` +
        describe(err) +
        '\n[CRASH-GUARD] This is a BUG. Add an error listener to whatever emitted it.\n'
    );

    if (!serving) {
      // Nothing is depending on this process yet. A deploy that dies visibly beats one
      // that starts half-initialised and fails later under load.
      console.error('[CRASH-GUARD] Thrown before the server was listening — exiting so the deploy fails loudly.');
      process.exit(1);
    }

    if (isStorm(now)) {
      console.error(
        `[CRASH-GUARD] ${recent.length} uncaught exceptions in the last ${STORM_WINDOW_MS / 1000}s — ` +
          'this process is not recovering. Exiting so Docker restarts it.'
      );
      process.exit(1);
    }

    console.error('[CRASH-GUARD] Staying up. Requests in flight are unaffected.');
  });

  process.on('unhandledRejection', (reason, promise) => {
    // A rejected promise nobody awaited is a leak, not a corruption: the rest of the
    // process is untouched. Never exit for one.
    console.error(
      `\n[CRASH-GUARD] unhandledRejection at ${new Date().toISOString()}\n` +
        describe(reason) +
        `\n[CRASH-GUARD] promise: ${String(promise)}\n`
    );
  });

  // Node warns about these and then forgets. A leaked listener is how a long-running
  // poller ends up firing its handler hundreds of times per event.
  process.on('warning', (warn) => {
    if (warn.name === 'MaxListenersExceededWarning') {
      console.warn(`[CRASH-GUARD] ${warn.name}: ${warn.message}\n${warn.stack || ''}`);
    }
  });
}

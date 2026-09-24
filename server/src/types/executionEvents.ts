/* ============================================================================================
 * THIS FILE IS DUPLICATED, BYTE FOR BYTE, IN TWO PLACES:
 *
 *     server/src/types/executionEvents.ts
 *     client/src/types/executionEvents.ts
 *
 * Edit one, run `node scripts/check-event-schema-sync.js --fix`, commit both. CI fails the
 * build if they differ, so they cannot drift silently.
 *
 * ── WHY IT IS DUPLICATED AND NOT IN shared/ ─────────────────────────────────────────────────
 *
 * The Phase 0 design said this belonged in the `shared/` workspace. That was checked on
 * 24 September 2026 and `shared/` is not a working package:
 *
 *   - its `main` points at `index.ts`, a file that does not exist
 *   - it emits no `.d.ts`, so a TypeScript consumer gets no types from it anyway
 *   - neither client nor server declares it as a dependency
 *   - 138 of its 144 tracked files are committed node_modules
 *   - and decisively: the Dockerfile never copies `shared/`. Both build stages run a
 *     standalone `npm install` from `client/` and `server/`, so `@lms-saas/shared` does not
 *     exist in either image. An import of it would fail the DEPLOY, not the test run.
 *
 * Making it work means changing the Dockerfile — the file that builds what ships — to unlock
 * sharing one file of types. TypeScript types evaporate at compile time, so the only real
 * runtime artefacts here are the sentinel string and a handful of constants. Duplication plus a
 * CI equality check buys nearly all of the safety for none of the deploy risk.
 *
 * `shared/` should be fixed or deleted on its own merits, not on the visualizer's schedule.
 * ============================================================================================
 */

/* ── The wire format ────────────────────────────────────────────────────────────────────────
 *
 * An instrumented program writes JSONL to stdout, one event per line, each line prefixed with
 * this sentinel:
 *
 *   ##CBTRACE##{"sequence":14,"eventType":"CONDITION_EVALUATE","line":7,...}
 *
 * The sentinel is not decoration. A student program that prints something JSON-shaped — and
 * printing JSON is a common exercise — must not be parsed as a trace event. Only lines that
 * start with exactly this prefix are trace; everything else is the student's own output.
 *
 * It must also be a string a student is vanishingly unlikely to print by accident, which is
 * why it is not something readable like "TRACE:".
 */
export const TRACE_SENTINEL = '##CBTRACE##';

/* ── Event types ────────────────────────────────────────────────────────────────────────────
 *
 * Plain `as const` objects rather than `enum`, deliberately: an enum emits a runtime object and
 * a reverse map into both bundles, and `const enum` cannot be used across module boundaries
 * under `isolatedModules`, which Create React App sets. These compile to nothing the bundler
 * cannot shake out.
 *
 * Phase 1 emits only the subset the Java acceptance test needs. The rest are declared now
 * because the renderer switches on this union exhaustively, and adding a member later is a
 * compile error everywhere it is handled — which is exactly the reminder we want.
 */
export const EventType = {
  /** The program began. Carries the source and the language, nothing else. */
  EXECUTION_START: 'EXECUTION_START',
  /** Control reached a line. The unit of stepping. */
  LINE_EXECUTE: 'LINE_EXECUTE',

  /** A variable came into existence, with its declared type where the language has one. */
  VARIABLE_DECLARE: 'VARIABLE_DECLARE',
  /** A variable's value changed. Carries both the old and the new value. */
  VARIABLE_ASSIGN: 'VARIABLE_ASSIGN',

  /** One element of an array was read. Emitted only where it explains a decision. */
  ARRAY_READ: 'ARRAY_READ',
  /** One element of an array was written. This is what animates a sort. */
  ARRAY_WRITE: 'ARRAY_WRITE',

  /**
   * A condition was evaluated, with its OPERANDS RESOLVED — `arr[j] > arr[j+1]` reported as
   * `8 > 3`, not as the source text. Showing a student the expression they already wrote
   * explains nothing; showing them the values it had is the entire point.
   */
  CONDITION_EVALUATE: 'CONDITION_EVALUATE',

  LOOP_ENTER: 'LOOP_ENTER',
  /** One pass of a loop, with the loop variable's value for that pass. */
  LOOP_ITERATION: 'LOOP_ITERATION',
  LOOP_EXIT: 'LOOP_EXIT',

  METHOD_ENTER: 'METHOD_ENTER',
  METHOD_RETURN: 'METHOD_RETURN',

  /** The student's own output, captured in order so the console panel matches the trace. */
  STDOUT: 'STDOUT',
  /** A thrown exception, with the line and the resolved cause where one can be given. */
  EXCEPTION: 'EXCEPTION',

  /** The program ended normally. */
  EXECUTION_COMPLETE: 'EXECUTION_COMPLETE',
  /**
   * The event cap was reached and tracing stopped. The partial trace is STILL RENDERED — a
   * student whose loop ran too long should see how far it got, not an error page. Without this
   * event the renderer cannot tell "the program ended" from "we stopped watching".
   */
  TRACE_LIMIT_EXCEEDED: 'TRACE_LIMIT_EXCEEDED',
} as const;

export type EventType = typeof EventType[keyof typeof EventType];

/* ── Values ─────────────────────────────────────────────────────────────────────────────────
 *
 * A language-neutral shape for "the value a variable had at this moment". Kept deliberately
 * small: this is a display format, not a serialisation of the student's heap.
 *
 * `repr` is always present and is what gets rendered. `kind` lets the renderer pick a widget —
 * an array gets cells, a primitive gets a chip. Phase 1 needs primitives and 1-D arrays; the
 * rest exist so the union is closed.
 */
export type ValueKind =
  | 'primitive'
  | 'string'
  | 'array'
  | 'object'
  | 'null'
  | 'unsupported';

export interface TracedValue {
  kind: ValueKind;
  /** How it is shown. Always set, even when `kind` is 'unsupported'. */
  repr: string;
  /** The language's own type name, where it has one: 'int', 'String[]', 'list'. */
  typeName?: string;
  /** Element reprs, for `kind: 'array'`. Flat — Phase 1 is 1-D only. */
  elements?: string[];
  /**
   * True when the value was too large to capture in full and `repr` is truncated. A student
   * must never be shown a shortened array as though it were the whole one.
   */
  truncated?: boolean;
}

/* ── The event ──────────────────────────────────────────────────────────────────────────────
 *
 * One flat interface with optional fields rather than a discriminated union of fifteen
 * interfaces. The trade is deliberate: the instrumenter writes these from three languages and
 * the parser has to accept anything they send, so a shape that tolerates missing fields fails
 * more gracefully than one that rejects the whole event. The renderer narrows on `eventType`.
 */
export interface ExecutionEvent {
  /**
   * Monotonic from 1, assigned by the instrumented program, never by the server. Timestamps
   * cannot order events inside a single millisecond and a loop body runs many times per
   * millisecond, so this is the only reliable ordering.
   */
  sequence: number;

  eventType: EventType;

  /**
   * THE STUDENT'S OWN LINE NUMBER. Never the line in the rewritten file.
   *
   * Instrumentation inserts statements, so the emitted file's line numbers do not match what
   * the student is looking at. Every event must carry the original, or Monaco highlights the
   * wrong line and the whole feature actively misleads. JavaScript has a second offset to
   * account for — JS_PROMPT_PRELUDE_LINES already shifts student code by one.
   */
  line: number;

  /** Column, where the instrumenter can supply it. Used for inline value decorations. */
  column?: number;

  /** Method or function this happened inside, for the call-stack panel. */
  scope?: string;

  /** VARIABLE_*, ARRAY_*: the identifier. */
  name?: string;
  /** VARIABLE_ASSIGN, ARRAY_WRITE: what it became. */
  value?: TracedValue;
  /** VARIABLE_ASSIGN, ARRAY_WRITE: what it was. Needed to show a swap as a swap. */
  previousValue?: TracedValue;
  /** ARRAY_READ, ARRAY_WRITE: which element. */
  index?: number;

  /** CONDITION_EVALUATE: the source text, for context. */
  expression?: string;
  /** CONDITION_EVALUATE: the same expression with operands substituted — '8 > 3'. */
  resolved?: string;
  /** CONDITION_EVALUATE: the outcome. */
  result?: boolean;

  /** LOOP_*: which loop, when several are nested on adjacent lines. */
  loopId?: string;
  /** LOOP_ITERATION: 1-based pass number. */
  iteration?: number;

  /** METHOD_ENTER: argument values in declaration order. */
  args?: TracedValue[];
  /** METHOD_RETURN: the returned value, absent for void. */
  returnValue?: TracedValue;

  /** STDOUT: exactly what the program printed, newlines included, unmodified. */
  text?: string;

  /** EXCEPTION: the language's own class name — 'ArrayIndexOutOfBoundsException'. */
  exceptionType?: string;
  /** EXCEPTION: the message as thrown. */
  exceptionMessage?: string;
  /**
   * EXCEPTION: a plain-English explanation written for a learner, when the type is one we
   * recognise. Never invented — absent is correct when we have nothing true to say.
   */
  explanation?: string;
}

/* ── Session ───────────────────────────────────────────────────────────────────────────────── */

export const VisualizerMode = {
  /** Plain execution. No instrumentation; this is the existing Run path. */
  RUN: 'RUN',
  /** Full trace, rendered as a stepper. */
  VISUALIZE: 'VISUALIZE',
  /** Trace plus breakpoints. Phase 2. */
  DEBUG: 'DEBUG',
} as const;
export type VisualizerMode = typeof VisualizerMode[keyof typeof VisualizerMode];

export const SessionStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  /** The cap was hit. A partial trace exists and must be shown. */
  TRUNCATED: 'TRUNCATED',
} as const;
export type SessionStatus = typeof SessionStatus[keyof typeof SessionStatus];

/**
 * Why a session failed, when it did.
 *
 * Separated from the message because the UI reacts differently to each, and because conflating
 * "we could not run it" with "your program is wrong" is the single most unfair thing this
 * feature could do — the same mistake that scored a candidate zero for a sandbox timeout.
 */
export const ErrorType = {
  /** The program did not compile. The student's problem, and the message is the compiler's. */
  COMPILE_ERROR: 'COMPILE_ERROR',
  /** It compiled and threw. Also the student's problem, and explainable. */
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  /** It ran too long. May be an infinite loop, may be a busy sandbox — say which if known. */
  TIMEOUT: 'TIMEOUT',
  /** The instrumenter could not handle a construct. OUR problem. Must never render a trace. */
  UNSUPPORTED_CONSTRUCT: 'UNSUPPORTED_CONSTRUCT',
  /** The sandbox failed or was unreachable. OUR problem. */
  SANDBOX_ERROR: 'SANDBOX_ERROR',
  /**
   * VISUALIZE or DEBUG was asked for while the code runner is in simulation mode. Refused
   * outright: a simulated trace is a fabricated trace, and a student cannot tell the
   * difference. Better to show nothing than to teach something untrue.
   */
  SIMULATION_REFUSED: 'SIMULATION_REFUSED',
  /** The event cap was reached. Not really a failure — the partial trace is still shown. */
  TRACE_LIMIT: 'TRACE_LIMIT',
} as const;
export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface VisualizerSessionSummary {
  id: string;
  language: string;
  mode: VisualizerMode;
  status: SessionStatus;
  eventCount: number;
  truncated: boolean;
  executionTimeMs?: number;
  memoryKb?: number;
  errorType?: ErrorType;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
}

/* ── Socket.io contract ─────────────────────────────────────────────────────────────────────
 *
 * Room name and event names in one place, because a typo in a room name is silent on both
 * sides: the server emits into a room nobody joined, the client waits forever, and nothing
 * logs an error.
 */
export const visualizerRoom = (sessionId: string): string => `visualizer_${sessionId}`;

export const VisualizerSocketEvent = {
  STARTED: 'execution.started',
  /** A batch of events, not one per message. See TRACE_BATCH_SIZE. */
  TRACE: 'execution.trace',
  STDOUT: 'execution.stdout',
  ERROR: 'execution.error',
  COMPLETED: 'execution.completed',
} as const;
export type VisualizerSocketEvent =
  typeof VisualizerSocketEvent[keyof typeof VisualizerSocketEvent];

/* ── Limits ─────────────────────────────────────────────────────────────────────────────────
 *
 * Numbers with reasons. Every one of these exists because of a measurement on this platform,
 * not because it looked round.
 */

/**
 * Hard cap on events per session.
 *
 * A Bubble Sort over six elements is roughly eight events per comparison; the measured budget
 * for 5,000 events is 500 KB–1 MB of stdout. Piston's output ceiling is now 8 MB, so 5,000 is
 * comfortable — and a student whose loop does not terminate hits this instead of filling the
 * sandbox's buffer and being SIGKILLed with no output at all, which is what used to happen.
 */
export const TRACE_EVENT_LIMIT = 5000;

/**
 * Events per socket message.
 *
 * One message per event would be 5,000 emits for one run. Batching keeps the socket useful for
 * everything else it carries while a trace streams.
 */
export const TRACE_BATCH_SIZE = 100;

/**
 * Longest single value repr kept, in characters.
 *
 * Past this, `TracedValue.truncated` is set. A student must never be shown a shortened array as
 * though it were complete.
 */
export const VALUE_REPR_LIMIT = 200;

/** Longest array captured element-by-element. Beyond this only `repr` is filled in. */
export const ARRAY_ELEMENT_LIMIT = 100;

/* ── Parsing ────────────────────────────────────────────────────────────────────────────────── */

/**
 * Pull the trace events out of a program's stdout, keeping the student's own output separate.
 *
 * Shared by both sides on purpose. The server parses the sandbox's stdout; the client parses
 * the same format when replaying a stored trace. Two implementations of this would be two
 * chances to disagree about what a student's program printed.
 *
 * Tolerant by design: a malformed trace line is DROPPED, not thrown on. A partial trace is
 * useful and an exception in the middle of parsing one loses all of it. Lines that are not
 * trace lines are returned verbatim, in order, as the program's output.
 */
export function parseTraceOutput(stdout: string): {
  events: ExecutionEvent[];
  programOutput: string;
  malformed: number;
} {
  const events: ExecutionEvent[] = [];
  const output: string[] = [];
  let malformed = 0;

  for (const line of (stdout || '').split('\n')) {
    if (!line.startsWith(TRACE_SENTINEL)) {
      output.push(line);
      continue;
    }
    const payload = line.slice(TRACE_SENTINEL.length);
    try {
      const parsed = JSON.parse(payload) as ExecutionEvent;
      /* A line that parses but carries no sequence cannot be ordered, so it cannot be used. */
      if (typeof parsed?.sequence === 'number' && typeof parsed?.eventType === 'string') {
        events.push(parsed);
      } else {
        malformed++;
      }
    } catch {
      malformed++;
    }
  }

  /*
   * Sorted by sequence, not trusting arrival order. Compiled-language buffering can interleave
   * lines, and a stepper that jumps backwards is worse than useless.
   */
  events.sort((a, b) => a.sequence - b.sequence);

  return { events, programOutput: output.join('\n'), malformed };
}

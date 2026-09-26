import codeRunnerService from '../codeRunnerService';
import { ProgrammingLanguage } from '../../models/Assignment';
import { instrumentJava, InstrumentOk, InstrumentRefused } from './javaInstrumenter';
import {
  ErrorType, EventType, ExecutionEvent, parseTraceOutput, TRACE_EVENT_LIMIT,
} from '../../types/executionEvents';

/**
 * Run a program in VISUALIZE mode and hand back its trace.
 *
 * Synchronous on purpose, for Phase 1. The plan sketched a BullMQ queue and a Socket.io room,
 * but a Java run is ~7 seconds and the result is one payload the stepper replays locally, so a
 * plain request carries it with nothing to go stale. Admission control still applies: the run
 * goes through codeRunnerService, whose every Piston call sits behind withExecutionSlot — the
 * same cap that protects exam Run/Submit.
 */

export interface VisualizeStats {
  /** Every event is one step of the stepper. */
  steps: number;
  comparisons: number;
  arrayWrites: number;
  loopIterations: number;
  methodCalls: number;
}

export interface VisualizeResult {
  ok: boolean;
  status: 'COMPLETED' | 'FAILED' | 'TRUNCATED';
  errorType?: ErrorType;
  /** Written for the student. Present whenever `ok` is false or the trace was cut short. */
  message?: string;
  /** The student's line the message refers to, when there is one. */
  line?: number;
  events: ExecutionEvent[];
  /** What the program printed, rebuilt from STDOUT events in order. */
  output: string;
  /** Raw compiler/runtime text, for the error panel's "details" disclosure. */
  details?: string;
  stats: VisualizeStats;
  executionTimeMs: number;
}

const EMPTY_STATS: VisualizeStats = {
  steps: 0, comparisons: 0, arrayWrites: 0, loopIterations: 0, methodCalls: 0,
};

const fail = (errorType: ErrorType, message: string, extra: Partial<VisualizeResult> = {}): VisualizeResult => ({
  ok: false, status: 'FAILED', errorType, message, events: [], output: '',
  stats: { ...EMPTY_STATS }, executionTimeMs: 0, ...extra,
});

export function statsFor(events: ExecutionEvent[]): VisualizeStats {
  const s = { ...EMPTY_STATS, steps: events.length };
  for (const e of events) {
    if (e.eventType === EventType.CONDITION_EVALUATE) s.comparisons++;
    else if (e.eventType === EventType.ARRAY_WRITE) s.arrayWrites++;
    else if (e.eventType === EventType.LOOP_ITERATION) s.loopIterations++;
    else if (e.eventType === EventType.METHOD_ENTER) s.methodCalls++;
  }
  return s;
}

/** javac reports `Main.java:12: error: ...`; the line is the student's, since nothing moves. */
export function compileErrorLine(text: string): number | undefined {
  const m = /\.java:(\d+):\s*error/i.exec(text || '');
  return m ? Number(m[1]) : undefined;
}

export async function visualize(input: { code: string; language?: string; stdin?: string }): Promise<VisualizeResult> {
  const language = String(input.language || 'java').toLowerCase();
  const code = String(input.code || '');

  if (language !== 'java') {
    return fail(ErrorType.UNSUPPORTED_CONSTRUCT,
      'Step-by-step visualization supports Java for now. Python and JavaScript are coming next.');
  }
  if (code.length > 20_000) {
    return fail(ErrorType.UNSUPPORTED_CONSTRUCT, 'This program is too long to visualize. Keep it under 20,000 characters.');
  }

  /*
   * A simulated trace would be fabricated evidence of what a program did, and a student
   * cannot tell. So with no real sandbox configured this refuses instead of falling back.
   */
  if (!codeRunnerService.isRealExecutionEnabled()) {
    return fail(ErrorType.SIMULATION_REFUSED,
      'The code sandbox is not available right now, so this program cannot be visualized.');
  }

  const inst = instrumentJava(code);
  if (inst.ok === false) {
    const refused = inst as InstrumentRefused;
    /*
     * The parser rejects what javac would reject, and javac says WHY far better than we can.
     * So a parse failure runs the untouched program once, purely to surface the real compiler
     * message on the right line. Nothing is traced from that run.
     */
    if (refused.reason === 'PARSE_ERROR' && code.trim()) {
      const plain = await codeRunnerService.execute({
        code, language: ProgrammingLanguage.JAVA, input: String(input.stdin || ''),
        expectedOutput: '', timeLimit: 30_000, memoryLimit: 256,
      });
      if (plain.compilationError) {
        return fail(ErrorType.COMPILE_ERROR, 'Your code did not compile. Fix the error below, then visualize again.', {
          line: compileErrorLine(plain.compilationError) ?? refused.line, details: plain.compilationError,
        });
      }
    }
    return fail(
      refused.reason === 'PARSE_ERROR' ? ErrorType.COMPILE_ERROR : ErrorType.UNSUPPORTED_CONSTRUCT,
      refused.message, { line: refused.line },
    );
  }

  const started = Date.now();
  const run = await codeRunnerService.execute({
    code: (inst as InstrumentOk).source,
    language: ProgrammingLanguage.JAVA,
    input: String(input.stdin || ''),
    expectedOutput: '',
    timeLimit: 30_000,
    memoryLimit: 256,
  });
  const executionTimeMs = run.executionTime || Date.now() - started;

  if (run.compilationError) {
    return fail(ErrorType.COMPILE_ERROR, 'Your code did not compile. Fix the error below, then visualize again.', {
      line: compileErrorLine(run.compilationError), details: run.compilationError, executionTimeMs,
    });
  }

  const { events } = parseTraceOutput(run.output || '');
  const output = events.filter(e => e.eventType === EventType.STDOUT).map(e => e.text || '').join('');
  const stats = statsFor(events);
  const truncated = events.some(e => e.eventType === EventType.TRACE_LIMIT_EXCEEDED);
  const exception = events.find(e => e.eventType === EventType.EXCEPTION);

  if (exception) {
    return {
      ok: false, status: 'FAILED', errorType: ErrorType.RUNTIME_ERROR,
      message: exception.explanation
        || `${exception.exceptionType}: ${exception.exceptionMessage}`,
      line: exception.line, events, output, details: run.error, stats, executionTimeMs,
    };
  }

  /* Died with no trace at all: the sandbox, not the student. Never report it as their bug. */
  if (!events.length) {
    return fail(ErrorType.SANDBOX_ERROR,
      run.error || 'The program did not produce a trace. Please try again in a few seconds.',
      { details: run.error, executionTimeMs });
  }

  if (truncated) {
    return {
      ok: true, status: 'TRUNCATED',
      message: `This run took more than ${TRACE_EVENT_LIMIT.toLocaleString()} steps, so recording stopped there. `
             + 'Everything up to that point is shown. If you expected it to finish sooner, look for a loop '
             + 'whose condition never becomes false.',
      events, output, stats, executionTimeMs,
    };
  }

  /* Ended with a trace but a non-zero exit and no EXCEPTION event — e.g. killed mid-run. */
  if (run.error && !events.some(e => e.eventType === EventType.EXECUTION_COMPLETE)) {
    return {
      ok: false, status: 'FAILED', errorType: ErrorType.SANDBOX_ERROR,
      message: run.error, events, output, details: run.error, stats, executionTimeMs,
    };
  }

  return { ok: true, status: 'COMPLETED', events, output, stats, executionTimeMs };
}

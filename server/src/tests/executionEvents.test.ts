/**
 * The trace wire format.
 *
 * The parser here is the one thing in the event schema with behaviour rather than just types,
 * and it sits between a student's program and what they are shown. Two properties matter more
 * than the rest:
 *
 *   1. A program that PRINTS JSON must not have its output parsed as trace events. Printing
 *      JSON is a common exercise, so this is not a hypothetical.
 *   2. A malformed trace line must be dropped, never thrown on. A partial trace is useful; an
 *      exception halfway through parsing one loses everything before it too.
 */
import {
  TRACE_SENTINEL, EventType, parseTraceOutput, TRACE_EVENT_LIMIT, TRACE_BATCH_SIZE,
  VisualizerMode, ErrorType, visualizerRoom, VisualizerSocketEvent,
  ExecutionEvent,
} from '../types/executionEvents';

const ev = (over: Partial<ExecutionEvent> = {}): ExecutionEvent => ({
  sequence: 1, eventType: EventType.LINE_EXECUTE, line: 1, ...over,
});

const trace = (e: Partial<ExecutionEvent>) => TRACE_SENTINEL + JSON.stringify(ev(e));

describe('separating a trace from the program\'s own output', () => {
  it('pulls out trace lines and leaves the rest as output', () => {
    const stdout = [
      trace({ sequence: 1, eventType: EventType.EXECUTION_START, line: 1 }),
      'Sorting...',
      trace({ sequence: 2, eventType: EventType.LINE_EXECUTE, line: 4 }),
      '2 3 5 8 10 12',
    ].join('\n');

    const { events, programOutput, malformed } = parseTraceOutput(stdout);

    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe(EventType.EXECUTION_START);
    expect(programOutput).toBe('Sorting...\n2 3 5 8 10 12');
    expect(malformed).toBe(0);
  });

  it('does NOT treat a student printing JSON as a trace event', () => {
    /*
     * The reason the sentinel is an unlikely string rather than something readable. A student
     * whose exercise is to print a JSON object must not have that object swallowed into the
     * trace and vanish from their console.
     */
    const stdout = [
      '{"sequence":1,"eventType":"EXECUTION_START","line":1}',
      '{"name":"Ada","age":36}',
      trace({ sequence: 1 }),
    ].join('\n');

    const { events, programOutput } = parseTraceOutput(stdout);

    expect(events).toHaveLength(1);
    expect(programOutput).toContain('{"name":"Ada","age":36}');
    expect(programOutput).toContain('{"sequence":1,"eventType":"EXECUTION_START","line":1}');
  });

  it('requires the sentinel at the START of the line, not anywhere in it', () => {
    const { events, programOutput } = parseTraceOutput(
      `the answer is ${TRACE_SENTINEL}{"sequence":1,"eventType":"LINE_EXECUTE","line":1}`,
    );
    expect(events).toHaveLength(0);
    expect(programOutput).toContain('the answer is');
  });

  it('keeps the program\'s output in order and unmodified', () => {
    const { programOutput } = parseTraceOutput(
      ['a', trace({ sequence: 1 }), 'b', 'c', trace({ sequence: 2 }), 'd'].join('\n'),
    );
    expect(programOutput).toBe('a\nb\nc\nd');
  });

  it('preserves blank lines in the output — spacing can be the point of the exercise', () => {
    const { programOutput } = parseTraceOutput(['x', '', '', 'y'].join('\n'));
    expect(programOutput).toBe('x\n\n\ny');
  });
});

describe('a malformed trace line is dropped, not thrown on', () => {
  it('survives truncated JSON and keeps every good event', () => {
    /* A run killed mid-write leaves a half-line. The events before it are still worth showing. */
    const stdout = [
      trace({ sequence: 1 }),
      `${TRACE_SENTINEL}{"sequence":2,"eventType":"LINE`,
      trace({ sequence: 3 }),
    ].join('\n');

    const { events, malformed } = parseTraceOutput(stdout);
    expect(events.map(e => e.sequence)).toEqual([1, 3]);
    expect(malformed).toBe(1);
  });

  it('rejects a line that parses but cannot be ordered', () => {
    /* No sequence means it cannot be placed in the trace, so it cannot be used. */
    const { events, malformed } = parseTraceOutput(
      `${TRACE_SENTINEL}{"eventType":"LINE_EXECUTE","line":3}`,
    );
    expect(events).toHaveLength(0);
    expect(malformed).toBe(1);
  });

  it('rejects a line with no eventType', () => {
    const { events, malformed } = parseTraceOutput(`${TRACE_SENTINEL}{"sequence":1,"line":3}`);
    expect(events).toHaveLength(0);
    expect(malformed).toBe(1);
  });

  it('copes with empty and undefined stdout rather than throwing', () => {
    expect(parseTraceOutput('').events).toEqual([]);
    expect(parseTraceOutput(undefined as unknown as string).events).toEqual([]);
    expect(parseTraceOutput('').programOutput).toBe('');
  });
});

describe('ordering', () => {
  it('sorts by sequence rather than trusting arrival order', () => {
    /*
     * Compiled-language output buffering can interleave lines. A stepper that jumps backwards
     * is worse than useless, so arrival order is never trusted.
     */
    const stdout = [trace({ sequence: 3 }), trace({ sequence: 1 }), trace({ sequence: 2 })].join('\n');
    expect(parseTraceOutput(stdout).events.map(e => e.sequence)).toEqual([1, 2, 3]);
  });
});

describe('the fields the renderer actually depends on', () => {
  it('carries a resolved condition, not just the source text', () => {
    /*
     * The whole point of CONDITION_EVALUATE. Showing a student `arr[j] > arr[j+1]` tells them
     * nothing they did not write; showing them `8 > 3` is the explanation.
     */
    const { events } = parseTraceOutput(trace({
      sequence: 1,
      eventType: EventType.CONDITION_EVALUATE,
      line: 7,
      expression: 'arr[j] > arr[j+1]',
      resolved: '8 > 3',
      result: true,
    }));

    expect(events[0].expression).toBe('arr[j] > arr[j+1]');
    expect(events[0].resolved).toBe('8 > 3');
    expect(events[0].result).toBe(true);
  });

  it('carries both sides of an array write, so a swap reads as a swap', () => {
    const { events } = parseTraceOutput([
      trace({
        sequence: 1, eventType: EventType.ARRAY_WRITE, line: 6, name: 'arr', index: 0,
        previousValue: { kind: 'primitive', repr: '8', typeName: 'int' },
        value: { kind: 'primitive', repr: '3', typeName: 'int' },
      }),
    ].join('\n'));

    expect(events[0].previousValue?.repr).toBe('8');
    expect(events[0].value?.repr).toBe('3');
  });

  it('marks a truncated value as truncated', () => {
    /* A shortened array must never be shown as though it were complete. */
    const { events } = parseTraceOutput(trace({
      sequence: 1, eventType: EventType.VARIABLE_ASSIGN, line: 2, name: 'big',
      value: { kind: 'array', repr: '[1, 2, 3, ...]', elements: ['1', '2', '3'], truncated: true },
    }));
    expect(events[0].value?.truncated).toBe(true);
  });

  it('distinguishes hitting the cap from finishing', () => {
    /*
     * Without TRACE_LIMIT_EXCEEDED the renderer cannot tell "the program ended" from "we
     * stopped watching", and would tell a student with an infinite loop that their program
     * completed.
     */
    const { events } = parseTraceOutput([
      trace({ sequence: 1, eventType: EventType.LINE_EXECUTE }),
      trace({ sequence: 2, eventType: EventType.TRACE_LIMIT_EXCEEDED }),
    ].join('\n'));

    expect(events[1].eventType).toBe(EventType.TRACE_LIMIT_EXCEEDED);
    expect(events.some(e => e.eventType === EventType.EXECUTION_COMPLETE)).toBe(false);
  });
});

describe('the constants that two sides have to agree on', () => {
  it('batches events rather than emitting one socket message each', () => {
    /* 5,000 emits for one run would crowd out everything else the socket carries. */
    expect(TRACE_BATCH_SIZE).toBeLessThan(TRACE_EVENT_LIMIT);
    expect(TRACE_EVENT_LIMIT / TRACE_BATCH_SIZE).toBeLessThanOrEqual(100);
  });

  it('names the socket room the same way on both sides', () => {
    /* A typo here is silent: the server emits into a room nobody joined. */
    expect(visualizerRoom('abc123')).toBe('visualizer_abc123');
  });

  it('uses the event names the Phase 0 design specified', () => {
    expect(Object.values(VisualizerSocketEvent)).toEqual([
      'execution.started', 'execution.trace', 'execution.stdout',
      'execution.error', 'execution.completed',
    ]);
  });

  it('has a distinct error type for a refused simulation', () => {
    /*
     * A simulated trace is a fabricated trace and a student cannot tell. VISUALIZE and DEBUG
     * must be refused outright when the sandbox is unavailable, and refusing needs its own
     * error type so the UI does not report it as the student's mistake.
     */
    expect(ErrorType.SIMULATION_REFUSED).toBe('SIMULATION_REFUSED');
    expect(VisualizerMode.VISUALIZE).toBe('VISUALIZE');
    expect(VisualizerMode.DEBUG).toBe('DEBUG');
  });

  it('keeps OUR failures distinguishable from the student\'s', () => {
    /* Conflating these is how a sandbox timeout became a wrong answer during the exam. */
    const ours = [ErrorType.SANDBOX_ERROR, ErrorType.UNSUPPORTED_CONSTRUCT, ErrorType.SIMULATION_REFUSED];
    const theirs = [ErrorType.COMPILE_ERROR, ErrorType.RUNTIME_ERROR];
    expect(new Set([...ours, ...theirs]).size).toBe(5);
  });
});

describe('a realistic Bubble Sort fragment', () => {
  it('parses the acceptance-test shape end to end', () => {
    const stdout = [
      trace({ sequence: 1, eventType: EventType.EXECUTION_START, line: 1 }),
      trace({
        sequence: 2, eventType: EventType.VARIABLE_DECLARE, line: 3, name: 'arr',
        value: { kind: 'array', repr: '[8, 3, 12, 5, 10, 2]', typeName: 'int[]',
                 elements: ['8', '3', '12', '5', '10', '2'] },
      }),
      trace({ sequence: 3, eventType: EventType.LOOP_ENTER, line: 4, loopId: 'outer' }),
      trace({
        sequence: 4, eventType: EventType.CONDITION_EVALUATE, line: 6,
        expression: 'arr[j] > arr[j+1]', resolved: '8 > 3', result: true,
      }),
      trace({
        sequence: 5, eventType: EventType.ARRAY_WRITE, line: 6, name: 'arr', index: 0,
        previousValue: { kind: 'primitive', repr: '8' },
        value: { kind: 'primitive', repr: '3' },
      }),
      '2 3 5 8 10 12 ',
      trace({ sequence: 6, eventType: EventType.EXECUTION_COMPLETE, line: 9 }),
    ].join('\n');

    const { events, programOutput, malformed } = parseTraceOutput(stdout);

    expect(malformed).toBe(0);
    expect(events).toHaveLength(6);
    expect(events.map(e => e.sequence)).toEqual([1, 2, 3, 4, 5, 6]);
    /* The student's output survives intact, trailing space included. */
    expect(programOutput.trim()).toBe('2 3 5 8 10 12');
    /* And every event cites a line in the student's own file, not the instrumented one. */
    expect(events.every(e => e.line >= 1 && e.line <= 9)).toBe(true);
  });
});

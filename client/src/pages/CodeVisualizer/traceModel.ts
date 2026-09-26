import { ExecutionEvent, EventType } from '../../types/executionEvents';

/**
 * Rebuild what the program's memory looked like after any step.
 *
 * The trace is a list of changes, not snapshots, so every frame is computed by replaying from
 * the start. That is done once, up front: a 5,000-event trace becomes 5,000 small frames the
 * stepper can jump between instantly, and the slider never has to replay on drag.
 */

export interface Frame {
  index: number;
  event: ExecutionEvent;
  line: number;
  vars: Record<string, string>;
  /** Variables whose value changed on this exact step, for the highlight. */
  changed: string[];
  arrays: Record<string, string[]>;
  /** Array slots being compared at this step (read by a condition). */
  compare: { name: string; index: number }[];
  /** Array slots written at this step. */
  written: { name: string; index: number }[];
  callStack: string[];
  output: string;
  /** Running operation counts up to and including this step. */
  ops: { comparisons: number; writes: number; iterations: number };
  narration: string;
}

/** `[12, 5, 3]` → ['12','5','3']. The harness writes arrays as their Java toString form. */
export function parseArrayRepr(repr: string): string[] | null {
  const s = (repr || '').trim();
  if (!s.startsWith('[') || !s.endsWith(']')) return null;
  const inner = s.slice(1, -1).trim();
  if (!inner) return [];
  return inner.split(',').map(x => x.trim());
}

/**
 * Evaluate an index expression such as `j + 1` or `n - 1 - i` against the current variables.
 *
 * Deliberately tiny — integers, identifiers, + - * / and parentheses, integer division as in
 * Java. Anything else returns null and the renderer simply does not highlight: a missing
 * highlight is honest, a wrong one is not.
 */
export function evalIndex(expr: string, vars: Record<string, string>): number | null {
  const toks = expr.match(/\d+|[A-Za-z_][A-Za-z0-9_]*|[+\-*/()]|\S/g) || [];
  let pos = 0;
  const peek = () => toks[pos];
  const fail = { bad: true };

  const atom = (): number => {
    const t = toks[pos++];
    if (t === undefined) throw fail;
    if (t === '(') { const v = sum(); if (toks[pos++] !== ')') throw fail; return v; }
    if (t === '-') return -atom();
    if (/^\d+$/.test(t)) return Number(t);
    if (/^[A-Za-z_]/.test(t)) {
      const v = vars[t];
      if (v === undefined || !/^-?\d+$/.test(v)) throw fail;
      return Number(v);
    }
    throw fail;
  };
  const product = (): number => {
    let v = atom();
    while (peek() === '*' || peek() === '/') {
      const op = toks[pos++];
      const r = atom();
      if (op === '/' && r === 0) throw fail;
      v = op === '*' ? v * r : Math.trunc(v / r);
    }
    return v;
  };
  function sum(): number {
    let v = product();
    while (peek() === '+' || peek() === '-') {
      const op = toks[pos++];
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }

  try {
    const v = sum();
    return pos === toks.length && Number.isInteger(v) ? v : null;
  } catch {
    return null;
  }
}

/** Every `name[expr]` in a condition's source, resolved to concrete slots. */
export function arrayReads(expression: string, vars: Record<string, string>, arrays: Record<string, string[]>) {
  const out: { name: string; index: number }[] = [];
  const re = /([A-Za-z_][A-Za-z0-9_]*)\s*\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expression))) {
    if (!arrays[m[1]]) continue;
    const idx = evalIndex(m[2], vars);
    if (idx !== null && idx >= 0 && idx < arrays[m[1]].length) out.push({ name: m[1], index: idx });
  }
  return out;
}

function narrate(e: ExecutionEvent): string {
  const v = e.value?.repr;
  switch (e.eventType) {
    case EventType.EXECUTION_START: return 'The program starts.';
    case EventType.METHOD_ENTER: return `Entering ${e.scope}().`;
    case EventType.METHOD_RETURN: return `Returning from ${e.scope}()${e.returnValue ? ` with ${e.returnValue.repr}` : ''}.`;
    case EventType.VARIABLE_DECLARE:
      return e.value?.kind === 'array'
        ? `Create array ${e.name} with ${parseArrayRepr(v || '')?.length ?? '?'} elements: ${v}.`
        : `Create variable ${e.name} = ${v}.`;
    case EventType.VARIABLE_ASSIGN: return `${e.name} becomes ${v}.`;
    case EventType.ARRAY_WRITE: return `Write ${v} into ${e.name}[${e.index}].`;
    case EventType.CONDITION_EVALUATE:
      return e.resolved
        ? `Check ${e.expression}  →  ${e.resolved}  →  ${e.result ? 'TRUE' : 'FALSE'}.`
        : `Check ${e.expression}  →  ${e.result ? 'TRUE' : 'FALSE'}.`;
    case EventType.LOOP_ENTER: return 'A loop begins.';
    case EventType.LOOP_ITERATION:
      return e.name ? `Loop pass ${e.iteration}: ${e.name} = ${v}.` : `Loop pass ${e.iteration}.`;
    case EventType.LOOP_EXIT: return 'The loop ends — its condition is now false.';
    case EventType.STDOUT: return `Print ${JSON.stringify(e.text ?? '')}.`;
    case EventType.EXCEPTION: return `💥 ${e.exceptionType}: ${e.exceptionMessage}`;
    case EventType.EXECUTION_COMPLETE: return 'The program finished.';
    case EventType.TRACE_LIMIT_EXCEEDED: return 'Recording stopped here — the step limit was reached.';
    default: return String(e.eventType);
  }
}

export function buildFrames(events: ExecutionEvent[]): Frame[] {
  const frames: Frame[] = [];
  let vars: Record<string, string> = {};
  let arrays: Record<string, string[]> = {};
  let stack: string[] = [];
  let output = '';
  const ops = { comparisons: 0, writes: 0, iterations: 0 };
  let lastLine = 1;

  events.forEach((e, index) => {
    vars = { ...vars };
    arrays = { ...arrays };
    const changed: string[] = [];
    let compare: { name: string; index: number }[] = [];
    const written: { name: string; index: number }[] = [];

    switch (e.eventType) {
      case EventType.METHOD_ENTER:
        stack = [...stack, e.scope || '?'];
        break;
      case EventType.METHOD_RETURN:
        stack = stack.slice(0, -1);
        break;
      case EventType.VARIABLE_DECLARE:
      case EventType.VARIABLE_ASSIGN:
      case EventType.LOOP_ITERATION:
        if (e.name && e.value) {
          if (e.value.kind === 'array') {
            const els = parseArrayRepr(e.value.repr);
            if (els) arrays[e.name] = els;
            vars[e.name] = `int[${els?.length ?? '?'}]`;
          } else {
            vars[e.name] = e.value.repr;
          }
          changed.push(e.name);
        }
        if (e.eventType === EventType.LOOP_ITERATION) ops.iterations++;
        break;
      case EventType.ARRAY_WRITE:
        if (e.name && typeof e.index === 'number' && e.value) {
          const arr = [...(arrays[e.name] || [])];
          arr[e.index] = e.value.repr;
          arrays[e.name] = arr;
          written.push({ name: e.name, index: e.index });
          changed.push(`${e.name}[${e.index}]`);
        }
        ops.writes++;
        break;
      case EventType.CONDITION_EVALUATE:
        compare = arrayReads(e.expression || '', vars, arrays);
        ops.comparisons++;
        break;
      case EventType.STDOUT:
        output += e.text || '';
        break;
      default:
        break;
    }

    if (e.line > 0) lastLine = e.line;
    frames.push({
      index, event: e, line: lastLine, vars, changed, arrays, compare, written,
      callStack: stack, output, ops: { ...ops }, narration: narrate(e),
    });
  });

  return frames;
}

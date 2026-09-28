import { parse } from 'java-parser';
import { CB_TRACE_HARNESS, HARNESS_CLASS, HARNESS_SENTINEL } from './cbTraceHarness';

/**
 * Rewrite a student's Java so it narrates itself, without moving a single line.
 *
 * ── THE ONE INVARIANT ──────────────────────────────────────────────────────────────────────
 *
 * Every event must cite the line the STUDENT is looking at. Instrumentation adds statements, so
 * the obvious approach — inject on new lines and keep a source map — means every event's line
 * has to be translated back, and any gap in that map silently highlights the wrong line. A
 * visualizer that points at the wrong line is worse than none: it teaches something untrue.
 *
 * So this never inserts a newline. Every injection is spliced in at a character offset, on the
 * line it belongs to. The instrumented body has exactly as many lines as the original, with the
 * harness appended after the last one, and line numbers are therefore right BY CONSTRUCTION.
 *
 *   original:  `      total = total + arr[i];`
 *   becomes:   `      total = total + arr[i]; CBTrace.assign(6,"main","total",CBTrace.v(total));`
 *
 * A single-statement body that needs braces still costs no lines: `{` goes at the start of the
 * body and `}` at its end, both on lines that already exist. The invariant is asserted at the
 * end, not assumed.
 *
 * ── HOW EDITS ARE APPLIED, AND WHY IT IS NOT OBVIOUS ───────────────────────────────────────
 *
 * Several edits can land on the same character offset, and their order changes the meaning:
 *
 *   - Two nested loops whose single-statement bodies end at the same place both want to close
 *     there. The INNER brace must come first, or the braces interleave and the program does
 *     something else entirely.
 *   - `for (int v : arr) System.out.print(v);` has the loop body starting at the same offset as
 *     the statement being rewritten, so an insertion and a replacement share a position.
 *
 * Both were live bugs in the first version of this file. So edits are ranges over the ORIGINAL
 * text with an explicit rank, and the output is rebuilt left to right — never by mutating a
 * string whose offsets then no longer mean what they meant.
 *
 * ── AND WHAT IT REFUSES ────────────────────────────────────────────────────────────────────
 *
 * Coverage is narrow on purpose. Anything outside it is refused with a named reason rather than
 * instrumented partially: a trace that silently omits what a construct did is a trace a student
 * will draw false conclusions from. Failing loudly is the feature.
 */

/* CST nodes that stop instrumentation, with what to tell the student. */
const UNSUPPORTED: Record<string, string> = {
  lambdaExpression: 'lambda expressions',
  tryStatement: 'try / catch blocks',
  switchStatement: 'switch statements',
  switchExpression: 'switch expressions',
  doStatement: 'do-while loops',
  synchronizedStatement: 'synchronized blocks',
  unqualifiedClassInstanceCreationExpression: 'creating objects with new',
  arrayCreationExpression: 'arrays created with new',
};

export interface InstrumentOk {
  ok: true;
  /** Student source with injections, then the harness. */
  source: string;
  /** The class the launcher runs. Piston needs the filename to match. */
  entryClass: string;
  /** Identical to the student's. Asserted before returning. */
  lineCount: number;
  /** What was instrumented where, for tests and the admin coverage view. */
  injected: { kind: string; line: number }[];
}

export interface InstrumentRefused {
  ok: false;
  reason: 'PARSE_ERROR' | 'UNSUPPORTED_CONSTRUCT' | 'NO_ENTRY_CLASS' | 'NAME_COLLISION'
        | 'LINE_SHIFT';
  /** Written for a student, not for us. */
  message: string;
  line?: number;
}

export type InstrumentResult = InstrumentOk | InstrumentRefused;

/* ── CST helpers ─────────────────────────────────────────────────────────────────────────── */

type Node = { name?: string; children?: Record<string, Node[]>; [k: string]: unknown };

function findAll(node: Node | undefined, name: string, out: Node[] = []): Node[] {
  if (!node || typeof node !== 'object') return out;
  if (node.name === name) out.push(node);
  const kids = node.children;
  if (kids) for (const k of Object.keys(kids)) for (const c of kids[k]) findAll(c, name, out);
  return out;
}

function span(node: Node | undefined): { lo: number; hi: number; line: number } {
  let lo = Infinity, hi = -Infinity, line = 0;
  (function walk(n: any) {
    if (!n || typeof n !== 'object') return;
    if (typeof n.startOffset === 'number') {
      if (n.startOffset < lo) { lo = n.startOffset; line = n.startLine || line; }
      if (typeof n.endOffset === 'number' && n.endOffset > hi) hi = n.endOffset;
    }
    if (n.children) for (const k of Object.keys(n.children)) n.children[k].forEach(walk);
  })(node);
  return { lo, hi, line };
}

/** Terminal tokens under a node, in offset order. */
function tokens(node: Node | undefined): any[] {
  const out: any[] = [];
  (function walk(n: any) {
    if (!n || typeof n !== 'object') return;
    if (typeof n.startOffset === 'number' && typeof n.image === 'string' && !n.name) out.push(n);
    if (n.children) for (const k of Object.keys(n.children)) n.children[k].forEach(walk);
  })(node);
  return out.sort((a, b) => a.startOffset - b.startOffset);
}

/** A Java string literal safe to embed in injected code. */
const jstr = (s: string): string =>
  '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    .replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t') + '"';

/* ── Edits ────────────────────────────────────────────────────────────────────────────────
 * A range over the ORIGINAL source plus replacement text. `to === from` is an insertion.
 *
 * `rank` orders edits that begin at the same offset, and every value exists because getting
 * it wrong produced a real bug:
 *
 *   0  BEFORE the construct   — a loop's pass counter. Outer loop first.
 *   1  body OPEN brace + the iteration event.
 *   2  REPLACES original text — a condition wrapper, a print rewritten, a return wrapped.
 *   3  AFTER the statement    — declare / assign / array-write events.
 *   4  body CLOSE brace + the loop-exit event. INNERMOST FIRST.
 */
const RANK = { open: 1, replace: 2, after: 3, closeBody: 4, closeAfter: 5 } as const;
type Rank = typeof RANK[keyof typeof RANK];

interface Edit {
  from: number;
  to: number;
  text: string;
  rank: Rank;
  /**
   * Character width of the construct this edit belongs to, and the thing that makes nested
   * constructs come out right.
   *
   * Two loops whose single-statement bodies end at the same character both want to close
   * there, and so does the inner one's loop-exit event. Category alone cannot order them --
   * what decides is which construct ENCLOSES which, and a wider span is the outer one.
   *
   *   opening edits  -> widest first, so the outer body opens before anything inside it
   *   closing edits  -> narrowest first, so the inner body closes before the outer one
   *
   * Both orderings were wrong in earlier versions of this file, and the symptom was a
   * program that compiled and did something subtly different from what the student wrote.
   */
  width: number;
  seq: number;
  kind: string;
  line: number;
}

/* ── The instrumenter ────────────────────────────────────────────────────────────────────── */

export function instrumentJava(rawSource: string): InstrumentResult {
  const src = String(rawSource || '');
  const T = HARNESS_CLASS;

  if (!src.trim()) {
    return { ok: false, reason: 'PARSE_ERROR', message: 'There is no code to run yet.' };
  }

  /*
   * The harness lives in the student's own file, so its name must be free. Checked first,
   * because "duplicate class CBTrace" would look like it came from their code.
   */
  if (new RegExp('\\b(class|interface|enum)\\s+' + T + '\\b').test(src)) {
    return {
      ok: false, reason: 'NAME_COLLISION',
      message: `This program already has a class called ${T}, which the tracer needs for `
             + 'itself. Rename it and try again.',
    };
  }
  if (src.includes(HARNESS_SENTINEL)) {
    /* A program printing the sentinel could forge trace events. */
    return {
      ok: false, reason: 'NAME_COLLISION',
      message: `This program contains the text ${HARNESS_SENTINEL}, which the tracer reserves.`,
    };
  }

  let cst: Node;
  try {
    cst = parse(src) as unknown as Node;
  } catch (e: any) {
    /* javac will explain this better than we can, so hand it over rather than guess. */
    return {
      ok: false, reason: 'PARSE_ERROR',
      message: 'This code could not be parsed, so it cannot be traced step by step. Press Run '
             + 'to see what the compiler says about it.',
      line: e?.token?.startLine,
    };
  }

  for (const [nodeName, label] of Object.entries(UNSUPPORTED)) {
    const hits = findAll(cst, nodeName);
    if (hits.length) {
      return {
        ok: false, reason: 'UNSUPPORTED_CONSTRUCT',
        message: `Step-by-step tracing does not handle ${label} yet. Press Run to check your `
               + 'answer — it is still graded normally.',
        line: span(hits[0]).line,
      };
    }
  }

  const classes = findAll(cst, 'normalClassDeclaration');
  if (!classes.length) {
    return {
      ok: false, reason: 'NO_ENTRY_CLASS',
      message: 'No class was found. Java code has to live inside a class.',
    };
  }
  /* A class declared inside another is not covered; two side by side are fine. */
  for (let i = 1; i < classes.length; i++) {
    const outer = span(classes[0]);
    const inner = span(classes[i]);
    if (inner.lo > outer.lo && inner.hi < outer.hi) {
      return {
        ok: false, reason: 'UNSUPPORTED_CONSTRUCT',
        message: 'Step-by-step tracing does not handle nested classes yet. Press Run to check '
               + 'your answer — it is still graded normally.',
        line: inner.line,
      };
    }
  }

  const entryId = classes[0].children?.typeIdentifier?.[0] as any;
  const entryClass: string = entryId?.children?.Identifier?.[0]?.image || 'Main';
  const entryLine = span(classes[0]).line;
  const lastLine = src.split('\n').length;

  const edits: Edit[] = [];
  const injected: { kind: string; line: number }[] = [];
  let seq = 0;
  const edit = (
    from: number, to: number, text: string, rank: Rank, kind: string, line: number,
    width: number,
  ) => {
    if (text.includes('\n')) throw new Error('internal: injection contains a newline');
    edits.push({ from, to, text, rank, width, seq: seq++, kind, line });
    injected.push({ kind, line });
  };
  const insert = (
    at: number, text: string, rank: Rank, kind: string, line: number, width: number,
  ) => edit(at, at, text, rank, kind, line, width);

  /* Which method an offset sits in, for the `scope` field. */
  const methods = findAll(cst, 'methodDeclaration').map((m) => {
    const d = findAll(m, 'methodDeclarator')[0] as any;
    return { name: d?.children?.Identifier?.[0]?.image || '?', ...span(m), node: m };
  });
  const scopeAt = (offset: number): string => {
    let best = entryClass, width = Infinity;
    for (const m of methods) {
      if (offset >= m.lo && offset <= m.hi && (m.hi - m.lo) < width) {
        best = m.name; width = m.hi - m.lo;
      }
    }
    return best;
  };

  /* ── method bodies: entry, exit, and the failure guard ─────────────────────────────── */
  for (const m of methods) {
    const body = findAll(m.node, 'methodBody')[0];
    if (!body) continue;                              // abstract / interface
    const block = findAll(body, 'block')[0];
    if (!block) continue;
    const bs = span(block);
    const isMain = m.name === 'main';

    /*
     * `catch (RuntimeException | Error)`, not Throwable. Rethrowing a caught Throwable needs
     * `throws Throwable` on the method, which the student has not written; these two are
     * unchecked, so the rethrow compiles — and between them they cover everything a beginner
     * actually hits: index out of bounds, null, divide by zero, stack overflow.
     *
     * Rethrown rather than swallowed, so the program keeps its real exit code and its real
     * stack trace on stderr. Swallowing would tell the student their program finished.
     */
    const open = isMain
      ? ` ${T}.start(${entryLine},${jstr(entryClass)}); ${T}.enter(${m.line},${jstr(m.name)}); try {`
      : ` ${T}.enter(${m.line},${jstr(m.name)});`;
    insert(bs.lo + 1, open, RANK.open, 'METHOD_ENTER', m.line, bs.hi - bs.lo);

    const close = isMain
      ? ` ${T}.done(${lastLine},${jstr(entryClass)}); }`
        + ` catch (RuntimeException | Error ${T}_e) {`
        + ` ${T}.thrown(${m.line},${jstr(m.name)},${T}_e); throw ${T}_e; }`
      : ` ${T}.ret(${m.line},${jstr(m.name)});`;
    insert(bs.hi, close, RANK.closeAfter,
           isMain ? 'EXECUTION_COMPLETE' : 'METHOD_RETURN', m.line, bs.hi - bs.lo);
  }

  /* ── local variable declarations ──────────────────────────────────────────────────── */
  for (const decl of findAll(cst, 'localVariableDeclarationStatement')) {
    const s = span(decl);
    /* Skip the counters this pass injects itself. */
    const scope = scopeAt(s.lo);
    for (const d of findAll(decl, 'variableDeclarator')) {
      const idNode = findAll(d, 'variableDeclaratorId')[0];
      const name = idNode ? tokens(idNode)[0]?.image : null;
      if (!name) continue;
      insert(s.hi + 1, ` ${T}.decl(${s.line},${jstr(scope)},${jstr(name)},${T}.v(${name}));`,
             RANK.after, 'VARIABLE_DECLARE', s.line, s.hi - s.lo);
    }
  }

  /* ── assignments, and print statements ────────────────────────────────────────────── */
  for (const st of findAll(cst, 'expressionStatement')) {
    const s = span(st);
    const scope = scopeAt(s.lo);
    const text = src.slice(s.lo, s.hi + 1);

    /* System.out.print / println is REWRITTEN, not appended to: the argument must be
       evaluated exactly once, and the text must not reach stdout, where a print without a
       newline would leave the next trace line unparseable. See cbTraceHarness. */
    const pm = /^System\s*\.\s*out\s*\.\s*(print|println)\s*\(/.exec(text);
    if (pm) {
      const callee = pm[1] === 'println' ? 'outln' : 'out';
      const noArgs = /^\s*\)/.test(text.slice(pm[0].length));
      edit(s.lo, s.lo + pm[0].length,
           `${T}.${callee}(${s.line},${jstr(scope)}${noArgs ? '' : ','}`,
           RANK.replace, 'STDOUT', s.line, s.hi - s.lo);
      continue;
    }

    let opTok: any = null;
    for (const be of findAll(st, 'binaryExpression')) {
      for (const t of (be.children?.AssignmentOperator || []) as any[]) {
        if (!opTok || t.startOffset < opTok.startOffset) opTok = t;
      }
    }
    if (!opTok) continue;

    const lhs = src.slice(s.lo, opTok.startOffset).trim();
    const arrayWrite = /^([A-Za-z_$][\w$]*)\s*\[(.+)\]$/.exec(lhs);

    if (arrayWrite) {
      const [, name, idxExpr] = arrayWrite;
      /*
       * The index is evaluated again to report it, which is only sound if evaluating it twice
       * cannot change anything. `arr[i++] = 5` would report the wrong slot, so it is refused
       * rather than mis-reported.
       */
      if (/\+\+|--|=/.test(idxExpr)) {
        return {
          ok: false, reason: 'UNSUPPORTED_CONSTRUCT',
          message: 'Step-by-step tracing cannot follow an array index that changes a value at '
                 + 'the same time, like arr[i++]. Split it across two lines and it will trace.',
          line: s.line,
        };
      }
      /*
       * The NEW value only. The old one is gone by the time this runs, and capturing it would
       * need a statement before the assignment — legal only inside a block, which
       * `if (x) arr[0]=1;` is not. Reading the slot afterwards and calling that the previous
       * value would be a lie the UI animates a swap from, so it is left out; the schema marks
       * previousValue optional for exactly this reason.
       */
      insert(s.hi + 1,
             ` ${T}.awrite(${s.line},${jstr(scope)},${jstr(name)},${idxExpr},`
             + `${T}.v(${name}[${idxExpr}]));`,
             RANK.after, 'ARRAY_WRITE', s.line, s.hi - s.lo);
    } else if (/^[A-Za-z_$][\w$]*$/.test(lhs)) {
      insert(s.hi + 1, ` ${T}.assign(${s.line},${jstr(scope)},${jstr(lhs)},${T}.v(${lhs}));`,
             RANK.after, 'VARIABLE_ASSIGN', s.line, s.hi - s.lo);
    }
    /* A field or a nested subscript on the left is left un-reported rather than guessed at.
       The statement still runs; it simply produces no event. */
  }

  /* ── early returns ────────────────────────────────────────────────────────────────────
   * Braced unconditionally. `{ CBTrace.ret(...); return x; }` is a block, and a block is
   * legal anywhere a statement is — including as a bare `if (c) return;` body, where
   * inserting a bare statement before the return would move it outside the if.
   */
  for (const ret of findAll(cst, 'returnStatement')) {
    const s = span(ret);
    const scope = scopeAt(s.lo);
    insert(s.lo, `{ ${T}.ret(${s.line},${jstr(scope)}); `,
           RANK.open, 'METHOD_RETURN', s.line, s.hi - s.lo);
    insert(s.hi + 1, ' }', RANK.closeBody, 'METHOD_RETURN', s.line, s.hi - s.lo);
  }

  /* ── loops ────────────────────────────────────────────────────────────────────────── */
  let loopN = 0;
  const doLoop = (loop: Node, varName: string | null) => {
    const ls = span(loop);
    const scope = scopeAt(ls.lo);
    const id = `L${++loopN}`;
    const counter = `${T}_n${loopN}`;
    const bodyNode = (loop.children?.statement || [])[0];
    if (!bodyNode) return;
    const bs = span(bodyNode);
    const bodyText = src.slice(bs.lo, bs.hi + 1);
    const braced = bodyText.trimStart().startsWith('{');

    /* The counter and the enter event sit at the loop's own start, and share RANK.open with
       an enclosing body's brace so that width alone decides which comes first. */
    const w = ls.hi - ls.lo;
    insert(ls.lo, `int ${counter}=0; ${T}.loopEnter(${ls.line},${jstr(scope)},${jstr(id)}); `,
           RANK.open, 'LOOP_ENTER', ls.line, w);

    const iter = varName
      ? ` ${T}.iter(${ls.line},${jstr(scope)},${jstr(id)},++${counter},`
        + `${jstr(varName)},${T}.v(${varName}));`
      : ` ${T}.iter(${ls.line},${jstr(scope)},${jstr(id)},++${counter},null,null);`;

    if (braced) {
      insert(bs.lo + bodyText.indexOf('{') + 1, iter, RANK.open, 'LOOP_ITERATION', ls.line, w);
    } else {
      insert(bs.lo, `{${iter} `, RANK.open, 'LOOP_ITERATION', ls.line, w);
      insert(bs.hi + 1, ' }', RANK.closeBody, 'LOOP_ITERATION', bs.line, w);
    }
    /* closeAfter, so it lands outside this loop's own brace but inside any enclosing one. */
    insert(bs.hi + 1, ` ${T}.loopExit(${ls.line},${jstr(scope)},${jstr(id)});`,
           RANK.closeAfter, 'LOOP_EXIT', ls.line, w);
  };

  for (const loop of findAll(cst, 'basicForStatement')) {
    const init = (loop.children?.forInit || [])[0];
    const idNode = init ? findAll(init, 'variableDeclaratorId')[0] : undefined;
    doLoop(loop, idNode ? tokens(idNode)[0]?.image || null : null);
  }
  for (const loop of findAll(cst, 'enhancedForStatement')) {
    const idNode = findAll(loop, 'variableDeclaratorId')[0];
    doLoop(loop, idNode ? tokens(idNode)[0]?.image || null : null);
  }
  for (const loop of findAll(cst, 'whileStatement')) {
    doLoop(loop, null);
  }

  /* ── conditions ───────────────────────────────────────────────────────────────────────
   * Wrapped in place; the wrapper returns the same boolean. Operands are resolved only when
   * a textual split is provably right: exactly one comparison operator, and no && / || /
   * instanceof, whose lower precedence would make splitting at the comparison wrong.
   */
  for (const ifSt of findAll(cst, 'ifStatement')) {
    const cond = (ifSt.children?.expression || [])[0];
    if (!cond) continue;
    const cs = span(cond);
    const condText = src.slice(cs.lo, cs.hi + 1);
    const scope = scopeAt(cs.lo);
    const line = span(ifSt).line;

    const ops = tokens(cond).filter((t) => /^(<|>|<=|>=|==|!=|&&|\|\||instanceof)$/.test(t.image));
    const cmps = ops.filter((t) => /^(<|>|<=|>=|==|!=)$/.test(t.image));
    const logical = ops.some((t) => /^(&&|\|\||instanceof)$/.test(t.image));

    if (cmps.length === 1 && !logical) {
      const op = cmps[0];
      const l = src.slice(cs.lo, op.startOffset).trim();
      const r = src.slice(op.endOffset + 1, cs.hi + 1).trim();
      edit(cs.lo, cs.hi + 1,
           `${T}.cmp(${line},${jstr(scope)},${jstr(condText)},${l},${jstr(op.image)},${r})`,
           RANK.replace, 'CONDITION_EVALUATE', line, cs.hi - cs.lo);
    } else {
      edit(cs.lo, cs.hi + 1,
           `${T}.cond(${line},${jstr(scope)},${jstr(condText)},${condText})`,
           RANK.replace, 'CONDITION_EVALUATE', line, cs.hi - cs.lo);
    }
  }

  /* ── apply, left to right, over the original ──────────────────────────────────────────
   * Ranked so same-offset edits nest correctly. Closing edits at one offset are emitted
   * innermost-first, which is why their seq is compared in reverse.
   */
  const closing = (r: Rank) => r === RANK.closeBody || r === RANK.closeAfter;
  edits.sort((a, b) => {
    if (a.from !== b.from) return a.from - b.from;

    /* Everything that opens or replaces comes before everything that closes. */
    const ca = closing(a.rank), cb = closing(b.rank);
    if (ca !== cb) return ca ? 1 : -1;

    if (ca) {
      /*
       * CLOSING: nesting wins over category. Each construct, innermost outward, emits its
       * brace and THEN its trailing event — so an inner loop's exit lands inside the outer
       * loop's body, which is where it belongs: it fires once per outer pass.
       *
       * Ranking category first instead put every brace before every exit, which hoisted the
       * inner loop's exit outside the outer loop entirely. It compiled, and it lied.
       */
      return (a.width - b.width) || (a.rank - b.rank) || (a.seq - b.seq);
    }

    /* OPENING: category first, then widest construct, so an outer body opens before
       anything that belongs inside it. */
    return (a.rank - b.rank) || (b.width - a.width) || (a.seq - b.seq);
  });

  let out = '';
  let cursor = 0;
  for (const e of edits) {
    if (e.from < cursor) {
      /* Two replacements overlapping means the constructs overlap in a way this pass did not
         anticipate. Refusing beats emitting a program that is not the student's. */
      return {
        ok: false, reason: 'UNSUPPORTED_CONSTRUCT',
        message: 'This code combines constructs the tracer cannot rewrite safely together. '
               + 'Press Run to check your answer — it is still graded normally.',
        line: e.line,
      };
    }
    out += src.slice(cursor, e.from) + e.text;
    cursor = e.to;
  }
  out += src.slice(cursor);

  /* ── the invariant, asserted ─────────────────────────────────────────────────────── */
  if (out.split('\n').length !== lastLine) {
    return {
      ok: false, reason: 'LINE_SHIFT',
      message: 'This program could not be traced without moving its line numbers, which would '
             + 'highlight the wrong lines. Press Run to check your answer instead.',
    };
  }

  return {
    ok: true,
    source: out + '\n' + CB_TRACE_HARNESS,
    entryClass,
    lineCount: lastLine,
    injected: injected.sort((a, b) => a.line - b.line),
  };
}

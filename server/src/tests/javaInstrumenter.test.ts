/**
 * The Java instrumenter.
 *
 * Three properties matter more than the rest, and each of the first two was a real bug caught
 * only by running the output on the sandbox:
 *
 *   1. LINE NUMBERS NEVER MOVE. The instrumented body must have exactly as many lines as the
 *      student's, so every event's line is theirs by construction. A visualizer that highlights
 *      the wrong line teaches something untrue.
 *   2. NESTED CONSTRUCTS NEST. Injections that share a character offset must order by which
 *      construct encloses which. Getting it wrong produced Java that COMPILED and did something
 *      different from what the student wrote — the worst possible failure.
 *   3. UNSUPPORTED CODE IS REFUSED, never partially traced.
 *
 * The end-to-end proof is separate: instrumenting the acceptance program and running it on the
 * real sandbox produced 92 events, 15 comparisons, 18 array writes and the output
 * "2 3 5 8 10 12 ". These tests hold the pieces of that in place.
 */
import { instrumentJava, InstrumentOk } from '../services/visualizer/javaInstrumenter';
import { HARNESS_CLASS } from '../services/visualizer/cbTraceHarness';

const ACCEPTANCE = [
  'public class Main {',
  '  public static void main(String[] a){',
  '    int[] arr = {8,3,12,5,10,2};',
  '    for (int i=0;i<arr.length-1;i++)',
  '      for (int j=0;j<arr.length-i-1;j++)',
  '        if (arr[j]>arr[j+1]){int t=arr[j];arr[j]=arr[j+1];arr[j+1]=t;}',
  '    for (int v: arr) System.out.print(v+" ");',
  '  }',
  '}',
].join('\n');

/** The rewritten student code, with the appended harness removed. */
function body(r: InstrumentOk): string {
  return r.source.split('\n').slice(0, r.lineCount).join('\n');
}

function ok(src: string): InstrumentOk {
  const r = instrumentJava(src);
  if (r.ok !== true) throw new Error(`expected success, got ${r.reason}: ${r.message}`);
  return r;
}

/** Are braces balanced, counting only those outside string and char literals? */
function balanced(code: string): boolean {
  let depth = 0, inStr = false, inChar = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (inStr) { if (c === '\\') i++; else if (c === '"') inStr = false; continue; }
    if (inChar) { if (c === '\\') i++; else if (c === "'") inChar = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === "'") { inChar = true; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (depth < 0) return false; }
  }
  return depth === 0;
}

describe('line numbers never move', () => {
  it('keeps the student\'s line count exactly, on the acceptance program', () => {
    const r = ok(ACCEPTANCE);
    expect(r.lineCount).toBe(9);
    expect(body(r).split('\n')).toHaveLength(9);
  });

  it('leaves every line the student wrote on its own line', () => {
    /*
     * The whole design rests on this: if an injection contained a newline, every event after it
     * would cite a line the student is not looking at.
     *
     * Two lines here are REWRITTEN rather than only added to -- the `if` condition is wrapped and
     * `System.out.print` is replaced -- so those cannot match verbatim. Every other line must
     * still contain the student's own text exactly, at the same line number.
     */
    const r = ok(ACCEPTANCE);
    const before = ACCEPTANCE.split('\n');
    const after = body(r).split('\n');
    expect(after).toHaveLength(before.length);

    before.forEach((orig, i) => {
      const rewritten = /System\s*\.\s*out\s*\.|if\s*\(/.test(orig);
      if (rewritten) {
        /* Same line, and still indented the way the student indented it. */
        const indent = (orig.match(/^\s*/) || [''])[0];
        expect(after[i].startsWith(indent)).toBe(true);
      } else {
        expect(after[i]).toContain(orig.trim());
      }
    });
  });

  it('rewrites only the lines that have to be rewritten', () => {
    /*
     * A guard on the test above. If the rewrite ever spread to more lines than the two that
     * genuinely need it, that exemption would start hiding real breakage.
     */
    const r = ok(ACCEPTANCE);
    const before = ACCEPTANCE.split('\n');
    const after = body(r).split('\n');
    const verbatim = before.filter((orig, i) => after[i].includes(orig.trim())).length;
    expect(verbatim).toBe(before.length - 2);
  });

  it('holds for a single-statement loop body, which has to gain braces', () => {
    const src = [
      'public class Main {',
      '  public static void main(String[] a){',
      '    int[] arr = {3,1};',
      '    for (int i=0;i<2;i++)',
      '      System.out.print(arr[i]);',
      '  }',
      '}',
    ].join('\n');
    const r = ok(src);
    expect(r.lineCount).toBe(7);
    expect(body(r).split('\n')).toHaveLength(7);
  });

  it('holds for a bare while body', () => {
    const src = [
      'public class Main {',
      '  public static void main(String[] a){',
      '    int n = 8;',
      '    while (n > 1) n = n / 2;',
      '    System.out.print(n);',
      '  }',
      '}',
    ].join('\n');
    const r = ok(src);
    expect(body(r).split('\n')).toHaveLength(7);
  });
});

describe('nested constructs nest correctly', () => {
  it('produces balanced braces on the acceptance program', () => {
    expect(balanced(body(ok(ACCEPTANCE)))).toBe(true);
  });

  it('puts an inner loop\'s exit INSIDE the outer loop\'s body', () => {
    /*
     * THE BUG THIS GUARDS. Two nested single-statement loop bodies end at the same character,
     * and an earlier version emitted every closing brace before every loop-exit call — which
     * hoisted the inner loop's exit outside the outer loop entirely. It compiled, and it lied:
     * the inner loop appeared to finish once rather than once per outer pass.
     */
    const b = body(ok(ACCEPTANCE));
    const inner = b.indexOf(`${HARNESS_CLASS}.loopExit(5,`);
    const outer = b.indexOf(`${HARNESS_CLASS}.loopExit(4,`);
    expect(inner).toBeGreaterThan(-1);
    expect(outer).toBeGreaterThan(-1);
    expect(inner).toBeLessThan(outer);

    /* And the outer body's closing brace must sit between them. */
    const between = b.slice(inner, outer);
    expect(between).toContain('}');
  });

  it('opens the outer body before the inner loop\'s counter is declared', () => {
    /*
     * The mirror-image bug: the inner loop's counter was emitted before the outer loop's
     * opening brace, making that declaration the outer loop's entire body.
     */
    const b = body(ok(ACCEPTANCE));
    const outerIter = b.indexOf(`${HARNESS_CLASS}.iter(4,`);
    const innerCounter = b.indexOf(`int ${HARNESS_CLASS}_n2=0`);
    expect(outerIter).toBeGreaterThan(-1);
    expect(innerCounter).toBeGreaterThan(outerIter);
  });

  it('rewrites a print that shares an offset with a loop body', () => {
    /*
     * `for (int v: arr) System.out.print(...)` has the body starting exactly where the
     * statement to be rewritten starts. An insertion and a replacement at one offset used to
     * clobber each other, producing a call with the wrong arguments.
     */
    const b = body(ok(ACCEPTANCE));
    expect(b).toContain(`${HARNESS_CLASS}.out(7,"main",v+" ")`);
    expect(b).not.toContain('System.out.print');
  });
});

describe('what it records', () => {
  it('resolves a comparison\'s operands instead of just its text', () => {
    const b = body(ok(ACCEPTANCE));
    /* `arr[j]` and `arr[j+1]` passed separately is what lets the trace say "8 > 3". */
    expect(b).toContain(`${HARNESS_CLASS}.cmp(6,"main","arr[j]>arr[j+1]",arr[j],">",arr[j+1])`);
  });

  it('falls back to a result-only condition when a split would be wrong', () => {
    /*
     * `&&` binds looser than the comparisons, so splitting at either `>` or `<` would pair the
     * wrong operands. Reporting only the outcome is honest; a resolved string would not be.
     */
    const r = ok([
      'public class Main {',
      '  public static void main(String[] a){',
      '    int x = 3; int y = 1;',
      '    if (x > 1 && y < 2) System.out.print(x);',
      '  }',
      '}',
    ].join('\n'));
    expect(body(r)).toContain(`${HARNESS_CLASS}.cond(`);
    expect(body(r)).not.toContain(`${HARNESS_CLASS}.cmp(`);
  });

  it('uses cmp for a lone comparison even with arithmetic on one side', () => {
    /* `-` binds tighter than `<`, so splitting at `<` is provably correct here. */
    const r = ok([
      'public class Main {',
      '  public static void main(String[] a){',
      '    int i = 0; int n = 5;',
      '    if (i < n - 1) System.out.print(i);',
      '  }',
      '}',
    ].join('\n'));
    expect(body(r)).toContain(`${HARNESS_CLASS}.cmp(4,"main","i < n - 1",i,"<",n - 1)`);
  });

  it('reports an array write without inventing a previous value', () => {
    /*
     * The old value is gone by the time the report runs. Reading the slot again would report
     * the NEW value as the old one, and the UI animates a swap from that pair — so the field
     * is omitted rather than filled with a lie.
     */
    const b = body(ok(ACCEPTANCE));
    const call = /CBTrace\.awrite\(6,"main","arr",j,[^;]*\);/.exec(b);
    expect(call).not.toBeNull();
    expect(call![0].split(',').length).toBe(5);
  });

  it('brackets main with a start, a completion and a failure guard', () => {
    const b = body(ok(ACCEPTANCE));
    expect(b).toContain(`${HARNESS_CLASS}.start(1,"Main")`);
    expect(b).toContain(`${HARNESS_CLASS}.done(9,"Main")`);
    /* RuntimeException|Error, not Throwable: rethrowing a checked exception would need a
       `throws` clause the student has not written. */
    expect(b).toContain('catch (RuntimeException | Error');
    expect(b).toContain(`throw ${HARNESS_CLASS}_e;`);
  });

  it('braces an early return so it is safe as a bare if body', () => {
    /* `if (c) return;` cannot take a bare statement before the return — it would fall
       outside the if. A block is legal anywhere a statement is. */
    const r = ok([
      'public class Main {',
      '  public static void main(String[] a){',
      '    int x = 1;',
      '    if (x > 0) return;',
      '    System.out.print(x);',
      '  }',
      '}',
    ].join('\n'));
    expect(body(r)).toContain(`{ ${HARNESS_CLASS}.ret(4,"main"); return; }`);
    expect(balanced(body(r))).toBe(true);
  });

  it('appends the harness AFTER the student\'s class', () => {
    /* Java's single-file launcher runs the first class in the file. Harness first would fail
       with "can't find main method". */
    const r = ok(ACCEPTANCE);
    expect(r.source.indexOf('public class Main')).toBeLessThan(
      r.source.indexOf(`class ${HARNESS_CLASS} {`));
    expect(r.entryClass).toBe('Main');
  });

  it('reports what it instrumented', () => {
    const r = ok(ACCEPTANCE);
    const kinds = r.injected.reduce<Record<string, number>>((m, x) => {
      m[x.kind] = (m[x.kind] || 0) + 1; return m;
    }, {});
    expect(kinds.CONDITION_EVALUATE).toBe(1);
    expect(kinds.ARRAY_WRITE).toBe(2);
    expect(kinds.LOOP_ENTER).toBe(3);
    expect(kinds.STDOUT).toBe(1);
    /* Every entry cites a line inside the student's file. */
    expect(r.injected.every((x) => x.line >= 1 && x.line <= 9)).toBe(true);
  });
});

describe('it refuses rather than mislead', () => {
  const refuse = (src: string) => {
    const r = instrumentJava(src);
    if (r.ok !== false) throw new Error('expected a refusal');
    return r;
  };

  const wrap = (lines: string[]) => [
    'public class Main {', '  public static void main(String[] a){',
    ...lines, '  }', '}',
  ].join('\n');

  it('refuses code it cannot parse, and points at the compiler', () => {
    const r = refuse('public class Main { oops }');
    expect(r.reason).toBe('PARSE_ERROR');
    expect(r.message).toMatch(/Press Run/);
  });

  it.each([
    ['try / catch', '    try { int x=1; } catch (Exception e) {}', 'try / catch'],
    ['switch', '    int x=1; switch (x) { case 1: break; }', 'switch'],
    ['do-while', '    int x=1; do { x++; } while (x<3);', 'do-while'],
    ['new object', '    Object o = new Object();', 'new'],
    ['new array', '    int[] b = new int[3];', 'new'],
  ])('refuses %s', (_label, line, expected) => {
    const r = refuse(wrap([line]));
    expect(r.reason).toBe('UNSUPPORTED_CONSTRUCT');
    expect(r.message).toContain(expected);
    expect(r.line).toBeGreaterThan(0);
  });

  it('refuses an index that mutates while being read', () => {
    /* `arr[i++] = 5` — the index is evaluated a second time to report it, which would report
       the wrong slot. Refused rather than mis-reported. */
    const r = refuse(wrap(['    int[] arr={1,2}; int i=0;', '    arr[i++] = 5;']));
    expect(r.reason).toBe('UNSUPPORTED_CONSTRUCT');
    expect(r.message).toMatch(/arr\[i\+\+\]/);
  });

  it('refuses a program that already defines the harness class', () => {
    const r = refuse(`public class Main { } class ${HARNESS_CLASS} { }`);
    expect(r.reason).toBe('NAME_COLLISION');
    expect(r.message).toContain(HARNESS_CLASS);
  });

  it('refuses a program containing the sentinel, which could forge events', () => {
    const r = refuse(wrap(['    System.out.print("##CBTRACE##fake");']));
    expect(r.reason).toBe('NAME_COLLISION');
  });

  it('refuses a nested class but allows two side by side', () => {
    const nested = refuse('public class Main { class Inner {} public static void main(String[] a){} }');
    expect(nested.reason).toBe('UNSUPPORTED_CONSTRUCT');
    expect(nested.message).toContain('nested');

    const sideBySide = instrumentJava(
      'public class Main { public static void main(String[] a){ int x=1; } }\nclass Helper { }');
    expect(sideBySide.ok).toBe(true);
  });

  it('refuses empty input without throwing', () => {
    expect(refuse('').reason).toBe('PARSE_ERROR');
    expect(refuse('   \n  ').reason).toBe('PARSE_ERROR');
  });

  it('says what to do next in every refusal', () => {
    /* A dead end is not acceptable: the student must always be told they can still Run. */
    const messages = [
      refuse(wrap(['    try { int x=1; } catch (Exception e) {}'])).message,
      refuse('public class Main { oops }').message,
      refuse(wrap(['    int[] b = new int[3];'])).message,
    ];
    messages.forEach((m) => expect(m).toMatch(/Run/));
  });
});

describe('the generated Java is plausible Java', () => {
  it('never emits an unbalanced program for any supported shape', () => {
    const shapes = [
      ACCEPTANCE,
      'public class Main { public static void main(String[] a){ int x=1; x=x+1; System.out.print(x); } }',
      ['public class Main {', '  public static void main(String[] a){',
       '    int[] arr={5,2,9};', '    int max=arr[0];',
       '    for (int i=1;i<arr.length;i++)',
       '      if (arr[i]>max) max=arr[i];',
       '    System.out.println(max);', '  }', '}'].join('\n'),
      ['public class Main {', '  public static void main(String[] a){',
       '    int n=0;', '    while (n<3) { n=n+1; System.out.print(n); }',
       '  }', '}'].join('\n'),
    ];
    shapes.forEach((src, i) => {
      const r = instrumentJava(src);
      expect(r.ok).toBe(true);
      const b = body(r as InstrumentOk);
      expect(balanced(b)).toBe(true);
      /* No stray sentinel, and no leftover raw print. */
      expect(b).not.toContain('System.out.print');
      expect(b.split('\n')).toHaveLength(src.split('\n').length);
      /* Parentheses balance too, which catches a botched rewrite of a call. */
      const open = (b.match(/\(/g) || []).length;
      const close = (b.match(/\)/g) || []).length;
      expect(open).toBe(close);
    });
  });
});

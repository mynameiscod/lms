import { instrumentJava } from '../services/visualizer/javaInstrumenter';
import { VISUALIZER_SEED } from '../services/visualizer/visualizerSeed';
import { compileErrorLine, statsFor } from '../services/visualizer/visualizerService';
import { EventType, ExecutionEvent } from '../types/executionEvents';

describe('Code Visualizer seed library', () => {
  const programs = VISUALIZER_SEED.flatMap(s => [
    ...(s.solutionCode ? [[`${s.slug} solution`, s.solutionCode] as const] : []),
    ...(s.starterCode ? [[`${s.slug} starter`, s.starterCode] as const] : []),
  ]);

  it.each(programs)('%s instruments without refusal', (_name, code) => {
    const r = instrumentJava(code);
    expect(r.ok).toBe(true);
  });

  it('has unique slugs', () => {
    const slugs = VISUALIZER_SEED.map(s => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('gives every problem a full breakdown and complexity', () => {
    for (const s of VISUALIZER_SEED.filter(x => x.kind === 'problem')) {
      expect(s.breakdown?.plainEnglish).toBeTruthy();
      expect(s.breakdown?.walkthrough.length).toBeGreaterThan(0);
      expect(s.breakdown?.steps.length).toBeGreaterThan(0);
      expect(s.timeComplexity).toBeTruthy();
      expect(s.spaceComplexity).toBeTruthy();
    }
  });

  it('gives every concept a widget', () => {
    for (const s of VISUALIZER_SEED.filter(x => x.kind === 'concept')) {
      expect(s.conceptWidget).toBeTruthy();
    }
  });
});

describe('statsFor', () => {
  it('counts comparisons, writes, iterations and calls', () => {
    const ev = (eventType: string, sequence: number): ExecutionEvent =>
      ({ eventType, sequence, line: 1 } as ExecutionEvent);
    const s = statsFor([
      ev(EventType.METHOD_ENTER, 1), ev(EventType.LOOP_ITERATION, 2), ev(EventType.CONDITION_EVALUATE, 3),
      ev(EventType.ARRAY_WRITE, 4), ev(EventType.ARRAY_WRITE, 5), ev(EventType.CONDITION_EVALUATE, 6),
    ]);
    expect(s).toEqual({ steps: 6, comparisons: 2, arrayWrites: 2, loopIterations: 1, methodCalls: 1 });
  });
});

describe('compileErrorLine', () => {
  it('reads the line from a javac message', () => {
    expect(compileErrorLine("Main.java:7: error: ';' expected\n        int x = 5\n")).toBe(7);
  });
  it('returns undefined when there is no line', () => {
    expect(compileErrorLine('Compilation failed')).toBeUndefined();
  });
});

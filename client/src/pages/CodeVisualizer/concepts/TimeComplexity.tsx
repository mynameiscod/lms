import React, { useEffect, useMemo, useState } from 'react';

/**
 * Time complexity, made physical.
 *
 * The student drags n and watches five growth rates race. Bars are on a log scale because on a
 * linear one n² flattens everything else to zero and the lesson — that the others ALSO grow,
 * just differently — disappears. The "at 1 µs per step" column turns counts into waiting time,
 * which is the unit a student actually feels.
 *
 * Below it, a counting demo: n boxes, and each algorithm "touching" them in order, so O(n) vs
 * O(n²) is something you watch happen rather than a formula.
 */

const CLASSES = [
  { key: 'O(1)',       f: (_n: number) => 1,                                   color: 'var(--vz-c1)', eg: 'Read arr[0]' },
  { key: 'O(log n)',   f: (n: number) => Math.max(1, Math.ceil(Math.log2(n))), color: 'var(--vz-c2)', eg: 'Binary search' },
  { key: 'O(n)',       f: (n: number) => n,                                    color: 'var(--vz-c3)', eg: 'Find the maximum' },
  { key: 'O(n log n)', f: (n: number) => n * Math.max(1, Math.ceil(Math.log2(n))), color: 'var(--vz-c4)', eg: 'Merge sort' },
  { key: 'O(n²)',      f: (n: number) => n * n,                                color: 'var(--vz-c5)', eg: 'Bubble sort' },
];

const fmtTime = (steps: number) => {
  const us = steps; // 1 µs per step
  if (us < 1000) return `${us} µs`;
  if (us < 1e6) return `${(us / 1000).toFixed(us < 1e4 ? 1 : 0)} ms`;
  if (us < 6e7) return `${(us / 1e6).toFixed(1)} s`;
  if (us < 3.6e9) return `${(us / 6e7).toFixed(1)} min`;
  return `${(us / 3.6e9).toFixed(1)} hours`;
};

const STOPS = [1, 2, 5, 10, 20, 50, 100, 500, 1000, 10000, 100000, 1000000];

const TimeComplexity: React.FC = () => {
  const [stop, setStop] = useState(3);
  const n = STOPS[stop];
  const rows = useMemo(() => CLASSES.map(c => ({ ...c, steps: c.f(n) })), [n]);
  const maxLog = Math.log10(Math.max(...rows.map(r => r.steps)) + 1);

  /* Counting demo: a small fixed n, the algorithms step through it. */
  const DEMO_N = 6;
  const [demo, setDemo] = useState<'n' | 'n2'>('n');
  const total = demo === 'n' ? DEMO_N : DEMO_N * DEMO_N;
  const [tick, setTick] = useState(0);
  const [run, setRun] = useState(false);
  useEffect(() => { setTick(0); setRun(false); }, [demo]);
  useEffect(() => {
    if (!run) return;
    if (tick >= total) { setRun(false); return; }
    const t = window.setTimeout(() => setTick(x => x + 1), demo === 'n' ? 450 : 160);
    return () => window.clearTimeout(t);
  }, [run, tick, total, demo]);
  const outer = demo === 'n' ? tick - 1 : Math.floor((tick - 1) / DEMO_N);
  const inner = demo === 'n' ? -1 : (tick - 1) % DEMO_N;

  return (
    <div className="vz-concept">
      <section className="vz-card">
        <h3>How many steps for n items?</h3>
        <div className="vz-n-control">
          <label htmlFor="vz-n">n = <b>{n.toLocaleString()}</b></label>
          <input id="vz-n" type="range" min={0} max={STOPS.length - 1} value={stop}
            onChange={e => setStop(Number(e.target.value))} />
        </div>
        <div className="vz-growth">
          {rows.map(r => (
            <div key={r.key} className="vz-growth-row">
              <div className="vz-growth-label"><b>{r.key}</b><small>{r.eg}</small></div>
              <div className="vz-growth-track">
                <div className="vz-growth-bar" style={{
                  width: `${Math.max(1.5, (Math.log10(r.steps + 1) / (maxLog || 1)) * 100)}%`, background: r.color,
                }} />
              </div>
              <div className="vz-growth-num">{r.steps.toLocaleString()} <small>steps</small></div>
              <div className="vz-growth-time">{fmtTime(r.steps)}</div>
            </div>
          ))}
        </div>
        <p className="vz-muted">
          Bars use a log scale so every line stays visible. Time assumes one step takes 1 microsecond.
          At n = 1,000,000, O(n²) needs about <b>{fmtTime(1e12)}</b> — the same job O(n log n) finishes in
          about <b>{fmtTime(1e6 * 20)}</b>.
        </p>
      </section>

      <section className="vz-card">
        <h3>Watch the steps being counted</h3>
        <div className="vz-seg">
          <button className={`vz-seg-btn${demo === 'n' ? ' on' : ''}`} onClick={() => setDemo('n')}>One loop — O(n)</button>
          <button className={`vz-seg-btn${demo === 'n2' ? ' on' : ''}`} onClick={() => setDemo('n2')}>Loop inside a loop — O(n²)</button>
        </div>
        <pre className="vz-snippet">{demo === 'n'
          ? 'for (int i = 0; i < n; i++) {\n    look at arr[i];\n}'
          : 'for (int i = 0; i < n; i++) {\n    for (int j = 0; j < n; j++) {\n        compare arr[i] with arr[j];\n    }\n}'}</pre>
        <div className="vz-count-boxes">
          {Array.from({ length: DEMO_N }).map((_, i) => (
            <div key={i} className={`vz-count-box${i === outer ? ' outer' : ''}${i === inner ? ' inner' : ''}${
              demo === 'n' && i < tick ? ' done' : ''}`}>{i}</div>
          ))}
        </div>
        <div className="vz-count-actions">
          <button className="vz-btn vz-btn-primary" onClick={() => { if (tick >= total) setTick(0); setRun(r => !r); }}>
            {run ? '❚❚ Pause' : tick >= total ? '↺ Again' : '▶ Run'}
          </button>
          <span className="vz-count-big">{Math.max(0, tick)} <small>/ {total} steps</small></span>
          <span className="vz-muted">
            {demo === 'n' ? `n = ${DEMO_N} items → ${DEMO_N} steps.` : `n = ${DEMO_N} items → ${DEMO_N} × ${DEMO_N} = ${DEMO_N * DEMO_N} steps.`}
          </span>
        </div>
      </section>

      <section className="vz-card">
        <h3>The rules of thumb</h3>
        <ul className="vz-rules">
          <li><b>Drop constants.</b> 3n + 5 steps is still O(n): at large n, only the shape of growth matters.</li>
          <li><b>Keep the biggest term.</b> n² + n is O(n²): the n becomes irrelevant as n grows.</li>
          <li><b>A loop over n is O(n).</b> A loop inside a loop over n is O(n²).</li>
          <li><b>Halving each step is O(log n).</b> 1,000,000 items take only about 20 halvings.</li>
          <li><b>Worst case is the usual promise.</b> Linear search may find the target first try, but we quote the case where it is last.</li>
        </ul>
      </section>
    </div>
  );
};

export default TimeComplexity;

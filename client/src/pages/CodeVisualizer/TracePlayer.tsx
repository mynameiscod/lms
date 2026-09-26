import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Frame } from './traceModel';
import ArrayView from './ArrayView';
import { VzAnimation } from '../../api/visualizerApi';

/**
 * Steps through a recorded run. Everything is computed from `frames` up front, so moving the
 * slider or pressing ◀ is instant and never touches the server.
 */

interface Props {
  frames: Frame[];
  animation: VzAnimation;
  timeComplexity?: string;
  onFrame: (f: Frame | null) => void;
}

const POINTER_NAMES = new Set(['i', 'j', 'k', 'l', 'r', 'lo', 'hi', 'low', 'high', 'mid', 'left', 'right', 'start', 'end', 'p', 'q']);

/** What the stated Big-O predicts for this n, so the student can hold it next to the real count. */
export function predicted(bigO: string, n: number): { label: string; value: number } | null {
  const s = (bigO || '').replace(/\s+/g, '').toLowerCase();
  if (!n || n < 1) return null;
  const log = Math.max(1, Math.ceil(Math.log2(n)));
  if (s.includes('o(1)')) return { label: '1', value: 1 };
  if (s.includes('o(nlogn)')) return { label: 'n·log₂n', value: n * log };
  if (s.includes('o(logn)')) return { label: 'log₂n', value: log };
  if (s.includes('o(n²)') || s.includes('o(n^2)') || s.includes('o(n*n)')) return { label: 'n²', value: n * n };
  if (s.includes('o(n)')) return { label: 'n', value: n };
  return null;
}

const SPEEDS = [
  { label: '0.5×', ms: 1400 },
  { label: '1×', ms: 700 },
  { label: '2×', ms: 350 },
  { label: '4×', ms: 150 },
];

const TracePlayer: React.FC<Props> = ({ frames, animation, timeComplexity, onFrame }) => {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<number | null>(null);
  const last = frames.length - 1;
  const f = frames[Math.min(pos, last)];

  useEffect(() => { setPos(0); setPlaying(false); }, [frames]);
  useEffect(() => { onFrame(f || null); }, [f, onFrame]);

  useEffect(() => {
    if (!playing) return;
    if (pos >= last) { setPlaying(false); return; }
    timer.current = window.setTimeout(() => setPos(p => Math.min(last, p + 1)), SPEEDS[speed].ms);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [playing, pos, last, speed]);

  const go = useCallback((p: number) => { setPlaying(false); setPos(Math.max(0, Math.min(last, p))); }, [last]);

  /* Arrow keys step, space plays — but never while the student is typing in the editor. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest('.monaco-editor') || /INPUT|TEXTAREA|SELECT/.test(t?.tagName || '')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(pos + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(pos - 1); }
      else if (e.key === ' ') { e.preventDefault(); setPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, pos]);

  const arrays = useMemo(() => Object.entries(f?.arrays || {}), [f]);
  const firstLen = arrays[0]?.[1]?.length || 0;
  const pred = predicted(timeComplexity || '', firstLen);
  const end = frames[last];

  if (!f) return null;

  const pointersFor = (len: number) => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(f.vars)) {
      if (!POINTER_NAMES.has(k) || !/^-?\d+$/.test(v)) continue;
      const n = Number(v);
      if (n >= 0 && n < len) out[k] = n;
    }
    return out;
  };

  const kind = f.event.eventType;
  const tone = kind === 'EXCEPTION' ? 'bad'
    : kind === 'CONDITION_EVALUATE' ? (f.event.result ? 'yes' : 'no')
    : kind === 'ARRAY_WRITE' ? 'write' : '';

  return (
    <div className="vz-player">
      <div className="vz-controls">
        <button className="vz-icon-btn" onClick={() => go(0)} title="First step" aria-label="First step">⏮</button>
        <button className="vz-icon-btn" onClick={() => go(pos - 1)} title="Previous step (←)" aria-label="Previous step">◀</button>
        <button className="vz-btn vz-btn-primary vz-play" onClick={() => { if (pos >= last) setPos(0); setPlaying(p => !p); }}>
          {playing ? '❚❚ Pause' : pos >= last ? '↺ Replay' : '▶ Play'}
        </button>
        <button className="vz-icon-btn" onClick={() => go(pos + 1)} title="Next step (→)" aria-label="Next step">▶</button>
        <button className="vz-icon-btn" onClick={() => go(last)} title="Last step" aria-label="Last step">⏭</button>
        <select className="vz-speed" value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Speed">
          {SPEEDS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
        </select>
        <span className="vz-step-count">Step {pos + 1} / {frames.length}</span>
      </div>
      <input className="vz-slider" type="range" min={0} max={last} value={pos}
        onChange={e => go(Number(e.target.value))} aria-label="Timeline" />

      <div className={`vz-narration ${tone}`}>
        <span className="vz-line-chip">Line {f.line}</span>
        <span>{f.narration}</span>
      </div>
      {kind === 'EXCEPTION' && f.event.explanation && (
        <div className="vz-explain">💡 {f.event.explanation}</div>
      )}

      {animation !== 'none' && arrays.map(([name, values]) => (
        <ArrayView key={name} name={name} values={values}
          mode={animation === 'array_cells' ? 'array_cells' : 'array_bars'}
          compare={f.compare.filter(c => c.name === name).map(c => c.index)}
          written={f.written.filter(w => w.name === name).map(w => w.index)}
          pointers={pointersFor(values.length)} />
      ))}

      <div className="vz-panels">
        <div className="vz-panel">
          <div className="vz-panel-title">Variables</div>
          {Object.keys(f.vars).length === 0 ? <div className="vz-muted">None yet.</div> : (
            <table className="vz-vars">
              <tbody>
                {Object.entries(f.vars).map(([k, v]) => (
                  <tr key={k} className={f.changed.includes(k) ? 'is-changed' : ''}>
                    <td className="k">{k}</td><td className="v">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="vz-panel">
          <div className="vz-panel-title">Call stack</div>
          {f.callStack.length === 0 ? <div className="vz-muted">Empty.</div> : (
            <div className="vz-stack">
              {[...f.callStack].reverse().map((s, i) => (
                <div key={i} className={`vz-stack-frame${i === 0 ? ' top' : ''}`}>{s}()</div>
              ))}
            </div>
          )}
        </div>
        <div className="vz-panel">
          <div className="vz-panel-title">Work done so far</div>
          <div className="vz-ops">
            <div><b>{f.ops.comparisons}</b><span>comparisons</span></div>
            <div><b>{f.ops.writes}</b><span>array writes</span></div>
            <div><b>{f.ops.iterations}</b><span>loop passes</span></div>
          </div>
          {pred && end && (
            <div className="vz-predict">
              Stated <b>{timeComplexity}</b> for n = {firstLen} → about <b>{pred.label} = {pred.value}</b> steps.
              {' '}This run made <b>{end.ops.iterations}</b> loop passes and <b>{end.ops.comparisons}</b> comparisons in total.
            </div>
          )}
        </div>
      </div>

      <div className="vz-panel">
        <div className="vz-panel-title">Output</div>
        <pre className="vz-console">{f.output || <span className="vz-muted">Nothing printed yet.</span>}</pre>
      </div>
    </div>
  );
};

export default TracePlayer;

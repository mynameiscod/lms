import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Frame } from './traceModel';
import ArrayView from './ArrayView';
import { VzAnimation } from '../../api/visualizerApi';

/**
 * Steps through a recorded run. Everything is computed from `frames` up front, so moving the
 * slider or pressing a step button is instant and never touches the server.
 */

interface Props {
  frames: Frame[];
  animation: VzAnimation;
  timeComplexity?: string;
  onFrame: (f: Frame | null) => void;
  /** The workspace shows the step count in its card header; embedded players show it here. */
  showStepCount?: boolean;
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

const CopyOutput: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { /* clipboard refused */ }
  };
  return (
    <div className="vz-console-wrap">
      <pre className="vz-console">{text || <span className="vz-console-empty">Nothing printed yet.</span>}</pre>
      {!!text && (
        <button type="button" className="vz-copy on-dark" onClick={copy} aria-label="Copy output" title={copied ? 'Copied' : 'Copy'}>
          <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden />
        </button>
      )}
    </div>
  );
};

const TracePlayer: React.FC<Props> = ({ frames, animation, timeComplexity, onFrame, showStepCount }) => {
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
      if (t?.closest('.monaco-editor') || /INPUT|TEXTAREA|SELECT|BUTTON/.test(t?.tagName || '')) return;
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
  const toneIcon = tone === 'bad' ? 'fa-circle-xmark' : tone === 'yes' ? 'fa-circle-check'
    : tone === 'no' ? 'fa-circle-minus' : tone === 'write' ? 'fa-pen' : 'fa-circle-info';

  return (
    <div className="vz-player">
      <div className="vz-controls">
        <button className="vz-sq-btn" onClick={() => go(0)} title="First step" aria-label="First step"><i className="fa-solid fa-backward-step" aria-hidden /></button>
        <button className="vz-sq-btn" onClick={() => go(pos - 1)} title="Previous step (←)" aria-label="Previous step"><i className="fa-solid fa-caret-left" aria-hidden /></button>
        <button className="vz-play" onClick={() => { if (pos >= last) setPos(0); setPlaying(p => !p); }}>
          <i className={`fa-solid ${playing ? 'fa-pause' : pos >= last ? 'fa-rotate-left' : 'fa-play'}`} aria-hidden />
          {playing ? 'Pause' : pos >= last ? 'Replay' : 'Play'}
        </button>
        <button className="vz-sq-btn" onClick={() => go(pos + 1)} title="Next step (→)" aria-label="Next step"><i className="fa-solid fa-caret-right" aria-hidden /></button>
        <button className="vz-sq-btn" onClick={() => go(last)} title="Last step" aria-label="Last step"><i className="fa-solid fa-forward-step" aria-hidden /></button>
        {showStepCount && <span className="vz-step-count">Step {pos + 1} / {frames.length}</span>}
        <label className="vz-speed">
          <select value={speed} onChange={e => setSpeed(Number(e.target.value))} aria-label="Playback speed">
            {SPEEDS.map((s, i) => <option key={s.label} value={i}>{s.label}</option>)}
          </select>
          <i className="fa-solid fa-chevron-down caret" aria-hidden />
        </label>
      </div>
      <input className="vz-slider" type="range" min={0} max={last} value={pos}
        style={{ ['--vz-progress' as any]: `${last > 0 ? (pos / last) * 100 : 100}%` }}
        onChange={e => go(Number(e.target.value))} aria-label="Timeline" />

      <div className={`vz-narration ${tone}`}>
        <i className={`fa-solid ${toneIcon} vz-narr-icon`} aria-hidden />
        <span className="vz-line-chip">Line {f.line}</span>
        <span className="vz-narr-text">{f.narration}</span>
      </div>
      {kind === 'EXCEPTION' && f.event.explanation && (
        <div className="vz-explain"><i className="fa-regular fa-lightbulb" aria-hidden /> {f.event.explanation}</div>
      )}

      {animation !== 'none' && arrays.map(([name, values]) => (
        <ArrayView key={name} name={name} values={values}
          mode={animation === 'array_cells' ? 'array_cells' : 'array_bars'}
          compare={f.compare.filter(c => c.name === name).map(c => c.index)}
          written={f.written.filter(w => w.name === name).map(w => w.index)}
          pointers={pointersFor(values.length)} />
      ))}

      <div className="vz-panels">
        <div className="vz-mini">
          <div className="vz-mini-title"><i className="fa-solid fa-database" aria-hidden /> Variables</div>
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
        <div className="vz-mini">
          <div className="vz-mini-title"><i className="fa-solid fa-layer-group" aria-hidden /> Call Stack</div>
          {f.callStack.length === 0 ? <div className="vz-muted">Empty.</div> : (
            <div className="vz-stack">
              {[...f.callStack].reverse().map((s, i) => (
                <div key={i} className={`vz-stack-frame${i === 0 ? ' top' : ''}`}>{s}()</div>
              ))}
            </div>
          )}
        </div>
        <div className="vz-mini">
          <div className="vz-mini-title"><i className="fa-solid fa-chart-pie" aria-hidden /> Work Done So Far</div>
          <div className="vz-ops">
            <div><b>{f.ops.comparisons}</b><span>comparisons</span></div>
            <div><b>{f.ops.writes}</b><span>array writes</span></div>
            <div><b>{f.ops.iterations}</b><span>loop passes</span></div>
          </div>
          {pred && end && (
            <p className="vz-predict">
              Stated <b>{timeComplexity}</b> for n = {firstLen} → about <b>{pred.label} = {pred.value}</b> steps.
              {' '}This run made <b>{end.ops.iterations}</b> loop passes and <b>{end.ops.comparisons}</b> comparisons in total.
            </p>
          )}
        </div>
      </div>

      <div className="vz-output">
        <div className="vz-mini-title"><i className="fa-solid fa-terminal" aria-hidden /> Output</div>
        <CopyOutput text={f.output} />
      </div>
    </div>
  );
};

export default TracePlayer;

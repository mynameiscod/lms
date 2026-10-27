import React, { useCallback, useEffect, useRef, useState } from 'react';
import './splitWorkspace.css';

/**
 * A problem panel and a code editor side by side, with the split under the student's control.
 *
 * Every practice screen hard-coded its columns, so a long statement squeezed the editor and a long
 * program squeezed the statement. Here the student can drag the divider, minimise either side to a
 * slim rail (and bring it back), or reset with a double-click — and the choice is remembered per
 * screen.
 *
 * ZOOM-SAFE. CareerPilot renders #root at zoom 0.75, so pointer coordinates and CSS pixels disagree.
 * The split is kept as a PERCENTAGE of the container measured with getBoundingClientRect — the same
 * coordinate space as the pointer — so the divider stays under the cursor at any zoom.
 *
 * NON-INVASIVE. The page keeps its own container class and its own responsive CSS. The columns are
 * applied through a CSS variable and the `sw-on` class only while the layout is side by side, so
 * every page's "stack on small screens" media query keeps working untouched; on a stacked layout a
 * small switcher lets the student hide either half instead.
 */

type Mode = 'split' | 'left' | 'right';            // left = question only, right = code only
interface Saved { pct: number; mode: Mode }

const DEFAULT_PCT = 46;
const MIN_PCT = 22, MAX_PCT = 78;
const RAIL = 46;

const read = (key: string, fallback: number): Saved => {
  try {
    const s = JSON.parse(localStorage.getItem(`sw:${key}`) || 'null');
    if (s && typeof s.pct === 'number' && ['split', 'left', 'right'].includes(s.mode)) return { pct: Math.min(MAX_PCT, Math.max(MIN_PCT, s.pct)), mode: s.mode };
  } catch { /* storage unavailable */ }
  return { pct: fallback, mode: 'split' };
};
const write = (key: string, v: Saved) => { try { localStorage.setItem(`sw:${key}`, JSON.stringify(v)); } catch { /* ignore */ } };

export interface SplitWorkspaceProps {
  /** Remembers this screen's split, e.g. 'cp-practice'. */
  storageKey: string;
  /** The page's own container class(es) — kept, so its height, gap and media queries still apply. */
  className?: string;
  /** The viewport width (px) at or below which the page's CSS stacks the two panes. */
  stackBelow: number;
  left: React.ReactNode;
  right: React.ReactNode;
  leftLabel?: string;
  rightLabel?: string;
  /** Starting share of the left pane, in percent. */
  defaultPct?: number;
}

const SplitWorkspace: React.FC<SplitWorkspaceProps> = ({
  storageKey, className = '', stackBelow, left, right, leftLabel = 'Question', rightLabel = 'Code', defaultPct = DEFAULT_PCT,
}) => {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<Saved>(() => read(storageKey, defaultPct));
  const [stacked, setStacked] = useState(() => typeof window !== 'undefined' && window.matchMedia(`(max-width: ${stackBelow}px)`).matches);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${stackBelow}px)`);
    const on = () => setStacked(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, [stackBelow]);

  const update = useCallback((next: Partial<Saved>) => setState(prev => {
    const v = { ...prev, ...next };
    write(storageKey, v);
    return v;
  }), [storageKey]);

  const pctAt = (clientX: number): number => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !r.width) return state.pct;
    return ((clientX - r.left) / r.width) * 100;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    if (state.mode !== 'split') update({ mode: 'split' });
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const p = pctAt(e.clientX);
    if (p < 10) return update({ mode: 'right' });
    if (p > 90) return update({ mode: 'left' });
    update({ mode: 'split', pct: Math.min(MAX_PCT, Math.max(MIN_PCT, p)) });
  };
  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* already released */ }
    setDragging(false);
  };
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 10 : 4;
    if (e.key === 'ArrowLeft') { e.preventDefault(); update({ mode: 'split', pct: Math.max(MIN_PCT, state.pct - step) }); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); update({ mode: 'split', pct: Math.min(MAX_PCT, state.pct + step) }); }
    else if (e.key === 'Home') { e.preventDefault(); update({ mode: 'right' }); }
    else if (e.key === 'End') { e.preventDefault(); update({ mode: 'left' }); }
    else if (e.key === 'Enter') { e.preventDefault(); update({ mode: 'split', pct: defaultPct }); }
  };

  const { mode, pct } = state;
  const cols = mode === 'right' ? `${RAIL}px 12px minmax(0, 1fr)`
    : mode === 'left' ? `minmax(0, 1fr) 12px ${RAIL}px`
      : `minmax(0, ${pct}fr) 12px minmax(0, ${100 - pct}fr)`;

  const switcher = (
    <div className="sw-switch" role="group" aria-label="Layout">
      <button type="button" className={mode === 'left' ? 'on' : ''} onClick={() => update({ mode: 'left' })} title={`${leftLabel} only`} aria-pressed={mode === 'left'}>
        <i className="fa-regular fa-file-lines" /> <span>{leftLabel}</span>
      </button>
      <button type="button" className={mode === 'split' ? 'on' : ''} onClick={() => update({ mode: 'split' })} title="Both side by side" aria-pressed={mode === 'split'}>
        <i className="fa-solid fa-table-columns" /> <span>Both</span>
      </button>
      <button type="button" className={mode === 'right' ? 'on' : ''} onClick={() => update({ mode: 'right' })} title={`${rightLabel} only`} aria-pressed={mode === 'right'}>
        <i className="fa-solid fa-code" /> <span>{rightLabel}</span>
      </button>
    </div>
  );

  const rail = (side: 'left' | 'right', label: string) => (
    <button type="button" className={`sw-rail sw-rail-${side}`} onClick={() => update({ mode: 'split' })} title={`Show the ${label.toLowerCase()} again`}>
      <i className={`fa-solid ${side === 'left' ? 'fa-angles-right' : 'fa-angles-left'}`} />
      <span>{label}</span>
    </button>
  );

  if (stacked) {
    return <div className="sw-stacked-wrap">
      <div className="sw-stacked-bar">{switcher}</div>
      <div ref={box} className={`${className} sw sw-stacked m-${mode}`}>
        <div className={`sw-pane sw-left${mode === 'right' ? ' sw-hidden' : ''}`}>{left}</div>
        <div className={`sw-pane sw-right${mode === 'left' ? ' sw-hidden' : ''}`}>{right}</div>
      </div>
    </div>;
  }

  return <div ref={box} className={`${className} sw sw-on m-${mode}${dragging ? ' sw-dragging' : ''}`}
    style={{ ['--sw-cols' as any]: cols }}>
    <div className={`sw-pane sw-left${mode === 'right' ? ' sw-collapsed' : ''}`}>
      {mode === 'right' && rail('left', leftLabel)}
      <div className="sw-body">{left}</div>
    </div>
    <div className="sw-handle" role="separator" aria-orientation="vertical" tabIndex={0}
      aria-label={`Resize ${leftLabel.toLowerCase()} and ${rightLabel.toLowerCase()}. Arrow keys resize, Home and End minimise, Enter resets.`}
      aria-valuemin={MIN_PCT} aria-valuemax={MAX_PCT} aria-valuenow={Math.round(mode === 'split' ? pct : mode === 'left' ? 100 : 0)}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
      onDoubleClick={() => update({ mode: 'split', pct: defaultPct })} onKeyDown={onKey}>
      <div className="sw-handle-tools">
        <button type="button" onClick={() => update(mode === 'left' ? { mode: 'split' } : { mode: 'right' })}
          title={mode === 'left' ? 'Show both' : `Minimise the ${leftLabel.toLowerCase()}`} aria-label={mode === 'left' ? 'Show both' : `Minimise the ${leftLabel.toLowerCase()}`}>
          <i className="fa-solid fa-chevron-left" />
        </button>
        <button type="button" onClick={() => update(mode === 'right' ? { mode: 'split' } : { mode: 'left' })}
          title={mode === 'right' ? 'Show both' : `Minimise the ${rightLabel.toLowerCase()}`} aria-label={mode === 'right' ? 'Show both' : `Minimise the ${rightLabel.toLowerCase()}`}>
          <i className="fa-solid fa-chevron-right" />
        </button>
      </div>
      <span className="sw-grip" aria-hidden="true" />
    </div>
    <div className={`sw-pane sw-right${mode === 'left' ? ' sw-collapsed' : ''}`}>
      {mode === 'left' && rail('right', rightLabel)}
      <div className="sw-body">{right}</div>
    </div>
  </div>;
};

export default SplitWorkspace;

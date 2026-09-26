import React, { useEffect, useState } from 'react';
import { VzBreakdown } from '../../api/visualizerApi';

/**
 * The same problem, split several ways.
 *
 * Most students who "cannot solve" a problem have not understood it yet, so this comes before
 * any code. Each view is a different way in; the step-based ones reveal one step per click so
 * the student reads a step before the next one arrives, instead of skimming a wall of text.
 */

type ViewKey = 'plain' | 'io' | 'walk' | 'plan' | 'edge';

const VIEWS: { key: ViewKey; label: string; icon: string; hint: string }[] = [
  { key: 'plain', label: 'Plain English', icon: '💬', hint: 'The problem, retold without jargon.' },
  { key: 'io',    label: 'Input → Output', icon: '🔁', hint: 'What you are given and what you must produce.' },
  { key: 'walk',  label: 'Walk an example', icon: '👣', hint: 'One example solved by hand, a step at a time.' },
  { key: 'plan',  label: 'Plan the steps', icon: '🧭', hint: 'The approach in order — the plan, not the code.' },
  { key: 'edge',  label: 'Edge cases', icon: '⚠️', hint: 'What a first attempt usually forgets.' },
];

const Reveal: React.FC<{ items: string[]; numbered?: boolean }> = ({ items, numbered }) => {
  const [shown, setShown] = useState(1);
  useEffect(() => { setShown(1); }, [items]);
  if (!items.length) return <p className="vz-muted">Nothing here yet for this problem.</p>;
  return (
    <div>
      <ol className={`vz-reveal${numbered ? '' : ' plain'}`}>
        {items.slice(0, shown).map((t, i) => <li key={i} className="vz-reveal-item">{t}</li>)}
      </ol>
      <div className="vz-reveal-actions">
        {shown < items.length ? (
          <>
            <button className="vz-btn vz-btn-primary" onClick={() => setShown(s => s + 1)}>Next step →</button>
            <button className="vz-btn" onClick={() => setShown(items.length)}>Show all</button>
          </>
        ) : items.length > 1 ? (
          <button className="vz-btn" onClick={() => setShown(1)}>↺ Start over</button>
        ) : null}
        <span className="vz-muted">{Math.min(shown, items.length)} / {items.length}</span>
      </div>
    </div>
  );
};

const ProblemBreakdown: React.FC<{ breakdown: VzBreakdown }> = ({ breakdown }) => {
  const [view, setView] = useState<ViewKey>('plain');
  const active = VIEWS.find(v => v.key === view)!;

  return (
    <div className="vz-breakdown">
      <div className="vz-seg" role="tablist" aria-label="Ways to break the problem down">
        {VIEWS.map(v => (
          <button key={v.key} role="tab" aria-selected={view === v.key}
            className={`vz-seg-btn${view === v.key ? ' on' : ''}`} onClick={() => setView(v.key)}>
            <span aria-hidden>{v.icon}</span> {v.label}
          </button>
        ))}
      </div>
      <p className="vz-muted vz-seg-hint">{active.hint}</p>

      <div className="vz-breakdown-body">
        {view === 'plain' && <p className="vz-lead">{breakdown.plainEnglish || 'Not written yet.'}</p>}
        {view === 'io' && (
          <div className="vz-io">
            <div className="vz-io-box"><div className="vz-io-label">You get</div><div>{breakdown.input || '—'}</div></div>
            <div className="vz-io-arrow" aria-hidden>→</div>
            <div className="vz-io-box"><div className="vz-io-label">You return</div><div>{breakdown.output || '—'}</div></div>
          </div>
        )}
        {view === 'walk' && <Reveal items={breakdown.walkthrough || []} numbered />}
        {view === 'plan' && <Reveal items={breakdown.steps || []} numbered />}
        {view === 'edge' && <Reveal items={breakdown.edgeCases || []} />}
      </div>
    </div>
  );
};

export default ProblemBreakdown;

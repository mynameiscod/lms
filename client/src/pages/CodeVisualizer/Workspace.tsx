import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import visualizerApi, { VzItem, VzRunResult, vzError } from '../../api/visualizerApi';
import { buildFrames, Frame } from './traceModel';
import TracePlayer from './TracePlayer';
import ProblemBreakdown from './ProblemBreakdown';
import { CONCEPT_WIDGETS } from './concepts';
import './CodeVisualizer.css';

/** The same page serves the LMS (/visualizer) and CareerPilot (/careerpilot/visualizer). */
export const useVzBase = () => {
  const { pathname } = useLocation();
  return pathname.startsWith('/careerpilot') ? '/careerpilot/visualizer' : '/visualizer';
};

type LeftTab = 'problem' | 'breakdown' | 'complexity';

const draftKey = (slug: string) => `vz-draft:${slug}`;
const readDraft = (slug: string): string | null => {
  try { return localStorage.getItem(draftKey(slug)); } catch { return null; }
};
const writeDraft = (slug: string, code: string) => {
  try { localStorage.setItem(draftKey(slug), code); } catch { /* storage unavailable — draft just isn't kept */ }
};

const Workspace: React.FC = () => {
  const { slug = '' } = useParams();
  const base = useVzBase();
  const [item, setItem] = useState<VzItem | null>(null);
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<LeftTab>('problem');
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<VzRunResult | null>(null);
  const [runError, setRunError] = useState('');
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoRef = useRef<string[]>([]);
  const [frame, setFrame] = useState<Frame | null>(null);

  useEffect(() => {
    let alive = true;
    setItem(null); setLoadError(''); setResult(null); setTab('problem');
    visualizerApi.get(slug)
      .then(it => {
        if (!alive) return;
        setItem(it);
        setCode(readDraft(slug) ?? it.starterCode ?? '');
      })
      .catch(e => alive && setLoadError(vzError(e, 'This item could not be loaded.')));
    return () => { alive = false; };
  }, [slug]);

  const frames = useMemo(() => (result?.events?.length ? buildFrames(result.events) : []), [result]);

  const onFrame = useCallback((f: Frame | null) => setFrame(f), []);

  /* Highlight the executing line, and the error line when there is one. */
  useEffect(() => {
    const ed = editorRef.current, monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const decos: any[] = [];
    if (frame?.line) {
      const isErr = frame.event.eventType === 'EXCEPTION';
      decos.push({ range: new monaco.Range(frame.line, 1, frame.line, 1), options: { isWholeLine: true, className: isErr ? 'vz-err-line' : 'vz-cur-line', glyphMarginClassName: isErr ? 'vz-err-glyph' : 'vz-cur-glyph' } });
      try { ed.revealLineInCenterIfOutsideViewport(frame.line); } catch { /* editor gone */ }
    } else if (result && !result.ok && result.line && !frames.length) {
      decos.push({ range: new monaco.Range(result.line, 1, result.line, 1), options: { isWholeLine: true, className: 'vz-err-line', glyphMarginClassName: 'vz-err-glyph' } });
      try { ed.revealLineInCenterIfOutsideViewport(result.line); } catch { /* editor gone */ }
    }
    decoRef.current = ed.deltaDecorations(decoRef.current, decos);
  }, [frame, result, frames.length]);

  const visualize = async () => {
    if (!code.trim()) return;
    setRunning(true); setRunError(''); setResult(null); setFrame(null);
    try {
      setResult(await visualizerApi.run(code, item?.language || 'java', item?.stdin || ''));
    } catch (e) {
      setRunError(vzError(e, 'The visualizer could not run this program. Please try again.'));
    } finally {
      setRunning(false);
    }
  };

  const onEdit = (v?: string) => {
    const next = v ?? '';
    setCode(next);
    writeDraft(slug, next);
    /* A trace belongs to the code that produced it; editing makes it stale. */
    if (result) { setResult(null); setFrame(null); }
  };

  const reset = () => { if (item && window.confirm('Replace your code with the starter code?')) onEdit(item.starterCode || ''); };
  const loadSolution = () => {
    if (item?.solutionCode && window.confirm('Load the reference solution? Your current code will be replaced.')) onEdit(item.solutionCode);
  };

  if (loadError) {
    return (
      <div className="vz-root"><div className="vz-empty">
        <p>{loadError}</p><Link className="vz-btn" to={base}>← Back to the library</Link>
      </div></div>
    );
  }
  if (!item) return <div className="vz-root"><div className="vz-empty">Loading…</div></div>;

  const header = (
    <div className="vz-head">
      <Link to={base} className="vz-back">← Library</Link>
      <h1>{item.title}</h1>
      <span className={`vz-chip d-${item.difficulty}`}>{item.difficulty}</span>
      <span className="vz-chip">{item.topic}</span>
      {item.timeComplexity && <span className="vz-chip mono">Time {item.timeComplexity}</span>}
      {item.spaceComplexity && <span className="vz-chip mono">Space {item.spaceComplexity}</span>}
    </div>
  );

  if (item.kind === 'concept') {
    const W = CONCEPT_WIDGETS[item.conceptWidget || ''];
    return (
      <div className="vz-root">
        {header}
        {item.body && <div className="vz-card vz-concept-intro">{item.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>}
        {W ? <W.component /> : <div className="vz-card vz-muted">This concept's animation is not available yet.</div>}
      </div>
    );
  }

  const errorBox = result && !result.ok && (
    <div className={`vz-error ${result.errorType === 'RUNTIME_ERROR' || result.errorType === 'COMPILE_ERROR' ? 'yours' : 'ours'}`}>
      <div className="vz-error-title">
        {result.errorType === 'COMPILE_ERROR' ? '🛠 Compile error'
          : result.errorType === 'RUNTIME_ERROR' ? '💥 Your program crashed'
          : result.errorType === 'UNSUPPORTED_CONSTRUCT' ? '🚧 Not traceable yet'
          : '⚠️ Could not visualize'}
        {result.line ? <span className="vz-line-chip">Line {result.line}</span> : null}
      </div>
      <div>{result.message}</div>
      {result.errorType === 'RUNTIME_ERROR' && frames.length > 0 && (
        <div className="vz-muted">The steps below lead up to the crash — press ⏭ to jump straight to it.</div>
      )}
      {result.details && result.errorType === 'COMPILE_ERROR' && <pre className="vz-details">{result.details}</pre>}
    </div>
  );

  return (
    <div className="vz-root">
      {header}
      <div className="vz-grid">
        <aside className="vz-left">
          <div className="vz-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'problem'} className={tab === 'problem' ? 'on' : ''} onClick={() => setTab('problem')}>📄 Problem</button>
            <button role="tab" aria-selected={tab === 'breakdown'} className={tab === 'breakdown' ? 'on' : ''} onClick={() => setTab('breakdown')}>🧩 Break it down</button>
            <button role="tab" aria-selected={tab === 'complexity'} className={tab === 'complexity' ? 'on' : ''} onClick={() => setTab('complexity')}>⏱ Complexity</button>
          </div>
          <div className="vz-left-body">
            {tab === 'problem' && (
              <>
                <div className="vz-statement">{item.statement.split('\n').map((l, i) => <p key={i}>{l || ' '}</p>)}</div>
                {item.examples?.length > 0 && (
                  <div className="vz-examples">
                    {item.examples.map((ex, i) => (
                      <div key={i} className="vz-example">
                        <div><span className="vz-io-label">Input</span> <code>{ex.input}</code></div>
                        <div><span className="vz-io-label">Output</span> <code>{ex.output}</code></div>
                        {ex.explanation && <div className="vz-muted">{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                )}
                {item.constraints && <div className="vz-constraints"><b>Constraints:</b> {item.constraints}</div>}
                <button className="vz-btn vz-btn-soft vz-full" onClick={() => setTab('breakdown')}>🧩 Not sure what it's asking? Break it down</button>
              </>
            )}
            {tab === 'breakdown' && <ProblemBreakdown breakdown={item.breakdown} />}
            {tab === 'complexity' && (
              <div className="vz-complexity">
                <div className="vz-cx-row">
                  <div className="vz-cx"><span>Time</span><b>{item.timeComplexity || '—'}</b></div>
                  <div className="vz-cx"><span>Space</span><b>{item.spaceComplexity || '—'}</b></div>
                </div>
                {item.complexityNote && <p>{item.complexityNote}</p>}
                <p className="vz-muted">Run the code with ▶ Visualize — the “Work done so far” panel counts the real comparisons, so you can check the Big-O against what actually happened.</p>
                <Link className="vz-btn vz-btn-soft" to={`${base}/time-complexity`}>What is time complexity? →</Link>{' '}
                <Link className="vz-btn vz-btn-soft" to={`${base}/space-complexity`}>What is space complexity? →</Link>
              </div>
            )}
          </div>
        </aside>

        <section className="vz-editor-col">
          <div className="vz-editor-bar">
            <span className="vz-lang">Java</span>
            <div className="vz-spacer" />
            <button className="vz-btn" onClick={reset}>↺ Starter</button>
            {item.solutionCode && <button className="vz-btn" onClick={loadSolution}>💡 Solution</button>}
            <button className="vz-btn vz-btn-primary" onClick={visualize} disabled={running || !code.trim()}>
              {running ? '⏳ Running…' : '▶ Visualize'}
            </button>
          </div>
          <div className="vz-editor">
            <Editor
              height="100%"
              language="java"
              value={code}
              onChange={onEdit}
              onMount={(ed, monaco) => { editorRef.current = ed; monacoRef.current = monaco; }}
              theme="light"
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 4, glyphMargin: true }}
            />
          </div>
        </section>

        <section className="vz-run-col">
          {running && <div className="vz-card vz-running">Compiling and running your program step by step… Java takes a few seconds.</div>}
          {runError && <div className="vz-error ours"><div className="vz-error-title">⚠️ Could not visualize</div>{runError}</div>}
          {errorBox}
          {result?.status === 'TRUNCATED' && <div className="vz-warn">{result.message}</div>}
          {frames.length > 0 && result && (
            <TracePlayer frames={frames} animation={item.animation} timeComplexity={item.timeComplexity} onFrame={onFrame} />
          )}
          {!running && !result && !runError && (
            <div className="vz-card vz-idle">
              <h3>How this works</h3>
              <ol>
                <li>Read the problem. Stuck? Open <b>Break it down</b>.</li>
                <li>Write your solution in the editor.</li>
                <li>Press <b>▶ Visualize</b> — your code really runs, and every step is recorded.</li>
                <li>Step with ◀ ▶ (or the arrow keys) and watch the variables and the array change.</li>
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Workspace;

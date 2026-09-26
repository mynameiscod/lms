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

/** The Monaco font, set both in options and in CSS so a host theme cannot swap it for a proportional one. */
export const VZ_CODE_FONT = '"JetBrains Mono", "Cascadia Code", Consolas, "Courier New", monospace';

/**
 * Which grid the workspace can afford, measured on the page itself rather than the window: the
 * app sidebar takes a variable share of the screen, so a viewport breakpoint guessed wrong and
 * dropped the Visualization card below the fold on screens that had room for three columns.
 */
const useWorkspaceWidth = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<'wide' | 'mid' | 'narrow'>('wide');
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSize(w >= 1060 ? 'wide' : w >= 700 ? 'mid' : 'narrow');
    });
    ro.observe(el);
    return () => ro.disconnect();
  });
  return { ref, size };
};

const DIFF_LABEL: Record<string, string> = { beginner: 'Beginner', easy: 'Easy', medium: 'Medium', hard: 'Hard' };

/** A code box with a copy button. The copy falls back to selecting the text when the clipboard is refused. */
export const CopyBox: React.FC<{ text: string; dark?: boolean; empty?: React.ReactNode }> = ({ text, dark, empty }) => {
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLPreElement>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true); window.setTimeout(() => setCopied(false), 1400);
    } catch {
      const sel = window.getSelection();
      if (ref.current && sel) { const r = document.createRange(); r.selectNodeContents(ref.current); sel.removeAllRanges(); sel.addRange(r); }
    }
  };
  return (
    <div className={`vz-copybox${dark ? ' dark' : ''}`}>
      <pre ref={ref}>{text || empty}</pre>
      {!!text && (
        <button type="button" className="vz-copy" onClick={copy} aria-label="Copy" title={copied ? 'Copied' : 'Copy'}>
          <i className={copied ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden />
        </button>
      )}
    </div>
  );
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
  const [fullEditor, setFullEditor] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decoRef = useRef<string[]>([]);
  const [frame, setFrame] = useState<Frame | null>(null);
  const { ref: rootRef, size } = useWorkspaceWidth();

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

  /* Esc leaves the full-screen editor. */
  useEffect(() => {
    if (!fullEditor) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullEditor(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullEditor]);

  const frames = useMemo(() => (result?.events?.length ? buildFrames(result.events) : []), [result]);
  const onFrame = useCallback((f: Frame | null) => setFrame(f), []);

  /* Highlight the executing line, and the error line when there is one. */
  useEffect(() => {
    const ed = editorRef.current, monaco = monacoRef.current;
    if (!ed || !monaco) return;
    const decos: any[] = [];
    if (frame?.line) {
      const isErr = frame.event.eventType === 'EXCEPTION';
      decos.push({ range: new monaco.Range(frame.line, 1, frame.line, 1), options: { isWholeLine: true, className: isErr ? 'vz-err-line' : 'vz-cur-line', linesDecorationsClassName: isErr ? 'vz-err-gutter' : 'vz-cur-gutter' } });
      try { ed.revealLineInCenterIfOutsideViewport(frame.line); } catch { /* editor gone */ }
    } else if (result && !result.ok && result.line && !frames.length) {
      decos.push({ range: new monaco.Range(result.line, 1, result.line, 1), options: { isWholeLine: true, className: 'vz-err-line', linesDecorationsClassName: 'vz-err-gutter' } });
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
        <p>{loadError}</p><Link className="vz-btn" to={base}><i className="fa-solid fa-arrow-left" aria-hidden /> Back to the library</Link>
      </div></div>
    );
  }
  if (!item) return <div className="vz-root"><div className="vz-empty">Loading…</div></div>;

  const header = (
    <>
      <nav className="vz-crumbs" aria-label="Breadcrumb">
        <Link to={base}><i className="fa-solid fa-arrow-left" aria-hidden /> Library</Link>
        <i className="fa-solid fa-chevron-right sep" aria-hidden />
        <Link to={`${base}?topic=${encodeURIComponent(item.topic)}`}>{item.topic}</Link>
        <i className="fa-solid fa-chevron-right sep" aria-hidden />
        <span aria-current="page">{item.title}</span>
      </nav>
      <div className="vz-titlebar">
        <div className="vz-titlebar-main">
          <div className="vz-title-row">
            <h1>{item.title}</h1>
            <span className={`vz-diff d-${item.difficulty}`}>{DIFF_LABEL[item.difficulty] || item.difficulty}</span>
          </div>
          {item.summary && <p className="vz-subtitle">{item.summary}</p>}
        </div>
        <div className="vz-tags">
          <span className="vz-tag">{item.topic}</span>
          {item.kind === 'concept' ? <span className="vz-tag">Concept</span> : <span className="vz-tag">Java</span>}
          {item.timeComplexity && <span className="vz-tag mono">Time {item.timeComplexity}</span>}
          {item.spaceComplexity && <span className="vz-tag mono">Space {item.spaceComplexity}</span>}
        </div>
      </div>
    </>
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
        <i className={`fa-solid ${result.errorType === 'COMPILE_ERROR' ? 'fa-screwdriver-wrench' : result.errorType === 'RUNTIME_ERROR' ? 'fa-bug' : 'fa-triangle-exclamation'}`} aria-hidden />
        {result.errorType === 'COMPILE_ERROR' ? 'Compile error'
          : result.errorType === 'RUNTIME_ERROR' ? 'Your program crashed'
          : result.errorType === 'UNSUPPORTED_CONSTRUCT' ? 'Not traceable yet'
          : 'Could not visualize'}
        {result.line ? <span className="vz-line-chip">Line {result.line}</span> : null}
      </div>
      <div>{result.message}</div>
      {result.errorType === 'RUNTIME_ERROR' && frames.length > 0 && (
        <div className="vz-muted">The steps below lead up to the crash — press the last-step button to jump straight to it.</div>
      )}
      {result.details && result.errorType === 'COMPILE_ERROR' && <pre className="vz-details">{result.details}</pre>}
    </div>
  );

  return (
    <div className={`vz-root vz-w-${size}`} ref={rootRef}>
      {header}
      <div className="vz-grid">
        {/* ── Problem card ── */}
        <aside className="vz-panel-card vz-left">
          <div className="vz-tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'problem'} className={tab === 'problem' ? 'on' : ''} onClick={() => setTab('problem')}>
              <i className="fa-solid fa-file-lines" aria-hidden /> Problem
            </button>
            <button role="tab" aria-selected={tab === 'breakdown'} className={tab === 'breakdown' ? 'on' : ''} onClick={() => setTab('breakdown')}>
              <i className="fa-solid fa-puzzle-piece" aria-hidden /> Break it down
            </button>
            <button role="tab" aria-selected={tab === 'complexity'} className={tab === 'complexity' ? 'on' : ''} onClick={() => setTab('complexity')}>
              <i className="fa-regular fa-clock" aria-hidden /> Complexity
            </button>
          </div>
          <div className="vz-left-body">
            {tab === 'problem' && (
              <>
                <div className="vz-statement">{item.statement.split('\n').map((l, i) => (l.trim() ? <p key={i}>{l}</p> : null))}</div>
                {item.examples?.map((ex, i) => (
                  <section key={i} className="vz-box">
                    <div className="vz-box-title">
                      <span className="vz-box-icon"><i className="fa-solid fa-circle-info" aria-hidden /></span>
                      Example{item.examples.length > 1 ? ` ${i + 1}` : ''}
                    </div>
                    <div className="vz-box-label">Input</div>
                    <CopyBox text={ex.input} />
                    <div className="vz-box-label">Output</div>
                    <CopyBox text={ex.output} />
                    {ex.explanation && <p className="vz-box-note">{ex.explanation}</p>}
                  </section>
                ))}
                {item.constraints && (
                  <section className="vz-box">
                    <div className="vz-box-title">
                      <span className="vz-box-icon"><i className="fa-solid fa-sliders" aria-hidden /></span>
                      Constraints
                    </div>
                    <p className="vz-box-text">{item.constraints}</p>
                  </section>
                )}
                <button type="button" className="vz-callout" onClick={() => setTab('breakdown')}>
                  <span className="vz-callout-icon"><i className="fa-regular fa-lightbulb" aria-hidden /></span>
                  <span className="vz-callout-text">
                    <b>Not sure what's happening?</b>
                    <span>Try breaking it down into smaller steps.</span>
                  </span>
                  <i className="fa-solid fa-chevron-right" aria-hidden />
                </button>
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
                <p className="vz-muted">Press Visualize — the “Work done so far” panel counts the real comparisons, so you can check the Big-O against what actually happened.</p>
                <div className="vz-cx-links">
                  <Link className="vz-btn vz-btn-soft" to={`${base}/time-complexity`}>What is time complexity? <i className="fa-solid fa-arrow-right" aria-hidden /></Link>
                  <Link className="vz-btn vz-btn-soft" to={`${base}/space-complexity`}>What is space complexity? <i className="fa-solid fa-arrow-right" aria-hidden /></Link>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Editor card ── */}
        <section className={`vz-panel-card vz-editor-col${fullEditor ? ' is-full' : ''}`}>
          <div className="vz-editor-bar">
            <label className="vz-lang">
              <i className="fa-brands fa-java" aria-hidden />
              <select value="java" onChange={() => { /* Java only for now */ }} aria-label="Language">
                <option value="java">Java</option>
                <option value="python" disabled>Python (soon)</option>
                <option value="javascript" disabled>JavaScript (soon)</option>
              </select>
              <i className="fa-solid fa-chevron-down caret" aria-hidden />
            </label>
            <div className="vz-spacer" />
            <button className="vz-btn" onClick={reset}><i className="fa-solid fa-code" aria-hidden /> Starter</button>
            {item.solutionCode && <button className="vz-btn" onClick={loadSolution}><i className="fa-regular fa-lightbulb vz-bulb" aria-hidden /> Solution</button>}
            <button className="vz-btn vz-btn-primary" onClick={visualize} disabled={running || !code.trim()}>
              <i className={running ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-play'} aria-hidden /> {running ? 'Running…' : 'Visualize'}
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
              options={{
                minimap: { enabled: false }, fontSize: 13, lineHeight: 22, scrollBeyondLastLine: false,
                fontFamily: VZ_CODE_FONT, stickyScroll: { enabled: false },
                automaticLayout: true, tabSize: 4, renderLineHighlight: 'none', padding: { top: 12 },
                overviewRulerLanes: 0, lineDecorationsWidth: 14,
              }}
            />
            <button type="button" className="vz-fs-btn" onClick={() => setFullEditor(f => !f)}
              aria-label={fullEditor ? 'Exit full screen' : 'Full screen editor'} title={fullEditor ? 'Exit full screen (Esc)' : 'Full screen'}>
              <i className={fullEditor ? 'fa-solid fa-compress' : 'fa-solid fa-expand'} aria-hidden />
            </button>
          </div>
        </section>

        {/* ── Visualization card ── */}
        <section className="vz-panel-card vz-run-col">
          <div className="vz-run-head">
            <h2><i className="fa-solid fa-chart-simple" aria-hidden /> Visualization</h2>
            {frames.length > 0 && <span className="vz-step-count">Step {(frame?.index ?? 0) + 1} / {frames.length}</span>}
          </div>
          <div className="vz-run-body">
            {running && <div className="vz-running"><i className="fa-solid fa-spinner fa-spin" aria-hidden /> Compiling and running your program step by step… Java takes a few seconds.</div>}
            {runError && <div className="vz-error ours"><div className="vz-error-title"><i className="fa-solid fa-triangle-exclamation" aria-hidden /> Could not visualize</div>{runError}</div>}
            {errorBox}
            {result?.status === 'TRUNCATED' && <div className="vz-warn">{result.message}</div>}
            {frames.length > 0 && result && (
              <TracePlayer frames={frames} animation={item.animation} timeComplexity={item.timeComplexity} onFrame={onFrame} />
            )}
            {!running && !result && !runError && (
              <div className="vz-idle">
                <div className="vz-idle-icon"><i className="fa-solid fa-chart-simple" aria-hidden /></div>
                <h3>Watch your code run</h3>
                <ol>
                  <li>Read the problem. Stuck? Open <b>Break it down</b>.</li>
                  <li>Write your solution in the editor.</li>
                  <li>Press <b>Visualize</b> — your code really runs, and every step is recorded.</li>
                  <li>Step with the arrow buttons (or ← → keys) and watch the variables and the array change.</li>
                </ol>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Workspace;

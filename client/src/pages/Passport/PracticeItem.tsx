import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import passportApi, { PracticeProblem, PracticeListItem, RunOutcome, SubmitOutcome } from '../../api/passportApi';
import './practice.css';

const LANG_LABEL: Record<string, string> = { python: 'Python', javascript: 'JavaScript', java: 'Java', sql: 'SQL' };
const MONACO_LANG: Record<string, string> = { python: 'python', javascript: 'javascript', java: 'java', sql: 'sql' };
const KEY = ['A', 'B', 'C', 'D', 'E', 'F'];

type Tab = 'tests' | 'output' | 'expected' | 'console' | 'hints';

/**
 * Solve one Practice Lab item — a real workspace, not a form.
 *
 * Monaco (already a project dependency) gives line numbers, syntax highlighting and
 * formatting. Execution time / memory are shown ONLY when Piston actually reports
 * them; they used to be Math.random() in the runner and are now real-or-absent.
 */
const PracticeItem: React.FC = () => {
  const { id = '' } = useParams();
  const nav = useNavigate();

  /**
   * Where "back" belongs, derived from the id rather than remembered.
   *
   * A problem opened from Thinking Lab used to return the member to the Practice Lab, which
   * is a different list they were never on. The id already says which bank it came from —
   * admin-authored rows are prefixed `db:` — so this needs no query parameter, survives a
   * refresh, and works when the link is shared or bookmarked, none of which a remembered
   * origin would.
   */
  const fromBank = id.startsWith('db:');
  const backTo = fromBank ? '/careerpilot/thinking-lab' : '/careerpilot/practice';
  const backLabel = fromBank ? 'Thinking Lab' : 'Practice Lab';

  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [siblings, setSiblings] = useState<PracticeListItem[]>([]);
  const [alreadySolved, setAlreadySolved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('');
  const [dark, setDark] = useState(false);
  const [full, setFull] = useState(false);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [result, setResult] = useState<SubmitOutcome | null>(null);
  const [tab, setTab] = useState<Tab>('tests');
  const [activeTest, setActiveTest] = useState(0);
  const [hintsShown, setHintsShown] = useState(0);
  /** Left-pane tab. The statement, the help, and the videos are different jobs. */
  const [side, setSide] = useState<'problem' | 'hints' | 'video'>('problem');
  const [detail, setDetail] = useState<any | null>(null);
  const [aiHint, setAiHint] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [saved, setSaved] = useState('');

  const [answers, setAnswers] = useState<number[]>([]);
  const [review, setReview] = useState<SubmitOutcome['review'] | null>(null);
  const editorRef = useRef<any>(null);

  /**
   * Re-measure Monaco when the fullscreen toggle changes the column layout.
   *
   * Monaco caches its own pixel dimensions and writes them onto its internal DOM.
   * `automaticLayout` re-measures on its own schedule, so for at least a frame after
   * the grid flips back to two columns the editor is still sized for the full width —
   * wide enough to push the grid past the viewport, which is what made leaving
   * fullscreen leave a page-wide horizontal scrollbar and a problem panel squeezed to
   * one word per line.
   *
   * The rAF matters: called synchronously the container has not been laid out at its
   * new width yet, so Monaco would measure the old one and nothing would change.
   */
  useEffect(() => {
    const id = requestAnimationFrame(() => editorRef.current?.layout());
    return () => cancelAnimationFrame(id);
  }, [full]);

  const load = useCallback(async () => {
    setLoading(true); setErr(''); setOutcome(null); setResult(null); setReview(null); setHintsShown(0); setTab('tests');
    try {
      const [r, list] = await Promise.all([
        passportApi.getPractice(id),
        /**
         * Siblings from the SAME bank the problem belongs to.
         *
         * Fetched unfiltered, Previous/Next walked the merged list, so a member working
         * through Thinking Lab would silently land on a built-in warm-up and have no way
         * back to where they were.
         */
        passportApi.listPractice({ source: fromBank ? 'bank' : 'builtin' }).catch(() => null),
      ]);
      setProblem(r.problem);
      setAlreadySolved(r.solved);
      setDetail(r);
      if (list?.problems) setSiblings(list.problems);

      if (r.problem.kind === 'sql') {
        setLang('sql');
        setCode('-- Write your SELECT query here\n\nSELECT ');
      } else if (r.problem.kind === 'coding') {
        const first = (r.savedLanguage as any) || r.problem.languages?.[0] || 'python';
        setLang(first);
        // Their own work wins over the starter. Reopening a problem you were part-way
        // through and finding it wiped back to the template is the fastest way to make
        // somebody stop trusting a Save button.
        setCode(r.savedCode || r.problem.starter?.[first] || '');
      } else {
        setAnswers(new Array(r.problem.questions.length).fill(-1));
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message || 'Could not load this problem.');
    }
    setLoading(false);
  }, [id, fromBank]);

  useEffect(() => { load(); }, [load]);

  const { prev, next } = useMemo(() => {
    const i = siblings.findIndex(s => s.id === id);
    return { prev: i > 0 ? siblings[i - 1] : null, next: i >= 0 && i < siblings.length - 1 ? siblings[i + 1] : null };
  }, [siblings, id]);

  const switchLang = (l: string) => {
    setLang(l);
    const starters = Object.values(problem?.starter || {});
    if (!code.trim() || starters.includes(code)) setCode(problem?.starter?.[l] || '');
  };

  /**
   * Save without grading.
   *
   * Run already persists the draft server-side, but only when there is runnable code and
   * only as a side effect. A member who has written half an approach and wants to close the
   * tab needs a button that says so.
   */
  const doSave = async () => {
    if (!id) return;
    setSaved('Saving…');
    try {
      await passportApi.runPractice(id, code, lang);
      setSaved('Saved');
    } catch {
      // The draft is theirs; failing to store it is worth saying rather than swallowing.
      setSaved('Could not save');
    }
    setTimeout(() => setSaved(''), 2500);
  };

  /** A nudge about THIS code, as opposed to the written hints which are the same for all. */
  const askAi = async () => {
    if (!id) return;
    setAiBusy(true); setAiHint('');
    try {
      const r = await passportApi.practiceAiHint(id, code);
      setAiHint(r.hint || 'No hint came back — try the written hints.');
    } catch (e: any) {
      setAiHint(e?.response?.data?.message || 'The hint service is unavailable right now.');
    }
    setAiBusy(false);
  };

  const doRun = async () => {
    if (!problem) return;
    setRunning(true); setErr(''); setResult(null);
    try { setOutcome(await passportApi.runPractice(problem.id, code, lang)); setTab('tests'); setActiveTest(0); }
    catch (e: any) { setErr(e?.response?.data?.message || 'Run failed.'); }
    setRunning(false);
  };

  const doSubmit = async () => {
    if (!problem) return;
    setSubmitting(true); setErr(''); setOutcome(null);
    try {
      const body = problem.kind === 'mcq' ? { answers } : { code, language: lang };
      const r = await passportApi.submitPractice(problem.id, body);
      setResult(r);
      if (r.review) setReview(r.review);
      if (r.passed) setAlreadySolved(true);
      setTab('tests'); setActiveTest(0);
    } catch (e: any) { setErr(e?.response?.data?.message || 'Submit failed.'); }
    setSubmitting(false);
  };

  const resetCode = () => {
    if (!problem) return;
    setCode(problem.kind === 'sql' ? '-- Write your SELECT query here\n\nSELECT ' : (problem.starter?.[lang] || ''));
    setOutcome(null); setResult(null);
  };

  if (loading) return <div className="pm-loading">Loading problem…</div>;
  if (!problem) return <div className="pm-empty">{err || 'Problem not found.'}</div>;

  const rows = outcome?.results || result?.results || [];
  const shown = outcome || result;
  const passedAll = result?.passed ?? outcome?.allPassed ?? false;
  const accuracy = shown && (shown.total ?? 0) > 0 ? Math.round(((shown.passedCount ?? 0) / (shown.total ?? 1)) * 100) : null;
  const active = rows[activeTest];

  // ── MCQ variant ──
  if (problem.kind === 'mcq') {
    return (
      <>
        <div className="pl-bar">
          <button className="pl-back" onClick={() => nav(backTo)}>← Back to {backLabel}</button>
          <div className="pl-nextprev">
            {prev && <button onClick={() => nav(`/careerpilot/practice/${prev.id}`)}>‹ Previous</button>}
            {next && <button className="on" onClick={() => nav(`/careerpilot/practice/${next.id}`)}>Next ›</button>}
          </div>
        </div>
        <div className="pl-head">
          <div className="pl-chips">
            <span className={`pl-chip d-${problem.difficulty}`}>{problem.difficulty}</span>
            <span className="pl-chip xp">+{problem.xp} XP</span>
            <span className="pl-chip kind">MCQ</span>
            <span className="pl-chip">{problem.questions.length} questions</span>
            {problem.estimatedMinutes && <span className="pl-chip">⏱ {problem.estimatedMinutes} min</span>}
          </div>
          <h1>{problem.title}</h1>
          {problem.subtitle && <p>{problem.subtitle}</p>}
        </div>

        {problem.questions.map((q, i) => {
          const rv = review?.[i];
          return (
            <div className="pr-mcq-q" key={i}>
              <div className="qt">{i + 1}. {q.q}</div>
              {q.options.map((opt, oi) => {
                let cls = 'pr-opt';
                if (rv) { if (oi === rv.answer) cls += ' correct'; else if (oi === rv.chosen) cls += ' wrong'; }
                else if (answers[i] === oi) cls += ' sel';
                return (
                  <button key={oi} className={cls} disabled={!!rv}
                    onClick={() => setAnswers(a => a.map((v, idx) => (idx === i ? oi : v)))}>
                    <span className="k">{KEY[oi]}</span>{opt}
                  </button>
                );
              })}
              {rv?.explain && <div className="pr-explain">{rv.correct ? '✓ ' : '💡 '}{rv.explain}</div>}
            </div>
          );
        })}

        {result && (
          <div className={`pm-msg ${result.passed ? 'ok' : 'err'}`}>
            {result.passed ? '✓ ' : '✕ '}You got {result.correct}/{result.total} correct.
            {result.xpAwarded > 0 && <> <b>+{result.xpAwarded} XP earned!</b></>}
          </div>
        )}
        {err && <div className="pm-msg err">{err}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
          {!review ? (
            <button className="pm-btn primary" onClick={doSubmit} disabled={submitting || answers.some(a => a < 0)}>
              {submitting ? 'Checking…' : answers.some(a => a < 0) ? `Answer all ${problem.questions.length} questions` : 'Submit answers'}
            </button>
          ) : (
            <>
              <button className="pm-btn" onClick={load}>Try again</button>
              {next && <button className="pm-btn primary" onClick={() => nav(`/careerpilot/practice/${next.id}`)}>Next problem →</button>}
            </>
          )}
        </div>
      </>
    );
  }

  // ── Coding / SQL workspace ──
  return (
    <>
      <div className="pl-bar">
        <button className="pl-back" onClick={() => nav(backTo)}>← Back to {backLabel}</button>
        <div className="pl-meta">
          {problem.estimatedMinutes && <span><i>⏱</i>Est. {problem.estimatedMinutes} min</span>}
          <span><i>⭐</i>+{problem.xp} XP</span>
          {alreadySolved && <span className="ok"><i>✓</i>Solved</span>}
        </div>
        <div className="pl-nextprev">
          {prev && <button onClick={() => nav(`/careerpilot/practice/${prev.id}`)}>‹ Previous</button>}
          {next && <button className="on" onClick={() => nav(`/careerpilot/practice/${next.id}`)}>Next ›</button>}
        </div>
      </div>

      <div className={`pl-grid${full ? ' full' : ''}`}>
        {/* ── Problem panel ── */}
        <div className="pl-problem">
          <div className="pl-chips">
            <span className={`pl-chip d-${problem.difficulty}`}>{problem.difficulty}</span>
            <span className="pl-chip xp">+{problem.xp} XP</span>
            <span className="pl-chip kind">{problem.kind.toUpperCase()}</span>
            <span className="pl-chip">{problem.testCount} {problem.testCount === 1 ? 'test' : 'tests'}</span>
            {detail?.attempts ? <span className="pl-chip">{detail.attempts} attempt{detail.attempts === 1 ? '' : 's'}</span> : null}
          </div>

          {/* The statement, the help and the videos are three different jobs, and stacking
              them in one scroll meant the hints sat below the fold exactly when a stuck
              student was looking for them. */}
          <div className="pl-sidetabs">
            <button className={side === 'problem' ? 'on' : ''} onClick={() => setSide('problem')}>Problem</button>
            <button className={side === 'hints' ? 'on' : ''} onClick={() => setSide('hints')}>
              Hints{problem.hints?.length ? ` (${problem.hints.length})` : ''}
            </button>
            <button className={side === 'video' ? 'on' : ''} onClick={() => setSide('video')}>Videos</button>
          </div>

          {side === 'hints' && (
            <div className="pl-side-panel">
              {/* Written hints, revealed one at a time. Staged rather than dumped so a
                  student can take the smallest help that unblocks them. */}
              {(problem.hints || []).slice(0, hintsShown).map((h, i) => (
                <div className="pl-hint" key={i}><b>Hint {i + 1}</b><p>{h}</p></div>
              ))}
              {hintsShown < (problem.hints?.length || 0) ? (
                <button className="pl-hint-more" onClick={() => setHintsShown(n => n + 1)}>
                  Show hint {hintsShown + 1} of {problem.hints?.length}
                </button>
              ) : (
                !!problem.hints?.length && <p className="pl-side-note">That is every written hint.</p>
              )}

              <div className="pl-ai">
                <button className="pl-ai-btn" disabled={aiBusy} onClick={askAi}>
                  {aiBusy ? 'Thinking…' : '✨ Ask AI about my code'}
                </button>
                <span className="pl-side-note">Looks at what you have written. Counts toward hints used.</span>
                {aiHint && <div className="pl-ai-out">{aiHint}</div>}
              </div>
            </div>
          )}

          {side === 'video' && (
            <div className="pl-side-panel">
              {detail?.explainerVideo ? (
                <>
                  <h3 className="pl-h3">Problem explained</h3>
                  <a className="pl-video-link" href={detail.explainerVideo} target="_blank" rel="noreferrer noopener">▶ Watch the explanation</a>
                </>
              ) : <p className="pl-side-note">No explanation video for this problem yet.</p>}

              <h3 className="pl-h3" style={{ marginTop: 16 }}>Solution</h3>
              {/*
                The server decides this, not the page. When it is locked the URL is not in
                the payload at all — there is nothing here to reveal by editing the DOM.
              */}
              {detail?.solutionUnlocked ? (
                <>
                  {detail.solutionVideo
                    ? <a className="pl-video-link" href={detail.solutionVideo} target="_blank" rel="noreferrer noopener">▶ Watch the solution</a>
                    : <p className="pl-side-note">No solution video was added for this problem.</p>}
                  {detail.referenceSolution && <pre className="pl-solution">{detail.referenceSolution}</pre>}
                </>
              ) : (
                <p className="pl-locked">
                  🔒 Unlocks after {detail?.attemptsToUnlock ?? 3} more submission{(detail?.attemptsToUnlock ?? 3) === 1 ? '' : 's'} — or as soon as you solve it.
                </p>
              )}
            </div>
          )}

          {side === 'problem' && (
          <>
          <h1>{problem.title}</h1>
          {problem.subtitle && <p className="pl-sub">{problem.subtitle}</p>}
          <div className="pl-desc">{problem.prompt}</div>

          {!!problem.learningGoals.length && (
            <>
              <h3 className="pl-h3">Learning Goal</h3>
              <div className="pl-goals">
                {problem.learningGoals.map(g => <div key={g}><span className="ck">✓</span>{g}</div>)}
              </div>
            </>
          )}

          {!!problem.schema.length && (
            <>
              <h3 className="pl-h3">Schema</h3>
              {problem.schema.map(t => (
                <div className="pl-schema" key={t.table}>
                  <div className="hd">Table: {t.table}</div>
                  <table>
                    <thead><tr><th>Column Name</th><th>Type</th></tr></thead>
                    <tbody>
                      {t.columns.map(c => <tr key={c.column}><td>{c.column}</td><td className="ty">{c.type}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}

          {!!problem.sampleTests.length && (
            <>
              <h3 className="pl-h3">Expected Output</h3>
              {problem.sampleTests.map((t, i) => (
                <div className="pl-expected" key={i}>
                  {problem.kind !== 'sql' && t.input && <><span className="lbl">Input</span><pre>{t.input}</pre></>}
                  <pre>{t.expected}</pre>
                  <span className="tick">✓</span>
                </div>
              ))}
            </>
          )}

          {problem.tip && (
            <div className="pl-tip"><b>💡 Tip</b><span>{problem.tip}</span></div>
          )}
          </>
          )}
        </div>

        {/* ── Editor + results ── */}
        <div className="pl-right">
          <div className="pl-editor-card">
            <div className="pl-toolbar">
              {problem.kind === 'coding' ? (
                <label className="pl-select">Language
                  <select value={lang} onChange={e => switchLang(e.target.value)}>
                    {(problem.languages || []).map(l => <option key={l} value={l}>{LANG_LABEL[l] || l}</option>)}
                  </select>
                </label>
              ) : <span className="pl-select static">Language <b>SQL</b></span>}
              <button onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}>⌘ Format</button>
              <button onClick={resetCode}>↺ Reset</button>
              <button onClick={() => setDark(v => !v)}>{dark ? '☀ Light' : '☾ Theme'}</button>
              <button onClick={() => setFull(v => !v)}>{full ? '⤢ Exit' : '⤢ Fullscreen'}</button>
            </div>

            <div className="pl-editor">
              <Editor
                height={full ? '62vh' : '340px'}
                language={MONACO_LANG[lang] || 'plaintext'}
                theme={dark ? 'vs-dark' : 'light'}
                value={code}
                onChange={v => setCode(v ?? '')}
                onMount={(ed) => { editorRef.current = ed; }}
                options={{
                  minimap: { enabled: false }, fontSize: 13.5, lineNumbers: 'on',
                  scrollBeyondLastLine: false, tabSize: 2, automaticLayout: true,
                  padding: { top: 12, bottom: 12 }, renderLineHighlight: 'line',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                }}
              />
            </div>

            <div className="pl-actions">
              <button className="pl-btn" onClick={doRun} disabled={running || submitting}>▷ {running ? 'Running…' : 'Run Sample'}</button>
              <button className="pl-btn" onClick={doSave} disabled={running || submitting}>💾 {saved || 'Save'}</button>
              <button className="pl-btn" onClick={resetCode} disabled={running || submitting}>↺ Reset</button>
              <button className="pl-btn primary" onClick={doSubmit} disabled={running || submitting}>➤ {submitting ? 'Submitting…' : 'Submit'}</button>
            </div>
          </div>

          {err && <div className="pm-msg err">{err}</div>}

          {shown && (
            <div className="pl-results">
              <div className="pl-verdict">
                <div className={`v ${passedAll ? 'pass' : 'fail'}`}>
                  <span className="ic">{passedAll ? '✓' : '✕'}</span>
                  <div>
                    <b>{passedAll ? 'Passed' : 'Not yet'}</b>
                    <span>{shown.passedCount ?? 0} / {shown.total ?? 0} test cases passed</span>
                  </div>
                </div>
                {/* Only real figures — 0 means Piston didn't report it, so we omit the tile */}
                {!!shown.executionMs && <div className="m"><small>Execution Time</small><b>{shown.executionMs} ms</b></div>}
                {!!shown.memoryMb && <div className="m"><small>Memory Used</small><b>{shown.memoryMb} MB</b></div>}
                {accuracy !== null && <div className="m"><small>Accuracy</small><b className={passedAll ? 'g' : ''}>{accuracy}%</b></div>}
                <div className="m"><small>XP Earned</small><b className={result?.xpAwarded ? 'g' : ''}>{result?.xpAwarded ? `+${result.xpAwarded}` : '—'}</b></div>
              </div>

              <div className="pl-tabs">
                {(['tests', 'output', 'expected', 'console', 'hints'] as Tab[]).map(t => (
                  <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
                    {t === 'tests' ? 'Test Cases' : t === 'output' ? 'Output' : t === 'expected' ? 'Expected Output' : t === 'console' ? 'Console' : 'Hints'}
                  </button>
                ))}
              </div>

              <div className="pl-tabbody">
                {tab === 'tests' && (
                  <div className="pl-tests">
                    <div className="pl-testlist">
                      {rows.map((r, i) => (
                        <button key={i} className={`${activeTest === i ? 'on' : ''} ${r.passed ? 'pass' : 'fail'}`} onClick={() => setActiveTest(i)}>
                          <span className="tick">{r.passed ? '✓' : '✕'}</span>
                          <span><b>Test Case #{r.index + 1}</b><small>{r.hidden ? 'Hidden test' : 'Sample test'}</small></span>
                        </button>
                      ))}
                    </div>
                    {active && (
                      <div className="pl-testdetail">
                        {problem.kind !== 'sql' && (
                          <div className="blk"><span className="lbl">Input</span><pre>{active.input || '(none)'}</pre></div>
                        )}
                        <div className="two">
                          <div className="blk"><span className="lbl">Your Output</span>
                            <pre className={active.passed ? 'ok' : 'bad'}>{active.got || '(no output)'}</pre>
                          </div>
                          <div className="blk"><span className="lbl">Expected Output</span>
                            <pre className="ok">{active.expected}</pre>
                          </div>
                        </div>
                        {active.error && <div className="blk"><span className="lbl">Error</span><pre className="bad">{active.error}</pre></div>}
                      </div>
                    )}
                  </div>
                )}
                {tab === 'output' && <pre className="pl-pre">{active?.got || '(no output)'}</pre>}
                {tab === 'expected' && <pre className="pl-pre">{active?.expected || '—'}</pre>}
                {tab === 'console' && (
                  <pre className="pl-pre">{shown.compilationError || active?.error || 'No errors or warnings.'}</pre>
                )}
                {tab === 'hints' && (
                  <div className="pl-hints">
                    {!problem.hints.length ? <div className="pm-empty">No hints for this problem.</div> : (
                      <>
                        {problem.hints.slice(0, hintsShown).map((h, i) => (
                          <div className="pl-hint" key={i}><b>Hint {i + 1}</b><span>{h}</span></div>
                        ))}
                        {hintsShown < problem.hints.length && (
                          <button className="pm-btn" onClick={() => setHintsShown(n => n + 1)}>
                            Show {hintsShown === 0 ? 'a hint' : 'the next hint'} ({hintsShown}/{problem.hints.length} used)
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {result?.passed && next && (
            <button className="pm-btn primary" style={{ width: '100%', marginTop: 12 }} onClick={() => nav(`/careerpilot/practice/${next.id}`)}>
              Solved! Next problem →
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default PracticeItem;

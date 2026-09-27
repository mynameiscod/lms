import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codingPracticeApi, LearnerProblem } from '../../api/problemSetApi';
import { pbError, PbCustomResult, PbJudgeResult } from '../../api/problemBankApi';
import { DifficultyPill, LANG_SHORT, Markdown, VERDICT_LABEL, relTime } from '../ProblemBank/shared';
import { MONACO_LANG } from '../ProblemBank/templates';
import '../ProblemBank/ProblemBank.css';

/**
 * The solve workspace — LeetCode's layout, because it is what learners preparing for
 * interviews already know: the problem on the left, the editor on the right, a console under
 * the editor. Run checks the examples; Submit is judged on every hidden test and recorded.
 * Code is kept per problem and language in the browser, so a refresh never loses work.
 */
const draftKey = (pid: string, lang: string) => `pb-code:${pid}:${lang}`;
const readDraft = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeDraft = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } };

const Solve: React.FC<{ base: string }> = ({ base }) => {
  const { setId, problemId } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<LearnerProblem | null>(null);
  const [err, setErr] = useState('');
  const [lang, setLang] = useState('');
  const [code, setCode] = useState('');
  const [leftTab, setLeftTab] = useState<'desc' | 'subs' | 'editorial'>('desc');
  const [consoleTab, setConsoleTab] = useState<'tests' | 'result'>('tests');
  const [stdin, setStdin] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [busy, setBusy] = useState<'' | 'run' | 'submit'>('');
  const [runRes, setRunRes] = useState<PbJudgeResult | null>(null);
  const [customRes, setCustomRes] = useState<PbCustomResult | null>(null);
  const [subRes, setSubRes] = useState<{ result: PbJudgeResult; recorded: boolean; late?: boolean; firstAccept?: boolean; reward?: { xp: number } | null } | null>(null);
  const [hints, setHints] = useState(0);
  const [sel, setSel] = useState(0);
  const saveTimer = useRef<any>();

  const load = useCallback(() => {
    setErr('');
    codingPracticeApi.problem(setId!, problemId!).then((r) => {
      setP(r);
      const last = r.submissions[0]?.language;
      const pick = r.languages.find((l) => l.language === last) ? last : (r.languages[0]?.language || '');
      setLang((cur) => (cur && r.languages.some((l) => l.language === cur) ? cur : pick));
      if (r.samples[0]) setStdin(r.samples[0].input);
    }).catch((e) => setErr(pbError(e, 'Could not open this problem.')));
  }, [setId, problemId]);
  useEffect(() => { setP(null); setRunRes(null); setSubRes(null); setCustomRes(null); setHints(0); setLeftTab('desc'); load(); }, [load]);

  // Restore this language's code: saved draft → last submission in it → starter.
  useEffect(() => {
    if (!p || !lang) return;
    const saved = readDraft(draftKey(p._id, lang));
    const lastSub = p.submissions.find((s) => s.language === lang)?.code;
    setCode(saved ?? lastSub ?? p.languages.find((l) => l.language === lang)?.starterCode ?? '');
  }, [p, lang]);

  const onCode = (v: string) => {
    setCode(v);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { if (p) writeDraft(draftKey(p._id, lang), v); }, 400);
  };

  const run = async () => {
    if (!p || busy) return;
    setBusy('run'); setConsoleTab('result'); setSubRes(null);
    try {
      const r = await codingPracticeApi.run(setId!, problemId!, { language: lang, code, mode: useCustom ? 'custom' : 'samples', stdin });
      setRunRes(r.result || null); setCustomRes(r.custom || null); setSel(0);
    } catch (e) { setRunRes(null); setCustomRes({ verdict: 'RE', output: '', error: pbError(e, 'Run failed.'), timeMs: 0 }); }
    setBusy('');
  };

  const submit = async () => {
    if (!p || busy) return;
    setBusy('submit'); setConsoleTab('result'); setRunRes(null); setCustomRes(null);
    try {
      const r = await codingPracticeApi.submit(setId!, problemId!, { language: lang, code });
      setSubRes(r);
      if (r.recorded) load();
    } catch (e) { setCustomRes({ verdict: 'RE', output: '', error: pbError(e, 'Submit failed.'), timeMs: 0 }); }
    setBusy('');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) submit(); else run(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (err) return <div className="pb-root"><div className="pb-page"><div className="pb-alert pb-alert-bad">{err}</div>
    <button className="pb-btn" onClick={() => nav(`${base}/${setId}`)}><i className="fa-solid fa-arrow-left" /> Back to the set</button></div></div>;
  if (!p) return <div className="pb-root"><div className="pb-page pb-muted"><span className="pb-spinner" /> Loading problem…</div></div>;

  const solved = p.submissions.some((s) => s.verdict === 'AC');
  const res = subRes?.result || runRes;
  const c = res?.cases[sel];
  const closed = p.set.status === 'closed';
  const overdue = !!(p.set.dueAt && new Date(p.set.dueAt).getTime() < Date.now());

  return (
    <div className="pb-root">
      <div className="pb-studio">
        <div className="pb-studio-bar">
          <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => nav(`${base}/${setId}`)}><i className="fa-solid fa-list" /> {p.set.title}</button>
          <span className="pb-muted" style={{ fontSize: 13 }}>{p.set.position} / {p.set.count}</span>
          <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={!p.set.prevId} onClick={() => nav(`${base}/${setId}/${p.set.prevId}`)} aria-label="Previous problem"><i className="fa-solid fa-chevron-left" /></button>
          <button className="pb-btn pb-btn-ghost pb-btn-icon" disabled={!p.set.nextId} onClick={() => nav(`${base}/${setId}/${p.set.nextId}`)} aria-label="Next problem"><i className="fa-solid fa-chevron-right" /></button>
          <span className="pb-spacer" />
          {p.set.dueAt && <span className={`pb-pill ${overdue ? 'pb-badge-bad' : 'pb-badge-neutral'}`}><i className="fa-regular fa-clock" /> Due {new Date(p.set.dueAt).toLocaleString()}</span>}
          <button className="pb-btn pb-btn-sm" disabled={!!busy || !lang} onClick={run} title="Ctrl+Enter">{busy === 'run' ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run</button>
          <button className="pb-btn pb-btn-sm pb-btn-success" disabled={!!busy || !lang || closed || (overdue && !p.set.allowLate)} onClick={submit} title="Ctrl+Shift+Enter">
            {busy === 'submit' ? <span className="pb-spinner" /> : <i className="fa-solid fa-cloud-arrow-up" />} Submit</button>
        </div>

        <div className="pb-studio-body">
          {/* ── Problem ── */}
          <div className="pb-studio-left">
            <div className="pb-tabs">
              <button className={leftTab === 'desc' ? 'on' : ''} onClick={() => setLeftTab('desc')}><i className="fa-regular fa-file-lines" /> Description</button>
              <button className={leftTab === 'subs' ? 'on' : ''} onClick={() => setLeftTab('subs')}><i className="fa-solid fa-clock-rotate-left" /> Submissions<span className="cnt">{p.submissions.length}</span></button>
              <button className={leftTab === 'editorial' ? 'on' : ''} onClick={() => setLeftTab('editorial')}><i className="fa-solid fa-book-open" /> Editorial{!solved && <i className="fa-solid fa-lock" style={{ fontSize: 11 }} />}</button>
            </div>
            <div className="pb-pane">
              {leftTab === 'desc' && (
                <div className="pb-preview">
                  <h2>{p.title} {solved && <i className="fa-solid fa-circle-check" style={{ color: 'var(--pb-ok)', fontSize: 18 }} title="Solved" />}</h2>
                  <div className="pb-row pb-wrap" style={{ marginBottom: 12 }}>
                    <DifficultyPill d={p.difficulty} /><span className="pb-tag">{p.marks} marks</span>
                    {p.companies.map((co) => <span key={co} className="pb-tag" style={{ background: '#fdf4ff', color: '#86198f' }}>{co}</span>)}
                  </div>
                  <Markdown text={p.statement} />
                  {p.inputFormat && <><h3 style={{ marginTop: 16 }}>Input</h3><Markdown text={p.inputFormat} /></>}
                  {p.outputFormat && <><h3 style={{ marginTop: 16 }}>Output</h3><Markdown text={p.outputFormat} /></>}
                  {p.samples.map((t, i) => (
                    <div key={i} className="pb-sample">
                      <div className="pb-sample-head">Example {i + 1}</div>
                      <div className="pb-sample-body">
                        <div><span className="pb-faint" style={{ fontSize: 11.5, fontWeight: 750 }}>INPUT</span><pre className="pb-mono">{t.input}</pre></div>
                        <div><span className="pb-faint" style={{ fontSize: 11.5, fontWeight: 750 }}>OUTPUT</span><pre className="pb-mono">{t.expectedOutput}</pre></div>
                      </div>
                      {t.explanation && <div style={{ padding: '8px 12px', borderTop: '1px solid var(--pb-line)', fontSize: 13 }}><b>Explanation:</b> {t.explanation}</div>}
                    </div>
                  ))}
                  {p.constraints && <><h3 style={{ marginTop: 16 }}>Constraints</h3><Markdown text={p.constraints} /></>}
                  <div className="pb-muted" style={{ fontSize: 12.5, marginTop: 12 }}>Time limit {p.limits?.timeMs || 2000} ms · Memory {p.limits?.memoryMb || 256} MB</div>
                  {!!p.hints.length && (
                    <div style={{ marginTop: 16 }}>
                      {p.hints.slice(0, hints).map((h, i) => <div key={i} className="pb-alert pb-alert-warn"><b>Hint {i + 1}:</b> {h}</div>)}
                      {hints < p.hints.length && <button className="pb-btn pb-btn-sm" onClick={() => setHints(hints + 1)}><i className="fa-solid fa-lightbulb" /> Show hint {hints + 1} of {p.hints.length}</button>}
                    </div>
                  )}
                </div>
              )}
              {leftTab === 'subs' && (
                <div style={{ paddingTop: 12 }}>
                  {!p.submissions.length && <div className="pb-muted">No submissions yet. Your best score counts.</div>}
                  {p.submissions.map((s) => (
                    <div key={s._id} className="pb-card" style={{ padding: '10px 12px', marginBottom: 8, cursor: 'pointer' }}
                      onClick={() => { setLang(s.language); setTimeout(() => { setCode(s.code); writeDraft(draftKey(p._id, s.language), s.code); }, 0); }}
                      title="Load this code into the editor">
                      <div className="pb-row">
                        <b style={{ color: s.verdict === 'AC' ? 'var(--pb-ok)' : 'var(--pb-bad)' }}>{VERDICT_LABEL[s.verdict] || s.verdict}</b>
                        <span className="pb-muted" style={{ fontSize: 12.5 }}>{s.passed}/{s.total} tests · {s.score}/{s.maxScore} marks</span>
                        <span className="pb-spacer" /><span className="pb-lang">{LANG_SHORT[s.language] || s.language}</span>
                        <span className="pb-faint" style={{ fontSize: 12 }}>{relTime(s.createdAt)}{s.late ? ' · late' : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {leftTab === 'editorial' && (
                <div style={{ paddingTop: 12 }}>
                  {p.editorial ? <Markdown text={p.editorial} /> : solved
                    ? <div className="pb-muted">No editorial has been written for this problem.</div>
                    : <div className="pb-alert pb-alert-info"><i className="fa-solid fa-lock" /> The editorial unlocks once you solve the problem.</div>}
                </div>
              )}
            </div>
          </div>

          {/* ── Editor + console ── */}
          <div className="pb-studio-right">
            <div className="pb-lab-top">
              <select className="pb-select" style={{ width: 'auto' }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
                {p.languages.map((l) => <option key={l.language} value={l.language}>{LANG_SHORT[l.language] || l.language}</option>)}
              </select>
              <span className="pb-spacer" />
              <button className="pb-btn pb-btn-ghost pb-btn-sm" onClick={() => {
                if (!window.confirm('Reset to the starter code? Your current code in this language will be replaced.')) return;
                const starter = p.languages.find((l) => l.language === lang)?.starterCode || '';
                setCode(starter); writeDraft(draftKey(p._id, lang), starter);
              }}><i className="fa-solid fa-rotate-left" /> Reset</button>
            </div>
            <div className="pb-lab-editor">
              <Editor height="100%" language={MONACO_LANG[lang] || 'plaintext'} value={code} onChange={(v) => onCode(v || '')} theme="light"
                options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: lang === 'python' ? 4 : 2 }} />
            </div>
            <div className="pb-tabs" style={{ background: '#fff' }}>
              <button className={consoleTab === 'tests' ? 'on' : ''} onClick={() => setConsoleTab('tests')}><i className="fa-solid fa-vial" /> Testcase</button>
              <button className={consoleTab === 'result' ? 'on' : ''} onClick={() => setConsoleTab('result')}><i className="fa-solid fa-terminal" /> Result</button>
            </div>
            <div className="pb-lab-out">
              {consoleTab === 'tests' ? (
                <div>
                  <label className="pb-switch" style={{ marginBottom: 8 }}><input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} /> Run with my own input instead of the examples</label>
                  {useCustom
                    ? <textarea className="pb-textarea pb-mono" rows={5} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} />
                    : <div className="pb-muted" style={{ fontSize: 13 }}>Run checks your code against the {p.samples.length} example{p.samples.length === 1 ? '' : 's'} above. Submit checks every hidden test and records your score.</div>}
                </div>
              ) : busy ? (
                <div className="pb-muted"><span className="pb-spinner" /> {busy === 'submit' ? 'Judging against all tests…' : 'Running…'}</div>
              ) : customRes ? (
                <div>
                  <div className={`pb-verdict pb-v-${customRes.verdict}`}><b>{VERDICT_LABEL[customRes.verdict] || customRes.verdict}</b>{!!customRes.timeMs && <span>{customRes.timeMs} ms</span>}</div>
                  {customRes.output !== undefined && customRes.verdict !== 'RE' && <div className="pb-io"><div className="k">Output</div><pre className="pb-mono console">{customRes.output || '(no output)'}</pre></div>}
                  {customRes.error && <div className="pb-io"><div className="k">Error</div><pre className="pb-mono err">{customRes.error}</pre></div>}
                </div>
              ) : res ? (
                <div>
                  <div className={`pb-verdict pb-v-${res.verdict}`}>
                    <b>{VERDICT_LABEL[res.verdict] || res.verdict}</b><span>{res.passed}/{res.total} {subRes ? 'tests' : 'examples'} passed</span>
                    <span className="pb-spacer" />{subRes && <span>{res.score} / {res.maxScore} marks</span>}
                  </div>
                  {subRes?.firstAccept && <div className="pb-alert pb-alert-ok"><i className="fa-solid fa-trophy" /> Solved!{subRes.reward ? ` +${subRes.reward.xp} XP` : ''}</div>}
                  {subRes?.late && <div className="pb-alert pb-alert-warn">Submitted after the due date — marked late.</div>}
                  {subRes && !subRes.recorded && <div className="pb-alert pb-alert-warn">The code runner was busy, so this was not counted. Please submit again.</div>}
                  {res.compileError ? <div className="pb-io"><div className="k">Compiler</div><pre className="pb-mono err">{res.compileError}</pre></div> : <>
                    <div className="pb-case-strip">
                      {res.cases.map((cs, i) => (
                        <button key={i} className={`pb-case-dot ${cs.passed ? 'pass' : 'fail'} ${sel === i ? 'sel' : ''}`} onClick={() => setSel(i)}>
                          {cs.isSample ? `Example ${i + 1}` : `Test ${i + 1}`} {cs.passed ? '✓' : '✗'}
                        </button>
                      ))}
                    </div>
                    {c && (c.input !== undefined ? <>
                      <div className="pb-io"><div className="k">Input</div><pre className="pb-mono">{c.input || '(empty)'}</pre></div>
                      <div className="pb-test-grid" style={{ padding: 0 }}>
                        <div className="pb-io"><div className="k">Expected</div><pre className="pb-mono">{c.expectedOutput}</pre></div>
                        <div className="pb-io"><div className="k">Your output</div><pre className="pb-mono console">{c.output || '(no output)'}</pre></div>
                      </div>
                      {c.error && <div className="pb-io"><div className="k">Error</div><pre className="pb-mono err">{c.error}</pre></div>}
                    </> : (
                      <div className="pb-muted" style={{ fontSize: 13 }}><i className="fa-solid fa-eye-slash" /> Hidden test — {VERDICT_LABEL[c.verdict]}. Hidden inputs are not shown.
                        {c.error && <pre className="pb-mono err" style={{ marginTop: 6, padding: 8, borderRadius: 8 }}>{c.error}</pre>}</div>
                    ))}
                  </>}
                </div>
              ) : (
                <div className="pb-muted" style={{ fontSize: 13 }}>Press <b>Run</b> (Ctrl+Enter) to try the examples, or <b>Submit</b> (Ctrl+Shift+Enter) to be graded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Solve;

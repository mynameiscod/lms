import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codingPracticeApi, LearnerProblem } from '../../api/problemSetApi';
import { pbError, PbCustomResult, PbJudgeResult } from '../../api/problemBankApi';
import { LANG_SHORT, Markdown, VERDICT_LABEL, relTime } from '../ProblemBank/shared';
import { MONACO_LANG } from '../ProblemBank/templates';
import '../ProblemBank/ProblemBank.css';
import './practiceLibrary.css';

/**
 * The solve page for a practice-library problem: the problem on the left in tabs, the editor and
 * test console on the right. Run Tests checks the examples; Submit is judged on every hidden test
 * and recorded. Code is kept per problem and language in the browser, so a refresh never loses work.
 */
const draftKey = (pid: string, lang: string) => `pb-code:${pid}:${lang}`;
const readDraft = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const writeDraft = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage full or blocked */ } };

type LeftTab = 'desc' | 'examples' | 'constraints' | 'hints' | 'subs' | 'editorial';
type ConsoleTab = 'cases' | 'custom' | 'output';
type Submitted = { result: PbJudgeResult; recorded: boolean; firstAccept?: boolean; reward?: { xp: number } | null };

const LibrarySolve: React.FC<{ base: string }> = ({ base }) => {
  const { problemId } = useParams();
  const nav = useNavigate();
  const [p, setP] = useState<LearnerProblem | null>(null);
  const [err, setErr] = useState('');
  const [lang, setLang] = useState('');
  const [code, setCode] = useState('');
  const [leftTab, setLeftTab] = useState<LeftTab>('desc');
  const [cTab, setCTab] = useState<ConsoleTab>('cases');
  const [stdin, setStdin] = useState('');
  const [busy, setBusy] = useState<'' | 'run' | 'submit' | 'custom'>('');
  const [runRes, setRunRes] = useState<PbJudgeResult | null>(null);
  const [customRes, setCustomRes] = useState<PbCustomResult | null>(null);
  const [subRes, setSubRes] = useState<Submitted | null>(null);
  const [hints, setHints] = useState(0);
  const [open, setOpen] = useState(-1);
  const saveTimer = useRef<any>();

  const load = useCallback(() => {
    setErr('');
    codingPracticeApi.libraryProblem(problemId!).then((r) => {
      setP(r);
      const last = r.submissions[0]?.language;
      const pick = r.languages.find((l) => l.language === last) ? last : (r.languages[0]?.language || '');
      setLang((cur) => (cur && r.languages.some((l) => l.language === cur) ? cur : pick));
      if (r.samples[0]) setStdin(r.samples[0].input);
    }).catch((e) => setErr(pbError(e, 'Could not open this problem.')));
  }, [problemId]);
  useEffect(() => { setP(null); setRunRes(null); setSubRes(null); setCustomRes(null); setHints(0); setOpen(-1); setLeftTab('desc'); setCTab('cases'); load(); }, [load]);

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

  const runTests = async () => {
    if (!p || busy) return;
    setBusy('run'); setCTab('cases'); setSubRes(null); setCustomRes(null); setOpen(-1);
    try {
      const r = await codingPracticeApi.libraryRun(problemId!, { language: lang, code, mode: 'samples' });
      setRunRes(r.result || null);
    } catch (e) { setRunRes(null); setCustomRes({ verdict: 'RE', output: '', error: pbError(e, 'Run failed.'), timeMs: 0 }); setCTab('output'); }
    setBusy('');
  };

  const runCustom = async () => {
    if (!p || busy) return;
    setBusy('custom'); setCTab('custom'); setSubRes(null);
    try {
      const r = await codingPracticeApi.libraryRun(problemId!, { language: lang, code, mode: 'custom', stdin });
      setCustomRes(r.custom || null);
    } catch (e) { setCustomRes({ verdict: 'RE', output: '', error: pbError(e, 'Run failed.'), timeMs: 0 }); }
    setBusy('');
  };

  const submit = async () => {
    if (!p || busy) return;
    setBusy('submit'); setCTab('cases'); setRunRes(null); setCustomRes(null); setOpen(-1);
    try {
      const r = await codingPracticeApi.librarySubmit(problemId!, { language: lang, code });
      setSubRes(r);
      if (r.recorded) load();
    } catch (e) { setCustomRes({ verdict: 'RE', output: '', error: pbError(e, 'Submit failed.'), timeMs: 0 }); setCTab('output'); }
    setBusy('');
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) submit(); else runTests(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (err) return <div className="pl"><div className="pb-alert pb-alert-bad">{err}</div><button className="pl-btn" onClick={() => nav(base)}><i className="fa-solid fa-arrow-left" /> Back to Practice</button></div>;
  if (!p) return <div className="pl"><span className="pb-spinner" /> Loading problem…</div>;

  const solved = p.submissions.some((s) => s.verdict === 'AC');
  const res = subRes?.result || runRes;
  const copy = (t: string) => { try { navigator.clipboard.writeText(t); } catch { /* clipboard blocked */ } };
  const topic = p.topics[0];
  const tabs: [LeftTab, string, string, React.ReactNode?][] = [
    ['desc', 'fa-regular fa-file-lines', 'Description'], ['examples', 'fa-solid fa-table-list', 'Examples'],
    ['constraints', 'fa-solid fa-sliders', 'Constraints'], ['hints', 'fa-regular fa-lightbulb', 'Hints'],
    ['subs', 'fa-solid fa-clock-rotate-left', 'Submissions', <span className="cnt">{p.submissions.length}</span>],
    ['editorial', 'fa-solid fa-book-open', 'Editorial', !solved && <i className="fa-solid fa-lock" style={{ fontSize: 11 }} />],
  ];
  const verdictClass = (v: string) => (v === 'AC' ? 'ok' : v === 'BUSY' ? 'warn' : 'bad');

  return (
    <div className="pl">
      <div className="pl-crumbs">
        <i className="fa-solid fa-code" />
        <a onClick={() => nav(base)}>Practice</a>
        {topic && <><span>›</span><a onClick={() => nav(`${base}?topic=${encodeURIComponent(topic)}`)}>{topic}</a></>}
        <span>›</span><span style={{ color: '#0f172a', fontWeight: 600 }}>{p.number}. {p.title}</span>
        <span className="grow" />
        <button className="pl-btn sm" disabled={!p.set.prevId} onClick={() => nav(`${base}/${p.set.prevId}`)}><i className="fa-solid fa-chevron-left" /> Previous</button>
        <button className="pl-btn sm" disabled={!p.set.nextId} onClick={() => nav(`${base}/${p.set.nextId}`)}>Next <i className="fa-solid fa-chevron-right" /></button>
      </div>

      <div className="pl-work">
        {/* ── Problem ── */}
        <div className="pl-card pl-left">
          <div className="head">
            <h2>
              <span>{p.number}. {p.title}</span>
              {solved
                ? <span className="pl-badge you"><i className="fa-solid fa-circle-check" /> You solved this</span>
                : !!p.solvedBy && <span className="pl-badge"><i className="fa-solid fa-circle-check" /> Solved by {p.solvedBy.toLocaleString()} learner{p.solvedBy === 1 ? '' : 's'}</span>}
            </h2>
            <div className="pl-chips" style={{ alignItems: 'center' }}>
              <span className={`pl-diff ${p.difficulty}`} style={{ padding: '4px 16px' }}>{p.difficulty[0].toUpperCase() + p.difficulty.slice(1)}</span>
              <span className="pl-chip">{p.marks} marks</span>
              {p.topics.map((t) => <span key={t} className="pl-chip">{t}</span>)}
              {p.companies.map((c) => <span key={c} className="pl-chip co">{c}</span>)}
            </div>
          </div>
          <div className="pl-ltabs">
            {tabs.map(([k, ic, label, extra]) => (
              <button key={k} className={leftTab === k ? 'on' : ''} onClick={() => setLeftTab(k)}><i className={ic} /> {label} {extra}</button>
            ))}
          </div>
          <div className="pl-pane">
            {leftTab === 'desc' && (
              <>
                <Markdown text={p.statement} />
                {p.inputFormat && <><h3>Input</h3><div className="pl-io"><Markdown text={p.inputFormat} /></div></>}
                {p.outputFormat && <><h3>Output</h3><div className="pl-io"><Markdown text={p.outputFormat} /></div></>}
                <div className="pb-muted" style={{ fontSize: 12.5, marginTop: 14 }}>Time limit {p.limits?.timeMs || 2000} ms · Memory {p.limits?.memoryMb || 256} MB</div>
              </>
            )}
            {leftTab === 'examples' && (!p.samples.length ? <div className="pb-muted">This problem has no examples.</div> : (
              <div>
                {p.samples.map((t, i) => (
                  <div key={i} className="pl-ex" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="box">
                      <div className="top"><span>Example {i + 1}</span><button className="pl-copy" onClick={() => copy(t.input)}><i className="fa-regular fa-copy" /> Copy input</button></div>
                      <div className="k">INPUT</div><pre className="pb-mono">{t.input}</pre>
                      <div className="k">OUTPUT</div><pre className="pb-mono">{t.expectedOutput}</pre>
                      {t.explanation && <div style={{ fontSize: 13 }}><b>Explanation:</b> {t.explanation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {leftTab === 'constraints' && (p.constraints ? <Markdown text={p.constraints} /> : <div className="pb-muted">No constraints were listed for this problem.</div>)}
            {leftTab === 'hints' && (!p.hints.length ? <div className="pb-muted">There are no hints for this problem.</div> : (
              <div>
                {p.hints.slice(0, hints).map((h, i) => <div key={i} className="pb-alert pb-alert-warn"><b>Hint {i + 1}:</b> {h}</div>)}
                {hints < p.hints.length
                  ? <button className="pl-btn sm" onClick={() => setHints(hints + 1)}><i className="fa-regular fa-lightbulb" /> Show hint {hints + 1} of {p.hints.length}</button>
                  : <div className="pb-muted" style={{ fontSize: 13 }}>That is every hint.</div>}
              </div>
            ))}
            {leftTab === 'subs' && (
              <div>
                {!p.submissions.length && <div className="pb-muted">No submissions yet. Submit your solution to see it here.</div>}
                {p.submissions.map((s) => (
                  <div key={s._id} className="pl-case" title="Load this code into the editor"
                    onClick={() => { setLang(s.language); setTimeout(() => { setCode(s.code); writeDraft(draftKey(p._id, s.language), s.code); }, 0); }}>
                    <b style={{ color: s.verdict === 'AC' ? '#047857' : '#be123c' }}>{VERDICT_LABEL[s.verdict] || s.verdict}</b>
                    <span className="nm pb-muted" style={{ fontWeight: 500 }}>{s.passed}/{s.total} tests · {s.score}/{s.maxScore} marks</span>
                    <span className="pb-lang">{LANG_SHORT[s.language] || s.language}</span>
                    <span className="pb-faint" style={{ fontSize: 12 }}>{relTime(s.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
            {leftTab === 'editorial' && (p.editorial ? <Markdown text={p.editorial} /> : solved
              ? <div className="pb-muted">No editorial has been written for this problem.</div>
              : <div className="pb-alert pb-alert-info"><i className="fa-solid fa-lock" /> The editorial unlocks once you solve the problem.</div>)}
          </div>
        </div>

        {/* ── Editor + console ── */}
        <div className="pl-card pl-right">
          <div className="bar">
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
              {p.languages.map((l) => <option key={l.language} value={l.language}>{LANG_SHORT[l.language] || l.language}</option>)}
            </select>
            <span style={{ flex: 1 }} />
            <button className="pl-btn sm" onClick={() => {
              if (!window.confirm('Reset to the starter code? Your current code in this language will be replaced.')) return;
              const starter = p.languages.find((l) => l.language === lang)?.starterCode || '';
              setCode(starter); writeDraft(draftKey(p._id, lang), starter);
            }}><i className="fa-solid fa-rotate-left" /> Reset</button>
            <button className="pl-btn go" disabled={!!busy || !lang} onClick={submit} title="Ctrl+Shift+Enter">
              {busy === 'submit' ? <span className="pb-spinner" /> : <i className="fa-solid fa-cloud-arrow-up" />} Submit</button>
          </div>
          <div className="pl-editor">
            <Editor height="100%" language={MONACO_LANG[lang] || 'plaintext'} value={code} onChange={(v) => onCode(v || '')} theme="vs-dark"
              options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: lang === 'python' ? 4 : 2, padding: { top: 10 } }} />
          </div>

          <div className="pl-console">
            <div className="pl-ctabs">
              <button className={`t${cTab === 'cases' ? ' on' : ''}`} onClick={() => setCTab('cases')}>Test Cases</button>
              <button className={`t${cTab === 'custom' ? ' on' : ''}`} onClick={() => setCTab('custom')}>Custom Input</button>
              <button className={`t${cTab === 'output' ? ' on' : ''}`} onClick={() => setCTab('output')}>Output</button>
              <span className="grow" />
              <button className="pl-btn primary sm" disabled={!!busy || !lang} onClick={runTests} title="Ctrl+Enter" style={{ margin: '6px 0' }}>
                {busy === 'run' ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run Tests</button>
            </div>
            <div className="pl-cpane">
              {cTab === 'cases' && (
                <div>
                  {busy === 'submit' && <div className="pb-muted"><span className="pb-spinner" /> Judging against all tests…</div>}
                  {res && !busy && (
                    <div className={`pl-verdict ${verdictClass(res.verdict)}`}>
                      <span>{VERDICT_LABEL[res.verdict] || res.verdict}</span><span>{res.passed}/{res.total} {subRes ? 'tests' : 'examples'} passed</span>
                      <span style={{ flex: 1 }} />{subRes && <span>{res.score} / {res.maxScore} marks</span>}
                    </div>
                  )}
                  {subRes?.firstAccept && <div className="pb-alert pb-alert-ok"><i className="fa-solid fa-trophy" /> Solved!{subRes.reward ? ` +${subRes.reward.xp} XP` : ''}</div>}
                  {subRes && !subRes.recorded && <div className="pb-alert pb-alert-warn">The code runner was busy, so this was not counted. Please submit again.</div>}
                  {res?.compileError && <><div className="k pb-faint">COMPILER</div><pre className="pb-mono err">{res.compileError}</pre></>}
                  {!res?.compileError && p.samples.map((t, i) => {
                    const c = res?.cases[i];
                    const pill = !c ? 'none' : c.passed ? 'pass' : 'fail';
                    return (
                      <div key={i}>
                        <div className="pl-case" onClick={() => setOpen(open === i ? -1 : i)}>
                          <i className={`fa-solid ${!c ? 'fa-circle' : c.passed ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: !c ? '#cbd5e1' : c.passed ? '#059669' : '#dc2626' }} />
                          <span className="nm">Sample Test Case {i + 1}</span>
                          <span className={`pl-pill ${pill}`}>{!c ? 'Not run' : c.passed ? 'Pass' : 'Fail'}</span>
                          <span className="pb-faint" style={{ width: 54, textAlign: 'right', fontSize: 12 }}>{c ? `${c.timeMs} ms` : ''}</span>
                        </div>
                        {open === i && (
                          <div className="pl-detail">
                            <div className="k pb-faint">INPUT</div><pre className="pb-mono">{t.input}</pre>
                            <div className="k pb-faint">EXPECTED</div><pre className="pb-mono">{t.expectedOutput}</pre>
                            {c && c.input !== undefined && <><div className="k pb-faint">YOUR OUTPUT</div><pre className="pb-mono">{c.output || '(no output)'}</pre></>}
                            {c?.error && <pre className="pb-mono err">{c.error}</pre>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="pl-case" style={{ cursor: 'default' }}>
                    <i className="fa-solid fa-lock" style={{ color: '#5A6A80' }} />
                    <span className="nm">Hidden Test Cases</span>
                    <span className="pb-faint" style={{ fontSize: 12.5 }}>
                      {subRes && !subRes.result.compileError ? `${subRes.result.cases.filter((c) => !c.isSample && c.passed).length} of ${subRes.result.cases.filter((c) => !c.isSample).length} passed` : 'Submit to run all tests'}
                    </span>
                    <button className="pl-btn sm" disabled={!!busy || !lang} onClick={submit}>Run All</button>
                  </div>
                </div>
              )}
              {cTab === 'custom' && (
                <div>
                  <div className="pb-muted" style={{ marginBottom: 6 }}>Run your code on any input you like. Nothing is recorded.</div>
                  <textarea className="pb-textarea pb-mono" rows={5} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} style={{ width: '100%' }} />
                  <button className="pl-btn sm primary" style={{ marginTop: 8 }} disabled={!!busy || !lang} onClick={runCustom}>
                    {busy === 'custom' ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run with this input</button>
                  {customRes && !busy && (
                    <div style={{ marginTop: 10 }}>
                      <div className={`pl-verdict ${customRes.verdict === 'OK' ? 'ok' : 'bad'}`}>{VERDICT_LABEL[customRes.verdict] || customRes.verdict}{!!customRes.timeMs && <span>{customRes.timeMs} ms</span>}</div>
                      {customRes.output !== undefined && customRes.verdict !== 'RE' && <pre className="pb-mono">{customRes.output || '(no output)'}</pre>}
                      {customRes.error && <pre className="pb-mono err">{customRes.error}</pre>}
                    </div>
                  )}
                </div>
              )}
              {cTab === 'output' && (
                <div>
                  {customRes && customRes.verdict === 'RE' && <pre className="pb-mono err">{customRes.error}</pre>}
                  {res?.compileError && <pre className="pb-mono err">{res.compileError}</pre>}
                  {res && !res.compileError && !(customRes && customRes.verdict === 'RE') && (
                    <>
                      <div className={`pl-verdict ${verdictClass(res.verdict)}`}><span>{VERDICT_LABEL[res.verdict] || res.verdict}</span><span>{res.passed}/{res.total} passed</span></div>
                      {res.cases.map((c, i) => c.input !== undefined && (
                        <div key={i} className="pl-detail">
                          <b>{c.isSample ? `Example ${i + 1}` : `Test ${i + 1}`}</b>
                          <div className="k pb-faint">YOUR OUTPUT</div><pre className="pb-mono">{c.output || '(no output)'}</pre>
                          {c.error && <pre className="pb-mono err">{c.error}</pre>}
                        </div>
                      ))}
                    </>
                  )}
                  {!res && !customRes && <div className="pb-muted">Run your code to see its output here.</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibrarySolve;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import SplitWorkspace from '../../components/SplitWorkspace/SplitWorkspace';
import { poolExamApi, ExamItem, ExamPaper, examError } from '../../api/poolExamApi';
import { PbCustomResult, PbJudgeResult } from '../../api/problemBankApi';
import { LANG_SHORT, Markdown, VERDICT_LABEL } from '../ProblemBank/shared';
import { MONACO_LANG } from '../ProblemBank/templates';
import '../ProblemBank/ProblemBank.css';
import './poolExam.css';

/**
 * The exam room: one student's frozen paper, the server's clock, and the proctoring rules.
 *
 * ── NOTHING IMPORTANT LIVES ONLY IN THE BROWSER ────────────────────────────────────────────
 * Answers are saved to the server as they are given (MCQs at once, code a moment after typing
 * stops), the countdown is the server's deadline corrected for this device's clock, and a tab
 * switch is reported to the server, which decides what it costs. A refresh or a second device
 * resumes exactly where the student was.
 */

type Answer = NonNullable<ExamItem['answer']>;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
const LETTERS = 'ABCDEFGHIJ';
/** What the error box is called for each way a test can fail. */
const ERROR_LABEL: Record<string, string> = { RE: 'Runtime error', TLE: 'Time limit exceeded', CE: 'Compile error', WA: 'Error output' };
const CODE_SAVE_DELAY = 1200;

const answered = (it: ExamItem, a: Answer | null | undefined) =>
  it.kind === 'mcq' ? !!a?.selected?.length : !!a?.code?.trim() && a.code !== it.problem?.languages.find(l => l.language === a.language)?.starterCode;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

/* ── One MCQ ─────────────────────────────────────────────────────────────────────────────── */

const McqQuestion: React.FC<{ item: ExamItem; answer: Answer | null; onPick: (selected: number[]) => void }> = ({ item, answer, onPick }) => {
  const chosen = answer?.selected || [];
  const toggle = (i: number) => {
    if (!item.multiple) return onPick([i]);
    onPick(chosen.includes(i) ? chosen.filter(x => x !== i) : [...chosen, i].sort((a, b) => a - b));
  };
  return (
    <div className="exr-mcq">
      <p className="exr-question">{item.question}</p>
      <p className="exr-hint">{item.multiple ? 'Select every correct answer.' : 'Select one answer.'}</p>
      <div className="exr-options" role={item.multiple ? 'group' : 'radiogroup'} aria-label="Answer options">
        {(item.options || []).map((opt, i) => {
          const on = chosen.includes(i);
          return (
            <button key={i} type="button" className={`exr-option${on ? ' on' : ''}`} onClick={() => toggle(i)}
              role={item.multiple ? 'checkbox' : 'radio'} aria-checked={on}>
              <span className="exr-letter">{on ? <i className={`bi ${item.multiple ? 'bi-check-lg' : 'bi-check'}`} /> : LETTERS[i]}</span>
              <span className="exr-option-text">{opt}</span>
            </button>
          );
        })}
      </div>
      {chosen.length > 0 && <button type="button" className="exr-link" onClick={() => onPick([])}><i className="bi bi-x-circle" /> Clear my answer</button>}
    </div>
  );
};

/* ── One coding problem ─────────────────────────────────────────────────────────────────── */

const CodingQuestion: React.FC<{
  attemptId: string; item: ExamItem; answer: Answer | null;
  onCode: (a: Answer) => void; onTimeUp: () => void;
}> = ({ attemptId, item, answer, onCode, onTimeUp }) => {
  const p = item.problem!;
  const langs = p.languages;
  const lang = answer?.language && langs.some(l => l.language === answer.language) ? answer.language : (langs[0]?.language || '');
  const code = answer?.language === lang && answer.code !== undefined ? answer.code : (langs.find(l => l.language === lang)?.starterCode || '');
  // Code typed in another language is kept while the student compares, so switching is never destructive.
  const drafts = useRef<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<PbJudgeResult | null>(null);
  const [custom, setCustom] = useState<PbCustomResult | null>(null);
  const [runErr, setRunErr] = useState('');
  const [runsLeft, setRunsLeft] = useState(item.runsLeft ?? 0);
  const [simulated, setSimulated] = useState(false);
  const [sel, setSel] = useState(0);
  const [useCustom, setUseCustom] = useState(false);
  const [stdin, setStdin] = useState(p.samples[0]?.input || '');

  const setLang = (next: string) => {
    drafts.current[lang] = code;
    onCode({ language: next, code: drafts.current[next] ?? langs.find(l => l.language === next)?.starterCode ?? '' });
  };

  const run = async () => {
    if (busy) return;
    setBusy(true); setRunErr(''); setRes(null); setCustom(null);
    try {
      const r = await poolExamApi.run(attemptId, item.key, { language: lang, code, mode: useCustom ? 'custom' : 'samples', stdin });
      setRes(r.result || null); setCustom(r.custom || null); setRunsLeft(r.runsLeft); setSimulated(!!r.simulated);
      // Open on the first failure, so the reason is on screen without a click.
      const firstFail = r.result?.cases.findIndex(x => !x.passed) ?? -1;
      setSel(firstFail >= 0 ? firstFail : 0);
    } catch (e: any) {
      if (e?.response?.status === 409) onTimeUp();
      setRunErr(examError(e, 'Run failed.'));
    }
    setBusy(false);
  };

  const c = res?.cases[sel];
  const examples = res ? res.cases.filter(x => x.isSample) : [];
  const hidden = res ? res.cases.filter(x => !x.isSample) : [];
  // Examples and hidden tests are numbered separately: "Example 2", "Hidden 3".
  const caseLabel = (cs: { isSample: boolean }, i: number) => {
    const n = res!.cases.slice(0, i + 1).filter(x => x.isSample === cs.isSample).length;
    return cs.isSample ? `Example ${n}` : `Hidden ${n}`;
  };
  return (
    <SplitWorkspace storageKey="pool-exam" className="pb-studio-body exr-coding" stackBelow={1100} defaultPct={48} left={
      <div className="pb-studio-left">
        <div className="pb-pane">
          <div className="pb-preview">
            <h2 className="exr-ptitle">{p.title}</h2>
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
            {p.limits && <div className="pb-muted" style={{ fontSize: 12.5, marginTop: 12 }}>Time limit {p.limits.timeMs} ms · Memory {p.limits.memoryMb} MB</div>}
          </div>
        </div>
      </div>
    } right={
      <div className="pb-studio-right">
        <div className="pb-lab-top">
          {langs.length > 1 && p.kind !== 'sql' ? (
            <select className="pb-select" style={{ width: 'auto' }} value={lang} onChange={e => setLang(e.target.value)} aria-label="Language">
              {langs.map(l => <option key={l.language} value={l.language}>{LANG_SHORT[l.language] || l.language}</option>)}
            </select>
          ) : <span className="pb-lang">{LANG_SHORT[lang] || lang}</span>}
          <span className="pb-spacer" />
          <span className="pb-muted" style={{ fontSize: 12.5 }}>{runsLeft} run{runsLeft === 1 ? '' : 's'} left</span>
          <button className="pb-btn pb-btn-sm" disabled={busy || !lang || runsLeft <= 0} onClick={run}>
            {busy ? <span className="pb-spinner" /> : <i className="fa-solid fa-play" />} Run
          </button>
        </div>
        <div className="pb-lab-editor">
          <Editor height="100%" language={MONACO_LANG[lang] || 'plaintext'} value={code} theme="light"
            onChange={v => onCode({ language: lang, code: v || '' })}
            options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, automaticLayout: true, tabSize: lang === 'python' ? 4 : 2, contextmenu: false }} />
        </div>
        <div className="pb-lab-out">
          <label className="pb-switch" style={{ marginBottom: 8 }}>
            <input type="checkbox" checked={useCustom} onChange={e => setUseCustom(e.target.checked)} /> Run with my own input
          </label>
          {useCustom && <textarea className="pb-textarea pb-mono" rows={3} value={stdin} onChange={e => setStdin(e.target.value)} spellCheck={false} aria-label="Your input" />}
          {!busy && simulated && (res || custom) && (
            <div className="pb-alert pb-alert-warn" style={{ marginTop: 8 }}>
              <b>The code runner is not connected on this server</b>, so your code was not really run and these results are not real.
              Your code is saved. Tell your teacher.
            </div>
          )}
          {busy ? <div className="pb-muted" style={{ marginTop: 8 }}><span className="pb-spinner" /> Running…</div>
            : runErr ? <div className="pb-alert pb-alert-bad">{runErr}</div>
              : custom ? (
                <div style={{ marginTop: 8 }}>
                  <div className={`pb-verdict pb-v-${custom.verdict}`}><b>{VERDICT_LABEL[custom.verdict] || custom.verdict}</b>{!!custom.timeMs && <span>{custom.timeMs} ms</span>}</div>
                  {custom.verdict !== 'RE' && <div className="pb-io"><div className="k">Output</div><pre className="pb-mono console">{custom.output || '(no output)'}</pre></div>}
                  {custom.error && <div className="pb-io"><div className="k">Error</div><pre className="pb-mono err">{custom.error}</pre></div>}
                </div>
              ) : res ? (
                <div style={{ marginTop: 8 }}>
                  <div className={`pb-verdict pb-v-${res.verdict}`}>
                    <b>{VERDICT_LABEL[res.verdict] || res.verdict}</b>
                    <span>
                      {examples.filter(x => x.passed).length}/{examples.length} example{examples.length === 1 ? '' : 's'}
                      {hidden.length > 0 && <> · {hidden.filter(x => x.passed).length}/{hidden.length} hidden test{hidden.length === 1 ? '' : 's'}</>} passed
                    </span>
                  </div>
                  {res.compileError ? <div className="pb-io"><div className="k">Compile error</div><pre className="pb-mono err">{res.compileError}</pre></div> : <>
                    <div className="pb-case-strip">
                      {res.cases.map((cs, i) => (
                        <button key={i} className={`pb-case-dot ${cs.passed ? 'pass' : 'fail'} ${sel === i ? 'sel' : ''}`} onClick={() => setSel(i)}>
                          {!cs.isSample && <i className="fa-solid fa-lock" style={{ fontSize: 10, marginRight: 4 }} aria-hidden />}
                          {caseLabel(cs, i)} {cs.passed ? '✓' : '✗'}
                        </button>
                      ))}
                    </div>
                    {c && (c.isSample ? <>
                      <div className="pb-io"><div className="k">Input</div><pre className="pb-mono">{c.input || '(empty)'}</pre></div>
                      <div className="pb-test-grid" style={{ padding: 0 }}>
                        <div className="pb-io"><div className="k">Expected</div><pre className="pb-mono">{c.expectedOutput}</pre></div>
                        <div className="pb-io"><div className="k">Your output</div><pre className="pb-mono console">{c.output || '(no output)'}</pre></div>
                      </div>
                      {c.error && <div className="pb-io"><div className="k">{ERROR_LABEL[c.verdict] || 'Error'}</div><pre className="pb-mono err">{c.error}</pre></div>}
                    </> : <>
                      <div className={`exr-hidden ${c.passed ? 'pass' : 'fail'}`}>
                        <i className={`fa-solid ${c.passed ? 'fa-circle-check' : 'fa-circle-xmark'}`} aria-hidden />
                        <div>
                          <b>{caseLabel(c, sel)} {c.passed ? 'passed' : `failed — ${VERDICT_LABEL[c.verdict] || c.verdict}`}</b>
                          <span>A hidden test's input and expected output are not shown{c.passed ? '.' : ' — check your code against the constraints and edge cases.'}</span>
                        </div>
                      </div>
                      {c.error && <div className="pb-io"><div className="k">{ERROR_LABEL[c.verdict] || 'Error'}</div><pre className="pb-mono err">{c.error}</pre></div>}
                    </>)}
                  </>}
                </div>
              ) : <div className="pb-muted" style={{ fontSize: 13 }}>Run checks your code against the examples and the hidden tests. Hidden tests show only whether they passed. Your saved code is marked when you submit the exam.</div>}
        </div>
      </div>
    } />
  );
};

/* ── The room ────────────────────────────────────────────────────────────────────────────── */

const ExamRoom: React.FC = () => {
  const { assignmentId = '', attemptId = '' } = useParams<{ assignmentId: string; attemptId: string }>();
  const nav = useNavigate();
  const [paper, setPaper] = useState<ExamPaper | null>(null);
  const [err, setErr] = useState('');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer | null>>({});
  const [saves, setSaves] = useState<Record<string, SaveState>>({});
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [warning, setWarning] = useState<{ count: number; max: number } | null>(null);
  const [toast, setToast] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const timers = useRef<Record<string, any>>({});
  const pending = useRef<Record<string, Answer>>({});
  const timeUpSent = useRef(false);

  const load = useCallback(() => {
    poolExamApi.paper(attemptId).then(p => {
      setPaper(p);
      setOffset(new Date(p.serverNow).getTime() - Date.now());
      setAnswers(Object.fromEntries(p.items.map(i => [i.key, i.answer])));
    }).catch(e => setErr(examError(e, 'Could not open your paper.')));
  }, [attemptId]);
  useEffect(load, [load]);

  const live = paper?.status === 'in_progress';
  const items = useMemo(() => paper?.items || [], [paper]);
  const item = items[idx];

  /* Saving */
  const pushSave = useCallback(async (key: string, a: Answer) => {
    setSaves(s => ({ ...s, [key]: 'saving' }));
    try {
      await poolExamApi.save(attemptId, key, a);
      if (pending.current[key] === a) delete pending.current[key];
      setSaves(s => ({ ...s, [key]: 'saved' }));
    } catch (e: any) {
      setSaves(s => ({ ...s, [key]: 'error' }));
      if (e?.response?.status === 409) load();
    }
  }, [attemptId, load]);

  const setAnswer = (key: string, a: Answer, delay: number) => {
    setAnswers(x => ({ ...x, [key]: a }));
    pending.current[key] = a;
    clearTimeout(timers.current[key]);
    if (!delay) pushSave(key, a);
    else { setSaves(s => ({ ...s, [key]: 'saving' })); timers.current[key] = setTimeout(() => pushSave(key, a), delay); }
  };

  const flush = useCallback(async () => {
    await Promise.all(Object.entries(pending.current).map(([k, a]) => { clearTimeout(timers.current[k]); return pushSave(k, a); }));
  }, [pushSave]);

  /* Clock */
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const remaining = paper?.deadlineAt ? new Date(paper.deadlineAt).getTime() - (now + offset) : null;
  useEffect(() => {
    if (!live || remaining === null || remaining > 0 || timeUpSent.current) return;
    timeUpSent.current = true;
    flush().finally(() => poolExamApi.submit(attemptId).finally(load));
  }, [live, remaining, attemptId, flush, load]);

  /* Proctoring */
  const say = (text: string) => { setToast(text); setTimeout(() => setToast(''), 3500); };
  useEffect(() => {
    if (!live || !paper?.rules.tabSwitch.enabled) return;
    const onHide = () => {
      if (!document.hidden) return;
      poolExamApi.violation(attemptId, 'tab_switch').then(r => {
        if (r.submitted) load();
        else setWarning({ count: r.tabSwitches, max: r.maxWarnings || paper.rules.tabSwitch.maxWarnings });
      }).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [live, paper, attemptId, load]);

  useEffect(() => {
    if (!live || !paper?.rules.blockCopyPaste) return;
    let last = 0;
    // Caught on the way down (capture), before the code editor sees the event, so it cannot paste either.
    const block = (e: Event) => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (e.type === 'contextmenu') return;
      say('Copy and paste are turned off in this exam.');
      if (Date.now() - last > 5000) {
        last = Date.now();
        poolExamApi.violation(attemptId, e.type === 'paste' || e.type === 'drop' ? 'paste' : 'copy').catch(() => undefined);
      }
    };
    const kinds = ['copy', 'cut', 'paste', 'drop', 'contextmenu'];
    kinds.forEach(k => document.addEventListener(k, block, true));
    return () => kinds.forEach(k => document.removeEventListener(k, block, true));
  }, [live, paper, attemptId]);

  useEffect(() => {
    if (!live) return;
    const warn = (e: BeforeUnloadEvent) => { if (Object.keys(pending.current).length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);

  const submit = async () => {
    setSubmitting(true);
    await flush();
    try { await poolExamApi.submit(attemptId); } catch { /* already handed in: the reload shows it */ }
    setConfirm(false); setSubmitting(false);
    load();
  };

  /* Screens */
  if (err) return <div className="exr-full"><div className="exl-card exl-empty"><i className="bi bi-exclamation-circle" /><h2>Your paper could not be opened</h2><p>{err}</p>
    <button className="exl-btn" onClick={() => nav(`/exams/${assignmentId}`)}><i className="bi bi-arrow-left" /> Back to the exam</button></div></div>;
  if (!paper) return <div className="exr-full"><div className="exl-card exl-empty"><span className="exl-spinner" /><p>Opening your paper…</p></div></div>;

  const doneCount = items.filter(i => answered(i, answers[i.key])).length;

  if (!live) {
    const why = paper.submitReason === 'time_up' ? 'Time ran out, so your paper was submitted automatically.'
      : paper.submitReason === 'tab_switch' ? 'Your paper was submitted automatically because you left the exam too many times.'
        : 'Your answers have been handed in.';
    return (
      <div className="exr-full">
        <div className="exl-card exr-done">
          <span className={`exr-done-icon ${paper.submitReason === 'student' ? 'ok' : 'warn'}`}><i className={`bi ${paper.submitReason === 'student' ? 'bi-check2-circle' : 'bi-clock-history'}`} /></span>
          <h1>Exam submitted</h1>
          <p>{why}</p>
          <div className="exr-done-stats">
            <div><b>{doneCount}</b><span>of {items.length} answered</span></div>
            <div><b>{paper.maxScore}</b><span>marks in the paper</span></div>
          </div>
          <p className="exr-done-note">Your result will appear on the exam page once it has been marked and released.</p>
          <div className="exr-done-actions">
            <button className="exl-btn" onClick={() => nav(`/exams/${assignmentId}`)}>Go to the exam page</button>
            <button className="exl-btn exl-btn-ghost" onClick={() => nav('/assignments')}>My assignments</button>
          </div>
        </div>
      </div>
    );
  }

  const sections = Array.from(new Set(items.map(i => i.sectionKey))).map(k => ({ key: k, title: items.find(i => i.sectionKey === k)!.sectionTitle }));
  const saveState = item ? saves[item.key] || 'idle' : 'idle';
  const anyError = Object.values(saves).includes('error');
  const low = remaining !== null && remaining < 5 * 60_000;
  const go = (i: number) => { setIdx(Math.min(Math.max(i, 0), items.length - 1)); setNavOpen(false); };
  const unanswered = items.map((it, i) => ({ it, i })).filter(({ it }) => !answered(it, answers[it.key]));

  return (
    <div className={`exr${item?.kind === 'coding' ? ' coding' : ''}`}>
      <header className="exr-bar">
        <div className="exr-title">
          <b title={paper.title}>{paper.title}</b>
          <small>Attempt {paper.attemptNumber} · {doneCount} of {items.length} answered</small>
        </div>
        <div className="exr-progress" aria-hidden><span style={{ width: `${(doneCount / Math.max(items.length, 1)) * 100}%` }} /></div>
        <span className={`exr-save ${anyError ? 'error' : saveState}`} aria-live="polite">
          {anyError ? <><i className="bi bi-exclamation-triangle" /> Not saved — retrying</>
            : saveState === 'saving' ? <><span className="exl-spinner sm light" /> Saving…</>
              : saveState === 'saved' ? <><i className="bi bi-cloud-check" /> Saved</> : null}
        </span>
        {remaining !== null && (
          <span className={`exr-timer${low ? ' low' : ''}`} role="timer" aria-label="Time left"><i className="bi bi-stopwatch" /> {clock(remaining)}</span>
        )}
        <button className="exr-submit" onClick={() => { flush(); setConfirm(true); }}><i className="bi bi-send-check" /> <span>Submit</span></button>
      </header>

      <div className="exr-body">
        <nav className={`exr-nav${navOpen ? ' open' : ''}`} aria-label="Questions">
          <button className="exr-nav-toggle" onClick={() => setNavOpen(o => !o)} aria-expanded={navOpen}>
            <i className="bi bi-grid-3x3-gap" /> Questions <small>· {doneCount} of {items.length} answered</small> <i className={`bi bi-chevron-${navOpen ? 'up' : 'down'}`} />
          </button>
          <div className="exr-nav-body">
            {sections.map(s => (
              <div key={s.key} className="exr-nav-sec">
                <div className="exr-nav-head">{s.title}</div>
                <div className="exr-chips">
                  {items.map((it, i) => it.sectionKey !== s.key ? null : (
                    <button key={it.key} className={`exr-chip${i === idx ? ' cur' : ''}${answered(it, answers[it.key]) ? ' done' : ''}`}
                      onClick={() => go(i)} aria-label={`Question ${i + 1}${answered(it, answers[it.key]) ? ', answered' : ''}`} aria-current={i === idx}>
                      {i + 1}{it.kind === 'coding' && <i className="bi bi-code-slash" />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="exr-legend">
              <span><i className="exr-chip done sm" /> Answered</span>
              <span><i className="exr-chip sm" /> Not answered</span>
              <span><i className="exr-chip cur sm" /> Current</span>
            </div>
          </div>
        </nav>

        <main className="exr-main">
          {item && <>
            <div className="exr-qhead">
              <span className="exr-qno">Question {idx + 1}<small> of {items.length}</small></span>
              <span className="exr-tag">{item.sectionTitle}</span>
              <span className={`exr-tag lvl ${item.difficulty}`}>{item.difficulty}</span>
              <span className="exr-tag marks">{item.marks} mark{item.marks === 1 ? '' : 's'}</span>
            </div>
            <div className={`exr-stage${item.kind === 'coding' ? ' pb-root' : ''}`} key={item.key}>
              {item.kind === 'mcq'
                ? <McqQuestion item={item} answer={answers[item.key]} onPick={sel => setAnswer(item.key, { selected: sel }, 0)} />
                : <CodingQuestion attemptId={attemptId} item={item} answer={answers[item.key]} onTimeUp={load}
                  onCode={a => setAnswer(item.key, a, CODE_SAVE_DELAY)} />}
            </div>
            <footer className="exr-foot">
              <button className="exl-btn exl-btn-ghost" disabled={idx === 0} onClick={() => { flush(); go(idx - 1); }}><i className="bi bi-arrow-left" /> <span>Previous</span></button>
              <span className="exr-foot-state">{answered(item, answers[item.key]) ? <><i className="bi bi-check-circle-fill" /> Answered</> : 'Not answered yet'}</span>
              {idx < items.length - 1
                ? <button className="exl-btn" onClick={() => { flush(); go(idx + 1); }}><span>Next</span> <i className="bi bi-arrow-right" /></button>
                : <button className="exl-btn" onClick={() => { flush(); setConfirm(true); }}><span className="long">Review &amp; submit</span><span className="short">Finish</span> <i className="bi bi-send-check" /></button>}
            </footer>
          </>}
        </main>
      </div>

      {confirm && (
        <div className="exr-modal-back" role="dialog" aria-modal="true" aria-labelledby="exr-confirm-title">
          <div className="exr-modal">
            <h2 id="exr-confirm-title">Ready to submit?</h2>
            <p>You have answered <b>{doneCount} of {items.length}</b> questions. Once you submit, you cannot change your answers.</p>
            {!!unanswered.length && (
              <div className="exr-unanswered">
                <span>Not answered:</span>
                {unanswered.map(({ i }) => <button key={i} className="exr-chip" onClick={() => { setConfirm(false); go(i); }}>{i + 1}</button>)}
              </div>
            )}
            <div className="exr-modal-actions">
              <button className="exl-btn exl-btn-ghost" onClick={() => setConfirm(false)} disabled={submitting}>Keep working</button>
              <button className="exl-btn exl-btn-danger" onClick={submit} disabled={submitting}>{submitting ? <><span className="exl-spinner sm light" /> Submitting…</> : 'Submit exam'}</button>
            </div>
          </div>
        </div>
      )}

      {warning && (
        <div className="exr-modal-back" role="alertdialog" aria-modal="true" aria-labelledby="exr-warn-title">
          <div className="exr-modal warn">
            <span className="exr-modal-icon"><i className="bi bi-exclamation-triangle-fill" /></span>
            <h2 id="exr-warn-title">You left the exam</h2>
            <p>Leaving this tab is recorded. This is warning <b>{warning.count} of {warning.max}</b>.
              {paper.rules.tabSwitch.autoSubmit && (warning.count >= warning.max
                ? ' If you leave again, your paper will be submitted automatically.'
                : ` After ${warning.max} warnings, your paper is submitted automatically.`)}</p>
            <div className="exr-modal-actions"><button className="exl-btn" onClick={() => setWarning(null)}>Back to the exam</button></div>
          </div>
        </div>
      )}

      {toast && <div className="exr-toast" role="status"><i className="bi bi-clipboard-x" /> {toast}</div>}
    </div>
  );
};

export default ExamRoom;

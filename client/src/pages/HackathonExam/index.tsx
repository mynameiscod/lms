import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  hackathonExamApi as api, ExamOverview, ExamQuestion, RunResult,
} from '../../api/hackathonExamApi';
import './hackathonExam.css';

/**
 * The candidate's exam, end to end: team code → OTP → instructions → paper → submitted.
 *
 * ── THE CLOCK IS THE SERVER'S ─────────────────────────────────────────────────────────────
 *
 * The countdown is derived from `endsAt` and an offset measured against `serverNow`, never
 * from the browser's own time — which can be wrong, and can be changed. The heartbeat also
 * carries the authoritative "you are out of time", so the paper closes even if this tab has
 * been asleep and its own timer never fired.
 *
 * ── EVERY ANSWER IS SAVED AS IT IS MADE ───────────────────────────────────────────────────
 *
 * Nothing is held until submit. A dropped connection, a flat battery or a closed lid must cost
 * a candidate nothing, so each change is written through and the paper is rebuilt from the
 * server on reload.
 *
 * ── SECTIONS ARE FREELY NAVIGABLE ─────────────────────────────────────────────────────────
 *
 * A candidate can start with the coding problem or with the MCQs, and move between them
 * whenever they like — which is what somebody sitting a mixed paper actually needs, rather
 * than being marched through it in one order.
 */

type Phase = 'loading' | 'entry' | 'otp' | 'instructions' | 'exam' | 'submitted' | 'gate';

const mmss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
};

const TOKEN_KEY = 'hx-exam-token';

const HackathonExam: React.FC = () => {
  const { slug: routeSlug, token: routeToken } = useParams();
  const [search] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('loading');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  /* entry */
  const [slug, setSlug] = useState(routeSlug || search.get('slug') || '');
  const [teamCode, setTeamCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [masked, setMasked] = useState('');

  /* the paper */
  const [token, setToken] = useState(routeToken || sessionStorage.getItem(TOKEN_KEY) || '');
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeSection, setActiveSection] = useState('');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds?: string[]; code?: string; text?: string }>>({});
  const [runs, setRuns] = useState<Record<string, RunResult | null>>({});
  const [running, setRunning] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  /* timing + proctoring */
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [skewMs, setSkewMs] = useState(0);
  const [left, setLeft] = useState(0);
  const [warn, setWarn] = useState<string>('');
  const [done, setDone] = useState<{ answered: number; total: number; timeSpentSec: number } | null>(null);

  const submitRef = useRef<() => void>(() => {});
  const phaseRef = useRef<Phase>('loading');
  phaseRef.current = phase;

  /* ── bootstrap ─────────────────────────────────────────────────────────── */

  const loadOverview = useCallback(async (t: string) => {
    const o = await api.overview(t);
    setOverview(o);
    setActiveSection((s) => s || o.exam.sections[0]?.key || '');
    if (o.attempt.submittedAt) { setPhase('submitted'); return; }
    if (o.gate && !o.attempt.startedAt) { setPhase('gate'); setErr(o.gate.message); return; }
    setPhase('instructions');
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (token) { await loadOverview(token); return; }
        setPhase('entry');
      } catch (e: any) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken('');
        setPhase('entry');
        setErr(e.message || '');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── entry ─────────────────────────────────────────────────────────────── */

  const askOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.requestOtp(slug, teamCode, mobile);
      setMasked(r.maskedMobile);
      setPhase('otp');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const confirmOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.verifyOtp(slug, teamCode, mobile, otp);
      sessionStorage.setItem(TOKEN_KEY, r.examToken);
      setToken(r.examToken);
      await loadOverview(r.examToken);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  /* ── the paper ─────────────────────────────────────────────────────────── */

  const begin = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.start(token);
      setQuestions(r.questions);
      const seeded: Record<string, any> = {};
      r.questions.forEach((q) => {
        seeded[q.itemId] = {
          selectedOptionIds: q.answer?.selectedOptionIds,
          code: q.answer?.code ?? q.starterCode ?? '',
          text: q.answer?.text,
        };
      });
      setAnswers(seeded);
      setEndsAt(new Date(r.endsAt));
      setSkewMs(new Date(r.serverNow).getTime() - Date.now());
      setActiveSection(r.questions[0]?.sectionKey || '');
      setIdx(0);
      setPhase('exam');
      if (overview?.exam.proctoring?.fullscreen?.required) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    } catch (e: any) {
      setErr(e.message);
      if (e.code === 'ANOTHER_DEVICE') setPhase('instructions');
    } finally { setBusy(false); }
  };

  /** Server time, as best this tab can know it. */
  const serverNow = useCallback(() => Date.now() + skewMs, [skewMs]);

  useEffect(() => {
    if (phase !== 'exam' || !endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.round((endsAt.getTime() - serverNow()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, serverNow]);

  /* Local countdown reaching zero ends the paper; the heartbeat is the backstop. */
  useEffect(() => {
    if (phase === 'exam' && endsAt && left === 0) submitRef.current();
  }, [left, phase, endsAt]);

  useEffect(() => {
    if (phase !== 'exam') return;
    const id = setInterval(async () => {
      try {
        const h = await api.heartbeat(token);
        setSkewMs(new Date(h.serverNow).getTime() - Date.now());
        if (h.submitted) { setWarn(''); setPhase('submitted'); }
        else if (h.endsAt) setEndsAt(new Date(h.endsAt));
      } catch { /* a dropped beat is not worth interrupting the paper for */ }
    }, 20000);
    return () => clearInterval(id);
  }, [phase, token]);

  /* ── autosave ──────────────────────────────────────────────────────────── */

  const saveTimers = useRef<Record<string, any>>({});

  const setAnswer = (q: ExamQuestion, patch: { selectedOptionIds?: string[]; code?: string; text?: string }) => {
    setAnswers((prev) => ({ ...prev, [q.itemId]: { ...prev[q.itemId], ...patch } }));

    /* MCQ writes through at once; typing is debounced so a code editor is not a chat client. */
    const delay = patch.code !== undefined || patch.text !== undefined ? 1200 : 0;
    clearTimeout(saveTimers.current[q.itemId]);
    saveTimers.current[q.itemId] = setTimeout(async () => {
      try {
        await api.saveAnswer(token, { itemId: q.itemId, language: q.language, ...patch });
        setSavedAt(new Date());
      } catch { /* the next keystroke retries; submit re-sends everything anyway */ }
    }, delay);
  };

  /* ── proctoring, reported to the server which decides ──────────────────── */

  const report = useCallback(async (kind: string, meta?: any) => {
    try {
      const out = await api.reportViolation(token, kind, meta);
      if (out.autoSubmitted) { setPhase('submitted'); setWarn(out.message || ''); return; }
      if (out.message) setWarn(out.message);
    } catch { /* never block the paper on a failed report */ }
  }, [token]);

  useEffect(() => {
    if (phase !== 'exam') return;
    let last = 0;
    const bump = (kind: string) => {
      const t = Date.now();
      if (t - last < 800) return;      // one switch fires both visibilitychange and blur
      last = t;
      report(kind);
    };
    const onVis = () => { if (document.hidden) bump('tab_switch'); };
    const onBlur = () => bump('window_blur');
    const onFs = () => { if (!document.fullscreenElement) report('fullscreen_exit'); };
    const onCopy = (e: ClipboardEvent) => {
      if (!overview?.exam.proctoring?.copyPasteBlocked) return;
      e.preventDefault(); report('copy_blocked');
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!overview?.exam.proctoring?.copyPasteBlocked) return;
      e.preventDefault(); report('paste_blocked');
    };
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [phase, report, overview]);

  /* ── run + submit ──────────────────────────────────────────────────────── */

  const runCode = async (q: ExamQuestion) => {
    setRunning(true); setErr('');
    try {
      const r = await api.run(token, q.itemId, answers[q.itemId]?.code || '', q.language);
      setRuns((p) => ({ ...p, [q.itemId]: r }));
    } catch (e: any) {
      setRuns((p) => ({ ...p, [q.itemId]: null }));
      setErr(e.message);
    } finally { setRunning(false); }
  };

  const submit = useCallback(async () => {
    if (phaseRef.current !== 'exam') return;
    setBusy(true);
    try {
      const r = await api.submit(token);
      setDone({ answered: r.answered, total: r.totalQuestions, timeSpentSec: r.timeSpentSec });
      setPhase('submitted');
      document.exitFullscreen?.().catch(() => {});
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }, [token]);
  submitRef.current = submit;

  /* ── derived ───────────────────────────────────────────────────────────── */

  const sections = overview?.exam.sections || [];
  const inSection = useMemo(
    () => questions.filter((q) => q.sectionKey === activeSection),
    [questions, activeSection],
  );
  const q = inSection[idx];
  const answeredCount = useMemo(
    () => questions.filter((x) => {
      const a = answers[x.itemId];
      return !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
    }).length,
    [questions, answers],
  );
  const isCoding = q?.type === 'live_code' || q?.type === 'sql';
  const runsLeft = runs[q?.itemId || '']?.runsLeft;
  const maxRuns = overview?.exam.runPolicy?.maxRunsPerQuestion ?? 0;
  const usedRuns = runs[q?.itemId || '']?.runsUsed ?? q?.answer?.runsUsed ?? 0;

  /* ── screens ───────────────────────────────────────────────────────────── */

  if (phase === 'loading') {
    return <div className="hx-page"><div className="hx-mid"><div className="hx-card">Loading…</div></div></div>;
  }

  if (phase === 'entry' || phase === 'otp') {
    return (
      <div className="hx-page">
        <div className="hx-hero">
          <div className="hx-hero-in">
            <span className="hx-eyebrow">HACKATHON</span>
            <h1>Enter your exam</h1>
            <p>Use the team code from your registration confirmation and your own mobile number.</p>
          </div>
        </div>
        <div className="hx-mid">
          <div className="hx-card">
            {phase === 'entry' ? (
              <>
                {!routeSlug && (
                  <>
                    <label className="hx-label">Event</label>
                    <input className="hx-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="event-slug" />
                  </>
                )}
                <label className="hx-label">Team code</label>
                <input
                  className="hx-input hx-code"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  placeholder="HK-XXXX-XXXX"
                  autoFocus
                />
                <label className="hx-label">Your mobile number</label>
                <input
                  className="hx-input"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                  inputMode="numeric"
                />
                <p className="hx-hint">
                  It must be the number you gave when your team registered — the code to start is sent there,
                  and it is how we know the paper is yours.
                </p>
                <button className="hx-btn" disabled={busy || !teamCode || mobile.length !== 10} onClick={askOtp}>
                  {busy ? 'Sending…' : 'Send me a code'}
                </button>
              </>
            ) : (
              <>
                <div className="hx-ok">We sent a code to {masked}.</div>
                <label className="hx-label">Enter the code</label>
                <input
                  className="hx-input hx-otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="······"
                  inputMode="numeric"
                  autoFocus
                />
                <button className="hx-btn" disabled={busy || otp.length < 4} onClick={confirmOtp}>
                  {busy ? 'Checking…' : 'Verify'}
                </button>
                <button className="hx-link" onClick={() => { setPhase('entry'); setOtp(''); setErr(''); }}>
                  Use a different number
                </button>
              </>
            )}
            {err && <div className="hx-err">{err}</div>}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'gate') {
    return (
      <div className="hx-page">
        <div className="hx-mid">
          <div className="hx-card hx-centre">
            <div className="hx-big">⏳</div>
            <h2>{err}</h2>
            {overview && (
              <p className="hx-hint">
                {overview.exam.title} · starts {new Date(overview.exam.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'instructions' && overview) {
    const e = overview.exam;
    return (
      <div className="hx-page">
        <div className="hx-hero">
          <div className="hx-hero-in">
            <span className="hx-eyebrow">{overview.hackathon.title || 'HACKATHON'}</span>
            <h1>{e.title}</h1>
            <p>{overview.candidate.name} · team <b>{overview.candidate.teamName}</b> ({overview.candidate.teamCode})</p>
            <div className="hx-meta">
              <div><b>{e.durationMins}</b> minutes</div>
              <div><b>{e.totalQuestions}</b> questions</div>
              <div><b>{e.totalMarks}</b> marks</div>
            </div>
          </div>
        </div>
        <div className="hx-mid hx-wide">
          <div className="hx-card">
            <h3 className="hx-h3">What you will sit</h3>
            <div className="hx-sections">
              {e.sections.map((s) => (
                <div className="hx-sec-chip" key={s.key}><b>{s.count}</b> {s.label}</div>
              ))}
            </div>

            <h3 className="hx-h3">How it works</h3>
            <ul className="hx-rules">
              <li>You have <b>{e.durationMins} minutes</b> from the moment you begin. The clock does not stop, and it does not restart if you reload.</li>
              {e.navigation === 'free' && <li>Answer the sections <b>in any order</b> — start with the coding problem or the questions, whichever you prefer, and move between them freely.</li>}
              <li>Every answer is <b>saved as you make it</b>. If your connection drops, reopen this link and carry on where you left off.</li>
              {e.runPolicy?.enabled && (
                <li>You can run your code against the sample cases
                  {e.runPolicy.maxRunsPerQuestion > 0 ? <> — up to <b>{e.runPolicy.maxRunsPerQuestion} times per question</b></> : ''}.
                  Your answer is graded against more cases than you can see, so make it work in general, not just for the samples.</li>
              )}
              {e.proctoring?.tabSwitch?.enabled && (
                <li><b>Stay on this tab.</b> Leaving it is recorded, and after {e.proctoring.tabSwitch.maxWarnings} times your exam is submitted automatically.</li>
              )}
              {e.proctoring?.fullscreen?.required && <li>The exam runs in fullscreen. Leaving fullscreen is recorded.</li>}
              {e.proctoring?.copyPasteBlocked && <li>Copy and paste are disabled.</li>}
              <li>Your team's result is the <b>average across all registered members</b>, so every member sitting it matters.</li>
            </ul>

            {e.instructions && (
              <>
                <h3 className="hx-h3">From the organisers</h3>
                <div className="hx-rich" dangerouslySetInnerHTML={{ __html: e.instructions }} />
              </>
            )}

            {err && <div className="hx-err">{err}</div>}
            <button className="hx-btn" disabled={busy} onClick={begin}>
              {busy ? 'Opening…' : overview.attempt.startedAt ? 'Resume my exam' : 'Start my exam'}
            </button>
            {overview.attempt.startedAt && (
              <p className="hx-hint">You already started — your original time still applies.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="hx-page">
        <div className="hx-mid">
          <div className="hx-card hx-centre">
            <div className="hx-big">✅</div>
            <h2>Your answers are in</h2>
            {done && (
              <p className="hx-hint">
                {done.answered} of {done.total} questions answered · {Math.round(done.timeSpentSec / 60)} minutes
              </p>
            )}
            {warn && <div className="hx-err">{warn}</div>}
            <p className="hx-hint">
              Results are published by the organisers. You will get yours by email and WhatsApp
              when they are ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── the exam ──────────────────────────────────────────────────────────── */

  const low = left <= 300;

  return (
    <div className="hx-exam">
      <div className="hx-bar">
        <div className="hx-bar-l">
          <b>{overview?.exam.title}</b>
          <span className="hx-bar-sub">{overview?.candidate.teamName}</span>
        </div>
        <div className="hx-tabs">
          {sections.map((s) => {
            const qs = questions.filter((x) => x.sectionKey === s.key);
            const ans = qs.filter((x) => {
              const a = answers[x.itemId];
              return !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
            }).length;
            return (
              <button
                key={s.key}
                className={`hx-tab ${activeSection === s.key ? 'on' : ''}`}
                onClick={() => { setActiveSection(s.key); setIdx(0); }}
              >
                {s.label} <span className="hx-tab-n">{ans}/{qs.length}</span>
              </button>
            );
          })}
        </div>
        <div className={`hx-clock ${low ? 'low' : ''}`}>{mmss(left)}</div>
      </div>

      {warn && <div className="hx-warn">⚠️ {warn}</div>}

      <div className="hx-body">
        <aside className="hx-nav">
          <div className="hx-nav-head">{answeredCount}/{questions.length} answered</div>
          <div className="hx-grid">
            {inSection.map((x, i) => {
              const a = answers[x.itemId];
              const filled = !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
              return (
                <button
                  key={x.itemId}
                  className={`hx-dot ${i === idx ? 'on' : ''} ${filled ? 'done' : ''}`}
                  onClick={() => setIdx(i)}
                >{i + 1}</button>
              );
            })}
          </div>
          <button className="hx-btn hx-submit" disabled={busy} onClick={() => {
            if (window.confirm(`Submit now? You have answered ${answeredCount} of ${questions.length}.`)) submit();
          }}>
            {busy ? 'Submitting…' : 'Submit exam'}
          </button>
          {savedAt && <div className="hx-saved">Saved {savedAt.toLocaleTimeString('en-IN')}</div>}
        </aside>

        <main className="hx-main">
          {!q ? <div className="hx-card">Nothing in this section.</div> : (
            <>
              <div className="hx-qhead">
                <span>Question {idx + 1} of {inSection.length}</span>
                <span className="hx-marks">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
              </div>
              <div className="hx-prompt">{q.prompt}</div>
              {q.codeSnippet && <pre className="hx-snippet">{q.codeSnippet}</pre>}

              {q.type === 'mcq' && (
                <div className="hx-opts">
                  {(q.options || []).map((o) => {
                    const on = (answers[q.itemId]?.selectedOptionIds || []).includes(o.id);
                    return (
                      <button
                        key={o.id}
                        className={`hx-opt ${on ? 'on' : ''}`}
                        onClick={() => setAnswer(q, { selectedOptionIds: on ? [] : [o.id] })}
                      >
                        <span className="hx-opt-id">{o.id.toUpperCase()}</span>{o.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {isCoding && (
                <div className="hx-code">
                  <div className="hx-ed-head">
                    <span>{q.language || 'code'}</span>
                    {maxRuns > 0 && (
                      <span className="hx-runs">
                        {runsLeft !== null && runsLeft !== undefined ? runsLeft : Math.max(0, maxRuns - usedRuns)} run(s) left
                      </span>
                    )}
                  </div>
                  <Editor
                    height="340px"
                    language={q.language === 'sql' || q.type === 'sql' ? 'sql' : (q.language || 'java')}
                    value={answers[q.itemId]?.code ?? ''}
                    onChange={(v) => setAnswer(q, { code: v ?? '' })}
                    options={{ minimap: { enabled: false }, fontSize: 13.5, scrollBeyondLastLine: false, automaticLayout: true }}
                  />
                  {overview?.exam.runPolicy?.enabled && (
                    <button className="hx-btn hx-run" disabled={running} onClick={() => runCode(q)}>
                      {running ? 'Running…' : '▶ Run against samples'}
                    </button>
                  )}
                  {!!q.sampleCases?.length && (
                    <div className="hx-cases">
                      <div className="hx-cases-head">Sample cases</div>
                      {q.sampleCases.map((c, i) => {
                        const got = runs[q.itemId]?.cases?.[i];
                        return (
                          <div className={`hx-case ${got ? (got.passed ? 'ok' : 'bad') : ''}`} key={i}>
                            <div><span>Input</span><pre>{c.input || '—'}</pre></div>
                            <div><span>Expected</span><pre>{c.expectedOutput}</pre></div>
                            {got && <div><span>Got</span><pre>{got.actualOutput || '—'}</pre></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {runs[q.itemId]?.error && <div className="hx-err">{runs[q.itemId]!.error}</div>}
                  <p className="hx-hint">
                    Your answer is graded against more cases than you can see here.
                  </p>
                </div>
              )}

              {(q.type === 'predict_output' || q.type === 'complete_code' || q.type === 'debug') && (
                <textarea
                  className="hx-text"
                  rows={5}
                  value={answers[q.itemId]?.text ?? ''}
                  onChange={(e) => setAnswer(q, { text: e.target.value })}
                  placeholder="Your answer"
                />
              )}

              {err && <div className="hx-err">{err}</div>}

              <div className="hx-move">
                <button className="hx-ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>← Previous</button>
                <button className="hx-ghost" disabled={idx >= inSection.length - 1} onClick={() => setIdx((i) => i + 1)}>Next →</button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default HackathonExam;

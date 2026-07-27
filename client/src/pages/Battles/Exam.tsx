import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { battlePublicApi } from '../../api/battleApi';
import BattleChrome from './BattleChrome';
import './battles.css';
import '../QuizTaking/QuizRunner.css';

type Phase = 'loading' | 'countdown' | 'ready' | 'exam' | 'result' | 'error';

const BattleExam: React.FC = () => {
  const { token } = useParams();
  const nav = useNavigate();
  const sid = useMemo(() => {
    const k = `bt_sid_${token}`;
    let v = sessionStorage.getItem(k);
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem(k, v); }
    return v;
  }, [token]);

  const [phase, setPhase] = useState<Phase>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [exam, setExam] = useState<any>(null);
  const [startAt, setStartAt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [idx, setIdx] = useState(0);
  const [endsAt, setEndsAt] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const submittedRef = useRef(false);
  const [tabCount, setTabCount] = useState(0);
  const [showTabWarn, setShowTabWarn] = useState(false);
  const submitRef = useRef<() => void>(() => {});

  const load = useCallback(async () => {
    try {
      const d = await battlePublicApi.getExam(String(token), sid);
      setExam(d);
      setPhase(d.startedAt ? 'exam' : 'ready');
      if (d.startedAt) { /* resume: will start timer on effect */ }
    } catch (e: any) {
      const code = e?.response?.data?.code;
      if (code === 'NOT_YET') { setStartAt(new Date(e.response.data.startAt).getTime()); setExam({ title: e.response.data.title }); setPhase('countdown'); }
      else { setErrMsg(e?.response?.data?.message || 'Could not load the exam.'); setPhase('error'); }
    }
  }, [token, sid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Auto-recheck when countdown reaches zero.
  useEffect(() => { if (phase === 'countdown' && startAt && now >= startAt) load(); }, [phase, startAt, now, load]);

  const beginExam = async () => {
    try {
      const r = await battlePublicApi.startExam(String(token), sid);
      setEndsAt(new Date(r.endsAt).getTime());
      setPhase('exam');
      // camera (best-effort)
      if (exam?.quiz?.enableCamera) {
        try { const s = await navigator.mediaDevices.getUserMedia({ video: true }); streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; } catch { /* ignore */ }
      }
    } catch (e: any) { setErrMsg(e?.response?.data?.message || 'Could not start.'); setPhase('error'); }
  };

  // When resuming an already-started exam, compute endsAt from server on first load.
  useEffect(() => {
    if (phase === 'exam' && !endsAt) {
      // re-fetch start to get endsAt
      battlePublicApi.startExam(String(token), sid).then(r => setEndsAt(new Date(r.endsAt).getTime())).catch(() => {});
      if (exam?.quiz?.enableCamera && !streamRef.current) {
        navigator.mediaDevices.getUserMedia({ video: true }).then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; }).catch(() => {});
      }
    }
  }, [phase, endsAt, token, sid, exam]);

  // Timer + auto-submit
  useEffect(() => {
    if (phase !== 'exam' || !endsAt) return;
    const l = Math.max(0, Math.floor((endsAt - now) / 1000));
    setLeft(l);
    if (l <= 0 && !submittedRef.current) submit();
    // eslint-disable-next-line
  }, [phase, endsAt, now]);

  // Heartbeat
  useEffect(() => {
    if (phase !== 'exam') return;
    const h = setInterval(() => battlePublicApi.heartbeat(String(token), sid).catch(() => {}), 30000);
    return () => clearInterval(h);
  }, [phase, token, sid]);

  // Block the browser Back button + warn on refresh/close while the exam is running.
  useEffect(() => {
    if (phase !== 'exam') return;
    window.history.pushState(null, '', window.location.href);
    const onPop = () => { window.history.pushState(null, '', window.location.href); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('popstate', onPop);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('beforeunload', onBeforeUnload); };
  }, [phase]);

  // Tab-switch / window-blur proctoring: count switches, warn, auto-submit after the limit.
  useEffect(() => {
    if (phase !== 'exam' || !exam?.quiz?.tabSwitchWarnings) return;
    const warnMax = exam.quiz.warningCount ?? 3;
    let last = 0;
    const bump = () => {
      const t = Date.now(); if (t - last < 800) return; last = t;   // debounce double-fires
      setTabCount(prev => {
        const n = prev + 1;
        if (n >= warnMax) { submitRef.current(); }
        else { setShowTabWarn(true); }
        return n;
      });
    };
    const onVis = () => { if (document.hidden) bump(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', bump);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('blur', bump); };
  }, [phase, exam]);

  // cleanup camera
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const questions: any[] = exam?.questions || [];
  const q = questions[idx];
  const answeredCount = Object.values(answers).filter(a => a && a.length).length;

  const pick = (qid: string, opt: string) => setAnswers(a => ({ ...a, [qid]: [opt] }));

  const submit = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    try {
      const payload = Object.entries(answers).map(([questionId, selectedOptions]) => ({ questionId, selectedOptions }));
      const r = await battlePublicApi.submitExam(String(token), payload);
      streamRef.current?.getTracks().forEach(t => t.stop());
      setResult(r); setPhase('result');
    } catch (e: any) { submittedRef.current = false; setErrMsg(e?.response?.data?.message || 'Submit failed.'); setPhase('error'); }
  };
  submitRef.current = submit;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ──
  if (phase === 'loading') return <BattleChrome><div className="bt-page"><div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading your exam…</div></div></BattleChrome>;

  if (phase === 'error') return (
    <BattleChrome><div className="bt-page"><div className="bt-wrap" style={{ marginTop: 60 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⛔</div><div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{errMsg}</div>
    </div></div></div></BattleChrome>
  );

  if (phase === 'countdown') {
    const d = Math.max(0, startAt - now);
    const pad = (n: number) => String(n).padStart(2, '0');
    const days = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    const title = exam?.title || 'CodeBegun Weekly Tech Battle';
    // Highlight the last two words in gold, like the marketing hero.
    const parts = title.trim().split(' ');
    const head = parts.slice(0, Math.max(1, parts.length - 2)).join(' ');
    const tail = parts.slice(Math.max(1, parts.length - 2)).join(' ');
    const cells: [string, number][] = [['DAYS', days], ['HRS', h], ['MIN', m], ['SEC', s]];
    return (
      <BattleChrome>
      <div className="cd-page">
        <div className="cd-deco l">🏆</div>
        <div className="cd-deco r">📋</div>
        <div className="cd-in">
          <div className="cd-eyebrow">⚔️ EXAM STARTS SOON ⚔️</div>
          <h1 className="cd-title">{head} <span className="g">{tail}</span></h1>
          <p className="cd-sub">Test your skills. Beat the clock. Climb the leaderboard.<br />One battle. <b>Endless opportunities.</b></p>
          <div className="cd-timer">
            {cells.map(([label, val], i) => (
              <React.Fragment key={label}>
                {i > 0 && <span className="cd-colon">:</span>}
                <div className="cd-box"><div className="ic">{label === 'DAYS' ? '📅' : '⏱️'}</div><b>{pad(val)}</b><span>{label}</span></div>
              </React.Fragment>
            ))}
          </div>
          <div className="cd-pills">
            <div className="cd-pill">🏆 Win Exciting Cash Prizes</div>
            <div className="cd-pill">🥇 Get Recognized</div>
            <div className="cd-pill">🚀 Boost Your Career</div>
          </div>
          <div className="cd-note"><span className="dot" /> Keep this page open — it unlocks automatically at the start time.</div>
        </div>
      </div>
      </BattleChrome>
    );
  }

  if (phase === 'ready') return (
    <BattleChrome><div className="bt-page"><div className="bt-wrap" style={{ marginTop: 50 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>🚀</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>{exam.quiz.title}</div>
      <div className="bt-muted">{questions.length} questions · {exam.quiz.timeLimit} min · {exam.quiz.totalMarks} marks</div>
      <div className="bt-ok" style={{ marginTop: 14, textAlign: 'left' }}>One attempt · single device · {exam.quiz.enableCamera ? 'camera-proctored · ' : ''}the clock stops at the battle end time. All the best!</div>
      <button className="bt-btn" onClick={beginExam}>Start exam →</button>
    </div></div></div></BattleChrome>
  );

  if (phase === 'result') return (
    <BattleChrome><div className="bt-page"><div className="bt-wrap" style={{ marginTop: 60 }}><div className="bt-card" style={{ textAlign: 'center', padding: '34px 26px' }}>
      <div style={{ fontSize: 56 }}>🎉</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '8px 0 6px' }}>Congratulations!</div>
      <p style={{ color: '#475569', fontSize: 15, lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
        You’ve successfully completed the CodeBegun Tech Battle. Our team will review the results and <b>connect with you with further details</b>. Thank you for participating! 🚀
      </p>
      <div className="bt-muted" style={{ marginTop: 16 }}>You can close this window now.</div>
    </div></div></div></BattleChrome>
  );

  // exam
  const timeCrit = left < 60;
  const warnMax = exam?.quiz?.warningCount ?? 3;
  return (
    <div className="qr-page">
      {showTabWarn && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,40,.75)', zIndex: 4000, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, maxWidth: 440, padding: '28px 26px', textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,.35)' }}>
            <div style={{ fontSize: 40 }}>⚠️</div>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#b91c1c', margin: '6px 0' }}>Tab switch detected</div>
            <p style={{ color: '#475569', fontSize: 14.5, lineHeight: 1.55 }}>
              Leaving the exam tab is not allowed. Warning <b>{tabCount}</b> of <b>{warnMax}</b>.
              {tabCount >= warnMax - 1 ? ' One more switch will auto-submit your exam.' : ' Please stay on this page.'}
            </p>
            <button onClick={() => setShowTabWarn(false)} style={{ background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 26px', fontWeight: 800, fontSize: 15, cursor: 'pointer', marginTop: 8 }}>Continue exam</button>
          </div>
        </div>
      )}
      <div className="qr-topbar">
        <div className="qr-brand">
          <img src="/assets/logo.png" alt="CodeBegun" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div><div className="qr-brand-name">CODEBEGUN</div><div className="qr-brand-tag">Tech Battle</div></div>
        </div>
        <div className="qr-brand-sep" />
        <div className="qr-title"><h1>{exam.quiz.title}</h1><div className="qr-meta">Question {idx + 1} of {questions.length}</div></div>
        <div className="qr-top-right">
          <div className={`qr-timer ${timeCrit ? 'crit' : ''}`}><div className="qr-timer-label">Time Left</div><div className="qr-timer-val">🕐 {fmt(left)}</div></div>
        </div>
      </div>

      <div className="qr-body" style={{ gridTemplateColumns: '260px 1fr 260px' }}>
        <div className="qr-left">
          <div className="qr-card qr-navcard">
            <div className="qr-panel-title">🧭 Questions</div>
            <div className="qr-grid">
              {questions.map((qq, i) => {
                const answered = answers[qq._id]?.length;
                return <button key={qq._id} className={`qr-num${answered ? ' answered' : ''}${i === idx ? ' current' : ''}`} onClick={() => setIdx(i)}>{i + 1}</button>;
              })}
            </div>
          </div>
          <div className="qr-card qr-progresscard">
            <div className="qr-panel-title" style={{ marginBottom: 10 }}>Progress</div>
            <div className="qr-progress-top"><span className="qr-pct">{Math.round((answeredCount / questions.length) * 100)}% <small>done</small></span><span className="qr-frac">{answeredCount}/{questions.length}</span></div>
            <div className="qr-progress-track"><div className="qr-progress-fill" style={{ width: `${(answeredCount / questions.length) * 100}%` }} /></div>
          </div>
        </div>

        <div className="qr-center">
          {q && (
            <div className="qr-card qr-qcard">
              <div className="qr-qhead"><div className="qr-qnum">{idx + 1}</div><div className="qr-qtext">{q.questionText || q.question}</div></div>
              <div className="qr-options">
                {(q.options || []).map((o: any, i: number) => {
                  const text = typeof o === 'string' ? o : o.text;
                  const sel = answers[q._id]?.[0] === text;
                  return (
                    <label key={i} className={`qr-opt${sel ? ' sel' : ''}`}>
                      <input type="radio" name={`q-${q._id}`} checked={sel} onChange={() => pick(q._id, text)} />
                      <span className="qr-opt-letter">{String.fromCharCode(65 + i)}</span>
                      <span className="qr-opt-text">{text}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div className="qr-actions">
            <button className="qr-btn ghost" disabled={idx === 0} onClick={() => setIdx(i => i - 1)}>← Previous</button>
            <button className="qr-btn clear" onClick={() => setAnswers(a => { const n = { ...a }; delete n[q._id]; return n; })}>🗑 Clear</button>
            {idx < questions.length - 1
              ? <button className="qr-btn primary" onClick={() => setIdx(i => i + 1)}>Next →</button>
              : <button className="qr-btn submit" onClick={submit}>✅ Submit</button>}
          </div>
        </div>

        <div className="qr-right">
          {exam.quiz.enableCamera && (
            <div className="qr-card qr-proctor">
              <div className="qr-proctor-head"><span className="qr-p-title">🛡️ Proctored</span><span className="qr-badge-active">Active</span></div>
              <video ref={videoRef} autoPlay muted playsInline className="qr-proctor-video" />
              <div className="qr-proctor-status">You are being monitored</div>
            </div>
          )}
          <div className="qr-card qr-instr">
            <div className="qr-instr-title">ℹ️ Battle</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">📋</span>{questions.length} Questions</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">✏️</span>{exam.quiz.totalMarks} Marks</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">⏱️</span>{exam.quiz.timeLimit} min</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BattleExam;

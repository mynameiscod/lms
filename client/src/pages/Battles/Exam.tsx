import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { battlePublicApi } from '../../api/battleApi';
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

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Render ──
  if (phase === 'loading') return <div className="bt-page"><div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading your exam…</div></div>;

  if (phase === 'error') return (
    <div className="bt-page"><div className="bt-wrap" style={{ marginTop: 60 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>⛔</div><div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '8px 0' }}>{errMsg}</div>
    </div></div></div>
  );

  if (phase === 'countdown') {
    const d = Math.max(0, startAt - now);
    const days = Math.floor(d / 86400000), h = Math.floor((d % 86400000) / 3600000), m = Math.floor((d % 3600000) / 60000), s = Math.floor((d % 60000) / 1000);
    return (
      <div className="bt-page"><div className="bt-hero"><div className="bt-hero-in" style={{ textAlign: 'center' }}>
        <span className="bt-eyebrow">⏳ EXAM STARTS SOON</span>
        <h1>{exam?.title || 'Tech Battle'}</h1>
        <div className="bt-count" style={{ justifyContent: 'center' }}>
          <div><b>{days}</b><span>DAYS</span></div><div><b>{h}</b><span>HRS</span></div><div><b>{m}</b><span>MIN</span></div><div><b>{s}</b><span>SEC</span></div>
        </div>
        <p style={{ marginTop: 14 }}>Keep this page open — it unlocks automatically.</p>
      </div></div></div>
    );
  }

  if (phase === 'ready') return (
    <div className="bt-page"><div className="bt-wrap" style={{ marginTop: 50 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>🚀</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>{exam.quiz.title}</div>
      <div className="bt-muted">{questions.length} questions · {exam.quiz.timeLimit} min · {exam.quiz.totalMarks} marks</div>
      <div className="bt-ok" style={{ marginTop: 14, textAlign: 'left' }}>One attempt · single device · {exam.quiz.enableCamera ? 'camera-proctored · ' : ''}the clock stops at the battle end time. All the best!</div>
      <button className="bt-btn" onClick={beginExam}>Start exam →</button>
    </div></div></div>
  );

  if (phase === 'result') return (
    <div className="bt-page"><div className="bt-wrap" style={{ marginTop: 50 }}><div className="bt-card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 44 }}>{result.passed ? '🏆' : '✅'}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>Submitted!</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: '#1d4ed8', margin: '8px 0' }}>{result.score}<span style={{ fontSize: 20, color: '#94a3b8' }}>/{result.totalMarks}</span></div>
      <div className="bt-muted">{result.percentage}% · You ranked <b>#{result.rank}</b></div>
      <button className="bt-btn" onClick={() => nav(`/battles/${result.slug}/leaderboard?tenant=${result.tenantSlug || 'codebegun'}`)}>View leaderboard 🏆</button>
    </div></div></div>
  );

  // exam
  const timeCrit = left < 60;
  return (
    <div className="qr-page">
      <div className="qr-topbar">
        <div className="qr-brand"><div><div className="qr-brand-name">CODEBEGUN</div><div className="qr-brand-tag">Tech Battle</div></div></div>
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

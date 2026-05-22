import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicQuizSessionApi } from '../../api';
import './QuizSession.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizOption { text: string }

interface QuizQuestion {
  _id: string;
  question: string;          // DB field name
  questionText?: string;     // fallback alias
  type?: string;
  questionType?: string;
  options: QuizOption[];
  marks: number;
}

interface QuizSettings {
  title: string;
  timeLimit: number;         // minutes
  totalMarks: number;
  instructions: string;
  enableCamera: boolean;
  enableMicrophone: boolean;
  requireFullScreen: boolean;
  tabSwitchWarnings: boolean;
  warningCount: number;
}

interface QuizData {
  quiz: QuizSettings;
  questions: QuizQuestion[];
  candidate: { name: string; email: string };
  quizStartedAt: string | null;
}

interface ResultData {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  rank: number | null;
  timeSpentSeconds: number;
}

interface CountdownParts { days: number; hours: number; minutes: number; seconds: number; totalSeconds: number }

type Phase = 'loading' | 'intro' | 'taking' | 'submitting' | 'result' | 'error' | 'already_done' | 'not_yet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function formatDuration(s: number) {
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = s % 60;
  return r > 0 ? `${m}m ${r}s` : `${m}m`;
}
function calcCountdown(target: Date): CountdownParts {
  const total = Math.max(0, Math.floor((target.getTime() - Date.now()) / 1000));
  return { days: Math.floor(total / 86400), hours: Math.floor((total % 86400) / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60, totalSeconds: total };
}
function fmtCountdown(p: CountdownParts) {
  if (p.totalSeconds <= 0) return 'Opening now…';
  if (p.days > 0) return `${p.days}d ${p.hours}h ${p.minutes}m`;
  if (p.hours > 0) return `${p.hours}h ${p.minutes}m ${p.seconds}s`;
  return `${p.minutes}m ${p.seconds}s`;
}
function getOrCreateSessionId(token: string): string {
  const key = `quiz_session_${token}`;
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

// ─── Component ────────────────────────────────────────────────────────────────

const QuizSession: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [opensAt, setOpensAt] = useState('');
  const [eventTimeIST, setEventTimeIST] = useState('');
  const [countdown, setCountdown] = useState<CountdownParts>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
  const [tabWarnings, setTabWarnings] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmitted = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionId = useRef('');

  // ── Load quiz ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setErrorMsg('Invalid quiz link.'); setPhase('error'); return; }
    sessionId.current = getOrCreateSessionId(token);

    publicQuizSessionApi.getQuiz(token, sessionId.current)
      .then((data: QuizData) => {
        setQuizData(data);
        if (data.quizStartedAt) {
          // Resuming an in-progress session
          const elapsed = Math.floor((Date.now() - new Date(data.quizStartedAt).getTime()) / 1000);
          const limitSec = (data.quiz.timeLimit ?? 0) * 60;
          const remaining = limitSec > 0 ? Math.max(0, limitSec - elapsed) : 0;
          if (remaining === 0 && limitSec > 0) {
            setPhase('submitting');
          } else {
            setTimeLeft(remaining);
            setPhase('taking');
          }
        } else {
          setPhase('intro');
        }
      })
      .catch((err: any) => {
        if (err.code === 'NOT_YET') {
          setOpensAt(err.opensAt || ''); setEventTimeIST(err.eventTimeIST || ''); setPhase('not_yet');
        } else if (err.code === 'ANOTHER_DEVICE') {
          setErrorMsg('This quiz is already open on another device. Close it there before continuing here.');
          setPhase('error');
        } else if ((err.message || '').toLowerCase().includes('already')) {
          setPhase('already_done');
        } else {
          setErrorMsg(err.message || 'Failed to load quiz'); setPhase('error');
        }
      });
  }, [token]);

  // ── Countdown (not_yet phase) ───────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'not_yet' || !opensAt) return;
    const target = new Date(opensAt);
    const tick = () => {
      const p = calcCountdown(target);
      setCountdown(p);
      if (p.totalSeconds <= 3) setTimeout(() => token && publicQuizSessionApi.getQuiz(token).then(() => window.location.reload()).catch(() => {}), 1000);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, opensAt, token]);

  // ── Auto-submit ─────────────────────────────────────────────────────────────

  const handleAutoSubmit = useCallback(() => {
    if (hasSubmitted.current || !token) return;
    hasSubmitted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    setPhase('submitting');
    publicQuizSessionApi.submitQuiz(token, answers)
      .then((res: ResultData) => { setResult(res); setPhase('result'); })
      .catch(() => { setResult(null); setPhase('result'); });
  }, [token, answers]);

  // ── Countdown timer (during quiz) ──────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking') return;
    const limitSec = (quizData?.quiz.timeLimit ?? 0) * 60;
    if (limitSec <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, quizData, handleAutoSubmit]);

  // ── Heartbeat ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !token) return;
    heartbeatRef.current = setInterval(() => {
      publicQuizSessionApi.heartbeat(token, sessionId.current);
    }, 30_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [phase, token]);

  // ── Tab switch protection ──────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !quizData?.quiz.tabSwitchWarnings) return;
    const maxWarnings = quizData.quiz.warningCount ?? 3;

    const handleVisibility = () => {
      if (document.hidden) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= maxWarnings) {
            setTimeout(() => handleAutoSubmit(), 1500);
          } else {
            setShowTabWarning(true);
            setTimeout(() => setShowTabWarning(false), 4000);
          }
          return next;
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase, quizData, handleAutoSubmit]);

  // ── Camera / microphone ────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !quizData) return;
    const { enableCamera, enableMicrophone } = quizData.quiz;
    if (!enableCamera && !enableMicrophone) return;

    navigator.mediaDevices?.getUserMedia({ video: enableCamera, audio: enableMicrophone })
      .then(stream => { mediaStreamRef.current = stream; })
      .catch(err => setMediaError(`Camera/mic access denied: ${err.message}`));

    return () => { mediaStreamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [phase, quizData]);

  // ── Fullscreen ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !quizData?.quiz.requireFullScreen) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, [phase, quizData]);

  // ── Start quiz ─────────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!quizData || !token) return;
    try {
      const res = await publicQuizSessionApi.startQuiz(token, sessionId.current);
      const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
      setTimeLeft(limitSec);
      setPhase('taking');
    } catch (err: any) {
      if (err.code === 'ANOTHER_DEVICE') {
        setErrorMsg('This quiz is already open on another device.'); setPhase('error');
      } else {
        setErrorMsg(err.message || 'Failed to start'); setPhase('error');
      }
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!token || hasSubmitted.current) return;
    hasSubmitted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setPhase('submitting');
    publicQuizSessionApi.submitQuiz(token, answers)
      .then((res: ResultData) => { setResult(res); setPhase('result'); })
      .catch((err: Error) => { setErrorMsg(err.message); setPhase('result'); });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const questions = quizData?.questions ?? [];
  const current = questions[currentIdx];
  const answered = Object.keys(answers).filter(k => answers[k]?.length > 0).length;
  const total = questions.length;
  const getQuestionText = (q: QuizQuestion) => q.question || q.questionText || '';
  const isSingleChoice = (q: QuizQuestion) => (q.type || q.questionType || '') !== 'mcq_multiple';

  const toggleAnswer = (qId: string, text: string, single: boolean) => {
    setAnswers(prev => {
      const cur = prev[qId] ?? [];
      if (single) return { ...prev, [qId]: [text] };
      const has = cur.includes(text);
      return { ...prev, [qId]: has ? cur.filter(o => o !== text) : [...cur, text] };
    });
  };

  // ─── Phase: loading ────────────────────────────────────────────────────────

  if (phase === 'loading') return (
    <div style={styles.center}>
      <div style={styles.card}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
        <p style={{ color: '#64748b', margin: 0 }}>Loading your quiz…</p>
      </div>
    </div>
  );

  // ─── Phase: not_yet ────────────────────────────────────────────────────────

  if (phase === 'not_yet') {
    const openDate = opensAt ? new Date(opensAt) : null;
    const displayDate = openDate ? openDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const displayTime = openDate ? openDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST' : eventTimeIST;
    const color = countdown.totalSeconds <= 60 ? '#ef4444' : countdown.totalSeconds <= 300 ? '#f59e0b' : '#3b82f6';
    return (
      <div style={styles.center}>
        <div style={{ ...styles.card, maxWidth: 500, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⏰</div>
          <h2 style={{ fontWeight: 700, color: '#0d1b2a', marginBottom: 6 }}>Quiz Not Open Yet</h2>
          <p style={{ color: '#64748b', marginBottom: 24 }}>Your link is confirmed. The quiz hasn't started yet.</p>
          <div style={{ background: color + '15', border: `2px solid ${color}`, borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Opens in</div>
            <div style={{ fontSize: 44, fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtCountdown(countdown)}</div>
          </div>
          {(displayDate || displayTime) && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '12px 18px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 14 }}>📅 {displayDate} &nbsp;·&nbsp; 🕖 {displayTime}</div>
            </div>
          )}
          <button style={styles.btnPrimary} onClick={() => window.location.reload()}>Refresh to Check Now</button>
        </div>
      </div>
    );
  }

  // ─── Phase: error ──────────────────────────────────────────────────────────

  if (phase === 'error') return (
    <div style={styles.center}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cannot Load Quiz</h3>
        <p style={{ color: '#64748b' }}>{errorMsg}</p>
      </div>
    </div>
  );

  // ─── Phase: already_done ───────────────────────────────────────────────────

  if (phase === 'already_done') return (
    <div style={styles.center}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Quiz Already Submitted</h3>
        <p style={{ color: '#64748b' }}>You have already completed this quiz. Results will be shared by the organiser.</p>
      </div>
    </div>
  );

  // ─── Phase: intro ──────────────────────────────────────────────────────────

  if (phase === 'intro' && quizData) {
    const { quiz, candidate } = quizData;
    return (
      <div style={styles.center}>
        <div style={{ ...styles.card, maxWidth: 600, width: '100%' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0ea5e9 100%)', borderRadius: '12px 12px 0 0', margin: '-28px -28px 24px -28px', padding: '32px 28px 28px' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tech Battle Quiz</div>
            <h2 style={{ color: '#fff', fontWeight: 800, margin: 0, fontSize: 22 }}>{quiz.title}</h2>
          </div>

          {/* Candidate info */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Registered as</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{candidate.name}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{candidate.email}</div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Questions', value: total, icon: '📋' },
              { label: 'Total Marks', value: quiz.totalMarks, icon: '🏆' },
              { label: 'Time Limit', value: quiz.timeLimit ? `${quiz.timeLimit} min` : '—', icon: '⏱' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          {quiz.instructions ? (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#92400e' }}
              dangerouslySetInnerHTML={{ __html: quiz.instructions }} />
          ) : (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
              ⚠️ <strong>Important:</strong> Once you click Start, the timer begins immediately. Do not close or refresh the page. Submit before time runs out.
            </div>
          )}

          {/* Proctoring notice */}
          {(quiz.enableCamera || quiz.enableMicrophone || quiz.requireFullScreen || quiz.tabSwitchWarnings) && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '12px 18px', marginBottom: 20, fontSize: 13, color: '#991b1b' }}>
              🔒 <strong>Proctored Quiz:</strong>&nbsp;
              {[quiz.enableCamera && 'Camera', quiz.enableMicrophone && 'Microphone', quiz.requireFullScreen && 'Fullscreen required', quiz.tabSwitchWarnings && `Tab switching monitored (max ${quiz.warningCount} warnings)`].filter(Boolean).join(' · ')}
            </div>
          )}

          {mediaError && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 8 }}>⚠️ {mediaError}</div>}

          <button style={{ ...styles.btnPrimary, width: '100%', padding: '14px', fontSize: 16, fontWeight: 700 }} onClick={handleStart}>
            🚀 Start Quiz Now
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 10, marginBottom: 0 }}>
            Timer starts immediately when you click Start
          </p>
        </div>
      </div>
    );
  }

  // ─── Phase: taking ─────────────────────────────────────────────────────────

  if (phase === 'taking' && quizData && questions.length === 0) return (
    <div style={styles.center}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h3>Quiz Has No Questions</h3>
        <p style={{ color: '#64748b' }}>This quiz hasn't been set up with questions yet. Please contact the organiser.</p>
      </div>
    </div>
  );

  if (phase === 'taking' && quizData && current) {
    const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
    const pct = limitSec > 0 ? (timeLeft / limitSec) * 100 : 100;
    const timerDanger = limitSec > 0 && timeLeft < 120;
    const timerWarn = limitSec > 0 && timeLeft < 300;
    const timerColor = timerDanger ? '#ef4444' : timerWarn ? '#f59e0b' : '#1e40af';
    const maxWarnings = quizData.quiz.warningCount ?? 3;

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
        {/* ── Header ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 220px)' }}>
              {quizData.quiz.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                <strong style={{ color: '#0f172a' }}>{answered}</strong>/{total} answered
              </span>
              {limitSec > 0 && (
                <div style={{ background: timerColor, color: '#fff', borderRadius: 10, padding: '6px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: 18, minWidth: 80, textAlign: 'center', transition: 'background 0.5s' }}>
                  ⏱ {formatTime(timeLeft)}
                </div>
              )}
            </div>
          </div>
          {/* Timer progress bar */}
          {limitSec > 0 && (
            <div style={{ height: 3, background: '#e2e8f0', margin: '0 -16px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: timerColor, transition: 'width 1s linear, background 0.5s' }} />
            </div>
          )}
        </div>

        {/* ── Tab switch warning banner ── */}
        {showTabWarning && (
          <div style={{ background: '#fef08a', borderBottom: '2px solid #eab308', padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#78350f', fontSize: 14 }}>
            ⚠️ Tab switch detected! Warning {tabWarnings}/{maxWarnings}. Quiz will auto-submit after {maxWarnings} switches.
          </div>
        )}
        {tabWarnings >= maxWarnings && (
          <div style={{ background: '#fef2f2', borderBottom: '2px solid #ef4444', padding: '10px 16px', textAlign: 'center', fontWeight: 600, color: '#991b1b', fontSize: 14 }}>
            🚨 Maximum tab switches reached. Submitting your quiz…
          </div>
        )}

        {/* ── Body ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }} className="quiz-grid">
            {/* ── Question panel ── */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Question header */}
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ background: '#1e40af', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>
                    Q {currentIdx + 1} / {total}
                  </span>
                  <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
                    {current.marks} Mark{current.marks !== 1 ? 's' : ''}
                  </span>
                  {!isSingleChoice(current) && (
                    <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
                      Multiple Correct
                    </span>
                  )}
                </div>
                {answers[current._id]?.length > 0 && (
                  <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ Answered</span>
                )}
              </div>

              {/* Question text */}
              <div style={{ padding: '24px 24px 8px' }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {getQuestionText(current)}
                </p>
              </div>

              {/* Options */}
              <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {current.options.map((opt, i) => {
                  const sel = (answers[current._id] ?? []).includes(opt.text);
                  return (
                    <label key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      border: sel ? '2px solid #1e40af' : '1.5px solid #e2e8f0',
                      borderRadius: 10, cursor: 'pointer',
                      background: sel ? '#eff6ff' : '#fff',
                      transition: 'all 0.15s', userSelect: 'none',
                    }}>
                      <input
                        type={isSingleChoice(current) ? 'radio' : 'checkbox'}
                        checked={sel}
                        onChange={() => toggleAnswer(current._id, opt.text, isSingleChoice(current))}
                        style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0, accentColor: '#1e40af' }}
                      />
                      <span style={{ fontSize: 15, color: sel ? '#1e40af' : '#0f172a', fontWeight: sel ? 600 : 400, flex: 1 }}>
                        {opt.text}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Prev / Next */}
              <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button style={{ ...styles.btnOutline, flex: 1 }} disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>
                  ← Prev
                </button>
                <button style={{ ...styles.btnOutline, flex: 1 }} disabled={currentIdx === total - 1} onClick={() => setCurrentIdx(i => i + 1)}>
                  Next →
                </button>
              </div>
            </div>

            {/* ── Navigator ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 72 }}>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ background: '#1e3a5f', padding: '12px 16px' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Question Navigator</span>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {questions.map((q, i) => {
                      const isAns = !!(answers[q._id]?.length);
                      const isCur = i === currentIdx;
                      return (
                        <button key={q._id} onClick={() => setCurrentIdx(i)} style={{
                          width: 38, height: 38, border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                          background: isCur ? '#1e40af' : isAns ? '#16a34a' : '#f1f5f9',
                          color: (isCur || isAns) ? '#fff' : '#475569',
                          outline: isCur ? '3px solid #93c5fd' : 'none',
                          transition: 'all 0.15s',
                        }}>{i + 1}</button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 12, color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} /> Answered</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'inline-block' }} /> Unanswered</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Answered</span>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{answered}/{total}</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total > 0 ? (answered / total) * 100 : 0}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>

              {/* Submit button */}
              <button
                style={{ ...styles.btnDanger, width: '100%', padding: '13px', fontWeight: 700, fontSize: 15 }}
                onClick={() => setShowSubmitConfirm(true)}
              >
                Submit Quiz
              </button>
            </div>
          </div>
        </div>

        {/* ── Submit Confirmation Modal ── */}
        {showSubmitConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Submit Quiz?</h3>
              <p style={{ color: '#64748b', marginBottom: 6 }}>
                You have answered <strong>{answered}</strong> out of <strong>{total}</strong> questions.
              </p>
              {answered < total && (
                <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
                  ⚠️ {total - answered} question{total - answered !== 1 ? 's' : ''} unanswered.
                </p>
              )}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button style={{ ...styles.btnOutline, flex: 1 }} onClick={() => setShowSubmitConfirm(false)}>Go Back</button>
                <button style={{ ...styles.btnDanger, flex: 1 }} onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}>
                  Submit Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Phase: submitting ─────────────────────────────────────────────────────

  if (phase === 'submitting') return (
    <div style={styles.center}>
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', margin: 0, fontWeight: 600 }}>Submitting your answers…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  // ─── Phase: result ─────────────────────────────────────────────────────────

  if (phase === 'result') {
    if (!result) return (
      <div style={styles.center}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontWeight: 700 }}>Submission Error</h3>
          <p style={{ color: '#64748b' }}>{errorMsg || 'Your answers could not be submitted. Please contact the organiser.'}</p>
        </div>
      </div>
    );

    const pct = result.percentage ?? 0;
    const passColor = result.passed ? '#16a34a' : '#dc2626';
    const passBg = result.passed ? '#f0fdf4' : '#fef2f2';

    return (
      <div style={styles.center}>
        <div style={{ ...styles.card, maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ background: `linear-gradient(135deg, ${result.passed ? '#15803d' : '#b91c1c'} 0%, ${result.passed ? '#22c55e' : '#ef4444'} 100%)`, borderRadius: '12px 12px 0 0', margin: '-28px -28px 24px', padding: '32px 28px' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>{result.passed ? '🏆' : '📋'}</div>
            <h2 style={{ color: '#fff', fontWeight: 800, margin: 0 }}>{result.passed ? 'Congratulations!' : 'Quiz Completed'}</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: '6px 0 0', fontSize: 14 }}>{quizData?.quiz.title}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Score', value: `${pct.toFixed(1)}%`, color: passColor, big: true },
              { label: 'Marks', value: `${result.score}/${result.totalMarks}`, color: '#0f172a', big: true },
              ...(result.rank ? [{ label: 'Your Rank', value: `#${result.rank}`, color: '#1e40af', big: false }] : []),
              { label: 'Time Taken', value: formatDuration(result.timeSpentSeconds), color: '#0f172a', big: false },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 8px' }}>
                <div style={{ fontSize: s.big ? 26 : 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: passBg, border: `2px solid ${passColor}`, borderRadius: 10, padding: '12px 20px', marginBottom: 16 }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: passColor }}>{result.passed ? '✅ PASSED' : '❌ NOT PASSED'}</span>
          </div>

          <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Results recorded. The organiser will contact you with next steps.</p>
        </div>
      </div>
    );
  }

  return null;
};

// ─── Shared styles ─────────────────────────────────────────────────────────────

const styles = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16 } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', maxWidth: 480, width: '100%' } as React.CSSProperties,
  btnPrimary: { background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'inline-block' } as React.CSSProperties,
  btnOutline: { background: '#fff', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500 } as React.CSSProperties,
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 } as React.CSSProperties,
};

export default QuizSession;

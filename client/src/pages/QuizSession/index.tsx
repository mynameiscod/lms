import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicQuizSessionApi } from '../../api';
import './QuizSession.css';

interface QuizOption { text: string }
interface QuizQuestion {
  _id: string;
  question: string;
  questionText?: string;
  type?: string;
  questionType?: string;
  options: QuizOption[];
  marks: number;
}
interface QuizSettings {
  title: string;
  timeLimit: number;
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
  timeSpent?: string;
}
interface CountdownParts { days: number; hours: number; minutes: number; seconds: number; totalSeconds: number }
type Phase = 'loading' | 'intro' | 'taking' | 'submitting' | 'result' | 'error' | 'already_done' | 'not_yet';

// ── Helpers ──────────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0'); }
function formatTime(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }
function formatDuration(s: number): string {
  if (!s || s <= 0) return '—';
  const m = Math.floor(s / 60); const r = s % 60;
  if (m === 0) return `${r}s`;
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
  return `${pad(p.minutes)}:${pad(p.seconds)}`;
}
function getOrCreateSessionId(token: string): string {
  const key = `quiz_session_${token}`;
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

// ── Component ─────────────────────────────────────────────────────────────────

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
  // full-screen overlay for tab-switch warning
  const [tabWarnOverlay, setTabWarnOverlay] = useState<{ show: boolean; count: number; max: number; final: boolean }>({ show: false, count: 0, max: 3, final: false });
  const [mediaError, setMediaError] = useState('');
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [permStatus, setPermStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmitted = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionId = useRef('');
  const tabWarnCount = useRef(0); // ref mirrors state for use inside event handlers
  const openedRef = useRef(false); // prevent multiple countdown-zero polls

  // ── Load quiz ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setErrorMsg('Invalid quiz link.'); setPhase('error'); return; }
    sessionId.current = getOrCreateSessionId(token);
    publicQuizSessionApi.getQuiz(token, sessionId.current)
      .then((data: QuizData) => {
        setQuizData(data);
        if (data.quizStartedAt) {
          const elapsed = Math.floor((Date.now() - new Date(data.quizStartedAt).getTime()) / 1000);
          const limitSec = (data.quiz.timeLimit ?? 0) * 60;
          const remaining = limitSec > 0 ? Math.max(0, limitSec - elapsed) : 0;
          if (remaining === 0 && limitSec > 0) { setPhase('submitting'); }
          else { setTimeLeft(remaining); setPhase('taking'); }
        } else {
          setPhase('intro');
        }
      })
      .catch((err: any) => {
        if (err.code === 'NOT_YET') { setOpensAt(err.opensAt || ''); setEventTimeIST(err.eventTimeIST || ''); setPhase('not_yet'); }
        else if (err.code === 'ANOTHER_DEVICE') { setErrorMsg('This quiz is already open on another device. Close it there first.'); setPhase('error'); }
        else if ((err.message || '').toLowerCase().includes('already')) { setPhase('already_done'); }
        else { setErrorMsg(err.message || 'Failed to load quiz'); setPhase('error'); }
      });
  }, [token]);

  // ── FIX 4: Countdown — poll API directly when timer hits 0 (no page reload) ──

  useEffect(() => {
    if (phase !== 'not_yet' || !opensAt || !token) return;
    const target = new Date(opensAt);

    const tick = () => {
      const p = calcCountdown(target);
      setCountdown(p);

      // When the timer reaches 0, start polling the API every second
      if (p.totalSeconds <= 0 && !openedRef.current) {
        openedRef.current = true;
        clearInterval(countdownPollRef.current!);

        // Poll every 1s until server says quiz is open
        countdownPollRef.current = setInterval(() => {
          publicQuizSessionApi.getQuiz(token, sessionId.current)
            .then((data: QuizData) => {
              clearInterval(countdownPollRef.current!);
              setQuizData(data);
              setPhase('intro'); // go straight to intro — no page reload
            })
            .catch((err: any) => {
              if (err.code !== 'NOT_YET') {
                clearInterval(countdownPollRef.current!);
                if (err.code === 'ANOTHER_DEVICE') { setErrorMsg('Quiz is already open on another device.'); setPhase('error'); }
                else if ((err.message || '').toLowerCase().includes('already')) { setPhase('already_done'); }
                else { setErrorMsg(err.message || 'Failed to load quiz'); setPhase('error'); }
              }
              // if still NOT_YET, keep polling
            });
        }, 1000);
      }
    };

    tick();
    const iv = setInterval(tick, 1000);
    return () => { clearInterval(iv); if (countdownPollRef.current) clearInterval(countdownPollRef.current); };
  }, [phase, opensAt, token]);

  // ── Auto-submit ──────────────────────────────────────────────────────────

  const handleAutoSubmit = useCallback((reason?: string) => {
    if (hasSubmitted.current || !token) return;
    hasSubmitted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setPhase('submitting');
    publicQuizSessionApi.submitQuiz(token, answers)
      .then((res: ResultData) => { setResult(res); setPhase('result'); })
      .catch(() => { setResult(null); setPhase('result'); });
  }, [token, answers]);

  // ── Quiz countdown timer ─────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking') return;
    const limitSec = (quizData?.quiz.timeLimit ?? 0) * 60;
    if (limitSec <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); handleAutoSubmit('timer'); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, quizData, handleAutoSubmit]);

  // ── Heartbeat ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !token) return;
    heartbeatRef.current = setInterval(() => publicQuizSessionApi.heartbeat(token, sessionId.current), 30_000);
    return () => { if (heartbeatRef.current) clearInterval(heartbeatRef.current); };
  }, [phase, token]);

  // ── FIX 3: Tab switch — visibilitychange + window.blur + pagehide (iOS) ──

  useEffect(() => {
    if (phase !== 'taking' || !quizData?.quiz.tabSwitchWarnings) return;
    const maxWarn = quizData.quiz.warningCount ?? 3;

    const onHide = () => {
      if (hasSubmitted.current) return;
      tabWarnCount.current += 1;
      const count = tabWarnCount.current;
      setTabWarnings(count);

      if (count >= maxWarn) {
        // Show final overlay then auto-submit
        setTabWarnOverlay({ show: true, count, max: maxWarn, final: true });
        setTimeout(() => handleAutoSubmit('tab_switch'), 2500);
      } else {
        setTabWarnOverlay({ show: true, count, max: maxWarn, final: false });
      }
    };

    // visibilitychange fires on desktop tab switch and most Android browsers
    const onVisibility = () => { if (document.hidden) onHide(); };
    // blur fires on iOS Safari when leaving the app / switching tab
    const onBlur = () => onHide();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
    };
  }, [phase, quizData, handleAutoSubmit]);

  // ── Fullscreen ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'taking' || !quizData?.quiz.requireFullScreen) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); };
  }, [phase, quizData]);

  // ── FIX 2: Camera/mic — request DURING user gesture in handleStart ───────

  const requestMedia = async (cam: boolean, mic: boolean): Promise<MediaStream | null> => {
    if (!cam && !mic) return null;
    try {
      setPermStatus('requesting');
      const stream = await navigator.mediaDevices.getUserMedia({ video: cam, audio: mic });
      setPermStatus('granted');
      return stream;
    } catch (err: any) {
      setPermStatus('denied');
      setMediaError(`Permission denied: ${err.message}. Camera/mic required for this quiz.`);
      return null;
    }
  };

  // ── Start quiz ───────────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!quizData || !token) return;
    const { enableCamera, enableMicrophone, requireFullScreen } = quizData.quiz;

    // Request camera/mic during the user gesture so browser grants permission
    if (enableCamera || enableMicrophone) {
      const stream = await requestMedia(enableCamera, enableMicrophone);
      if (!stream && (enableCamera || enableMicrophone)) {
        // If denied, still allow continuing (non-blocking)
      }
      if (stream) mediaStreamRef.current = stream;
    }

    // Request fullscreen during user gesture
    if (requireFullScreen) {
      await document.documentElement.requestFullscreen?.().catch(() => {});
    }

    try {
      await publicQuizSessionApi.startQuiz(token, sessionId.current);
      const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
      setTimeLeft(limitSec);
      setPhase('taking');
    } catch (err: any) {
      if (err.code === 'ANOTHER_DEVICE') { setErrorMsg('This quiz is already open on another device.'); setPhase('error'); }
      else { setErrorMsg(err.message || 'Failed to start'); setPhase('error'); }
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────

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

  // ── Helpers ──────────────────────────────────────────────────────────────

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

  // ── PHASE: loading ────────────────────────────────────────────────────────

  if (phase === 'loading') return (
    <div style={S.center}>
      <div style={S.card}>
        <div style={{ fontSize: 40, marginBottom: 16, textAlign: 'center' }}>⏳</div>
        <p style={{ color: '#64748b', margin: 0, textAlign: 'center' }}>Loading your quiz…</p>
      </div>
    </div>
  );

  // ── PHASE: not_yet ────────────────────────────────────────────────────────

  if (phase === 'not_yet') {
    const openDate = opensAt ? new Date(opensAt) : null;
    const displayDate = openDate ? openDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const displayTime = openDate ? openDate.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST' : eventTimeIST;
    const col = countdown.totalSeconds <= 60 ? '#ef4444' : countdown.totalSeconds <= 300 ? '#f59e0b' : '#3b82f6';
    return (
      <div style={S.center}>
        <div style={{ ...S.card, maxWidth: 480, textAlign: 'center' }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>⏰</div>
          <h2 style={{ fontWeight: 700, color: '#0d1b2a', marginBottom: 6 }}>Quiz Not Open Yet</h2>
          <p style={{ color: '#64748b', marginBottom: 20 }}>Your link is confirmed. Quiz starts at the scheduled time.</p>
          <div style={{ background: col + '18', border: `2px solid ${col}`, borderRadius: 14, padding: '18px 24px', marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Opens in</div>
            <div style={{ fontSize: 48, fontWeight: 800, color: col, fontFamily: 'monospace', letterSpacing: 2 }}>
              {fmtCountdown(countdown)}
            </div>
          </div>
          {(displayDate || displayTime) && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '10px 16px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 13 }}>📅 {displayDate} &nbsp;·&nbsp; 🕖 {displayTime}</div>
            </div>
          )}
          <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>This page will automatically open the quiz when time is up. Keep it open.</p>
        </div>
      </div>
    );
  }

  // ── PHASE: error ──────────────────────────────────────────────────────────

  if (phase === 'error') return (
    <div style={S.center}>
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Cannot Load Quiz</h3>
        <p style={{ color: '#64748b' }}>{errorMsg}</p>
      </div>
    </div>
  );

  // ── PHASE: already_done ───────────────────────────────────────────────────

  if (phase === 'already_done') return (
    <div style={S.center}>
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Quiz Already Submitted</h3>
        <p style={{ color: '#64748b' }}>You have already completed this quiz. Results will be shared by the organiser.</p>
      </div>
    </div>
  );

  // ── PHASE: intro ──────────────────────────────────────────────────────────

  if (phase === 'intro' && quizData) {
    const { quiz, candidate } = quizData;
    const needsMedia = quiz.enableCamera || quiz.enableMicrophone;
    return (
      <div style={S.center}>
        <div style={{ ...S.card, maxWidth: 580, width: '100%' }}>
          {/* Header banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0284c7 100%)', borderRadius: '12px 12px 0 0', margin: '-28px -28px 24px', padding: '30px 28px 26px' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Tech Battle Quiz</div>
            <h2 style={{ color: '#fff', fontWeight: 800, margin: 0, fontSize: 21, lineHeight: 1.3 }}>{quiz.title}</h2>
          </div>

          {/* Candidate */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 16px', marginBottom: 18 }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 3 }}>Registered as</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{candidate.name}</div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{candidate.email}</div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
            {[
              { icon: '📋', val: total, label: 'Questions' },
              { icon: '🏆', val: quiz.totalMarks, label: 'Total Marks' },
              { icon: '⏱', val: quiz.timeLimit ? `${quiz.timeLimit}m` : '—', label: 'Time Limit' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 22, marginBottom: 3 }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#0f172a' }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          {quiz.instructions ? (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#78350f', maxHeight: 160, overflowY: 'auto' }}
              dangerouslySetInnerHTML={{ __html: quiz.instructions }} />
          ) : (
            <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#78350f' }}>
              ⚠️ <strong>Once you click Start, the timer begins immediately.</strong> Do not close or refresh the page.
            </div>
          )}

          {/* Proctoring notice */}
          {(needsMedia || quiz.requireFullScreen || quiz.tabSwitchWarnings) && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
              🔒 <strong>Proctored:</strong>&nbsp;
              {[quiz.enableCamera && 'Camera', quiz.enableMicrophone && 'Microphone', quiz.requireFullScreen && 'Fullscreen', quiz.tabSwitchWarnings && `Tab monitoring (${quiz.warningCount} warnings)`].filter(Boolean).join(' · ')}
              {needsMedia && <div style={{ marginTop: 6, color: '#b45309', fontWeight: 500 }}>⚡ Browser will ask for camera/microphone permission when you click Start.</div>}
            </div>
          )}

          {/* Permission status */}
          {permStatus === 'requesting' && <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#1e40af' }}>📷 Requesting camera/microphone access…</div>}
          {permStatus === 'denied' && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>⚠️ {mediaError}</div>}

          <button
            style={{ ...S.btnPrimary, width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, opacity: permStatus === 'requesting' ? 0.6 : 1 }}
            disabled={permStatus === 'requesting'}
            onClick={handleStart}
          >
            🚀 Start Quiz Now
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 8, marginBottom: 0 }}>Timer starts the moment you click Start</p>
        </div>
      </div>
    );
  }

  // ── PHASE: taking ─────────────────────────────────────────────────────────

  if (phase === 'taking' && quizData && questions.length === 0) return (
    <div style={S.center}><div style={{ ...S.card, textAlign: 'center' }}><div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div><h3>Quiz Has No Questions</h3><p style={{ color: '#64748b' }}>Contact the organiser.</p></div></div>
  );

  if (phase === 'taking' && quizData && current) {
    const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
    const pct = limitSec > 0 ? (timeLeft / limitSec) * 100 : 100;
    const danger = limitSec > 0 && timeLeft < 120;
    const warn = limitSec > 0 && timeLeft < 300;
    const timerCol = danger ? '#ef4444' : warn ? '#f59e0b' : '#1e40af';
    const maxWarn = quizData.quiz.warningCount ?? 3;

    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>

        {/* ── FIX 3: Full-screen tab-switch overlay (impossible to miss) ── */}
        {tabWarnOverlay.show && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 20, padding: '36px 32px', maxWidth: 420, width: '100%', textAlign: 'center', border: `4px solid ${tabWarnOverlay.final ? '#ef4444' : '#f59e0b'}` }}>
              <div style={{ fontSize: 56, marginBottom: 12 }}>{tabWarnOverlay.final ? '🚨' : '⚠️'}</div>
              <h2 style={{ fontWeight: 800, color: tabWarnOverlay.final ? '#ef4444' : '#92400e', marginBottom: 10 }}>
                {tabWarnOverlay.final ? 'Quiz Submitting…' : 'Tab Switch Detected!'}
              </h2>
              <p style={{ color: '#475569', marginBottom: 18, fontSize: 15 }}>
                {tabWarnOverlay.final
                  ? 'You have exceeded the maximum tab switches. Your quiz is being submitted automatically.'
                  : `This is warning ${tabWarnOverlay.count} of ${tabWarnOverlay.max}. After ${tabWarnOverlay.max} switches your quiz will be auto-submitted.`}
              </p>
              {!tabWarnOverlay.final && (
                <button
                  style={{ ...S.btnPrimary, padding: '12px 32px', fontSize: 15 }}
                  onClick={() => setTabWarnOverlay(p => ({ ...p, show: false }))}
                >
                  I Understand — Back to Quiz
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Header ── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 240px)' }}>
              {quizData.quiz.title}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap' }}>
                <strong style={{ color: '#0f172a' }}>{answered}</strong>/{total} answered
              </span>
              {limitSec > 0 && (
                <div style={{ background: timerCol, color: '#fff', borderRadius: 10, padding: '6px 14px', fontFamily: 'monospace', fontWeight: 700, fontSize: 18, minWidth: 84, textAlign: 'center', transition: 'background 0.4s' }}>
                  ⏱ {formatTime(timeLeft)}
                </div>
              )}
            </div>
          </div>
          {limitSec > 0 && (
            <div style={{ height: 3, background: '#e2e8f0', margin: '0 -16px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: timerCol, transition: 'width 1s linear, background 0.4s' }} />
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px', width: '100%', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start' }} className="quiz-grid">

            {/* Question panel */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ background: '#1e40af', color: '#fff', borderRadius: 8, padding: '3px 10px', fontSize: 13, fontWeight: 700 }}>Q {currentIdx + 1} / {total}</span>
                  <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>{current.marks} Mark{current.marks !== 1 ? 's' : ''}</span>
                  {!isSingleChoice(current) && <span style={{ background: '#e0f2fe', color: '#0369a1', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>Multiple Correct</span>}
                </div>
                {answers[current._id]?.length > 0 && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 700 }}>✓ Answered</span>}
              </div>

              <div style={{ padding: '22px 22px 8px' }}>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {getQuestionText(current)}
                </p>
              </div>

              <div style={{ padding: '14px 22px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {current.options.map((opt, i) => {
                  const sel = (answers[current._id] ?? []).includes(opt.text);
                  return (
                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', border: sel ? '2px solid #1e40af' : '1.5px solid #e2e8f0', borderRadius: 10, cursor: 'pointer', background: sel ? '#eff6ff' : '#fff', transition: 'all 0.15s', userSelect: 'none' }}>
                      <input type={isSingleChoice(current) ? 'radio' : 'checkbox'} checked={sel} onChange={() => toggleAnswer(current._id, opt.text, isSingleChoice(current))} style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0, accentColor: '#1e40af' }} />
                      <span style={{ fontSize: 15, color: sel ? '#1e40af' : '#0f172a', fontWeight: sel ? 600 : 400, flex: 1 }}>{opt.text}</span>
                    </label>
                  );
                })}
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 22px', display: 'flex', gap: 10 }}>
                <button style={{ ...S.btnOutline, flex: 1 }} disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>← Prev</button>
                <button style={{ ...S.btnOutline, flex: 1 }} disabled={currentIdx === total - 1} onClick={() => setCurrentIdx(i => i + 1)}>Next →</button>
              </div>
            </div>

            {/* Navigator sidebar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 72 }}>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ background: '#1e3a5f', padding: '11px 16px' }}>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Navigator</span>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {questions.map((q, i) => {
                      const isAns = !!(answers[q._id]?.length);
                      const isCur = i === currentIdx;
                      return (
                        <button key={q._id} onClick={() => setCurrentIdx(i)} style={{ width: 36, height: 36, border: 'none', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 12, background: isCur ? '#1e40af' : isAns ? '#16a34a' : '#f1f5f9', color: (isCur || isAns) ? '#fff' : '#475569', outline: isCur ? '2px solid #93c5fd' : 'none', transition: 'all 0.12s' }}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11, color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#16a34a', display: 'inline-block' }} /> Answered</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 11, height: 11, borderRadius: 3, background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'inline-block' }} /> Pending</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>Progress</span>
                  <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 12 }}>{answered}/{total}</span>
                </div>
                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${total > 0 ? (answered / total) * 100 : 0}%`, background: '#16a34a', borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>

              {tabWarnings > 0 && (
                <div style={{ background: '#fef3c7', border: '1.5px solid #f59e0b', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  ⚠️ Tab warnings: {tabWarnings}/{maxWarn}
                </div>
              )}

              <button style={{ ...S.btnDanger, width: '100%', padding: '13px', fontWeight: 700, fontSize: 15 }} onClick={() => setShowSubmitConfirm(true)}>
                Submit Quiz
              </button>
            </div>
          </div>
        </div>

        {/* Submit confirm modal */}
        {showSubmitConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📋</div>
              <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Submit Quiz?</h3>
              <p style={{ color: '#64748b', marginBottom: 4 }}>Answered <strong>{answered}</strong> of <strong>{total}</strong> questions.</p>
              {answered < total && <p style={{ color: '#dc2626', fontSize: 13, marginBottom: 16 }}>⚠️ {total - answered} unanswered question{total - answered !== 1 ? 's' : ''}.</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button style={{ ...S.btnOutline, flex: 1 }} onClick={() => setShowSubmitConfirm(false)}>Go Back</button>
                <button style={{ ...S.btnDanger, flex: 1 }} onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }}>Submit Now</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── PHASE: submitting ─────────────────────────────────────────────────────

  if (phase === 'submitting') return (
    <div style={S.center}>
      <div style={{ ...S.card, textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b', margin: 0, fontWeight: 600 }}>Submitting your answers…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ── PHASE: result ─────────────────────────────────────────────────────────

  if (phase === 'result') {
    const socialLinks = [
      { icon: '📸', label: 'Instagram', url: 'https://www.instagram.com/codebegun', color: '#e1306c', bg: '#fdf2f8' },
      { icon: '💼', label: 'LinkedIn', url: 'https://www.linkedin.com/company/codebegun', color: '#0a66c2', bg: '#eff6ff' },
      { icon: '▶️', label: 'YouTube', url: 'https://www.youtube.com/@codebegun', color: '#ff0000', bg: '#fff1f2' },
      { icon: '🌐', label: 'Website', url: 'https://codebegun.com', color: '#0d9488', bg: '#f0fdfa' },
    ];

    return (
      <div style={S.center}>
        <div style={{ ...S.card, maxWidth: 480, width: '100%', textAlign: 'center', padding: 0, overflow: 'hidden' }}>

          {/* Hero banner */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0284c7 100%)', padding: '36px 28px 32px' }}>
            <div style={{ fontSize: 64, marginBottom: 10 }}>🎉</div>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: 26, margin: '0 0 8px' }}>Thank You!</h2>
            <p style={{ color: 'rgba(255,255,255,0.85)', margin: 0, fontSize: 15, fontWeight: 500 }}>
              {quizData?.quiz.title || 'Weekly Tech Battle'}
            </p>
          </div>

          <div style={{ padding: '28px 24px' }}>

            {/* Main message */}
            <div style={{ background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 14, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🏅</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#15803d', margin: '0 0 6px' }}>
                You've been selected!
              </p>
              <p style={{ fontSize: 14, color: '#166534', margin: 0, lineHeight: 1.6 }}>
                The <strong>Codebegun team</strong> will connect with you shortly. Check the results and updates on our website.
              </p>
            </div>

            {/* Info box */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: 13, color: '#78350f', lineHeight: 1.6 }}>
              Your quiz response has been recorded successfully. Results will be announced soon — stay tuned on our social channels for updates.
            </div>

            {/* Social links */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
              Connect with us for more updates
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 20 }}>
              {socialLinks.map(s => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: s.bg, border: `1.5px solid ${s.color}30`, borderRadius: 12, textDecoration: 'none', transition: 'transform 0.15s' }}
                >
                  <span style={{ fontSize: 20 }}>{s.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.label}</span>
                </a>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#94a3b8', margin: 0 }}>
              © Codebegun · platform.codebegun.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const S = {
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: 16 } as React.CSSProperties,
  card: { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(0,0,0,0.1)', maxWidth: 480, width: '100%' } as React.CSSProperties,
  btnPrimary: { background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 } as React.CSSProperties,
  btnOutline: { background: '#fff', color: '#475569', border: '1.5px solid #cbd5e1', borderRadius: 10, padding: '10px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 500 } as React.CSSProperties,
  btnDanger: { background: '#dc2626', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600 } as React.CSSProperties,
};

export default QuizSession;

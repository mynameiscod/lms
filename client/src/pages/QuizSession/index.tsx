import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { publicQuizSessionApi } from '../../api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizOption {
  text: string;
}

interface QuizQuestion {
  _id: string;
  questionText: string;
  questionType: string;
  options: QuizOption[];
  marks: number;
}

interface QuizInfo {
  title: string;
  description?: string;
  timeLimit?: number; // minutes
  totalMarks: number;
  passingScore?: number;
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
}

interface QuizData {
  quiz: QuizInfo;
  questions: QuizQuestion[];
  candidate: { name: string; email: string };
  quizStartedAt: string; // ISO timestamp set by server
}

interface ResultData {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  rank: number | null;
  timeSpentSeconds: number;
}

type Phase = 'loading' | 'intro' | 'taking' | 'submitting' | 'result' | 'error' | 'already_done' | 'not_yet';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function calculateCountdown(targetDate: Date): CountdownParts {
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds };
}

function formatCountdown(parts: CountdownParts): string {
  if (parts.totalSeconds <= 0) return 'Opening now...';
  if (parts.days > 0) return `${parts.days}d ${parts.hours}h ${parts.minutes}m`;
  if (parts.hours > 0) return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
  return `${parts.minutes}m ${parts.seconds}s`;
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
  const [opensAt, setOpensAt] = useState<string>('');
  const [eventTimeIST, setEventTimeIST] = useState<string>('');
  const [countdown, setCountdown] = useState<CountdownParts>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasSubmitted = useRef(false);

  // ── Load quiz ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) { setErrorMsg('Invalid quiz link.'); setPhase('error'); return; }
    publicQuizSessionApi.getQuiz(token)
      .then((data: QuizData) => {
        setQuizData(data);
        // If quizStartedAt already exists this is a resume — go straight to taking
        if (data.quizStartedAt) {
          const elapsed = Math.floor((Date.now() - new Date(data.quizStartedAt).getTime()) / 1000);
          const limitSec = (data.quiz.timeLimit ?? 0) * 60;
          const remaining = limitSec > 0 ? Math.max(0, limitSec - elapsed) : 0;
          setTimeLeft(remaining);
          setPhase(remaining === 0 && limitSec > 0 ? 'submitting' : 'taking');
        } else {
          setPhase('intro');
        }
      })
      .catch((err: any) => {
        if (err.code === 'NOT_YET') {
          setOpensAt(err.opensAt || '');
          setEventTimeIST(err.eventTimeIST || '');
          setPhase('not_yet');
        } else if ((err.message || '').toLowerCase().includes('already')) {
          setPhase('already_done');
        } else {
          setErrorMsg(err.message || 'Failed to load quiz');
          setPhase('error');
        }
      });
  }, [token]);

  // ── Countdown timer (when quiz not yet open) ────────────────────────────

  useEffect(() => {
    if (phase !== 'not_yet' || !opensAt) return;

    const openDate = new Date(opensAt);

    const updateCountdown = () => {
      const parts = calculateCountdown(openDate);
      setCountdown(parts);

      // Auto-refresh when quiz is about to open (within 5 seconds)
      if (parts.totalSeconds <= 5 && parts.totalSeconds > 0) {
        // Quietly refresh to check if quiz is now open
        setTimeout(() => {
          if (!token) return;
          publicQuizSessionApi.getQuiz(token)
            .then(() => window.location.reload())
            .catch(() => {}); // Ignore errors; will retry next tick
        }, 1000);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [phase, opensAt, token]);

  const handleAutoSubmit = useCallback(() => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;
    setPhase('submitting');
    if (!token) return;
    publicQuizSessionApi.submitQuiz(token, answers)
      .then((res: ResultData) => { setResult(res); setPhase('result'); })
      .catch(() => { setResult(null); setPhase('result'); });
  }, [token, answers]);

  useEffect(() => {
    if (phase !== 'taking') return;
    const limitSec = (quizData?.quiz.timeLimit ?? 0) * 60;
    if (limitSec <= 0) return; // no time limit

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, quizData, handleAutoSubmit]);

  // ── Start quiz ─────────────────────────────────────────────────────────────

  const handleStart = () => {
    if (!quizData) return;
    // quizStartedAt is set server-side on GET; if timeLimit exists initialise timer
    const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
    if (limitSec > 0) setTimeLeft(limitSec);
    setPhase('taking');
  };

  // ── Answer selection ───────────────────────────────────────────────────────

  const toggleAnswer = (questionId: string, optionText: string, isSingle: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] ?? [];
      if (isSingle) {
        return { ...prev, [questionId]: [optionText] };
      }
      const has = current.includes(optionText);
      return {
        ...prev,
        [questionId]: has ? current.filter(o => o !== optionText) : [...current, optionText],
      };
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!token || hasSubmitted.current) return;
    hasSubmitted.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('submitting');
    publicQuizSessionApi.submitQuiz(token, answers)
      .then((res: ResultData) => { setResult(res); setPhase('result'); })
      .catch((err: Error) => { setErrorMsg(err.message); setPhase('result'); });
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const questions = quizData?.questions ?? [];
  const current = questions[currentIdx];
  const answered = Object.keys(answers).length;
  const total = questions.length;
  const isSingleChoice = (q: QuizQuestion) => q.questionType !== 'multiple_correct';

  // ── Phases ─────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" />
          <p className="text-muted">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (phase === 'not_yet') {
    // Always derive BOTH date and time from opensAt using IST — never mix with eventTimeIST
    const openDate = opensAt ? new Date(opensAt) : null;
    const displayDate = openDate
      ? openDate.toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })
      : '';
    const displayTime = openDate
      ? openDate.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit', minute: '2-digit', hour12: true,
        }) + ' IST'
      : eventTimeIST; // fallback only if opensAt is unavailable

    const countdownText = formatCountdown(countdown);
    const countdownColor = countdown.totalSeconds <= 60 ? '#ef4444' : countdown.totalSeconds <= 300 ? '#f59e0b' : '#3b82f6';

    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f0f4f8' }}>
        <div className="card shadow p-4 text-center" style={{ maxWidth: 520, borderRadius: 16, border: 'none' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>⏰</div>
          <h4 className="mb-2 fw-bold" style={{ color: '#0d1b2a' }}>Quiz Not Open Yet</h4>
          <p className="text-muted mb-4" style={{ fontSize: 15 }}>
            Your quiz link is confirmed but the quiz hasn't opened yet.
          </p>

          {/* Countdown display */}
          <div style={{
            background: countdownColor + '15',
            border: `2px solid ${countdownColor}`,
            borderRadius: 12,
            padding: '20px',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
              Opens in
            </div>
            <div style={{
              fontSize: 42,
              fontWeight: 700,
              color: countdownColor,
              fontFamily: 'monospace',
              letterSpacing: 1,
            }}>
              {countdownText}
            </div>
          </div>

          {/* Date and time info */}
          {(displayDate || displayTime) && (
            <div style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: 10, padding: '14px 20px', marginBottom: 20 }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8', fontSize: 15 }}>
                {displayDate && <span>📅 {displayDate}</span>}
                {displayDate && displayTime && ' · '}
                {displayTime && <span>🕖 {displayTime}</span>}
              </div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 6 }}>Quiz opens at this time</div>
            </div>
          )}

          <p className="text-muted" style={{ fontSize: 13, marginBottom: 3 }}>
            Keep this page open or bookmark it — it will unlock automatically.
          </p>
          <button
            className="btn btn-primary btn-sm mt-3"
            onClick={() => window.location.reload()}
            title="Check if quiz is open now"
          >
            Refresh to Check Now
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: 480 }}>
          <div className="text-danger fs-1 mb-2">⚠️</div>
          <h5 className="mb-2">Cannot Load Quiz</h5>
          <p className="text-muted">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (phase === 'already_done') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: 480 }}>
          <div className="fs-1 mb-2">✅</div>
          <h5 className="mb-2">Quiz Already Submitted</h5>
          <p className="text-muted">You have already completed this quiz. Results will be shared by the organiser.</p>
        </div>
      </div>
    );
  }

  if (phase === 'intro' && quizData) {
    const { quiz, candidate } = quizData;
    const candidateName = candidate?.name || (quizData as any).candidateName || '';
    const candidateEmail = candidate?.email || '';
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow p-4" style={{ maxWidth: 560, width: '100%' }}>
          <h3 className="mb-1 fw-bold">{quiz.title}</h3>
          {quiz.description && <p className="text-muted mb-3">{quiz.description}</p>}
          <hr />
          {candidateName && <p className="mb-1"><strong>Candidate:</strong> {candidateName}</p>}
          {candidateEmail && <p className="mb-3"><strong>Email:</strong> {candidateEmail}</p>}
          <ul className="list-unstyled text-muted small mb-4">
            <li>📋 <strong>{total}</strong> question{total !== 1 ? 's' : ''}</li>
            <li>🏆 Total marks: <strong>{quiz.totalMarks}</strong></li>
            {quiz.timeLimit && <li>⏱ Time limit: <strong>{quiz.timeLimit} minute{quiz.timeLimit !== 1 ? 's' : ''}</strong></li>}
            {quiz.passingScore != null && <li>✅ Passing score: <strong>{quiz.passingScore}%</strong></li>}
          </ul>
          <div className="alert alert-warning small mb-4">
            <strong>Instructions:</strong> Once you click Start, the timer begins. Do not close or refresh the page. Submit before time runs out.
          </div>
          <button className="btn btn-primary btn-lg w-100" onClick={handleStart}>
            Start Quiz
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'taking' && quizData && questions.length === 0) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow-sm p-4 text-center" style={{ maxWidth: 480 }}>
          <div className="fs-1 mb-2">⚠️</div>
          <h5 className="mb-2">Quiz Has No Questions</h5>
          <p className="text-muted">This quiz hasn't been set up with questions yet. Please contact the organiser.</p>
        </div>
      </div>
    );
  }

  if (phase === 'taking' && quizData && current) {
    const limitSec = (quizData.quiz.timeLimit ?? 0) * 60;
    const timerDanger = limitSec > 0 && timeLeft < 60;

    return (
      <div className="min-vh-100 bg-light d-flex flex-column">
        {/* Header */}
        <div className="bg-white border-bottom px-3 py-2 d-flex align-items-center justify-content-between sticky-top shadow-sm">
          <span className="fw-semibold text-truncate" style={{ maxWidth: 300 }}>{quizData.quiz.title}</span>
          <div className="d-flex align-items-center gap-3">
            <span className="text-muted small">{answered}/{total} answered</span>
            {limitSec > 0 && (
              <span className={`badge fs-6 px-3 py-2 ${timerDanger ? 'bg-danger' : 'bg-primary'}`}>
                ⏱ {formatTime(timeLeft)}
              </span>
            )}
          </div>
        </div>

        <div className="container-fluid py-3 flex-grow-1" style={{ maxWidth: 760 }}>
          <div className="row g-3">
            {/* Question panel */}
            <div className="col-12 col-md-8">
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <p className="text-muted small mb-1">
                    Question {currentIdx + 1} of {total}
                    <span className="ms-2 badge bg-secondary">{current.marks} mark{current.marks !== 1 ? 's' : ''}</span>
                    {!isSingleChoice(current) && <span className="ms-2 badge bg-info text-dark">Multiple correct</span>}
                  </p>
                  <p className="fw-semibold mb-4" style={{ fontSize: '1.05rem' }}>{current.questionText}</p>

                  <div className="d-flex flex-column gap-2">
                    {current.options.map((opt, i) => {
                      const sel = (answers[current._id] ?? []).includes(opt.text);
                      return (
                        <label
                          key={i}
                          className={`d-flex align-items-start gap-2 border rounded p-3 cursor-pointer ${sel ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                          style={{ cursor: 'pointer' }}
                        >
                          <input
                            type={isSingleChoice(current) ? 'radio' : 'checkbox'}
                            className="form-check-input mt-1 flex-shrink-0"
                            checked={sel}
                            onChange={() => toggleAnswer(current._id, opt.text, isSingleChoice(current))}
                          />
                          <span>{opt.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigator */}
            <div className="col-12 col-md-4">
              <div className="card shadow-sm">
                <div className="card-header fw-semibold small">Navigator</div>
                <div className="card-body">
                  <div className="d-flex flex-wrap gap-1">
                    {questions.map((q, i) => {
                      const isAnswered = !!(answers[q._id]?.length);
                      const isCurrent = i === currentIdx;
                      return (
                        <button
                          key={q._id}
                          className={`btn btn-sm ${isCurrent ? 'btn-primary' : isAnswered ? 'btn-success' : 'btn-outline-secondary'}`}
                          style={{ width: 36, height: 36, padding: 0 }}
                          onClick={() => setCurrentIdx(i)}
                        >
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 small text-muted">
                    <span className="badge bg-success me-1"> </span> Answered &nbsp;
                    <span className="badge bg-secondary me-1"> </span> Not answered
                  </div>
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <button
                  className="btn btn-outline-secondary flex-grow-1"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx(i => i - 1)}
                >
                  Prev
                </button>
                <button
                  className="btn btn-outline-primary flex-grow-1"
                  disabled={currentIdx === total - 1}
                  onClick={() => setCurrentIdx(i => i + 1)}
                >
                  Next
                </button>
              </div>

              <button className="btn btn-danger w-100 mt-3" onClick={handleSubmit}>
                Submit Quiz
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" />
          <p className="text-muted">Submitting your answers…</p>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    if (!result) {
      return (
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
          <div className="card shadow-sm p-4 text-center" style={{ maxWidth: 480 }}>
            <div className="text-danger fs-1 mb-2">⚠️</div>
            <h5>Submission Error</h5>
            <p className="text-muted">{errorMsg || 'Your answers could not be submitted. Please contact the organiser.'}</p>
          </div>
        </div>
      );
    }

    const pct = result.percentage ?? 0;
    const passColor = result.passed ? 'success' : 'danger';

    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="card shadow p-4 text-center" style={{ maxWidth: 520, width: '100%' }}>
          <div className={`fs-1 mb-2`}>{result.passed ? '🏆' : '📋'}</div>
          <h4 className="mb-1 fw-bold">{result.passed ? 'Congratulations!' : 'Quiz Completed'}</h4>
          <p className="text-muted mb-4">Your results for <strong>{quizData?.quiz.title}</strong></p>

          <div className="row g-3 mb-4">
            <div className="col-6">
              <div className={`card border-${passColor} h-100`}>
                <div className="card-body py-2">
                  <div className={`fs-2 fw-bold text-${passColor}`}>{pct.toFixed(1)}%</div>
                  <div className="text-muted small">Score</div>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card h-100">
                <div className="card-body py-2">
                  <div className="fs-2 fw-bold">{result.score}/{result.totalMarks}</div>
                  <div className="text-muted small">Marks</div>
                </div>
              </div>
            </div>
            {result.rank && (
              <div className="col-6">
                <div className="card h-100">
                  <div className="card-body py-2">
                    <div className="fs-2 fw-bold">#{result.rank}</div>
                    <div className="text-muted small">Rank</div>
                  </div>
                </div>
              </div>
            )}
            <div className={result.rank ? 'col-6' : 'col-12'}>
              <div className="card h-100">
                <div className="card-body py-2">
                  <div className="fs-2 fw-bold">{formatDuration(result.timeSpentSeconds)}</div>
                  <div className="text-muted small">Time taken</div>
                </div>
              </div>
            </div>
          </div>

          <span className={`badge bg-${passColor} fs-6 px-4 py-2`}>
            {result.passed ? 'PASSED' : 'NOT PASSED'}
          </span>

          <p className="text-muted small mt-4">Results have been recorded. The organiser will contact you with next steps.</p>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizSession;

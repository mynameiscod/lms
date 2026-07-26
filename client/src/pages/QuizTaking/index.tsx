import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner, Button, Modal } from '../../components/common';
import { Quiz, Question, QuizAttempt } from '../../types';
import './QuizTakingPage.css';
import './QuizRunner.css';

const QuizTakingPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Map<string, any>>(new Map());
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [startingQuiz, setStartingQuiz] = useState(false);
  const [showTabWarnModal, setShowTabWarnModal] = useState(false);
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const preventCopyPasteRef = useRef((e: Event) => e.preventDefault());
  const submitQuizRef = useRef<() => void>(() => {});
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [mediaError, setMediaError] = useState('');
  // Stable mutable refs for use inside event callbacks (avoid stale closure / re-registration bugs)
  const quizRef = useRef<Quiz | null>(null);
  const tabSwitchCountRef = useRef(0);
  const attemptRef = useRef<any>(null);

  // Keep refs in sync with state
  useEffect(() => { quizRef.current = quiz; }, [quiz]);
  useEffect(() => { tabSwitchCountRef.current = tabSwitchCount; }, [tabSwitchCount]);
  useEffect(() => { attemptRef.current = attempt; }, [attempt]);

  const handleTabSwitch = useCallback(() => {
    setTabSwitchCount(prev => {
      const newCount = prev + 1;
      // Auto-submit if tab switches exceed warning count limit
      if (quiz?.tabSwitchWarnings && quiz?.warningCount && newCount >= quiz.warningCount) {
        submitQuizRef.current();
      }
      return newCount;
    });
    if (quiz?.tabSwitchWarnings) {
      setShowTabWarnModal(true);
    }
  }, [quiz?.tabSwitchWarnings, quiz?.warningCount]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden && quiz?.tabSwitchWarnings) {
      setTabSwitchCount(prev => {
        const newCount = prev + 1;
        if (quiz?.warningCount && newCount >= quiz.warningCount) {
          submitQuizRef.current();
        }
        return newCount;
      });
      setShowTabWarnModal(true);
    }
  }, [quiz?.tabSwitchWarnings, quiz?.warningCount]);

  const handleFullscreenChange = useCallback(() => {
    // Re-enforce fullscreen if user exits it during quiz
    // Use ref to avoid stale closure — deps on `attempt` would cause listeners to be re-registered
    if (quizRef.current?.requireFullScreen && !document.fullscreenElement && attemptRef.current) {
      requestFullscreen();
    }
  }, []); // stable — reads from refs

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setupEventListeners = useCallback(() => {
    // Tab switch detection
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleTabSwitch);
    // Fullscreen detection
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    // Copy/paste prevention
    if (!quiz?.canCopyPaste) {
      document.addEventListener('copy', preventCopyPasteRef.current);
      document.addEventListener('paste', preventCopyPasteRef.current);
      document.addEventListener('cut', preventCopyPasteRef.current);
      document.addEventListener('contextmenu', preventCopyPasteRef.current);
    }
  }, [handleTabSwitch, handleVisibilityChange, handleFullscreenChange, quiz?.canCopyPaste]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cleanupEventListeners = useCallback(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleTabSwitch);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    
    // Remove copy/paste prevention
    document.removeEventListener('copy', preventCopyPasteRef.current);
    document.removeEventListener('paste', preventCopyPasteRef.current);
    document.removeEventListener('cut', preventCopyPasteRef.current);
    document.removeEventListener('contextmenu', preventCopyPasteRef.current);
  }, [handleTabSwitch, handleVisibilityChange, handleFullscreenChange]);

  const loadQuiz = useCallback(async () => {
    try {
      setLoading(true);
      if (!quizId) {
        setError('Quiz ID not found');
        return;
      }

      // Fetch quiz info only (don't start attempt yet)
      const quizRes = await quizApi.getQuizById(quizId);
      setQuiz(quizRes.data || quizRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  // Function to actually start the quiz (called from instructions page)
  const handleStartQuiz = useCallback(async () => {
    try {
      setStartingQuiz(true);
      setError('');
      setMediaError('');
      if (!quizId) return;

      // Request camera/microphone BEFORE starting attempt (to avoid wasting attempts)
      if (quiz?.enableCamera || quiz?.enableMicrophone) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          // mediaDevices not available (HTTP or unsupported browser) — warn but continue
          setMediaError('Proctoring unavailable: site must be served over HTTPS for camera/microphone access. Quiz will proceed without proctoring.');
        } else {
          try {
            const constraints: MediaStreamConstraints = {
              video: quiz.enableCamera ? { width: 320, height: 240, facingMode: 'user' } : false,
              audio: quiz.enableMicrophone ? true : false,
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;
            // Start recording
            try {
              const recorder = new MediaRecorder(stream);
              recorder.ondataavailable = (e) => {
                if (e.data.size > 0) recordingChunksRef.current.push(e.data);
              };
              recorder.start(1000); // collect 1-second chunks
              mediaRecorderRef.current = recorder;
            } catch (recErr) {
              console.warn('MediaRecorder not supported:', recErr);
            }
          } catch (mediaErr: any) {
            // Permission denied or blocked — warn but allow quiz to continue
            const device = quiz.enableCamera && quiz.enableMicrophone ? 'camera and microphone' : quiz.enableCamera ? 'camera' : 'microphone';
            setMediaError(`Could not access ${device}. The quiz will proceed without proctoring. If you're in incognito mode, try a normal browser window.`);
          }
        }
      }

      // Fetch questions (without answers for security)
      const questionsRes = await quizApi.getQuestionsWithoutAnswers(quizId);
      const loadedQuestions = questionsRes.data || questionsRes;
      setQuestions(loadedQuestions);

      if (!loadedQuestions || loadedQuestions.length === 0) {
        setError('This quiz has no questions. Please contact your instructor.');
        setStartingQuiz(false);
        return;
      }

      // Start attempt
      const attemptRes = await quizApi.startAttempt(quizId);
      setAttempt(attemptRes.data || attemptRes);

      // Calculate time left in minutes
      if (quiz) {
        setTimeLeft(quiz.totalTime * 60); // Convert to seconds
      }

      // Require fullscreen if needed
      if (quiz?.requireFullScreen && !document.fullscreenElement) {
        requestFullscreen();
      }

      // Show quiz (hide instructions)
      setShowInstructions(false);
      
      // Setup event listeners after starting
      setupEventListeners();
    } catch (err: any) {
      setError(err.message || 'Failed to start quiz');
    } finally {
      setStartingQuiz(false);
    }
  }, [quizId, quiz, setupEventListeners]);

  // Attach camera stream to video element when it mounts
  useEffect(() => {
    if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
    }
  }, [showInstructions]);

  useEffect(() => {
    loadQuiz();
    // Don't setup event listeners here - do it when quiz starts

    return () => {
      cleanupEventListeners();
      if (timerRef.current) clearInterval(timerRef.current);
      // Stop media stream on unmount
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [quizId, loadQuiz, cleanupEventListeners]);

  const requestFullscreen = async () => {
    if (fullScreenRef.current) {
      try {
        await fullScreenRef.current.requestFullscreen();
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getOptionText = (option: any): string => {
    // Handle both string and object option formats
    if (typeof option === 'string') {
      return option;
    }
    return option?.text || '';
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    const newAnswers = new Map(answers);
    newAnswers.set(questionId, value);
    setAnswers(newAnswers);
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const toggleReview = (questionId: string) => {
    setMarkedForReview(prev => {
      const n = new Set(prev);
      n.has(questionId) ? n.delete(questionId) : n.add(questionId);
      return n;
    });
  };

  const handleClearResponse = (questionId: string) => {
    setAnswers(prev => { const n = new Map(prev); n.delete(questionId); return n; });
  };

  // Jump to the next question marked for review after the current one (wraps around).
  const goToReview = () => {
    if (markedForReview.size === 0) return;
    for (let i = 1; i <= questions.length; i++) {
      const idx = (currentQuestionIndex + i) % questions.length;
      if (markedForReview.has(questions[idx]._id)) { setCurrentQuestionIndex(idx); return; }
    }
  };

  const handleSubmitQuiz = useCallback(async () => {
    try {
      if (!attempt || !quiz) return;
      if (submitting) return; // guard against double-submit
      setSubmitting(true);
      setError('');

      // Prepare submissions
      const submissions = Array.from(answers.entries()).map(([questionId, answer]) => {
        const question = questions.find(q => q._id === questionId);
        const questionIndex = questions.findIndex(q => q._id === questionId);
        const submission: any = {
          questionId,
          questionNo: questionIndex + 1, // Add questionNo (1-based index)
          questionType: question?.type,
        };

        // Format answer based on question type
        if (question?.type === 'mcq_single' || question?.type === 'mcq_multiple') {
          submission.selectedOptions = Array.isArray(answer) ? answer : [answer];
        } else {
          submission.answer = answer || '';
        }

        return submission;
      });

      // Retry the submit on transient network failures ("Failed to fetch"). The server
      // is idempotent, so retrying after a dropped connection is safe. This fixes students
      // getting stranded on flaky wifi when the connection drops mid-submit.
      let lastErr: any = null;
      for (let attemptNo = 1; attemptNo <= 4; attemptNo++) {
        try {
          await quizApi.submitAttempt(quizId, attempt._id, submissions);
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          const msg = String(e?.message || '');
          const isNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network') || e?.name === 'TypeError';
          if (!isNetwork || attemptNo === 4) throw e;
          await new Promise(res => setTimeout(res, attemptNo * 1500)); // 1.5s, 3s, 4.5s backoff
        }
      }
      if (lastErr) throw lastErr;

      // Stop recording and save blob to server
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        await new Promise<void>((resolve) => {
          mediaRecorderRef.current!.onstop = () => {
            if (recordingChunksRef.current.length > 0) {
              const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
              const formData = new FormData();
              formData.append('recording', blob, `quiz_${quizId}_${attempt._id}.webm`);
              quizApi.uploadRecording(quizId, attempt._id, formData).catch(err =>
                console.warn('Failed to upload recording:', err)
              );
            }
            resolve();
          };
          mediaRecorderRef.current!.stop();
        });
      }
      // Stop media stream on submit
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Redirect to results
      window.location.href = `/quiz/${quizId}/results/${attempt._id}`;
    } catch (err: any) {
      const msg = String(err?.message || '');
      const isNetwork = msg.includes('Failed to fetch') || msg.includes('NetworkError') || err?.name === 'TypeError';
      setError(isNetwork
        ? 'Network issue while submitting — your answers are kept. Please check your connection and press Submit again.'
        : (err.message || 'Failed to submit quiz'));
      setSubmitting(false);
    }
  }, [quizId, attempt, answers, questions, quiz, submitting]);

  // Keep ref in sync so tab-switch handler can call it without circular deps
  useEffect(() => {
    submitQuizRef.current = handleSubmitQuiz;
  }, [handleSubmitQuiz]);

  useEffect(() => {
    // Only run timer when quiz has started (not on instruction page)
    if (showInstructions || timeLeft <= 0 || !quiz) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showInstructions, timeLeft, quiz, handleSubmitQuiz]);

  if (loading) return <Spinner fullScreen />;
  
  // If there's a fatal error before quiz loads (like quiz not found), show error page
  if (error && !quiz) {
    return (
      <div className="quiz-error-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h2>Cannot Start Quiz</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <Button onClick={() => window.history.back()} className="btn-secondary">
              ← Go Back
            </Button>
            <Button onClick={() => window.location.href = '/quizzes'} className="btn-primary">
              View My Quizzes
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) return <Alert type="error" message="Failed to load quiz" />;

  // Show instructions page before starting quiz
  if (showInstructions) {
    const q: any = quiz;
    const subject = q.category || q.subject || q.topic || 'Assessment';
    const rules: string[] = [
      'Read each question carefully before answering.',
      `You have ${quiz.totalTime} minutes to complete this quiz.`,
      'All questions are mandatory.',
    ];
    if (quiz.shuffleQuestions) rules.push('Questions will be shuffled randomly.');
    if (!quiz.canCopyPaste) rules.push('Copy-paste is disabled during the quiz.');
    if (quiz.requireFullScreen) rules.push('Full screen mode is required during the quiz.');
    if (quiz.tabSwitchWarnings) rules.push('Switching tabs/windows will be tracked and may result in penalties.');
    if (quiz.enableCamera) rules.push('Your camera will be enabled during the quiz for proctoring.');
    if (quiz.enableMicrophone) rules.push('Your microphone will be enabled during the quiz for proctoring.');
    if (quiz.negativeMarking) rules.push(`Wrong answers deduct ${quiz.negativeMarkingValue} mark(s).`);
    if (!quiz.multipleAttempts) rules.push('Only one attempt is allowed for this quiz.');
    else if (quiz.maxAttempts) rules.push(`Maximum ${quiz.maxAttempts} attempts are allowed.`);

    const stats = [
      { icon: '📋', tint: '#ede9fe', color: '#7c3aed', label: 'TOTAL QUESTIONS', value: quiz.totalQuestions },
      { icon: '🎯', tint: '#fee2e2', color: '#e11d48', label: 'TOTAL MARKS', value: quiz.totalMarks },
      { icon: '⏱️', tint: '#ffedd5', color: '#ea580c', label: 'DURATION', value: <>{quiz.totalTime} <span style={{ fontSize: 15, fontWeight: 600 }}>mins</span></> },
      ...(quiz.passingMarks ? [{ icon: '🛡️', tint: '#dcfce7', color: '#16a34a', label: 'PASSING MARKS', value: quiz.passingMarks }] : []),
    ];

    return (
      <div style={{ minHeight: '100vh', background: '#eef2f9', padding: '20px 24px 50px' }}>
        <div style={{ width: '100%' }}>
          {error && <div style={{ marginBottom: 14 }}><Alert type="error" message={error} onClose={() => setError('')} /></div>}

          <div style={{ background: '#fff', borderRadius: 22, overflow: 'hidden', boxShadow: '0 20px 60px rgba(15,23,42,.10)' }}>
            {/* Hero */}
            <div style={{ background: 'linear-gradient(120deg,#0b1c66 0%,#15307f 55%,#1e40af 100%)', color: '#fff', padding: '34px 40px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: 54, top: 50, fontSize: 110, opacity: 0.16, fontWeight: 800 }}>{'</>'}</div>
              <span style={{ display: 'inline-block', background: 'rgba(255,255,255,.16)', border: '1px solid rgba(255,255,255,.25)', color: '#dbeafe', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 700 }}>{subject}</span>
              <h1 style={{ fontSize: 44, fontWeight: 800, margin: '14px 0 8px', lineHeight: 1.1 }}>{quiz.title}</h1>
              {quiz.description && <p style={{ fontSize: 15.5, color: '#c7d2fe', margin: 0, maxWidth: 720, lineHeight: 1.5 }}>{quiz.description}</p>}
            </div>

            {/* Body */}
            <div style={{ padding: '24px 32px 30px' }}>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stats.length}, 1fr)`, gap: 16, marginBottom: 26 }}>
                {stats.map((s, i) => (
                  <div key={i} style={{ background: '#fff', border: '1px solid #eef1f6', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 6px 20px rgba(15,23,42,.06)' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: s.tint, color: s.color, display: 'grid', placeItems: 'center', fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#94a3b8', letterSpacing: .4 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>{s.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Instructions */}
              <div style={{ border: '1px solid #eef1f6', borderRadius: 16, padding: '22px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: '#6366f1', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16 }}>📋</span>
                  <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#0f172a', borderBottom: '3px solid #6366f1', paddingBottom: 4 }}>Instructions</h2>
                </div>

                {quiz.instructions ? (
                  <div style={{ fontSize: 14.5, color: '#334155', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: quiz.instructions }} />
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px 20px' }}>
                    {rules.map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 10, padding: '11px 14px', fontSize: 13.8, color: '#334155' }}>
                        <span style={{ color: '#16a34a', fontSize: 16, flexShrink: 0 }}>✓</span> {r}
                      </div>
                    ))}
                  </div>
                )}

                {/* Motivational banner */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(120deg,#eff6ff,#f5f3ff)', border: '1px solid #e0e7ff', borderRadius: 12, padding: '16px 18px', marginTop: 18 }}>
                  <span style={{ fontSize: 30 }}>🚀</span>
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: '#1e3a8a' }}>Be Honest. Be Focused. Be Future-Ready.</div>
                    <div style={{ fontSize: 13.5, color: '#475569', marginTop: 2 }}>This assessment helps us understand your skills better and guide you on the right path.</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, gap: 12, flexWrap: 'wrap' }}>
                <button onClick={() => navigate(-1)} disabled={startingQuiz}
                  style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: 10, padding: '12px 22px', fontWeight: 700, fontSize: 14.5, color: '#334155', cursor: startingQuiz ? 'default' : 'pointer' }}>
                  ← Go Back
                </button>
                <button onClick={handleStartQuiz} disabled={startingQuiz}
                  style={{ background: 'linear-gradient(90deg,#4f46e5,#7c3aed)', border: 'none', borderRadius: 10, padding: '13px 30px', fontWeight: 800, fontSize: 15.5, color: '#fff', cursor: startingQuiz ? 'default' : 'pointer', boxShadow: '0 10px 24px rgba(79,70,229,.32)', opacity: startingQuiz ? 0.8 : 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  {startingQuiz ? <><Spinner size="small" /> Starting…</> : <>🚀 Start Quiz →</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!attempt) return <Spinner fullScreen />;

  const currentQuestion = questions[currentQuestionIndex];
  const timeWarning = timeLeft < 300; // Less than 5 minutes
  const timeCritical = timeLeft < 60; // Less than 1 minute
  const answeredCount = answers.size;
  const pctAnswered = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const typeLabel = (t?: string) => t === 'mcq_single' ? 'MCQ - Single Choice'
    : t === 'mcq_multiple' ? 'MCQ - Multiple Choice'
    : t === 'short_answer' ? 'Short Answer'
    : t === 'coding' ? 'Coding' : 'Question';
  const nowStr = `${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
  const isReviewed = currentQuestion ? markedForReview.has(currentQuestion._id) : false;
  const isLast = currentQuestionIndex >= questions.length - 1;

  const renderOptions = () => {
    if (!currentQuestion) return null;
    if (currentQuestion.type === 'mcq_single' || currentQuestion.type === 'mcq_multiple') {
      return (
        <div className="qr-options">
          {currentQuestion.options?.map((option, index) => {
            const optionText = getOptionText(option);
            const cur = answers.get(currentQuestion._id);
            const selected = currentQuestion.type === 'mcq_single'
              ? cur === optionText
              : Array.isArray(cur) && cur.includes(optionText);
            return (
              <label key={index} className={`qr-opt${selected ? ' sel' : ''}`}>
                <input
                  type={currentQuestion.type === 'mcq_single' ? 'radio' : 'checkbox'}
                  name={`question-${currentQuestion._id}`}
                  value={optionText}
                  checked={selected}
                  onChange={(e) => {
                    if (currentQuestion.type === 'mcq_single') {
                      handleAnswerChange(currentQuestion._id, e.target.value);
                    } else {
                      const currentAnswers = Array.isArray(cur) ? cur : [];
                      if (e.target.checked) handleAnswerChange(currentQuestion._id, [...currentAnswers, optionText]);
                      else handleAnswerChange(currentQuestion._id, currentAnswers.filter((a: string) => a !== optionText));
                    }
                  }}
                />
                <span className="qr-opt-letter">{String.fromCharCode(65 + index)}</span>
                <span className="qr-opt-text">{optionText}</span>
              </label>
            );
          })}
        </div>
      );
    }
    if (currentQuestion.type === 'short_answer') {
      return (
        <textarea className="qr-textarea" rows={7} placeholder="Type your answer here…"
          value={answers.get(currentQuestion._id) || ''}
          onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)} />
      );
    }
    if (currentQuestion.type === 'coding') {
      return (
        <textarea className="qr-code" rows={12} spellCheck={false} placeholder="Write your code here…"
          value={answers.get(currentQuestion._id) || ''}
          onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value)} />
      );
    }
    return null;
  };

  return (
    <div ref={fullScreenRef} className={`qr-page${!quiz.canCopyPaste ? ' no-copy-paste' : ''}`}>
      {mediaError && <Alert type="warning" message={mediaError} onClose={() => setMediaError('')} />}

      {/* Tab Switch Warning Modal */}
      <Modal isOpen={showTabWarnModal} onClose={() => setShowTabWarnModal(false)} title="⚠️ Warning: Tab Switch Detected" maxWidth="500px">
        <div className="warning-content">
          <p>You've switched tabs {tabSwitchCount} time(s).{quiz?.warningCount ? ` You have ${Math.max(0, quiz.warningCount - tabSwitchCount)} warning(s) remaining before auto-submission.` : ' Repeated tab switching may result in termination of the quiz.'}</p>
          <p>Please focus on the quiz window to continue.</p>
          <Button onClick={() => setShowTabWarnModal(false)} className="btn-primary btn-block">Continue Quiz</Button>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal isOpen={showSubmitConfirmModal} onClose={() => setShowSubmitConfirmModal(false)} title="Submit Quiz?" maxWidth="500px">
        <div className="confirm-content">
          <p>You have answered {answeredCount} out of {questions.length} questions.{markedForReview.size ? ` ${markedForReview.size} marked for review.` : ''}</p>
          <p>Are you sure you want to submit the quiz? You cannot change your answers after submission.</p>
          {error && <p style={{ color: '#dc2626', fontSize: 13, fontWeight: 600 }}>{error}</p>}
          <div className="button-group">
            <Button onClick={() => setShowSubmitConfirmModal(false)} disabled={submitting}>Continue Quiz</Button>
            <Button onClick={handleSubmitQuiz} className="btn-danger" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Quiz'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Top bar ── */}
      <div className="qr-topbar">
        <div className="qr-brand">
          <img src="/assets/logo.png" alt="CodeBegun" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div className="qr-brand-name">CODEBEGUN</div>
            <div className="qr-brand-tag">Code Your Career</div>
          </div>
        </div>
        <div className="qr-brand-sep" />
        <div className="qr-title">
          <h1>{quiz.title}</h1>
          <div className="qr-meta">Question {currentQuestionIndex + 1} of {questions.length} • {nowStr}</div>
        </div>
        <div className="qr-top-right">
          <span className="qr-type-pill">{typeLabel(currentQuestion?.type)}</span>
          <div className={`qr-timer ${timeCritical ? 'crit' : timeWarning ? 'warn' : ''}`}>
            <div className="qr-timer-label">Time Left</div>
            <div className="qr-timer-val">🕐 {formatTime(timeLeft)}</div>
          </div>
        </div>
      </div>

      <div className="qr-body">
        {/* ── LEFT: Question Navigator ── */}
        <div className="qr-left">
          <div className="qr-card qr-navcard">
            <div className="qr-panel-title">🧭 Question Navigator</div>
            <div className="qr-legend">
              <div className="qr-legend-item"><span className="qr-dot answered" />Answered</div>
              <div className="qr-legend-item"><span className="qr-dot current" />Current</div>
              <div className="qr-legend-item"><span className="qr-dot unanswered" />Unanswered</div>
              <div className="qr-legend-item"><span className="qr-dot review" />Review Later</div>
            </div>
            <div className="qr-grid">
              {questions.map((q, index) => {
                const answered = answers.has(q._id);
                const review = markedForReview.has(q._id);
                const current = index === currentQuestionIndex;
                return (
                  <button key={q._id} onClick={() => handleJumpToQuestion(index)}
                    className={`qr-num${answered ? ' answered' : ''}${review ? ' review' : ''}${current ? ' current' : ''}`}>
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <button className="qr-reviewbtn" onClick={goToReview} disabled={markedForReview.size === 0}>
              🔖 Review Later ({markedForReview.size})
            </button>
          </div>

          <div className="qr-card qr-progresscard">
            <div className="qr-panel-title" style={{ marginBottom: 10 }}>Quiz Progress</div>
            <div className="qr-progress-top">
              <span className="qr-pct">{pctAnswered}% <small>Completed</small></span>
              <span className="qr-frac">{answeredCount} / {questions.length} Answered</span>
            </div>
            <div className="qr-progress-track"><div className="qr-progress-fill" style={{ width: `${pctAnswered}%` }} /></div>
          </div>
        </div>

        {/* ── CENTER: Question ── */}
        <div className="qr-center">
          {/* Mobile-only progress + meta chips */}
          <div className="qr-mprogress">
            <div className="qr-mprow"><span className="qr-qn">Question {currentQuestionIndex + 1} of {questions.length}</span><span>{pctAnswered}% Completed</span></div>
            <div className="qr-progress-track"><div className="qr-progress-fill" style={{ width: `${pctAnswered}%` }} /></div>
          </div>
          <div className="qr-mchips">
            <div className="qr-mchip">{typeLabel(currentQuestion?.type)}</div>
            <div className="qr-mchip">Marks<b>{(currentQuestion as any)?.marks ?? (currentQuestion as any)?.points ?? 1}</b></div>
            <div className="qr-mchip">Negative<b>{quiz.negativeMarking ? 'Yes' : 'No'}</b></div>
          </div>

          {error && <div style={{ marginBottom: 12 }}><Alert type="error" message={error} onClose={() => setError('')} /></div>}

          {currentQuestion && (
            <div className="qr-card qr-qcard">
              <div className="qr-qhead">
                <div className="qr-qnum">{currentQuestionIndex + 1}</div>
                <div className="qr-qtext">{currentQuestion.questionText}</div>
                <button className={`qr-mark${isReviewed ? ' on' : ''}`} onClick={() => toggleReview(currentQuestion._id)}>
                  {isReviewed ? '🔖 Marked' : '🔖 Mark for Review'}
                </button>
              </div>
              {renderOptions()}
            </div>
          )}

          <div className="qr-actions">
            <button className="qr-btn ghost" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>← Previous Question</button>
            <button className="qr-btn clear" onClick={() => currentQuestion && handleClearResponse(currentQuestion._id)}>🗑 Clear Response</button>
            {isLast ? (
              <button className="qr-btn submit" onClick={() => setShowSubmitConfirmModal(true)}>✅ Submit Quiz</button>
            ) : (
              <button className="qr-btn primary" onClick={handleNextQuestion}>Next Question →</button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Proctoring + Instructions ── */}
        <div className="qr-right">
          <div className="qr-card qr-proctor">
            <div className="qr-proctor-head">
              <span className="qr-p-title">🛡️ AI Proctoring</span>
              <span className="qr-badge-active">Active</span>
            </div>
            {quiz.enableCamera ? (
              <video ref={videoRef} autoPlay muted playsInline className="qr-proctor-video" />
            ) : (
              <div className="qr-proctor-noc">{quiz.enableMicrophone ? '🎙️ Microphone monitoring active' : 'Session is being monitored'}</div>
            )}
            <div className="qr-proctor-status">You are being monitored</div>
            <div className="qr-proctor-note">Please stay focused and avoid switching tabs or windows.</div>
          </div>

          <div className="qr-card qr-instr">
            <div className="qr-instr-title">ℹ️ Quiz Instructions</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">📋</span>{questions.length} Questions</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">🔘</span>{typeLabel(currentQuestion?.type)}</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">✏️</span>{quiz.totalMarks} Marks</div>
            <div className="qr-instr-item"><span className="qr-instr-ic">{quiz.negativeMarking ? '➖' : '✖️'}</span>{quiz.negativeMarking ? `Negative Marking (${quiz.negativeMarkingValue || 0})` : 'No Negative Marking'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizTakingPage;

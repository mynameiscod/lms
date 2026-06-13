import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import './TakeStructuredInterview.css';

/**
 * Student take flow for the structured AI interview.
 * One question at a time; answers (text / MCQ / code, plus optional audio/video)
 * are saved + silently AI-evaluated on the server. Grades are never shown here —
 * they're revealed on the report after submit.
 */
const TakeStructuredInterview: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || undefined;
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [overallRemaining, setOverallRemaining] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const questionStartRef = useRef<number>(Date.now());
  const submitOnceRef = useRef(false);

  // ── Media recording for audio/video answer modes ────────────────────
  const sectionsRef = attempt?.sectionAttempts || [];
  const liveSection = sectionsRef[currentSectionIdx];
  const liveQuestion = liveSection?.questionResponses?.[currentQuestionIdx];
  const qMode: string = liveQuestion?.answerMode || 'text';

  const [answerMediaMode, setAnswerMediaMode] = useState<'text' | 'video' | 'audio'>('text');
  const mediaRecorder = useMediaRecorder(answerMediaMode === 'audio' ? 'audio' : 'video', false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoPreviewRef.current && mediaRecorder.stream && answerMediaMode === 'video') {
      videoPreviewRef.current.srcObject = mediaRecorder.stream;
    }
  }, [mediaRecorder.stream, answerMediaMode]);

  // Sync media mode with the current question's answer mode
  useEffect(() => {
    if (qMode === 'video' || qMode === 'audio') {
      setAnswerMediaMode(qMode);
      mediaRecorder.requestPermission();
    } else {
      setAnswerMediaMode('text');
    }
    questionStartRef.current = Date.now();
  }, [currentSectionIdx, currentQuestionIdx, qMode]);

  // ── Start / resume attempt ──────────────────────────────────────────
  useEffect(() => {
    const start = async () => {
      try {
        setLoading(true);
        const res = await studentInterviewApi.startAttempt(templateId!, assignmentId);
        const a = res.data;
        setAttempt(a);
        const secs = a?.sectionAttempts || [];
        const activeSec = Math.max(0, secs.findIndex((s: any) => s.status !== 'completed'));
        setCurrentSectionIdx(activeSec >= 0 ? activeSec : 0);
        const qs = secs[activeSec]?.questionResponses || [];
        const activeQ = qs.findIndex((q: any) => q.status === 'not_started');
        setCurrentQuestionIdx(activeQ >= 0 ? activeQ : 0);
      } catch (err: any) {
        setError(err.message || 'Failed to start interview');
      } finally {
        setLoading(false);
      }
    };
    if (templateId) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, assignmentId]);

  // ── Overall timer (from template.totalDuration) ─────────────────────
  useEffect(() => {
    if (!attempt) return;
    const totalMin = attempt.templateId?.totalDuration || 0;
    if (!totalMin || !attempt.startedAt) { setOverallRemaining(0); return; }
    const tick = () => {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 1000;
      const remaining = Math.max(0, totalMin * 60 - elapsed);
      setOverallRemaining(remaining);
      if (remaining <= 0 && !submitOnceRef.current) {
        submitOnceRef.current = true;
        handleSubmitInterview();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.startedAt, attempt?.templateId?.totalDuration]);

  // ── Tab detection ───────────────────────────────────────────────────
  useEffect(() => {
    if (!attempt?.templateId?.blockMultipleTabs) return;
    const onVisibility = () => {
      if (document.hidden) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3 && !submitOnceRef.current) { submitOnceRef.current = true; handleSubmitInterview(); }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ── Derived current section/question ────────────────────────────────
  const sections = attempt?.sectionAttempts || [];
  const currentSection = sections[currentSectionIdx];
  const questions = currentSection?.questionResponses || [];
  const currentQuestion = questions[currentQuestionIdx];
  const navMode = attempt?.templateId?.sectionNavigationMode || 'sequential';

  // ── Load existing answer when navigating ────────────────────────────
  useEffect(() => {
    if (!currentQuestion) { setAnswer(''); return; }
    setAnswer(
      currentQuestion.answerText ||
      currentQuestion.selectedMCQOption ||
      currentQuestion.answerCode ||
      ''
    );
  }, [currentSectionIdx, currentQuestionIdx, attempt]);

  // ── Save answer ─────────────────────────────────────────────────────
  const handleSaveAnswer = useCallback(async () => {
    if (!attempt || !currentQuestion) return;
    try {
      setSaving(true);
      const responseTimeSeconds = Math.round((Date.now() - questionStartRef.current) / 1000);
      const payload: any = { sectionIndex: currentSectionIdx, questionIndex: currentQuestionIdx, responseTimeSeconds };
      if (qMode === 'mcq') payload.selectedMCQOption = answer;
      else if (qMode === 'code') payload.answerCode = answer;
      else payload.answerText = answer;

      const res = await studentInterviewApi.saveAnswer(attempt._id, payload);
      setAttempt(res.data);

      if (mediaRecorder.recordedBlob) {
        try {
          await studentInterviewApi.uploadAnswerRecording(
            attempt._id, mediaRecorder.recordedBlob, currentSectionIdx, currentQuestionIdx, responseTimeSeconds
          );
        } catch (uploadErr) {
          console.error('Recording upload failed (non-blocking):', uploadErr);
        }
      }
    } catch (err: any) {
      console.error('Save failed:', err.message);
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, answer, currentSectionIdx, currentQuestionIdx, qMode, mediaRecorder.recordedBlob]);

  // ── Skip ────────────────────────────────────────────────────────────
  const handleSkip = async () => {
    if (!attempt || !currentQuestion) return;
    try {
      const res = await studentInterviewApi.skipQuestion(attempt._id, currentSectionIdx, currentQuestionIdx);
      setAttempt(res.data);
      goNextQuestion();
    } catch (err: any) { console.error(err); }
  };

  // ── Navigation ──────────────────────────────────────────────────────
  const goNextQuestion = () => {
    if (currentQuestionIdx < questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      mediaRecorder.reset();
    }
  };
  const goPrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
      mediaRecorder.reset();
    }
  };
  const handleSaveAndNext = async () => { await handleSaveAnswer(); goNextQuestion(); };

  // ── Complete section ────────────────────────────────────────────────
  const handleCompleteSection = async () => {
    if (!attempt) return;
    try {
      const res = await studentInterviewApi.completeSection(attempt._id, currentSectionIdx);
      setAttempt(res.data);
      if (currentSectionIdx < sections.length - 1) {
        setCurrentSectionIdx(prev => prev + 1);
        setCurrentQuestionIdx(0);
      } else {
        setShowConfirmSubmit(true);
      }
    } catch (err: any) { alert(err.message); }
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmitInterview = async () => {
    if (!attempt) return;
    try {
      setSubmitting(true);
      await studentInterviewApi.submitAttempt(attempt._id);
      navigate(`/student/interviews/report/${attempt._id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) return <div className="tsi-loading"><div className="tsi-spinner" />Starting interview...</div>;
  if (error) return <div className="tsi-error">{error}<br /><button onClick={() => navigate('/student/interviews')}>Back to Hub</button></div>;
  if (!attempt) return <div className="tsi-error">No attempt data.</div>;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const isAnswered = (q: any) => q.status === 'answered';
  const isSkipped = (q: any) => q.status === 'skipped';
  const answeredCount = questions.filter(isAnswered).length;
  const skippedCount = questions.filter(isSkipped).length;

  return (
    <div className="tsi-container">
      {/* Top Bar */}
      <div className="tsi-topbar">
        <div className="tsi-topbar-left">
          <h2>{attempt.templateId?.title || 'Interview'}</h2>
          <span className="tsi-section-label">
            Section {currentSectionIdx + 1}/{sections.length}: {currentSection?.sectionTitle}
          </span>
        </div>
        <div className="tsi-topbar-right">
          {overallRemaining > 0 && (
            <span className={`tsi-timer ${overallRemaining < 60 ? 'tsi-timer-danger' : ''}`}>
              ⏱ {formatTime(overallRemaining)}
            </span>
          )}
          {tabWarnings > 0 && <span className="tsi-tab-warning">⚠ Tab warnings: {tabWarnings}/3</span>}
          <button className="tsi-btn-submit" onClick={() => setShowConfirmSubmit(true)}>Submit Interview</button>
        </div>
      </div>

      <div className="tsi-body">
        {/* Sidebar */}
        <div className="tsi-sidebar">
          <h4>Sections</h4>
          {sections.map((sec: any, i: number) => (
            <button
              key={i}
              className={`tsi-sidebar-sec ${i === currentSectionIdx ? 'active' : ''} ${sec.status === 'completed' ? 'completed' : ''}`}
              onClick={() => {
                if (navMode !== 'sequential' || i <= currentSectionIdx) {
                  setCurrentSectionIdx(i);
                  setCurrentQuestionIdx(0);
                }
              }}
              disabled={navMode === 'sequential' && i > currentSectionIdx}
            >
              <span>{sec.sectionTitle || `Section ${i + 1}`}</span>
              <span className="tsi-sidebar-type">{sec.sectionType}</span>
            </button>
          ))}

          <h4>Questions</h4>
          <div className="tsi-question-map">
            {questions.map((q: any, i: number) => (
              <button
                key={i}
                className={`tsi-qmap-btn ${i === currentQuestionIdx ? 'current' : ''} ${isAnswered(q) ? 'answered' : ''} ${isSkipped(q) ? 'skipped' : ''}`}
                onClick={() => setCurrentQuestionIdx(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <div className="tsi-sidebar-stats">
            <span>✅ {answeredCount} answered</span>
            <span>⏭ {skippedCount} skipped</span>
            <span>📝 {questions.length - answeredCount - skippedCount} remaining</span>
          </div>
        </div>

        {/* Main question area */}
        <div className="tsi-main">
          {currentQuestion ? (
            <>
              <div className="tsi-question-header">
                <span className="tsi-q-number">Question {currentQuestionIdx + 1} of {questions.length}</span>
                {currentQuestion.difficulty && <span className="tsi-q-diff">{currentQuestion.difficulty}</span>}
                {currentQuestion.topic && <span className="tsi-q-topic">{currentQuestion.topic}</span>}
              </div>

              <div className="tsi-question-text">
                {currentQuestion.questionText || 'Loading question...'}
              </div>

              {currentQuestion.questionHint && (
                <p className="tsi-hint">💡 Hint: {currentQuestion.questionHint}</p>
              )}

              {/* Answer Area */}
              <div className="tsi-answer-area">
                {/* Media mode (audio/video questions) */}
                {(answerMediaMode === 'video' || answerMediaMode === 'audio') && (
                  <div className="tsi-media-controls" style={{ marginBottom: 12 }}>
                    {answerMediaMode === 'video' && (
                      <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 8, minHeight: 200 }}>
                        {mediaRecorder.previewUrl ? (
                          <video src={mediaRecorder.previewUrl} controls style={{ width: '100%', maxHeight: 280, display: 'block' }} />
                        ) : (
                          <video ref={videoPreviewRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 280, transform: 'scaleX(-1)', display: 'block' }} />
                        )}
                        {mediaRecorder.isRecording && (
                          <div className="tsi-rec-indicator"><span className="tsi-rec-dot" /> REC {formatTime(mediaRecorder.duration)}</div>
                        )}
                      </div>
                    )}
                    {answerMediaMode === 'audio' && (
                      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 24, textAlign: 'center', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {mediaRecorder.previewUrl ? (
                          <audio src={mediaRecorder.previewUrl} controls style={{ width: '100%' }} />
                        ) : (
                          <>
                            <div style={{ fontSize: '3rem' }}>{mediaRecorder.isRecording ? '🔴' : '🎤'}</div>
                            {mediaRecorder.isRecording && <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 8 }}>Recording... {formatTime(mediaRecorder.duration)}</div>}
                          </>
                        )}
                      </div>
                    )}
                    {mediaRecorder.error && (
                      <div style={{ color: '#b45309', background: '#fef3c7', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginBottom: 8 }}>
                        {mediaRecorder.error}
                        <button onClick={() => mediaRecorder.requestPermission()} style={{ marginLeft: 8, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
                      </div>
                    )}
                    {mediaRecorder.hasPermission && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        {!mediaRecorder.isRecording && !mediaRecorder.recordedBlob && (
                          <button className="tsi-btn-next" onClick={mediaRecorder.startRecording} style={{ background: '#ef4444' }}>⏺ Start Recording</button>
                        )}
                        {mediaRecorder.isRecording && (
                          <button className="tsi-btn-skip" onClick={mediaRecorder.stopRecording}>⏹ Stop Recording</button>
                        )}
                        {mediaRecorder.recordedBlob && !mediaRecorder.isRecording && (
                          <>
                            <button className="tsi-btn-nav" onClick={mediaRecorder.reset}>🔄 Re-record</button>
                            <span style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>✅ {formatTime(mediaRecorder.duration)} recorded</span>
                          </>
                        )}
                      </div>
                    )}
                    <textarea
                      className="tsi-text-answer"
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      placeholder="Optional text notes..."
                      rows={3}
                      style={{ marginTop: 8 }}
                    />
                  </div>
                )}

                {answerMediaMode === 'text' && (
                  <>
                    {qMode === 'mcq' ? (
                      <div className="tsi-mcq-options">
                        {(currentQuestion.mcqOptions || []).map((opt: any, i: number) => (
                          <label key={i} className={`tsi-mcq-option ${answer === opt.label ? 'selected' : ''}`}>
                            <input
                              type="radio"
                              name="mcq"
                              value={opt.label}
                              checked={answer === opt.label}
                              onChange={e => setAnswer(e.target.value)}
                            />
                            <span><strong>{opt.label}.</strong> {opt.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : qMode === 'code' ? (
                      <textarea
                        className="tsi-code-editor"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder={currentQuestion.codeStarterTemplate || 'Write your code here...'}
                        rows={12}
                        spellCheck={false}
                      />
                    ) : (
                      <textarea
                        className="tsi-text-answer"
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={8}
                      />
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="tsi-actions">
                <div className="tsi-actions-left">
                  <button className="tsi-btn-nav" onClick={goPrevQuestion} disabled={currentQuestionIdx === 0}>← Previous</button>
                </div>
                <div className="tsi-actions-right">
                  <button className="tsi-btn-skip" onClick={handleSkip}>Skip</button>
                  {currentQuestionIdx < questions.length - 1 ? (
                    <button className="tsi-btn-next" onClick={handleSaveAndNext} disabled={saving}>
                      {saving ? 'Saving...' : 'Save & Next →'}
                    </button>
                  ) : (
                    <button className="tsi-btn-complete-section" onClick={async () => { await handleSaveAnswer(); handleCompleteSection(); }} disabled={saving}>
                      {currentSectionIdx < sections.length - 1 ? 'Complete Section →' : 'Finish & Review'}
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="tsi-section-complete">
              <h3>Section Complete!</h3>
              <p>All questions in this section have been answered.</p>
              {currentSectionIdx < sections.length - 1 ? (
                <button className="tsi-btn-next" onClick={() => { setCurrentSectionIdx(prev => prev + 1); setCurrentQuestionIdx(0); }}>Next Section →</button>
              ) : (
                <button className="tsi-btn-submit" onClick={() => setShowConfirmSubmit(true)}>Submit Interview</button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="tsi-modal-overlay" onClick={() => setShowConfirmSubmit(false)}>
          <div className="tsi-modal" onClick={e => e.stopPropagation()}>
            <h3>Submit Interview?</h3>
            <p>You have answered <strong>{answeredCount}</strong> out of <strong>{questions.length}</strong> questions in this section.</p>
            <p>Once submitted, our AI will evaluate your answers and generate your feedback report.</p>
            <div className="tsi-modal-actions">
              <button onClick={() => setShowConfirmSubmit(false)}>Continue Interview</button>
              <button className="tsi-btn-submit" onClick={handleSubmitInterview} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TakeStructuredInterview;

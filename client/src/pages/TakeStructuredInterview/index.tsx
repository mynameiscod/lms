import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import { useMediaRecorder } from '../../hooks/useMediaRecorder';
import './TakeStructuredInterview.css';

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
  const [sectionTimer, setSectionTimer] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(0);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Media Recording for audio/video answer modes ────────────────────
  const [answerMediaMode, setAnswerMediaMode] = useState<'text' | 'video' | 'audio'>('text');
  const mediaRecorder = useMediaRecorder(
    answerMediaMode === 'audio' ? 'audio' : 'video',
    false
  );
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Attach live stream to video preview
  useEffect(() => {
    if (videoPreviewRef.current && mediaRecorder.stream && answerMediaMode === 'video') {
      videoPreviewRef.current.srcObject = mediaRecorder.stream;
    }
  }, [mediaRecorder.stream, answerMediaMode]);

  // Determine effective answer mode for current question
  useEffect(() => {
    if (!attempt) return;
    const secs = attempt?.sectionAttempts || [];
    const sec = secs[currentSectionIdx];
    const qs = sec?.questions || [];
    const q = qs[currentQuestionIdx];
    if (!sec && !q) return;
    const mode = sec?.answerMode || q?.questionRef?.answerMode || 'text';
    if (mode === 'video' || mode === 'audio') {
      setAnswerMediaMode(mode);
      mediaRecorder.requestPermission();
    } else {
      setAnswerMediaMode('text');
    }
  }, [currentSectionIdx, currentQuestionIdx, attempt]);

  // ── Start / Resume attempt ──────────────────────────────────────────

  useEffect(() => {
    const startAttempt = async () => {
      try {
        setLoading(true);
        const res = await studentInterviewApi.startAttempt(templateId!, assignmentId);
        setAttempt(res.data);
        // Restore position from attempt
        const sections = res.data?.sectionAttempts || [];
        const activeSec = sections.findIndex((s: any) => s.status !== 'completed');
        if (activeSec >= 0) {
          setCurrentSectionIdx(activeSec);
          const activeQ = (sections[activeSec]?.questions || []).findIndex((q: any) => !q.answeredAt && !q.skippedAt);
          setCurrentQuestionIdx(Math.max(0, activeQ));
        }
      } catch (err: any) {
        setError(err.message || 'Failed to start interview');
      } finally {
        setLoading(false);
      }
    };
    if (templateId) startAttempt();
  }, [templateId, assignmentId]);

  // ── Tab detection ───────────────────────────────────────────────────

  useEffect(() => {
    if (!attempt?.blockMultipleTabs) return;
    const handleVisibility = () => {
      if (document.hidden) {
        setTabWarnings(prev => {
          const next = prev + 1;
          if (next >= 3) {
            handleSubmitInterview();
          }
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [attempt]);

  // ── Timers ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!attempt) return;
    const section = attempt.sectionAttempts?.[currentSectionIdx];
    if (section?.sectionTimeLimit > 0) {
      const elapsed = section.startedAt ? (Date.now() - new Date(section.startedAt).getTime()) / 1000 : 0;
      setSectionTimer(Math.max(0, section.sectionTimeLimit * 60 - elapsed));
    } else {
      setSectionTimer(0);
    }
  }, [attempt, currentSectionIdx]);

  useEffect(() => {
    if (sectionTimer <= 0) return;
    timerRef.current = setInterval(() => {
      setSectionTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleCompleteSection();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [sectionTimer > 0]);

  // ── Current section/question ────────────────────────────────────────

  const sections = attempt?.sectionAttempts || [];
  const currentSection = sections[currentSectionIdx];
  const questions = currentSection?.questions || [];
  const currentQuestion = questions[currentQuestionIdx];

  // ── Load existing answer ────────────────────────────────────────────

  useEffect(() => {
    if (currentQuestion?.textAnswer) {
      setAnswer(currentQuestion.textAnswer);
    } else if (currentQuestion?.selectedMcqOption) {
      setAnswer(currentQuestion.selectedMcqOption);
    } else if (currentQuestion?.codeAnswer) {
      setAnswer(currentQuestion.codeAnswer);
    } else {
      setAnswer('');
    }
  }, [currentSectionIdx, currentQuestionIdx, attempt]);

  // ── Save answer ─────────────────────────────────────────────────────

  const handleSaveAnswer = useCallback(async () => {
    if (!attempt || !currentQuestion) return;
    try {
      setSaving(true);
      const payload: any = { sectionIndex: currentSectionIdx, questionIndex: currentQuestionIdx };
      if (currentSection?.answerMode === 'mcq' || currentQuestion.questionRef?.answerMode === 'mcq') {
        payload.selectedMcqOption = answer;
      } else if (currentSection?.answerMode === 'code' || currentQuestion.questionRef?.answerMode === 'code') {
        payload.codeAnswer = answer;
      } else {
        payload.textAnswer = answer;
      }
      const res = await studentInterviewApi.saveAnswer(attempt._id, payload);
      setAttempt(res.data);

      // Upload recorded media if present
      if (mediaRecorder.recordedBlob) {
        try {
          await studentInterviewApi.uploadAnswerRecording(
            attempt._id,
            mediaRecorder.recordedBlob,
            currentSectionIdx,
            currentQuestionIdx
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
  }, [attempt, answer, currentSectionIdx, currentQuestionIdx, mediaRecorder.recordedBlob]);

  // ── Skip question ───────────────────────────────────────────────────

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

  const handleSaveAndNext = async () => {
    await handleSaveAnswer();
    goNextQuestion();
  };

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

  // ── Submit interview ────────────────────────────────────────────────

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

  const answeredCount = questions.filter((q: any) => q.answeredAt).length;
  const skippedCount = questions.filter((q: any) => q.skippedAt && !q.answeredAt).length;

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
          {sectionTimer > 0 && (
            <span className={`tsi-timer ${sectionTimer < 60 ? 'tsi-timer-danger' : ''}`}>
              ⏱ {formatTime(sectionTimer)}
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
                if (attempt.sectionNavigationMode !== 'sequential' || i <= currentSectionIdx) {
                  setCurrentSectionIdx(i);
                  setCurrentQuestionIdx(0);
                }
              }}
              disabled={attempt.sectionNavigationMode === 'sequential' && i > currentSectionIdx}
            >
              <span>{sec.sectionTitle || `Section ${i + 1}`}</span>
              <span className="tsi-sidebar-type">{sec.category}</span>
            </button>
          ))}

          <h4>Questions</h4>
          <div className="tsi-question-map">
            {questions.map((q: any, i: number) => (
              <button
                key={i}
                className={`tsi-qmap-btn ${i === currentQuestionIdx ? 'current' : ''} ${q.answeredAt ? 'answered' : ''} ${q.skippedAt && !q.answeredAt ? 'skipped' : ''}`}
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
                {currentQuestion.questionRef?.difficulty && (
                  <span className="tsi-q-diff">{currentQuestion.questionRef.difficulty}</span>
                )}
                {currentQuestion.questionRef?.topic && (
                  <span className="tsi-q-topic">{currentQuestion.questionRef.topic}</span>
                )}
              </div>

              <div className="tsi-question-text">
                {currentQuestion.questionRef?.questionText || currentQuestion.questionText || 'Loading question...'}
              </div>

              {currentQuestion.questionRef?.questionHint && (
                <p className="tsi-hint">💡 Hint: {currentQuestion.questionRef.questionHint}</p>
              )}

              {/* Answer Area */}
              <div className="tsi-answer-area">
                {/* Media mode selector for video/audio capable questions */}
                {(answerMediaMode === 'video' || answerMediaMode === 'audio') && (
                  <div className="tsi-media-controls" style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        className={`tsi-btn-nav ${answerMediaMode === 'video' ? 'active' : ''}`}
                        onClick={() => { setAnswerMediaMode('video'); mediaRecorder.reset(); mediaRecorder.requestPermission(); }}
                        style={{ background: answerMediaMode === 'video' ? '#3b82f6' : undefined, color: answerMediaMode === 'video' ? '#fff' : undefined }}
                      >🎥 Video</button>
                      <button
                        className={`tsi-btn-nav ${answerMediaMode === 'audio' ? 'active' : ''}`}
                        onClick={() => { setAnswerMediaMode('audio'); mediaRecorder.reset(); mediaRecorder.requestPermission(); }}
                        style={{ background: answerMediaMode === 'audio' ? '#3b82f6' : undefined, color: answerMediaMode === 'audio' ? '#fff' : undefined }}
                      >🎤 Audio</button>
                    </div>

                    {/* Video preview */}
                    {answerMediaMode === 'video' && (
                      <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 8, minHeight: 200 }}>
                        {mediaRecorder.previewUrl ? (
                          <video src={mediaRecorder.previewUrl} controls style={{ width: '100%', maxHeight: 280, display: 'block' }} />
                        ) : (
                          <video ref={videoPreviewRef} autoPlay muted playsInline style={{ width: '100%', maxHeight: 280, transform: 'scaleX(-1)', display: 'block' }} />
                        )}
                        {mediaRecorder.isRecording && (
                          <div className="tsi-rec-indicator">
                            <span className="tsi-rec-dot" /> REC {formatTime(mediaRecorder.duration)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Audio preview */}
                    {answerMediaMode === 'audio' && (
                      <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 24, textAlign: 'center', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {mediaRecorder.previewUrl ? (
                          <audio src={mediaRecorder.previewUrl} controls style={{ width: '100%' }} />
                        ) : (
                          <>
                            <div style={{ fontSize: '3rem' }}>{mediaRecorder.isRecording ? '🔴' : '🎤'}</div>
                            {mediaRecorder.isRecording && (
                              <div style={{ color: '#ef4444', fontWeight: 600, marginTop: 8 }}>Recording... {formatTime(mediaRecorder.duration)}</div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Recording controls */}
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

                    {/* Optional text notes */}
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
                    {(currentSection?.answerMode === 'mcq' || currentQuestion.questionRef?.answerMode === 'mcq') ? (
                  <div className="tsi-mcq-options">
                    {(currentQuestion.questionRef?.mcqOptions || []).map((opt: any, i: number) => (
                      <label key={i} className={`tsi-mcq-option ${answer === opt.optionId ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="mcq"
                          value={opt.optionId}
                          checked={answer === opt.optionId}
                          onChange={e => setAnswer(e.target.value)}
                        />
                        <span>{opt.optionText}</span>
                      </label>
                    ))}
                  </div>
                ) : (currentSection?.answerMode === 'code' || currentQuestion.questionRef?.answerMode === 'code') ? (
                  <textarea
                    className="tsi-code-editor"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    placeholder="Write your code here..."
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
                  <button className="tsi-btn-nav" onClick={goPrevQuestion} disabled={currentQuestionIdx === 0}>
                    ← Previous
                  </button>
                </div>
                <div className="tsi-actions-right">
                  <button className="tsi-btn-skip" onClick={handleSkip}>Skip</button>
                  {currentQuestionIdx < questions.length - 1 ? (
                    <button className="tsi-btn-next" onClick={handleSaveAndNext} disabled={saving}>
                      {saving ? 'Saving...' : 'Save & Next →'}
                    </button>
                  ) : (
                    <button className="tsi-btn-complete-section" onClick={async () => { await handleSaveAnswer(); handleCompleteSection(); }}>
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
                <button className="tsi-btn-next" onClick={() => { setCurrentSectionIdx(prev => prev + 1); setCurrentQuestionIdx(0); }}>
                  Next Section →
                </button>
              ) : (
                <button className="tsi-btn-submit" onClick={() => setShowConfirmSubmit(true)}>
                  Submit Interview
                </button>
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
            <p>Once submitted, you cannot go back to edit your answers.</p>
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

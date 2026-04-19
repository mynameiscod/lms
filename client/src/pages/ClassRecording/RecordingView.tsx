import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { Spinner } from '../../components/common';
import './ClassRecording.css';

const statusLabels: Record<string, { label: string; color: string; icon: string }> = {
  uploading: { label: 'Uploading', color: '#f59e0b', icon: 'fa-cloud-arrow-up' },
  uploaded: { label: 'Queued', color: '#6366f1', icon: 'fa-clock' },
  transcribing: { label: 'Transcribing audio...', color: '#359aad', icon: 'fa-microphone' },
  summarizing: { label: 'Generating summary...', color: '#8b5cf6', icon: 'fa-brain' },
  generating_quiz: { label: 'Generating quiz...', color: '#ec4899', icon: 'fa-clipboard-question' },
  generating_assignment: { label: 'Generating assignment...', color: '#f97316', icon: 'fa-file-code' },
  completed: { label: 'Processing Complete', color: '#10b981', icon: 'fa-circle-check' },
  failed: { label: 'Processing Failed', color: '#ef4444', icon: 'fa-circle-xmark' }
};

const RecordingView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isInstructor = ['SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR'].includes(user?.role || '');

  const [recording, setRecording] = useState<ClassRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript' | 'quiz' | 'assignment'>('summary');
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [quizSaved, setQuizSaved] = useState(false);
  const [assignmentSaved, setAssignmentSaved] = useState(false);

  // Editable quiz questions
  const [editableQuestions, setEditableQuestions] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);

  const fetchRecording = useCallback(async () => {
    if (!id) return;
    try {
      const res = await classRecordingApi.getById(id);
      setRecording(res.data);
      if (res.data.generatedQuiz?.questions) {
        setEditableQuestions(res.data.generatedQuiz.questions);
      }
      if (res.data.generatedQuiz?.savedQuizId) setQuizSaved(true);
      if (res.data.generatedAssignment?.savedAssignmentId) setAssignmentSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRecording(); }, [fetchRecording]);

  // Poll while processing
  useEffect(() => {
    if (!recording || ['completed', 'failed'].includes(recording.status)) return;
    const interval = setInterval(async () => {
      try {
        const res = await classRecordingApi.getStatus(recording._id);
        setRecording(prev => prev ? { ...prev, ...res.data } as ClassRecording : null);
        if (['completed', 'failed'].includes(res.data.status)) {
          clearInterval(interval);
          fetchRecording(); // Reload full data
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [recording?.status, recording?._id, fetchRecording]);

  const handleSaveQuiz = async () => {
    if (!recording) return;
    setSavingQuiz(true);
    try {
      await classRecordingApi.saveQuiz(recording._id, { questions: editableQuestions });
      setQuizSaved(true);
      alert('Quiz created successfully! You can find it in Quiz Management.');
    } catch (err: any) {
      alert(err.message || 'Failed to save quiz');
    } finally {
      setSavingQuiz(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!recording) return;
    setSavingAssignment(true);
    try {
      await classRecordingApi.saveAssignment(recording._id);
      setAssignmentSaved(true);
      alert('Assignment created successfully! You can find it in Assignment Management.');
    } catch (err: any) {
      alert(err.message || 'Failed to save assignment');
    } finally {
      setSavingAssignment(false);
    }
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    setEditableQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, field: string, value: any) => {
    setEditableQuestions(prev => prev.map((q, qi) => {
      if (qi !== qIdx) return q;
      const opts = q.options.map((o: any, oi: number) => {
        if (oi !== oIdx) return field === 'isCorrect' && value ? { ...o, isCorrect: false } : o;
        return { ...o, [field]: value };
      });
      return { ...q, options: opts };
    }));
  };

  if (loading) return <div className="cr-page"><div className="cr-loading"><Spinner /></div></div>;
  if (!recording) return <div className="cr-page"><div className="cr-empty"><h3>Recording not found</h3></div></div>;

  const st = statusLabels[recording.status] || statusLabels.uploaded;
  const videoSrc = recording.videoUrl?.startsWith('uploads/')
    ? `/${recording.videoUrl}`
    : recording.videoUrl;

  return (
    <div className="cr-page">
      {/* Header */}
      <div className="cr-view-header">
        <button className="cr-back-btn" onClick={() => navigate(isInstructor ? '/admin/class-recordings' : '/class-recordings')}>
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>
        <div className="cr-view-title">
          <h1>{recording.title}</h1>
          <p>
            {typeof recording.courseId === 'object' ? recording.courseId?.title : ''}
            {recording.subjectId && typeof recording.subjectId === 'object' ? ` • ${recording.subjectId.name}` : ''}
            {recording.chapterId && typeof recording.chapterId === 'object' ? ` • ${recording.chapterId.title}` : ''}
            <span className="cr-view-date"> • {new Date(recording.recordedAt).toLocaleDateString()}</span>
          </p>
        </div>
        {isInstructor && recording.status === 'completed' && (
          <div className="cr-view-actions">
            <button
              className={`cr-btn-outline ${recording.isPublished ? 'cr-active' : ''}`}
              onClick={async () => {
                const res = await classRecordingApi.togglePublish(recording._id);
                setRecording(prev => prev ? { ...prev, isPublished: res.data.isPublished } : null);
              }}
            >
              <i className={`fa-solid ${recording.isPublished ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              {recording.isPublished ? 'Published' : 'Publish'}
            </button>
          </div>
        )}
      </div>

      {/* Video Player */}
      <div className="cr-video-section">
        <video controls className="cr-video-player" src={videoSrc} preload="metadata">
          Your browser does not support video playback.
        </video>
      </div>

      {/* Processing Status */}
      {!['completed', 'failed'].includes(recording.status) && (
        <div className="cr-processing-card">
          <div className="cr-processing-header">
            <div className="cr-processing-spinner"></div>
            <div>
              <h3 style={{ color: st.color }}><i className={`fa-solid ${st.icon}`}></i> {st.label}</h3>
              <p>AI is processing your recording. This may take a few minutes.</p>
            </div>
          </div>
          <div className="cr-processing-bar">
            <div className="cr-processing-fill" style={{ width: `${recording.processingProgress}%`, background: st.color }}></div>
          </div>
          <div className="cr-processing-steps">
            {['transcribing', 'summarizing', 'generating_quiz', 'generating_assignment'].map((step, i) => {
              const stepStates = ['transcribing', 'summarizing', 'generating_quiz', 'generating_assignment'];
              const currentIdx = stepStates.indexOf(recording.status);
              const done = i < currentIdx || recording.status === 'completed';
              const active = i === currentIdx;
              return (
                <div key={step} className={`cr-step ${done ? 'cr-step-done' : active ? 'cr-step-active' : ''}`}>
                  <div className="cr-step-icon">
                    {done ? <i className="fa-solid fa-check"></i> : active ? <div className="cr-mini-spinner"></div> : <span>{i + 1}</span>}
                  </div>
                  <span>{statusLabels[step]?.label.replace('...', '')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed */}
      {recording.status === 'failed' && (
        <div className="cr-alert cr-alert-error">
          <i className="fa-solid fa-circle-xmark"></i>
          <div>
            <strong>Processing Failed</strong>
            <p>{recording.processingError || 'An error occurred during processing.'}</p>
          </div>
          {isInstructor && (
            <button className="cr-retry-btn" onClick={() => classRecordingApi.reprocess(recording._id).then(fetchRecording)}>
              <i className="fa-solid fa-rotate-right"></i> Retry
            </button>
          )}
        </div>
      )}

      {/* Content tabs (shown when completed) */}
      {recording.status === 'completed' && (
        <div className="cr-content-section">
          <div className="cr-tabs">
            {['summary', 'transcript', ...(isInstructor ? ['quiz', 'assignment'] as const : [])].map(tab => (
              <button
                key={tab}
                className={`cr-tab ${activeTab === tab ? 'cr-tab-active' : ''}`}
                onClick={() => setActiveTab(tab as any)}
              >
                <i className={`fa-solid ${tab === 'summary' ? 'fa-brain' : tab === 'transcript' ? 'fa-file-lines' : tab === 'quiz' ? 'fa-clipboard-question' : 'fa-file-code'}`}></i>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="cr-tab-content">
            {/* Summary Tab */}
            {activeTab === 'summary' && recording.summary && (
              <div className="cr-summary">
                <div className="cr-summary-overview">
                  <h3><i className="fa-solid fa-align-left"></i> Overview</h3>
                  <p>{recording.summary.overview}</p>
                </div>

                {recording.summary.keyPoints?.length > 0 && (
                  <div className="cr-summary-section">
                    <h3><i className="fa-solid fa-list-check"></i> Key Points</h3>
                    <ul className="cr-key-points">
                      {recording.summary.keyPoints.map((point, i) => (
                        <li key={i}><i className="fa-solid fa-check-circle"></i> {point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recording.summary.topics?.length > 0 && (
                  <div className="cr-summary-section">
                    <h3><i className="fa-solid fa-tags"></i> Topics Covered</h3>
                    <div className="cr-topics-list">
                      {recording.summary.topics.map((topic, i) => (
                        <span key={i} className="cr-topic-tag">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Transcript Tab */}
            {activeTab === 'transcript' && (
              <div className="cr-transcript">
                {recording.transcript ? (
                  <pre className="cr-transcript-text">{recording.transcript}</pre>
                ) : (
                  <p className="cr-empty-tab">No transcript available</p>
                )}
              </div>
            )}

            {/* Quiz Tab (instructor only) */}
            {activeTab === 'quiz' && isInstructor && (
              <div className="cr-quiz-section">
                <div className="cr-quiz-header">
                  <h3><i className="fa-solid fa-clipboard-question"></i> Generated Quiz ({editableQuestions.length} questions)</h3>
                  <div className="cr-quiz-actions">
                    {!quizSaved && (
                      <>
                        <button className="cr-btn-outline" onClick={() => setEditMode(!editMode)}>
                          <i className={`fa-solid ${editMode ? 'fa-eye' : 'fa-pen'}`}></i>
                          {editMode ? 'Preview' : 'Edit'}
                        </button>
                        <button className="cr-btn-primary" onClick={handleSaveQuiz} disabled={savingQuiz}>
                          {savingQuiz ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Create Quiz</>}
                        </button>
                      </>
                    )}
                    {quizSaved && (
                      <span className="cr-saved-badge"><i className="fa-solid fa-check-circle"></i> Quiz Created</span>
                    )}
                  </div>
                </div>

                <div className="cr-questions-list">
                  {editableQuestions.map((q, qi) => (
                    <div key={qi} className="cr-question-card">
                      <div className="cr-question-num">Q{qi + 1}</div>
                      <div className="cr-question-body">
                        {editMode ? (
                          <textarea
                            className="cr-question-input"
                            value={q.question}
                            onChange={(e) => updateQuestion(qi, 'question', e.target.value)}
                          />
                        ) : (
                          <p className="cr-question-text">{q.question}</p>
                        )}

                        <div className="cr-options-list">
                          {q.options?.map((opt: any, oi: number) => (
                            <div key={oi} className={`cr-option ${opt.isCorrect ? 'cr-option-correct' : ''}`}>
                              {editMode ? (
                                <>
                                  <input
                                    type="radio"
                                    name={`q-${qi}`}
                                    checked={opt.isCorrect}
                                    onChange={() => updateOption(qi, oi, 'isCorrect', true)}
                                  />
                                  <input
                                    type="text"
                                    className="cr-option-input"
                                    value={opt.text}
                                    onChange={(e) => updateOption(qi, oi, 'text', e.target.value)}
                                  />
                                </>
                              ) : (
                                <>
                                  <span className={`cr-option-marker ${opt.isCorrect ? 'cr-correct' : ''}`}>
                                    {String.fromCharCode(65 + oi)}
                                  </span>
                                  <span>{opt.text}</span>
                                  {opt.isCorrect && <i className="fa-solid fa-check cr-correct-icon"></i>}
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {q.explanation && !editMode && (
                          <div className="cr-explanation">
                            <i className="fa-solid fa-lightbulb"></i> {q.explanation}
                          </div>
                        )}

                        <span className={`cr-difficulty cr-diff-${q.difficulty}`}>{q.difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Tab (instructor only) */}
            {activeTab === 'assignment' && isInstructor && recording.generatedAssignment && (
              <div className="cr-assignment-section">
                <div className="cr-assignment-header">
                  <h3><i className="fa-solid fa-file-code"></i> Generated Assignment</h3>
                  {!assignmentSaved ? (
                    <button className="cr-btn-primary" onClick={handleSaveAssignment} disabled={savingAssignment}>
                      {savingAssignment ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Create Assignment</>}
                    </button>
                  ) : (
                    <span className="cr-saved-badge"><i className="fa-solid fa-check-circle"></i> Assignment Created</span>
                  )}
                </div>

                <div className="cr-assignment-content">
                  <h4>{recording.generatedAssignment.title}</h4>
                  <div className="cr-assignment-meta">
                    <span className={`cr-difficulty cr-diff-${recording.generatedAssignment.difficulty}`}>
                      {recording.generatedAssignment.difficulty}
                    </span>
                    <span className="cr-assignment-type">
                      <i className="fa-solid fa-code"></i> {recording.generatedAssignment.type}
                    </span>
                  </div>
                  <div className="cr-assignment-desc" dangerouslySetInnerHTML={{ __html: recording.generatedAssignment.description }} />

                  {recording.generatedAssignment.starterCode && (
                    <div className="cr-code-block">
                      <div className="cr-code-header">Starter Code</div>
                      <pre><code>{recording.generatedAssignment.starterCode}</code></pre>
                    </div>
                  )}

                  {recording.generatedAssignment.testCases && recording.generatedAssignment.testCases.length > 0 && (
                    <div className="cr-test-cases">
                      <h4>Test Cases ({recording.generatedAssignment.testCases.length})</h4>
                      {recording.generatedAssignment.testCases.filter(tc => !tc.isHidden).map((tc, i) => (
                        <div key={i} className="cr-test-case">
                          <div className="cr-tc-label">Test {i + 1}: {tc.description}</div>
                          <div className="cr-tc-row">
                            <div><strong>Input:</strong> <code>{tc.input}</code></div>
                            <div><strong>Expected:</strong> <code>{tc.expectedOutput}</code></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View count for instructor */}
      {isInstructor && (
        <div className="cr-footer-stats">
          <span><i className="fa-solid fa-eye"></i> {recording.viewCount} views</span>
          <span><i className="fa-solid fa-clock"></i> Recorded {new Date(recording.recordedAt).toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default RecordingView;

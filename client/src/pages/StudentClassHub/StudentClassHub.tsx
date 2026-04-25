import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { Spinner } from '../../components/common';
import './StudentClassHub.css';

type HubTab = 'video' | 'summary' | 'quiz' | 'notes' | 'practice' | 'assignment';

interface ClassProgress {
  videoWatchedPercent: number;
  timeSpentSeconds: number;
  quizAttempted: boolean;
  assignmentSubmitted: boolean;
}

function saveProgress(id: string, data: Partial<ClassProgress>) {
  const stored = localStorage.getItem('classProgress');
  const all: Record<string, ClassProgress> = stored ? JSON.parse(stored) : {};
  all[id] = { ...{ videoWatchedPercent: 0, timeSpentSeconds: 0, quizAttempted: false, assignmentSubmitted: false }, ...(all[id] || {}), ...data };
  localStorage.setItem('classProgress', JSON.stringify(all));
}

function loadProgress(id: string): ClassProgress {
  const stored = localStorage.getItem('classProgress');
  const all: Record<string, ClassProgress> = stored ? JSON.parse(stored) : {};
  return all[id] || { videoWatchedPercent: 0, timeSpentSeconds: 0, quizAttempted: false, assignmentSubmitted: false };
}

function formatTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
}

const StudentClassHub: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [recording, setRecording] = useState<ClassRecording | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>(() => {
    const t = searchParams.get('tab') as HubTab;
    return ['video', 'summary', 'quiz', 'notes', 'practice', 'assignment'].includes(t) ? t : 'video';
  });

  // Time tracking
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const sessionRef = useRef<NodeJS.Timeout | null>(null);

  // Video
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  const fetchRecording = useCallback(async () => {
    if (!id) return;
    try {
      const res = await classRecordingApi.getById(id);
      setRecording(res.data);
    } catch {}
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchRecording();
    if (id) {
      const p = loadProgress(id);
      setTotalSeconds(p.timeSpentSeconds);
    }
  }, [fetchRecording, id]);

  // Start session timer
  useEffect(() => {
    sessionRef.current = setInterval(() => {
      setSessionSeconds(s => s + 1);
      setTotalSeconds(t => {
        const newTotal = t + 1;
        if (id) saveProgress(id, { timeSpentSeconds: newTotal });
        return newTotal;
      });
    }, 1000);
    return () => { if (sessionRef.current) clearInterval(sessionRef.current); };
  }, [id]);

  // Track video progress
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !id) return;
    const vid = videoRef.current;
    if (vid.duration > 0) {
      const pct = Math.round((vid.currentTime / vid.duration) * 100);
      const prev = loadProgress(id).videoWatchedPercent;
      if (pct > prev) saveProgress(id, { videoWatchedPercent: pct });
    }
  };

  const handleQuizSubmit = () => {
    setQuizSubmitted(true);
    if (id) saveProgress(id, { quizAttempted: true });
  };

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'SP';

  if (loading) return (
    <div className="sch-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Spinner />
    </div>
  );

  if (!recording) return (
    <div className="sch-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div className="text-muted">Class not found.</div>
    </div>
  );

  const courseName = typeof recording.courseId === 'object' ? recording.courseId?.title : '';
  const subjectName = typeof recording.subjectId === 'object' ? recording.subjectId?.name : '';
  const recDate = new Date(recording.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const videoDurationMin = Math.round((recording.duration || 0) / 60);
  const videoUrl = recording.videoUrl
    ? (() => {
        const token = localStorage.getItem('token') || '';
        const tenantId = localStorage.getItem('tenantId') || '';
        return `/api/v1/class-recordings/${recording._id}/stream?token=${encodeURIComponent(token)}&tenantId=${encodeURIComponent(tenantId)}`;
      })()
    : null;

  const questions = recording.generatedQuiz?.questions || [];
  const notes = recording.generatedNotes?.sections || [];
  const practice = recording.generatedPractice?.problems || [];
  const assignment = recording.generatedAssignment;

  // Quiz score
  const quizScore = quizSubmitted ? questions.reduce((acc, q, i) => {
    const sel = quizAnswers[i];
    return acc + (sel !== undefined && q.options[sel]?.isCorrect ? 1 : 0);
  }, 0) : 0;

  return (
    <div className="sch-page">
      {/* Top Bar */}
      <div className="sch-topbar">
        <div className="sch-breadcrumb">
          <span>Student › </span><strong>Class Hub</strong>
        </div>
        <div className="sch-user-badge">
          <span className="sch-role-pill">Student</span>
          <div className="sch-avatar">{initials}</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0b1437' }}>
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>

      {/* Top Nav (sticky below topbar) */}
      <div className="sch-top-nav">
        <button className={`sch-nav-item${activeTab === 'video' ? ' active' : ''}`} onClick={() => navigate('/class-hub')}>🏠 Classes</button>
        <button className="sch-nav-item" onClick={() => navigate('/class-hub?tab=tasks')}>📋 Tasks</button>
        <button className="sch-nav-item" onClick={() => navigate('/class-hub?tab=progress')}>📊 Progress</button>
      </div>

      <div className="sch-content">
        {/* Hub Header */}
        <div className="sch-hub-header">
          <button className="sch-hub-back" onClick={() => navigate('/class-hub')}>
            ← Back to Classes
          </button>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
            {courseName}{subjectName ? ` · ${subjectName}` : ''}
          </div>
          <div className="sch-hub-title">"{recording.title}"</div>

          {/* Time tracking row */}
          <div className="sch-time-row">
            <span style={{ fontSize: 20 }}>🕐</span>
            <div className="sch-time-block">
              <div className="sch-time-label">Total time spent on this class</div>
              <div className="sch-time-val">{formatTime(totalSeconds)}</div>
            </div>
            <div className="sch-time-block">
              <div className="sch-time-label">This session</div>
              <div className="sch-time-val">{formatTime(sessionSeconds)}</div>
            </div>
            <div className="sch-time-live">● Live tracking</div>
          </div>

          {/* Meta chips */}
          <div className="sch-hub-chips">
            {courseName && <span className="sch-chip">📚 {courseName}</span>}
            {videoDurationMin > 0 && <span className="sch-chip">📹 {videoDurationMin} min</span>}
            {recording.summary && <span className="sch-chip">🤖 AI Summarized</span>}
            {recording.isPublished && <span className="sch-chip" style={{ background: '#dcfce7', color: '#15803d' }}>✓ Published</span>}
            <span className="sch-chip">📅 {recDate}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="sch-hub-tabs">
          {(['video', 'summary', 'quiz', 'notes', 'practice', 'assignment'] as HubTab[]).map(tab => (
            <button key={tab} className={`sch-hub-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {tab === 'video' ? 'Video' : tab === 'summary' ? 'Summary' : tab === 'quiz' ? 'Quiz' : tab === 'notes' ? 'Notes' : tab === 'practice' ? 'Practice' : 'Assignment'}
            </button>
          ))}
        </div>

        {/* ── VIDEO TAB ── */}
        {activeTab === 'video' && (
          <div>
            <div className="sch-video-wrap">
              {videoUrl ? (
                <video
                  ref={videoRef}
                  controls
                  onTimeUpdate={handleVideoTimeUpdate}
                  style={{ width: '100%', maxHeight: 420, background: '#000' }}
                >
                  <source src={videoUrl} type={recording.mimeType || 'video/webm'} />
                  Your browser does not support video playback.
                </video>
              ) : (
                <div style={{ padding: 60, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <div style={{ fontSize: 36 }}>📹</div>
                  <div style={{ marginTop: 8 }}>Video not available</div>
                </div>
              )}
            </div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16, padding: '0 4px' }}>
              {recording.title} · {recDate}
            </div>

            {/* Jump to section */}
            <div className="sch-tab-content" style={{ padding: 20 }}>
              <div style={{ fontWeight: 700, color: '#0b1437', marginBottom: 14 }}>Jump to</div>
              <div className="sch-jump-grid">
                {[
                  { icon: '📋', label: 'Summary', tab: 'summary' as HubTab },
                  { icon: '❓', label: 'Take Quiz', tab: 'quiz' as HubTab },
                  { icon: '📝', label: 'Notes', tab: 'notes' as HubTab },
                  { icon: '💪', label: 'Practice', tab: 'practice' as HubTab },
                  { icon: '📋', label: 'Assignment', tab: 'assignment' as HubTab },
                ].map(item => (
                  <div key={item.tab} className="sch-jump-item" onClick={() => setActiveTab(item.tab)}>
                    <span className="sch-jump-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div className="sch-tab-content">
            {recording.summary ? (
              <>
                <div style={{ fontWeight: 700, color: '#0b1437', marginBottom: 12 }}>Chapter Overview</div>
                <ul className="sch-summary-keypoints">
                  {recording.summary.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
                </ul>
                <div className="sch-takeaway">
                  <div className="sch-takeaway-label">🎯 Key Takeaway</div>
                  <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.65 }}>
                    {recording.summary.overview}
                  </p>
                </div>
                {recording.summary.topics?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Topics Covered</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {recording.summary.topics.map((t, i) => (
                        <span key={i} className="sch-chip">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted text-center py-4">Summary not available yet.</div>
            )}
          </div>
        )}

        {/* ── QUIZ TAB ── */}
        {activeTab === 'quiz' && (
          <div className="sch-tab-content">
            {questions.length > 0 ? (
              <>
                {!quizSubmitted ? (
                  <>
                    <div style={{ fontWeight: 700, color: '#0b1437', marginBottom: 4 }}>Quiz — {questions.length} Questions</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Select your answer for each question</div>
                    {questions.map((q, i) => (
                      <div key={i} className="sch-quiz-q">
                        <div className="sch-quiz-q-text">Q{i + 1}. {q.question}</div>
                        {q.options.map((opt, j) => (
                          <div
                            key={j}
                            className={`sch-quiz-option ${quizAnswers[i] === j ? 'selected' : ''}`}
                            onClick={() => setQuizAnswers(prev => ({ ...prev, [i]: j }))}
                          >
                            <span style={{ fontWeight: 700, minWidth: 20 }}>{String.fromCharCode(65 + j)}.</span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    ))}
                    <button
                      className="cf-btn-primary mt-3 w-100"
                      style={{ background: 'linear-gradient(90deg,#6650d8,#38bdf8)', border: 'none', color: '#fff', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
                      onClick={handleQuizSubmit}
                      disabled={Object.keys(quizAnswers).length < questions.length}
                    >
                      Submit Quiz →
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                      <div style={{ fontSize: 48 }}>{quizScore === questions.length ? '🏆' : quizScore >= questions.length / 2 ? '👍' : '📚'}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#0b1437' }}>
                        {quizScore} / {questions.length}
                      </div>
                      <div style={{ fontSize: 14, color: '#64748b' }}>
                        {quizScore === questions.length ? 'Perfect score!' : quizScore >= questions.length / 2 ? 'Good job!' : 'Keep practicing!'}
                      </div>
                    </div>
                    {questions.map((q, i) => (
                      <div key={i} className="sch-quiz-q">
                        <div className="sch-quiz-q-text">Q{i + 1}. {q.question}</div>
                        {q.options.map((opt, j) => {
                          const isSelected = quizAnswers[i] === j;
                          const isCorrect = opt.isCorrect;
                          return (
                            <div key={j} className={`sch-quiz-option ${isCorrect ? 'correct' : isSelected && !isCorrect ? 'wrong' : ''}`}>
                              <span style={{ fontWeight: 700, minWidth: 20 }}>{String.fromCharCode(65 + j)}.</span>
                              {opt.text}
                              {isCorrect && <span style={{ marginLeft: 'auto' }}>✓</span>}
                            </div>
                          );
                        })}
                        {q.explanation && <div className="sch-explanation">💡 {q.explanation}</div>}
                      </div>
                    ))}
                    <button
                      style={{ background: '#f1f5f9', border: 'none', borderRadius: 12, padding: '12px 24px', fontWeight: 700, cursor: 'pointer', marginTop: 16, width: '100%' }}
                      onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                    >
                      Retake Quiz
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="text-muted text-center py-4">Quiz not available yet.</div>
            )}
          </div>
        )}

        {/* ── NOTES TAB ── */}
        {activeTab === 'notes' && (
          <div className="sch-tab-content">
            {notes.length > 0 ? (
              <div className="sch-notes-doc">
                {notes.map((sec: any, i: number) => (
                  <div key={i} className="sch-note-card">
                    <div className="sch-note-card-header">
                      <span className="sch-note-num">{i + 1}</span>
                      <div className="sch-note-heading">{sec.heading}</div>
                    </div>
                    <div className="sch-note-body">
                      {sec.content.split('\n').filter((l: string) => l.trim()).map((line: string, li: number) => (
                        <div key={li} className="sch-note-line">
                          <span className="sch-note-bullet">▸</span>
                          <span>{line.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center py-4">Notes not available yet.</div>
            )}
          </div>
        )}

        {/* ── PRACTICE TAB ── */}
        {activeTab === 'practice' && (
          <div className="sch-tab-content">
            {practice.length > 0 ? (
              practice.map((prob: any, i: number) => (
                <div key={i} className="sch-practice-item">
                  <div className="sch-practice-title">Problem {i + 1} — {prob.title}</div>
                  <div className="sch-code-block">{prob.starterCode}</div>
                  <div className="sch-hint">{prob.hint}</div>
                </div>
              ))
            ) : (
              <div className="text-muted text-center py-4">Practice problems not available yet.</div>
            )}
          </div>
        )}

        {/* ── ASSIGNMENT TAB ── */}
        {activeTab === 'assignment' && (
          <div className="sch-tab-content">
            {assignment ? (
              <>
                <div className="sch-assignment-meta">⏰ Due in 2 days · Complete to earn XP</div>
                <div className="sch-task-item">
                  <div className="sch-task-num">1</div>
                  <div>
                    <div className="sch-task-title">{assignment.title}</div>
                    <div className="sch-task-desc" dangerouslySetInnerHTML={{ __html: assignment.description || '' }} />
                  </div>
                </div>
                {assignment.instructions && (
                  <div className="sch-task-item">
                    <div className="sch-task-num">2</div>
                    <div>
                      <div className="sch-task-title">Instructions</div>
                      <div className="sch-task-desc" dangerouslySetInnerHTML={{ __html: assignment.instructions }} />
                    </div>
                  </div>
                )}
                {assignment.savedAssignmentId ? (
                  <button
                    style={{ marginTop: 16, background: 'linear-gradient(90deg,#6650d8,#38bdf8)', border: 'none', color: '#fff', borderRadius: 12, padding: '13px', fontSize: 15, fontWeight: 700, cursor: 'pointer', width: '100%' }}
                    onClick={() => { navigate(`/assignments/${assignment.savedAssignmentId}/workspace`); if (id) saveProgress(id, { assignmentSubmitted: true }); }}
                  >
                    Open Assignment Editor →
                  </button>
                ) : (
                  <div className="alert alert-info mt-3" style={{ fontSize: 13, borderRadius: 10 }}>
                    🔗 Assignment workspace not linked yet. Ask your instructor to publish this assignment.
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted text-center py-4">Assignment not available yet.</div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default StudentClassHub;

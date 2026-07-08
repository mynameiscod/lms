import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import './StudentInterviewHub.css';

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Ready', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled', expired: 'Expired',
};
const STATUS_COLORS: Record<string, string> = {
  assigned: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444', expired: '#6b7280',
};

const StudentInterviewHub: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [practice, setPractice] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assigned' | 'practice' | 'history' | 'analytics'>('assigned');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [assignRes, histRes, analRes, pracRes] = await Promise.all([
          studentInterviewApi.getAssignments(),
          studentInterviewApi.getAttempts(),
          studentInterviewApi.getAnalytics().catch(() => ({ data: null })),
          studentInterviewApi.getPracticeTemplates().catch(() => ({ data: [] })),
        ]);
        setAssignments(assignRes.data || assignRes.assignments || []);
        setAttempts(histRes.attempts || histRes.data || []);
        setAnalytics(analRes.data);
        setPractice(pracRes.data || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleStartInterview = (assignmentId: string, templateId: string, mode?: string) => {
    // Conversational assignments open the live talking AI bot; structured ones use the Q&A flow.
    if (mode === 'conversational') {
      navigate(`/student/interviews/live/${templateId}?assignmentId=${assignmentId}`);
    } else {
      navigate(`/student/interviews/take/${templateId}?assignmentId=${assignmentId}`);
    }
  };

  // Build + download an .ics calendar file entirely client-side (no auth round-trip).
  const addToCalendar = (a: any) => {
    if (!a.scheduledAt) return;
    const start = new Date(a.scheduledAt);
    const end = new Date(start.getTime() + (a.durationMinutes || 30) * 60000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const link = `${window.location.origin}/my-interviews`;
    const title = `AI Interview: ${a.templateId?.title || 'Interview'}`;
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CodeBegun//CareerPilot//EN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${a._id}@codebegun`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${title}`, `DESCRIPTION:Join your AI interview from ${link}`, `URL:${link}`,
      'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:AI Interview in 30 minutes', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link2 = document.createElement('a');
    link2.href = url; link2.download = 'interview.ics';
    document.body.appendChild(link2); link2.click(); document.body.removeChild(link2);
    URL.revokeObjectURL(url);
  };

  // Self-serve practice — start a mock immediately, no assignment needed.
  const handleStartPractice = (templateId: string) => {
    navigate(`/student/interviews/take/${templateId}`);
  };

  const handleViewReport = (attemptId: string) => {
    navigate(`/student/interviews/report/${attemptId}`);
  };

  const activeAssignments = assignments.filter(a => a.status === 'assigned' || a.status === 'in_progress');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (loading) return <div className="sih-loading">Loading your interview hub...</div>;

  return (
    <div className="sih-container">
      <div className="sih-header">
        <h1>My Interview Hub</h1>
        <p className="sih-subtitle">Practice and prepare for interviews across Communication, HR, and Technical rounds</p>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="sih-quick-stats">
          <div className="sih-stat"><span>Total Attempts</span><strong>{analytics.totalAttempts || 0}</strong></div>
          <div className="sih-stat"><span>Average Score</span><strong>{analytics.averageScore?.toFixed(1) || 0}%</strong></div>
          <div className="sih-stat"><span>Best Score</span><strong>{analytics.bestScore?.toFixed(1) || 0}%</strong></div>
          <div className="sih-stat"><span>Readiness</span><strong>{analytics.readinessLevel || 'N/A'}</strong></div>
        </div>
      )}

      {/* Tabs */}
      <div className="sih-tabs">
        <button className={tab === 'assigned' ? 'active' : ''} onClick={() => setTab('assigned')}>
          Assigned ({activeAssignments.length})
        </button>
        <button className={tab === 'practice' ? 'active' : ''} onClick={() => setTab('practice')}>
          Practice ({practice.length})
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History ({attempts.length})
        </button>
        <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
          My Analytics
        </button>
      </div>

      {/* Assigned Tab */}
      {tab === 'assigned' && (
        <div className="sih-assigned">
          {activeAssignments.length === 0 ? (
            <div className="sih-empty">No interviews assigned to you right now. Check back later!</div>
          ) : (
            <div className="sih-assign-grid">
              {activeAssignments.map(a => (
                <div key={a._id} className="sih-assign-card">
                  <div className="sih-assign-card-top">
                    <span className="sih-assign-status" style={{ background: STATUS_COLORS[a.status] }}>
                      {STATUS_LABELS[a.status]}
                    </span>
                    {a.mode === 'conversational' && (
                      <span className="sih-cat-tag" style={{ background: '#ede9fe', color: '#6d28d9' }}>🎤 Live AI</span>
                    )}
                    {a.dueDate && !a.scheduledAt && (
                      <span className="sih-due">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3>{a.templateId?.title || 'Interview'}</h3>
                  {a.scheduledAt && (
                    <div className="sih-schedule" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 8px', fontSize: 13, fontWeight: 600, color: '#6d28d9' }}>
                      🗓️ {new Date(a.scheduledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      <button type="button" className="sih-cal-btn" onClick={() => addToCalendar(a)}
                        style={{ background: 'none', border: '1px solid #ddd6fe', color: '#6d28d9', borderRadius: 6, padding: '2px 8px', fontSize: 12, cursor: 'pointer' }}>
                        + Add to calendar
                      </button>
                    </div>
                  )}
                  {a.templateId?.interviewCategories && (
                    <div className="sih-cats">
                      {a.templateId.interviewCategories.map((c: string) => (
                        <span key={c} className="sih-cat-tag">{c}</span>
                      ))}
                    </div>
                  )}
                  <p className="sih-assign-desc">{a.templateId?.description?.substring(0, 120)}</p>
                  <div className="sih-assign-meta">
                    <span>Attempts: {a.attemptsUsed}/{a.maxAttempts}</span>
                    {a.templateId?.totalDuration && <span>Duration: {a.templateId.totalDuration} min</span>}
                    {a.bestScore != null && <span>Best: {a.bestScore}%</span>}
                  </div>
                  {a.pushReason && <p className="sih-push-reason">📌 {a.pushReason}</p>}
                  <button
                    className="sih-btn-start"
                    disabled={a.attemptsUsed >= a.maxAttempts}
                    onClick={() => handleStartInterview(a._id, a.templateId?._id || a.templateId, a.mode)}
                  >
                    {a.status === 'in_progress' ? 'Resume Interview' :
                     a.mode === 'conversational' ? '🎤 Join Interview' :
                     a.attemptsUsed > 0 ? 'Reattempt' : 'Start Interview'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {completedAssignments.length > 0 && (
            <>
              <h2 className="sih-section-title">Completed</h2>
              <div className="sih-assign-grid">
                {completedAssignments.map(a => (
                  <div key={a._id} className="sih-assign-card sih-completed">
                    <span className="sih-assign-status" style={{ background: '#10b981' }}>Completed</span>
                    <h3>{a.templateId?.title || 'Interview'}</h3>
                    <div className="sih-assign-meta">
                      <span>Best Score: {a.bestScore?.toFixed(1)}%</span>
                      <span>Attempts: {a.attemptsUsed}/{a.maxAttempts}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Practice Tab — self-serve mock interviews (no admin assignment needed) */}
      {tab === 'practice' && (
        <div className="sih-assigned">
          <p className="sih-subtitle" style={{ marginTop: 0 }}>
            Practice a full mock interview any time — AI asks the questions, scores your answers, and gives you a readiness report.
          </p>
          {practice.length === 0 ? (
            <div className="sih-empty">No practice interviews are published yet. Check back soon!</div>
          ) : (
            <div className="sih-assign-grid">
              {practice.map(t => (
                <div key={t._id} className="sih-assign-card">
                  <div className="sih-assign-card-top">
                    <span className="sih-assign-status" style={{ background: '#6366f1' }}>Practice</span>
                    {t.difficultyLevel && <span className="sih-due" style={{ textTransform: 'capitalize' }}>{t.difficultyLevel}</span>}
                  </div>
                  <h3>{t.title || 'Mock Interview'}</h3>
                  {t.interviewCategories && (
                    <div className="sih-cats">
                      {t.interviewCategories.map((c: string) => (
                        <span key={c} className="sih-cat-tag">{c}</span>
                      ))}
                    </div>
                  )}
                  {t.description && <p className="sih-assign-desc">{t.description.substring(0, 120)}</p>}
                  <div className="sih-assign-meta">
                    {t.sectionCount != null && <span>{t.sectionCount} section{t.sectionCount === 1 ? '' : 's'}</span>}
                    {t.totalDuration && <span>Duration: {t.totalDuration} min</span>}
                  </div>
                  <button className="sih-btn-start" onClick={() => handleStartPractice(t._id)}>
                    Start Practice
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="sih-history">
          {attempts.length === 0 ? (
            <div className="sih-empty">No interview attempts yet.</div>
          ) : (
            <div className="sih-history-list">
              {attempts.map(att => (
                <div key={att._id} className="sih-history-card">
                  <div className="sih-history-top">
                    <h3>{att.templateId?.title || 'Interview'}</h3>
                    <span className="sih-assign-status" style={{
                      background: att.status === 'completed' ? '#10b981' :
                                  att.status === 'evaluated' ? '#8b5cf6' : '#f59e0b'
                    }}>
                      {att.status}
                    </span>
                  </div>
                  <div className="sih-history-meta">
                    <span>Attempt #{att.attemptNumber}</span>
                    <span>Score: {att.overallPercentage?.toFixed(1) || '—'}%</span>
                    <span>Pass: {att.passStatus ? 'Yes' : 'No'}</span>
                    <span>{new Date(att.startedAt).toLocaleDateString()}</span>
                  </div>
                  {att.overallFeedback && <p className="sih-feedback-preview">{att.overallFeedback.substring(0, 100)}...</p>}
                  {(att.status === 'completed' || att.status === 'evaluated' || att.status === 'result_published') && (
                    <button className="sih-btn-report" onClick={() => handleViewReport(att._id)}>View Report</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tab === 'analytics' && (
        <div className="sih-analytics">
          {!analytics ? (
            <div className="sih-empty">Complete at least one interview to see analytics.</div>
          ) : (
            <>
              {analytics.weakAreas && analytics.weakAreas.length > 0 && (
                <div className="sih-analytics-section">
                  <h2>Areas to Improve</h2>
                  <div className="sih-weak-areas">
                    {analytics.weakAreas.map((area: any, i: number) => (
                      <div key={i} className="sih-weak-card">
                        <strong>{area.area || area.category}</strong>
                        <span>{area.score?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.improvementTrend && analytics.improvementTrend.length > 0 && (
                <div className="sih-analytics-section">
                  <h2>Score Trend</h2>
                  <div className="sih-trend">
                    {analytics.improvementTrend.map((point: any, i: number) => (
                      <div key={i} className="sih-trend-point">
                        <div className="sih-trend-bar" style={{ height: `${Math.max(10, point.score)}%` }} />
                        <span className="sih-trend-label">#{point.attemptNumber || i + 1}</span>
                        <span className="sih-trend-val">{point.score?.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.categoryBreakdown && (
                <div className="sih-analytics-section">
                  <h2>Category Breakdown</h2>
                  <div className="sih-cat-breakdown">
                    {Object.entries(analytics.categoryBreakdown as Record<string, number>).map(([cat, score]) => (
                      <div key={cat} className="sih-cat-row">
                        <span className="sih-cat-name">{cat}</span>
                        <div className="sih-cat-bar-wrap">
                          <div className="sih-cat-bar" style={{ width: `${Math.min(100, score as number)}%` }} />
                        </div>
                        <span className="sih-cat-score">{(score as number)?.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentInterviewHub;

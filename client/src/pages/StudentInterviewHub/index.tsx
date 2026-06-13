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
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'assigned' | 'history' | 'analytics'>('assigned');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [assignRes, histRes, analRes] = await Promise.all([
          studentInterviewApi.getAssignments(),
          studentInterviewApi.getAttempts(),
          studentInterviewApi.getAnalytics().catch(() => ({ data: null })),
        ]);
        setAssignments(assignRes.data || assignRes.assignments || []);
        setAttempts(histRes.attempts || histRes.data || []);
        setAnalytics(analRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const handleStartInterview = (assignmentId: string, templateId: string) => {
    navigate(`/student/interviews/take/${templateId}?assignmentId=${assignmentId}`);
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
                    {a.dueDate && (
                      <span className="sih-due">Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                  <h3>{a.templateId?.title || 'Interview'}</h3>
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
                    onClick={() => handleStartInterview(a._id, a.templateId?._id || a.templateId)}
                  >
                    {a.status === 'in_progress' ? 'Resume Interview' :
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

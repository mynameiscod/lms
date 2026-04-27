import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { classRecordingApi, ClassRecording } from '../../api/classRecordingApi';
import { Spinner } from '../../components/common';
import './StudentClassHub.css';

type NavTab = 'classes' | 'tasks' | 'progress';

const CLASS_EMOJIS = ['🧬', '📦', '🛡️', '🗄️', '🌱', '⚡', '🔥', '💡', '🎯', '🚀'];

function getStatusInfo(rec: ClassRecording, progress: Record<string, ClassProgress>) {
  const p = progress[rec._id];
  const pct = p?.videoWatchedPercent || 0;
  if (pct >= 100 && p?.quizAttempted) return { label: '✓ Done', cls: 'done', btnLabel: 'Revisit', btnCls: 'revisit' };
  if (pct > 0) return { label: 'In Progress', cls: 'progress', btnLabel: 'Resume →', btnCls: 'resume' };
  return { label: 'New', cls: 'new', btnLabel: 'Start →', btnCls: 'start' };
}

function formatTime(seconds: number): string {
  if (!seconds) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  return `${m}m`;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

interface ClassProgress {
  videoWatchedPercent: number;
  timeSpentSeconds: number;
  quizAttempted: boolean;
  assignmentSubmitted: boolean;
}

const StudentMyClasses: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [recordings, setRecordings] = useState<ClassRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubject, setActiveSubject] = useState<string>('all');
  const [navTab, setNavTab] = useState<NavTab>(() => {
    const t = searchParams.get('tab') as NavTab;
    return ['classes', 'tasks', 'progress'].includes(t) ? t : 'classes';
  });

  // Progress stored in localStorage keyed by recordingId
  const [progress, setProgress] = useState<Record<string, ClassProgress>>({});

  const loadProgress = useCallback(() => {
    const stored = localStorage.getItem('classProgress');
    if (stored) {
      try { setProgress(JSON.parse(stored)); } catch {}
    }
  }, []);

  const fetchRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await classRecordingApi.listForStudents({ limit: 50 });
      setRecordings(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRecordings(); loadProgress(); }, [fetchRecordings, loadProgress]);

  // Derive subjects list
  const subjects = Array.from(new Set(
    recordings.map(r => typeof r.subjectId === 'object' ? r.subjectId?.name : null).filter(Boolean)
  )) as string[];

  const filtered = activeSubject === 'all'
    ? recordings
    : recordings.filter(r => typeof r.subjectId === 'object' && r.subjectId?.name === activeSubject);

  // Stats
  const totalClasses = recordings.length;
  const completed = recordings.filter(r => {
    const p = progress[r._id];
    return p && p.videoWatchedPercent >= 100 && p.quizAttempted;
  }).length;
  const inProgress = recordings.filter(r => {
    const p = progress[r._id];
    return p && p.videoWatchedPercent > 0 && !(p.videoWatchedPercent >= 100 && p.quizAttempted);
  }).length;
  const totalSeconds = Object.values(progress).reduce((a, p) => a + (p.timeSpentSeconds || 0), 0);

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : 'SP';
  const courseName = recordings[0] && typeof recordings[0].courseId === 'object'
    ? recordings[0].courseId?.title || '' : '';

  return (
    <div className="sch-page">
      {/* Top Bar */}
      <div className="sch-topbar">
        <div className="sch-breadcrumb">
          <button className="sch-back-home" onClick={() => navigate('/dashboard')}>
            <span className="sch-back-arrow">←</span> Dashboard
          </button>
          <span className="sch-breadcrumb-sep">›</span>
          <strong>My Classes</strong>
        </div>
        <div className="sch-user-badge">
          <span className="sch-role-pill">Student</span>
          <div className="sch-avatar">{initials}</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#0b1437' }}>
            {user?.firstName} {user?.lastName}
          </span>
        </div>
      </div>

      <div className="sch-content">
        {navTab === 'classes' && (
          <>
            {/* Course label */}
            {courseName && <div className="sch-course-label">Student · {courseName}</div>}
            <div className="sch-page-title">My Classes</div>
            <div className="sch-page-sub">Pick up where you left off or start a new class</div>

            {/* Stats */}
            <div className="sch-stats-row">
              <div className="sch-stat-card">
                <div className="sch-stat-val purple">{totalClasses}</div>
                <div className="sch-stat-label">Total Classes</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val green">{completed}</div>
                <div className="sch-stat-label">Completed</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val amber">{inProgress}</div>
                <div className="sch-stat-label">In Progress</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val dark">{formatTime(totalSeconds)}</div>
                <div className="sch-stat-label">Total Time Spent</div>
              </div>
            </div>

            {/* Subject filters */}
            <div className="sch-filters">
              <div className={`sch-filter-pill ${activeSubject === 'all' ? 'active' : ''}`} onClick={() => setActiveSubject('all')}>All Subjects</div>
              {subjects.map(s => (
                <div key={s} className={`sch-filter-pill ${activeSubject === s ? 'active' : ''}`} onClick={() => setActiveSubject(s)}>{s}</div>
              ))}
            </div>

            {/* Class cards */}
            {loading ? (
              <div className="text-center py-5"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-5 text-muted">No classes available yet.</div>
            ) : (
              filtered.map((rec, idx) => {
                const { label, cls, btnLabel, btnCls } = getStatusInfo(rec, progress);
                const p = progress[rec._id];
                const pct = p?.videoWatchedPercent || 0;
                const timeSpent = p?.timeSpentSeconds || 0;
                const emoji = CLASS_EMOJIS[idx % CLASS_EMOJIS.length];
                const subjectName = typeof rec.subjectId === 'object' ? rec.subjectId?.name : '';
                const recDate = new Date(rec.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div key={rec._id} className="sch-class-card" onClick={() => navigate(`/class-hub/${rec._id}`)}>
                    <div className="sch-card-top">
                      <span className="sch-card-emoji">{emoji}</span>
                      <span className={`sch-card-status-badge ${cls}`}>{label}</span>
                      <span className="sch-card-meta" style={{ marginLeft: 'auto', fontSize: 11 }}>
                        {subjectName ? `${subjectName.toUpperCase()} · ` : ''}{recDate}
                      </span>
                    </div>
                    <div className="sch-card-body">
                      <div className="sch-card-title-text">{rec.title}</div>
                      {pct > 0 && (
                        <div className="sch-progress-mini">
                          <div className="sch-progress-mini-fill" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      <div className="sch-card-chips">
                        <span className="sch-chip">📹 {formatDuration(rec.duration)}</span>
                        {pct > 0 && <span className="sch-chip progress-chip">{pct}%</span>}
                        {rec.summary && <span className="sch-chip">🤖 AI Summary</span>}
                      </div>
                      <div className="sch-card-footer">
                        <div className="sch-time-info">
                          <span>🕐</span>
                          <span>{timeSpent > 0 ? formatTime(timeSpent) : '0m'}</span>
                          <span>spent</span>
                        </div>
                        <button className={`sch-card-btn ${btnCls}`} onClick={e => { e.stopPropagation(); navigate(`/class-hub/${rec._id}`); }}>
                          {btnLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {navTab === 'tasks' && (
          <div>
            <div className="sch-page-title">My Tasks</div>
            <div className="sch-page-sub">Pending quizzes and assignments</div>
            {recordings.filter(r => r.isPublished).map(rec => {
              const p = progress[rec._id];
              return (
                <div key={rec._id} className="sch-class-card" style={{ cursor: 'default' }}>
                  <div className="sch-card-body" style={{ padding: '16px 18px' }}>
                    <div className="sch-card-title-text" style={{ marginBottom: 8 }}>{rec.title}</div>
                    <div className="d-flex gap-3 flex-wrap">
                      {rec.generatedQuiz?.questions?.length && (
                        <button
                          className={`sch-card-btn ${p?.quizAttempted ? 'revisit' : 'start'}`}
                          onClick={() => navigate(`/class-hub/${rec._id}?tab=quiz`)}
                        >
                          {p?.quizAttempted ? '✓ Quiz Done' : '❓ Take Quiz'}
                        </button>
                      )}
                      {rec.generatedAssignment?.title && (
                        <button
                          className={`sch-card-btn ${p?.assignmentSubmitted ? 'revisit' : 'resume'}`}
                          onClick={() => rec.generatedAssignment?.savedAssignmentId && navigate(`/assignments/${rec.generatedAssignment.savedAssignmentId}/workspace`)}
                        >
                          {p?.assignmentSubmitted ? '✓ Submitted' : '📋 Assignment'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {navTab === 'progress' && (
          <div>
            <div className="sch-page-title">My Progress</div>
            <div className="sch-page-sub">Track your learning journey</div>
            <div className="sch-stats-row" style={{ marginBottom: 24 }}>
              <div className="sch-stat-card">
                <div className="sch-stat-val purple">{totalClasses}</div>
                <div className="sch-stat-label">Total Classes</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val green">{completed}</div>
                <div className="sch-stat-label">Completed</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val amber">{totalClasses > 0 ? Math.round((completed / totalClasses) * 100) : 0}%</div>
                <div className="sch-stat-label">Completion Rate</div>
              </div>
              <div className="sch-stat-card">
                <div className="sch-stat-val dark">{formatTime(totalSeconds)}</div>
                <div className="sch-stat-label">Time Invested</div>
              </div>
            </div>
            {recordings.map((rec, idx) => {
              const p = progress[rec._id];
              const pct = p?.videoWatchedPercent || 0;
              return (
                <div key={rec._id} className="sch-class-card" style={{ cursor: 'default' }}>
                  <div className="sch-card-body" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div className="sch-card-title-text" style={{ marginBottom: 0, fontSize: 14 }}>{rec.title}</div>
                      <span style={{ fontWeight: 700, color: '#6650d8', fontSize: 14 }}>{pct}%</span>
                    </div>
                    <div className="sch-progress-mini" style={{ height: 6 }}>
                      <div className="sch-progress-mini-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="d-flex gap-3 flex-wrap mt-2" style={{ fontSize: 12, color: '#64748b' }}>
                      <span>{p?.quizAttempted ? '✅ Quiz' : '○ Quiz'}</span>
                      <span>{p?.assignmentSubmitted ? '✅ Assignment' : '○ Assignment'}</span>
                      <span>🕐 {formatTime(p?.timeSpentSeconds || 0)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="sch-bottom-nav">
        <button className={`sch-nav-item ${navTab === 'classes' ? 'active' : ''}`} onClick={() => setNavTab('classes')}>
          🎓 Classes
        </button>
        <button className={`sch-nav-item ${navTab === 'tasks' ? 'active' : ''}`} onClick={() => setNavTab('tasks')}>
          📋 Tasks
        </button>
        <button className={`sch-nav-item ${navTab === 'progress' ? 'active' : ''}`} onClick={() => setNavTab('progress')}>
          📊 Progress
        </button>
        <button className="sch-nav-item" onClick={() => navigate('/dashboard')}>
          🏠 Home
        </button>
      </div>
    </div>
  );
};

export default StudentMyClasses;

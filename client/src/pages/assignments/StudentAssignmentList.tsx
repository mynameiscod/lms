import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  submissionApi,
  Assignment,
  SubmissionStatus,
  AssignmentType,
} from '../../api/assignmentApi';
import './StudentAssignmentList.css';

interface StudentAssignment extends Assignment {
  submission?: {
    _id: string;
    status: SubmissionStatus;
    finalScore?: number;
    percentage?: number;
    submittedAt?: string;
  };
}

type Tab = 'all' | 'pending' | 'dueSoon' | 'submitted' | 'evaluated' | 'overdue';

const DONE = ['submitted', 'graded', 'late'];

const StudentAssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [calendarMode, setCalendarMode] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await submissionApi.getMyAssignments();
      setAssignments(response.data.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const rawStatus = (a: StudentAssignment) => a.submission?.status || 'not_started';
  const statusOf = (a: StudentAssignment): string => a.delivery?.status || rawStatus(a);
  const dueOf = (a: StudentAssignment): string | null | undefined => a.delivery?.dueAt ?? a.dueDate;
  const isDone = (a: StudentAssignment) => DONE.includes(statusOf(a));

  const isOverdue = (a: StudentAssignment) => {
    const status = statusOf(a);
    if (DONE.includes(status)) return false;
    if (a.delivery) return status === 'overdue' || status === 'missed';
    const due = dueOf(a);
    return !!due && new Date(due).getTime() < Date.now();
  };

  const isDueSoon = (a: StudentAssignment) => {
    if (isDone(a) || isOverdue(a)) return false;
    const due = dueOf(a);
    if (!due) return false;
    const diff = new Date(due).getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const formatDate = (value?: string | null) => {
    if (!value) return 'No deadline';
    return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (value?: string | null) => {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const timeRemaining = (a: StudentAssignment) => {
    const due = dueOf(a);
    if (!due) return 'No deadline';
    const ms = new Date(due).getTime() - Date.now();
    if (ms <= 0) return 'Past due';
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    if (days > 0) return `${days}d ${hours}h`;
    const mins = Math.max(1, Math.floor((ms % 3600000) / 60000));
    return `${hours}h ${mins}m`;
  };

  const typeIcon = (type: AssignmentType) => {
    const map: Record<string, string> = {
      coding: 'bi-code-slash', mcq: 'bi-ui-checks-grid', theory: 'bi-journal-text', project: 'bi-rocket-takeoff',
      file_upload: 'bi-paperclip', sql: 'bi-database', web: 'bi-window-stack',
    };
    return map[type] || 'bi-file-earmark-text';
  };

  const statusMeta = (a: StudentAssignment) => {
    const status = statusOf(a);
    if (status === 'graded') return { cls: 'evaluated', label: 'Evaluated' };
    if (status === 'submitted') return { cls: 'submitted', label: 'Submitted' };
    if (status === 'late') return { cls: 'overdue', label: 'Late' };
    if (status === 'in_progress') return { cls: 'progress', label: 'In Progress' };
    if (status === 'missed') return { cls: 'overdue', label: 'Missed' };
    if (isOverdue(a)) return { cls: 'overdue', label: 'Overdue' };
    if (isDueSoon(a)) return { cls: 'duesoon', label: 'Due Soon' };
    return { cls: 'pending', label: 'Pending' };
  };

  const actionMeta = (a: StudentAssignment) => {
    const status = statusOf(a);
    if (status === 'graded') return { label: 'View Feedback', icon: 'bi-chat-left-text' };
    if (status === 'submitted' || status === 'late') return { label: 'View Submission', icon: 'bi-eye' };
    if (status === 'in_progress') return { label: 'Continue', icon: 'bi-arrow-right-circle' };
    if (status === 'missed') return { label: 'Closed', icon: 'bi-lock' };
    return { label: 'Start Assignment', icon: 'bi-play-circle' };
  };

  const openAssignment = (a: StudentAssignment) => {
    if (statusOf(a) === 'graded') navigate(`/assignments/${a._id}/result`);
    else if (statusOf(a) !== 'missed') navigate(`/assignments/${a._id}/workspace`);
  };

  const stats = useMemo(() => {
    const total = assignments.length;
    const evaluated = assignments.filter(a => statusOf(a) === 'graded').length;
    const submitted = assignments.filter(a => ['submitted', 'late'].includes(statusOf(a))).length;
    const overdue = assignments.filter(isOverdue).length;
    const dueSoon = assignments.filter(isDueSoon).length;
    const pending = assignments.filter(a => !isDone(a) && !isOverdue(a)).length;
    const scored = assignments.filter(a => statusOf(a) === 'graded' && typeof a.submission?.percentage === 'number');
    const averageScore = scored.length
      ? Math.round(scored.reduce((sum, a) => sum + (a.submission?.percentage || 0), 0) / scored.length)
      : 0;
    return { total, evaluated, submitted, overdue, dueSoon, pending, averageScore };
  }, [assignments]);

  const featured = useMemo(() => {
    const candidates = assignments
      .filter(a => !isDone(a) && statusOf(a) !== 'missed')
      .sort((a, b) => {
        if (statusOf(a) === 'in_progress' && statusOf(b) !== 'in_progress') return -1;
        if (statusOf(b) === 'in_progress' && statusOf(a) !== 'in_progress') return 1;
        const da = dueOf(a) ? new Date(dueOf(a) as string).getTime() : Number.MAX_SAFE_INTEGER;
        const db = dueOf(b) ? new Date(dueOf(b) as string).getTime() : Number.MAX_SAFE_INTEGER;
        return da - db;
      });
    return candidates[0] || null;
  }, [assignments]);

  const upcoming = useMemo(() => assignments
    .filter(a => !isDone(a) && !isOverdue(a) && !!dueOf(a))
    .sort((a, b) => new Date(dueOf(a) as string).getTime() - new Date(dueOf(b) as string).getTime())
    .slice(0, 4), [assignments]);

  const recentEvaluations = useMemo(() => assignments
    .filter(a => statusOf(a) === 'graded')
    .sort((a, b) => new Date(b.submission?.submittedAt || 0).getTime() - new Date(a.submission?.submittedAt || 0).getTime())
    .slice(0, 3), [assignments]);

  const tabMatches = (a: StudentAssignment) => {
    if (tab === 'pending') return !isDone(a) && !isOverdue(a);
    if (tab === 'dueSoon') return isDueSoon(a);
    if (tab === 'submitted') return ['submitted', 'late'].includes(statusOf(a));
    if (tab === 'evaluated') return statusOf(a) === 'graded';
    if (tab === 'overdue') return isOverdue(a);
    return true;
  };

  const filtered = assignments.filter(a => {
    if (!tabMatches(a)) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter === 'pending' && (isDone(a) || isOverdue(a))) return false;
    if (statusFilter === 'submitted' && !['submitted', 'late'].includes(statusOf(a))) return false;
    if (statusFilter === 'evaluated' && statusOf(a) !== 'graded') return false;
    if (statusFilter === 'overdue' && !isOverdue(a)) return false;
    if (search) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || (a.topics || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  useEffect(() => { setPage(1); }, [tab, search, typeFilter, statusFilter, calendarMode]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const tabCount = (t: Tab) => ({
    all: stats.total,
    pending: stats.pending,
    dueSoon: stats.dueSoon,
    submitted: stats.submitted,
    evaluated: stats.evaluated,
    overdue: stats.overdue,
  }[t]);

  if (loading) return <div className="sa-page"><div className="sa-loading"><div className="sa-spinner" /></div></div>;

  return (
    <div className="sa-page">
      <div className="sa-header">
        <div>
          <h1 className="sa-title">My Assignments</h1>
          <p className="sa-subtitle">Complete assignments, track your progress and improve your skills.</p>
        </div>
        <div className="sa-header-actions">
          <button className={`sa-tool-btn ${calendarMode ? 'active' : ''}`} onClick={() => setCalendarMode(v => !v)}>
            <i className="bi bi-calendar3" /> Calendar View
          </button>
          <button className={`sa-tool-btn primary ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(v => !v)}>
            <i className="bi bi-funnel" /> Filter
          </button>
        </div>
      </div>

      {error && <div className="sa-alert"><i className="bi bi-exclamation-triangle" /> {error}</div>}

      <div className="sa-stats five">
        <div className="sa-stat"><span className="sa-stat-ic blue"><i className="bi bi-clipboard2-check" /></span><div><div className="sa-stat-label">Total Assignments</div><div className="sa-stat-val">{stats.total}</div><div className="sa-stat-sub">All time</div></div></div>
        <div className="sa-stat warning"><span className="sa-stat-ic amber"><i className="bi bi-clock" /></span><div><div className="sa-stat-label">Due Soon</div><div className="sa-stat-val">{stats.dueSoon}</div><div className="sa-stat-sub">Next 7 days</div></div></div>
        <div className="sa-stat"><span className="sa-stat-ic teal"><i className="bi bi-send" /></span><div><div className="sa-stat-label">Submitted</div><div className="sa-stat-val">{stats.submitted}</div><div className="sa-stat-sub">Awaiting evaluation</div></div></div>
        <div className="sa-stat"><span className="sa-stat-ic green"><i className="bi bi-check-circle" /></span><div><div className="sa-stat-label">Evaluated</div><div className="sa-stat-val">{stats.evaluated}</div><div className="sa-stat-sub">Completed</div></div></div>
        <div className="sa-stat"><span className="sa-stat-ic violet"><i className="bi bi-bar-chart" /></span><div><div className="sa-stat-label">Average Score</div><div className="sa-stat-val">{stats.averageScore}%</div><div className="sa-stat-sub">Across evaluated work</div></div></div>
      </div>

      {featured && (
        <section className="sa-featured">
          <div className="sa-feature-copy">
            <span className={`sa-badge ${statusMeta(featured).cls}`}>{statusMeta(featured).label}</span>
            <h2>{featured.title}</h2>
            <div className="sa-feature-meta">
              <span>{featured.topics?.[0] || 'Assignment'}</span><span>•</span><span className="sa-cap">{featured.type}</span><span>•</span><span className="sa-cap">{featured.difficulty}</span>
            </div>
            <p>{featured.description || 'Complete this assignment to strengthen the concepts covered in your learning plan.'}</p>
            <div className="sa-feature-facts">
              <div><i className="bi bi-calendar3" /><span>Due Date<strong>{formatDate(dueOf(featured))}<small>{formatTime(dueOf(featured))}</small></strong></span></div>
              <div><i className="bi bi-clock-history" /><span>Time Remaining<strong>{timeRemaining(featured)}</strong></span></div>
              <div><i className="bi bi-award" /><span>Max Marks<strong>{featured.totalPoints}</strong></span></div>
            </div>
          </div>
          <div className="sa-feature-art" aria-hidden="true">
            <div className="sa-code-card"><i className="bi bi-code-slash" /></div>
            <div className="sa-code-lines"><span /><span /><span /><span /></div>
          </div>
          <button className="sa-feature-action" onClick={() => openAssignment(featured)}>
            {statusOf(featured) === 'in_progress' ? 'Continue Assignment' : 'Start Assignment'} <i className="bi bi-arrow-right" />
          </button>
        </section>
      )}

      {showFilters && (
        <div className="sa-filterbar">
          <div className="sa-filter-item"><label>Type</label><select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}><option value="">All Types</option><option value="coding">Coding</option><option value="mcq">Quiz</option><option value="theory">Theory</option><option value="project">Project</option><option value="web">Web</option><option value="sql">SQL</option></select></div>
          <div className="sa-filter-item"><label>Status</label><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">All Status</option><option value="pending">Pending</option><option value="submitted">Submitted</option><option value="evaluated">Evaluated</option><option value="overdue">Overdue</option></select></div>
          <button className="sa-clear-filters" onClick={() => { setTypeFilter(''); setStatusFilter(''); }}><i className="bi bi-x-circle" /> Clear filters</button>
        </div>
      )}

      <div className="sa-layout">
        <main className="sa-main-col">
          <div className="sa-card">
            <div className="sa-tabs-row">
              <div className="sa-tabs">
                {(['all', 'pending', 'dueSoon', 'submitted', 'evaluated', 'overdue'] as Tab[]).map(t => {
                  const labels: Record<Tab, string> = { all: 'All', pending: 'Pending', dueSoon: 'Due Soon', submitted: 'Submitted', evaluated: 'Evaluated', overdue: 'Overdue' };
                  return <button key={t} className={`sa-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{labels[t]} <span>{tabCount(t)}</span></button>;
                })}
              </div>
              <div className="sa-search-wrap"><i className="bi bi-search" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assignments..." /></div>
            </div>

            {calendarMode ? (
              <div className="sa-calendar-view">
                {upcoming.length ? upcoming.map(a => <button key={a._id} className="sa-calendar-item" onClick={() => openAssignment(a)}><span className="sa-calendar-date"><b>{new Date(dueOf(a) as string).getDate()}</b>{new Date(dueOf(a) as string).toLocaleDateString('en-US', { month: 'short' })}</span><span><strong>{a.title}</strong><small>{formatTime(dueOf(a))} · {a.topics?.[0] || a.type}</small></span><i className="bi bi-chevron-right" /></button>) : <div className="sa-empty">No upcoming deadlines.</div>}
              </div>
            ) : pageRows.length === 0 ? (
              <div className="sa-empty"><i className="bi bi-clipboard-check" /><h3>No assignments found</h3><p>Try another filter or check back later.</p></div>
            ) : (
              <>
                <div className="sa-table-wrap">
                  <table className="sa-table">
                    <thead><tr><th>Assignment</th><th>Subject / Topic</th><th>Due Date</th><th>Status</th><th>Score</th><th>Action</th></tr></thead>
                    <tbody>{pageRows.map(a => {
                      const status = statusMeta(a);
                      const action = actionMeta(a);
                      return <tr key={a._id}>
                        <td><div className="sa-assignment-cell"><span className={`sa-type-tile type-${a.type}`}><i className={`bi ${typeIcon(a.type)}`} /></span><div><strong>{a.title}</strong><small>{a.description || `${a.type} assignment`}</small></div></div></td>
                        <td><strong className="sa-topic">{a.topics?.[0] || 'General'}</strong><small className="sa-row-sub">{a.topics?.[1] || a.difficulty}</small></td>
                        <td><span className={isOverdue(a) ? 'sa-date overdue' : 'sa-date'}>{formatDate(dueOf(a))}</span><small className="sa-row-sub">{formatTime(dueOf(a))}</small></td>
                        <td><span className={`sa-badge ${status.cls}`}>{status.label}</span></td>
                        <td>{typeof a.submission?.percentage === 'number' ? <div className="sa-score"><strong>{Math.round(a.submission.percentage)}%</strong><small>{a.submission.finalScore ?? '—'} / {a.totalPoints}</small></div> : <span className="sa-muted">—</span>}</td>
                        <td><button className="sa-action" disabled={statusOf(a) === 'missed'} onClick={() => openAssignment(a)}>{action.label} <i className={`bi ${action.icon}`} /></button></td>
                      </tr>;
                    })}</tbody>
                  </table>
                </div>
                <div className="sa-foot"><span>Showing {filtered.length ? (page - 1) * perPage + 1 : 0} to {Math.min(page * perPage, filtered.length)} of {filtered.length} assignments</span><div className="sa-pager"><button disabled={page === 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left" /></button>{Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), Math.max(0, page - 3) + 5).map(n => <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}<button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right" /></button></div></div>
              </>
            )}
          </div>

          <div className="sa-motivation"><span className="sa-motivation-icon"><i className="bi bi-trophy" /></span><div><strong>Great things take consistency!</strong><p>Submit on time, learn better and earn higher scores.</p></div><button onClick={() => navigate('/my-journey')}>View My Journey <i className="bi bi-arrow-right" /></button></div>
        </main>

        <aside className="sa-side-col">
          <section className="sa-side-card">
            <h3>Assignment Progress</h3>
            <div className="sa-progress-wrap">
              <div className="sa-donut" style={{ background: `conic-gradient(#16a36a 0 ${stats.total ? stats.evaluated / stats.total * 100 : 0}%, #1976d2 0 ${stats.total ? (stats.evaluated + stats.submitted) / stats.total * 100 : 0}%, #f59e0b 0 ${stats.total ? (stats.evaluated + stats.submitted + stats.pending) / stats.total * 100 : 0}%, #dc2626 0 100%)` }}><span><b>{stats.total}</b>Total</span></div>
              <div className="sa-progress-legend"><p><i className="green" />Evaluated <b>{stats.evaluated}</b></p><p><i className="blue" />Submitted <b>{stats.submitted}</b></p><p><i className="amber" />Pending <b>{stats.pending}</b></p><p><i className="red" />Overdue <b>{stats.overdue}</b></p></div>
            </div>
          </section>

          <section className="sa-side-card"><div className="sa-side-head"><h3>Upcoming Deadlines</h3><button onClick={() => { setTab('dueSoon'); setCalendarMode(true); }}>View all</button></div><div className="sa-mini-list">{upcoming.length ? upcoming.map(a => <button key={a._id} onClick={() => openAssignment(a)}><span className={`sa-mini-icon type-${a.type}`}><i className={`bi ${typeIcon(a.type)}`} /></span><span><strong>{a.title}</strong><small>{formatDate(dueOf(a))}, {formatTime(dueOf(a))}</small></span><em className={isDueSoon(a) ? 'due' : ''}>{isDueSoon(a) ? 'Due Soon' : 'Upcoming'}</em></button>) : <p className="sa-muted">No upcoming deadlines.</p>}</div></section>

          <section className="sa-side-card"><div className="sa-side-head"><h3>Recent Evaluations</h3><button onClick={() => setTab('evaluated')}>View all</button></div><div className="sa-mini-list evaluations">{recentEvaluations.length ? recentEvaluations.map(a => <button key={a._id} onClick={() => openAssignment(a)}><span className="sa-mini-icon evaluated"><i className="bi bi-check-circle" /></span><span><strong>{a.title}</strong><small>Recently evaluated</small></span><em>{Math.round(a.submission?.percentage || 0)}%</em></button>) : <p className="sa-muted">No evaluated assignments yet.</p>}</div></section>
        </aside>
      </div>
    </div>
  );
};

export default StudentAssignmentList;

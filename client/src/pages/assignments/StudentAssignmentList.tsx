import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  submissionApi,
  Assignment,
  SubmissionStatus,
  AssignmentType,
  DifficultyLevel
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

type Tab = 'all' | 'pending' | 'completed' | 'overdue';

const tileColors = ['#ede9fe', '#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#e0f2fe', '#fae8ff'];
const tileColor = (s: string) => tileColors[(s?.charCodeAt(0) || 0) % tileColors.length];

const StudentAssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await submissionApi.getMyAssignments();
      setAssignments(response.data.data);
    } catch (err) {
      setError('Failed to load assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const getSubmissionStatus = (a: StudentAssignment) => a.submission?.status || 'not_started';

  // The per-student schedule-resolved lifecycle wins when the assignment was delivered
  // via AssessmentSchedule; otherwise fall back to the raw submission status + baked date.
  const effStatus = (a: StudentAssignment): string => a.delivery?.status || getSubmissionStatus(a);
  const dueOf = (a: StudentAssignment): string | null | undefined => a.delivery?.dueAt ?? a.dueDate;
  const DONE = ['submitted', 'graded', 'late'];
  const isDone = (a: StudentAssignment) => DONE.includes(effStatus(a));

  const isOverdue = (a: StudentAssignment) => {
    const st = effStatus(a);
    if (DONE.includes(st)) return false;
    if (a.delivery) return st === 'overdue' || st === 'missed';
    const due = dueOf(a);
    if (!due) return false;
    return new Date(due) < new Date();
  };

  const formatDue = (a: StudentAssignment) => {
    const due = dueOf(a);
    if (!due) return { text: 'No deadline', overdue: false };
    const date = new Date(due);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (isOverdue(a)) return { text: `Overdue by ${Math.abs(diffDays)} days`, overdue: true };
    if (diffDays === 0) return { text: 'Due today!', overdue: false };
    if (diffDays === 1) return { text: 'Due tomorrow', overdue: false };
    if (diffDays <= 7 && diffDays > 0) return { text: `Due in ${diffDays} days`, overdue: false };
    return {
      text: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      overdue: false,
    };
  };

  const getTypeIcon = (type: AssignmentType) => {
    const icons: Record<AssignmentType, string> = {
      [AssignmentType.CODING]: '💻',
      [AssignmentType.MCQ]: '📋',
      [AssignmentType.THEORY]: '📝',
      [AssignmentType.PROJECT]: '🚀',
      [AssignmentType.FILE_UPLOAD]: '📎',
      [AssignmentType.SQL]: '🗄️',
      [AssignmentType.WEB]: '🌐'
    };
    return icons[type] || '📄';
  };

  const difficultyClass = (d: DifficultyLevel) => {
    const map: Record<DifficultyLevel, string> = {
      [DifficultyLevel.BEGINNER]: 'beginner',
      [DifficultyLevel.EASY]: 'easy',
      [DifficultyLevel.MEDIUM]: 'medium',
      [DifficultyLevel.HARD]: 'hard',
      [DifficultyLevel.EXPERT]: 'expert',
    };
    return map[d] || 'medium';
  };

  const statusBadge = (a: StudentAssignment) => {
    const status = effStatus(a);
    const map: Record<string, { cls: string; label: string; icon: string }> = {
      not_started: { cls: 'notstarted', label: 'Not Started', icon: '⏸' },
      in_progress: { cls: 'inprogress', label: 'In Progress', icon: '🔄' },
      submitted:   { cls: 'review',     label: 'In Review',   icon: '👀' },
      graded:      { cls: 'graded',     label: 'Completed',   icon: '✅' },
      late:        { cls: 'late',       label: 'Late',        icon: '⚠' },
      overdue:     { cls: 'late',       label: 'Overdue',     icon: '⏰' },
      missed:      { cls: 'late',       label: 'Missed',      icon: '⛔' },
    };
    return map[status] || map.not_started;
  };

  const actionLabel = (a: StudentAssignment) => {
    const status = effStatus(a);
    if (status === 'graded') return { label: 'Results', icon: '📊' };
    if (status === 'in_progress') return { label: 'Continue', icon: '▶' };
    if (status === 'submitted') return { label: 'View', icon: '👁' };
    if (status === 'late' || status === 'overdue') return { label: 'Submit', icon: '📤' };
    if (status === 'missed') return { label: 'Closed', icon: '🔒' };
    return { label: 'Start', icon: '🚀' };
  };

  const handleOpen = (a: StudentAssignment) => {
    if (effStatus(a) === 'graded') navigate(`/assignments/${a._id}/result`);
    else navigate(`/assignments/${a._id}/workspace`);
  };

  // ── Filtering ──
  const matchesTab = (a: StudentAssignment) => {
    if (tab === 'pending') return ['not_started', 'in_progress'].includes(effStatus(a));
    if (tab === 'completed') return isDone(a);
    if (tab === 'overdue') return isOverdue(a);
    return true;
  };

  const filtered = assignments.filter(a => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter) {
      if (statusFilter === 'pending' && !['not_started', 'in_progress'].includes(effStatus(a))) return false;
      if (statusFilter === 'completed' && !isDone(a)) return false;
      if (statusFilter === 'overdue' && !isOverdue(a)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const inTitle = a.title.toLowerCase().includes(q);
      const inTopics = (a.topics || []).some(t => t.toLowerCase().includes(q));
      if (!inTitle && !inTopics) return false;
    }
    return matchesTab(a);
  });

  // reset to first page whenever the result set changes
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, search, tab, perPage]);

  // ── Stats ──
  const total = assignments.length;
  const completed = assignments.filter(a => isDone(a)).length;
  const pending = assignments.filter(a => ['not_started', 'in_progress'].includes(effStatus(a))).length;
  const overdue = assignments.filter(a => isOverdue(a)).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const tabCount = (t: Tab) => {
    if (t === 'pending') return pending;
    if (t === 'completed') return completed;
    if (t === 'overdue') return overdue;
    return total;
  };

  // ── Pagination ──
  const totalRecords = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / perPage));
  const pageStart = (page - 1) * perPage;
  const pageRows = filtered.slice(pageStart, pageStart + perPage);

  const pageNumbers = (): (number | '…')[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 3) return [1, 2, 3, '…', totalPages];
    if (page >= totalPages - 2) return [1, '…', totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', page, '…', totalPages];
  };

  if (loading) {
    return (
      <div className="sa-page">
        <div className="sa-loading"><div className="sa-spinner" /></div>
      </div>
    );
  }

  return (
    <div className="sa-page">
      {/* Header */}
      <div className="sa-header">
        <div>
          <h1 className="sa-title">My Assignments</h1>
          <p className="sa-subtitle">View and complete your assigned work.</p>
        </div>
      </div>

      {error && <div className="sa-alert">⚠ {error}</div>}

      {/* Stat cards */}
      <div className="sa-stats">
        <div className="sa-stat">
          <span className="sa-stat-ic purple"><i className="fa-solid fa-clipboard-list" /></span>
          <div><div className="sa-stat-label">Total Assignments</div><div className="sa-stat-val">{total}</div></div>
        </div>
        <div className="sa-stat">
          <span className="sa-stat-ic green"><i className="fa-solid fa-circle-check" /></span>
          <div><div className="sa-stat-label">Completed</div><div className="sa-stat-val">{completed}</div><div className="sa-stat-sub good">{pct(completed)}%</div></div>
        </div>
        <div className="sa-stat">
          <span className="sa-stat-ic blue"><i className="fa-solid fa-hourglass-half" /></span>
          <div><div className="sa-stat-label">Pending</div><div className="sa-stat-val">{pending}</div><div className="sa-stat-sub blue">{pct(pending)}%</div></div>
        </div>
        <div className="sa-stat">
          <span className="sa-stat-ic red"><i className="fa-solid fa-triangle-exclamation" /></span>
          <div><div className="sa-stat-label">Overdue</div><div className="sa-stat-val">{overdue}</div><div className="sa-stat-sub low">{pct(overdue)}%</div></div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sa-filterbar">
        <div className="sa-filter-item">
          <label>Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">All Types</option>
            <option value="coding">Coding</option>
            <option value="mcq">Quiz</option>
            <option value="theory">Theory</option>
            <option value="project">Project</option>
            <option value="web">Web</option>
            <option value="sql">SQL</option>
          </select>
        </div>
        <div className="sa-filter-item">
          <label>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <div className="sa-search-wrap">
          <input
            className="sa-search"
            placeholder="Search assignments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="sa-search-ic">🔍</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="sa-card">
        <div className="sa-tabs">
          {(['all', 'pending', 'completed', 'overdue'] as Tab[]).map(t => (
            <button key={t} className={`sa-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'all' ? 'All Assignments' : t.charAt(0).toUpperCase() + t.slice(1)}
              <span className="sa-tab-count">{tabCount(t)}</span>
            </button>
          ))}
        </div>

        {totalRecords === 0 ? (
          <div className="sa-empty">
            <div className="sa-empty-ic"><i className="fa-solid fa-clipboard-check" /></div>
            <h3>No assignments</h3>
            <p>You're all caught up! Check back later for new assignments.</p>
          </div>
        ) : (
          <>
            <div className="sa-table-wrap">
              <table className="sa-table">
                <thead>
                  <tr>
                    <th>Assignment</th><th>Type</th><th>Difficulty</th><th>Points</th>
                    <th>Due Date</th><th>Status</th><th>Score</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(a => {
                    const due = formatDue(a);
                    const sb = statusBadge(a);
                    const act = actionLabel(a);
                    const score = a.submission?.finalScore;
                    return (
                      <tr key={a._id} className={due.overdue ? 'sa-row-overdue' : ''}>
                        <td data-label="Assignment" className="sa-titlecell">
                          <span className="sa-tile" style={{ background: tileColor(a.title) }}>{getTypeIcon(a.type)}</span>
                          <div className="sa-titlebox">
                            <div className="sa-aname">{a.title}</div>
                            {a.topics && a.topics.length > 0 && (
                              <div className="sa-tags">
                                {a.topics.slice(0, 2).map((t, i) => <span key={i} className="sa-tag">{t}</span>)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td data-label="Type">
                          <span className="sa-type">{getTypeIcon(a.type)} <span className="sa-cap">{a.type}</span></span>
                        </td>
                        <td data-label="Difficulty">
                          <span className={`sa-diff ${difficultyClass(a.difficulty)}`}>{a.difficulty}</span>
                        </td>
                        <td data-label="Points" className="sa-points">{a.totalPoints}</td>
                        <td data-label="Due Date">
                          <span className={`sa-due ${due.overdue ? 'overdue' : ''}`}>{due.text}</span>
                        </td>
                        <td data-label="Status">
                          <span className={`sa-badge ${sb.cls}`}>{sb.icon} {sb.label}</span>
                        </td>
                        <td data-label="Score">
                          {score !== undefined ? (
                            <span className="sa-score" style={{ color: score >= a.totalPoints * 0.6 ? '#059669' : '#dc2626' }}>
                              {score}/{a.totalPoints}
                            </span>
                          ) : <span className="sa-dash">–</span>}
                        </td>
                        <td data-label="Action">
                          <button
                            className={`sa-action ${getSubmissionStatus(a) === 'graded' ? 'secondary' : ''}`}
                            onClick={() => handleOpen(a)}
                          >
                            {act.icon} {act.label}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="sa-foot">
              <span className="sa-foot-info">
                Showing {pageStart + 1} to {Math.min(pageStart + perPage, totalRecords)} of {totalRecords} assignments
              </span>
              <div className="sa-pager">
                <button className="sa-pg" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>←</button>
                {pageNumbers().map((n, i) =>
                  n === '…'
                    ? <span key={`e${i}`} className="sa-pg-ellipsis">…</span>
                    : <button key={n} className={`sa-pg ${page === n ? 'active' : ''}`} onClick={() => setPage(n as number)}>{n}</button>
                )}
                <button className="sa-pg" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>→</button>
              </div>
              <select className="sa-perpage" value={perPage} onChange={(e) => setPerPage(Number(e.target.value))}>
                {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} per page</option>)}
              </select>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentAssignmentList;

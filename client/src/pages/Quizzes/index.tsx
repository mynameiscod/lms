import React, { useEffect, useMemo, useState } from 'react';
import { quizApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Quiz } from '../../types';
import './QuizzesPage.css';

type QuizFilter = 'all' | 'available' | 'dueSoon' | 'upcoming' | 'completed' | 'overdue';

const PAGE_SIZE = 7;

const safeDate = (date?: string, time?: string): Date | null => {
  if (!date) return null;
  const datePart = date.split('T')[0];
  const value = new Date(`${datePart}T${time || '23:59'}`);
  return Number.isNaN(value.getTime()) ? null : value;
};

const formatDate = (value: Date | null) => {
  if (!value) return 'No deadline';
  return value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const QuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<QuizFilter>('all');
  const [page, setPage] = useState(1);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getAvailableQuizzes();
      setQuizzes((res as any).data || res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuizzes(); }, []);

  const onSchedule = (q: Quiz) => q.delivery?.source === 'schedule';
  const winStart = (q: Quiz): Date | null => onSchedule(q)
    ? (q.delivery?.startAt ? new Date(q.delivery.startAt) : null)
    : safeDate(q.startDate, q.startTime);
  const winDue = (q: Quiz): Date | null => onSchedule(q)
    ? (q.delivery?.dueAt ? new Date(q.delivery.dueAt) : null)
    : safeDate(q.endDate, q.endTime);

  const beforeStart = (q: Quiz) => {
    const start = winStart(q);
    return !!(start && new Date() < start);
  };

  const afterDue = (q: Quiz) => {
    const due = winDue(q);
    return !!(due && new Date() > due);
  };

  const isQuizAlive = (q: Quiz) => !beforeStart(q) && !afterDue(q);

  const canAttempt = (q: Quiz) => {
    if (!isQuizAlive(q)) return false;
    if (!q.multipleAttempts) return !q.isAttempted;
    return q.maxAttempts ? (q.attemptCount || 0) < q.maxAttempts : false;
  };

  const isDueSoon = (q: Quiz) => {
    if (!isQuizAlive(q) || q.isAttempted) return false;
    const due = winDue(q);
    if (!due) return false;
    const diff = due.getTime() - Date.now();
    return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
  };

  const isOverdue = (q: Quiz) => afterDue(q) && !q.isAttempted;

  const isCompleted = (q: Quiz) => {
    const allUsed = q.multipleAttempts && q.maxAttempts && (q.attemptCount || 0) >= q.maxAttempts;
    return !!(q.isAttempted || allUsed);
  };

  const scorePercent = (q: Quiz) => q.isAttempted && q.totalMarks
    ? Math.round(((q.lastAttemptMarks || 0) / q.totalMarks) * 100)
    : 0;

  const validQuizzes = useMemo(
    () => quizzes.filter(q => (q.totalQuestions || 0) > 0 || q.isAttempted),
    [quizzes]
  );

  const counts = useMemo(() => ({
    all: validQuizzes.length,
    available: validQuizzes.filter(q => canAttempt(q)).length,
    dueSoon: validQuizzes.filter(q => isDueSoon(q)).length,
    upcoming: validQuizzes.filter(q => beforeStart(q)).length,
    completed: validQuizzes.filter(q => isCompleted(q)).length,
    overdue: validQuizzes.filter(q => isOverdue(q)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [validQuizzes]);

  const attemptedQuizzes = useMemo(
    () => validQuizzes.filter(q => q.isAttempted && (q.totalMarks || 0) > 0),
    [validQuizzes]
  );

  const avgScore = attemptedQuizzes.length
    ? Math.round(attemptedQuizzes.reduce((sum, q) => sum + scorePercent(q), 0) / attemptedQuizzes.length)
    : 0;

  const featuredQuiz = useMemo(
    () => validQuizzes.find(q => canAttempt(q)) || validQuizzes.find(q => beforeStart(q)) || validQuizzes[0],
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [validQuizzes]
  );

  const filteredQuizzes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return validQuizzes.filter(q => {
      const matchesSearch = !query || q.title.toLowerCase().includes(query) ||
        (q.description || '').toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (filterTab === 'available') return canAttempt(q);
      if (filterTab === 'dueSoon') return isDueSoon(q);
      if (filterTab === 'upcoming') return beforeStart(q);
      if (filterTab === 'completed') return isCompleted(q);
      if (filterTab === 'overdue') return isOverdue(q);
      return true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validQuizzes, filterTab, searchQuery]);

  useEffect(() => { setPage(1); }, [filterTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedQuizzes = filteredQuizzes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const upcomingQuizzes = useMemo(
    () => validQuizzes
      .filter(q => beforeStart(q) || isDueSoon(q))
      .sort((a, b) => (winStart(a)?.getTime() || winDue(a)?.getTime() || 0) - (winStart(b)?.getTime() || winDue(b)?.getTime() || 0))
      .slice(0, 3),
  // eslint-disable-next-line react-hooks/exhaustive-deps
    [validQuizzes]
  );

  const recentResults = attemptedQuizzes.slice(0, 3);

  const handleStartQuiz = (quizId: string) => { window.location.href = `/quiz/${quizId}/take`; };
  const handleViewResults = (quizId: string) => {
    quizApi.getLatestAttempt(quizId)
      .then((res: any) => {
        const attemptId = res?.data?._id || res?._id;
        if (attemptId) window.location.href = `/quiz/${quizId}/results/${attemptId}`;
      })
      .catch(() => alert('Failed to load attempt details'));
  };

  const statusFor = (q: Quiz) => {
    if (q.isAttempted) return { key: 'completed', label: 'Completed' };
    if (isOverdue(q)) return { key: 'overdue', label: 'Overdue' };
    if (beforeStart(q)) return { key: 'upcoming', label: 'Upcoming' };
    if (isDueSoon(q)) return { key: 'due-soon', label: 'Due Soon' };
    if (canAttempt(q)) return { key: 'available', label: 'Available' };
    return { key: 'closed', label: 'Closed' };
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="mq-page">
      <div className="mq-page-header">
        <div>
          <h1>My Quizzes</h1>
          <p>Attempt quizzes, track scores and improve your skills.</p>
        </div>
        <div className="mq-header-actions">
          <button className="mq-secondary-btn" type="button" onClick={() => setFilterTab('upcoming')}>
            <i className="bi bi-calendar3" /> Calendar View
          </button>
          <button className="mq-primary-btn" type="button" onClick={() => setFilterTab('all')}>
            <i className="bi bi-funnel" /> Filter
          </button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="mq-stats-grid">
        <div className="mq-stat-card blue"><span className="mq-stat-icon"><i className="bi bi-clipboard-check" /></span><div><span>Total Quizzes</span><strong>{counts.all}</strong><small>All time</small></div></div>
        <div className="mq-stat-card orange"><span className="mq-stat-icon"><i className="bi bi-clock" /></span><div><span>Due Soon</span><strong>{counts.dueSoon}</strong><small>Next 7 days</small></div></div>
        <div className="mq-stat-card cyan"><span className="mq-stat-icon"><i className="bi bi-send" /></span><div><span>Available Now</span><strong>{counts.available}</strong><small>Ready to attempt</small></div></div>
        <div className="mq-stat-card green"><span className="mq-stat-icon"><i className="bi bi-check-circle" /></span><div><span>Completed</span><strong>{counts.completed}</strong><small>Quizzes</small></div></div>
        <div className="mq-stat-card purple"><span className="mq-stat-icon"><i className="bi bi-bar-chart" /></span><div><span>Average Score</span><strong>{attemptedQuizzes.length ? `${avgScore}%` : '—'}</strong><small>{avgScore >= 75 ? 'Good job! 🎉' : 'Keep practising'}</small></div></div>
      </div>

      <div className="mq-dashboard-grid">
        <main className="mq-main-column">
          {featuredQuiz && (
            <section className="mq-featured-card">
              <div className="mq-featured-copy">
                <span className="mq-featured-badge"><i className="bi bi-stars" /> {canAttempt(featuredQuiz) ? 'AVAILABLE NOW' : 'UPCOMING'}</span>
                <h2>{featuredQuiz.title}</h2>
                <div className="mq-featured-meta">
                  <span><i className="bi bi-record-circle" /> {featuredQuiz.totalQuestions || 0} Questions</span>
                  {featuredQuiz.totalTime ? <span>• {featuredQuiz.totalTime} Minutes</span> : null}
                  <span>• {featuredQuiz.totalMarks || 0} Marks</span>
                </div>
                <p>{featuredQuiz.description || 'Test your knowledge and strengthen your understanding of the topic.'}</p>
                <div className="mq-featured-details">
                  <div><i className="bi bi-calendar-event" /><span>Due Date<strong>{formatDate(winDue(featuredQuiz))}</strong></span></div>
                  <div><i className="bi bi-journal-text" /><span>Attempts<strong>{featuredQuiz.attemptCount || 0} / {featuredQuiz.multipleAttempts && featuredQuiz.maxAttempts ? featuredQuiz.maxAttempts : 1}</strong></span></div>
                  <div><i className="bi bi-graph-up-arrow" /><span>Status<strong>{statusFor(featuredQuiz).label}</strong></span></div>
                </div>
              </div>
              <div className="mq-featured-art" aria-hidden="true">
                <div className="mq-art-screen"><i className="bi bi-ui-checks-grid" /></div>
                <div className="mq-art-person"><span className="head" /><span className="body" /><span className="desk" /><span className="laptop"><i className="bi bi-code-slash" /></span></div>
                {canAttempt(featuredQuiz) ? (
                  <button className="mq-featured-action" type="button" onClick={() => handleStartQuiz(featuredQuiz._id)}>Start Quiz <i className="bi bi-arrow-right" /></button>
                ) : featuredQuiz.isAttempted ? (
                  <button className="mq-featured-action" type="button" onClick={() => handleViewResults(featuredQuiz._id)}>Review Quiz <i className="bi bi-arrow-right" /></button>
                ) : null}
              </div>
            </section>
          )}

          <section className="mq-list-card">
            <div className="mq-list-toolbar">
              <div className="mq-tabs">
                {([
                  ['all', 'All', counts.all],
                  ['available', 'Available', counts.available],
                  ['dueSoon', 'Due Soon', counts.dueSoon],
                  ['upcoming', 'Upcoming', counts.upcoming],
                  ['completed', 'Completed', counts.completed],
                  ['overdue', 'Overdue', counts.overdue],
                ] as [QuizFilter, string, number][]).map(([key, label, count]) => (
                  <button key={key} type="button" className={filterTab === key ? 'active' : ''} onClick={() => setFilterTab(key)}>{label} ({count})</button>
                ))}
              </div>
              <div className="mq-search-wrap"><i className="bi bi-search" /><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search quizzes..." aria-label="Search quizzes" /></div>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="mq-empty"><i className="bi bi-inbox" /><h3>No quizzes found</h3><p>Try another filter or search term.</p></div>
            ) : (
              <>
                <div className="mq-table-scroll">
                  <table className="mq-table">
                    <thead><tr><th>Quiz</th><th>Questions</th><th>Duration</th><th>Due Date</th><th>Status</th><th>Score</th><th>Attempts</th><th>Action</th><th /></tr></thead>
                    <tbody>
                      {pagedQuizzes.map(q => {
                        const status = statusFor(q);
                        const pct = scorePercent(q);
                        const maxAttempts = q.multipleAttempts && q.maxAttempts ? q.maxAttempts : 1;
                        return (
                          <tr key={q._id}>
                            <td><div className="mq-quiz-name"><span className={`mq-quiz-tile ${status.key}`}><i className="bi bi-file-earmark-code" /></span><span><strong>{q.title}</strong><small>{q.description ? q.description.slice(0, 46) : `${q.totalQuestions || 0} question assessment`}</small></span></div></td>
                            <td>{q.totalQuestions || 0}</td>
                            <td>{q.totalTime ? `${q.totalTime} min` : '—'}</td>
                            <td><strong className={isOverdue(q) ? 'mq-date-danger' : ''}>{formatDate(winDue(q))}</strong>{winDue(q) && <small>{winDue(q)!.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small>}</td>
                            <td><span className={`mq-status ${status.key}`}>{status.label}</span></td>
                            <td>{q.isAttempted ? <><strong>{pct}%</strong><small>{q.lastAttemptMarks || 0} / {q.totalMarks || 0}</small></> : <span className="mq-muted">—</span>}</td>
                            <td>{q.attemptCount || 0} / {maxAttempts}</td>
                            <td>{canAttempt(q) ? <button type="button" className="mq-row-action" onClick={() => handleStartQuiz(q._id)}>Start Quiz</button> : q.isAttempted ? <button type="button" className="mq-row-action" onClick={() => handleViewResults(q._id)}>Review Quiz</button> : <button type="button" className="mq-row-action" disabled>View Details</button>}</td>
                            <td><i className="bi bi-three-dots-vertical mq-more" /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mq-pagination"><span>Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredQuizzes.length)} of {filteredQuizzes.length} quizzes</span><div><button type="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><i className="bi bi-chevron-left" /></button>{Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(n => <button type="button" key={n} className={currentPage === n ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}<button type="button" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}><i className="bi bi-chevron-right" /></button></div></div>
              </>
            )}
          </section>

          <div className="mq-motivation"><span><i className="bi bi-trophy" /></span><div><strong>Consistency is the key to success!</strong><p>Keep attempting quizzes regularly and track your progress in your journey.</p></div><button type="button" onClick={() => { window.location.href = '/my-learning/journey'; }}>View My Journey <i className="bi bi-arrow-right" /></button></div>
        </main>

        <aside className="mq-right-rail">
          <section className="mq-side-card mq-progress-card">
            <h3>Quiz Progress</h3>
            <div className="mq-progress-content">
              <div className="mq-donut" style={{ background: `conic-gradient(#13a064 0 ${counts.all ? (counts.completed / counts.all) * 100 : 0}%, #1976D2 0 ${counts.all ? ((counts.completed + counts.upcoming) / counts.all) * 100 : 0}%, #f59e0b 0 ${counts.all ? ((counts.completed + counts.upcoming + counts.dueSoon) / counts.all) * 100 : 0}%, #e5484d 0 ${counts.all ? ((counts.completed + counts.upcoming + counts.dueSoon + counts.overdue) / counts.all) * 100 : 0}%, #8b5cf6 0)` }}><span><strong>{counts.all}</strong><small>Total</small></span></div>
              <div className="mq-legend"><div><i className="green" />Completed <b>{counts.completed}</b></div><div><i className="blue" />Upcoming <b>{counts.upcoming}</b></div><div><i className="orange" />Due Soon <b>{counts.dueSoon}</b></div><div><i className="red" />Overdue <b>{counts.overdue}</b></div><div><i className="purple" />Available <b>{counts.available}</b></div></div>
            </div>
          </section>

          <section className="mq-side-card"><div className="mq-side-title"><h3>Upcoming Quizzes</h3><button type="button" onClick={() => setFilterTab('upcoming')}>View all <i className="bi bi-arrow-right" /></button></div>{upcomingQuizzes.length ? upcomingQuizzes.map(q => <div className="mq-side-item" key={q._id}><span className="mq-side-icon"><i className="bi bi-file-earmark-text" /></span><div><strong>{q.title}</strong><small>{beforeStart(q) ? formatDate(winStart(q)) : formatDate(winDue(q))}</small></div><span className={`mq-mini-status ${isDueSoon(q) ? 'due' : 'upcoming'}`}>{isDueSoon(q) ? 'Due Soon' : 'Upcoming'}</span></div>) : <p className="mq-side-empty">No upcoming quizzes.</p>}</section>

          <section className="mq-side-card"><div className="mq-side-title"><h3>Recent Results</h3><button type="button" onClick={() => setFilterTab('completed')}>View all <i className="bi bi-arrow-right" /></button></div>{recentResults.length ? recentResults.map(q => <div className="mq-side-item result" key={q._id}><span className="mq-side-icon"><i className="bi bi-check2-circle" /></span><div><strong>{q.title}</strong><small>{q.lastAttemptMarks || 0} / {q.totalMarks || 0}</small></div><b>{scorePercent(q)}%</b></div>) : <p className="mq-side-empty">Complete a quiz to see results here.</p>}</section>
        </aside>
      </div>
    </div>
  );
};

export default QuizzesPage;

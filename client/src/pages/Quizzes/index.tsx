import React, { useEffect, useState, useCallback } from 'react';
import { quizApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Quiz } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import './QuizzesPage.css';

const tileColors = ['#ede9fe', '#dbeafe', '#dcfce7', '#fef3c7', '#fee2e2', '#e0f2fe', '#fae8ff'];
const tileColor = (s: string) => tileColors[(s?.charCodeAt(0) || 0) % tileColors.length];
const scoreColor = (p: number) => (p >= 75 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626');

const QuizzesPage: React.FC = () => {
  const { user } = useAuth();
  const firstName = (user as any)?.firstName || 'there';

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'available' | 'completed' | 'pending'>('completed');

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

  const startOf = (q: Quiz) => new Date(`${q.startDate.split('T')[0]}T${q.startTime}`);
  const endOf = (q: Quiz) => new Date(`${q.endDate.split('T')[0]}T${q.endTime}`);

  const filterQuizzes = useCallback(() => {
    const filtered = quizzes.filter(quiz => {
      if ((!quiz.totalQuestions || quiz.totalQuestions === 0) && !quiz.isAttempted) return false;
      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quiz.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const now = new Date();
      const startTime = startOf(quiz);
      const endTime = endOf(quiz);
      let statusMatch = true;
      if (filterTab === 'available') {
        const canRetake = quiz.multipleAttempts && quiz.maxAttempts && (quiz.attemptCount || 0) < quiz.maxAttempts;
        statusMatch = now >= startTime && now <= endTime && (!quiz.isAttempted || !!canRetake);
      } else if (filterTab === 'completed') {
        const allAttemptsUsed = quiz.multipleAttempts && quiz.maxAttempts && (quiz.attemptCount || 0) >= quiz.maxAttempts;
        statusMatch = !!(quiz.isAttempted || now > endTime || allAttemptsUsed);
      } else if (filterTab === 'pending') {
        statusMatch = now < startTime;
      }
      return matchesSearch && statusMatch;
    });
    setFilteredQuizzes(filtered);
  }, [quizzes, searchQuery, filterTab]);

  useEffect(() => { loadQuizzes(); }, []);
  useEffect(() => { filterQuizzes(); }, [filterQuizzes]);

  const isQuizAlive = (quiz: Quiz): boolean => {
    const now = new Date();
    return now >= startOf(quiz) && now <= endOf(quiz);
  };

  const getQuizStatus = (quiz: Quiz): 'pending' | 'live' | 'closed' => {
    const now = new Date();
    if (now < startOf(quiz)) return 'pending';
    if (now > endOf(quiz)) return 'closed';
    return 'live';
  };

  const canAttempt = (quiz: Quiz): boolean => {
    if (!isQuizAlive(quiz)) return false;
    if (!quiz.multipleAttempts) return !quiz.isAttempted;
    return quiz.maxAttempts ? (quiz.attemptCount || 0) < quiz.maxAttempts : false;
  };

  const handleStartQuiz = (quizId: string) => { window.location.href = `/quiz/${quizId}/take`; };
  const handleViewResults = (quizId: string) => {
    quizApi.getLatestAttempt(quizId)
      .then((res: any) => {
        const attemptId = res?.data?._id || res?._id;
        if (attemptId) window.location.href = `/quiz/${quizId}/results/${attemptId}`;
      })
      .catch(() => alert('Failed to load attempt details'));
  };

  // ── Stats & tab counts ──────────────────────────────────────────────────────
  const now = new Date();
  const withQ = (q: Quiz) => (q.totalQuestions || 0) > 0 || q.isAttempted;
  const isCompleted = (q: Quiz) => {
    const allUsed = q.multipleAttempts && q.maxAttempts && (q.attemptCount || 0) >= q.maxAttempts;
    return !!(q.isAttempted || now > endOf(q) || allUsed);
  };
  const availableCount = quizzes.filter(q => (q.totalQuestions || 0) > 0 && isQuizAlive(q) && !q.isAttempted).length;
  const pendingCount = quizzes.filter(q => (q.totalQuestions || 0) > 0 && now < startOf(q)).length;
  const completedCount = quizzes.filter(q => (q.totalQuestions || 0) > 0 && isCompleted(q)).length;
  const totalCount = quizzes.filter(withQ).length;
  const attemptedQ = quizzes.filter(q => q.isAttempted && (q.totalMarks || 0) > 0);
  const avgScore = attemptedQ.length
    ? Math.round(attemptedQ.reduce((s, q) => s + ((q.lastAttemptMarks || 0) / q.totalMarks) * 100, 0) / attemptedQ.length)
    : 0;

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="mq-page">
      {/* Header */}
      <div className="mq-header">
        <div>
          <h1 className="mq-title">My Quiz</h1>
          <div className="mq-greeting">Hello, {firstName}! <span className="mq-wave">👋</span></div>
          <p className="mq-subtitle">Track your quiz progress and see how far you've come.</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Stat cards */}
      <div className="mq-stats">
        <div className="mq-stat">
          <span className="mq-stat-ic purple"><i className="fa-solid fa-list-check" /></span>
          <div><div className="mq-stat-label">Total Quizzes</div><div className="mq-stat-val">{totalCount}</div><div className="mq-stat-sub">All Time</div></div>
        </div>
        <div className="mq-stat">
          <span className="mq-stat-ic green"><i className="fa-solid fa-circle-check" /></span>
          <div><div className="mq-stat-label">Completed</div><div className="mq-stat-val">{completedCount}</div><div className="mq-stat-sub">Keep it up! 🎉</div></div>
        </div>
        <div className="mq-stat">
          <span className="mq-stat-ic amber"><i className="fa-solid fa-hourglass-half" /></span>
          <div><div className="mq-stat-label">Pending</div><div className="mq-stat-val">{pendingCount}</div><div className="mq-stat-sub">{pendingCount > 0 ? 'Get ready!' : 'Good going!'}</div></div>
        </div>
        <div className="mq-stat">
          <span className="mq-stat-ic red"><i className="fa-solid fa-trophy" /></span>
          <div><div className="mq-stat-label">Average Score</div><div className="mq-stat-val">{attemptedQ.length ? `${avgScore}%` : '—'}</div><div className="mq-stat-sub">{avgScore >= 75 ? 'Great Performance! 🔥' : 'Keep practising'}</div></div>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="mq-toolbar">
        <div className="mq-tabs">
          <button className={`mq-tab ${filterTab === 'available' ? 'active' : ''}`} onClick={() => setFilterTab('available')}>Available ({availableCount})</button>
          <button className={`mq-tab ${filterTab === 'pending' ? 'active' : ''}`} onClick={() => setFilterTab('pending')}>Pending ({pendingCount})</button>
          <button className={`mq-tab ${filterTab === 'completed' ? 'active' : ''}`} onClick={() => setFilterTab('completed')}>Completed ({completedCount})</button>
        </div>
        <input className="mq-search" placeholder="🔍 Search quizzes…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
      </div>

      {/* List */}
      {filteredQuizzes.length === 0 ? (
        <div className="mq-empty">
          <div className="mq-empty-ic"><i className="fa-solid fa-inbox" /></div>
          <h3>No quizzes found</h3>
          <p>
            {filterTab === 'available' && 'No quizzes available right now.'}
            {filterTab === 'pending' && 'No upcoming quizzes.'}
            {filterTab === 'completed' && 'You haven’t completed any quizzes yet.'}
          </p>
        </div>
      ) : (
        <div className="mq-table-wrap">
          <table className="mq-table">
            <thead>
              <tr>
                <th>Quiz Title</th><th>Status</th><th>Total Marks</th><th>Your Score</th><th>Attempts</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map(quiz => {
                const status = getQuizStatus(quiz);
                const canAttemptQuiz = canAttempt(quiz);
                const attempted = quiz.isAttempted;
                const pct = attempted && quiz.totalMarks ? Math.round(((quiz.lastAttemptMarks || 0) / quiz.totalMarks) * 100) : 0;
                const go = () => { if (canAttemptQuiz) handleStartQuiz(quiz._id); else if (attempted) handleViewResults(quiz._id); };
                return (
                  <tr key={quiz._id} className={status === 'closed' && !attempted ? 'mq-row-inactive' : ''}>
                    <td data-label="Quiz" className="mq-titlecell">
                      <span className="mq-tile" style={{ background: tileColor(quiz.title) }}>{(quiz.title[0] || 'Q').toUpperCase()}</span>
                      <div className="mq-titlebox">
                        <div className="mq-qtitle">{quiz.title}</div>
                        {quiz.description && <div className="mq-qdesc">{quiz.description.length > 70 ? quiz.description.slice(0, 70) + '…' : quiz.description}</div>}
                        <div className="mq-qmeta">{quiz.totalQuestions || 0} questions{quiz.totalTime ? ` · ${quiz.totalTime} min` : ''}</div>
                      </div>
                    </td>
                    <td data-label="Status">
                      <span className={`mq-badge ${status === 'live' ? 'live' : status === 'pending' ? 'pending' : 'closed'}`}>
                        {attempted ? 'Completed' : status === 'live' ? 'Live' : status === 'pending' ? 'Upcoming' : 'Closed'}
                      </span>
                      <div className="mq-date">📅 {new Date(attempted ? endOf(quiz) : startOf(quiz)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </td>
                    <td data-label="Total Marks" className="mq-center">{quiz.totalMarks}</td>
                    <td data-label="Your Score">
                      {attempted ? (
                        <div className="mq-scorebox">
                          <span className="mq-score" style={{ color: scoreColor(pct) }}>{quiz.lastAttemptMarks || 0}/{quiz.totalMarks}</span>
                          <span className="mq-pct" style={{ background: `${scoreColor(pct)}1a`, color: scoreColor(pct) }}>{pct}%</span>
                        </div>
                      ) : <span className="mq-dash">—</span>}
                    </td>
                    <td data-label="Attempts" className="mq-center">
                      {quiz.multipleAttempts && quiz.maxAttempts
                        ? <><b>{quiz.attemptCount || 0}</b><div className="mq-attsub">of {quiz.maxAttempts}</div></>
                        : <><b>1</b><div className="mq-attsub">Single</div></>}
                    </td>
                    <td data-label="Action">
                      {canAttemptQuiz ? (
                        <button className="mq-action start" onClick={go}>▶ Start Quiz</button>
                      ) : attempted ? (
                        <button className="mq-action review" onClick={go}>👁 Review Quiz</button>
                      ) : (
                        <span className="mq-na">Not Available</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mq-foot">Showing {filteredQuizzes.length} of {filteredQuizzes.length} results</div>
        </div>
      )}
    </div>
  );
};

export default QuizzesPage;

import React, { useEffect, useState } from 'react';
import { quizApi } from '../../api';
import { Alert, Spinner, Button } from '../../components/common';
import { Quiz } from '../../types';
import './QuizzesPage.css';

const QuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'available' | 'completed' | 'pending'>('available');

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [quizzes, searchQuery, filterTab]);

  const loadQuizzes = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getAvailableQuizzes();
      setQuizzes(res.data || res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const filterQuizzes = () => {
    let filtered = quizzes.filter(quiz => {
      // IMPORTANT: Filter out quizzes with no questions
      if (!quiz.totalQuestions || quiz.totalQuestions === 0) {
        return false;
      }

      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const now = new Date();
      const startTime = new Date(`${quiz.startDate.split('T')[0]}T${quiz.startTime}`);
      const endTime = new Date(`${quiz.endDate.split('T')[0]}T${quiz.endTime}`);
      let statusMatch = true;
      if (filterTab === 'available') {
        // Show in available if:
        // 1. Quiz time is live AND
        // 2. Either: not attempted yet OR can take multiple attempts
        const canRetake = quiz.multipleAttempts && quiz.maxAttempts && (quiz.attemptCount || 0) < quiz.maxAttempts;
        statusMatch = now >= startTime && now <= endTime && (!quiz.isAttempted || canRetake);
      } else if (filterTab === 'completed') {
        // Show in completed if:
        // 1. Already attempted AND can't retake (no multiple attempts) OR
        // 2. Quiz time has ended
        const cantRetake = !quiz.multipleAttempts && quiz.isAttempted;
        statusMatch = (cantRetake || now > endTime);
      } else if (filterTab === 'pending') {
        statusMatch = now < startTime;
      }

      return matchesSearch && statusMatch;
    });

    setFilteredQuizzes(filtered);
  };

  const isQuizAlive = (quiz: Quiz): boolean => {
    const now = new Date();
    const startTime = new Date(`${quiz.startDate.split('T')[0]}T${quiz.startTime}`);
    const endTime = new Date(`${quiz.endDate.split('T')[0]}T${quiz.endTime}`);
    return now >= startTime && now <= endTime;
  };

  const getQuizStatus = (quiz: Quiz): 'pending' | 'live' | 'closed' => {
    const now = new Date();
    const startTime = new Date(`${quiz.startDate.split('T')[0]}T${quiz.startTime}`);
    const endTime = new Date(`${quiz.endDate.split('T')[0]}T${quiz.endTime}`);
    
    if (now < startTime) return 'pending';
    if (now > endTime) return 'closed';
    return 'live';
  };

  const canAttempt = (quiz: Quiz): boolean => {
    if (!isQuizAlive(quiz)) return false;
    
    if (!quiz.multipleAttempts) {
      // Single attempt quiz: can attempt only if not already attempted
      return !quiz.isAttempted;
    } else {
      // Multiple attempts quiz: can attempt only if maxAttempts is configured and not exceeded
      return quiz.maxAttempts ? (quiz.attemptCount || 0) < quiz.maxAttempts : false;
    }
  };

  const handleStartQuiz = (quizId: string) => {
    window.location.href = `/quiz/${quizId}/take`;
  };

  const handleViewResults = (quizId: string) => {
    quizApi.getLatestAttempt(quizId)
      .then((res: any) => {
        const attemptId = res?.data?._id || res?._id;
        if (attemptId) {
          window.location.href = `/quiz/${quizId}/results/${attemptId}`;
        }
      })
      .catch(() => alert('Failed to load attempt details'));
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="quizzes-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-text">
          <h1>📝 Quizzes</h1>
          <p className="subtitle">Take quizzes to test your knowledge</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Search and Filter */}
      <div className="search-filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="🔍 Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterTab === 'available' ? 'active' : ''}`}
            onClick={() => setFilterTab('available')}
          >
            ⏱️ Available ({quizzes.filter(q => (q.totalQuestions || 0) > 0 && isQuizAlive(q) && !q.isAttempted).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            ⏳ Pending ({quizzes.filter(q => (q.totalQuestions || 0) > 0 && new Date() < new Date(`${q.startDate.split('T')[0]}T${q.startTime}`)).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterTab('completed')}
          >
            ✅ Completed ({quizzes.filter(q => q.isAttempted || new Date() > new Date(`${q.endDate.split('T')[0]}T${q.endTime}`)).length})
          </button>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="quizzes-table-container">
        {filteredQuizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No quizzes found</h3>
            <p>
              {filterTab === 'available' && 'No quizzes available right now'}
              {filterTab === 'pending' && 'No quizzes pending'}
              {filterTab === 'completed' && 'No completed quizzes'}
            </p>
          </div>
        ) : (
          <table className="quizzes-table">
            <thead>
              <tr>
                <th>Quiz Title</th>
                <th>Status</th>
                <th>Questions</th>
                <th>Total Marks</th>
                <th>Duration</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Your Score</th>
                <th>Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map(quiz => {
                const status = getQuizStatus(quiz);
                const canAttemptQuiz = canAttempt(quiz);
                const attempted = quiz.isAttempted;

                return (
                  <tr key={quiz._id} className={`quiz-row ${status === 'closed' ? 'inactive' : ''}`}>
                    <td className="quiz-title-cell">
                      <strong>{quiz.title}</strong>
                      {quiz.description && <small>{quiz.description.substring(0, 50)}...</small>}
                    </td>
                    <td>
                      <span className={`status-badge ${status}`}>
                        {status === 'live' ? '🔴 Live' : status === 'pending' ? '⏳ Pending' : '⚫ Closed'}
                      </span>
                    </td>
                    <td className="center">{quiz.totalQuestions || 0}</td>
                    <td className="center">{quiz.totalMarks}</td>
                    <td className="center">{quiz.totalTime}m</td>
                    <td className="date-cell">{new Date(quiz.startDate).toLocaleDateString()}</td>
                    <td className="date-cell">{new Date(quiz.endDate).toLocaleDateString()}</td>
                    <td className="score-cell">
                      {attempted ? (
                        <span className={quiz.lastAttemptPassed ? 'passed' : 'failed'}>
                          {quiz.lastAttemptMarks}/{quiz.totalMarks}
                        </span>
                      ) : (
                        <span className="not-attempted">—</span>
                      )}
                    </td>
                    <td className="center">
                      {quiz.multipleAttempts && quiz.maxAttempts ? (
                        `${quiz.attemptCount || 0}/${quiz.maxAttempts}`
                      ) : (
                        <span>Single</span>
                      )}
                    </td>
                    <td className="actions-cell">
                      <div className="quiz-actions">
                        {canAttemptQuiz ? (
                          <Button onClick={() => handleStartQuiz(quiz._id)} className="btn-sm btn-primary">
                            Start
                          </Button>
                        ) : attempted && !canAttemptQuiz ? (
                          <>
                            <Button onClick={() => handleViewResults(quiz._id)} className="btn-sm btn-secondary">
                              Results
                            </Button>
                          </>
                        ) : status === 'closed' ? (
                          <span className="text-muted">Expired</span>
                        ) : (
                          <span className="text-muted">N/A</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default QuizzesPage;

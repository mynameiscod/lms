import React, { useEffect, useState, useCallback } from 'react';
import { quizApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Quiz } from '../../types';
import './QuizzesPage.css';

const QuizzesPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'available' | 'completed' | 'pending'>('available');

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

  const filterQuizzes = useCallback(() => {
    let filtered = quizzes.filter(quiz => {
      // Filter out quizzes with no questions (but keep attempted ones in Completed tab)
      if ((!quiz.totalQuestions || quiz.totalQuestions === 0) && !quiz.isAttempted) {
        return false;
      }

      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (quiz.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
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
        // 1. Student has attempted the quiz (any status) OR
        // 2. Quiz time has ended
        // 3. For multi-attempt: all attempts used up
        const allAttemptsUsed = quiz.multipleAttempts && quiz.maxAttempts && (quiz.attemptCount || 0) >= quiz.maxAttempts;
        statusMatch = (quiz.isAttempted || now > endTime || allAttemptsUsed);
      } else if (filterTab === 'pending') {
        statusMatch = now < startTime;
      }

      return matchesSearch && statusMatch;
    });

    setFilteredQuizzes(filtered);
  }, [quizzes, searchQuery, filterTab]);

  useEffect(() => {
    loadQuizzes();
  }, []);

  useEffect(() => {
    filterQuizzes();
  }, [filterQuizzes]);

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
          <h3 style={{ color: '#005897', margin: 0 }}>My Quiz</h3>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Filter */}
      <div className="search-filter-section">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterTab === 'available' ? 'active' : ''}`}
            onClick={() => setFilterTab('available')}
          >
            Available ({quizzes.filter(q => (q.totalQuestions || 0) > 0 && isQuizAlive(q) && !q.isAttempted).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            Pending ({quizzes.filter(q => (q.totalQuestions || 0) > 0 && new Date() < new Date(`${q.startDate.split('T')[0]}T${q.startTime}`)).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterTab('completed')}
          >
            Completed ({quizzes.filter(q => {
              const ended = new Date() > new Date(`${q.endDate.split('T')[0]}T${q.endTime}`);
              const allUsed = q.multipleAttempts && q.maxAttempts && (q.attemptCount || 0) >= q.maxAttempts;
              return q.isAttempted || ended || allUsed;
            }).length})
          </button>
        </div>
      </div>

      {/* Quizzes Table */}
      <div className="quizzes-table-container">
        {filteredQuizzes.length === 0 ? (
          <div className="empty-state">
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
                <th>Total Marks</th>
                <th>Your Score</th>
                <th>Attempts</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuizzes.map(quiz => {
                const status = getQuizStatus(quiz);
                const canAttemptQuiz = canAttempt(quiz);
                const attempted = quiz.isAttempted;

                const handleRowClick = () => {
                  if (canAttemptQuiz) {
                    handleStartQuiz(quiz._id);
                  } else if (attempted) {
                    handleViewResults(quiz._id);
                  }
                };

                return (
                  <tr 
                    key={quiz._id} 
                    className={`quiz-row ${status === 'closed' ? 'inactive' : ''} ${canAttemptQuiz || attempted ? 'clickable' : ''}`}
                    onClick={handleRowClick}
                    style={{ cursor: canAttemptQuiz || attempted ? 'pointer' : 'default' }}
                  >
                    <td className="quiz-title-cell">
                      <strong>{quiz.title}</strong>
                      {quiz.description && <small>{quiz.description.substring(0, 50)}...</small>}
                    </td>
                    <td>
                      <span className={`status-badge ${status}`}>
                        {status === 'live' ? 'Live' : status === 'pending' ? 'Pending' : 'Closed'}
                      </span>
                    </td>
                    <td className="center">{quiz.totalMarks}</td>
                    <td className="score-cell">
                      {attempted ? (
                        <span className={quiz.lastAttemptPassed ? 'passed' : 'failed'}>
                          {quiz.lastAttemptMarks || 0}/{quiz.totalMarks}
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
                    <td className="action-cell">
                      {canAttemptQuiz ? (
                        <span className="action-link start">Start Quiz →</span>
                      ) : attempted ? (
                        <span className="action-link view">View Results →</span>
                      ) : (
                        <span className="action-disabled">Not Available</span>
                      )}
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

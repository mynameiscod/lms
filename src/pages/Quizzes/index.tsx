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
      const matchesSearch = quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const now = new Date();
      const startDate = new Date(quiz.startDate);
      const endDate = new Date(quiz.endDate);
      const startTime = new Date(`${quiz.startDate.split('T')[0]}T${quiz.startTime}`);
      const endTime = new Date(`${quiz.endDate.split('T')[0]}T${quiz.endTime}`);

      let statusMatch = true;
      if (filterTab === 'available') {
        statusMatch = now >= startTime && now <= endTime && !quiz.isAttempted;
      } else if (filterTab === 'completed') {
        statusMatch = quiz.isAttempted || now > endTime;
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

  const canAttempt = (quiz: Quiz): boolean => {
    return isQuizAlive(quiz) && (!quiz.multipleAttempts ? !quiz.isAttempted : quiz.attemptCount < quiz.maxAttempts);
  };

  const handleStartQuiz = (quizId: string) => {
    window.location.href = `/quiz/${quizId}/take`;
  };

  const handleViewResults = (quizId: string) => {
    window.location.href = `/quiz/${quizId}/results`;
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
            ⏱️ Available ({quizzes.filter(q => isQuizAlive(q) && !q.isAttempted).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterTab('pending')}
          >
            ⏳ Pending ({quizzes.filter(q => new Date() < new Date(`${q.startDate.split('T')[0]}T${q.startTime}`)).length})
          </button>
          <button
            className={`filter-tab ${filterTab === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterTab('completed')}
          >
            ✅ Completed ({quizzes.filter(q => q.isAttempted || new Date() > new Date(`${q.endDate.split('T')[0]}T${q.endTime}`)).length})
          </button>
        </div>
      </div>

      {/* Quizzes Grid */}
      <div className="quizzes-container">
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
          <div className="quizzes-grid">
            {filteredQuizzes.map(quiz => {
              const alive = isQuizAlive(quiz);
              const canAttemptQuiz = canAttempt(quiz);
              const now = new Date();
              const endTime = new Date(`${quiz.endDate.split('T')[0]}T${quiz.endTime}`);
              const timeLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60)));

              return (
                <div key={quiz._id} className={`quiz-card ${!alive ? 'inactive' : ''}`}>
                  {/* Card Header */}
                  <div className="card-header">
                    <div className="header-content">
                      <h3>{quiz.title}</h3>
                      <span className={`status-badge ${alive ? 'live' : 'closed'}`}>
                        {alive ? '🔴 Live' : '⚫ Closed'}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="card-body">
                    <p className="description">{quiz.description}</p>

                    {/* Quiz Info */}
                    <div className="quiz-info-grid">
                      <div className="info-item">
                        <span className="info-label">Questions</span>
                        <span className="info-value">{quiz.totalQuestions}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Marks</span>
                        <span className="info-value">{quiz.totalMarks}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Duration</span>
                        <span className="info-value">{quiz.totalTime}m</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Pass %</span>
                        <span className="info-value">{Math.round((quiz.passingMarks / quiz.totalMarks) * 100)}%</span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="quiz-dates">
                      <small>
                        📅 {new Date(quiz.startDate).toLocaleDateString()} - {new Date(quiz.endDate).toLocaleDateString()}
                      </small>
                      {alive && timeLeft > 0 && (
                        <small className="time-left">
                          ⏰ {timeLeft} minutes left
                        </small>
                      )}
                    </div>

                    {/* Attempt Info */}
                    {quiz.isAttempted && (
                      <div className="attempt-info">
                        <div className="attempt-header">Latest Attempt</div>
                        <div className="score-display">
                          <span className="score">{quiz.lastAttemptMarks}/{quiz.totalMarks}</span>
                          <span className={`status ${quiz.lastAttemptPassed ? 'passed' : 'failed'}`}>
                            {quiz.lastAttemptPassed ? '✓ Passed' : '✗ Failed'}
                          </span>
                        </div>
                        {quiz.multipleAttempts && (
                          <small className="attempt-count">
                            Attempts: {quiz.attemptCount}/{quiz.maxAttempts}
                          </small>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className="card-footer">
                    {canAttemptQuiz ? (
                      <Button
                        onClick={() => handleStartQuiz(quiz._id)}
                        className="btn-primary btn-full"
                      >
                        ▶️ Start Quiz
                      </Button>
                    ) : alive && quiz.multipleAttempts && quiz.attemptCount >= quiz.maxAttempts ? (
                      <Button disabled className="btn-disabled btn-full">
                        ❌ Max Attempts Reached
                      </Button>
                    ) : !alive ? (
                      <Button disabled className="btn-disabled btn-full">
                        🔒 Quiz Closed
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleViewResults(quiz._id)}
                        className="btn-secondary btn-full"
                      >
                        📊 View Results
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizzesPage;

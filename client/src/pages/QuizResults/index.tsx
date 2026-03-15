import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner, Button } from '../../components/common';
import { QuizResult, Question } from '../../types';
import './QuizResultsPage.css';

const QuizResultsPage: React.FC = () => {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  // Format time taken as MM:SS or with seconds
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
  };

  // Get color based on percentage
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 70) return 'green';
    if (percentage >= 50) return 'orange';
    return 'red';
  };

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      if (!quizId || !attemptId) {
        setError('Missing quiz or attempt ID');
        return;
      }

      const resultRes = await quizApi.getResults(attemptId);
      const resultData = resultRes.data || resultRes;
      // Only fetch answers if showAnswersAfterSubmit is enabled
      const includeAnswers = resultData.quiz?.showAnswersAfterSubmit !== false;
      const questionsRes = includeAnswers
        ? await quizApi.getQuestionsWithAnswers(quizId)
        : await quizApi.getQuestionsWithoutAnswers(quizId);

      setResult(resultData);
      setQuestions(questionsRes.data || questionsRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [quizId, attemptId]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  const getOptionText = (option: any): string => {
    // Handle both string and object option formats
    if (typeof option === 'string') {
      return option;
    }
    return option?.text || '';
  };

  if (loading) return <Spinner fullScreen />;
  if (!result) return <Alert type="error" message={error || 'Failed to load results'} />;

  const percentage = result.attempt.obtainedMarks != null 
    ? (result.attempt.obtainedMarks / result.quiz.totalMarks) * 100 
    : 0;
  const isPassed = result.attempt.passed ?? false;
  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;
  const selectedSubmission = selectedQuestion && result.submissions?.find(s => s.questionId === selectedQuestion._id);

  return (
    <div className="quiz-results-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Results Header */}
      <div className="results-header">
        <div className="gradient-bg"></div>
        <div className="results-content">
          <h1>Quiz Results</h1>
          <p className="quiz-name">{result.quiz.title}</p>
        </div>
      </div>

      <div className="results-container">
        {/* Score Card */}
        <div className={`score-card ${isPassed ? 'passed' : 'failed'}`}>
          {result.quiz.showScoreAfterSubmit !== false ? (
            <>
              <div className="score-circle">
                <svg viewBox="0 0 120 120" className="progress-ring">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: getPercentageColor(percentage) === 'green' ? '#4caf50' : getPercentageColor(percentage) === 'orange' ? '#ff9800' : '#f44336', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="55" className="progress-ring-bg" />
                  <circle
                    cx="60"
                    cy="60"
                    r="55"
                    className={`progress-ring-circle ${getPercentageColor(percentage)}`}
                    style={{
                      strokeDasharray: `${(percentage / 100) * 345.575} 345.575`
                    }}
                  />
                </svg>
                <div className={`score-value ${getPercentageColor(percentage)}`}>
                  {Math.round(percentage)}%
                </div>
              </div>

              <div className="score-stats">
                <h2>{isPassed ? '🎉 Congratulations!' : '😔 Try Again'}</h2>
                <p className="status">{isPassed ? 'Quiz Passed' : 'Quiz Not Passed'}</p>

                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="label">Score Obtained</span>
                    <span className="value">{result.attempt.obtainedMarks}/{result.quiz.totalMarks}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Passing Marks</span>
                    <span className="value">{result.quiz.passingMarks || 0}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Time Taken</span>
                    <span className="value">{formatTime(result.attempt.timeSpent || 0)}</span>
                  </div>
                  {result.quiz.multipleAttempts && result.quiz.maxAttempts && (
                    <div className="stat-item">
                      <span className="label">Attempts Left</span>
                      <span className="value">{result.quiz.maxAttempts - (result.attempt.attemptNo || 1)}</span>
                    </div>
                  )}
                </div>

                <div className="action-buttons">
                  <Button onClick={() => window.location.href = `/quizzes`} className="btn-primary">
                    📚 Back to Quizzes
                  </Button>
                  {result.quiz.multipleAttempts && result.quiz.maxAttempts && result.quiz.maxAttempts - (result.attempt.attemptNo || 1) > 0 && (
                    <Button onClick={() => window.location.href = `/quiz/${quizId}/take`} className="btn-secondary">
                      🔄 Retry Quiz
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="score-stats">
              <h2>✅ Quiz Submitted Successfully</h2>
              <p className="status">Your responses have been recorded.</p>
              <div className="action-buttons">
                <Button onClick={() => window.location.href = `/quizzes`} className="btn-primary">
                  📚 Back to Quizzes
                </Button>
                {result.quiz.multipleAttempts && result.quiz.maxAttempts && result.quiz.maxAttempts - (result.attempt.attemptNo || 1) > 0 && (
                  <Button onClick={() => window.location.href = `/quiz/${quizId}/take`} className="btn-secondary">
                    🔄 Retry Quiz
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Detailed Results */}
        {result.quiz.allowReview !== false && (
        <div className="detailed-results">
          <h3>📋 Detailed Review</h3>

          <div className="results-layout">
            {/* Questions List */}
            <div className="questions-review-list">
              {questions.map((question, index) => {
                const submission = result.submissions?.find(s => s.questionId === question._id);
                const isCorrect = submission?.marksAwarded === question.marks;
                const isAttempted = submission && submission.studentAnswer;

                return (
                  <div
                    key={index}
                    className={`review-item ${selectedQuestionIndex === index ? 'active' : ''} ${
                      isCorrect ? 'correct' : isAttempted ? 'incorrect' : 'unattempted'
                    }`}
                    onClick={() => setSelectedQuestionIndex(index)}
                  >
                    <div className="review-item-header">
                      <span className="question-number">Q{index + 1}</span>
                      <span className={`status-icon ${isCorrect ? '✓' : isAttempted ? '✗' : '○'}`}>
                        {isCorrect ? '✓' : isAttempted ? '✗' : '○'}
                      </span>
                    </div>
                    <div className="review-item-title" title={question.questionText}>
                      {question.questionText}
                    </div>
                    {submission && (
                      <div className="review-item-marks">
                        {submission.marksAwarded}/{question.marks} marks
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Question Detail */}
            <div className="question-review-detail">
              {selectedQuestion ? (
                <div className="detail-content">
                  <div className="detail-header">
                    <h4>{selectedQuestion.questionText}</h4>
                    <span className={`detail-type ${selectedQuestion.type}`}>
                      {selectedQuestion.type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  {selectedSubmission ? (
                    <div className="submission-detail">
                      <div className={`marks-info ${selectedSubmission.marksAwarded === selectedQuestion.marks ? 'correct' : 'incorrect'}`}>
                        <strong>
                          {selectedSubmission.marksAwarded}/{selectedQuestion.marks} marks
                        </strong>
                        {selectedSubmission.marksAwarded === selectedQuestion.marks ? '✓' : '✗'}
                      </div>

                      <div className="answer-section">
                        <h5>Your Answer:</h5>
                        <div className="answer-box">
                          {selectedQuestion.type === 'mcq_single' || selectedQuestion.type === 'mcq_multiple' ? (
                            <div className="mcq-review">
                              {Array.isArray(selectedSubmission.studentAnswer) ? (
                                selectedSubmission.studentAnswer.map((ans, i) => (
                                  <div key={i} className="answer-item">
                                    ✓ {ans}
                                  </div>
                                ))
                              ) : selectedSubmission.studentAnswer ? (
                                // For string answers, split by comma if contains multiple answers
                                selectedSubmission.studentAnswer.split(',').map((ans, i) => (
                                  <div key={i} className="answer-item">
                                    ✓ {ans.trim()}
                                  </div>
                                ))
                              ) : (
                                <div className="answer-item">No answer provided</div>
                              )}
                            </div>
                          ) : selectedQuestion.type === 'short_answer' ? (
                            <p className="short-answer-review">{selectedSubmission.studentAnswer || 'No answer provided'}</p>
                          ) : selectedQuestion.type === 'coding' ? (
                            <pre className="code-review">{selectedSubmission.studentAnswer || 'No code submitted'}</pre>
                          ) : null}
                        </div>
                      </div>

                      {result.quiz.showAnswersAfterSubmit && (
                        <>
                          <div className="correct-answer-section">
                            <h5>Correct Answer:</h5>
                            <div className="correct-box">
                              {selectedQuestion.type === 'mcq_single' || selectedQuestion.type === 'mcq_multiple' ? (
                                <div className="mcq-review">
                                  {selectedQuestion.options && selectedQuestion.options.length > 0 ? (
                                    selectedQuestion.options
                                      .map((opt: any, optIndex: number) => {
                                        const optText = getOptionText(opt);
                                        // Check if this option is marked as correct
                                        const isCorrect = opt?.isCorrect === true ||
                                          (selectedQuestion.correctAnswers && (
                                            selectedQuestion.correctAnswers.includes(optText) ||
                                            selectedQuestion.correctAnswers.includes(String(optIndex))
                                          ));
                                        return { option: opt, text: optText, isCorrect, index: optIndex };
                                      })
                                      .filter((item: any) => item.isCorrect)
                                      .map((item: any, idx: number) => (
                                        <div key={idx} className="answer-item correct">
                                          ✓ {item.text}
                                        </div>
                                      ))
                                  ) : (
                                    <div className="answer-item">No correct answer available</div>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          {selectedQuestion.explanation && (
                            <div className="explanation-section">
                              <h5>💡 Explanation:</h5>
                              <p>{selectedQuestion.explanation}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="unattempted-message">
                      ⭕ You didn't attempt this question
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-detail">
                  <p>👆 Select a question to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsPage;

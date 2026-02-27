import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadResults();
  }, [quizId, attemptId]);

  const loadResults = async () => {
    try {
      setLoading(true);
      if (!quizId || !attemptId) {
        setError('Missing quiz or attempt ID');
        return;
      }

      const [resultRes, questionsRes] = await Promise.all([
        quizApi.getResults(attemptId),
        quizApi.getQuestionsWithAnswers(quizId)
      ]);

      setResult(resultRes.data || resultRes);
      setQuestions(questionsRes.data || questionsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner fullScreen />;
  if (!result) return <Alert type="error" message={error || 'Failed to load results'} />;

  const percentage = (result.attempt.obtainedMarks / result.quiz.totalMarks) * 100;
  const isPassed = result.attempt.passed;
  const selectedQuestion = selectedQuestionIndex !== null ? questions[selectedQuestionIndex] : null;
  const selectedSubmission = selectedQuestion && result.submissions?.find(s => s.questionId === selectedQuestion._id);

  return (
    <div className="quiz-results-page">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Results Header */}
      <div className="results-header">
        <div className="gradient-bg"></div>
        <div className="results-content">
          <h1>📊 Quiz Results</h1>
          <p className="quiz-name">{result.quiz.title}</p>
        </div>
      </div>

      <div className="results-container">
        {/* Score Card */}
        <div className={`score-card ${isPassed ? 'passed' : 'failed'}`}>
          <div className="score-circle">
            <svg viewBox="0 0 120 120" className="progress-ring">
              <circle cx="60" cy="60" r="55" className="progress-ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="55"
                className="progress-ring-circle"
                style={{
                  strokeDasharray: `${(percentage / 100) * 345.575} 345.575`
                }}
              />
            </svg>
            <div className="score-value">
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
                <span className="value">{Math.floor((result.attempt.timeSpent || 0) / 60)} min</span>
              </div>
              <div className="stat-item">
                <span className="label">Attempts Left</span>
                <span className="value">{(result.quiz.maxAttempts || 1) - (result.attempt.attemptNumber || 1)}</span>
              </div>
            </div>

            <div className="action-buttons">
              <Button onClick={() => window.location.href = `/quizzes`} className="btn-primary">
                📚 Back to Quizzes
              </Button>
              {(result.quiz.maxAttempts || 1) - (result.attempt.attemptNumber || 1) > 0 && (
                <Button onClick={() => window.location.href = `/quiz/${quizId}/take`} className="btn-secondary">
                  🔄 Retry Quiz
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="detailed-results">
          <h3>📋 Detailed Review</h3>

          <div className="results-layout">
            {/* Questions List */}
            <div className="questions-review-list">
              {questions.map((question, index) => {
                const submission = result.submissions?.find(s => s.questionId === question._id);
                const isCorrect = submission?.marksObtained === question.marks;
                const isAttempted = submission && submission.answer;

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
                        {submission.marksObtained}/{question.marks} marks
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
                      <div className={`marks-info ${selectedSubmission.marksObtained === selectedQuestion.marks ? 'correct' : 'incorrect'}`}>
                        <strong>
                          {selectedSubmission.marksObtained}/{selectedQuestion.marks} marks
                        </strong>
                        {selectedSubmission.marksObtained === selectedQuestion.marks ? '✓' : '✗'}
                      </div>

                      <div className="answer-section">
                        <h5>Your Answer:</h5>
                        <div className="answer-box">
                          {selectedQuestion.type === 'mcq_single' || selectedQuestion.type === 'mcq_multiple' ? (
                            <div className="mcq-review">
                              {Array.isArray(selectedSubmission.answer) ? (
                                selectedSubmission.answer.map((ans, i) => (
                                  <div key={i} className="answer-item">
                                    ✓ {ans}
                                  </div>
                                ))
                              ) : (
                                <div className="answer-item">✓ {selectedSubmission.answer}</div>
                              )}
                            </div>
                          ) : selectedQuestion.type === 'short_answer' ? (
                            <p className="short-answer-review">{selectedSubmission.answer}</p>
                          ) : selectedQuestion.type === 'coding' ? (
                            <pre className="code-review">{selectedSubmission.answer}</pre>
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
                                  {selectedQuestion.options
                                    ?.filter(opt => opt.isCorrect)
                                    .map((opt, i) => (
                                      <div key={i} className="answer-item correct">
                                        ✓ {opt.text}
                                      </div>
                                    ))}
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
      </div>
    </div>
  );
};

export default QuizResultsPage;

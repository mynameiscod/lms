import React, { useEffect, useState } from 'react';
import { quizApi } from '../../api';
import { Button, Spinner, Alert } from '../../components/common';
import '../QuizResults/index.css';

interface QuizResult {
  attemptId: string;
  quizTitle: string;
  studentName: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  totalTime: number;
  questionsAnswered: number;
  totalQuestions: number;
  submittedAt: string;
}

interface QuestionResult {
  questionId: string;
  questionText: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  marksAwarded: number;
  maxMarks: number;
  feedback?: string;
}

const QuizResultsPage: React.FC<{ attemptId: string }> = ({ attemptId }) => {
  const [result, setResult] = useState<QuizResult | null>(null);
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getStudentAttemptResults(attemptId);
      setResult(res.data?.attempt);
      setQuestionResults(res.data?.answers || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  if (!result) {
    return (
      <div className="results-container">
        <Alert type="error" message='Unable to load quiz results' onClose={() => {}} />
      </div>
    );
  }

  const formatTime = (minutes: number): string => {
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}m ${secs}s`;
  };

  const getResultClass = (): string => {
    return result.passed ? 'result-passed' : 'result-failed';
  };

  return (
    <div className="results-container">
      <div className="results-header">
        <h1>📊 Quiz Results</h1>
      </div>

      {/* Score Card */}
      <div className={`score-card ${getResultClass()}`}>
        <div className="score-main">
          <div className="score-circle">
            <div className="score-percentage">{Math.round(result.percentage)}</div>
            <div className="score-label">%</div>
          </div>

          <div className="score-details">
            <h2>{result.quizTitle}</h2>
            <p className="student-info">
              {result.studentName} • {new Date(result.submittedAt).toLocaleDateString()}
            </p>

            <div className="score-marks">
              <div className="marks-item">
                <span className="marks-label">Marks Obtained:</span>
                <span className="marks-value">{result.score}</span>
                <span className="marks-total">/ {result.totalMarks}</span>
              </div>

              <div className="marks-item">
                <span className="marks-label">Status:</span>
                <span className={`status-badge ${result.passed ? 'passed' : 'failed'}`}>
                  {result.passed ? '✅ PASSED' : '❌ FAILED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="score-stats">
          <div className="stat-item">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-label">Time Taken</div>
              <div className="stat-value">{formatTime(result.timeSpent / 60)}</div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <div className="stat-label">Questions</div>
              <div className="stat-value">
                {result.questionsAnswered} / {result.totalQuestions}
              </div>
            </div>
          </div>

          <div className="stat-item">
            <div className="stat-icon">⭐</div>
            <div className="stat-content">
              <div className="stat-label">Accuracy</div>
              <div className="stat-value">
                {Math.round((result.questionsAnswered / result.totalQuestions) * 100)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Review */}
      <div className="answers-review">
        <h3>📋 Answer Review</h3>

        <div className="answers-summary">
          <div className="summary-stat correct">
            <div className="summary-count">
              {questionResults.filter((q) => q.isCorrect).length}
            </div>
            <div className="summary-label">Correct</div>
          </div>

          <div className="summary-stat incorrect">
            <div className="summary-count">
              {questionResults.filter((q) => !q.isCorrect).length}
            </div>
            <div className="summary-label">Incorrect</div>
          </div>

          <div className="summary-stat">
            <div className="summary-count">
              {result.totalQuestions - result.questionsAnswered}
            </div>
            <div className="summary-label">Unanswered</div>
          </div>
        </div>

        <div className="questions-list">
          {questionResults.map((question, idx) => (
            <div
              key={question.questionId}
              className={`question-result ${question.isCorrect ? 'correct' : 'incorrect'}`}
            >
              <div
                className="question-header"
                onClick={() =>
                  setExpandedQuestion(
                    expandedQuestion === question.questionId ? null : question.questionId
                  )
                }
              >
                <div className="question-number">
                  <span className="number">{idx + 1}</span>
                  <span className={`result-icon ${question.isCorrect ? 'correct' : 'incorrect'}`}>
                    {question.isCorrect ? '✓' : '✗'}
                  </span>
                </div>

                <div className="question-title">
                  <p>{question.questionText}</p>
                </div>

                <div className="question-marks">
                  <span className="marks">
                    {question.marksAwarded} / {question.maxMarks}
                  </span>
                  <span className="expand-icon">
                    {expandedQuestion === question.questionId ? '▼' : '▶'}
                  </span>
                </div>
              </div>

              {expandedQuestion === question.questionId && (
                <div className="question-details">
                  <div className="answer-item your-answer">
                    <h4>Your Answer:</h4>
                    <p>{question.selectedAnswer}</p>
                  </div>

                  <div className="answer-item correct-answer">
                    <h4>Correct Answer:</h4>
                    <p>{question.correctAnswer}</p>
                  </div>

                  {question.feedback && (
                    <div className="answer-item feedback">
                      <h4>Explanation:</h4>
                      <p>{question.feedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="results-actions">
        <Button className="btn-primary" onClick={() => window.history.back()}>
          ← Back to Dashboard
        </Button>
        <Button className="btn-secondary" onClick={() => window.print()}>
          🖨️ Print Results
        </Button>
      </div>
    </div>
  );
};

export default QuizResultsPage;

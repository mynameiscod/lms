import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { quizApi } from '../../api';
import { Alert, Spinner, Button } from '../../components/common';
import './QuizResultsAdmin.css';

interface QuizSummary {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
  averageTimeSpent: number;
  medianScore: number;
  standardDeviation: number;
}

interface AttemptRecord {
  _id: string;
  studentName: string;
  studentEmail: string;
  attemptNo: number;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  timeSpent: number;
  questionsAnswered: number;
  submittedAt: string;
}

const QuizResultsAdminPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quizId = searchParams.get('quizId');

  const [summary, setSummary] = useState<QuizSummary | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-student answer-breakdown modal
  const [detailFor, setDetailFor] = useState<AttemptRecord | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');

  const openDetail = async (attempt: AttemptRecord) => {
    setDetailFor(attempt); setDetail(null); setDetailErr(''); setDetailLoading(true);
    try {
      const res = await quizApi.getAdminAttemptResults(attempt._id);
      setDetail(res.data || res);
    } catch (err: any) {
      setDetailErr(err?.message || 'Failed to load answer breakdown');
    } finally {
      setDetailLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const loadData = useCallback(async () => {
    if (!quizId) {
      setError('No quiz ID provided');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [summaryRes, attemptsRes] = await Promise.all([
        quizApi.getQuizReportSummary(quizId),
        quizApi.getQuizAttempts(quizId, 1, 100)
      ]);
      setSummary(summaryRes.data || summaryRes);
      const attemptsData = attemptsRes.data || attemptsRes;
      setAttempts(Array.isArray(attemptsData) ? attemptsData : attemptsData.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="quiz-results-admin">
      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="results-admin-header">
        <div>
          <h1>📊 Quiz Results</h1>
          {summary && <p className="quiz-title-sub">{summary.quizTitle}</p>}
        </div>
        <Button onClick={() => navigate('/quiz-management')} className="btn-secondary">
          ← Back to Quizzes
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon">👥</div>
            <div className="card-content">
              <span className="card-value">{summary.totalAttempts}</span>
              <span className="card-label">Total Attempts</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <span className="card-value">{Math.round(summary.averageScore)}%</span>
              <span className="card-label">Average Score</span>
            </div>
          </div>
          <div className="summary-card highlight">
            <div className="card-icon">🏆</div>
            <div className="card-content">
              <span className="card-value">{Math.round(summary.highestScore)}%</span>
              <span className="card-label">Highest Score</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">📉</div>
            <div className="card-content">
              <span className="card-value">{Math.round(summary.lowestScore)}%</span>
              <span className="card-label">Lowest Score</span>
            </div>
          </div>
          <div className={`summary-card ${summary.passRate >= 50 ? 'highlight' : 'warning'}`}>
            <div className="card-icon">✅</div>
            <div className="card-content">
              <span className="card-value">{Math.round(summary.passRate)}%</span>
              <span className="card-label">Pass Rate</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="card-icon">⏱️</div>
            <div className="card-content">
              <span className="card-value">{formatTime(Math.round(summary.averageTimeSpent))}</span>
              <span className="card-label">Avg Time</span>
            </div>
          </div>
        </div>
      )}

      {/* Attempts Table */}
      <div className="attempts-section">
        <h2>Student Attempts</h2>
        {attempts.length === 0 ? (
          <div className="no-attempts">
            <p>No attempts have been submitted for this quiz yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Email</th>
                  <th>Attempt #</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th>Time Spent</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((attempt) => (
                  <tr key={attempt._id} className={attempt.passed ? 'row-passed' : 'row-failed'}>
                    <td className="student-name">{attempt.studentName}</td>
                    <td className="student-email">{attempt.studentEmail}</td>
                    <td className="attempt-no">{attempt.attemptNo || 1}</td>
                    <td className="score">
                      {attempt.obtainedMarks}/{attempt.totalMarks}
                    </td>
                    <td className="percentage">
                      <span className={`pct ${(attempt.percentage || 0) >= 70 ? 'high' : (attempt.percentage || 0) >= 50 ? 'mid' : 'low'}`}>
                        {Math.round(attempt.percentage || 0)}%
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${attempt.passed ? 'passed' : 'failed'}`}>
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </span>
                    </td>
                    <td>{formatTime(attempt.timeSpent)}</td>
                    <td className="submitted-date">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString() + ' ' +
                          new Date(attempt.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                    <td>
                      <Button
                        onClick={() => openDetail(attempt)}
                        className="btn-action btn-sm"
                        title="View this student's answers (right/wrong)"
                      >
                        👁️
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-student answer breakdown modal */}
      {detailFor && (
        <div className="qra-overlay" onClick={() => setDetailFor(null)}>
          <div className="qra-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qra-modal-head">
              <div>
                <div className="qra-modal-title">{detailFor.studentName}</div>
                <div className="qra-modal-sub">{detailFor.studentEmail}</div>
              </div>
              <button className="qra-close" onClick={() => setDetailFor(null)}>×</button>
            </div>

            {detailLoading ? (
              <div className="qra-modal-body" style={{ textAlign: 'center', padding: 40 }}><Spinner /></div>
            ) : detailErr ? (
              <div className="qra-modal-body"><Alert type="error" message={detailErr} /></div>
            ) : detail ? (
              <div className="qra-modal-body">
                {/* Score summary */}
                <div className="qra-summary">
                  <div className="qra-sum-item"><span>Score</span><b>{detail.attempt.score}/{detail.attempt.totalMarks}</b></div>
                  <div className="qra-sum-item"><span>Percentage</span><b>{Math.round(detail.attempt.percentage || 0)}%</b></div>
                  <div className="qra-sum-item"><span>Result</span><b className={detail.attempt.passed ? 'qra-pass' : 'qra-fail'}>{detail.attempt.passed ? 'Passed' : 'Failed'}</b></div>
                  <div className="qra-sum-item"><span>Correct</span><b>{detail.answers.filter((a: any) => a.isCorrect).length}/{detail.answers.length}</b></div>
                </div>

                {/* Per-question breakdown */}
                <div className="qra-qlist">
                  {detail.answers.map((a: any, i: number) => (
                    <div key={i} className={`qra-q ${a.isCorrect ? 'ok' : 'bad'}`}>
                      <div className="qra-q-head">
                        <span className="qra-q-no">Q{a.questionNo || i + 1}</span>
                        <span className={`qra-q-badge ${a.isCorrect ? 'ok' : 'bad'}`}>{a.isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
                        <span className="qra-q-marks">{a.marksAwarded}/{a.maxMarks} marks</span>
                      </div>
                      {a.questionText && <div className="qra-q-text">{a.questionText}</div>}
                      <div className="qra-ans">
                        <div className="qra-ans-row">
                          <span className="qra-ans-label">Student's answer</span>
                          <span className={`qra-ans-val ${a.isCorrect ? 'ok' : 'bad'}`}>{a.selectedAnswer || 'Not answered'}</span>
                        </div>
                        {!a.isCorrect && a.correctAnswer && (
                          <div className="qra-ans-row">
                            <span className="qra-ans-label">Correct answer</span>
                            <span className="qra-ans-val ok">{a.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                      {a.explanation && <div className="qra-q-expl">💡 {a.explanation}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizResultsAdminPage;

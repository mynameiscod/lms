import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import './InterviewFeedbackReport.css';

const SCORE_COLOR = (score: number) => score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

const InterviewFeedbackReport: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    studentInterviewApi.getAttempt(attemptId)
      .then(res => setAttempt(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="ifr-loading">Loading report...</div>;
  if (!attempt) return <div className="ifr-empty">Report not found.</div>;

  const sections = attempt.sectionAttempts || [];

  return (
    <div className="ifr-container">
      <button className="ifr-back" onClick={() => navigate('/student/interviews')}>&larr; Back to Hub</button>

      {/* Header */}
      <div className="ifr-header">
        <h1>Interview Feedback Report</h1>
        <p className="ifr-subtitle">{attempt.templateId?.title || 'Interview'} — Attempt #{attempt.attemptNumber}</p>
      </div>

      {/* Overall Score */}
      <div className="ifr-overall">
        <div className="ifr-score-circle" style={{ borderColor: SCORE_COLOR(attempt.overallPercentage || 0) }}>
          <span className="ifr-score-value">{attempt.overallPercentage?.toFixed(1) || 0}%</span>
          <span className="ifr-score-label">Overall</span>
        </div>
        <div className="ifr-overall-details">
          <div className="ifr-detail"><span>Status</span><strong className={attempt.passStatus ? 'pass' : 'fail'}>{attempt.passStatus ? 'PASSED' : 'NEEDS IMPROVEMENT'}</strong></div>
          <div className="ifr-detail"><span>Readiness Level</span><strong>{attempt.readinessLevel || '—'}</strong></div>
          <div className="ifr-detail"><span>Total Score</span><strong>{attempt.overallScore?.toFixed(1) || 0}</strong></div>
          <div className="ifr-detail"><span>Started</span><strong>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : '—'}</strong></div>
          <div className="ifr-detail"><span>Completed</span><strong>{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : '—'}</strong></div>
          {attempt.evaluatedBy && <div className="ifr-detail"><span>Evaluated By</span><strong>{attempt.evaluatedBy === 'auto' ? 'Auto-graded' : 'Manual Review'}</strong></div>}
        </div>
      </div>

      {/* Overall Feedback */}
      {attempt.overallFeedback && (
        <div className="ifr-feedback-box">
          <h3>Overall Feedback</h3>
          <p>{attempt.overallFeedback}</p>
        </div>
      )}

      {/* Section-wise Results */}
      <div className="ifr-sections">
        <h2>Section-wise Results</h2>
        {sections.map((sec: any, idx: number) => {
          const isExpanded = expandedSection === idx;
          const sectionPct = sec.maxScore > 0 ? ((sec.totalScore / sec.maxScore) * 100) : 0;

          return (
            <div key={idx} className="ifr-section-card">
              <div className="ifr-section-header" onClick={() => setExpandedSection(isExpanded ? null : idx)}>
                <div className="ifr-section-title">
                  <h3>Section {idx + 1}: {sec.sectionTitle}</h3>
                  <span className="ifr-section-type">{sec.category}</span>
                </div>
                <div className="ifr-section-score" style={{ color: SCORE_COLOR(sectionPct) }}>
                  {sectionPct.toFixed(1)}%
                  <span className="ifr-section-raw">({sec.totalScore?.toFixed(1)}/{sec.maxScore})</span>
                </div>
                <span className="ifr-expand">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="ifr-section-body">
                  {/* Category-specific scores */}
                  {sec.categoryScores && (
                    <div className="ifr-cat-scores">
                      <h4>Category Breakdown</h4>
                      {Object.entries(sec.categoryScores as Record<string, any>)
                        .filter(([_, val]) => val && typeof val === 'object')
                        .map(([catKey, catScores]) => (
                          <div key={catKey} className="ifr-cat-group">
                            <h5>{catKey}</h5>
                            <div className="ifr-cat-metrics">
                              {Object.entries(catScores as Record<string, number>).map(([metric, score]) => (
                                <div key={metric} className="ifr-cat-metric">
                                  <span>{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  <div className="ifr-metric-bar-wrap">
                                    <div className="ifr-metric-bar" style={{ width: `${Math.min(100, (score as number) * 10)}%`, background: SCORE_COLOR((score as number) * 10) }} />
                                  </div>
                                  <span className="ifr-metric-val">{(score as number)?.toFixed(1)}/10</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Question-by-question */}
                  <h4>Question Details</h4>
                  {(sec.questions || []).map((q: any, qi: number) => (
                    <div key={qi} className="ifr-question">
                      <div className="ifr-q-header">
                        <span className="ifr-q-num">Q{qi + 1}</span>
                        <span className="ifr-q-text">{q.questionRef?.questionText || q.questionText || 'Question'}</span>
                        <span className="ifr-q-score" style={{ color: SCORE_COLOR(q.maxScore > 0 ? (q.scoreAwarded / q.maxScore) * 100 : 0) }}>
                          {q.scoreAwarded?.toFixed(1)}/{q.maxScore}
                        </span>
                      </div>
                      {q.textAnswer && (
                        <div className="ifr-q-answer">
                          <strong>Your Answer:</strong>
                          <p>{q.textAnswer}</p>
                        </div>
                      )}
                      {q.codeAnswer && (
                        <div className="ifr-q-answer">
                          <strong>Your Code:</strong>
                          <pre>{q.codeAnswer}</pre>
                        </div>
                      )}
                      {q.selectedMcqOption && (
                        <div className="ifr-q-answer">
                          <strong>Selected:</strong> {q.selectedMcqOption}
                        </div>
                      )}
                      {q.skippedAt && !q.answeredAt && (
                        <div className="ifr-q-skipped">⏭ Skipped</div>
                      )}
                      {q.evaluationNotes && (
                        <div className="ifr-q-feedback">
                          <strong>Feedback:</strong> {q.evaluationNotes}
                        </div>
                      )}
                      {q.evaluationBreakdown && Object.keys(q.evaluationBreakdown).length > 0 && (
                        <div className="ifr-q-breakdown">
                          {Object.entries(q.evaluationBreakdown as Record<string, number>).map(([key, val]) => (
                            <span key={key} className="ifr-breakdown-chip">
                              {key}: {(val as number)?.toFixed(1)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {attempt.recommendations && attempt.recommendations.length > 0 && (
        <div className="ifr-recommendations">
          <h2>Recommendations</h2>
          <ul>
            {attempt.recommendations.map((rec: string, i: number) => <li key={i}>{rec}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InterviewFeedbackReport;

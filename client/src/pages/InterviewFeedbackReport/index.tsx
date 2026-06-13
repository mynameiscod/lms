import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentInterviewApi } from '../../api/interviewModuleApi';
import './InterviewFeedbackReport.css';

const SCORE_COLOR = (score: number) => (score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444');

const PASS_LABEL: Record<string, { text: string; cls: string }> = {
  pass: { text: 'PASSED', cls: 'pass' },
  fail: { text: 'NEEDS IMPROVEMENT', cls: 'fail' },
  incomplete: { text: 'INCOMPLETE', cls: 'fail' },
  pending: { text: 'PENDING', cls: 'fail' },
};

const titleCase = (s: string) => (s || '').replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

const InterviewFeedbackReport: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  useEffect(() => {
    if (!attemptId) return;
    studentInterviewApi.getReport(attemptId)
      .then(res => setAttempt(res.data))
      .catch(() => setPending(true))   // report endpoint 404s while awaiting review
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) return <div className="ifr-loading">Loading report...</div>;

  if (pending || !attempt) {
    return (
      <div className="ifr-empty">
        <h2>Report not ready yet</h2>
        <p>Your interview has been submitted. The feedback report will appear here once evaluation is complete.</p>
        <button className="ifr-back" onClick={() => navigate('/student/interviews')}>&larr; Back to Hub</button>
      </div>
    );
  }

  const sections = attempt.sectionAttempts || [];
  const pass = PASS_LABEL[attempt.passStatus] || PASS_LABEL.pending;

  // section category scores live on one of these keyed objects
  const sectionCategory = (sec: any): Record<string, number> | null =>
    sec.communicationScores || sec.hrScores || sec.technicalScores || null;

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
          <span className="ifr-score-value">{(attempt.overallPercentage || 0).toFixed(1)}%</span>
          <span className="ifr-score-label">Overall</span>
        </div>
        <div className="ifr-overall-details">
          <div className="ifr-detail"><span>Status</span><strong className={pass.cls}>{pass.text}</strong></div>
          <div className="ifr-detail"><span>Readiness Level</span><strong>{titleCase(attempt.readinessLevel) || '—'}</strong></div>
          <div className="ifr-detail"><span>Total Score</span><strong>{(attempt.overallScore || 0).toFixed(1)} / {attempt.overallMaxScore || 0}</strong></div>
          <div className="ifr-detail"><span>Started</span><strong>{attempt.startedAt ? new Date(attempt.startedAt).toLocaleString() : '—'}</strong></div>
          <div className="ifr-detail"><span>Submitted</span><strong>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : '—'}</strong></div>
        </div>
      </div>

      {/* Overall Feedback */}
      {attempt.overallFeedback && (
        <div className="ifr-feedback-box">
          <h3>Overall Feedback</h3>
          <p>{attempt.overallFeedback}</p>
        </div>
      )}

      {/* Strengths & Weaknesses */}
      {(attempt.topStrengths?.length || attempt.topWeaknesses?.length) && (
        <div className="ifr-sw-grid">
          {attempt.topStrengths?.length > 0 && (
            <div className="ifr-feedback-box">
              <h3>💪 Top Strengths</h3>
              <ul>{attempt.topStrengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {attempt.topWeaknesses?.length > 0 && (
            <div className="ifr-feedback-box">
              <h3>🎯 Areas to Improve</h3>
              <ul>{attempt.topWeaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* Section-wise Results */}
      <div className="ifr-sections">
        <h2>Section-wise Results</h2>
        {sections.map((sec: any, idx: number) => {
          const isExpanded = expandedSection === idx;
          const sectionPct = sec.percentage ?? (sec.maxScore > 0 ? (sec.totalScore / sec.maxScore) * 100 : 0);
          const cat = sectionCategory(sec);

          return (
            <div key={idx} className="ifr-section-card">
              <div className="ifr-section-header" onClick={() => setExpandedSection(isExpanded ? null : idx)}>
                <div className="ifr-section-title">
                  <h3>Section {idx + 1}: {sec.sectionTitle}</h3>
                  <span className="ifr-section-type">{sec.sectionType}</span>
                </div>
                <div className="ifr-section-score" style={{ color: SCORE_COLOR(sectionPct) }}>
                  {sectionPct.toFixed(1)}%
                  <span className="ifr-section-raw">({(sec.totalScore || 0).toFixed(1)}/{sec.maxScore || 0})</span>
                </div>
                <span className="ifr-expand">{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div className="ifr-section-body">
                  {/* Category-specific scores */}
                  {cat && Object.values(cat).some(v => typeof v === 'number') && (
                    <div className="ifr-cat-scores">
                      <h4>Skill Breakdown</h4>
                      <div className="ifr-cat-metrics">
                        {Object.entries(cat)
                          .filter(([, v]) => typeof v === 'number')
                          .map(([metric, score]) => (
                            <div key={metric} className="ifr-cat-metric">
                              <span>{titleCase(metric)}</span>
                              <div className="ifr-metric-bar-wrap">
                                <div className="ifr-metric-bar" style={{ width: `${Math.min(100, (score as number) * 10)}%`, background: SCORE_COLOR((score as number) * 10) }} />
                              </div>
                              <span className="ifr-metric-val">{(score as number).toFixed(1)}/10</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Question-by-question */}
                  <h4>Question Details</h4>
                  {(sec.questionResponses || []).map((q: any, qi: number) => (
                    <div key={qi} className="ifr-question">
                      <div className="ifr-q-header">
                        <span className="ifr-q-num">Q{qi + 1}</span>
                        <span className="ifr-q-text">{q.questionText || 'Question'}</span>
                        <span className="ifr-q-score" style={{ color: SCORE_COLOR(q.maxScore > 0 ? (q.score / q.maxScore) * 100 : 0) }}>
                          {(q.score || 0).toFixed(1)}/{q.maxScore || 0}
                        </span>
                      </div>
                      {q.answerText && (
                        <div className="ifr-q-answer"><strong>Your Answer:</strong><p>{q.answerText}</p></div>
                      )}
                      {q.answerCode && (
                        <div className="ifr-q-answer"><strong>Your Code:</strong><pre>{q.answerCode}</pre></div>
                      )}
                      {q.selectedMCQOption && (
                        <div className="ifr-q-answer"><strong>Selected:</strong> {q.selectedMCQOption}</div>
                      )}
                      {q.status === 'skipped' && <div className="ifr-q-skipped">⏭ Skipped</div>}
                      {q.feedback && (
                        <div className="ifr-q-feedback"><strong>Feedback:</strong> {q.feedback}</div>
                      )}
                      {q.strengths?.length > 0 && (
                        <div className="ifr-q-breakdown">
                          {q.strengths.map((s: string, i: number) => <span key={i} className="ifr-breakdown-chip" style={{ background: '#dcfce7', color: '#166534' }}>✓ {s}</span>)}
                        </div>
                      )}
                      {q.weaknesses?.length > 0 && (
                        <div className="ifr-q-breakdown">
                          {q.weaknesses.map((s: string, i: number) => <span key={i} className="ifr-breakdown-chip" style={{ background: '#fee2e2', color: '#991b1b' }}>△ {s}</span>)}
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
      {attempt.recommendedPracticeAreas && attempt.recommendedPracticeAreas.length > 0 && (
        <div className="ifr-recommendations">
          <h2>Recommended Practice Areas</h2>
          <ul>
            {attempt.recommendedPracticeAreas.map((rec: string, i: number) => <li key={i}>{titleCase(rec)}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

export default InterviewFeedbackReport;

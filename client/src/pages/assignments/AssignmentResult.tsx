import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  assignmentApi,
  submissionApi,
  Assignment,
  Submission,
  SubmissionStatus,
  AssignmentType
} from '../../api/assignmentApi';
import './assignments.css';

const AssignmentResult: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!assignmentId) return;

      try {
        setLoading(true);
        const [assignmentRes, submissionRes] = await Promise.all([
          assignmentApi.getById(assignmentId),
          submissionApi.getMySubmission(assignmentId)
        ]);
        setAssignment(assignmentRes.data.data);
        setSubmission(submissionRes.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load results');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [assignmentId]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return '#10b981';
    if (percentage >= 70) return '#22c55e';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getGradeLabel = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 90) return 'Excellent! 🏆';
    if (percentage >= 80) return 'Great Job! 🌟';
    if (percentage >= 70) return 'Good Work! 👍';
    if (percentage >= 60) return 'Keep Practicing! 📚';
    if (percentage >= 50) return 'Needs Improvement 💪';
    return 'Review Material 📖';
  };

  const getPassFailStatus = () => {
    if (!assignment || !submission || submission.score === undefined) return null;
    const passingPoints = assignment.passingPoints || (assignment.totalPoints * 0.5);
    const isPassing = submission.score >= passingPoints;
    return {
      isPassing,
      label: isPassing ? 'PASSED' : 'FAILED',
      color: isPassing ? '#10b981' : '#ef4444',
      passingScore: passingPoints
    };
  };

  if (loading) {
    return (
      <div className="assignment-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="assignment-page">
        <div className="alert alert-error">{error || 'Assignment not found'}</div>
        <button className="btn btn-primary" onClick={() => navigate('/assignments')}>
          Back to Assignments
        </button>
      </div>
    );
  }

  if (!submission || submission.status === SubmissionStatus.NOT_STARTED) {
    return (
      <div className="assignment-page">
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <h3>Not Submitted Yet</h3>
          <p>You haven't submitted this assignment yet.</p>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/assignments/${assignmentId}/workspace`)}
          >
            Start Assignment
          </button>
        </div>
      </div>
    );
  }

  const scorePercentage = submission.score !== undefined 
    ? Math.round((submission.score / assignment.totalPoints) * 100) 
    : null;

  return (
    <div className="assignment-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/assignments')}
            style={{ marginBottom: '8px' }}
          >
            ← Back to Assignments
          </button>
          <h1>📊 Assignment Results</h1>
          <p>{assignment.title}</p>
        </div>
      </div>

      {/* Score Card */}
      <div className="form-section" style={{ textAlign: 'center', padding: '40px' }}>
        {submission.status === SubmissionStatus.GRADED ? (
          <>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: `conic-gradient(${getScoreColor(submission.score!, assignment.totalPoints)} ${scorePercentage}%, #e5e7eb ${scorePercentage}%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: 700,
                  color: getScoreColor(submission.score!, assignment.totalPoints)
                }}>
                  {scorePercentage}%
                </div>
              </div>
            </div>
            
            {/* Pass/Fail Badge */}
            {(() => {
              const passFailStatus = getPassFailStatus();
              if (passFailStatus) {
                return (
                  <div style={{
                    display: 'inline-block',
                    padding: '8px 24px',
                    borderRadius: '20px',
                    background: passFailStatus.isPassing ? '#dcfce7' : '#fee2e2',
                    color: passFailStatus.color,
                    fontWeight: 700,
                    fontSize: '18px',
                    marginBottom: '16px',
                    border: `2px solid ${passFailStatus.color}`
                  }}>
                    {passFailStatus.isPassing ? '✓' : '✗'} {passFailStatus.label}
                  </div>
                );
              }
              return null;
            })()}
            
            <h2 style={{ 
              marginBottom: '8px',
              color: getScoreColor(submission.score!, assignment.totalPoints)
            }}>
              {submission.score} / {assignment.totalPoints} points
            </h2>
            
            <p style={{ fontSize: '18px', color: '#6b7280', marginBottom: '4px' }}>
              {getGradeLabel(submission.score!, assignment.totalPoints)}
            </p>
            
            {/* Passing score info */}
            {(() => {
              const passFailStatus = getPassFailStatus();
              if (passFailStatus) {
                return (
                  <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                    Passing score: {passFailStatus.passingScore} points
                  </p>
                );
              }
              return null;
            })()}
          </>
        ) : (
          <>
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: '48px'
            }}>
              ⏳
            </div>
            <h2 style={{ marginBottom: '8px', color: '#f59e0b' }}>Pending Review</h2>
            <p style={{ color: '#6b7280' }}>
              Your submission is being reviewed. You'll be notified when it's graded.
            </p>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div className="stat-value" style={{ fontSize: '16px' }}>
            {submission.status === SubmissionStatus.GRADED ? '✅ Graded' : '📤 Submitted'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Submitted At</div>
          <div className="stat-value" style={{ fontSize: '14px' }}>
            {formatDate(submission.submittedAt)}
          </div>
        </div>
        {submission.gradedAt && (
          <div className="stat-card">
            <div className="stat-label">Graded At</div>
            <div className="stat-value" style={{ fontSize: '14px' }}>
              {formatDate(submission.gradedAt)}
            </div>
          </div>
        )}
        {assignment.type === AssignmentType.CODING && submission.testResults && (
          <div className="stat-card">
            <div className="stat-label">Tests Passed</div>
            <div className="stat-value">
              {submission.testResults.filter(t => t.passed).length} / {submission.testResults.length}
            </div>
          </div>
        )}
      </div>

      {/* Feedback Section */}
      {submission.feedback && (
        <div className="form-section">
          <h3 className="section-title">💬 Instructor Feedback</h3>
          <div style={{
            padding: '20px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            lineHeight: 1.6
          }}>
            {submission.feedback}
          </div>
        </div>
      )}

      {/* Test Results for Coding */}
      {assignment.type === AssignmentType.CODING && submission.testResults && (
        <div className="form-section">
          <h3 className="section-title">🧪 Test Results</h3>
          <div className="test-results">
            {submission.testResults.map((result, index) => (
              <div 
                key={index}
                className={`test-result-item ${result.passed ? 'passed' : 'failed'}`}
              >
                <span className="test-result-icon">
                  {result.passed ? '✅' : '❌'}
                </span>
                <div className="test-result-info">
                  <span className="test-result-name">
                    Test Case #{result.testCaseIndex + 1}
                  </span>
                  {result.error && (
                    <span className="test-result-message" style={{ color: '#ef4444' }}>
                      {result.error}
                    </span>
                  )}
                </div>
                <span className="test-result-time">{result.executionTime}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MCQ Results */}
      {assignment.type === AssignmentType.MCQ && submission.mcqAnswers && (
        <div className="form-section">
          <h3 className="section-title">📋 Quiz Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {assignment.mcqQuestions.map((q, qIndex) => {
              const answer = submission.mcqAnswers?.find(a => a.questionIndex === qIndex);
              const isCorrect = answer?.isCorrect;
              const correctIndex = q.options.findIndex(o => o.isCorrect);
              
              return (
                <div key={qIndex} className="mcq-card">
                  <div className="mcq-header" style={{
                    background: isCorrect ? '#f0fdf4' : '#fef2f2'
                  }}>
                    <span>Question {qIndex + 1}</span>
                    <span style={{ 
                      color: isCorrect ? '#10b981' : '#ef4444',
                      fontWeight: 600
                    }}>
                      {isCorrect ? '+' + q.points + ' ✓' : '0 ✗'}
                    </span>
                  </div>
                  <div className="mcq-content">
                    <p style={{ fontWeight: 500, marginBottom: '16px' }}>{q.question}</p>
                    <div className="mcq-options">
                      {q.options.map((opt, oIndex) => {
                        const wasSelected = answer?.selectedOption === oIndex;
                        const isCorrectOption = opt.isCorrect;
                        
                        let bgColor = 'transparent';
                        if (isCorrectOption) bgColor = '#f0fdf4';
                        else if (wasSelected && !isCorrectOption) bgColor = '#fef2f2';
                        
                        return (
                          <div 
                            key={oIndex}
                            className="mcq-option"
                            style={{ 
                              background: bgColor,
                              borderColor: isCorrectOption ? '#10b981' : (wasSelected ? '#ef4444' : '#e5e7eb')
                            }}
                          >
                            <span style={{ marginRight: '8px' }}>
                              {isCorrectOption && '✓'}
                              {wasSelected && !isCorrectOption && '✗'}
                            </span>
                            <span>{opt.text}</span>
                            {wasSelected && (
                              <span style={{ 
                                marginLeft: 'auto', 
                                fontSize: '12px',
                                color: '#6b7280'
                              }}>
                                Your answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {assignment.settings?.showCorrectAnswers && q.explanation && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: '#eff6ff',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}>
                        <strong>💡 Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rubric Scores */}
      {submission.rubricScores && submission.rubricScores.length > 0 && (
        <div className="form-section">
          <h3 className="section-title">📊 Grading Breakdown</h3>
          <div className="grading-rubric">
            {submission.rubricScores.map((rs, index) => {
              const rubricItem = assignment.rubric?.find(r => r.criterion === rs.criterion);
              const percentage = rubricItem ? (rs.score / rubricItem.maxPoints) * 100 : 0;
              
              return (
                <div key={index} className="rubric-item" style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <strong>{rs.criterion}</strong>
                      {rubricItem?.description && (
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                          {rubricItem.description}
                        </p>
                      )}
                    </div>
                    <div style={{ fontWeight: 600 }}>
                      {rs.score} / {rubricItem?.maxPoints || 0}
                    </div>
                  </div>
                  <div style={{
                    height: '8px',
                    background: '#e5e7eb',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: percentage >= 70 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444',
                      transition: 'width 0.3s'
                    }} />
                  </div>
                  {rs.feedback && (
                    <p style={{ 
                      marginTop: '8px', 
                      fontSize: '14px', 
                      color: '#6b7280',
                      fontStyle: 'italic'
                    }}>
                      "{rs.feedback}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submitted Code */}
      {(assignment.type === AssignmentType.CODING || assignment.type === AssignmentType.SQL) && submission.code && (
        <div className="form-section">
          <h3 className="section-title">💻 Your Code</h3>
          <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '8px 16px',
              background: '#2d2d2d',
              color: '#9ca3af',
              fontSize: '14px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>{submission.language}</span>
            </div>
            <pre style={{
              padding: '16px',
              margin: 0,
              overflow: 'auto',
              maxHeight: '400px',
              color: '#d4d4d4',
              fontSize: '14px',
              lineHeight: 1.5
            }}>
              {submission.code}
            </pre>
          </div>
        </div>
      )}

      {/* Theory Answer */}
      {assignment.type === AssignmentType.THEORY && submission.theoryAnswer && (
        <div className="form-section">
          <h3 className="section-title">📝 Your Answer</h3>
          <div style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '8px',
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6
          }}>
            {submission.theoryAnswer}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '12px',
        marginTop: '24px'
      }}>
        <button 
          className="btn btn-secondary"
          onClick={() => navigate('/assignments')}
        >
          ← Back to Assignments
        </button>
      </div>
    </div>
  );
};

export default AssignmentResult;

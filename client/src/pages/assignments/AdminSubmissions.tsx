import React, { useState, useEffect, useCallback } from 'react';
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

const AdminSubmissions: React.FC = () => {
  const navigate = useNavigate();
  const { assignmentId } = useParams<{ assignmentId: string }>();
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reattemptLoading, setReattemptLoading] = useState<string | null>(null);

  // Grading modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradingScore, setGradingScore] = useState(0);
  const [gradingFeedback, setGradingFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [grading, setGrading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadData = useCallback(async () => {
    if (!assignmentId) return;
    
    try {
      setLoading(true);
      const [assignmentRes, submissionsRes] = await Promise.all([
        assignmentApi.getById(assignmentId),
        assignmentApi.getSubmissions(assignmentId)
      ]);
      setAssignment(assignmentRes.data.data);
      setSubmissions(submissionsRes.data.data);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openGrading = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradingScore(submission.score || 0);
    setGradingFeedback(submission.feedback || '');
    
    // Initialize rubric scores
    if (submission.rubricScores) {
      const scores: Record<string, number> = {};
      submission.rubricScores.forEach(rs => {
        scores[rs.criterion] = rs.score;
      });
      setRubricScores(scores);
    } else {
      const scores: Record<string, number> = {};
      assignment?.rubric?.forEach(r => {
        scores[r.criterion] = 0;
      });
      setRubricScores(scores);
    }
  };

  const closeGrading = () => {
    setSelectedSubmission(null);
    setGradingScore(0);
    setGradingFeedback('');
    setRubricScores({});
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;

    try {
      setGrading(true);
      
      const rubricScoresArray = assignment?.rubric?.map(r => ({
        criterion: r.criterion,
        score: rubricScores[r.criterion] || 0
      })) || [];

      await submissionApi.grade(selectedSubmission._id, {
        score: gradingScore,
        feedback: gradingFeedback,
        rubricScores: rubricScoresArray
      });

      closeGrading();
      loadData();
    } catch (err) {
      setError('Failed to save grade');
    } finally {
      setGrading(false);
    }
  };

  const handleAllowReattempt = async (submissionId: string) => {
    if (!window.confirm('Are you sure you want to allow this student to reattempt? This will reset their current submission.')) {
      return;
    }
    
    try {
      setReattemptLoading(submissionId);
      await submissionApi.allowReattempt(submissionId);
      loadData();
    } catch (err) {
      setError('Failed to allow reattempt');
    } finally {
      setReattemptLoading(null);
    }
  };

  const calculateRubricTotal = () => {
    return Object.values(rubricScores).reduce((sum, score) => sum + score, 0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: SubmissionStatus) => {
    const statusMap: Record<SubmissionStatus, { class: string; label: string }> = {
      [SubmissionStatus.NOT_STARTED]: { class: 'badge-draft', label: 'Not Started' },
      [SubmissionStatus.IN_PROGRESS]: { class: 'badge-published', label: 'In Progress' },
      [SubmissionStatus.SUBMITTED]: { class: 'badge-warning', label: 'In Review' },
      [SubmissionStatus.GRADED]: { class: 'badge-success', label: 'Graded' },
      [SubmissionStatus.LATE]: { class: 'badge-danger', label: 'Late' }
    };
    const s = statusMap[status] || { class: '', label: status };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const filteredSubmissions = statusFilter
    ? submissions.filter(s => s.status === statusFilter)
    : submissions;

  if (loading) {
    return (
      <div className="assignment-page">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="assignment-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/admin/assignments')}
            style={{ marginBottom: '8px' }}
          >
            ← Back to Assignments
          </button>
          <h1>📊 Submissions</h1>
          <p>{assignment?.title}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Submissions</div>
          <div className="stat-value">{submissions.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Submitted</div>
          <div className="stat-value">
            {submissions.filter(s => s.status === SubmissionStatus.SUBMITTED || s.status === SubmissionStatus.GRADED).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Graded</div>
          <div className="stat-value">
            {submissions.filter(s => s.status === SubmissionStatus.GRADED).length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Average Score</div>
          <div className="stat-value">
            {submissions.filter(s => s.score !== undefined).length > 0
              ? Math.round(
                  submissions.filter(s => s.score !== undefined).reduce((sum, s) => sum + (s.score || 0), 0) /
                  submissions.filter(s => s.score !== undefined).length
                )
              : '-'}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
          <button 
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setError(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="submitted">Submitted (needs grading)</option>
            <option value="graded">Graded</option>
            <option value="in_progress">In Progress</option>
            <option value="late">Late</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No Submissions Yet</h3>
          <p>Students haven't submitted any work for this assignment</p>
        </div>
      ) : (
        <div className="form-section">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Started</th>
                <th>Submitted</th>
                <th>Score</th>
                {assignment?.type === AssignmentType.CODING && <th>Tests Passed</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.map((submission) => (
                <tr key={submission._id}>
                  <td className="title-cell">
                    <div style={{ fontWeight: 500 }}>
                      {typeof submission.student === 'object' 
                        ? submission.student.name || submission.student.email
                        : 'Student'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {typeof submission.student === 'object' ? submission.student.email : ''}
                    </div>
                  </td>
                  <td>{getStatusBadge(submission.status)}</td>
                  <td>{formatDate(submission.startedAt)}</td>
                  <td>{formatDate(submission.submittedAt)}</td>
                  <td>
                    {submission.score !== undefined ? (
                      <strong>{submission.score} / {assignment?.totalPoints}</strong>
                    ) : (
                      '-'
                    )}
                  </td>
                  {assignment?.type === AssignmentType.CODING && (
                    <td>
                      {submission.testResults ? (
                        <span>
                          {submission.testResults.filter(t => t.passed).length} / {submission.testResults.length}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
                  <td className="actions-cell">
                    {(submission.status === SubmissionStatus.SUBMITTED || 
                      submission.status === SubmissionStatus.GRADED ||
                      submission.status === SubmissionStatus.LATE) && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openGrading(submission)}
                        >
                          {submission.status === SubmissionStatus.GRADED ? 'View/Edit Grade' : 'Grade'}
                        </button>
                        {submission.status === SubmissionStatus.GRADED && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleAllowReattempt(submission._id)}
                            disabled={reattemptLoading === submission._id}
                            style={{ marginLeft: '8px' }}
                          >
                            {reattemptLoading === submission._id ? 'Resetting...' : 'Allow Reattempt'}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Grading Modal */}
      {selectedSubmission && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            width: '800px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0 }}>Grade Submission</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280' }}>
                  {typeof selectedSubmission.student === 'object' 
                    ? selectedSubmission.student.name || selectedSubmission.student.email
                    : 'Student'}
                </p>
              </div>
              <button
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  fontSize: '24px', 
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
                onClick={closeGrading}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Submission Content */}
              {assignment?.type === AssignmentType.CODING && selectedSubmission.code && (
                <div className="form-group">
                  <label className="form-label">Submitted Code</label>
                  <pre style={{
                    background: '#1e1e1e',
                    color: '#d4d4d4',
                    padding: '16px',
                    borderRadius: '8px',
                    overflow: 'auto',
                    maxHeight: '300px',
                    fontSize: '14px'
                  }}>
                    {selectedSubmission.code}
                  </pre>
                </div>
              )}

              {assignment?.type === AssignmentType.THEORY && selectedSubmission.theoryAnswer && (
                <div className="form-group">
                  <label className="form-label">Submitted Answer</label>
                  <div style={{
                    background: '#f9fafb',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '300px',
                    overflow: 'auto'
                  }}>
                    {selectedSubmission.theoryAnswer}
                  </div>
                </div>
              )}

              {/* Test Results for Coding */}
              {assignment?.type === AssignmentType.CODING && selectedSubmission.testResults && (
                <div className="form-group">
                  <label className="form-label">Test Results</label>
                  <div className="test-results">
                    {selectedSubmission.testResults.map((result, index) => (
                      <div 
                        key={index}
                        className={`test-result-item ${result.passed ? 'passed' : 'failed'}`}
                      >
                        <span className="test-result-icon">
                          {result.passed ? '✓' : '✕'}
                        </span>
                        <div className="test-result-info">
                          <span className="test-result-name">Test #{result.testCaseIndex + 1}</span>
                          {!result.passed && result.error && (
                            <span className="test-result-message">{result.error}</span>
                          )}
                        </div>
                        <span className="test-result-time">{result.executionTime}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MCQ Results */}
              {assignment?.type === AssignmentType.MCQ && selectedSubmission.mcqAnswers && (
                <div className="form-group">
                  <label className="form-label">MCQ Answers</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assignment.mcqQuestions.map((q, index) => {
                      const answer = selectedSubmission.mcqAnswers?.find(a => a.questionIndex === index);
                      const isCorrect = answer?.isCorrect;
                      return (
                        <div 
                          key={index}
                          style={{
                            padding: '12px',
                            background: isCorrect ? '#ecfdf5' : '#fef2f2',
                            borderRadius: '8px',
                            border: `1px solid ${isCorrect ? '#10b981' : '#ef4444'}`
                          }}
                        >
                          <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                            Q{index + 1}: {q.question}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            Answer: {q.options[answer?.selectedOption || 0]?.text}
                            {isCorrect ? ' ✓' : ' ✕'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rubric Grading */}
              {assignment?.rubric && assignment.rubric.length > 0 && (
                <div className="grading-rubric">
                  <label className="form-label">Rubric Grading</label>
                  {assignment.rubric.map((item, index) => (
                    <div key={index} className="rubric-item" style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong>{item.criterion}</strong>
                          {item.description && (
                            <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#6b7280' }}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="number"
                            className="form-control"
                            style={{ width: '80px' }}
                            value={rubricScores[item.criterion] || 0}
                            onChange={(e) => setRubricScores({
                              ...rubricScores,
                              [item.criterion]: Math.min(item.maxPoints, Math.max(0, Number(e.target.value)))
                            })}
                            min={0}
                            max={item.maxPoints}
                          />
                          <span>/ {item.maxPoints}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div style={{ 
                    padding: '12px', 
                    background: '#f3f4f6', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <strong>Rubric Total:</strong>
                    <strong>{calculateRubricTotal()} / {assignment.rubric.reduce((sum, r) => sum + r.maxPoints, 0)}</strong>
                  </div>
                </div>
              )}

              {/* Overall Score */}
              <div className="form-row" style={{ marginTop: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Final Score</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      className="form-control"
                      style={{ width: '100px' }}
                      value={gradingScore}
                      onChange={(e) => setGradingScore(Number(e.target.value))}
                      min={0}
                      max={assignment?.totalPoints || 100}
                    />
                    <span>/ {assignment?.totalPoints || 100}</span>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              <div className="form-group">
                <label className="form-label">Feedback</label>
                <textarea
                  className="form-control"
                  value={gradingFeedback}
                  onChange={(e) => setGradingFeedback(e.target.value)}
                  placeholder="Provide constructive feedback to the student..."
                  rows={4}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button className="btn btn-secondary" onClick={closeGrading}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleGrade}
                disabled={grading}
              >
                {grading ? 'Saving...' : 'Save Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubmissions;

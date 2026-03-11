import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  submissionApi,
  Assignment,
  SubmissionStatus,
  AssignmentType,
  DifficultyLevel
} from '../../api/assignmentApi';
import './assignments.css';

// Helper function to strip HTML tags for preview
const stripHtml = (html: string): string => {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

interface StudentAssignment extends Assignment {
  submission?: {
    _id: string;
    status: SubmissionStatus;
    score?: number;
    submittedAt?: string;
  };
}

const StudentAssignmentList: React.FC = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await submissionApi.getMyAssignments();
      setAssignments(response.data.data);
    } catch (err) {
      setError('Failed to load assignments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const getSubmissionStatus = (assignment: StudentAssignment) => {
    if (!assignment.submission) return 'not_started';
    return assignment.submission.status;
  };

  const isOverdue = (assignment: StudentAssignment) => {
    if (!assignment.dueDate) return false;
    const status = getSubmissionStatus(assignment);
    if (status === 'submitted' || status === 'graded') return false;
    return new Date(assignment.dueDate) < new Date();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays === 0) return 'Due today!';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getTypeIcon = (type: AssignmentType) => {
    const icons: Record<AssignmentType, string> = {
      [AssignmentType.CODING]: '💻',
      [AssignmentType.MCQ]: '📋',
      [AssignmentType.THEORY]: '📝',
      [AssignmentType.PROJECT]: '🚀',
      [AssignmentType.FILE_UPLOAD]: '📎',
      [AssignmentType.SQL]: '🗄️'
    };
    return icons[type] || '📄';
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    const colors: Record<DifficultyLevel, string> = {
      [DifficultyLevel.BEGINNER]: '#10b981',
      [DifficultyLevel.EASY]: '#22c55e',
      [DifficultyLevel.MEDIUM]: '#f59e0b',
      [DifficultyLevel.HARD]: '#ef4444',
      [DifficultyLevel.EXPERT]: '#7c3aed'
    };
    return colors[difficulty] || '#6b7280';
  };

  const getStatusInfo = (assignment: StudentAssignment) => {
    const status = getSubmissionStatus(assignment);
    const statusMap: Record<string, { color: string; label: string; icon: string }> = {
      not_started: { color: '#6b7280', label: 'Not Started', icon: '⏸️' },
      in_progress: { color: '#3b82f6', label: 'In Progress', icon: '🔄' },
      submitted: { color: '#f59e0b', label: 'Submitted', icon: '📤' },
      graded: { color: '#10b981', label: 'Graded', icon: '✅' },
      late: { color: '#ef4444', label: 'Late', icon: '⚠️' }
    };
    return statusMap[status] || statusMap.not_started;
  };

  const handleStartAssignment = (assignment: StudentAssignment) => {
    const status = getSubmissionStatus(assignment);
    if (status === 'graded') {
      navigate(`/assignments/${assignment._id}/result`);
    } else {
      navigate(`/assignments/${assignment._id}/workspace`);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter) {
      const status = getSubmissionStatus(a);
      if (statusFilter === 'pending' && (status === 'submitted' || status === 'graded')) return false;
      if (statusFilter === 'completed' && status !== 'graded') return false;
    }
    return true;
  });

  // Stats
  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => getSubmissionStatus(a) === 'graded').length,
    pending: assignments.filter(a => ['not_started', 'in_progress'].includes(getSubmissionStatus(a))).length,
    overdue: assignments.filter(a => isOverdue(a)).length
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

  return (
    <div className="assignment-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>📚 My Assignments</h1>
          <p>View and complete your assigned work</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Assignments</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: '#10b981' }}>{stats.completed}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.pending}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: '#ef4444' }}>{stats.overdue}</div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-error">
          <i className="bi bi-exclamation-triangle"></i>
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Type:</label>
          <select 
            value={typeFilter} 
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="coding">💻 Coding</option>
            <option value="mcq">📋 Quiz</option>
            <option value="theory">📝 Theory</option>
            <option value="project">🚀 Project</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Assignments Table */}
      {filteredAssignments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎉</div>
          <h3>No Assignments</h3>
          <p>You're all caught up! Check back later for new assignments.</p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="assignment-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Assignment</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Type</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Difficulty</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Points</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Due Date</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Status</th>
                <th style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Score</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: '#475569' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map((assignment) => {
                const statusInfo = getStatusInfo(assignment);
                const overdue = isOverdue(assignment);
                const status = getSubmissionStatus(assignment);
                
                return (
                  <tr 
                    key={assignment._id}
                    style={{ 
                      borderBottom: '1px solid #e2e8f0',
                      backgroundColor: overdue ? '#fef2f2' : 'white',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = overdue ? '#fee2e2' : '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = overdue ? '#fef2f2' : 'white'}
                  >
                    {/* Assignment Title */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '14px' }}>
                          {assignment.title}
                        </span>
                        {assignment.topics.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {assignment.topics.slice(0, 2).map((topic, i) => (
                              <span 
                                key={i} 
                                style={{ 
                                  fontSize: '11px', 
                                  padding: '2px 8px', 
                                  backgroundColor: '#e0f2fe', 
                                  color: '#0369a1',
                                  borderRadius: '12px'
                                }}
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Type */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        fontSize: '13px',
                        color: '#475569'
                      }}>
                        {getTypeIcon(assignment.type)}
                        <span style={{ textTransform: 'capitalize' }}>{assignment.type}</span>
                      </span>
                    </td>
                    
                    {/* Difficulty */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-block',
                        padding: '4px 10px', 
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: getDifficultyColor(assignment.difficulty) + '20',
                        color: getDifficultyColor(assignment.difficulty)
                      }}>
                        {assignment.difficulty}
                      </span>
                    </td>
                    
                    {/* Points */}
                    <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1e293b' }}>
                      {assignment.totalPoints}
                    </td>
                    
                    {/* Due Date */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        color: overdue ? '#dc2626' : '#475569',
                        fontWeight: overdue ? 500 : 400,
                        fontSize: '13px'
                      }}>
                        {formatDate(assignment.dueDate)}
                      </span>
                    </td>
                    
                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 500,
                        backgroundColor: statusInfo.color + '15',
                        color: statusInfo.color
                      }}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </td>
                    
                    {/* Score */}
                    <td style={{ padding: '14px 16px' }}>
                      {assignment.submission?.score !== undefined ? (
                        <span style={{ 
                          fontWeight: 600,
                          color: assignment.submission.score >= assignment.totalPoints * 0.6 ? '#059669' : '#dc2626'
                        }}>
                          {assignment.submission.score}/{assignment.totalPoints}
                        </span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    
                    {/* Action */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleStartAssignment(assignment)}
                        style={{ 
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '13px',
                          backgroundColor: status === 'graded' ? '#f1f5f9' : '#3b82f6',
                          color: status === 'graded' ? '#475569' : 'white',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = status === 'graded' ? '#e2e8f0' : '#2563eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = status === 'graded' ? '#f1f5f9' : '#3b82f6';
                        }}
                      >
                        {status === 'not_started' && '🚀 Start'}
                        {status === 'in_progress' && '📝 Continue'}
                        {status === 'submitted' && '👀 View'}
                        {status === 'graded' && '📊 Results'}
                        {status === 'late' && '📤 Submit'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentAssignmentList;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { assignmentApi } from '../../api/assignmentApi';
import './AssignmentReports.css';

interface AssignmentStats {
  _id: string;
  title: string;
  type: string;
  difficulty: string;
  status: string;
  totalPoints: number;
  dueDate: string;
  stats: {
    totalSubmissions: number;
    completedSubmissions: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
    passRate: number;
    onTimeSubmissions: number;
    lateSubmissions: number;
  };
}

interface OverallStats {
  totalAssignments: number;
  publishedAssignments: number;
  draftAssignments: number;
  totalSubmissions: number;
  averageCompletionRate: number;
  averageScore: number;
  byType: { _id: string; count: number }[];
  byDifficulty: { _id: string; count: number }[];
}

interface StudentPerformance {
  _id: string;
  name: string;
  email: string;
  totalAssignments: number;
  completed: number;
  averageScore: number;
  onTime: number;
  late: number;
}

const AssignmentReports: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'students'>('overview');
  
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [assignmentStats, setAssignmentStats] = useState<AssignmentStats[]>([]);
  const [studentPerformance, setStudentPerformance] = useState<StudentPerformance[]>([]);
  
  // Filters
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'all'>('month');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('submissions');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        dateRange,
        type: typeFilter,
        sortBy
      });

      const [overallRes, assignmentsRes, studentsRes] = await Promise.all([
        assignmentApi.getOverallReports(params.toString()),
        assignmentApi.getByAssignmentReports(params.toString()),
        assignmentApi.getByStudentReports(params.toString())
      ]);

      setOverallStats(overallRes.data.data);
      setAssignmentStats(assignmentsRes.data.data || []);
      setStudentPerformance(studentsRes.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError(err.response?.data?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [dateRange, typeFilter, sortBy]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const response = await assignmentApi.exportReports(`format=${format}&dateRange=${dateRange}`);
      
      const blob = new Blob([response.data], { 
        type: format === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assignment-report-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export report');
    }
  };

  if (loading) {
    return (
      <div className="reports-loading">
        <div className="spinner"></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="assignment-reports">
      {/* Header */}
      <div className="reports-header">
        <div className="header-left">
          <h1>📊 Assignment Reports</h1>
          <p>Analytics and insights for assignment performance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => exportReport('csv')}>
            📥 Export CSV
          </button>
          <button className="btn btn-primary" onClick={fetchReports}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
          <button onClick={fetchReports}>Retry</button>
        </div>
      )}

      {/* Filters */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>Time Period</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="all">All Time</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Assignment Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="coding">Coding</option>
            <option value="mcq">MCQ</option>
            <option value="theory">Theory</option>
            <option value="project">Project</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sort By</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="submissions">Most Submissions</option>
            <option value="score">Highest Avg Score</option>
            <option value="recent">Most Recent</option>
            <option value="completion">Completion Rate</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="reports-tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📈 Overview
        </button>
        <button 
          className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          📝 By Assignment
        </button>
        <button 
          className={`tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          👥 By Student
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overallStats && (
        <div className="overview-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📋</div>
              <div className="stat-info">
                <span className="stat-value">{overallStats.totalAssignments}</span>
                <span className="stat-label">Total Assignments</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <span className="stat-value">{overallStats.publishedAssignments}</span>
                <span className="stat-label">Published</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📤</div>
              <div className="stat-info">
                <span className="stat-value">{overallStats.totalSubmissions}</span>
                <span className="stat-label">Total Submissions</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-info">
                <span className="stat-value">{overallStats.averageScore?.toFixed(1) || 0}%</span>
                <span className="stat-label">Average Score</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-info">
                <span className="stat-value">{overallStats.averageCompletionRate?.toFixed(1) || 0}%</span>
                <span className="stat-label">Completion Rate</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-row">
            {/* By Type */}
            <div className="chart-card">
              <h3>Assignments by Type</h3>
              <div className="bar-chart">
                {overallStats.byType?.map((item) => (
                  <div key={item._id} className="bar-item">
                    <span className="bar-label">{item._id || 'Unknown'}</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: `${(item.count / overallStats.totalAssignments) * 100}%`,
                          backgroundColor: getTypeColor(item._id)
                        }}
                      ></div>
                    </div>
                    <span className="bar-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By Difficulty */}
            <div className="chart-card">
              <h3>Assignments by Difficulty</h3>
              <div className="bar-chart">
                {overallStats.byDifficulty?.map((item) => (
                  <div key={item._id} className="bar-item">
                    <span className="bar-label">{item._id || 'Unknown'}</span>
                    <div className="bar-container">
                      <div 
                        className="bar-fill"
                        style={{ 
                          width: `${(item.count / overallStats.totalAssignments) * 100}%`,
                          backgroundColor: getDifficultyColor(item._id)
                        }}
                      ></div>
                    </div>
                    <span className="bar-value">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="assignments-content">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Submissions</th>
                <th>Avg Score</th>
                <th>Pass Rate</th>
                <th>On Time</th>
                <th>Late</th>
              </tr>
            </thead>
            <tbody>
              {assignmentStats.map((assignment) => (
                <tr key={assignment._id}>
                  <td>
                    <div className="assignment-cell">
                      <span className="assignment-title">{assignment.title}</span>
                      <span className="assignment-points">{assignment.totalPoints} pts</span>
                    </div>
                  </td>
                  <td>
                    <span className={`type-badge ${assignment.type}`}>
                      {assignment.type}
                    </span>
                  </td>
                  <td>
                    <span className={`difficulty-badge ${assignment.difficulty}`}>
                      {assignment.difficulty}
                    </span>
                  </td>
                  <td>{assignment.stats?.totalSubmissions || 0}</td>
                  <td>
                    <span className={`score ${getScoreClass(assignment.stats?.averageScore)}`}>
                      {assignment.stats?.averageScore?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td>
                    <span className={`score ${getScoreClass(assignment.stats?.passRate)}`}>
                      {assignment.stats?.passRate?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td className="on-time">{assignment.stats?.onTimeSubmissions || 0}</td>
                  <td className="late">{assignment.stats?.lateSubmissions || 0}</td>
                </tr>
              ))}
              {assignmentStats.length === 0 && (
                <tr>
                  <td colSpan={8} className="no-data">No assignment data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="students-content">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Completion %</th>
                <th>Avg Score</th>
                <th>On Time</th>
                <th>Late</th>
              </tr>
            </thead>
            <tbody>
              {studentPerformance.map((student) => (
                <tr key={student._id}>
                  <td>
                    <div className="student-cell">
                      <span className="student-name">{student.name}</span>
                      <span className="student-email">{student.email}</span>
                    </div>
                  </td>
                  <td>{student.totalAssignments}</td>
                  <td>{student.completed}</td>
                  <td>
                    <div className="progress-cell">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ 
                            width: `${student.totalAssignments > 0 ? (student.completed / student.totalAssignments) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <span>{student.totalAssignments > 0 ? ((student.completed / student.totalAssignments) * 100).toFixed(0) : 0}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`score ${getScoreClass(student.averageScore)}`}>
                      {student.averageScore?.toFixed(1) || 0}%
                    </span>
                  </td>
                  <td className="on-time">{student.onTime}</td>
                  <td className="late">{student.late}</td>
                </tr>
              ))}
              {studentPerformance.length === 0 && (
                <tr>
                  <td colSpan={7} className="no-data">No student data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Helper functions
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    coding: '#3b82f6',
    mcq: '#8b5cf6',
    theory: '#10b981',
    project: '#f59e0b',
    sql: '#06b6d4'
  };
  return colors[type?.toLowerCase()] || '#6b7280';
}

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    beginner: '#10b981',
    easy: '#22c55e',
    medium: '#f59e0b',
    hard: '#ef4444',
    expert: '#7c3aed'
  };
  return colors[difficulty?.toLowerCase()] || '#6b7280';
}

function getScoreClass(score: number | undefined): string {
  if (!score) return '';
  if (score >= 80) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}

export default AssignmentReports;

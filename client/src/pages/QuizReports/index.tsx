import React, { useEffect, useState } from 'react';
import { quizApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import './QuizReportsPage.css';

interface QuizSummary {
  _id: string;
  title: string;
  description: string;
  totalAttempts: number;
  completedAttempts?: number;
  averageScore: number;
  passRate: number;
  createdAt: string;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attempts: Array<{
    attemptNo: number;
    score: number;
    percentage: number;
    passed: boolean;
    timeSpent: number;
    submittedAt: Date;
    questionsAnswered: number;
  }>;
  bestScore: number;
  averageScore: number;
  totalAttempts: number;
  passed: boolean;
}

interface QuizMetrics {
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

interface QuizDistributionStats {
  quizId: string;
  quizTitle: string;
  accessibleTo: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches: Array<{ id: string; name: string }>;
  totalSentTo: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
  studentDetails: Array<{
    studentId: string;
    studentName: string;
    studentEmail: string;
    status: 'completed' | 'in_progress' | 'pending';
    attemptCount: number;
    latestScore: number | null;
  }>;
}

const QuizReportsPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [metrics, setMetrics] = useState<QuizMetrics | null>(null);
  const [distributionStats, setDistributionStats] = useState<QuizDistributionStats | null>(null);
  const [studentPerformances, setStudentPerformances] = useState<StudentPerformance[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<'overview' | 'distribution' | 'students' | 'performers'>('overview');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'attempts'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getQuizzesForReporting();
      // API returns array directly, not wrapped in data property
      console.log('Quiz reports - fetched quizzes:', res);
      setQuizzes(Array.isArray(res) ? res : (res.data || []));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSelect = async (quizId: string) => {
    setSelectedQuizId(quizId);
    if (quizId) {
      await loadQuizData(quizId);
    }
  };

  const loadQuizData = async (quizId: string) => {
    try {
      setError('');
      setDataLoading(true);
      
      // Load metrics - API returns data directly, not wrapped in .data
      const metricsRes = await quizApi.getQuizReportSummary(quizId);
      console.log('Metrics response:', metricsRes);
      setMetrics(metricsRes.data || metricsRes);
      
      // Load distribution stats
      const distRes = await quizApi.getQuizDistributionStats(quizId);
      console.log('Distribution response:', distRes);
      setDistributionStats(distRes.data || distRes);
      
      // Load student performances
      const perfRes = await quizApi.getStudentPerformanceReport(quizId);
      console.log('Performance response:', perfRes);
      const performances = perfRes.data || perfRes || [];
      setStudentPerformances(Array.isArray(performances) ? performances : []);
      
      // Load top performers
      const topRes = await quizApi.getTopPerformers(quizId);
      console.log('Top performers response:', topRes);
      setTopPerformers(topRes.data || topRes || []);
    } catch (err: any) {
      console.error('Failed to load quiz data:', err);
      setError(err.message || 'Failed to load quiz data');
    } finally {
      setDataLoading(false);
    }
  };

  const getScorePercentageColor = (percentage: number) => {
    if (percentage >= 80) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'average';
    return 'poor';
  };

  const getPassStatusColor = (passed: boolean) => {
    return passed ? 'passed' : 'failed';
  };

  const exportToCSV = async () => {
    if (!selectedQuizId) {
      alert('Please select a quiz first');
      return;
    }

    try {
      const csvContent = await quizApi.exportQuizReportCSV(selectedQuizId);
      // Create a blob from the CSV content
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `quiz-report-${selectedQuizId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  const getSortedStudentPerformances = () => {
    const sorted = [...studentPerformances];
    sorted.sort((a, b) => {
      let aVal, bVal;
      
      if (sortBy === 'name') {
        aVal = a.studentName.toLowerCase();
        bVal = b.studentName.toLowerCase();
      } else if (sortBy === 'score') {
        aVal = a.averageScore;
        bVal = b.averageScore;
      } else {
        aVal = a.totalAttempts;
        bVal = b.totalAttempts;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return sorted;
  };

  if (loading) return <Spinner fullScreen />;

  // Tab card definitions with dynamic metrics
  const tabCards = [
    {
      key: 'overview' as const,
      icon: '📊',
      label: 'Overview',
      metric: metrics
        ? `${metrics.totalAttempts} attempts · ${Math.round(metrics.averageScore)}% avg`
        : 'Select a quiz',
      subMetric: metrics ? `${Math.round(metrics.passRate)}% pass rate` : '',
    },
    {
      key: 'distribution' as const,
      icon: '📈',
      label: 'Distribution',
      metric: distributionStats
        ? `${distributionStats.completionRate}% completion`
        : 'Select a quiz',
      subMetric: distributionStats
        ? `${distributionStats.completed} / ${distributionStats.totalSentTo} completed`
        : '',
    },
    {
      key: 'students' as const,
      icon: '🎓',
      label: 'Students',
      metric: studentPerformances.length > 0
        ? `${studentPerformances.length} students`
        : 'Select a quiz',
      subMetric: studentPerformances.length > 0
        ? `${studentPerformances.filter(s => s.passed).length} passed`
        : '',
    },
    {
      key: 'performers' as const,
      icon: '🏆',
      label: 'Top Performers',
      metric: topPerformers.length > 0
        ? topPerformers[0]?.studentName || 'No data'
        : 'Select a quiz',
      subMetric: topPerformers.length > 0
        ? `${topPerformers[0]?.percentage ?? 0}% top score`
        : '',
    },
  ];

  const selectedQuiz = quizzes.find(q => q._id === selectedQuizId);

  return (
    <div className="quiz-reports-page">
      <h3 className="qr-page-title">Quiz Reports</h3>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Row 1: Quiz Selector Card */}
      <div className="qr-selector-card">
        <div className="qr-selector-inner">
          <div className="qr-selector-label">
            <span className="qr-selector-icon">📋</span>
            <div>
              <div className="qr-selector-heading">Select Quiz</div>
              <div className="qr-selector-hint">Choose a quiz to view detailed reports</div>
            </div>
          </div>
          <div className="qr-selector-right">
            <select
              value={selectedQuizId}
              onChange={(e) => handleQuizSelect(e.target.value)}
              className="qr-quiz-select"
            >
              <option value="">— Choose a quiz —</option>
              {quizzes.map(quiz => (
                <option key={quiz._id} value={quiz._id}>
                  {quiz.title} ({quiz.completedAttempts || 0} completed, {quiz.totalAttempts} total)
                </option>
              ))}
            </select>
            {selectedQuizId && (
              <button className="qr-export-btn" onClick={exportToCSV} title="Export to CSV">
                📥 Export CSV
              </button>
            )}
          </div>
        </div>
        {selectedQuiz && (
          <div className="qr-selected-info">
            <span className="qr-selected-badge">✓ {selectedQuiz.title}</span>
            <span className="qr-selected-meta">{selectedQuiz.totalAttempts} total attempts · {Math.round(selectedQuiz.averageScore || 0)}% avg score</span>
          </div>
        )}
      </div>

      {/* Row 2: Tab Summary Cards */}
      <div className="qr-tab-cards-row">
        {tabCards.map(card => (
          <button
            key={card.key}
            className={`qr-tab-card ${viewType === card.key ? 'active' : ''} ${!selectedQuizId ? 'disabled' : ''}`}
            onClick={() => selectedQuizId && setViewType(card.key)}
          >
            <div className="qr-tab-icon">{card.icon}</div>
            <div className="qr-tab-label">{card.label}</div>
            <div className="qr-tab-metric">{card.metric}</div>
            {card.subMetric && <div className="qr-tab-sub">{card.subMetric}</div>}
            {viewType === card.key && <div className="qr-tab-active-bar" />}
          </button>
        ))}
      </div>

      {/* Row 3: Content Panel */}
      <div className="qr-content-panel">
        {/* Reports Content */}
        {dataLoading ? (
          <div className="loading-content">
            <Spinner />
          </div>
        ) : selectedQuizId ? (
          <div className="reports-content">
            {viewType === 'overview' && (
              metrics ? (
              <>
                {/* Summary Stats */}
                <div className="stats-section">
                  <h3 style={{ color: '#005897', borderBottom: '2px solid #005897', paddingBottom: '8px' }}>Quiz Overview</h3>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total Attempts</span>
                      <span className="stat-value">{metrics.totalAttempts}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Average Score</span>
                      <span className="stat-value">{Math.round(metrics.averageScore * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Pass Rate</span>
                      <span className="stat-value">{Math.round(metrics.passRate * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Highest Score</span>
                      <span className="stat-value">{Math.round(metrics.highestScore * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Lowest Score</span>
                      <span className="stat-value">{Math.round(metrics.lowestScore * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Median Score</span>
                      <span className="stat-value">{Math.round(metrics.medianScore * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Std. Deviation</span>
                      <span className="stat-value">{Math.round(metrics.standardDeviation * 100) / 100}%</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Time Spent</span>
                      <span className="stat-value">{Math.round(metrics.averageTimeSpent / 60)} min</span>
                    </div>
                  </div>
                </div>

                {/* Performance Distribution */}
                <div className="chart-section">
                  <h3 style={{ color: '#005897', borderBottom: '2px solid #005897', paddingBottom: '8px' }}>Performance Distribution</h3>
                  <div className="distribution-grid">
                    <div className="distribution-item excellent">
                      <span className="dist-label">Excellent (80%+)</span>
                      <span className="dist-count">
                        {studentPerformances.filter(s => s.averageScore >= 80).length}
                      </span>
                      <span className="dist-percentage">
                        {studentPerformances.length > 0
                          ? Math.round(
                              (studentPerformances.filter(s => s.averageScore >= 80).length /
                                studentPerformances.length) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="distribution-item good">
                      <span className="dist-label">Good (60-79%)</span>
                      <span className="dist-count">
                        {studentPerformances.filter(s => s.averageScore >= 60 && s.averageScore < 80)
                          .length}
                      </span>
                      <span className="dist-percentage">
                        {studentPerformances.length > 0
                          ? Math.round(
                              (studentPerformances.filter(s => s.averageScore >= 60 && s.averageScore < 80)
                                .length /
                                studentPerformances.length) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="distribution-item average">
                      <span className="dist-label">Average (40-59%)</span>
                      <span className="dist-count">
                        {studentPerformances.filter(s => s.averageScore >= 40 && s.averageScore < 60)
                          .length}
                      </span>
                      <span className="dist-percentage">
                        {studentPerformances.length > 0
                          ? Math.round(
                              (studentPerformances.filter(s => s.averageScore >= 40 && s.averageScore < 60)
                                .length /
                                studentPerformances.length) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="distribution-item poor">
                      <span className="dist-label">Poor (&lt;40%)</span>
                      <span className="dist-count">
                        {studentPerformances.filter(s => s.averageScore < 40).length}
                      </span>
                      <span className="dist-percentage">
                        {studentPerformances.length > 0
                          ? Math.round(
                              (studentPerformances.filter(s => s.averageScore < 40).length /
                                studentPerformances.length) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                </div>
              </>
              ) : (
                <div className="no-data-message" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <p>Loading report data... If this persists, there may be no data for this quiz yet.</p>
                </div>
              )
            )}

            {viewType === 'distribution' && (
              distributionStats ? (
              <div className="distribution-section">
                <h3 style={{ color: '#005897', borderBottom: '2px solid #005897', paddingBottom: '8px', marginBottom: '20px' }}>Quiz Distribution</h3>
                
                {/* Distribution Stats Cards */}
                <div className="distribution-stats-grid">
                  <div className="dist-stat-item" style={{ background: '#e3f2fd', borderLeft: '4px solid #005897' }}>
                    <span className="dist-stat-label">Total Sent To</span>
                    <span className="dist-stat-value" style={{ color: '#005897' }}>{distributionStats.totalSentTo}</span>
                  </div>
                  <div className="dist-stat-item" style={{ background: '#e8f5e9', borderLeft: '4px solid #2e7d32' }}>
                    <span className="dist-stat-label">Completed</span>
                    <span className="dist-stat-value" style={{ color: '#2e7d32' }}>{distributionStats.completed}</span>
                  </div>
                  <div className="dist-stat-item" style={{ background: '#fff3e0', borderLeft: '4px solid #f57c00' }}>
                    <span className="dist-stat-label">In Progress</span>
                    <span className="dist-stat-value" style={{ color: '#f57c00' }}>{distributionStats.inProgress}</span>
                  </div>
                  <div className="dist-stat-item" style={{ background: '#ffebee', borderLeft: '4px solid #d32f2f' }}>
                    <span className="dist-stat-label">Pending</span>
                    <span className="dist-stat-value" style={{ color: '#d32f2f' }}>{distributionStats.pending}</span>
                  </div>
                </div>

                {/* Completion Rate */}
                <div style={{ marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>Completion Rate</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ flex: 1, background: '#e0e0e0', borderRadius: '10px', height: '20px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${distributionStats.completionRate}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, #005897, #0077cc)',
                          borderRadius: '10px',
                          transition: 'width 0.5s ease'
                        }} 
                      />
                    </div>
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#005897' }}>
                      {distributionStats.completionRate}%
                    </span>
                  </div>
                </div>

                {/* Access Info */}
                <div style={{ marginBottom: '30px', background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Access Type</h4>
                  <p style={{ margin: 0, color: '#666' }}>
                    {distributionStats.accessibleTo === 'everyone' && 'Accessible to all students'}
                    {distributionStats.accessibleTo === 'batch_wise' && `Accessible to batches: ${distributionStats.selectedBatches.map(b => b.name).join(', ') || 'None selected'}`}
                    {distributionStats.accessibleTo === 'individual' && 'Accessible to selected students only'}
                  </p>
                </div>

                {/* Student Status List */}
                <h3 style={{ color: '#005897', borderBottom: '2px solid #005897', paddingBottom: '8px', marginTop: '30px' }}>Student Status</h3>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Attempts</th>
                        <th>Latest Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionStats.studentDetails.map((student, index) => (
                        <tr key={student.studentId}>
                          <td>{index + 1}</td>
                          <td>{student.studentName}</td>
                          <td>{student.studentEmail}</td>
                          <td>
                            <span className={`status-badge status-${student.status}`}>
                              {student.status === 'completed' && 'Completed'}
                              {student.status === 'in_progress' && 'In Progress'}
                              {student.status === 'pending' && 'Pending'}
                            </span>
                          </td>
                          <td>{student.attemptCount}</td>
                          <td>
                            {student.latestScore !== null 
                              ? `${Math.round(student.latestScore * 100) / 100}%` 
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              ) : (
                <div className="no-data-message" style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <p>Loading distribution data...</p>
                </div>
              )
            )}

            {viewType === 'students' && (
              <div className="table-section">
                <div className="section-header">
                  <h3>Student Performance Details</h3>
                  <div className="sort-controls">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="sort-select"
                    >
                      <option value="name">Sort by Name</option>
                      <option value="score">Sort by Score</option>
                      <option value="attempts">Sort by Attempts</option>
                    </select>
                    <button
                      className="sort-order-btn"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {studentPerformances.length === 0 ? (
                  <div className="no-data">
                    <p>No student performance data available</p>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Email</th>
                          <th>Attempts</th>
                          <th>Best Score</th>
                          <th>Average Score</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getSortedStudentPerformances().map((student, idx) => (
                          <tr key={student.studentId} className={`row-${idx % 2}`}>
                            <td className="student-name">
                              <span className="student-index">{idx + 1}</span>
                              {student.studentName}
                            </td>
                            <td className="student-email">{student.studentEmail}</td>
                            <td className="value-cell">{student.totalAttempts}</td>
                            <td className="value-cell">
                              <div className="score-badge">
                                {Math.round(student.bestScore * 100) / 100}%
                              </div>
                            </td>
                            <td className="percentage-cell">
                              <div>
                                <div className="percentage-bar">
                                  <div
                                    className={`percentage-fill ${getScorePercentageColor(student.averageScore)}`}
                                    style={{ width: `${student.averageScore}%` }}
                                  />
                                </div>
                                <span className={`percentage-value ${getScorePercentageColor(student.averageScore)}`}>
                                  {Math.round(student.averageScore * 100) / 100}%
                                </span>
                              </div>
                            </td>
                            <td className={`status-cell ${getPassStatusColor(student.passed)}`}>
                              <span className="status-badge">
                                {student.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {viewType === 'performers' && (
              <div className="performers-section">
                <h2>🏆 Top Performers</h2>
                {topPerformers.length === 0 ? (
                  <div className="no-data">
                    <p>No performance data available</p>
                  </div>
                ) : (
                  <div className="performers-grid">
                    {topPerformers.map((performer, idx) => (
                      <div key={performer.studentId} className={`performer-card rank-${idx + 1}`}>
                        <div className="rank-badge">{idx + 1}</div>
                        <div className="performer-info">
                          <h3>{performer.studentName}</h3>
                          <p className="performer-email">{performer.studentEmail}</p>
                          <div className="performer-stats">
                            <div className="perf-stat">
                              <span className="perf-label">Marks:</span>
                              <span className="perf-value">{performer.marks}/{Math.round(performer.marks / (performer.percentage || 1)) * 100}</span>
                            </div>
                            <div className="perf-stat">
                              <span className="perf-label">Score:</span>
                              <span className="perf-value">{performer.percentage}%</span>
                            </div>
                            <div className="perf-stat">
                              <span className="perf-label">Attempts:</span>
                              <span className="perf-value">{performer.attemptNo}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="qr-no-quiz">
            <div className="qr-no-quiz-icon">📋</div>
            <p>Select a quiz above to view detailed reports</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizReportsPage;

import React, { useEffect, useState } from 'react';
import { attendanceApi, batchApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Batch, StudentAttendanceSummary } from '../../types';
import './AttendanceReportsPage.css';

const AttendanceReportsPage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [reportData, setReportData] = useState<StudentAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewType, setViewType] = useState<'batch' | 'student'>('batch');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await batchApi.getBatches();
      setBatches(res.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = async (batchId: string) => {
    setSelectedBatchId(batchId);
    if (batchId) {
      try {
        setError('');
        const res = await attendanceApi.getBatchAttendanceSummary(batchId);
        setReportData(res.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batch summary');
      }
    }
  };

  const getAttendancePercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'excellent';
    if (percentage >= 60) return 'good';
    if (percentage >= 45) return 'average';
    return 'poor';
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = ['Student Name', 'Email', 'Total Days', 'Present', 'Absent', 'Leave', 'Attendance %'];
    const rows = reportData.map(student => [
      student.studentName,
      student.studentEmail,
      student.total,
      student.present,
      student.absent,
      student.leave,
      student.percentage + '%'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="attendance-reports-page">
      <div className="reports-header">
        <div className="header-text">
          <h1>📈 Attendance Reports</h1>
          <p className="subtitle">View and analyze attendance statistics</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="reports-container">
        {/* Filters and Controls */}
        <div className="filters-section">
          <div className="filter-group">
            <label>🏛️ Select Batch *</label>
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchSelect(e.target.value)}
              className="batch-select"
              required
            >
              <option value="">-- Select a Batch --</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} ({batch.enrolledCount} students)
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📊 Report Type</label>
            <div className="view-tabs">
              <button
                className={`tab-btn ${viewType === 'batch' ? 'active' : ''}`}
                onClick={() => setViewType('batch')}
              >
                Batch Summary
              </button>
              <button
                className={`tab-btn ${viewType === 'student' ? 'active' : ''}`}
                onClick={() => setViewType('student')}
              >
                Student Details
              </button>
            </div>
          </div>

          {selectedBatchId && (
            <button className="export-btn" onClick={exportToCSV}>
              📥 Export to CSV
            </button>
          )}
        </div>

        {/* Reports Content */}
        {selectedBatchId ? (
          <div className="reports-content">
            {reportData.length === 0 ? (
              <div className="no-data">
                <p>No attendance data available for this batch</p>
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="stats-section">
                  <h2>Batch Overview</h2>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total Students</span>
                      <span className="stat-value">{reportData.length}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Avg Attendance</span>
                      <span className="stat-value">
                        {Math.round(
                          reportData.reduce((sum, s) => sum + s.percentage, 0) / reportData.length
                        )}%
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Excellent (75%+)</span>
                      <span className="stat-value">
                        {reportData.filter(s => s.percentage >= 75).length}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Poor (&lt;45%)</span>
                      <span className="stat-value">
                        {reportData.filter(s => s.percentage < 45).length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Student Details Table */}
                <div className="table-section">
                  <h2>Student Attendance Details</h2>
                  <div className="table-wrapper">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Student Name</th>
                          <th>Email</th>
                          <th>Total Days</th>
                          <th>Present</th>
                          <th>Absent</th>
                          <th>Leave</th>
                          <th>Attendance %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.map((student, idx) => (
                          <tr key={student.studentId} className={`row-${idx % 2}`}>
                            <td className="student-name">
                              <span className="student-index">{idx + 1}</span>
                              {student.studentName}
                            </td>
                            <td className="student-email">{student.studentEmail}</td>
                            <td className="value-cell">{student.total}</td>
                            <td className="value-cell present">{student.present}</td>
                            <td className="value-cell absent">{student.absent}</td>
                            <td className="value-cell leave">{student.leave}</td>
                            <td className="percentage-cell">
                              <div className="percentage-bar">
                                <div
                                  className={`percentage-fill ${getAttendancePercentageColor(student.percentage)}`}
                                  style={{ width: `${student.percentage}%` }}
                                />
                              </div>
                              <span className={`percentage-value ${getAttendancePercentageColor(student.percentage)}`}>
                                {student.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Attendance Distribution Chart */}
                <div className="chart-section">
                  <h2>Attendance Distribution</h2>
                  <div className="distribution-grid">
                    <div className="distribution-item excellent">
                      <span className="dist-label">Excellent (75%+)</span>
                      <span className="dist-count">
                        {reportData.filter(s => s.percentage >= 75).length}
                      </span>
                      <span className="dist-percentage">
                        {Math.round(
                          (reportData.filter(s => s.percentage >= 75).length / reportData.length) * 100
                        )}%
                      </span>
                    </div>
                    <div className="distribution-item good">
                      <span className="dist-label">Good (60-74%)</span>
                      <span className="dist-count">
                        {reportData.filter(s => s.percentage >= 60 && s.percentage < 75).length}
                      </span>
                      <span className="dist-percentage">
                        {Math.round(
                          (reportData.filter(s => s.percentage >= 60 && s.percentage < 75).length /
                            reportData.length) *
                            100
                        )}%
                      </span>
                    </div>
                    <div className="distribution-item average">
                      <span className="dist-label">Average (45-59%)</span>
                      <span className="dist-count">
                        {reportData.filter(s => s.percentage >= 45 && s.percentage < 60).length}
                      </span>
                      <span className="dist-percentage">
                        {Math.round(
                          (reportData.filter(s => s.percentage >= 45 && s.percentage < 60).length /
                            reportData.length) *
                            100
                        )}%
                      </span>
                    </div>
                    <div className="distribution-item poor">
                      <span className="dist-label">Poor (&lt;45%)</span>
                      <span className="dist-count">
                        {reportData.filter(s => s.percentage < 45).length}
                      </span>
                      <span className="dist-percentage">
                        {Math.round(
                          (reportData.filter(s => s.percentage < 45).length / reportData.length) * 100
                        )}%
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="no-batch-selected">
            <p>👈 Select a batch to view attendance reports</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportsPage;

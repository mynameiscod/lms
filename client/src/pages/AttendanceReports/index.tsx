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

  const selectedBatch = batches.find(b => b._id === selectedBatchId);
  const avgAttendance = reportData.length
    ? Math.round(reportData.reduce((sum, s) => sum + s.percentage, 0) / reportData.length)
    : 0;
  const excellentCount = reportData.filter(s => s.percentage >= 75).length;
  const atRiskCount = reportData.filter(s => s.percentage < 45).length;

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="ar-page">
      <h3 className="ar-title">Attendance Reports</h3>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* ── Row 1: Batch Selector Card ── */}
      <div className="ar-selector-card">
        <div className="ar-selector-inner">
          <div className="ar-selector-label">
            <span className="ar-selector-icon">📅</span>
            <div>
              <div className="ar-selector-heading">Select Batch</div>
              <div className="ar-selector-hint">Choose a batch to view attendance reports</div>
            </div>
          </div>
          <div className="ar-selector-right">
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchSelect(e.target.value)}
              className="ar-batch-select"
            >
              <option value="">— Choose a batch —</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name} ({batch.enrolledCount} students)
                </option>
              ))}
            </select>
            {selectedBatchId && (
              <button className="ar-export-btn" onClick={exportToCSV}>
                📥 Export CSV
              </button>
            )}
          </div>
        </div>
        {selectedBatch && (
          <div className="ar-selected-info">
            <span className="ar-selected-badge">✓ {selectedBatch.name}</span>
            <span className="ar-selected-meta">{selectedBatch.enrolledCount} students enrolled</span>
          </div>
        )}
      </div>

      {/* ── Row 2: Stat Cards (shown when data loaded) ── */}
      {selectedBatchId && reportData.length > 0 && (
        <div className="ar-stat-cards">
          <div className="ar-stat-card blue">
            <div className="ar-stat-icon">👥</div>
            <div className="ar-stat-value">{reportData.length}</div>
            <div className="ar-stat-label">Total Students</div>
          </div>
          <div className={`ar-stat-card ${avgAttendance >= 75 ? 'green' : avgAttendance >= 60 ? 'orange' : 'red'}`}>
            <div className="ar-stat-icon">📊</div>
            <div className="ar-stat-value">{avgAttendance}%</div>
            <div className="ar-stat-label">Avg Attendance</div>
          </div>
          <div className="ar-stat-card green">
            <div className="ar-stat-icon">✅</div>
            <div className="ar-stat-value">{excellentCount}</div>
            <div className="ar-stat-label">Excellent (75%+)</div>
          </div>
          <div className="ar-stat-card red">
            <div className="ar-stat-icon">⚠️</div>
            <div className="ar-stat-value">{atRiskCount}</div>
            <div className="ar-stat-label">At Risk (&lt;45%)</div>
          </div>
        </div>
      )}

      {/* ── Row 3: View Tab Navigation ── */}
      {selectedBatchId && reportData.length > 0 && (
        <div className="ar-tab-nav">
          <button
            className={`ar-tab ${viewType === 'batch' ? 'active' : ''}`}
            onClick={() => setViewType('batch')}
          >
            <span className="ar-tab-icon">📈</span>
            Batch Summary
            {viewType === 'batch' && <span className="ar-tab-bar" />}
          </button>
          <button
            className={`ar-tab ${viewType === 'student' ? 'active' : ''}`}
            onClick={() => setViewType('student')}
          >
            <span className="ar-tab-icon">🎓</span>
            Student Details
            {viewType === 'student' && <span className="ar-tab-bar" />}
          </button>
        </div>
      )}

      {/* ── Row 4: Content Panel ── */}
      <div className="ar-content-panel">
        {!selectedBatchId ? (
          <div className="ar-empty">
            <div className="ar-empty-icon">📅</div>
            <p>Select a batch above to view attendance reports</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="ar-empty">
            <div className="ar-empty-icon">📭</div>
            <p>No attendance data available for this batch</p>
          </div>
        ) : viewType === 'batch' ? (
          /* ── Batch Summary: Distribution Bands ── */
          <div className="ar-distribution-section">
            <div className="ar-section-header">
              <h4>Attendance Distribution</h4>
              <span className="ar-section-sub">{reportData.length} students total</span>
            </div>
            <div className="ar-dist-grid">
              <div className="ar-dist-card excellent">
                <div className="ar-dist-top">
                  <span className="ar-dist-band">Excellent</span>
                  <span className="ar-dist-range">75% and above</span>
                </div>
                <div className="ar-dist-count">{excellentCount}</div>
                <div className="ar-dist-pct">
                  {reportData.length > 0 ? Math.round((excellentCount / reportData.length) * 100) : 0}% of batch
                </div>
                <div className="ar-dist-bar">
                  <div className="ar-dist-fill" style={{ width: `${reportData.length > 0 ? Math.round((excellentCount / reportData.length) * 100) : 0}%` }} />
                </div>
              </div>
              <div className="ar-dist-card good">
                <div className="ar-dist-top">
                  <span className="ar-dist-band">Good</span>
                  <span className="ar-dist-range">60 – 74%</span>
                </div>
                <div className="ar-dist-count">
                  {reportData.filter(s => s.percentage >= 60 && s.percentage < 75).length}
                </div>
                <div className="ar-dist-pct">
                  {Math.round((reportData.filter(s => s.percentage >= 60 && s.percentage < 75).length / reportData.length) * 100)}% of batch
                </div>
                <div className="ar-dist-bar">
                  <div className="ar-dist-fill" style={{ width: `${Math.round((reportData.filter(s => s.percentage >= 60 && s.percentage < 75).length / reportData.length) * 100)}%` }} />
                </div>
              </div>
              <div className="ar-dist-card average">
                <div className="ar-dist-top">
                  <span className="ar-dist-band">Average</span>
                  <span className="ar-dist-range">45 – 59%</span>
                </div>
                <div className="ar-dist-count">
                  {reportData.filter(s => s.percentage >= 45 && s.percentage < 60).length}
                </div>
                <div className="ar-dist-pct">
                  {Math.round((reportData.filter(s => s.percentage >= 45 && s.percentage < 60).length / reportData.length) * 100)}% of batch
                </div>
                <div className="ar-dist-bar">
                  <div className="ar-dist-fill" style={{ width: `${Math.round((reportData.filter(s => s.percentage >= 45 && s.percentage < 60).length / reportData.length) * 100)}%` }} />
                </div>
              </div>
              <div className="ar-dist-card poor">
                <div className="ar-dist-top">
                  <span className="ar-dist-band">At Risk</span>
                  <span className="ar-dist-range">Below 45%</span>
                </div>
                <div className="ar-dist-count">{atRiskCount}</div>
                <div className="ar-dist-pct">
                  {reportData.length > 0 ? Math.round((atRiskCount / reportData.length) * 100) : 0}% of batch
                </div>
                <div className="ar-dist-bar">
                  <div className="ar-dist-fill" style={{ width: `${reportData.length > 0 ? Math.round((atRiskCount / reportData.length) * 100) : 0}%` }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Student Details: Table ── */
          <div className="ar-table-section">
            <div className="ar-section-header">
              <h4>Student Attendance Details</h4>
              <span className="ar-section-sub">{reportData.length} students</span>
            </div>
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Total</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Leave</th>
                    <th>Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((student, idx) => (
                    <tr key={student.studentId}>
                      <td className="ar-idx">{idx + 1}</td>
                      <td className="ar-name">{student.studentName}</td>
                      <td className="ar-email">{student.studentEmail}</td>
                      <td className="ar-num">{student.total}</td>
                      <td className="ar-num ar-present">{student.present}</td>
                      <td className="ar-num ar-absent">{student.absent}</td>
                      <td className="ar-num ar-leave">{student.leave}</td>
                      <td className="ar-pct-cell">
                        <div className="ar-pct-bar">
                          <div
                            className={`ar-pct-fill ${getAttendancePercentageColor(student.percentage)}`}
                            style={{ width: `${student.percentage}%` }}
                          />
                        </div>
                        <span className={`ar-pct-val ${getAttendancePercentageColor(student.percentage)}`}>
                          {student.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportsPage;

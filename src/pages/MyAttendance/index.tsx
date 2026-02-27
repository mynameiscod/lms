import React, { useEffect, useState } from 'react';
import { attendanceApi, batchApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Attendance, AttendanceSummary, Batch } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import './MyAttendancePage.css';

const MyAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchBatches();
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
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
    if (user?._id) {
      try {
        setError('');
        const [attendanceRes, summaryRes] = await Promise.all([
          attendanceApi.getStudentAttendance(user._id, startDate, endDate),
          attendanceApi.getStudentAttendanceSummary(user._id, batchId)
        ]);

        setAttendance(attendanceRes.data || []);
        setSummary(summaryRes.data || null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch attendance');
      }
    }
  };

  const handleDateRangeChange = async () => {
    if (selectedBatchId && user?._id && startDate && endDate) {
      try {
        setError('');
        const attendanceRes = await attendanceApi.getStudentAttendance(user._id, startDate, endDate);
        setAttendance(attendanceRes.data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch attendance');
      }
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="my-attendance-page">
      <div className="attendance-header">
        <div className="header-text">
          <h1>📊 My Attendance</h1>
          <p className="subtitle">View your attendance records and statistics</p>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="attendance-container">
        {/* Filters Section */}
        <div className="filters-section">
          <div className="filter-group">
            <label>🏛️ Select Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchSelect(e.target.value)}
              className="batch-select"
            >
              <option value="">-- All Batches --</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>📅 From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="filter-group">
            <label>📅 To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button className="filter-btn" onClick={handleDateRangeChange}>
            🔍 Filter
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="label">📆 Total Days</span>
              <span className="value">{summary.total}</span>
            </div>
            <div className="summary-card present">
              <span className="label">✓ Present</span>
              <span className="value">{summary.present}</span>
            </div>
            <div className="summary-card absent">
              <span className="label">✗ Absent</span>
              <span className="value">{summary.absent}</span>
            </div>
            <div className="summary-card leave">
              <span className="label">📝 Leave</span>
              <span className="value">{summary.leave}</span>
            </div>
            <div className="summary-card percentage">
              <span className="label">📊 Percentage</span>
              <span className="value">{summary.percentage}%</span>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="attendance-table-section">
          <h2>Attendance History</h2>

          {attendance.length === 0 ? (
            <div className="no-records">
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Batch</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Status</th>
                    <th>Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map(record => (
                    <tr key={record._id}>
                      <td>{new Date(record.date).toLocaleDateString()}</td>
                      <td>{record.batchId.name}</td>
                      <td>{record.inTime || '-'}</td>
                      <td>{record.outTime || '-'}</td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {record.markedBy.firstName} {record.markedBy.lastName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyAttendancePage;

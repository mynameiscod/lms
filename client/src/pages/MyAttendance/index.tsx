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
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Get date constraints
  const getMinDate = () => {
    if (!selectedBatch || !user) return '';
    const batchStart = selectedBatch.startDate ? new Date(selectedBatch.startDate) : null;
    const userJoined = user.createdAt ? new Date(user.createdAt) : null;
    
    if (batchStart && userJoined) {
      return batchStart > userJoined 
        ? batchStart.toISOString().split('T')[0]
        : userJoined.toISOString().split('T')[0];
    }
    return batchStart?.toISOString().split('T')[0] || userJoined?.toISOString().split('T')[0] || '';
  };

  const getMaxDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchBatches();
    setEndDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Update start date when batch changes
  useEffect(() => {
    if (selectedBatch) {
      const minDate = getMinDate();
      if (minDate) setStartDate(minDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBatch]);

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
    const batch = batches.find(b => b._id === batchId) || null;
    setSelectedBatch(batch);
    
    if (user?._id && batchId) {
      try {
        setError('');
        const summaryRes = await attendanceApi.getStudentAttendanceSummary(user._id, batchId);
        setSummary(summaryRes.data || null);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch attendance summary');
      }
    } else {
      setSummary(null);
    }
  };

  const handleFilter = async () => {
    if (!selectedBatchId) {
      setError('Please select a batch first');
      return;
    }
    if (!startDate || !endDate) {
      setError('Please select both from and to dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setError('From date cannot be greater than to date');
      return;
    }
    
    if (user?._id) {
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
      <h1 className="page-title">My Attendance</h1>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="attendance-container">
        {/* Filters Row */}
        <div className="filters-row">
          <div className="filter-item">
            <label>Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => handleBatchSelect(e.target.value)}
              className="batch-select"
            >
              <option value="">-- Select Batch --</option>
              {batches.map(batch => (
                <option key={batch._id} value={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-item">
            <label>From Date</label>
            <input
              type="date"
              value={startDate}
              min={getMinDate()}
              max={endDate || getMaxDate()}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="filter-item">
            <label>To Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate || getMinDate()}
              max={getMaxDate()}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button className="filter-btn" onClick={handleFilter}>
            Filter
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="summary-cards">
            <div className="summary-card">
              <span className="label">Total Days</span>
              <span className="value">{summary.total}</span>
            </div>
            <div className="summary-card present">
              <span className="label">Present</span>
              <span className="value">{summary.present}</span>
            </div>
            <div className="summary-card absent">
              <span className="label">Absent</span>
              <span className="value">{summary.absent}</span>
            </div>
            <div className="summary-card leave">
              <span className="label">Leave</span>
              <span className="value">{summary.leave}</span>
            </div>
            <div className="summary-card percentage">
              <span className="label">Percentage</span>
              <span className="value">{summary.percentage}%</span>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <div className="attendance-table-section">
          <h2>Attendance History</h2>

          {attendance.length === 0 ? (
            <div className="no-records">
              <p>No attendance records found. Select a batch and date range, then click Filter.</p>
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
                      <td>
                        {new Date(record.date).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </td>
                      <td>{record.batchId?.name || '-'}</td>
                      <td>{record.inTime || '-'}</td>
                      <td>{record.outTime || '-'}</td>
                      <td>
                        <span className={`status-badge ${record.status}`}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        {record.markedBy?.firstName} {record.markedBy?.lastName}
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

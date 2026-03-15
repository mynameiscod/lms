import React, { useEffect, useState } from 'react';
import { attendanceApi, batchApi } from '../../api';
import { Alert, Spinner } from '../../components/common';
import { Attendance, AttendanceSummary, Batch } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import './MyAttendancePage.css';

const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const MyAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [currentBatch, setCurrentBatch] = useState<Batch | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState<string>(() => getLocalDateString());
  const [endDate, setEndDate] = useState<string>(() => getLocalDateString());

  // Get date constraints
  const getMinDate = () => {
    if (!currentBatch || !user) return '';
    const batchStart = currentBatch.startDate ? new Date(currentBatch.startDate) : null;
    const userJoined = user.createdAt ? new Date(user.createdAt) : null;
    
    if (batchStart && userJoined) {
      return batchStart > userJoined 
        ? batchStart.toISOString().split('T')[0]
        : userJoined.toISOString().split('T')[0];
    }
    return batchStart?.toISOString().split('T')[0] || userJoined?.toISOString().split('T')[0] || '';
  };

  const getFromDateMax = () => {
    return getLocalDateString();
  };

  const getToDateMax = () => {
    if (!currentBatch) return getLocalDateString();
    const today = getLocalDateString();
    const batchEnd = currentBatch.endDate ? getLocalDateString(new Date(currentBatch.endDate)) : today;
    // Return whichever is earlier - today or batch end date
    return batchEnd < today ? batchEnd : today;
  };

  useEffect(() => {
    const fetchStudentBatch = async () => {
      try {
        setLoading(true);
        if (user?.batchId) {
          // Fetch the student's batch
          const res = await batchApi.getBatchById(user.batchId);
          const batch = res.data || res;
          setCurrentBatch(batch);
          
          // Fetch attendance summary
          if (user._id) {
            const summaryRes = await attendanceApi.getStudentAttendanceSummary(user._id, user.batchId);
            setSummary(summaryRes.data || null);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch batch');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudentBatch();
  }, [user]);

  const handleFilter = async () => {
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
        {/* Batch Info */}
        {currentBatch && (
          <div className="batch-info">
            <span>Batch: <strong>{currentBatch.name}</strong></span>
          </div>
        )}

        {/* Filters Row */}
        <div className="filters-row">
          <div className="filter-item">
            <label>From</label>
            <input
              type="date"
              value={startDate}
              min={getMinDate()}
              max={getFromDateMax()}
              onChange={(e) => setStartDate(e.target.value)}
              className="date-input"
            />
          </div>

          <div className="filter-item">
            <label>To</label>
            <input
              type="date"
              value={endDate}
              min={startDate || getMinDate()}
              max={getToDateMax()}
              onChange={(e) => setEndDate(e.target.value)}
              className="date-input"
            />
          </div>

          <button className="filter-btn" onClick={handleFilter}>
            Filter
          </button>
        </div>

        {/* Summary Cards */}
        {currentBatch && summary && (
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
              <p>No attendance records found for the selected dates.</p>
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

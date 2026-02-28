import React, { useEffect, useState } from 'react';
import { batchApi, attendanceApi, userApi } from '../../api';
import { Button, Modal, Input, Alert, Spinner } from '../../components/common';
import { Batch, User, Attendance } from '../../types';
import './AttendancePage.css';

interface StudentAttendanceForm {
  studentId: string;
  inTime: string;
  outTime: string;
  status: 'present' | 'absent' | 'leave';
}

interface SuccessState {
  show: boolean;
  count: number;
}

const AttendancePage: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [batchStudents, setBatchStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessState>({ show: false, count: 0 });
  const [submitting, setSubmitting] = useState(false);

  // Attendance form state
  const [studentAttendance, setStudentAttendance] = useState<{ [key: string]: StudentAttendanceForm }>({});

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (success.show) {
      const timer = setTimeout(() => {
        setSuccess({ show: false, count: 0 });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success.show]);

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

  const handleBatchSelect = async (batch: Batch) => {
    try {
      setSelectedBatch(batch);
      setError('');

      // Fetch students in this batch
      const usersRes = await userApi.getUsers();
      const allUsers = usersRes.data || [];

      // Filter students
      const students = allUsers.filter((u: User) => u.role === 'STUDENT');
      setBatchStudents(students);

      // Initialize attendance form for all students
      const initialAttendance: { [key: string]: StudentAttendanceForm } = {};
      students.forEach((student: User) => {
        initialAttendance[student._id] = {
          studentId: student._id,
          inTime: '',
          outTime: '',
          status: 'absent'
        };
      });
      setStudentAttendance(initialAttendance);
    } catch (err: any) {
      setError(err.message || 'Failed to load batch details');
    }
  };

  const handleAttendanceChange = (
    studentId: string,
    field: 'inTime' | 'outTime' | 'status',
    value: string
  ) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const handleMarkPresent = (studentId: string) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'present'
      }
    }));
  };

  const handleMarkAbsent = (studentId: string) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'absent'
      }
    }));
  };

  const handleMarkLeave = (studentId: string) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status: 'leave'
      }
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedBatch) {
      setError('Please select a batch first');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Submit attendance for all students
      const promises = Object.values(studentAttendance).map(attendance =>
        attendanceApi.markAttendance({
          studentId: attendance.studentId,
          batchId: selectedBatch._id,
          date: selectedDate,
          inTime: attendance.inTime || undefined,
          outTime: attendance.outTime || undefined,
          status: attendance.status
        })
      );

      await Promise.all(promises);
      setSuccess({ show: true, count: batchStudents.length });

      // Reset form after delay
      setTimeout(() => {
        setSelectedBatch(null);
        setBatchStudents([]);
        setStudentAttendance({});
        setSuccess({ show: false, count: 0 });
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="attendance-page">
      <div className="attendance-header">
        <div className="header-text">
          <h1>✅ Mark Attendance</h1>
          <p className="subtitle">Record student attendance for your batches</p>
        </div>
      </div>

      {/* Success Notification */}
      {success.show && (
        <div className="success-notification animate-in">
          <div className="success-content">
            <div className="success-icon">✓</div>
            <div className="success-text">
              <h3>Success!</h3>
              <p>Attendance marked for {success.count} student{success.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      <div className="attendance-container">
        {/* Batch Selection Section */}
        <div className="batch-selection">
          <h2>Step 1: Select Batch and Date</h2>

          <div className="selection-controls">
            <div className="date-picker-group">
              <label>📅 Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="batch-picker-group">
              <label>🏛️ Batch</label>
              <select
                value={selectedBatch?._id || ''}
                onChange={(e) => {
                  const batch = batches.find(b => b._id === e.target.value);
                  if (batch) handleBatchSelect(batch);
                }}
                className="batch-select"
              >
                <option value="">-- Select a Batch --</option>
                {batches.map(batch => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Attendance Marking Section */}
        {selectedBatch && batchStudents.length > 0 && (
          <div className="attendance-marking">
            <h2>Step 2: Mark Attendance - {selectedBatch.name}</h2>
            <p className="date-info">📍 Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Status</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batchStudents.map((student, idx) => (
                    <tr key={student._id}>
                      <td className="index-cell">{idx + 1}</td>
                      <td className="student-name">
                        {student.firstName} {student.lastName}
                      </td>
                      <td className="student-email">{student.email}</td>
                      <td>
                        <input
                          type="time"
                          value={studentAttendance[student._id]?.inTime || ''}
                          onChange={(e) =>
                            handleAttendanceChange(student._id, 'inTime', e.target.value)
                          }
                          className="time-input"
                          disabled={studentAttendance[student._id]?.status !== 'present'}
                        />
                      </td>
                      <td>
                        <input
                          type="time"
                          value={studentAttendance[student._id]?.outTime || ''}
                          onChange={(e) =>
                            handleAttendanceChange(student._id, 'outTime', e.target.value)
                          }
                          className="time-input"
                          disabled={studentAttendance[student._id]?.status !== 'present'}
                        />
                      </td>
                      <td>
                        <span
                          className={`status-badge ${studentAttendance[student._id]?.status || 'absent'}`}
                        >
                          {studentAttendance[student._id]?.status || 'absent'}
                        </span>
                      </td>
                      <td className="quick-actions">
                        <button
                          className={`quick-btn present-btn ${
                            studentAttendance[student._id]?.status === 'present' ? 'active' : ''
                          }`}
                          onClick={() => handleMarkPresent(student._id)}
                          title="Mark Present"
                        >
                          P
                        </button>
                        <button
                          className={`quick-btn absent-btn ${
                            studentAttendance[student._id]?.status === 'absent' ? 'active' : ''
                          }`}
                          onClick={() => handleMarkAbsent(student._id)}
                          title="Mark Absent"
                        >
                          A
                        </button>
                        <button
                          className={`quick-btn leave-btn ${
                            studentAttendance[student._id]?.status === 'leave' ? 'active' : ''
                          }`}
                          onClick={() => handleMarkLeave(student._id)}
                          title="Mark Leave"
                        >
                          L
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="attendance-summary">
              <div className="summary-item">
                <span className="label">✓ Present:</span>
                <span className="value present-count">
                  {Object.values(studentAttendance).filter(a => a.status === 'present').length}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">✗ Absent:</span>
                <span className="value absent-count">
                  {Object.values(studentAttendance).filter(a => a.status === 'absent').length}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">📝 Leave:</span>
                <span className="value leave-count">
                  {Object.values(studentAttendance).filter(a => a.status === 'leave').length}
                </span>
              </div>
              <div className="summary-item">
                <span className="label">👥 Total:</span>
                <span className="value">{batchStudents.length}</span>
              </div>
            </div>

            <div className="attendance-actions">
              <Button
                onClick={() => {
                  setSelectedBatch(null);
                  setBatchStudents([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitAttendance} loading={submitting} className="btn-primary">
                ✓ Submit Attendance
              </Button>
            </div>
          </div>
        )}

        {selectedBatch && batchStudents.length === 0 && (
          <div className="no-students">
            <p>⚠️ No students found in this batch</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;

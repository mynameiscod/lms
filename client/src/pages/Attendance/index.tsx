import React, { useEffect, useState } from 'react';
import { batchApi, attendanceApi, userApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
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
  const [allBatchStudents, setAllBatchStudents] = useState<User[]>([]); // All students in batch (unfiltered)
  const [batchStudents, setBatchStudents] = useState<User[]>([]); // Filtered by joined date
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessState>({ show: false, count: 0 });
  const [submitting, setSubmitting] = useState(false);

  // Attendance form state
  const [studentAttendance, setStudentAttendance] = useState<{ [key: string]: StudentAttendanceForm }>({});
  // Track original attendance loaded from DB (for change detection)
  const [originalAttendance, setOriginalAttendance] = useState<{ [key: string]: StudentAttendanceForm }>({});
  // Track which students have existing records in DB (vs default values)
  const [existingRecords, setExistingRecords] = useState<Set<string>>(new Set());

  // Helper function to filter students by joined date
  const filterStudentsByDate = (students: User[], date: string): User[] => {
    return students.filter((u: User) => {
      if (u.batchJoinedDate) {
        const joinedDate = new Date(u.batchJoinedDate);
        const attendanceDate = new Date(date);
        // Compare dates only (ignore time)
        joinedDate.setHours(0, 0, 0, 0);
        attendanceDate.setHours(0, 0, 0, 0);
        return joinedDate <= attendanceDate;
      }
      // If no batchJoinedDate, show the student (legacy data)
      return true;
    });
  };

  // Check if a student's attendance has changed or needs to be saved
  const hasStudentChanged = (studentId: string): boolean => {
    const current = studentAttendance[studentId];
    const original = originalAttendance[studentId];
    if (!current || !original) return true; // New record
    
    // If no existing record in DB, this is a new record that needs to be saved
    if (!existingRecords.has(studentId)) return true;
    
    // Check if values changed from what was in DB
    return current.status !== original.status || 
           current.inTime !== original.inTime || 
           current.outTime !== original.outTime;
  };

  // Get count of unsaved changes
  const getChangedCount = (): number => {
    return Object.keys(studentAttendance).filter(id => hasStudentChanged(id)).length;
  };

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

  // Re-filter students and fetch attendance data when date changes
  useEffect(() => {
    if (selectedBatch && allBatchStudents.length > 0) {
      // Filter students based on new date
      const filteredStudents = filterStudentsByDate(allBatchStudents, selectedDate);
      setBatchStudents(filteredStudents);

      const fetchAttendanceData = async () => {
        try {
          const attendanceRes = await attendanceApi.getBatchAttendance(
            selectedBatch._id,
            selectedDate
          );
          
          const updatedAttendance: { [key: string]: StudentAttendanceForm } = {};
          const recordsInDb = new Set<string>();
          filteredStudents.forEach((student: User) => {
            updatedAttendance[student._id] = {
              studentId: student._id,
              inTime: '',
              outTime: '',
              status: 'absent'
            };
          });

          if (attendanceRes.data && Array.isArray(attendanceRes.data)) {
            attendanceRes.data.forEach((record: Attendance) => {
              const studentId = typeof record.studentId === 'string' ? record.studentId : record.studentId._id;
              if (updatedAttendance[studentId]) {
                recordsInDb.add(studentId); // Track that this student has a record in DB
                updatedAttendance[studentId] = {
                  studentId: studentId,
                  inTime: record.inTime || '',
                  outTime: record.outTime || '',
                  status: record.status || 'absent'
                };
              }
            });
          }

          setExistingRecords(recordsInDb);
          setStudentAttendance(updatedAttendance);
          // Save original state for change detection
          setOriginalAttendance(JSON.parse(JSON.stringify(updatedAttendance)));
        } catch (err) {
          console.log('No attendance data for this date');
          // Reset original attendance when no data found
          setExistingRecords(new Set()); // No records exist in DB
          const defaultAttendance: { [key: string]: StudentAttendanceForm } = {};
          filteredStudents.forEach((student: User) => {
            defaultAttendance[student._id] = {
              studentId: student._id,
              inTime: '',
              outTime: '',
              status: 'absent'
            };
          });
          setStudentAttendance(defaultAttendance);
          setOriginalAttendance(JSON.parse(JSON.stringify(defaultAttendance)));
        }
      };
      fetchAttendanceData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedBatch, allBatchStudents]);

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

      // Filter students by role AND batch enrollment (not by date yet - that's done in effect)
      const studentsInBatch = allUsers.filter((u: User) => 
        u.role === 'STUDENT' && u.batchId === batch._id && u.isActive
      );
      
      // Store all students in batch (unfiltered by date)
      setAllBatchStudents(studentsInBatch);
      
      // Filter by joined date for display
      const filteredStudents = filterStudentsByDate(studentsInBatch, selectedDate);
      setBatchStudents(filteredStudents);

      // Initialize attendance form for all filtered students with default values
      const initialAttendance: { [key: string]: StudentAttendanceForm } = {};
      const recordsInDb = new Set<string>();
      filteredStudents.forEach((student: User) => {
        initialAttendance[student._id] = {
          studentId: student._id,
          inTime: '',
          outTime: '',
          status: 'absent'
        };
      });

      // Fetch existing attendance data for this batch and date
      try {
        const attendanceRes = await attendanceApi.getBatchAttendance(
          batch._id,
          selectedDate
        );
        
        if (attendanceRes.data && Array.isArray(attendanceRes.data)) {
          // Merge existing attendance data
          attendanceRes.data.forEach((record: Attendance) => {
            const studentId = typeof record.studentId === 'string' ? record.studentId : record.studentId._id;
            if (initialAttendance[studentId]) {
              recordsInDb.add(studentId); // Track that this student has a record in DB
              initialAttendance[studentId] = {
                studentId: studentId,
                inTime: record.inTime || '',
                outTime: record.outTime || '',
                status: record.status || 'absent'
              };
            }
          });
        }
      } catch (attendanceError) {
        // If fetch fails, continue with default values
        console.log('No previous attendance data found');
      }

      setExistingRecords(recordsInDb);
      setStudentAttendance(initialAttendance);
      // Save original state for change detection
      setOriginalAttendance(JSON.parse(JSON.stringify(initialAttendance)));
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

    // Get only changed records
    const changedRecords = Object.values(studentAttendance).filter(att => hasStudentChanged(att.studentId));

    if (changedRecords.length === 0) {
      setError('No changes to save');
      return;
    }

    // Validate: Present students must have inTime
    const invalidRecords = changedRecords.filter(att => 
      att.status === 'present' && !att.inTime
    );

    if (invalidRecords.length > 0) {
      const studentNames = invalidRecords.map(att => {
        const student = batchStudents.find(s => s._id === att.studentId);
        return student ? `${student.firstName} ${student.lastName}` : att.studentId;
      }).join(', ');
      setError(`In Time is required for present students: ${studentNames}`);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      // Submit attendance for only changed students
      const promises = changedRecords.map(attendance =>
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
      setSuccess({ show: true, count: changedRecords.length });
      
      // Update original attendance to match current (so re-submit won't send again)
      setOriginalAttendance(JSON.parse(JSON.stringify(studentAttendance)));
      
      // Mark submitted students as having existing records in DB
      setExistingRecords(prev => {
        const updated = new Set(prev);
        changedRecords.forEach(att => updated.add(att.studentId));
        return updated;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="attendance-page">
      <h3 className="attendance-title">Mark Attendance</h3>

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
          <h2>Batch Details</h2>

          <div className="selection-controls">
            <div className="date-picker-group">
              <label>Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
            </div>

            <div className="batch-picker-group">
              <label>Batch</label>
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
            <div className="attendance-header">
              <h2>Mark Attendance - {selectedBatch.name}</h2>
              {getChangedCount() > 0 && (
                <span className="unsaved-badge">
                  {getChangedCount()} unsaved change{getChangedCount() !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="date-info">Date: {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>

            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>In Time</th>
                    <th>Out Time</th>
                    <th>Status</th>
                    <th>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {batchStudents.map((student, idx) => (
                    <tr key={student._id} className={hasStudentChanged(student._id) ? 'row-modified' : ''}>
                      <td className="index-cell">{idx + 1}</td>
                      <td className="student-name">
                        {student.firstName} {student.lastName}
                        {hasStudentChanged(student._id) && <span className="modified-indicator">●</span>}
                      </td>
                      <td className="student-email">{student.email}</td>
                      <td>
                        <div className="time-input-wrapper">
                          <input
                            type="time"
                            value={studentAttendance[student._id]?.inTime || ''}
                            onChange={(e) =>
                              handleAttendanceChange(student._id, 'inTime', e.target.value)
                            }
                            className={`time-input ${studentAttendance[student._id]?.status === 'present' && !studentAttendance[student._id]?.inTime ? 'required-field' : ''}`}
                            disabled={studentAttendance[student._id]?.status !== 'present'}
                          />
                          {studentAttendance[student._id]?.status === 'present' && !studentAttendance[student._id]?.inTime && (
                            <span className="required-star">*</span>
                          )}
                        </div>
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

            <div className="attendance-actions">
              <Button
                onClick={() => {
                  setSelectedBatch(null);
                  setAllBatchStudents([]);
                  setBatchStudents([]);
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitAttendance} 
                loading={submitting} 
                className="btn-primary"
                disabled={getChangedCount() === 0}
              >
                ✓ Submit {getChangedCount() > 0 ? `(${getChangedCount()} change${getChangedCount() !== 1 ? 's' : ''})` : 'Attendance'}
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

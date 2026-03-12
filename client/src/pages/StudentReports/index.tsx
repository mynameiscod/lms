import React, { useState, useEffect, useCallback } from 'react';
import { searchStudents, getStudentReport, getAllStudentsSummary, StudentReportData, StudentSummary } from '../../api/studentReportApi';
import { batchApi } from '../../api';
import './StudentReports.css';

const StudentReports: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentReportData | null>(null);
  const [batches, setBatches] = useState<Array<{ _id: string; name: string }>>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'quizzes' | 'assignments' | 'fees' | 'interviews' | 'exams'>('overview');

  useEffect(() => {
    loadBatches();
    loadAllStudents();
  }, []);

  const loadBatches = async () => {
    try {
      const response = await batchApi.getBatches();
      setBatches(response.data || response);
    } catch (error) {
      console.error('Error loading batches:', error);
    }
  };

  const loadAllStudents = async (batchId?: string) => {
    setLoading(true);
    try {
      const data = await getAllStudentsSummary(batchId);
      setStudents(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      loadAllStudents(selectedBatch || undefined);
      return;
    }
    setLoading(true);
    try {
      const data = await searchStudents(searchQuery);
      setStudents(data);
    } catch (error) {
      console.error('Error searching students:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedBatch]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery, handleSearch]);

  const handleBatchChange = (batchId: string) => {
    setSelectedBatch(batchId);
    setSearchQuery('');
    loadAllStudents(batchId || undefined);
  };

  const handleSelectStudent = async (studentId: string) => {
    setReportLoading(true);
    try {
      const report = await getStudentReport(studentId);
      setSelectedStudent(report);
      setActiveTab('overview');
    } catch (error) {
      console.error('Error loading student report:', error);
    } finally {
      setReportLoading(false);
    }
  };

  const renderOverview = () => {
    if (!selectedStudent) return null;
    const { attendance, quizzes, assignments, fees, interviews, exams } = selectedStudent;

    return (
      <div className="overview-grid">
        <div className="overview-card attendance">
          <div className="overview-icon">📅</div>
          <div className="overview-content">
            <h4>Attendance</h4>
            <div className="overview-stat">{attendance.percentage}%</div>
            <div className="overview-details">
              <span>Present: {attendance.present}</span>
              <span>Absent: {attendance.absent}</span>
              <span>Late: {attendance.lateArrivals}</span>
            </div>
          </div>
        </div>

        <div className="overview-card quizzes">
          <div className="overview-icon">📝</div>
          <div className="overview-content">
            <h4>Quizzes</h4>
            <div className="overview-stat">{quizzes.completed}/{quizzes.total}</div>
            <div className="overview-details">
              <span>Passed: {quizzes.passed}</span>
              <span>Failed: {quizzes.failed}</span>
              <span>Avg: {quizzes.averageScore}%</span>
            </div>
          </div>
        </div>

        <div className="overview-card assignments">
          <div className="overview-icon">💻</div>
          <div className="overview-content">
            <h4>Assignments</h4>
            <div className="overview-stat">{assignments.graded}/{assignments.total}</div>
            <div className="overview-details">
              <span>Pending: {assignments.pending}</span>
              <span>Late: {assignments.late}</span>
              <span>Avg: {assignments.averageScore}</span>
            </div>
          </div>
        </div>

        <div className="overview-card fees">
          <div className="overview-icon">💰</div>
          <div className="overview-content">
            <h4>Fees</h4>
            <div className="overview-stat">{fees.status}</div>
            <div className="overview-details">
              <span>Total: ₹{fees.totalAmount}</span>
              <span>Paid: ₹{fees.paidAmount}</span>
              <span>Due: ₹{fees.dueAmount}</span>
            </div>
          </div>
        </div>

        <div className="overview-card interviews">
          <div className="overview-icon">🎤</div>
          <div className="overview-content">
            <h4>Interviews</h4>
            <div className="overview-stat">{interviews.attended}/{interviews.total}</div>
            <div className="overview-details">
              <span>Mock: {interviews.mock}</span>
              <span>Passed: {interviews.passed}</span>
              <span>Avg: {interviews.averageScore}%</span>
            </div>
          </div>
        </div>

        <div className="overview-card exams">
          <div className="overview-icon">📊</div>
          <div className="overview-content">
            <h4>Exams</h4>
            <div className="overview-stat">{exams.passed}/{exams.total}</div>
            <div className="overview-details">
              <span>Passed: {exams.passed}</span>
              <span>Failed: {exams.failed}</span>
              <span>Avg: {exams.averagePercentage}%</span>
            </div>
          </div>
        </div>

        <div className="overview-card communication">
          <div className="overview-icon">💬</div>
          <div className="overview-content">
            <h4>Communication</h4>
            <div className="overview-stat">{interviews.communicationAvg}%</div>
            <div className="overview-details">
              <span>From {interviews.attended} interviews</span>
            </div>
          </div>
        </div>

        <div className="overview-card technical">
          <div className="overview-icon">⚙️</div>
          <div className="overview-content">
            <h4>Technical Skills</h4>
            <div className="overview-stat">{interviews.technicalAvg}%</div>
            <div className="overview-details">
              <span>From {interviews.attended} interviews</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendance = () => {
    if (!selectedStudent) return null;
    const { attendance } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total Days</span>
            <span className="stat-value">{attendance.total}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Present</span>
            <span className="stat-value">{attendance.present}</span>
          </div>
          <div className="stat-box absent">
            <span className="stat-label">Absent</span>
            <span className="stat-value">{attendance.absent}</span>
          </div>
          <div className="stat-box leave">
            <span className="stat-label">Leave</span>
            <span className="stat-value">{attendance.leave}</span>
          </div>
          <div className="stat-box late">
            <span className="stat-label">Late Arrivals</span>
            <span className="stat-value">{attendance.lateArrivals}</span>
          </div>
          <div className="stat-box percentage">
            <span className="stat-label">Percentage</span>
            <span className="stat-value">{attendance.percentage}%</span>
          </div>
        </div>

        <h4>Recent Attendance</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>In Time</th>
              <th>Out Time</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {attendance.recentRecords.map((record: any, idx: number) => (
              <tr key={idx}>
                <td>{new Date(record.date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${record.status}`}>
                    {record.status}
                  </span>
                </td>
                <td>{record.inTime || '-'}</td>
                <td>{record.outTime || '-'}</td>
                <td>{record.remarks || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderQuizzes = () => {
    if (!selectedStudent) return null;
    const { quizzes } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-value">{quizzes.total}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{quizzes.completed}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Passed</span>
            <span className="stat-value">{quizzes.passed}</span>
          </div>
          <div className="stat-box absent">
            <span className="stat-label">Failed</span>
            <span className="stat-value">{quizzes.failed}</span>
          </div>
          <div className="stat-box percentage">
            <span className="stat-label">Average Score</span>
            <span className="stat-value">{quizzes.averageScore}%</span>
          </div>
        </div>

        <h4>Recent Quiz Attempts</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Quiz</th>
              <th>Score</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.recentAttempts.map((attempt: any, idx: number) => (
              <tr key={idx}>
                <td>{attempt.quizId?.title || 'Unknown'}</td>
                <td>{attempt.score || 0}/{attempt.quizId?.totalMarks || 100}</td>
                <td>
                  <span className={`status-badge ${attempt.status}`}>
                    {attempt.status}
                  </span>
                </td>
                <td>{attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAssignments = () => {
    if (!selectedStudent) return null;
    const { assignments } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-value">{assignments.total}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Submitted</span>
            <span className="stat-value">{assignments.submitted}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Graded</span>
            <span className="stat-value">{assignments.graded}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Pending</span>
            <span className="stat-value">{assignments.pending}</span>
          </div>
          <div className="stat-box late">
            <span className="stat-label">Late</span>
            <span className="stat-value">{assignments.late}</span>
          </div>
          <div className="stat-box percentage">
            <span className="stat-label">Average Score</span>
            <span className="stat-value">{assignments.averageScore}</span>
          </div>
        </div>

        <h4>Recent Submissions</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Score</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {assignments.recentSubmissions.map((sub: any, idx: number) => (
              <tr key={idx}>
                <td>{sub.assignmentId?.title || 'Unknown'}</td>
                <td>{sub.totalScore || 0}/{sub.assignmentId?.totalPoints || 100}</td>
                <td>
                  <span className={`status-badge ${sub.status?.toLowerCase()}`}>
                    {sub.status}
                  </span>
                </td>
                <td>{sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderFees = () => {
    if (!selectedStudent) return null;
    const { fees } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total Amount</span>
            <span className="stat-value">₹{fees.totalAmount.toLocaleString()}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Paid</span>
            <span className="stat-value">₹{fees.paidAmount.toLocaleString()}</span>
          </div>
          <div className="stat-box absent">
            <span className="stat-label">Due</span>
            <span className="stat-value">₹{fees.dueAmount.toLocaleString()}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Status</span>
            <span className={`stat-value status-${fees.status}`}>{fees.status.toUpperCase()}</span>
          </div>
        </div>

        <h4>Payment History</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction ID</th>
              <th>Received By</th>
            </tr>
          </thead>
          <tbody>
            {fees.payments.length === 0 ? (
              <tr>
                <td colSpan={5} className="no-data">No payment records found</td>
              </tr>
            ) : (
              fees.payments.map((payment: any, idx: number) => (
                <tr key={idx}>
                  <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                  <td>₹{payment.amount.toLocaleString()}</td>
                  <td>{payment.paymentMethod}</td>
                  <td>{payment.transactionId || '-'}</td>
                  <td>{payment.receivedBy?.firstName || '-'} {payment.receivedBy?.lastName || ''}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderInterviews = () => {
    if (!selectedStudent) return null;
    const { interviews } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-value">{interviews.total}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Mock</span>
            <span className="stat-value">{interviews.mock}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Real</span>
            <span className="stat-value">{interviews.real}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Attended</span>
            <span className="stat-value">{interviews.attended}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Passed</span>
            <span className="stat-value">{interviews.passed}</span>
          </div>
          <div className="stat-box percentage">
            <span className="stat-label">Overall Avg</span>
            <span className="stat-value">{interviews.averageScore}%</span>
          </div>
        </div>

        <div className="scores-row">
          <div className="score-card">
            <div className="score-label">Communication Score</div>
            <div className="score-value">{interviews.communicationAvg}%</div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${interviews.communicationAvg}%` }}></div>
            </div>
          </div>
          <div className="score-card">
            <div className="score-label">Technical Score</div>
            <div className="score-value">{interviews.technicalAvg}%</div>
            <div className="score-bar">
              <div className="score-fill" style={{ width: `${interviews.technicalAvg}%` }}></div>
            </div>
          </div>
        </div>

        <h4>Recent Interviews</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Company</th>
              <th>Overall Score</th>
              <th>Status</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {interviews.recentInterviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">No interview records found</td>
              </tr>
            ) : (
              interviews.recentInterviews.map((interview: any, idx: number) => (
                <tr key={idx}>
                  <td>{new Date(interview.date).toLocaleDateString()}</td>
                  <td>{interview.type}</td>
                  <td>{interview.companyName || '-'}</td>
                  <td>{interview.scores?.overall || 0}%</td>
                  <td>
                    <span className={`status-badge ${interview.status}`}>
                      {interview.status}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${interview.result || 'pending'}`}>
                      {interview.result || 'pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderExams = () => {
    if (!selectedStudent) return null;
    const { exams } = selectedStudent;

    return (
      <div className="detail-section">
        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-label">Total</span>
            <span className="stat-value">{exams.total}</span>
          </div>
          <div className="stat-box present">
            <span className="stat-label">Passed</span>
            <span className="stat-value">{exams.passed}</span>
          </div>
          <div className="stat-box absent">
            <span className="stat-label">Failed</span>
            <span className="stat-value">{exams.failed}</span>
          </div>
          <div className="stat-box percentage">
            <span className="stat-label">Average %</span>
            <span className="stat-value">{exams.averagePercentage}%</span>
          </div>
        </div>

        <h4>Recent Exams</h4>
        <table className="data-table">
          <thead>
            <tr>
              <th>Exam Name</th>
              <th>Type</th>
              <th>Date</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {exams.recentExams.length === 0 ? (
              <tr>
                <td colSpan={6} className="no-data">No exam records found</td>
              </tr>
            ) : (
              exams.recentExams.map((exam: any, idx: number) => (
                <tr key={idx}>
                  <td>{exam.examName}</td>
                  <td>{exam.examType}</td>
                  <td>{new Date(exam.date).toLocaleDateString()}</td>
                  <td>{exam.scoredMarks}/{exam.maxScore}</td>
                  <td>{exam.percentage}%</td>
                  <td>
                    <span className={`status-badge ${exam.result}`}>
                      {exam.result}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="student-reports-page">
      <div className="page-header">
        <h1>Student Reports</h1>
        <p>Search and view comprehensive student performance reports</p>
      </div>

      <div className="reports-container">
        {/* Left Panel - Student List */}
        <div className="students-panel">
          <div className="search-filters">
            <div className="search-input">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon">🔍</span>
            </div>
            <select
              value={selectedBatch}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="batch-filter"
            >
              <option value="">All Batches</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="students-list">
            {loading ? (
              <div className="loading">Loading students...</div>
            ) : students.length === 0 ? (
              <div className="no-students">No students found</div>
            ) : (
              students.map((student) => (
                <div
                  key={student._id}
                  className={`student-item ${selectedStudent?.student._id === student._id ? 'selected' : ''}`}
                  onClick={() => handleSelectStudent(student._id)}
                >
                  <div className="student-avatar">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div className="student-info">
                    <div className="student-name">{student.firstName} {student.lastName}</div>
                    <div className="student-email">{student.email}</div>
                    {student.batch && (
                      <div className="student-batch">{student.batch.name}</div>
                    )}
                  </div>
                  <div className="student-quick-stats">
                    <span title="Attendance">{student.attendancePercentage}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Report Details */}
        <div className="report-panel">
          {reportLoading ? (
            <div className="loading-report">
              <div className="spinner"></div>
              <p>Loading report...</p>
            </div>
          ) : !selectedStudent ? (
            <div className="no-selection">
              <div className="no-selection-icon">📊</div>
              <h3>Select a Student</h3>
              <p>Choose a student from the list to view their detailed report</p>
            </div>
          ) : (
            <>
              <div className="student-header">
                <div className="student-avatar-large">
                  {selectedStudent.student.firstName[0]}{selectedStudent.student.lastName[0]}
                </div>
                <div className="student-header-info">
                  <h2>{selectedStudent.student.firstName} {selectedStudent.student.lastName}</h2>
                  <p>{selectedStudent.student.email}</p>
                  {selectedStudent.student.batch && (
                    <span className="batch-badge">{selectedStudent.student.batch.name}</span>
                  )}
                </div>
              </div>

              <div className="report-tabs">
                <button 
                  className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`tab ${activeTab === 'attendance' ? 'active' : ''}`}
                  onClick={() => setActiveTab('attendance')}
                >
                  Attendance
                </button>
                <button 
                  className={`tab ${activeTab === 'quizzes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('quizzes')}
                >
                  Quizzes
                </button>
                <button 
                  className={`tab ${activeTab === 'assignments' ? 'active' : ''}`}
                  onClick={() => setActiveTab('assignments')}
                >
                  Assignments
                </button>
                <button 
                  className={`tab ${activeTab === 'fees' ? 'active' : ''}`}
                  onClick={() => setActiveTab('fees')}
                >
                  Fees
                </button>
                <button 
                  className={`tab ${activeTab === 'interviews' ? 'active' : ''}`}
                  onClick={() => setActiveTab('interviews')}
                >
                  Interviews
                </button>
                <button 
                  className={`tab ${activeTab === 'exams' ? 'active' : ''}`}
                  onClick={() => setActiveTab('exams')}
                >
                  Exams
                </button>
              </div>

              <div className="report-content">
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'quizzes' && renderQuizzes()}
                {activeTab === 'assignments' && renderAssignments()}
                {activeTab === 'fees' && renderFees()}
                {activeTab === 'interviews' && renderInterviews()}
                {activeTab === 'exams' && renderExams()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReports;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mockInterviewApi, { 
  MockInterview, 
  AssignInterviewData, 
  AssignBatchData,
  AssignmentStats,
  InterviewCategory
} from '../../api/mockInterviewApi';
import { batchApi, userApi, courseApi, subjectApi, chapterApi } from '../../api';
import { Button, Modal, Input, Alert, Spinner } from '../../components/common';
import './AssignInterview.css';

interface Batch {
  _id: string;
  name: string;
  students?: string[];
}

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Course {
  _id: string;
  name: string;
}

interface Subject {
  _id: string;
  name: string;
  courseId: string;
}

interface Chapter {
  _id: string;
  name: string;
  subjectId: string;
}

const AssignInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<InterviewCategory[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [assignedInterviews, setAssignedInterviews] = useState<MockInterview[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'single' | 'batch'>('single');
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    studentId: '',
    batchId: '',
    selectedStudents: [] as string[],
    category: '',
    subCategory: '',
    targetCompany: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    totalQuestions: 10,
    timeLimit: 30,
    dueDate: '',
    assignmentNote: '',
    assignmentPriority: 'medium' as 'low' | 'medium' | 'high',
    recordingEnabled: false,
    courseId: '',
    subjectId: '',
    chapterId: ''
  });
  
  // Filter state
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAssignedInterviews();
  }, [filterStatus, filterBatch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, batchesRes, studentsRes, statsRes, coursesRes] = await Promise.all([
        mockInterviewApi.getCategories(),
        batchApi.getBatches(),
        userApi.getUsers(),
        mockInterviewApi.getAssignmentStats(),
        courseApi.getCourses({ isActive: true })
      ]);
      
      setCategories(categoriesRes);
      setBatches(batchesRes.data || []);
      // Filter only students
      const studentUsers = (studentsRes.data || []).filter(
        (u: any) => u.role?.toUpperCase() === 'STUDENT'
      );
      setStudents(studentUsers);
      setStats(statsRes);
      setCourses(coursesRes.data || coursesRes || []);
      
      await fetchAssignedInterviews();
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Load subjects when course changes
  useEffect(() => {
    if (formData.courseId) {
      loadSubjects(formData.courseId);
    } else {
      setSubjects([]);
      setChapters([]);
    }
  }, [formData.courseId]);

  // Load chapters when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      loadChapters(formData.subjectId);
    } else {
      setChapters([]);
    }
  }, [formData.subjectId]);

  const loadSubjects = async (courseId: string) => {
    try {
      const res = await subjectApi.getSubjectsByCourse(courseId);
      setSubjects(res.data || res || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
      setSubjects([]);
    }
  };

  const loadChapters = async (subjectId: string) => {
    try {
      const res = await chapterApi.getChaptersBySubject(subjectId);
      setChapters(res.data || res || []);
    } catch (err) {
      console.error('Failed to load chapters:', err);
      setChapters([]);
    }
  };

  const fetchAssignedInterviews = async () => {
    try {
      const result = await mockInterviewApi.getAssignedInterviews({
        status: filterStatus || undefined,
        batchId: filterBatch || undefined,
        limit: 50
      });
      setAssignedInterviews(result.interviews);
    } catch (err: any) {
      console.error('Error fetching assigned interviews:', err);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    // Reset dependent fields when parent changes
    if (name === 'courseId') {
      setFormData(prev => ({
        ...prev,
        courseId: value,
        subjectId: '',
        chapterId: ''
      }));
      return;
    }
    
    if (name === 'subjectId') {
      setFormData(prev => ({
        ...prev,
        subjectId: value,
        chapterId: ''
      }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleBatchSelect = (batchId: string) => {
    const batch = batches.find(b => b._id === batchId);
    if (batch?.students) {
      setFormData(prev => ({
        ...prev,
        batchId,
        selectedStudents: batch.students || []
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        batchId,
        selectedStudents: []
      }));
    }
  };

  const toggleStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }));
  };

  const selectAllStudents = () => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: students.map(s => s._id)
    }));
  };

  const deselectAllStudents = () => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (assignmentType === 'single') {
        if (!formData.studentId) {
          throw new Error('Please select a student');
        }
        
        const data: AssignInterviewData = {
          studentId: formData.studentId,
          category: formData.category,
          subCategory: formData.subCategory || undefined,
          targetCompany: formData.targetCompany || undefined,
          difficulty: formData.difficulty,
          totalQuestions: formData.totalQuestions,
          timeLimit: formData.timeLimit,
          dueDate: formData.dueDate || undefined,
          assignmentNote: formData.assignmentNote || undefined,
          assignmentPriority: formData.assignmentPriority,
          recordingEnabled: formData.recordingEnabled,
          batchId: formData.batchId || undefined,
          courseId: formData.courseId || undefined,
          subjectId: formData.subjectId || undefined,
          chapterId: formData.chapterId || undefined
        };
        
        await mockInterviewApi.assignToStudent(data);
        setSuccess('Interview assigned successfully!');
      } else {
        if (!formData.batchId || formData.selectedStudents.length === 0) {
          throw new Error('Please select a batch and at least one student');
        }
        
        const data: AssignBatchData = {
          batchId: formData.batchId,
          studentIds: formData.selectedStudents,
          category: formData.category,
          subCategory: formData.subCategory || undefined,
          targetCompany: formData.targetCompany || undefined,
          difficulty: formData.difficulty,
          totalQuestions: formData.totalQuestions,
          timeLimit: formData.timeLimit,
          dueDate: formData.dueDate || undefined,
          assignmentNote: formData.assignmentNote || undefined,
          assignmentPriority: formData.assignmentPriority,
          recordingEnabled: formData.recordingEnabled,
          courseId: formData.courseId || undefined,
          subjectId: formData.subjectId || undefined,
          chapterId: formData.chapterId || undefined
        };
        
        const result = await mockInterviewApi.assignToBatch(data);
        setSuccess(`Interviews assigned: ${result.created} created, ${result.failed.length} failed`);
      }
      
      setIsModalOpen(false);
      fetchData();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to assign interview');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      studentId: '',
      batchId: '',
      selectedStudents: [],
      category: '',
      subCategory: '',
      targetCompany: '',
      difficulty: 'medium',
      totalQuestions: 10,
      timeLimit: 30,
      dueDate: '',
      assignmentNote: '',
      assignmentPriority: 'medium',
      recordingEnabled: false,
      courseId: '',
      subjectId: '',
      chapterId: ''
    });
    setSubjects([]);
    setChapters([]);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      'scheduled': 'badge-info',
      'in-progress': 'badge-warning',
      'completed': 'badge-success',
      'cancelled': 'badge-secondary',
      'expired': 'badge-danger'
    };
    return badges[status] || 'badge-secondary';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      'low': 'priority-low',
      'medium': 'priority-medium',
      'high': 'priority-high'
    };
    return badges[priority] || 'priority-medium';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate?: string, status?: string) => {
    if (!dueDate || status === 'completed' || status === 'cancelled') return false;
    return new Date(dueDate) < new Date();
  };

  const selectedCategory = categories.find(c => c.id === formData.category);

  if (loading) {
    return (
      <div className="assign-interview-page">
        <div className="loading-container">
          <Spinner size="large" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="assign-interview-page">
      <div className="page-header">
        <div className="header-content">
          <h1>📋 Assign Mock Interviews</h1>
          <p>Assign mock interviews to students and track their progress</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} variant="primary">
          + Assign Interview
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalAssigned}</div>
            <div className="stat-label">Total Assigned</div>
          </div>
          <div className="stat-card completed">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
          <div className="stat-card overdue">
            <div className="stat-value">{stats.overdue}</div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.averageScore}%</div>
            <div className="stat-label">Avg Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="filter-select"
        >
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        
        <select 
          value={filterBatch} 
          onChange={(e) => setFilterBatch(e.target.value)}
          className="filter-select"
        >
          <option value="">All Batches</option>
          {batches.map(batch => (
            <option key={batch._id} value={batch._id}>{batch.name}</option>
          ))}
        </select>
      </div>

      {/* Assigned Interviews Table */}
      <div className="interviews-table-container">
        <table className="interviews-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Category</th>
              <th>Chapter</th>
              <th>Due Date</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Score</th>
              <th>Recording</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignedInterviews.length === 0 ? (
              <tr>
                <td colSpan={9} className="no-data">No assigned interviews found</td>
              </tr>
            ) : (
              assignedInterviews.map(interview => (
                <tr key={interview._id} className={isOverdue(interview.dueDate, interview.status) ? 'overdue-row' : ''}>
                  <td>
                    <div className="student-info">
                      <strong>
                        {typeof interview.studentId === 'object' 
                          ? interview.studentId.name 
                          : 'Unknown'}
                      </strong>
                      <span className="email">
                        {typeof interview.studentId === 'object' 
                          ? interview.studentId.email 
                          : ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="category-badge">
                      {interview.category}
                      {interview.subCategory && ` - ${interview.subCategory}`}
                    </span>
                  </td>
                  <td>
                    {interview.chapterId ? (
                      <span className="chapter-badge">
                        📚 {typeof interview.chapterId === 'object' 
                          ? (interview.chapterId as any).name 
                          : 'Chapter'}
                      </span>
                    ) : (
                      <span className="no-chapter">-</span>
                    )}
                  </td>
                  <td>
                    <span className={isOverdue(interview.dueDate, interview.status) ? 'overdue-date' : ''}>
                      {formatDate(interview.dueDate)}
                    </span>
                  </td>
                  <td>
                    <span className={`priority-badge ${getPriorityBadge(interview.assignmentPriority || 'medium')}`}>
                      {interview.assignmentPriority || 'medium'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(interview.status)}`}>
                      {interview.status}
                    </span>
                  </td>
                  <td>
                    {interview.status === 'completed' && interview.overallScore !== undefined
                      ? `${interview.overallScore}%`
                      : '-'}
                  </td>
                  <td>
                    {interview.recordingEnabled ? (
                      interview.recordingUrl ? (
                        <a href={interview.recordingUrl} target="_blank" rel="noopener noreferrer" className="recording-link">
                          🎬 View
                        </a>
                      ) : (
                        <span className="recording-pending">📹 Enabled</span>
                      )
                    ) : (
                      <span className="recording-disabled">-</span>
                    )}
                  </td>
                  <td>
                    <Button 
                      variant="secondary" 
                      onClick={() => navigate(`/mock-interviews/${interview._id}/result`)}
                      disabled={interview.status !== 'completed'}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title="Assign Mock Interview"
        size="large"
      >
        <form onSubmit={handleSubmit} className="assign-form">
          {/* Assignment Type Toggle */}
          <div className="assignment-type-toggle">
            <button
              type="button"
              className={`toggle-btn ${assignmentType === 'single' ? 'active' : ''}`}
              onClick={() => setAssignmentType('single')}
            >
              👤 Single Student
            </button>
            <button
              type="button"
              className={`toggle-btn ${assignmentType === 'batch' ? 'active' : ''}`}
              onClick={() => setAssignmentType('batch')}
            >
              👥 Batch Assignment
            </button>
          </div>

          {/* Student/Batch Selection */}
          {assignmentType === 'single' ? (
            <div className="form-group">
              <label>Select Student *</label>
              <select
                name="studentId"
                value={formData.studentId}
                onChange={handleFormChange}
                required
              >
                <option value="">Choose a student...</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} ({student.email})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="form-group">
                <label>Select Batch *</label>
                <select
                  name="batchId"
                  value={formData.batchId}
                  onChange={(e) => handleBatchSelect(e.target.value)}
                  required
                >
                  <option value="">Choose a batch...</option>
                  {batches.map(batch => (
                    <option key={batch._id} value={batch._id}>{batch.name}</option>
                  ))}
                </select>
              </div>
              
              {formData.batchId && (
                <div className="form-group">
                  <label>Select Students ({formData.selectedStudents.length} selected)</label>
                  <div className="student-selection-controls">
                    <Button type="button" variant="secondary" onClick={selectAllStudents}>
                      Select All
                    </Button>
                    <Button type="button" variant="secondary" onClick={deselectAllStudents}>
                      Deselect All
                    </Button>
                  </div>
                  <div className="students-checkbox-list">
                    {students.map(student => (
                      <label key={student._id} className="student-checkbox">
                        <input
                          type="checkbox"
                          checked={formData.selectedStudents.includes(student._id)}
                          onChange={() => toggleStudent(student._id)}
                        />
                        <span>{student.name}</span>
                        <span className="email">{student.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Category Selection */}
          <div className="form-row">
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleFormChange}
                required
              >
                <option value="">Choose category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
            
            {selectedCategory?.subCategories && selectedCategory.subCategories.length > 0 && (
              <div className="form-group">
                <label>Sub-Category</label>
                <select
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleFormChange}
                >
                  <option value="">All topics</option>
                  {selectedCategory.subCategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.category === 'company-specific' && (
            <div className="form-group">
              <label>Target Company</label>
              <Input
                name="targetCompany"
                value={formData.targetCompany}
                onChange={handleFormChange}
                placeholder="e.g., TCS, Infosys, Wipro"
              />
            </div>
          )}

          {/* Course > Subject > Chapter Selection */}
          <div className="form-section">
            <h4>📚 Link to Chapter (Optional)</h4>
            <p className="help-text">Select a course, subject, and chapter to link interview questions from that chapter</p>
            
            <div className="form-row three-cols">
              <div className="form-group">
                <label>Course</label>
                <select
                  name="courseId"
                  value={formData.courseId}
                  onChange={handleFormChange}
                >
                  <option value="">Select course...</option>
                  {courses.map(course => (
                    <option key={course._id} value={course._id}>{course.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Subject</label>
                <select
                  name="subjectId"
                  value={formData.subjectId}
                  onChange={handleFormChange}
                  disabled={!formData.courseId}
                >
                  <option value="">Select subject...</option>
                  {subjects.map(subject => (
                    <option key={subject._id} value={subject._id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Chapter</label>
                <select
                  name="chapterId"
                  value={formData.chapterId}
                  onChange={handleFormChange}
                  disabled={!formData.subjectId}
                >
                  <option value="">Select chapter...</option>
                  {chapters.map(chapter => (
                    <option key={chapter._id} value={chapter._id}>{chapter.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Difficulty & Questions */}
          <div className="form-row">
            <div className="form-group">
              <label>Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleFormChange}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Questions</label>
              <Input
                type="number"
                name="totalQuestions"
                value={formData.totalQuestions}
                onChange={handleFormChange}
                min={5}
                max={30}
              />
            </div>
            
            <div className="form-group">
              <label>Time Limit (min)</label>
              <Input
                type="number"
                name="timeLimit"
                value={formData.timeLimit}
                onChange={handleFormChange}
                min={10}
                max={120}
              />
            </div>
          </div>

          {/* Due Date & Priority */}
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <Input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleFormChange}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="form-group">
              <label>Priority</label>
              <select
                name="assignmentPriority"
                value={formData.assignmentPriority}
                onChange={handleFormChange}
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>
          </div>

          {/* Recording Option */}
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="recordingEnabled"
                checked={formData.recordingEnabled}
                onChange={handleFormChange}
              />
              <span>📹 Enable Video Recording</span>
              <span className="help-text">Student's interview will be recorded for review</span>
            </label>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Assignment Notes</label>
            <textarea
              name="assignmentNote"
              value={formData.assignmentNote}
              onChange={handleFormChange}
              placeholder="Any instructions or notes for the student..."
              rows={3}
            />
          </div>

          {error && <Alert type="error" message={error} />}

          <div className="form-actions">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={submitting}
            >
              {submitting ? 'Assigning...' : 'Assign Interview'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AssignInterviewPage;

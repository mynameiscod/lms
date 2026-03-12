import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button, Input, Alert } from '../common';
import { Batch } from '../../types';
import { courseApi, subjectApi, chapterApi } from '../../api';
import './QuizWizard.css';

interface Course {
  _id: string;
  title: string;
  code: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
}

interface Chapter {
  _id: string;
  title: string;
}

interface QuizFormData {
  title: string;
  description: string;
  instructions: string;
  courseId: string;
  subjectId: string;
  chapterId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  totalMarks: number;
  totalTime: number;
  access: 'public' | 'private';
  accessibleTo: 'everyone' | 'batch_wise' | 'individual';
  selectedBatches: string[];
  selectedStudents: string[];
  passingMarks: number;
  negativeMarking: boolean;
  negativeMarkingValue: number;
  shuffleQuestions: boolean;
  showAnswersAfterSubmit: boolean;
  showScoreAfterSubmit: boolean;
  allowReview: boolean;
  multipleAttempts: boolean;
  maxAttempts: number;
  canCopyPaste: boolean;
  requireFullScreen: boolean;
  tabSwitchWarnings: boolean;
  enableCamera: boolean;
  enableMicrophone: boolean;
}

interface QuizWizardProps {
  initialData?: Partial<QuizFormData>;
  batches: Batch[];
  isEditing?: boolean;
  onSubmit: (data: QuizFormData) => Promise<void>;
  onClose: () => void;
}

const QuizWizard: React.FC<QuizWizardProps> = ({
  initialData,
  batches,
  isEditing = false,
  onSubmit,
  onClose
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Get current date and time for defaults
  const now = new Date();
  // Use local timezone, not UTC
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayDate = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMinute = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHour}:${currentMinute}`;

  // Helper function to format date from ISO format
  const formatDateForInput = (dateStr?: string): string => {
    if (!dateStr) return todayDate;
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // If it's ISO format or other, parse and format
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return todayDate;
    }
  };

  // Helper function to format time for input
  const formatTimeForInput = (timeStr?: string): string => {
    if (!timeStr) return currentTime;
    // If it's already in HH:MM format, return as is
    if (/^\d{2}:\d{2}/.test(timeStr)) return timeStr.substring(0, 5);
    return currentTime;
  };

  const [formData, setFormData] = useState<QuizFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    instructions: (initialData as any)?.instructions || '',
    courseId: (initialData as any)?.courseId || '',
    subjectId: (initialData as any)?.subjectId || '',
    chapterId: (initialData as any)?.chapterId || '',
    startDate: formatDateForInput(initialData?.startDate),
    endDate: formatDateForInput(initialData?.endDate),
    startTime: formatTimeForInput(initialData?.startTime),
    endTime: formatTimeForInput(initialData?.endTime),
    totalMarks: initialData?.totalMarks || 100,
    totalTime: initialData?.totalTime || 60,
    access: initialData?.access || 'public',
    accessibleTo: initialData?.accessibleTo || 'everyone',
    selectedBatches: initialData?.selectedBatches || [],
    selectedStudents: initialData?.selectedStudents || [],
    passingMarks: initialData?.passingMarks || 50,
    negativeMarking: initialData?.negativeMarking || false,
    negativeMarkingValue: initialData?.negativeMarkingValue || 0,
    shuffleQuestions: initialData?.shuffleQuestions || false,
    showAnswersAfterSubmit: initialData?.showAnswersAfterSubmit !== false,
    showScoreAfterSubmit: initialData?.showScoreAfterSubmit !== false,
    allowReview: initialData?.allowReview !== false,
    multipleAttempts: initialData?.multipleAttempts || false,
    maxAttempts: initialData?.maxAttempts || 1,
    canCopyPaste: initialData?.canCopyPaste || false,
    requireFullScreen: initialData?.requireFullScreen || false,
    tabSwitchWarnings: initialData?.tabSwitchWarnings !== false,
    enableCamera: (initialData as any)?.enableCamera || false,
    enableMicrophone: (initialData as any)?.enableMicrophone || false
  });

  // Course, Subject, Chapter state
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Rich text editor configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      ['blockquote', 'code-block'],
      ['link'],
      ['clean']
    ],
  }), []);

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'blockquote', 'code-block',
    'link'
  ];

  // Fetch courses on mount
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await courseApi.getCourses({ isActive: true });
        setCourses(res.data || res || []);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    };
    fetchCourses();
  }, []);

  // Fetch subjects when course changes
  useEffect(() => {
    if (formData.courseId) {
      const fetchSubjects = async () => {
        try {
          const res = await subjectApi.getSubjects({ courseId: formData.courseId });
          setSubjects(res.data || res || []);
        } catch (err) {
          console.error('Failed to fetch subjects:', err);
        }
      };
      fetchSubjects();
    } else {
      setSubjects([]);
      setFormData(prev => ({ ...prev, subjectId: '', chapterId: '' }));
    }
  }, [formData.courseId]);

  // Fetch chapters when subject changes
  useEffect(() => {
    if (formData.subjectId) {
      const fetchChapters = async () => {
        try {
          const res = await chapterApi.getChapters({ subjectId: formData.subjectId });
          setChapters(res.data || res || []);
        } catch (err) {
          console.error('Failed to fetch chapters:', err);
        }
      };
      fetchChapters();
    } else {
      setChapters([]);
      setFormData(prev => ({ ...prev, chapterId: '' }));
    }
  }, [formData.subjectId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? Number(value) : value)
    }));
  };

  const handleBatchToggle = (batchId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedBatches: prev.selectedBatches.includes(batchId)
        ? prev.selectedBatches.filter(id => id !== batchId)
        : [...prev.selectedBatches, batchId]
    }));
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter(id => id !== studentId)
        : [...prev.selectedStudents, studentId]
    }));
  };

  const validateStep = (currentStep: number): boolean => {
    setError('');
    
    switch (currentStep) {
      case 1:
        if (!formData.title.trim()) {
          setError('Quiz title is required');
          return false;
        }
        if (!formData.startDate || !formData.endDate) {
          setError('Start and end dates are required');
          return false;
        }
        // Validate date format
        const startDateObj = new Date(formData.startDate);
        const endDateObj = new Date(formData.endDate);
        if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
          setError('Invalid date format');
          return false;
        }
        // Validate end date is not before start date
        if (endDateObj < startDateObj) {
          setError('End date must be after start date');
          return false;
        }
        // Validate time if same day
        if (formData.startDate === formData.endDate) {
          const startTime = formData.startTime.split(':');
          const endTime = formData.endTime.split(':');
          const startMinutes = parseInt(startTime[0]) * 60 + parseInt(startTime[1]);
          const endMinutes = parseInt(endTime[0]) * 60 + parseInt(endTime[1]);
          if (endMinutes <= startMinutes) {
            setError('End time must be after start time on the same day');
            return false;
          }
        }
        return true;
      case 2:
        if (formData.totalMarks < 1) {
          setError('Total marks must be at least 1');
          return false;
        }
        if (formData.totalTime < 1) {
          setError('Duration must be at least 1 minute');
          return false;
        }
        if (formData.passingMarks < 0 || formData.passingMarks > formData.totalMarks) {
          setError('Passing marks must be between 0 and total marks');
          return false;
        }
        return true;
      case 3:
        return true;
      case 4:
        if (formData.accessibleTo === 'batch_wise' && formData.selectedBatches.length === 0) {
          setError('Please select at least one batch');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;
    
    try {
      setLoading(true);
      // Clean up data before submitting
      const submitData = {
        ...formData,
        maxAttempts: formData.multipleAttempts ? formData.maxAttempts : null,
        // Don't send empty strings for optional ObjectId fields
        courseId: formData.courseId || undefined,
        subjectId: formData.subjectId || undefined,
        chapterId: formData.chapterId || undefined,
      };
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-wizard">
      <div className="wizard-header">
        <div className="wizard-title-section">
          <button className="back-btn" onClick={onClose}>
            ← Back
          </button>
          <div>
            <h2>{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h2>
            <p className="header-subtitle">Step-by-step quiz configuration</p>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="wizard-progress">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`progress-step ${s === step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
            <div className="step-number">{s}</div>
            <div className="step-label">
              {s === 1 && 'Basic Info'}
              {s === 2 && 'Parameters'}
              {s === 3 && 'Settings'}
              {s === 4 && 'Access'}
            </div>
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && <Alert type="error" message={error} />}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="wizard-step">
          <h3>📋 Basic Information</h3>
          <div className="step-content">
            <div className="form-group full">
              <label>Quiz Title *</label>
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter an engaging quiz title"
                autoFocus
              />
            </div>

            <div className="form-group full">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of what this quiz covers"
                rows={3}
                className="textarea-input"
              />
            </div>

            <div className="form-group full">
              <label>Instructions (shown to students before starting)</label>
              <ReactQuill
                theme="snow"
                value={formData.instructions}
                onChange={(value) => setFormData(prev => ({ ...prev, instructions: value }))}
                modules={quillModules}
                formats={quillFormats}
                placeholder="Enter instructions for students (e.g., 'Read each question carefully. No switching tabs allowed. Each question carries equal marks.')"
                className="quill-editor"
              />
            </div>

            {/* Course/Subject/Chapter Assignment */}
            <div className="form-group">
              <label>Course (Optional)</label>
              <select
                name="courseId"
                value={formData.courseId}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="">-- Select Course --</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title} ({course.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Subject (Optional)</label>
              <select
                name="subjectId"
                value={formData.subjectId}
                onChange={handleInputChange}
                className="select-input"
                disabled={!formData.courseId}
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Chapter (Optional)</label>
              <select
                name="chapterId"
                value={formData.chapterId}
                onChange={handleInputChange}
                className="select-input"
                disabled={!formData.subjectId}
              >
                <option value="">-- Select Chapter --</option>
                {chapters.map((chapter) => (
                  <option key={chapter._id} value={chapter._id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="date-input"
                />
              </div>

              <div className="form-group">
                <label>End Date *</label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="date-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Start Time</label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  className="time-input"
                />
              </div>

              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  className="time-input"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Quiz Parameters */}
      {step === 2 && (
        <div className="wizard-step">
          <h3>Quiz Parameters</h3>
          <div className="step-content">
            <div className="form-group">
              <label>Total Marks *</label>
              <Input
                type="number"
                name="totalMarks"
                value={String(formData.totalMarks)}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 100"
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes) *</label>
              <Input
                type="number"
                name="totalTime"
                value={String(formData.totalTime)}
                onChange={handleInputChange}
                min="1"
                placeholder="e.g., 60"
              />
            </div>

            <div className="form-group">
              <label>Passing Marks</label>
              <Input
                type="number"
                name="passingMarks"
                value={String(formData.passingMarks)}
                onChange={handleInputChange}
                min="0"
                placeholder="Minimum marks to pass"
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="negativeMarking"
                  checked={formData.negativeMarking}
                  onChange={handleInputChange}
                />
                <span>Enable Negative Marking</span>
              </label>
            </div>

            {formData.negativeMarking && (
              <div className="form-group">
                <label>Negative Marking Value</label>
                <Input
                  type="number"
                  name="negativeMarkingValue"
                  value={String(formData.negativeMarkingValue)}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  placeholder="e.g., 0.5"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Quiz Settings */}
      {step === 3 && (
        <div className="wizard-step">
          <h3>Quiz Settings</h3>
          <div className="step-content">
            <div className="settings-grid">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleInputChange}
                />
                <span>Shuffle Questions</span>
                <small>Randomize question order for each student</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showAnswersAfterSubmit"
                  checked={formData.showAnswersAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Answers After Submit</span>
                <small>Students can see correct answers</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showScoreAfterSubmit"
                  checked={formData.showScoreAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Score After Submit</span>
                <small>Display immediate feedback</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowReview"
                  checked={formData.allowReview}
                  onChange={handleInputChange}
                />
                <span>Allow Review</span>
                <small>Students can review their answers</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="multipleAttempts"
                  checked={formData.multipleAttempts}
                  onChange={handleInputChange}
                />
                <span>Multiple Attempts</span>
                <small>Allow students to retake the quiz</small>
              </label>

              {formData.multipleAttempts && (
                <div className="form-group">
                  <label>Maximum Attempts</label>
                  <Input
                    type="number"
                    name="maxAttempts"
                    value={String(formData.maxAttempts)}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="Unlimited if empty"
                  />
                </div>
              )}

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requireFullScreen"
                  checked={formData.requireFullScreen}
                  onChange={handleInputChange}
                />
                <span>Require Full Screen</span>
                <small>Proctoring feature</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="tabSwitchWarnings"
                  checked={formData.tabSwitchWarnings}
                  onChange={handleInputChange}
                />
                <span>Tab Switch Warnings</span>
                <small>Warn students about switching tabs</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="canCopyPaste"
                  checked={formData.canCopyPaste}
                  onChange={handleInputChange}
                />
                <span>Allow Copy/Paste</span>
                <small>Students can copy text during quiz</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enableCamera"
                  checked={formData.enableCamera}
                  onChange={handleInputChange}
                />
                <span>📷 Enable Camera</span>
                <small>Require webcam access during quiz</small>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="enableMicrophone"
                  checked={formData.enableMicrophone}
                  onChange={handleInputChange}
                />
                <span>🎤 Enable Microphone</span>
                <small>Require microphone access during quiz</small>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Access Control */}
      {step === 4 && (
        <div className="wizard-step">
          <h3>🔒 Access Control</h3>
          <div className="step-content">
            <div className="form-group">
              <label>Access Level</label>
              <select
                name="access"
                value={formData.access}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="public">Public (Everyone can see)</option>
                <option value="private">Private (Restricted)</option>
              </select>
              <small style={{ display: 'block', marginTop: '0.5rem', color: '#666', fontSize: '0.85rem' }}>
                {formData.access === 'private' 
                  ? '🔒 Private: Only students you specifically grant access to can view this quiz'
                  : '🌍 Public: All students in the selected batches can see and access this quiz'}
              </small>
            </div>

            <div className="form-group">
              <label>Accessible To</label>
              <select
                name="accessibleTo"
                value={formData.accessibleTo}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="everyone">Everyone</option>
                <option value="batch_wise">Specific Batches</option>
                <option value="individual">Individual Students</option>
              </select>
            </div>

            {formData.accessibleTo === 'batch_wise' && (
              <div className="form-group full">
                <label>Select Batches *</label>
                <div className="batch-list">
                  {batches.length > 0 ? (
                    batches.map(batch => (
                      <label key={batch._id} className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={formData.selectedBatches.includes(batch._id)}
                          onChange={() => handleBatchToggle(batch._id)}
                        />
                        <span>{batch.name}</span>
                      </label>
                    ))
                  ) : (
                    <p className="no-batches">No batches available</p>
                  )}
                </div>
              </div>
            )}

            {formData.accessibleTo === 'individual' && (
              <div className="form-group full">
                <label>Select Students *</label>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Search students by name or email..."
                    className="text-input"
                    id="studentSearch"
                    style={{ marginBottom: '0.5rem' }}
                  />
                </div>
                <div style={{ 
                  maxHeight: '300px', 
                  overflowY: 'auto', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  padding: '0.5rem'
                }}>
                  {formData.selectedStudents && formData.selectedStudents.length > 0 ? (
                    <div>
                      <p style={{ margin: '0.5rem 0', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {formData.selectedStudents.length} student(s) selected
                      </p>
                      {formData.selectedStudents.map((studentId, index) => (
                        <div 
                          key={studentId} 
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '0.5rem',
                            backgroundColor: '#f8f9fa',
                            marginBottom: '0.3rem',
                            borderRadius: '3px'
                          }}
                        >
                          <span style={{ fontSize: '0.95rem' }}>Student ID: {studentId}</span>
                          <button
                            type="button"
                            onClick={() => handleStudentToggle(studentId)}
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#dc3545', 
                              cursor: 'pointer', 
                              fontSize: '1.5rem',
                              padding: '0'
                            }}
                            title="Remove student"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#6c757d', margin: '1rem 0' }}>No students selected yet</p>
                  )}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: '0.5rem' }}>
                  Note: You can enter student IDs or select from enrolled students. Contact admin to add students to specific quizzes.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="wizard-footer">
        <Button
          onClick={handlePrevious}
          className="btn-secondary"
          disabled={step === 1}
        >
          ← Previous
        </Button>

        <div className="step-indicator">Step {step} of 4</div>

        {step < 4 ? (
          <Button
            onClick={handleNext}
            className="btn-primary"
          >
            Next →
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="btn-success"
            disabled={loading}
          >
            {loading ? '⏳ Creating...' : '✓ Create Quiz'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuizWizard;

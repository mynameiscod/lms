import React, { useState, useEffect, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button, Input, Alert } from '../common';
import { Batch } from '../../types';
import { courseApi, subjectApi, chapterApi, userApi } from '../../api';
import { TECH_CATEGORIES } from '../../config/techCategories';
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
  primaryTech: string;
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
  warningCount: number;
  enableCamera: boolean;
  enableMicrophone: boolean;
  isExternalQuiz?: boolean;
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
    primaryTech: (initialData as any)?.primaryTech || '',
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
    // New quizzes default to "library": batch_wise + no batches = invisible to students
    // until delivered via Assign to Batches / a Learning Plan day.
    accessibleTo: initialData?.accessibleTo || 'batch_wise',
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
    warningCount: (initialData as any)?.warningCount || 3,
    enableCamera: (initialData as any)?.enableCamera || false,
    enableMicrophone: (initialData as any)?.enableMicrophone || false,
    isExternalQuiz: (initialData as any)?.isExternalQuiz || false
  });

  // Course, Subject, Chapter state
  const [courses, setCourses] = useState<Course[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Individual student picker state
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

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

  // Fetch all students when individual access is selected
  useEffect(() => {
    if (formData.accessibleTo === 'individual' && allStudents.length === 0) {
      const fetchStudents = async () => {
        try {
          const res = await userApi.getUsers();
          const users = res.users || res.data || res || [];
          setAllStudents(users.filter((u: any) => u.role === 'STUDENT'));
        } catch (err) {
          console.error('Failed to fetch students:', err);
        }
      };
      fetchStudents();
    }
  }, [formData.accessibleTo]);

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
        // Dates are optional here — real per-batch start/due windows are set in
        // "Assign to Batches". If both are provided, keep them consistent.
        if (formData.startDate && formData.endDate) {
          const startDateObj = new Date(formData.startDate);
          const endDateObj = new Date(formData.endDate);
          if (!isNaN(startDateObj.getTime()) && !isNaN(endDateObj.getTime()) && endDateObj < startDateObj) {
            setError('End date must be after start date');
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
        // Delivery/batch selection moved to "Assign to Batches" — nothing to validate here.
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
      // Dates are optional in the form (real windows come from Assign to Batches),
      // but the Quiz model still requires them — default to a wide open window so the
      // baked path never gates. Access defaults to batch_wise + no batches → invisible
      // until delivered.
      const today = new Date();
      const farEnd = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
      const ymd = (d: Date) => d.toISOString().slice(0, 10);
      const submitData = {
        ...formData,
        startDate: formData.startDate || ymd(today),
        endDate: formData.endDate || ymd(farEnd),
        startTime: formData.startTime || '00:00',
        endTime: formData.endTime || '23:59',
        maxAttempts: formData.multipleAttempts ? formData.maxAttempts : null,
        primaryTech: formData.primaryTech || undefined,
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
              {s === 4 && 'Delivery'}
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

            <div className="form-group">
              <label>Primary Language / Tech <span style={{ color: '#94a3b8', fontWeight: 400 }}>(for organizing &amp; reuse)</span></label>
              <select
                name="primaryTech"
                value={formData.primaryTech}
                onChange={handleInputChange}
                className="select-input"
              >
                <option value="">-- Select --</option>
                {TECH_CATEGORIES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
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

              {formData.tabSwitchWarnings && (
                <div className="form-group" style={{ marginLeft: '24px', marginTop: '-8px' }}>
                  <label style={{ fontSize: '0.85rem', color: '#555' }}>Auto-submit after how many tab switches? (0 = warn only, no auto-submit)</label>
                  <Input
                    type="number"
                    name="warningCount"
                    value={String(formData.warningCount)}
                    onChange={handleInputChange}
                    min="0"
                    max="20"
                    placeholder="e.g. 3"
                  />
                </div>
              )}

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
          <h3>🎯 Who can take this quiz?</h3>
          <div className="step-content">

            {/* Track A: Internal Students */}
            <div
              onClick={() => setFormData((prev: any) => ({ ...prev, isExternalQuiz: false }))}
              style={{
                border: `2px solid ${!(formData as any).isExternalQuiz ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 14,
                cursor: 'pointer',
                background: !(formData as any).isExternalQuiz ? '#f5f3ff' : '#fff',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: !(formData as any).isExternalQuiz ? 16 : 0 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${!(formData as any).isExternalQuiz ? '#6366f1' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {!(formData as any).isExternalQuiz && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>🎓 Reusable quiz (recommended)</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.6 }}>
                    Save it as reusable content. Then use <b>📅 Assign to Batches</b> (⋮ menu on Quiz Management) to deliver it to any batch — each with its own <b>start/due window &amp; late policy</b>. No cloning; it also works as a Learning Plan day item. Until you assign it, no student sees it.
                  </div>
                </div>
              </div>

              {false && !(formData as any).isExternalQuiz && (
                <div style={{ paddingLeft: 32 }}>
                  {/* Sub-selection */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {[
                      { value: 'everyone', label: '🌍 All Students' },
                      { value: 'batch_wise', label: '📦 By Batch' },
                      { value: 'individual', label: '👤 Specific Students' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={e => { e.stopPropagation(); setFormData((prev: any) => ({ ...prev, accessibleTo: opt.value, selectedBatches: [], selectedStudents: [] })); }}
                        style={{
                          border: `1.5px solid ${formData.accessibleTo === opt.value ? '#6366f1' : '#e5e7eb'}`,
                          borderRadius: 20,
                          padding: '5px 14px',
                          background: formData.accessibleTo === opt.value ? '#eef2ff' : '#fff',
                          color: formData.accessibleTo === opt.value ? '#6366f1' : '#6b7280',
                          fontWeight: formData.accessibleTo === opt.value ? 700 : 400,
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {formData.accessibleTo === 'batch_wise' && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Select Batch(es) *</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {batches.length > 0 ? batches.map(batch => (
                          <label key={batch._id} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1.5px solid ${formData.selectedBatches.includes(batch._id) ? '#6366f1' : '#e5e7eb'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', background: formData.selectedBatches.includes(batch._id) ? '#eef2ff' : '#fff', fontSize: 13 }}>
                            <input type="checkbox" checked={formData.selectedBatches.includes(batch._id)} onChange={() => handleBatchToggle(batch._id)} style={{ accentColor: '#6366f1' }} />
                            {batch.name}
                          </label>
                        )) : <span style={{ color: '#9ca3af', fontSize: 13 }}>No batches available</span>}
                      </div>
                    </div>
                  )}

                  {formData.accessibleTo === 'individual' && (
                    <div onClick={e => e.stopPropagation()}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' }}>
                        Select Students <span style={{ fontWeight: 400, color: '#6b7280' }}>({formData.selectedStudents.length} selected)</span>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by name or email..."
                        className="text-input"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        style={{ marginBottom: 8, fontSize: 13 }}
                      />
                      <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 4 }}>
                        {allStudents.length === 0 ? (
                          <p style={{ color: '#9ca3af', margin: '1rem', textAlign: 'center', fontSize: 13 }}>Loading students...</p>
                        ) : (() => {
                          const q = studentSearch.toLowerCase();
                          const filtered = allStudents.filter(s => {
                            const name = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
                            return !q || name.includes(q) || (s.email || '').toLowerCase().includes(q);
                          });
                          return filtered.length === 0
                            ? <p style={{ color: '#9ca3af', margin: '1rem', textAlign: 'center', fontSize: 13 }}>No match</p>
                            : filtered.map(student => {
                              const isSel = formData.selectedStudents.includes(student._id);
                              return (
                                <label key={student._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: isSel ? '#eef2ff' : 'transparent', marginBottom: 2 }}>
                                  <input type="checkbox" checked={isSel} onChange={() => handleStudentToggle(student._id)} style={{ accentColor: '#6366f1', flexShrink: 0 }} />
                                  <span style={{ fontSize: 13 }}>
                                    {student.firstName} {student.lastName}
                                    <span style={{ color: '#9ca3af', marginLeft: 6, fontSize: 12 }}>{student.email}</span>
                                  </span>
                                </label>
                              );
                            });
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Track B: Public / External */}
            <div
              onClick={() => setFormData((prev: any) => ({ ...prev, isExternalQuiz: true, accessibleTo: 'everyone' }))}
              style={{
                border: `2px solid ${(formData as any).isExternalQuiz ? '#f97316' : '#e5e7eb'}`,
                borderRadius: 12,
                padding: '16px 20px',
                cursor: 'pointer',
                background: (formData as any).isExternalQuiz ? '#fff7ed' : '#fff',
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${(formData as any).isExternalQuiz ? '#f97316' : '#d1d5db'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {(formData as any).isExternalQuiz && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f97316' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>🌐 Public / External Quiz</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    For external participants or open events (e.g. Tech Battle, Hackathon). Access via personal token link only — <strong>not shown</strong> on the student dashboard and no email is sent.
                  </div>
                </div>
              </div>
              {(formData as any).isExternalQuiz && (
                <div style={{ paddingLeft: 32, marginTop: 12, fontSize: 13, color: '#9a3412', background: '#ffedd5', borderRadius: 8, padding: '10px 14px' }}>
                  🔗 Participants will receive unique token links. You can manage registrations from the <strong>Public Quiz Admin</strong> section after creating.
                </div>
              )}
            </div>

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

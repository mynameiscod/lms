import React, { useEffect, useState } from 'react';
import { quizApi, batchApi } from '../../api';
import { Button, Input, Modal, Alert, Spinner } from '../../components/common';
import { Quiz, Batch } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import './QuizManagementPage.css';

const QuizManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    totalMarks: 100,
    totalTime: 60,
    access: 'public' as 'public' | 'private',
    accessibleTo: 'everyone' as 'everyone' | 'batch_wise' | 'individual',
    selectedBatches: [] as string[],
    selectedStudents: [] as string[],
    passingMarks: 50,
    negativeMarking: false,
    negativeMarkingValue: 0,
    shuffleQuestions: false,
    showAnswersAfterSubmit: true,
    showScoreAfterSubmit: true,
    allowReview: true,
    multipleAttempts: false,
    maxAttempts: 1,
    canCopyPaste: false,
    requireFullScreen: false,
    tabSwitchWarnings: true
  });

  useEffect(() => {
    fetchQuizzes();
    fetchBatches();
  }, []);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const res = await quizApi.getQuizzes();
      setQuizzes(res.data || res || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quizzes');
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await batchApi.getBatches();
      setBatches(res.data || res || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleCreateQuiz = async () => {
    try {
      setError('');
      if (!formData.title || !formData.totalMarks || !formData.totalTime) {
        setError('Please fill all required fields');
        return;
      }

      if (editingQuiz) {
        await quizApi.updateQuiz(editingQuiz._id, formData);
        setSuccess('Quiz updated successfully');
      } else {
        await quizApi.createQuiz(formData);
        setSuccess('Quiz created successfully');
      }

      resetForm();
      setShowCreateModal(false);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to save quiz');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '10:00',
      totalMarks: 100,
      totalTime: 60,
      access: 'public',
      accessibleTo: 'everyone',
      selectedBatches: [],
      selectedStudents: [],
      passingMarks: 50,
      negativeMarking: false,
      negativeMarkingValue: 0,
      shuffleQuestions: false,
      showAnswersAfterSubmit: true,
      showScoreAfterSubmit: true,
      allowReview: true,
      multipleAttempts: false,
      maxAttempts: 1,
      canCopyPaste: false,
      requireFullScreen: false,
      tabSwitchWarnings: true
    });
    setEditingQuiz(null);
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setFormData({
      title: quiz.title,
      description: quiz.description,
      startDate: quiz.startDate.split('T')[0],
      endDate: quiz.endDate.split('T')[0],
      startTime: quiz.startTime,
      endTime: quiz.endTime,
      totalMarks: quiz.totalMarks,
      totalTime: quiz.totalTime,
      access: quiz.access,
      accessibleTo: quiz.accessibleTo,
      selectedBatches: quiz.selectedBatches || [],
      selectedStudents: quiz.selectedStudents || [],
      passingMarks: quiz.passingMarks || 50,
      negativeMarking: quiz.negativeMarking,
      negativeMarkingValue: quiz.negativeMarkingValue || 0,
      shuffleQuestions: quiz.shuffleQuestions,
      showAnswersAfterSubmit: quiz.showAnswersAfterSubmit,
      showScoreAfterSubmit: quiz.showScoreAfterSubmit,
      allowReview: quiz.allowReview,
      multipleAttempts: quiz.multipleAttempts,
      maxAttempts: quiz.maxAttempts || 1,
      canCopyPaste: quiz.canCopyPaste,
      requireFullScreen: quiz.requireFullScreen,
      tabSwitchWarnings: quiz.tabSwitchWarnings
    });
    setEditingQuiz(quiz);
    setShowCreateModal(true);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await quizApi.deleteQuiz(quizId);
      setSuccess('Quiz deleted successfully');
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete quiz');
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="quiz-management-page">
      <div className="page-header">
        <div className="header-text">
          <h1>📝 Quiz Management</h1>
          <p className="subtitle">Create and manage quizzes for your students</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setShowCreateModal(true);
        }} className="btn-primary">
          ➕ Create New Quiz
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {/* Create/Edit Quiz Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title={editingQuiz ? 'Edit Quiz' : 'Create New Quiz'}
        maxWidth="800px"
      >
        <div className="quiz-form">
          <div className="form-section">
            <h3>📋 Basic Information</h3>
            <div className="form-grid">
              <div className="form-group full">
                <label>Quiz Title *</label>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter quiz title"
                />
              </div>

              <div className="form-group full">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter quiz description"
                  rows={3}
                  className="textarea-input"
                />
              </div>

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

          <div className="form-section">
            <h3>📊 Quiz Configuration</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Total Marks *</label>
                <Input
                  type="number"
                  name="totalMarks"
                  value={formData.totalMarks}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Duration (minutes) *</label>
                <Input
                  type="number"
                  name="totalTime"
                  value={formData.totalTime}
                  onChange={handleInputChange}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Passing Marks</label>
                <Input
                  type="number"
                  name="passingMarks"
                  value={formData.passingMarks}
                  onChange={handleInputChange}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Negative Marking Value</label>
                <Input
                  type="number"
                  name="negativeMarkingValue"
                  value={formData.negativeMarkingValue}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  disabled={!formData.negativeMarking}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>🔒 Access Control</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Access Level</label>
                <select
                  name="access"
                  value={formData.access}
                  onChange={handleInputChange}
                  className="select-input"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
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
                  <option value="batch_wise">Batch Wise</option>
                  <option value="individual">Individual Students</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>⚙️ Settings</h3>
            <div className="checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={handleInputChange}
                />
                <span>Shuffle Questions</span>
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showAnswersAfterSubmit"
                  checked={formData.showAnswersAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Answers After Submit</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="showScoreAfterSubmit"
                  checked={formData.showScoreAfterSubmit}
                  onChange={handleInputChange}
                />
                <span>Show Score After Submit</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="allowReview"
                  checked={formData.allowReview}
                  onChange={handleInputChange}
                />
                <span>Allow Review</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="negativeMarking"
                  checked={formData.negativeMarking}
                  onChange={handleInputChange}
                />
                <span>Negative Marking</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="multipleAttempts"
                  checked={formData.multipleAttempts}
                  onChange={handleInputChange}
                />
                <span>Multiple Attempts</span>
              </label>

              {formData.multipleAttempts && (
                <div className="form-group">
                  <label>Max Attempts</label>
                  <Input
                    type="number"
                    name="maxAttempts"
                    value={formData.maxAttempts}
                    onChange={handleInputChange}
                    min="1"
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
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="requireFullScreen"
                  checked={formData.requireFullScreen}
                  onChange={handleInputChange}
                />
                <span>Require Full Screen</span>
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="tabSwitchWarnings"
                  checked={formData.tabSwitchWarnings}
                  onChange={handleInputChange}
                />
                <span>Tab Switch Warnings</span>
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Button onClick={() => {
              setShowCreateModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateQuiz} className="btn-primary">
              {editingQuiz ? '✏️ Update Quiz' : '✅ Create Quiz'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Quizzes List */}
      <div className="quizzes-container">
        {quizzes.length === 0 ? (
          <div className="empty-state">
            <h3>No quizzes yet</h3>
            <p>Create your first quiz to get started</p>
          </div>
        ) : (
          <div className="quizzes-grid">
            {quizzes.map(quiz => (
              <div key={quiz._id} className="quiz-card">
                <div className="quiz-card-header">
                  <h3>{quiz.title}</h3>
                  <span className={`badge ${quiz.isActive ? 'active' : 'inactive'}`}>
                    {quiz.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="quiz-description">{quiz.description}</p>

                <div className="quiz-meta">
                  <div className="meta-item">
                    <span className="label">📝 Questions:</span>
                    <span className="value">{quiz.totalQuestions}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">⭐ Marks:</span>
                    <span className="value">{quiz.totalMarks}</span>
                  </div>
                  <div className="meta-item">
                    <span className="label">⏱️ Time:</span>
                    <span className="value">{quiz.totalTime} min</span>
                  </div>
                </div>

                <div className="quiz-dates">
                  <small>
                    📅 {new Date(quiz.startDate).toLocaleDateString()} -
                    {new Date(quiz.endDate).toLocaleDateString()}
                  </small>
                </div>

                <div className="quiz-actions">
                  <Button
                    onClick={() => handleEditQuiz(quiz)}
                    className="btn-secondary btn-sm"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    onClick={() => window.location.href = `/quiz/${quiz._id}/questions`}
                    className="btn-secondary btn-sm"
                  >
                    ❓ Questions
                  </Button>
                  <Button
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    className="btn-danger btn-sm"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizManagementPage;

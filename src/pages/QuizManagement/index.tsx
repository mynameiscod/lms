import React, { useEffect, useState } from 'react';
import { quizApi, batchApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
import QuizWizard from '../../components/QuizWizard/QuizWizard';
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

  const handleCreateQuiz = async (formData: any) => {
    try {
      setError('');
      
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
      throw err;
    }
  };

  const resetForm = () => {
    setEditingQuiz(null);
  };

  const handleEditQuiz = (quiz: Quiz) => {
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

  // Show wizard full-page
  if (showCreateModal) {
    return (
      <QuizWizard
        initialData={editingQuiz || undefined}
        batches={batches}
        isEditing={!!editingQuiz}
        onSubmit={handleCreateQuiz}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      />
    );
  }

  // Show quiz list
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

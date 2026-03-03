import React, { useEffect, useState } from 'react';
import { quizApi, batchApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
import QuizWizard from '../../components/QuizWizard/QuizWizard';
import QuizQuestionLinking from '../../components/QuizQuestionLinking/QuizQuestionLinking';
import { Quiz, Batch } from '../../types';
import './QuizManagementPage.css';

const QuizManagementPage: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [linkingQuizId, setLinkingQuizId] = useState<string>('');
  const [linkingQuizTitle, setLinkingQuizTitle] = useState('');

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

  const handleLinkQuestions = (quiz: Quiz) => {
    setLinkingQuizId(quiz._id);
    setLinkingQuizTitle(quiz.title);
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

  // Show question linking interface
  if (linkingQuizId) {
    return (
      <QuizQuestionLinking
        quizId={linkingQuizId}
        quizTitle={linkingQuizTitle}
        onClose={() => {
          setLinkingQuizId('');
          setLinkingQuizTitle('');
          fetchQuizzes();
        }}
        onSuccess={() => {
          setSuccess('Questions linked successfully');
          fetchQuizzes();
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
          <div className="quizzes-table-wrapper">
            <table className="quizzes-table">
              <thead>
                <tr>
                  <th>Quiz Title</th>
                  <th>Questions</th>
                  <th>Marks</th>
                  <th>Duration</th>
                  <th>Start Date & Time</th>
                  <th>End Date & Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quizzes.map(quiz => (
                  <tr key={quiz._id} className="quiz-row">
                    <td className="quiz-title">{quiz.title}</td>
                    <td className="quiz-questions">{quiz.totalQuestions || 0}</td>
                    <td className="quiz-marks">{quiz.totalMarks}</td>
                    <td className="quiz-time">{quiz.totalTime} min</td>
                    <td className="quiz-date">
                      {new Date(quiz.startDate).toLocaleDateString()} {quiz.startTime}
                    </td>
                    <td className="quiz-date">
                      {new Date(quiz.endDate).toLocaleDateString()} {quiz.endTime}
                    </td>
                    <td className="quiz-status">
                      <span className={`status-badge ${quiz.isActive ? 'active' : 'inactive'}`}>
                        {quiz.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="quiz-actions-cell">
                      <div className="action-buttons">
                        <Button
                          onClick={() => handleEditQuiz(quiz)}
                          className="btn-action btn-edit"
                          title="Edit quiz"
                        >
                          ✏️
                        </Button>
                        <Button
                          onClick={() => handleLinkQuestions(quiz)}
                          className="btn-action btn-link"
                          title="Link questions from Question Bank"
                        >
                          🔗
                        </Button>
                        <Button
                          onClick={() => handleDeleteQuiz(quiz._id)}
                          className="btn-action btn-delete"
                          title="Delete quiz"
                        >
                          🗑️
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizManagementPage;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi, batchApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
import QuizWizard from '../../components/QuizWizard/QuizWizard';
import QuizQuestionLinking from '../../components/QuizQuestionLinking/QuizQuestionLinking';
import { Quiz, Batch } from '../../types';
import './QuizManagementPage.css';

const QuizManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [linkingQuizId, setLinkingQuizId] = useState<string>('');
  const [linkingQuizTitle, setLinkingQuizTitle] = useState('');
  const [cloningQuiz, setCloningQuiz] = useState<Quiz | null>(null);
  const [cloneForm, setCloneForm] = useState({
    title: '',
    startDate: '',
    endDate: '',
    startTime: '09:00',
    endTime: '10:00',
    accessibleTo: 'batch_wise',
    selectedBatches: [] as string[]
  });
  const [cloning, setCloning] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archivedQuizzes, setArchivedQuizzes] = useState<Quiz[]>([]);

  useEffect(() => {
    fetchQuizzes();
    fetchBatches();
    fetchArchivedQuizzes();
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

  const fetchArchivedQuizzes = async () => {
    try {
      const res = await quizApi.getArchivedQuizzes();
      setArchivedQuizzes(res.data || res || []);
    } catch (err: any) {
      console.error('Failed to fetch archived quizzes:', err);
    }
  };

  const handleArchiveQuiz = async (quizId: string) => {
    if (!window.confirm('Archive this quiz? It will be hidden from students but data is preserved.')) return;
    try {
      await quizApi.archiveQuiz(quizId);
      setSuccess('Quiz archived');
      fetchQuizzes();
      fetchArchivedQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to archive quiz');
    }
  };

  const handleUnarchiveQuiz = async (quizId: string) => {
    try {
      await quizApi.unarchiveQuiz(quizId);
      setSuccess('Quiz restored to active');
      fetchQuizzes();
      fetchArchivedQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to unarchive quiz');
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

  const handleOpenClone = (quiz: Quiz) => {
    setCloningQuiz(quiz);
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setCloneForm({
      title: `${quiz.title} (Copy)`,
      startDate: today,
      endDate: nextWeek,
      startTime: quiz.startTime || '09:00',
      endTime: quiz.endTime || '10:00',
      accessibleTo: 'batch_wise',
      selectedBatches: []
    });
  };

  const handleCloneQuiz = async () => {
    if (!cloningQuiz) return;
    try {
      setCloning(true);
      await quizApi.cloneQuiz(cloningQuiz._id, {
        title: cloneForm.title,
        startDate: cloneForm.startDate,
        endDate: cloneForm.endDate,
        startTime: cloneForm.startTime,
        endTime: cloneForm.endTime,
        accessibleTo: cloneForm.accessibleTo,
        selectedBatches: cloneForm.selectedBatches
      });
      setSuccess(`Quiz cloned successfully as "${cloneForm.title}"`);
      setCloningQuiz(null);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to clone quiz');
    } finally {
      setCloning(false);
    }
  };

  const getQuizStatus = (quiz: Quiz): string => {
    try {
      const now = new Date();
      
      // Parse start date and time
      const startDateParts = quiz.startDate.split('T')[0].split('-');
      const startTimeParts = quiz.startTime.split(':');
      const startDateTime = new Date(
        parseInt(startDateParts[0]),
        parseInt(startDateParts[1]) - 1,
        parseInt(startDateParts[2]),
        parseInt(startTimeParts[0]),
        parseInt(startTimeParts[1]),
        0
      );
      
      // Parse end date and time
      const endDateParts = quiz.endDate.split('T')[0].split('-');
      const endTimeParts = quiz.endTime.split(':');
      const endDateTime = new Date(
        parseInt(endDateParts[0]),
        parseInt(endDateParts[1]) - 1,
        parseInt(endDateParts[2]),
        parseInt(endTimeParts[0]),
        parseInt(endTimeParts[1]),
        0
      );
      
      if (now < startDateTime) return 'pending';
      if (now > endDateTime) return 'closed';
      return 'active';
    } catch (err) {
      return 'active';
    }
  };

  const getQuizStatusLabel = (quiz: Quiz): string => {
    const status = getQuizStatus(quiz);
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'closed':
        return 'Closed';
      case 'active':
      default:
        return 'Active';
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
          <h2>Quiz Management</h2>
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

      {/* Active / Archived tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        <button
          onClick={() => setActiveTab('active')}
          style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
            borderBottom: activeTab === 'active' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'active' ? '#6366f1' : '#6b7280',
            marginBottom: -2
          }}
        >
          Active ({quizzes.length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          style={{
            padding: '8px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 14,
            borderBottom: activeTab === 'archived' ? '2px solid #6366f1' : '2px solid transparent',
            color: activeTab === 'archived' ? '#6366f1' : '#6b7280',
            marginBottom: -2
          }}
        >
          Archived ({archivedQuizzes.length})
        </button>
      </div>

      {/* Clone Quiz Modal */}
      {cloningQuiz && (
        <div className="modal-overlay" style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="modal-content" style={{ background:'#fff', borderRadius:12, padding:32, minWidth:420, maxWidth:560, width:'100%' }}>
            <h3 style={{ marginBottom:16 }}>📋 Clone Quiz: {cloningQuiz.title}</h3>
            <p style={{ color:'#666', marginBottom:20, fontSize:14 }}>All questions will be copied to the new quiz. Set new dates and batch below.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontWeight:600, fontSize:13 }}>New Quiz Title</label>
                <input className="form-control" value={cloneForm.title} onChange={e => setCloneForm({...cloneForm, title: e.target.value})} style={{ marginTop:4 }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={{ fontWeight:600, fontSize:13 }}>Start Date</label>
                  <input type="date" className="form-control" value={cloneForm.startDate} onChange={e => setCloneForm({...cloneForm, startDate: e.target.value})} style={{ marginTop:4 }} />
                </div>
                <div>
                  <label style={{ fontWeight:600, fontSize:13 }}>End Date</label>
                  <input type="date" className="form-control" value={cloneForm.endDate} onChange={e => setCloneForm({...cloneForm, endDate: e.target.value})} style={{ marginTop:4 }} />
                </div>
                <div>
                  <label style={{ fontWeight:600, fontSize:13 }}>Start Time</label>
                  <input type="time" className="form-control" value={cloneForm.startTime} onChange={e => setCloneForm({...cloneForm, startTime: e.target.value})} style={{ marginTop:4 }} />
                </div>
                <div>
                  <label style={{ fontWeight:600, fontSize:13 }}>End Time</label>
                  <input type="time" className="form-control" value={cloneForm.endTime} onChange={e => setCloneForm({...cloneForm, endTime: e.target.value})} style={{ marginTop:4 }} />
                </div>
              </div>
              <div>
                <label style={{ fontWeight:600, fontSize:13 }}>Access</label>
                <select className="form-select" value={cloneForm.accessibleTo} onChange={e => setCloneForm({...cloneForm, accessibleTo: e.target.value})} style={{ marginTop:4 }}>
                  <option value="everyone">Everyone</option>
                  <option value="batch_wise">Batch Wise</option>
                  <option value="individual">Individual</option>
                </select>
              </div>
              {cloneForm.accessibleTo === 'batch_wise' && (
                <div>
                  <label style={{ fontWeight:600, fontSize:13 }}>Select Batch(es)</label>
                  <select multiple className="form-select" style={{ marginTop:4, minHeight:80 }}
                    value={cloneForm.selectedBatches}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                      setCloneForm({...cloneForm, selectedBatches: selected});
                    }}>
                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <small style={{ color:'#888' }}>Hold Ctrl/Cmd to select multiple</small>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:12, marginTop:24, justifyContent:'flex-end' }}>
              <Button onClick={() => setCloningQuiz(null)} className="btn-secondary" disabled={cloning}>Cancel</Button>
              <Button onClick={handleCloneQuiz} className="btn-primary" disabled={cloning || !cloneForm.title || !cloneForm.startDate || !cloneForm.endDate}>
                {cloning ? 'Cloning...' : '📋 Clone Quiz'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quizzes List */}
      <div className="quizzes-container">

        {/* ── Active tab ── */}
        {activeTab === 'active' && (
          quizzes.length === 0 ? (
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
                      <td className="quiz-date">
                        {new Date(quiz.startDate).toLocaleDateString()} {quiz.startTime}
                      </td>
                      <td className="quiz-date">
                        {new Date(quiz.endDate).toLocaleDateString()} {quiz.endTime}
                      </td>
                      <td className="quiz-status">
                        <span className={`status-badge ${getQuizStatus(quiz)}`}>
                          {getQuizStatusLabel(quiz)}
                        </span>
                      </td>
                      <td className="quiz-actions-cell">
                        <div className="action-buttons">
                          <Button
                            onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                            className="btn-action btn-preview"
                            title="Preview quiz"
                          >
                            👁️
                          </Button>
                          <Button
                            onClick={() => navigate(`/quiz-results?quizId=${quiz._id}`)}
                            className="btn-action btn-results"
                            title="View quiz results"
                          >
                            📊
                          </Button>
                          {getQuizStatus(quiz) !== 'closed' && (
                            <Button
                              onClick={() => handleEditQuiz(quiz)}
                              className="btn-action btn-edit"
                              title="Edit quiz"
                            >
                              ✏️
                            </Button>
                          )}
                          {getQuizStatus(quiz) !== 'closed' && (
                            <Button
                              onClick={() => handleLinkQuestions(quiz)}
                              className="btn-action btn-link"
                              title="Link questions from Question Bank"
                            >
                              🔗
                            </Button>
                          )}
                          <Button
                            onClick={() => handleArchiveQuiz(quiz._id)}
                            className="btn-action"
                            title="Archive quiz (hide from students, keep data)"
                            style={{ opacity: 0.7 }}
                          >
                            📦
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuiz(quiz._id)}
                            className="btn-action btn-delete"
                            title="Delete quiz"
                          >
                            🗑️
                          </Button>
                          <Button
                            onClick={() => handleOpenClone(quiz)}
                            className="btn-action btn-clone"
                            title="Clone quiz for another batch"
                          >
                            📋
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── Archived tab ── */}
        {activeTab === 'archived' && (
          archivedQuizzes.length === 0 ? (
            <div className="empty-state">
              <h3>No archived quizzes</h3>
              <p>Quizzes archived manually or auto-archived after 7 days will appear here</p>
            </div>
          ) : (
            <div className="quizzes-table-wrapper">
              <table className="quizzes-table">
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Start Date & Time</th>
                    <th>End Date & Time</th>
                    <th>Archived On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedQuizzes.map(quiz => (
                    <tr key={quiz._id} className="quiz-row" style={{ opacity: 0.75 }}>
                      <td className="quiz-title">{quiz.title}</td>
                      <td className="quiz-date">
                        {new Date(quiz.startDate).toLocaleDateString()} {quiz.startTime}
                      </td>
                      <td className="quiz-date">
                        {new Date(quiz.endDate).toLocaleDateString()} {quiz.endTime}
                      </td>
                      <td className="quiz-date" style={{ color: '#9ca3af', fontSize: 13 }}>
                        {quiz.archivedAt ? new Date(quiz.archivedAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="quiz-actions-cell">
                        <div className="action-buttons">
                          <Button
                            onClick={() => navigate(`/quiz-results?quizId=${quiz._id}`)}
                            className="btn-action btn-results"
                            title="View quiz results"
                          >
                            📊
                          </Button>
                          <Button
                            onClick={() => handleUnarchiveQuiz(quiz._id)}
                            className="btn-action btn-edit"
                            title="Restore quiz to active"
                          >
                            ♻️
                          </Button>
                          <Button
                            onClick={() => handleDeleteQuiz(quiz._id)}
                            className="btn-action btn-delete"
                            title="Delete permanently"
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
          )
        )}

      </div>
    </div>
  );
};

export default QuizManagementPage;

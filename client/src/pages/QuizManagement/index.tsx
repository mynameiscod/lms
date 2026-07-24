import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizApi, batchApi } from '../../api';
import { Button, Alert, Spinner } from '../../components/common';
import QuizWizard from '../../components/QuizWizard/QuizWizard';
import QuizQuestionLinking from '../../components/QuizQuestionLinking/QuizQuestionLinking';
import { Quiz, Batch } from '../../types';
import { TECH_CATEGORIES, techDef } from '../../config/techCategories';
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
  // Organize / reuse: tech filter + group-by
  const [techFilter, setTechFilter] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'language' | 'lesson'>('none');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  // Non-attendees modal
  const [nonAttendeesQuiz, setNonAttendeesQuiz] = useState<Quiz | null>(null);
  const [nonAttendeesData, setNonAttendeesData] = useState<any>(null);
  const [nonAttendeesLoading, setNonAttendeesLoading] = useState(false);
  const [extendDays, setExtendDays] = useState(3);
  const [reassigning, setReassigning] = useState(false);

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

  const openNonAttendees = useCallback(async (quiz: Quiz) => {
    setNonAttendeesQuiz(quiz);
    setNonAttendeesData(null);
    setNonAttendeesLoading(true);
    try {
      const res = await quizApi.getNonAttendees(quiz._id);
      setNonAttendeesData(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load non-attendees');
    } finally {
      setNonAttendeesLoading(false);
    }
  }, []);

  const handleReassign = async () => {
    if (!nonAttendeesQuiz) return;
    setReassigning(true);
    try {
      const res = await quizApi.reassignNonAttendees(nonAttendeesQuiz._id, extendDays);
      setSuccess(res.message || 'Reassigned successfully');
      setNonAttendeesQuiz(null);
      fetchQuizzes();
    } catch (err: any) {
      setError(err.message || 'Failed to reassign');
    } finally {
      setReassigning(false);
    }
  };

  const getAudienceBadge = (quiz: Quiz) => {
    const q = quiz as any;
    if (q.isExternalQuiz) return { label: '🌐 Public Link', color: '#f97316', bg: '#fff7ed' };
    if (q.accessibleTo === 'batch_wise') return { label: `📦 ${q.selectedBatches?.length || 0} Batch${(q.selectedBatches?.length || 0) !== 1 ? 'es' : ''}`, color: '#7c3aed', bg: '#f5f3ff' };
    if (q.accessibleTo === 'individual') return { label: `👤 ${q.selectedStudents?.length || 0} Student${(q.selectedStudents?.length || 0) !== 1 ? 's' : ''}`, color: '#0891b2', bg: '#ecfeff' };
    return { label: '🌍 All Students', color: '#059669', bg: '#ecfdf5' };
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

      {/* Non-Attendees Modal */}
      {nonAttendeesQuiz && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 28, width: '100%', maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>👥 Non-Attendees</h3>
                <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{nonAttendeesQuiz.title}</div>
              </div>
              <button onClick={() => setNonAttendeesQuiz(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {nonAttendeesLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading...</div>
            ) : nonAttendeesData ? (
              <>
                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total audience', val: nonAttendeesData.total, color: '#6b7280' },
                    { label: 'Submitted', val: nonAttendeesData.submitted, color: '#16a34a' },
                    { label: 'Not attempted', val: nonAttendeesData.notAttempted, color: '#dc2626' },
                  ].map(s => (
                    <div key={s.label} style={{ flex: 1, textAlign: 'center', background: '#f9fafb', borderRadius: 10, padding: '10px 8px' }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Non-attendee list */}
                {nonAttendeesData.notAttempted > 0 ? (
                  <>
                    <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, marginBottom: 16 }}>
                      {nonAttendeesData.nonAttendees.map((s: any) => (
                        <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #f3f4f6' }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#fef3c7', color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                            {(s.firstName?.[0] || '?').toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{s.firstName} {s.lastName}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>🔄 Reassign to these {nonAttendeesData.notAttempted} students</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Quiz will be switched to "Individual" mode targeting only non-attendees. A reminder email will be sent.</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <label style={{ fontSize: 13, color: '#374151' }}>Extend deadline by:</label>
                        {[0, 1, 2, 3, 5, 7].map(d => (
                          <button key={d} onClick={() => setExtendDays(d)} style={{ padding: '3px 10px', border: `1.5px solid ${extendDays === d ? '#6366f1' : '#e5e7eb'}`, borderRadius: 6, background: extendDays === d ? '#eef2ff' : '#fff', color: extendDays === d ? '#6366f1' : '#6b7280', cursor: 'pointer', fontSize: 12, fontWeight: extendDays === d ? 700 : 400 }}>
                            {d === 0 ? 'No change' : `+${d}d`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <Button onClick={() => setNonAttendeesQuiz(null)} className="btn-secondary" disabled={reassigning}>Cancel</Button>
                      <Button onClick={handleReassign} className="btn-primary" disabled={reassigning}>
                        {reassigning ? 'Reassigning...' : `🔄 Reassign + Send Reminder`}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f0fdf4', borderRadius: 10 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                    <div style={{ fontWeight: 700, color: '#16a34a' }}>All students have submitted!</div>
                    <button onClick={() => setNonAttendeesQuiz(null)} style={{ marginTop: 16, padding: '8px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Close</button>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

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
        {activeTab === 'active' && (() => {
          const activeQuizzes = quizzes
            .filter(q => !techFilter || (q as any).primaryTech === techFilter)
            .slice()
            .sort((a, b) =>
              groupBy === 'language' ? String((a as any).primaryTech || 'zzz').localeCompare(String((b as any).primaryTech || 'zzz'))
              : groupBy === 'lesson' ? String((a as any).chapterId?.title || 'zzz').localeCompare(String((b as any).chapterId?.title || 'zzz'))
              : 0);
          const groupKeyOf = (q: any) => groupBy === 'language' ? (q.primaryTech || '__none') : groupBy === 'lesson' ? (q.chapterId?.title || '__none') : '';
          const groupLabelOf = (k: string) => k === '__none' ? (groupBy === 'language' ? 'Untagged' : 'No lesson')
            : groupBy === 'language' ? (techDef(k) ? `${techDef(k)!.icon} ${techDef(k)!.label}` : k) : k;
          const qmSel: React.CSSProperties = { padding: '8px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13.5, background: '#fff' };
          let lastKey: string | null = null;
          return (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', margin: '0 0 12px' }}>
              <select value={techFilter} onChange={e => setTechFilter(e.target.value)} style={qmSel}>
                <option value="">All Tech</option>
                {TECH_CATEGORIES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
              </select>
              <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} style={qmSel}>
                <option value="none">No grouping</option>
                <option value="language">Group by Language / Tech</option>
                <option value="lesson">Group by Lesson (Chapter)</option>
              </select>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>{activeQuizzes.length} quiz(zes)</span>
            </div>
            {activeQuizzes.length === 0 ? (
            <div className="empty-state">
              <h3>No quizzes {techFilter ? 'match this filter' : 'yet'}</h3>
              <p>{techFilter ? 'Try a different tech.' : 'Create your first quiz to get started'}</p>
            </div>
          ) : (
            <div className="quizzes-table-wrapper">
              <table className="quizzes-table">
                <thead>
                  <tr>
                    <th>Quiz Title</th>
                    <th>Audience</th>
                    <th>Start Date & Time</th>
                    <th>End Date & Time</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeQuizzes.map(quiz => {
                    const gk = groupKeyOf(quiz);
                    const header = groupBy !== 'none' && gk !== lastKey ? (
                      <tr key={`grp-${gk}`} style={{ background: '#eef2f7' }}>
                        <td colSpan={6} style={{ fontWeight: 800, color: '#0b2e63', padding: '9px 12px' }}>{groupLabelOf(gk)}</td>
                      </tr>
                    ) : null;
                    lastKey = gk;
                    const tech = techDef((quiz as any).primaryTech);
                    return (
                    <React.Fragment key={quiz._id}>
                    {header}
                    <tr className="quiz-row">
                      <td className="quiz-title">{quiz.title}{tech && <span style={{ display: 'inline-block', marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', background: tech.color, borderRadius: 20, padding: '1px 8px' }}>{tech.icon} {tech.label}</span>}</td>
                      <td>
                        {(() => { const b = getAudienceBadge(quiz); return <span style={{ background: b.bg, color: b.color, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{b.label}</span>; })()}
                      </td>
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
                          {!(quiz as any).isExternalQuiz && (
                            <Button
                              onClick={() => openNonAttendees(quiz)}
                              className="btn-action"
                              title="View & reassign non-attendees"
                              style={{ background: '#fef3c7', color: '#92400e' }}
                            >
                              👥
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </>
          );
        })()}

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

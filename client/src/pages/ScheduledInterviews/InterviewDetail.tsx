import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { scheduledInterviewApi } from '../../api';

const STATUS_OPTIONS = ['good', 'average', 'poor'] as const;
type CriterionStatus = typeof STATUS_OPTIONS[number];

const STATUS_COLORS: Record<CriterionStatus, { bg: string; text: string }> = {
  good:    { bg: '#f0fdf4', text: '#16a34a' },
  average: { bg: '#fffbeb', text: '#d97706' },
  poor:    { bg: '#fef2f2', text: '#dc2626' },
};

const IV_STATUS_OPTIONS = ['scheduled', 'in_progress', 'completed', 'cancelled'];

interface CriterionRating { key: string; label: string; score: number; status: CriterionStatus; comment: string; }
interface Student { _id: string; firstName: string; lastName: string; email: string; }
interface Feedback {
  _id?: string; attendanceStatus: 'present' | 'absent'; criteriaRatings: CriterionRating[];
  overallComment: string; overallScore?: number; submittedAt?: string;
  submittedBy?: any; releasedToStudent: boolean;
}

const InterviewDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Feedback panel
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);

  // Status update
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const loadInterview = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await scheduledInterviewApi.getById(id);
      setInterview(res.data);
    } catch { showMsg('error', 'Failed to load interview'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadInterview(); }, [loadInterview]);

  // When a student is selected, load or initialise their feedback
  const openFeedback = async (student: Student) => {
    setSelectedStudent(student);
    try {
      const res = await scheduledInterviewApi.getFeedback(id!, student._id);
      if (res.data) {
        setFeedback(res.data);
      } else {
        // Initialise blank feedback from interview criteria
        const blank: Feedback = {
          attendanceStatus: 'present',
          criteriaRatings: (interview?.criteria || []).map((c: any) => ({
            key: c.key, label: c.label, score: 5, status: 'average' as CriterionStatus, comment: '',
          })),
          overallComment: '',
          releasedToStudent: false,
        };
        setFeedback(blank);
      }
    } catch {
      showMsg('error', 'Failed to load feedback');
    }
  };

  const updateRating = (key: string, field: keyof CriterionRating, value: any) => {
    setFeedback(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        criteriaRatings: prev.criteriaRatings.map(r =>
          r.key === key ? { ...r, [field]: value } : r
        ),
      };
    });
  };

  const saveFeedback = async () => {
    if (!selectedStudent || !feedback) return;
    try {
      setSavingFeedback(true);
      const res = await scheduledInterviewApi.submitFeedback(id!, selectedStudent._id, feedback);
      setFeedback(res.data);
      showMsg('success', 'Feedback saved');
      loadInterview();
    } catch (err: any) { showMsg('error', err.message || 'Failed to save feedback'); }
    finally { setSavingFeedback(false); }
  };

  const toggleRelease = async (studentId: string, currentlyReleased: boolean) => {
    try {
      await scheduledInterviewApi.releaseFeedback(id!, studentId, !currentlyReleased);
      showMsg('success', currentlyReleased ? 'Feedback hidden from student' : 'Feedback released to student');
      loadInterview();
      if (selectedStudent?._id === studentId && feedback) {
        setFeedback(prev => prev ? { ...prev, releasedToStudent: !currentlyReleased } : prev);
      }
    } catch { showMsg('error', 'Failed to update release status'); }
  };

  const releaseAll = async () => {
    try {
      await scheduledInterviewApi.releaseAll(id!);
      showMsg('success', 'All feedback released to students');
      loadInterview();
    } catch { showMsg('error', 'Failed to release all'); }
  };

  const updateStatus = async (status: string) => {
    try {
      setUpdatingStatus(true);
      await scheduledInterviewApi.update(id!, { status });
      setInterview((prev: any) => ({ ...prev, status }));
      showMsg('success', 'Status updated');
    } catch { showMsg('error', 'Failed to update status'); }
    finally { setUpdatingStatus(false); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
  const formatTime = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

  const feedbackMap: Record<string, any> = interview?.feedbackMap || {};

  const getScoreColor = (score: number) => score >= 8 ? '#16a34a' : score >= 5 ? '#d97706' : '#dc2626';

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>;
  if (!interview) return <div style={{ padding: 60, textAlign: 'center', color: '#dc2626' }}>Interview not found</div>;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {alert && (
        <div style={{ padding: '12px 20px', borderRadius: 8, marginBottom: 16,
          background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: alert.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${alert.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {alert.msg}
        </div>
      )}

      {/* Back + Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24 }}>
        <button onClick={() => navigate('/scheduled-interviews')}
          style={{ padding: '8px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb',
            borderRadius: 8, cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>{interview.title}</h1>
            <select value={interview.status} disabled={updatingStatus}
              onChange={e => updateStatus(e.target.value)}
              style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid #d1d5db', cursor: 'pointer' }}>
              {IV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7280', marginTop: 6, flexWrap: 'wrap' }}>
            <span>📅 {formatDate(interview.date)} at {formatTime(interview.time)} ({interview.duration} min)</span>
            <span>👤 {interview.interviewerName}</span>
            {interview.venue && <span>📍 {interview.venue}</span>}
            {interview.meetLink && <a href={interview.meetLink} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>🔗 Join</a>}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {(interview.criteria || []).map((c: any) => (
              <span key={c.key} style={{ padding: '2px 10px', background: '#f3f4f6', borderRadius: 10, fontSize: 12, color: '#374151' }}>{c.label}</span>
            ))}
          </div>
        </div>
        {Object.keys(feedbackMap).some(k => feedbackMap[k]?.submittedAt) && (
          <button onClick={releaseAll}
            style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none',
              borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
            Release All Feedback
          </button>
        )}
      </div>

      {/* Description */}
      {interview.description && (
        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 14, color: '#374151' }}>
          {interview.description}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selectedStudent ? '340px 1fr' : '1fr', gap: 20 }}>
        {/* Students list */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#374151' }}>
              Students ({(interview.students || []).length})
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(interview.students || []).map((s: Student) => {
              const fb = feedbackMap[s._id];
              const hasSubmitted = !!fb?.submittedAt;
              const isReleased = !!fb?.releasedToStudent;
              const isSelected = selectedStudent?._id === s._id;

              return (
                <div key={s._id}
                  style={{ padding: '12px 16px', border: `2px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
                    borderRadius: 10, cursor: 'pointer', background: isSelected ? '#eff6ff' : '#fff',
                    transition: 'border-color .15s' }}
                  onClick={() => openFeedback(s)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dbeafe',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 14, color: '#2563eb', flexShrink: 0 }}>
                      {s.firstName?.[0]}{s.lastName?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {s.firstName} {s.lastName}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{s.email}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {hasSubmitted ? (
                        fb.attendanceStatus === 'absent' ? (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>
                            ✗ Absent · 0/10
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10,
                            background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>
                            ✓ {fb.overallScore?.toFixed(1) || '–'}/10
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10,
                          background: '#f3f4f6', color: '#6b7280' }}>Pending</span>
                      )}
                      {hasSubmitted && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); toggleRelease(s._id, isReleased); }}
                          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, cursor: 'pointer', border: 'none',
                            background: isReleased ? '#dcfce7' : '#fef3c7', color: isReleased ? '#16a34a' : '#d97706', fontWeight: 600 }}>
                          {isReleased ? '👁 Released' : '🔒 Hidden'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {(interview.students || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: '30px 20px', border: '2px dashed #e5e7eb',
                borderRadius: 10, color: '#9ca3af', fontSize: 13 }}>
                No students assigned yet
              </div>
            )}
          </div>
        </div>

        {/* Feedback panel */}
        {selectedStudent && feedback && (
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>
                  Feedback: {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                {feedback.submittedAt && (
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>
                    Last saved: {new Date(feedback.submittedAt).toLocaleString()}
                    {feedback.submittedBy && ` by ${feedback.submittedBy.firstName} ${feedback.submittedBy.lastName}`}
                  </p>
                )}
              </div>
              <button onClick={() => setSelectedStudent(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>

            {/* Attendance */}
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#374151' }}>Attendance:</span>
              {(['present', 'absent'] as const).map(s => (
                <button key={s} type="button"
                  onClick={() => setFeedback(prev => prev ? { ...prev, attendanceStatus: s } : prev)}
                  style={{ padding: '5px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: feedback.attendanceStatus === s
                      ? (s === 'present' ? '#16a34a' : '#dc2626')
                      : '#f3f4f6',
                    color: feedback.attendanceStatus === s ? '#fff' : '#6b7280' }}>
                  {s === 'present' ? '✓ Present' : '✗ Absent'}
                </button>
              ))}
            </div>

            {feedback.attendanceStatus === 'present' && (
              <>
                {/* Criteria ratings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                  {feedback.criteriaRatings.map(r => (
                    <div key={r.key} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', minWidth: 140 }}>{r.label}</span>
                        {/* Score slider */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input type="range" min={1} max={10} value={r.score}
                            onChange={e => updateRating(r.key, 'score', +e.target.value)}
                            style={{ flex: 1, accentColor: getScoreColor(r.score) }} />
                          <span style={{ fontWeight: 700, fontSize: 18, color: getScoreColor(r.score), minWidth: 30, textAlign: 'center' }}>
                            {r.score}
                          </span>
                          <span style={{ fontSize: 12, color: '#9ca3af' }}>/10</span>
                        </div>
                        {/* Status chips */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          {STATUS_OPTIONS.map(s => (
                            <button key={s} type="button"
                              onClick={() => updateRating(r.key, 'status', s)}
                              style={{ padding: '3px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                                fontSize: 12, fontWeight: 600,
                                background: r.status === s ? STATUS_COLORS[s].bg : '#f3f4f6',
                                color: r.status === s ? STATUS_COLORS[s].text : '#9ca3af',
                                outline: r.status === s ? `2px solid ${STATUS_COLORS[s].text}` : 'none' }}>
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input style={inputStyle} placeholder={`Comment on ${r.label.toLowerCase()}…`}
                        value={r.comment}
                        onChange={e => updateRating(r.key, 'comment', e.target.value)} />
                    </div>
                  ))}
                </div>

                {/* Overall score summary */}
                {feedback.criteriaRatings.length > 0 && (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10,
                    padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0369a1' }}>Overall Score (auto):</span>
                    <span style={{ fontSize: 24, fontWeight: 700, color: '#0369a1' }}>
                      {(feedback.criteriaRatings.reduce((s, r) => s + r.score, 0) / feedback.criteriaRatings.length).toFixed(1)}/10
                    </span>
                  </div>
                )}

                {/* Overall comment */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14, color: '#374151' }}>
                    Overall Comment / Summary
                  </label>
                  <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }}
                    placeholder="Overall observations, strengths, areas to improve…"
                    value={feedback.overallComment}
                    onChange={e => setFeedback(prev => prev ? { ...prev, overallComment: e.target.value } : prev)} />
                </div>
              </>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => toggleRelease(selectedStudent._id, feedback.releasedToStudent)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db',
                  cursor: 'pointer', fontWeight: 500, fontSize: 13,
                  background: feedback.releasedToStudent ? '#fef3c7' : '#f0fdf4',
                  color: feedback.releasedToStudent ? '#d97706' : '#16a34a' }}>
                {feedback.releasedToStudent ? '🔒 Hide from Student' : '👁 Release to Student'}
              </button>
              <button onClick={saveFeedback} disabled={savingFeedback}
                style={{ padding: '9px 20px', background: savingFeedback ? '#93c5fd' : '#2563eb',
                  color: '#fff', border: 'none', borderRadius: 8,
                  cursor: savingFeedback ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                {savingFeedback ? 'Saving…' : '💾 Save Feedback'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

export default InterviewDetailPage;

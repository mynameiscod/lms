import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { interviewAssignmentApi, interviewTemplateApi } from '../../api/interviewModuleApi';
import './InterviewAssignment.css';

const STATUS_COLORS: Record<string, string> = {
  assigned: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444', expired: '#6b7280',
};

const InterviewAssignment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const presetTemplateId = searchParams.get('templateId') || '';
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTemplate, setFilterTemplate] = useState('');
  const [showPushModal, setShowPushModal] = useState(false);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await interviewAssignmentApi.getAll({
        status: filterStatus, templateId: filterTemplate, page, limit: 20,
      });
      setAssignments(res.assignments || []);
      setTotal(res.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filterStatus, filterTemplate]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  useEffect(() => {
    interviewTemplateApi.getAll({ status: 'published', limit: 100 }).then(res => {
      setTemplates(res.templates || []);
    }).catch(() => {});
  }, []);

  // Arriving from a template's "Assign" button (?templateId=…): open the push modal preselected.
  useEffect(() => {
    if (presetTemplateId) setShowPushModal(true);
  }, [presetTemplateId]);

  const handleCancel = async (assignmentId: string) => {
    if (!window.confirm('Cancel this assignment?')) return;
    try {
      await interviewAssignmentApi.cancel(assignmentId);
      fetchAssignments();
    } catch (err: any) { alert(err.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="ia-container">
      <div className="ia-header">
        <div>
          <h1>Interview Assignments</h1>
          <p className="ia-subtitle">Push interviews to students, batches, or courses</p>
        </div>
        <button className="ia-btn-primary" onClick={() => setShowPushModal(true)}>+ Push Assignment</button>
      </div>

      <div className="ia-filters">
        <select value={filterTemplate} onChange={e => { setPage(1); setFilterTemplate(e.target.value); }}>
          <option value="">All Templates</option>
          {templates.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setPage(1); setFilterStatus(e.target.value); }}>
          <option value="">All Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="ia-stats">Total: <strong>{total}</strong> assignments</div>

      {loading ? <div className="ia-loading">Loading...</div> : assignments.length === 0 ? (
        <div className="ia-empty">No assignments yet. Push an interview template to get started.</div>
      ) : (
        <div className="ia-table-wrap">
          <table className="ia-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Template</th>
                <th>Status</th>
                <th>Attempts</th>
                <th>Best Score</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a._id}>
                  <td>{a.studentId?.name || a.studentId?.email || a.studentId}</td>
                  <td>{a.templateId?.title || a.templateId}</td>
                  <td>
                    <span className="ia-status" style={{ background: STATUS_COLORS[a.status] || '#6b7280' }}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td>{a.attemptsUsed}/{a.maxAttempts}</td>
                  <td>{a.bestScore != null ? `${a.bestScore}%` : '—'}</td>
                  <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                  <td>
                    {a.status === 'assigned' && (
                      <button className="ia-btn-sm ia-btn-danger" onClick={() => handleCancel(a._id)}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="ia-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {showPushModal && (
        <PushAssignmentModal
          templates={templates}
          initialTemplateId={presetTemplateId}
          onClose={() => setShowPushModal(false)}
          onPushed={() => { setShowPushModal(false); fetchAssignments(); }}
        />
      )}
    </div>
  );
};

// ─── Push Assignment Modal ───────────────────────────────────────────────────

interface PushModalProps {
  templates: any[];
  initialTemplateId?: string;
  onClose: () => void;
  onPushed: () => void;
}

const PushAssignmentModal: React.FC<PushModalProps> = ({ templates, initialTemplateId, onClose, onPushed }) => {
  const [pushing, setPushing] = useState(false);
  const [pushMode, setPushMode] = useState<'individual' | 'batch' | 'course'>('individual');
  const [form, setForm] = useState({
    templateId: initialTemplateId || '', studentIds: '', batchId: '', courseId: '',
    pushReason: '', maxAttempts: 1,
    availableFrom: '', dueDate: '', expiresAt: '',
  });

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.templateId) { alert('Select a template'); return; }

    try {
      setPushing(true);
      const commonPayload = {
        pushReason: form.pushReason || undefined,
        maxAttempts: form.maxAttempts,
        availableFrom: form.availableFrom || undefined,
        dueDate: form.dueDate || undefined,
        expiresAt: form.expiresAt || undefined,
      };

      if (pushMode === 'individual') {
        const ids = form.studentIds.split(',').map(s => s.trim()).filter(Boolean);
        if (ids.length === 0) { alert('Enter student IDs'); return; }
        await interviewAssignmentApi.push({ templateId: form.templateId, ...commonPayload, studentIds: ids });
      } else if (pushMode === 'batch') {
        if (!form.batchId) { alert('Enter batch ID'); return; }
        await interviewAssignmentApi.pushToBatch({ templateId: form.templateId, ...commonPayload, batchIds: [form.batchId] });
      } else {
        if (!form.courseId) { alert('Enter course ID'); return; }
        await interviewAssignmentApi.pushToCourse({ templateId: form.templateId, ...commonPayload, courseIds: [form.courseId] });
      }
      onPushed();
    } catch (err: any) {
      alert(err.message || 'Failed to push');
    } finally { setPushing(false); }
  };

  return (
    <div className="ia-modal-overlay" onClick={onClose}>
      <div className="ia-modal" onClick={e => e.stopPropagation()}>
        <div className="ia-modal-header">
          <h2>Push Interview Assignment</h2>
          <button onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handlePush} className="ia-modal-body">
          <div className="ia-modal-field">
            <label>Template *</label>
            <select value={form.templateId} onChange={e => updateForm('templateId', e.target.value)}>
              <option value="">Select a published template...</option>
              {templates.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
            </select>
          </div>

          <div className="ia-modal-field">
            <label>Push To</label>
            <div className="ia-push-modes">
              {(['individual', 'batch', 'course'] as const).map(mode => (
                <label key={mode} className={pushMode === mode ? 'active' : ''}>
                  <input type="radio" name="pushMode" checked={pushMode === mode} onChange={() => setPushMode(mode)} />
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {pushMode === 'individual' && (
            <div className="ia-modal-field">
              <label>Student IDs (comma-separated)</label>
              <textarea value={form.studentIds} onChange={e => updateForm('studentIds', e.target.value)} rows={3} placeholder="student1-id, student2-id" />
            </div>
          )}
          {pushMode === 'batch' && (
            <div className="ia-modal-field">
              <label>Batch ID</label>
              <input type="text" value={form.batchId} onChange={e => updateForm('batchId', e.target.value)} />
            </div>
          )}
          {pushMode === 'course' && (
            <div className="ia-modal-field">
              <label>Course ID</label>
              <input type="text" value={form.courseId} onChange={e => updateForm('courseId', e.target.value)} />
            </div>
          )}

          <div className="ia-modal-row">
            <div className="ia-modal-field">
              <label>Max Attempts</label>
              <input type="number" value={form.maxAttempts} onChange={e => updateForm('maxAttempts', parseInt(e.target.value) || 1)} min={1} />
            </div>
            <div className="ia-modal-field">
              <label>Push Reason</label>
              <input type="text" value={form.pushReason} onChange={e => updateForm('pushReason', e.target.value)} placeholder="e.g., Placement prep week" />
            </div>
          </div>

          <div className="ia-modal-row">
            <div className="ia-modal-field">
              <label>Available From</label>
              <input type="datetime-local" value={form.availableFrom} onChange={e => updateForm('availableFrom', e.target.value)} />
            </div>
            <div className="ia-modal-field">
              <label>Due Date</label>
              <input type="datetime-local" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} />
            </div>
            <div className="ia-modal-field">
              <label>Expires At</label>
              <input type="datetime-local" value={form.expiresAt} onChange={e => updateForm('expiresAt', e.target.value)} />
            </div>
          </div>

          <div className="ia-modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit" className="ia-btn-save" disabled={pushing}>
              {pushing ? 'Pushing...' : 'Push Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterviewAssignment;

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { interviewAssignmentApi, interviewTemplateApi } from '../../api/interviewModuleApi';
import { userApi, batchApi, courseApi } from '../../api';
import './InterviewAssignment.css';

const studentLabel = (u: any) =>
  u.name || [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || u._id;

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
    // Assignable = anything that's been published (status becomes active/scheduled).
    interviewTemplateApi.getAll({ limit: 100 }).then(res => {
      const assignable = (res.templates || []).filter((t: any) => ['active', 'published', 'scheduled'].includes(t.status));
      setTemplates(assignable);
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
    templateId: initialTemplateId || '', batchId: '', courseId: '',
    pushReason: '', maxAttempts: 1,
    availableFrom: '', dueDate: '', expiresAt: '',
  });

  const updateForm = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  // Pickers: students (searchable multi-select), batches + courses (dropdowns)
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notify, setNotify] = useState(true);
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)');

  useEffect(() => {
    userApi.getUsers().then((res: any) => {
      const all = res.users || res.data || res || [];
      setStudents(all.filter((u: any) => u.role === 'STUDENT' && u.isActive !== false));
    }).catch(() => {});
    batchApi.getBatches().then((res: any) => setBatches(res.batches || res.data || res || [])).catch(() => {});
    courseApi.getCourses({ isActive: true }).then((res: any) => setCourses(res.courses || res.data || res || [])).catch(() => {});
  }, []);

  const toggleStudent = (id: string) =>
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const q = studentSearch.trim().toLowerCase();
  const filteredStudents = (q
    ? students.filter(u => studentLabel(u).toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    : students
  ).slice(0, 100);
  const allSelected = filteredStudents.length > 0 && filteredStudents.every(u => selectedStudents.includes(u._id));
  const toggleAll = () => {
    if (allSelected) setSelectedStudents(prev => prev.filter(id => !filteredStudents.some(u => u._id === id)));
    else setSelectedStudents(prev => Array.from(new Set([...prev, ...filteredStudents.map(u => u._id)])));
  };
  const batchName = (u: any) => u.batchName || batches.find(b => b._id === (u.batchId?._id || u.batchId))?.name || '—';
  const initials = (u: any) => studentLabel(u).split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase();

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
        if (selectedStudents.length === 0) { alert('Select at least one student'); return; }
        await interviewAssignmentApi.push({ templateId: form.templateId, ...commonPayload, studentIds: selectedStudents });
      } else if (pushMode === 'batch') {
        if (!form.batchId) { alert('Select a batch'); return; }
        await interviewAssignmentApi.pushToBatch({ templateId: form.templateId, ...commonPayload, batchIds: [form.batchId] });
      } else {
        if (!form.courseId) { alert('Select a course'); return; }
        await interviewAssignmentApi.pushToCourse({ templateId: form.templateId, ...commonPayload, courseIds: [form.courseId] });
      }
      onPushed();
    } catch (err: any) {
      alert(err.message || 'Failed to push');
    } finally { setPushing(false); }
  };

  const selectedTemplate = templates.find(t => t._id === form.templateId);
  const footerCount = pushMode === 'individual'
    ? `${selectedStudents.length} Student${selectedStudents.length === 1 ? '' : 's'} Selected`
    : pushMode === 'batch'
      ? (form.batchId ? `Batch: ${batches.find(b => b._id === form.batchId)?.name || ''}` : 'No batch selected')
      : (form.courseId ? `Course selected` : 'No course selected');

  const Step = ({ n, label, extra }: { n: number; label: string; extra?: React.ReactNode }) => (
    <div className="ia2-step-h"><span className="ia2-step-n">{n}</span>{label}{extra}</div>
  );

  return (
    <div className="ia-modal-overlay" onClick={onClose}>
      <div className="ia2-modal" onClick={e => e.stopPropagation()}>
        <div className="ia2-head">
          <div>
            <h2>Push Interview Assignment</h2>
            <p>Assign an interview template to students with scheduling and rules.</p>
          </div>
          <button className="ia2-x" onClick={onClose}>×</button>
        </div>

        <div className="ia2-body">
          {/* 1 & 2 */}
          <div className="ia2-grid2">
            <div>
              <Step n={1} label="Select Template" />
              <select className="ia2-input" value={form.templateId} onChange={e => updateForm('templateId', e.target.value)}>
                <option value="">Select a published template…</option>
                {templates.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
              </select>
              {selectedTemplate && <a className="ia2-link" href={`/admin/interviews/templates/${form.templateId}/edit`} target="_blank" rel="noreferrer">↗ Preview Template</a>}
            </div>
            <div>
              <Step n={2} label="Push To" />
              <div className="ia2-modes">
                {(['individual', 'batch', 'course'] as const).map(mode => (
                  <button key={mode} type="button" className={`ia2-mode ${pushMode === mode ? 'active' : ''}`} onClick={() => setPushMode(mode)}>
                    {mode === 'individual' ? '👤 Individual' : mode === 'batch' ? '👥 Batch' : '📚 Course'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3 - selection */}
          {pushMode === 'individual' ? (
            <div className="ia2-section">
              <Step n={3} label="Select Students" extra={<span className="ia2-step-right"><span className="ia2-count">{selectedStudents.length} selected</span><button type="button" className="ia2-selall" onClick={toggleAll}>{allSelected ? 'Clear All' : 'Select All'}</button></span>} />
              <input className="ia2-input" placeholder="🔍 Search by name or email…" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
              <div className="ia2-table">
                <div className="ia2-tr ia2-th">
                  <span><input type="checkbox" checked={allSelected} onChange={toggleAll} /></span>
                  <span>Student Name</span><span>Email</span><span>Batch</span><span>Status</span>
                </div>
                {filteredStudents.length === 0 ? <div className="ia2-empty">{students.length ? 'No matching students.' : 'Loading students…'}</div> :
                  filteredStudents.map(u => (
                    <label key={u._id} className={`ia2-tr ${selectedStudents.includes(u._id) ? 'sel' : ''}`}>
                      <span><input type="checkbox" checked={selectedStudents.includes(u._id)} onChange={() => toggleStudent(u._id)} /></span>
                      <span className="ia2-stu"><span className="ia2-av">{initials(u)}</span>{studentLabel(u)}</span>
                      <span className="ia2-muted">{u.email}</span>
                      <span className="ia2-muted">{batchName(u)}</span>
                      <span><span className={`ia2-badge ${u.isActive !== false ? 'on' : 'off'}`}>● {u.isActive !== false ? 'Active' : 'Inactive'}</span></span>
                    </label>
                  ))}
              </div>
            </div>
          ) : pushMode === 'batch' ? (
            <div className="ia2-section">
              <Step n={3} label="Select Batch" />
              <select className="ia2-input" value={form.batchId} onChange={e => updateForm('batchId', e.target.value)}>
                <option value="">Select a batch…</option>
                {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="ia2-section">
              <Step n={3} label="Select Course" />
              <select className="ia2-input" value={form.courseId} onChange={e => updateForm('courseId', e.target.value)}>
                <option value="">Select a course…</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title || c.name}</option>)}
              </select>
            </div>
          )}

          {/* 4-9 */}
          <div className="ia2-grid4">
            <div><Step n={4} label="Max Attempts" /><input className="ia2-input" type="number" min={1} value={form.maxAttempts} onChange={e => updateForm('maxAttempts', parseInt(e.target.value) || 1)} /></div>
            <div><Step n={5} label="Push Reason" /><input className="ia2-input" value={form.pushReason} onChange={e => updateForm('pushReason', e.target.value)} placeholder="e.g. Placement prep" /></div>
            <div><Step n={6} label="Available From" /><input className="ia2-input" type="datetime-local" value={form.availableFrom} onChange={e => updateForm('availableFrom', e.target.value)} /></div>
            <div><Step n={7} label="Due Date" /><input className="ia2-input" type="datetime-local" value={form.dueDate} onChange={e => updateForm('dueDate', e.target.value)} /></div>
          </div>
          <div className="ia2-grid4">
            <div><Step n={8} label="Expires At (Optional)" /><input className="ia2-input" type="datetime-local" value={form.expiresAt} onChange={e => updateForm('expiresAt', e.target.value)} /></div>
            <div><Step n={9} label="Time Zone" /><select className="ia2-input" value={timezone} onChange={e => setTimezone(e.target.value)}><option>Asia/Kolkata (IST)</option><option>UTC</option><option>America/New_York (EST)</option><option>Europe/London (GMT)</option></select></div>
            <div style={{ gridColumn: 'span 2' }}><Step n={10} label="Notification" />
              <label className="ia2-notify"><input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} /> Send email &amp; in-app notification to selected students</label>
            </div>
          </div>
        </div>

        <div className="ia2-foot">
          <div className="ia2-foot-count"><span className="ia2-foot-ic">👥</span><div><strong>{footerCount}</strong><div className="ia2-muted">This assignment will be sent to the selection above.</div></div></div>
          <div className="ia2-foot-actions">
            <button type="button" className="ia2-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="ia2-push" disabled={pushing} onClick={() => handlePush({ preventDefault: () => {} } as any)}>{pushing ? 'Pushing…' : '➤ Push Assignment'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewAssignment;

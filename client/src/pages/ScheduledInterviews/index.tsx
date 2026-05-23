import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { scheduledInterviewApi, userApi, batchApi } from '../../api';

const DEFAULT_CRITERIA = [
  { key: 'technical', label: 'Technical' },
  { key: 'behavioral', label: 'Behavioral' },
  { key: 'communication', label: 'Communication' },
  { key: 'aptitude', label: 'Aptitude' },
  { key: 'coding', label: 'Coding' },
  { key: 'hr', label: 'HR' },
];

const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb', in_progress: '#d97706', completed: '#16a34a', cancelled: '#6b7280',
};

interface Interview {
  _id: string; title: string; date: string; time: string; duration: number;
  interviewerName: string; status: string; students: any[]; criteria: any[];
  emailSent: boolean; feedbackStats?: { total: number; submitted: number };
}

const ScheduledInterviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '10:00', duration: 45,
    interviewerName: '', interviewerEmail: '', venue: '', meetLink: '',
    emailSubject: '', emailBody: '',
  });
  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(['technical', 'communication', 'hr']);
  const [customCriterion, setCustomCriterion] = useState('');
  const [extraCriteria, setExtraCriteria] = useState<{ key: string; label: string }[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const showMsg = (type: 'success' | 'error', msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const loadInterviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await scheduledInterviewApi.list({ limit: 50 });
      setInterviews(res.data?.interviews || []);
    } catch { showMsg('error', 'Failed to load interviews'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  useEffect(() => {
    if (!showCreate) return;
    Promise.all([
      userApi.getUsers().then((r: any) => setStudents((r.data || []).filter((u: any) => u.role === 'STUDENT'))),
      batchApi.getBatches().then((r: any) => setBatches(r.data || [])),
    ]).catch(() => {});
  }, [showCreate]);

  const allCriteria = [
    ...DEFAULT_CRITERIA,
    ...extraCriteria.filter(e => !DEFAULT_CRITERIA.some(d => d.key === e.key)),
  ];

  const toggleCriterion = (key: string) => {
    setSelectedCriteria(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addCustomCriterion = () => {
    const label = customCriterion.trim();
    if (!label) return;
    const key = label.toLowerCase().replace(/\s+/g, '_');
    if (allCriteria.some(c => c.key === key)) { setCustomCriterion(''); return; }
    setExtraCriteria(prev => [...prev, { key, label }]);
    setSelectedCriteria(prev => [...prev, key]);
    setCustomCriterion('');
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleBatch = (id: string) => {
    setSelectedBatchIds(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const handleCreate = async () => {
    if (!form.title || !form.date || !form.time || !form.interviewerName) {
      showMsg('error', 'Title, date, time and interviewer name are required');
      return;
    }
    if (selectedStudentIds.length === 0 && selectedBatchIds.length === 0) {
      showMsg('error', 'Please select at least one student or batch');
      return;
    }
    try {
      setSaving(true);
      const criteria = allCriteria.filter(c => selectedCriteria.includes(c.key));
      await scheduledInterviewApi.create({
        ...form,
        criteria,
        studentIds: selectedStudentIds,
        batchIds: selectedBatchIds,
      });
      showMsg('success', 'Interview scheduled and emails sent!');
      setShowCreate(false);
      resetForm();
      loadInterviews();
    } catch (err: any) { showMsg('error', err.message || 'Failed to create interview'); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setForm({ title: '', description: '', date: '', time: '10:00', duration: 45,
      interviewerName: '', interviewerEmail: '', venue: '', meetLink: '', emailSubject: '', emailBody: '' });
    setSelectedCriteria(['technical', 'communication', 'hr']);
    setExtraCriteria([]);
    setSelectedStudentIds([]);
    setSelectedBatchIds([]);
    setStudentSearch('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this interview?')) return;
    try {
      await scheduledInterviewApi.delete(id);
      showMsg('success', 'Deleted');
      loadInterviews();
    } catch { showMsg('error', 'Failed to delete'); }
  };

  const filteredStudents = students.filter(s =>
    `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`; };

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {alert && (
        <div style={{ padding: '12px 20px', borderRadius: 8, marginBottom: 16,
          background: alert.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: alert.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${alert.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {alert.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Mock Interviews</h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>Schedule interviews, assign students, track feedback</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          + Schedule Interview
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>Loading interviews…</div>
      ) : interviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, border: '2px dashed #e5e7eb', borderRadius: 12, color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <p style={{ margin: 0, fontWeight: 600 }}>No interviews scheduled yet</p>
          <p style={{ margin: '4px 0 0', fontSize: 14 }}>Click "Schedule Interview" to get started</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {interviews.map(iv => (
            <div key={iv._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20,
              boxShadow: '0 1px 3px rgba(0,0,0,.06)', cursor: 'pointer' }}
              onClick={() => navigate(`/scheduled-interviews/${iv._id}`)}>
              <div style={{ width: 56, height: 56, borderRadius: 10, background: '#eff6ff',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>
                  {new Date(iv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 16, color: '#111827' }}>{iv.title}</span>
                  <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    background: `${STATUS_COLORS[iv.status]}20`, color: STATUS_COLORS[iv.status] }}>
                    {iv.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {iv.emailSent && <span style={{ fontSize: 11, color: '#16a34a' }}>✉ Emails sent</span>}
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6b7280' }}>
                  <span>⏰ {formatDate(iv.date)} at {formatTime(iv.time)} ({iv.duration} min)</span>
                  <span>👤 {iv.interviewerName}</span>
                  <span>👥 {iv.students?.length || 0} students</span>
                  {iv.feedbackStats && iv.feedbackStats.total > 0 &&
                    <span>📝 {iv.feedbackStats.submitted}/{iv.feedbackStats.total} feedback given</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                  {(iv.criteria || []).map((c: any) => (
                    <span key={c.key} style={{ padding: '1px 8px', background: '#f3f4f6', borderRadius: 10, fontSize: 11, color: '#374151' }}>{c.label}</span>
                  ))}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDelete(iv._id); }}
                style={{ padding: '6px 14px', background: '#fef2f2', color: '#dc2626',
                  border: '1px solid #fecaca', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 1000,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '24px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 740,
            boxShadow: '0 20px 60px rgba(0,0,0,.2)', marginBottom: 24 }}>
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Schedule Mock Interview</h2>
              <button onClick={() => { setShowCreate(false); resetForm(); }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280' }}>×</button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Title */}
              <div>
                <label style={labelStyle}>Interview Title *</label>
                <input style={inputStyle} placeholder="e.g. Final Year Mock Interview – Batch A" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              {/* Date / Time / Duration */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Date *</label>
                  <input style={inputStyle} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Start Time *</label>
                  <input style={inputStyle} type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Duration (min)</label>
                  <input style={inputStyle} type="number" min={5} value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} />
                </div>
              </div>

              {/* Interviewer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Interviewer Name *</label>
                  <input style={inputStyle} placeholder="e.g. Rajesh Kumar" value={form.interviewerName}
                    onChange={e => setForm(f => ({ ...f, interviewerName: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Interviewer Email (optional)</label>
                  <input style={inputStyle} type="email" placeholder="interviewer@company.com" value={form.interviewerEmail}
                    onChange={e => setForm(f => ({ ...f, interviewerEmail: e.target.value }))} />
                </div>
              </div>

              {/* Venue / Meet */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Venue (optional)</label>
                  <input style={inputStyle} placeholder="Room 201, Main Block" value={form.venue}
                    onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Meet / Video Link (optional)</label>
                  <input style={inputStyle} placeholder="https://meet.google.com/..." value={form.meetLink}
                    onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))} />
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div>
                <label style={labelStyle}>Evaluation Criteria</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {allCriteria.map(c => (
                    <button key={c.key} type="button"
                      onClick={() => toggleCriterion(c.key)}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 500,
                        border: selectedCriteria.includes(c.key) ? '2px solid #2563eb' : '1px solid #d1d5db',
                        background: selectedCriteria.includes(c.key) ? '#eff6ff' : '#fff',
                        color: selectedCriteria.includes(c.key) ? '#2563eb' : '#374151' }}>
                      {selectedCriteria.includes(c.key) ? '✓ ' : ''}{c.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input style={{ ...inputStyle, flex: 1 }} placeholder="Add custom criterion…" value={customCriterion}
                    onChange={e => setCustomCriterion(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomCriterion()} />
                  <button onClick={addCustomCriterion}
                    style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                      borderRadius: 8, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>+ Add</button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Interview Description / Notes</label>
                <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} placeholder="Topics to be covered, preparation tips…"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              {/* Email */}
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#374151', fontSize: 14 }}>📧 Email to Students</p>
                <div style={{ marginBottom: 10 }}>
                  <label style={labelStyle}>Email Subject</label>
                  <input style={inputStyle} placeholder="e.g. Mock Interview Scheduled – Please Read" value={form.emailSubject}
                    onChange={e => setForm(f => ({ ...f, emailSubject: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Email Message Body</label>
                  <textarea style={{ ...inputStyle, height: 90, resize: 'vertical' }}
                    placeholder="Dear student, this is to inform you about your upcoming mock interview…"
                    value={form.emailBody} onChange={e => setForm(f => ({ ...f, emailBody: e.target.value }))} />
                </div>
              </div>

              {/* Select Students */}
              <div>
                <label style={labelStyle}>Assign Students</label>
                {/* Batches */}
                {batches.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280' }}>Select by Batch:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {batches.map((b: any) => (
                        <button key={b._id} type="button" onClick={() => toggleBatch(b._id)}
                          style={{ padding: '4px 12px', borderRadius: 16, fontSize: 13, cursor: 'pointer',
                            border: selectedBatchIds.includes(b._id) ? '2px solid #16a34a' : '1px solid #d1d5db',
                            background: selectedBatchIds.includes(b._id) ? '#f0fdf4' : '#fff',
                            color: selectedBatchIds.includes(b._id) ? '#16a34a' : '#374151', fontWeight: 500 }}>
                          {selectedBatchIds.includes(b._id) ? '✓ ' : ''}{b.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Individual students */}
                <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Search students by name or email…"
                  value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  {filteredStudents.slice(0, 60).map(s => (
                    <div key={s._id}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                        background: selectedStudentIds.includes(s._id) ? '#eff6ff' : '#fff' }}
                      onClick={() => toggleStudent(s._id)}>
                      <input type="checkbox" readOnly checked={selectedStudentIds.includes(s._id)}
                        style={{ width: 15, height: 15, cursor: 'pointer' }} />
                      <span style={{ fontSize: 14, color: '#111827' }}>{s.firstName} {s.lastName}</span>
                      <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{s.email}</span>
                    </div>
                  ))}
                  {filteredStudents.length === 0 && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No students found</div>
                  )}
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6b7280' }}>
                  {selectedStudentIds.length} individual + {selectedBatchIds.length} batch(es) selected
                </p>
              </div>
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => { setShowCreate(false); resetForm(); }}
                style={{ padding: '10px 20px', border: '1px solid #d1d5db', borderRadius: 8,
                  background: '#fff', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={saving}
                style={{ padding: '10px 24px', background: saving ? '#93c5fd' : '#2563eb', color: '#fff',
                  border: 'none', borderRadius: 8, cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                {saving ? 'Scheduling…' : '📅 Schedule & Send Emails'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 600, color: '#374151',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
};

export default ScheduledInterviewsPage;

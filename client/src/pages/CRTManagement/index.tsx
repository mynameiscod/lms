import React, { useEffect, useState, useCallback } from 'react';
import { crtApi, departmentApi } from '../../api';

/* ── types ─────────────────────────────────────────────────────────────────── */
interface Department { _id: string; name: string; code: string }

type CRTTopic = 'aptitude' | 'verbal' | 'technical' | 'soft_skills' | 'resume' | 'gd' | 'mock_interview' | 'domain' | 'other';
type SessionStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

interface CRTSession {
  _id: string;
  title: string;
  description?: string;
  topic: CRTTopic;
  departmentIds: Department[];
  targetYears: number[];
  scheduledAt: string;
  durationMins: number;
  venue?: string;
  meetLink?: string;
  materialUrl?: string;
  status: SessionStatus;
  attendance: { userId: any; status: string }[];
  feedback?: string;
  trainerId?: { _id: string; firstName: string; lastName: string; email: string };
  isActive: boolean;
}

const TOPICS: { key: CRTTopic; label: string; icon: string }[] = [
  { key: 'aptitude',       label: 'Aptitude',          icon: '🧮' },
  { key: 'verbal',         label: 'Verbal',             icon: '💬' },
  { key: 'technical',      label: 'Technical',          icon: '⚙️' },
  { key: 'soft_skills',    label: 'Soft Skills',        icon: '🤝' },
  { key: 'resume',         label: 'Resume Building',    icon: '📄' },
  { key: 'gd',             label: 'Group Discussion',   icon: '🗣️' },
  { key: 'mock_interview', label: 'Mock Interview',     icon: '🎯' },
  { key: 'domain',         label: 'Domain Knowledge',   icon: '📚' },
  { key: 'other',          label: 'Other',              icon: '📌' },
];

const STATUS_COLORS: Record<SessionStatus, string> = {
  scheduled:  'bg-info',
  ongoing:    'bg-warning text-dark',
  completed:  'bg-success',
  cancelled:  'bg-danger',
};

const YEARS = [1, 2, 3, 4] as const;

const emptyForm = () => ({
  title: '',
  description: '',
  topic: 'other' as CRTTopic,
  departmentIds: [] as string[],
  targetYears: [] as number[],
  scheduledAt: '',
  durationMins: 60,
  venue: '',
  meetLink: '',
  materialUrl: '',
});

/* ── component ─────────────────────────────────────────────────────────────── */
const CRTManagementPage: React.FC = () => {
  const [sessions, setSessions] = useState<CRTSession[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /* filters */
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');

  /* modal */
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CRTSession | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  /* detail panel */
  const [selected, setSelected] = useState<CRTSession | null>(null);

  /* ── fetch ──────────────────────────────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sessRes, deptRes] = await Promise.all([
        crtApi.list({
          status:       filterStatus || undefined,
          departmentId: filterDept   || undefined,
          year:         filterYear   ? Number(filterYear) : undefined
        }),
        departmentApi.list()
      ]);
      setSessions(sessRes.data || []);
      setDepartments(deptRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load CRT sessions');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterDept, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── modal helpers ──────────────────────────────────────────────────────── */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  };

  const openEdit = (s: CRTSession) => {
    setEditing(s);
    setForm({
      title:        s.title,
      description:  s.description || '',
      topic:        s.topic,
      departmentIds: s.departmentIds.map(d => d._id),
      targetYears:  s.targetYears,
      scheduledAt:  s.scheduledAt ? s.scheduledAt.slice(0, 16) : '',
      durationMins: s.durationMins,
      venue:        s.venue || '',
      meetLink:     s.meetLink || '',
      materialUrl:  s.materialUrl || '',
    });
    setError('');
    setShowModal(true);
  };

  const toggleYear = (y: number) => {
    setForm(prev => ({
      ...prev,
      targetYears: prev.targetYears.includes(y)
        ? prev.targetYears.filter(x => x !== y)
        : [...prev.targetYears, y]
    }));
  };

  const toggleDept = (id: string) => {
    setForm(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(id)
        ? prev.departmentIds.filter(x => x !== id)
        : [...prev.departmentIds, id]
    }));
  };

  /* ── submit ─────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) {
      setError('Title and scheduled date/time are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      if (editing) {
        await crtApi.update(editing._id, form);
        setSuccess('Session updated.');
      } else {
        await crtApi.create(form);
        setSuccess('Session created.');
      }
      setShowModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (s: CRTSession) => {
    if (!window.confirm(`Delete "${s.title}"? This cannot be undone.`)) return;
    try {
      await crtApi.remove(s._id);
      setSuccess('Session deleted.');
      if (selected?._id === s._id) setSelected(null);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed to delete');
    }
  };

  const handleStatusChange = async (s: CRTSession, status: SessionStatus) => {
    try {
      await crtApi.update(s._id, { status });
      setSuccess(`Status updated to "${status}".`);
      fetchAll();
      if (selected?._id === s._id) setSelected({ ...s, status });
    } catch (e: any) {
      setError(e.message || 'Failed to update status');
    }
  };

  /* ── helpers ────────────────────────────────────────────────────────────── */
  const topicLabel = (key: CRTTopic) => TOPICS.find(t => t.key === key)?.label || key;
  const topicIcon  = (key: CRTTopic) => TOPICS.find(t => t.key === key)?.icon || '📌';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">CRT Sessions</h4>
          <p className="text-muted small mb-0">Corporate Readiness Training — schedule and manage training sessions</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1" /> Schedule Session
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-danger py-2 alert-dismissible" onClick={() => setError('')}>{error}</div>}
      {success && <div className="alert alert-success py-2 alert-dismissible" onClick={() => setSuccess('')}>{success}</div>}

      {/* Stats row */}
      <div className="row g-3 mb-4">
        {(['scheduled', 'ongoing', 'completed', 'cancelled'] as SessionStatus[]).map(st => (
          <div className="col-6 col-md-3" key={st}>
            <div className="card border-0 shadow-sm text-center py-3">
              <div className={`badge ${STATUS_COLORS[st]} mx-auto mb-1`} style={{ fontSize: '0.7rem' }}>{st}</div>
              <div className="fw-bold fs-4">{sessions.filter(s => s.status === st).length}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4 border-0 shadow-sm">
        <div className="card-body py-3">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Status</label>
              <select className="form-select form-select-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Department</label>
              <select className="form-select form-select-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small fw-semibold">Year</label>
              <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Session list + detail panel */}
      <div className="row g-3">
        <div className={selected ? 'col-md-7' : 'col-12'}>
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-calendar-x fs-1 d-block mb-2" />
              No CRT sessions found. Click <strong>Schedule Session</strong> to create one.
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {sessions.map(s => (
                <div
                  key={s._id}
                  className={`card border-0 shadow-sm cursor-pointer ${selected?._id === s._id ? 'border-primary border' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(selected?._id === s._id ? null : s)}
                >
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex gap-3 align-items-start">
                        <span style={{ fontSize: '1.8rem' }}>{topicIcon(s.topic)}</span>
                        <div>
                          <h6 className="fw-bold mb-0">{s.title}</h6>
                          <small className="text-muted">
                            {topicLabel(s.topic)} · {formatDate(s.scheduledAt)} · {s.durationMins} min
                          </small>
                          <div className="mt-1">
                            {s.targetYears.map(y => (
                              <span key={y} className="badge bg-light text-dark border me-1">Year {y}</span>
                            ))}
                            {s.departmentIds.map(d => (
                              <span key={d._id} className="badge bg-light text-dark border me-1">{d.code || d.name}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="d-flex flex-column align-items-end gap-2" onClick={e => e.stopPropagation()}>
                        <span className={`badge ${STATUS_COLORS[s.status]}`}>{s.status}</span>
                        <div className="d-flex gap-1">
                          <button className="btn btn-xs btn-outline-primary btn-sm" onClick={() => openEdit(s)}>
                            <i className="bi bi-pencil" />
                          </button>
                          <button className="btn btn-xs btn-outline-danger btn-sm" onClick={() => handleDelete(s)}>
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="col-md-5">
            <div className="card border-0 shadow-sm sticky-top" style={{ top: 80 }}>
              <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom">
                <h6 className="fw-bold mb-0">{selected.title}</h6>
                <button className="btn-close btn-sm" onClick={() => setSelected(null)} />
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <span className={`badge ${STATUS_COLORS[selected.status]} me-2`}>{selected.status}</span>
                  <span className="badge bg-secondary">{topicLabel(selected.topic)}</span>
                </div>

                <dl className="row small mb-3">
                  <dt className="col-5 text-muted">Date & Time</dt>
                  <dd className="col-7">{formatDate(selected.scheduledAt)}</dd>
                  <dt className="col-5 text-muted">Duration</dt>
                  <dd className="col-7">{selected.durationMins} minutes</dd>
                  {selected.venue && <>
                    <dt className="col-5 text-muted">Venue</dt>
                    <dd className="col-7">{selected.venue}</dd>
                  </>}
                  {selected.meetLink && <>
                    <dt className="col-5 text-muted">Meet Link</dt>
                    <dd className="col-7"><a href={selected.meetLink} target="_blank" rel="noreferrer">Join</a></dd>
                  </>}
                  {selected.materialUrl && <>
                    <dt className="col-5 text-muted">Material</dt>
                    <dd className="col-7"><a href={selected.materialUrl} target="_blank" rel="noreferrer">Download</a></dd>
                  </>}
                  <dt className="col-5 text-muted">Target Years</dt>
                  <dd className="col-7">{selected.targetYears.map(y => `Year ${y}`).join(', ') || '—'}</dd>
                  <dt className="col-5 text-muted">Departments</dt>
                  <dd className="col-7">{selected.departmentIds.map(d => d.name).join(', ') || '—'}</dd>
                  <dt className="col-5 text-muted">Attendance</dt>
                  <dd className="col-7">{selected.attendance.length} recorded</dd>
                </dl>

                {selected.description && (
                  <div className="mb-3">
                    <p className="small text-muted mb-1">Description</p>
                    <p className="small">{selected.description}</p>
                  </div>
                )}

                {selected.feedback && (
                  <div className="mb-3 p-2 bg-light rounded">
                    <p className="small text-muted mb-1">Trainer Feedback</p>
                    <p className="small mb-0">{selected.feedback}</p>
                  </div>
                )}

                {/* Quick status change */}
                <div className="mt-3">
                  <p className="small fw-semibold mb-1">Change Status</p>
                  <div className="d-flex gap-2 flex-wrap">
                    {(['scheduled', 'ongoing', 'completed', 'cancelled'] as SessionStatus[])
                      .filter(st => st !== selected.status)
                      .map(st => (
                        <button
                          key={st}
                          className={`btn btn-sm ${STATUS_COLORS[st]} border-0`}
                          onClick={() => handleStatusChange(selected, st)}
                        >
                          {st}
                        </button>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editing ? 'Edit Session' : 'Schedule CRT Session'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}

                  <div className="row g-3">
                    {/* Title */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Session Title <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Aptitude Training — Batch 2024"
                        value={form.title}
                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Topic */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Topic</label>
                      <select
                        className="form-select"
                        value={form.topic}
                        onChange={e => setForm(f => ({ ...f, topic: e.target.value as CRTTopic }))}
                      >
                        {TOPICS.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                      </select>
                    </div>

                    {/* Duration */}
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Duration (min)</label>
                      <input
                        type="number"
                        className="form-control"
                        min={15} max={480} step={15}
                        value={form.durationMins}
                        onChange={e => setForm(f => ({ ...f, durationMins: Number(e.target.value) }))}
                      />
                    </div>

                    {/* Scheduled At */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Date & Time <span className="text-danger">*</span></label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={form.scheduledAt}
                        onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                        required
                      />
                    </div>

                    {/* Venue */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Venue</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Seminar Hall A / Online"
                        value={form.venue}
                        onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
                      />
                    </div>

                    {/* Meet Link */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Meet Link</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://meet.google.com/..."
                        value={form.meetLink}
                        onChange={e => setForm(f => ({ ...f, meetLink: e.target.value }))}
                      />
                    </div>

                    {/* Material URL */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Material URL</label>
                      <input
                        type="url"
                        className="form-control"
                        placeholder="https://drive.google.com/..."
                        value={form.materialUrl}
                        onChange={e => setForm(f => ({ ...f, materialUrl: e.target.value }))}
                      />
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <label className="form-label fw-semibold">Description</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Optional notes about the session"
                        value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      />
                    </div>

                    {/* Target Years */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Target Year Groups</label>
                      <div className="d-flex gap-2 flex-wrap mt-1">
                        {YEARS.map(y => (
                          <div
                            key={y}
                            className={`badge rounded-pill px-3 py-2 ${form.targetYears.includes(y) ? 'bg-primary' : 'bg-light text-dark border'}`}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => toggleYear(y)}
                          >
                            Year {y}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Departments */}
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Departments</label>
                      <div className="d-flex gap-2 flex-wrap mt-1">
                        {departments.map(d => (
                          <div
                            key={d._id}
                            className={`badge rounded-pill px-3 py-2 ${form.departmentIds.includes(d._id) ? 'bg-primary' : 'bg-light text-dark border'}`}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                            onClick={() => toggleDept(d._id)}
                          >
                            {d.code}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Saving…' : editing ? 'Update Session' : 'Create Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRTManagementPage;

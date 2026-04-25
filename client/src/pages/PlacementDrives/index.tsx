import React, { useEffect, useState, useCallback } from 'react';
import { placementDriveApi } from '../../api';
import BulkStatusImport from './BulkStatusImport';
import './PlacementDrivesPage.css';

/* ── types ─────────────────────────────────────────────────────────────────── */
interface Drive {
  _id: string;
  companyName: string;
  companyLogo?: string;
  role: string;
  ctcMin?: number;
  ctcMax?: number;
  location?: string;
  driveType: string;
  status: string;
  applyDeadline?: string;
  driveDate?: string;
  eligibility: {
    minCgpa?: number;
    allowedBranches?: string[];
    allowedYears?: number[];
    maxBacklogs?: number;
  };
  description?: string;
  applicants: string[];
  applicantStatuses?: Record<string, string>;
  rounds?: { name: string; date?: string; venue?: string; description?: string }[];
  isActive: boolean;
}

interface DriveApplicant {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profilePicture?: string;
}

interface DriveStats {
  total: number;
  byStatus: Record<string, number>;
  totalApplicants: number;
  breakdown: {
    _id: string; companyName: string; role: string;
    status: string; applicantCount: number;
    driveDate?: string; applyDeadline?: string;
  }[];
}

const STATUS_BADGE: Record<string, string> = {
  upcoming:  'text-bg-primary',
  ongoing:   'text-bg-success',
  completed: 'text-bg-secondary',
  cancelled: 'text-bg-danger',
};

const emptyForm = {
  companyName: '',
  role: '',
  ctcMin: '',
  ctcMax: '',
  location: '',
  driveType: 'on-campus',
  status: 'upcoming',
  applyDeadline: '',
  driveDate: '',
  minCgpa: '',
  allowedBranches: '',
  allowedYears: '',
  maxBacklogs: '0',
  description: '',
};

/* ── component ─────────────────────────────────────────────────────────────── */
const PlacementDrivesPage: React.FC = () => {
  const [drives, setDrives]   = useState<Drive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  // tabs
  const [activeTab, setActiveTab] = useState<'drives' | 'analytics'>('drives');

  // analytics
  const [stats, setStats]         = useState<DriveStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // filter
  const [filterStatus, setFilterStatus] = useState('');

  // modal
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [submitting, setSubmitting]     = useState(false);

  // manage panel (applicants + rounds)
  const [manageDrive, setManageDrive]   = useState<Drive | null>(null);
  const [manageApplicants, setManageApplicants] = useState<DriveApplicant[]>([]);
  const [manageStatuses, setManageStatuses]     = useState<Record<string, string>>({});
  const [manageTab, setManageTab]               = useState<'applicants' | 'rounds'>('applicants');
  const [newRound, setNewRound]                 = useState({ name: '', date: '', venue: '', description: '' });
  const [loadingPanel, setLoadingPanel]         = useState(false);
  const [showBulkImport, setShowBulkImport]     = useState(false);

  // ── fetch ────────────────────────────────────────────────────────────────────
  const fetchDrives = useCallback(async () => {
    try {
      setLoading(true);
      const res = await placementDriveApi.list(filterStatus || undefined);
      setDrives(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load drives');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchDrives(); }, [fetchDrives]);

  // ── fetch analytics ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'analytics') return;
    setLoadingStats(true);
    placementDriveApi.getStats()
      .then((res: any) => setStats(res.data || null))
      .catch((e: any) => setError(e.message || 'Failed to load analytics'))
      .finally(() => setLoadingStats(false));
  }, [activeTab]);

  // ── helpers ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (d: Drive) => {
    setEditId(d._id);
    setForm({
      companyName: d.companyName,
      role: d.role,
      ctcMin: d.ctcMin != null ? String(d.ctcMin) : '',
      ctcMax: d.ctcMax != null ? String(d.ctcMax) : '',
      location: d.location || '',
      driveType: d.driveType,
      status: d.status,
      applyDeadline: d.applyDeadline ? d.applyDeadline.slice(0, 10) : '',
      driveDate: d.driveDate ? d.driveDate.slice(0, 10) : '',
      minCgpa: d.eligibility?.minCgpa != null ? String(d.eligibility.minCgpa) : '',
      allowedBranches: (d.eligibility?.allowedBranches || []).join(', '),
      allowedYears: (d.eligibility?.allowedYears || []).join(', '),
      maxBacklogs: d.eligibility?.maxBacklogs != null ? String(d.eligibility.maxBacklogs) : '0',
      description: d.description || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Deactivate drive for "${name}"?`)) return;
    try {
      await placementDriveApi.remove(id);
      setSuccess('Drive deactivated.');
      fetchDrives();
    } catch (e: any) { setError(e.message || 'Failed'); }
  };

  // ── manage panel ─────────────────────────────────────────────────────────────
  const openManage = async (d: Drive) => {
    setManageDrive(d);
    setManageTab('applicants');
    setNewRound({ name: '', date: '', venue: '', description: '' });
    setLoadingPanel(true);
    try {
      const res = await placementDriveApi.getApplicants(d._id);
      setManageApplicants(res.data?.applicants || []);
      const statusMap: Record<string, string> = {};
      if (res.data?.applicantStatuses) {
        Object.entries(res.data.applicantStatuses as Record<string, string>).forEach(([k, v]) => {
          statusMap[k] = v;
        });
      }
      setManageStatuses(statusMap);
    } catch { /* ignore */ }
    finally { setLoadingPanel(false); }
  };

  const handleStatusChange = async (applicantId: string, status: string) => {
    if (!manageDrive) return;
    try {
      await placementDriveApi.setApplicantStatus(manageDrive._id, applicantId, status);
      setManageStatuses(prev => ({ ...prev, [applicantId]: status }));
    } catch { /* ignore */ }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageDrive || !newRound.name) return;
    try {
      const res = await placementDriveApi.addRound(manageDrive._id, newRound);
      setManageDrive(prev => prev ? { ...prev, rounds: res.data } : prev);
      setNewRound({ name: '', date: '', venue: '', description: '' });
    } catch { /* ignore */ }
  };

  const handleRemoveRound = async (index: number) => {
    if (!manageDrive) return;
    try {
      const res = await placementDriveApi.removeRound(manageDrive._id, index);
      setManageDrive(prev => prev ? { ...prev, rounds: res.data } : prev);
    } catch { /* ignore */ }
  };

  // ── submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.role) {
      setError('Company name and role are required.'); return;
    }
    try {
      setSubmitting(true); setError('');
      const payload: Record<string, any> = {
        companyName: form.companyName,
        role: form.role,
        ctcMin: form.ctcMin ? Number(form.ctcMin) : undefined,
        ctcMax: form.ctcMax ? Number(form.ctcMax) : undefined,
        location: form.location || undefined,
        driveType: form.driveType,
        status: form.status,
        applyDeadline: form.applyDeadline || undefined,
        driveDate: form.driveDate || undefined,
        description: form.description || undefined,
        eligibility: {
          minCgpa: form.minCgpa ? Number(form.minCgpa) : undefined,
          maxBacklogs: form.maxBacklogs ? Number(form.maxBacklogs) : 0,
          allowedBranches: form.allowedBranches
            ? form.allowedBranches.split(',').map(s => s.trim()).filter(Boolean)
            : [],
          allowedYears: form.allowedYears
            ? form.allowedYears.split(',').map(s => Number(s.trim())).filter(Boolean)
            : [],
        }
      };
      if (editId) {
        await placementDriveApi.update(editId, payload);
      } else {
        await placementDriveApi.create(payload);
      }
      setSuccess(editId ? 'Drive updated.' : 'Drive created.');
      setShowModal(false);
      fetchDrives();
    } catch (e: any) {
      setError(e.message || 'Failed to save drive');
    } finally {
      setSubmitting(false);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────────
  const ctcLabel = (d: Drive) => {
    if (d.ctcMin && d.ctcMax) return `${d.ctcMin}–${d.ctcMax} LPA`;
    if (d.ctcMin) return `${d.ctcMin}+ LPA`;
    if (d.ctcMax) return `upto ${d.ctcMax} LPA`;
    return '—';
  };

  return (
    <div className="pd-page container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="fw-bold mb-0">Placement Drives</h4>
          <p className="text-muted small mb-0">Manage campus recruitment drives</p>
        </div>
        {activeTab === 'drives' && (
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="bi bi-briefcase me-1" />New Drive
          </button>
        )}
      </div>

      {/* Main Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'drives' ? 'active' : ''}`} onClick={() => setActiveTab('drives')}>
            <i className="bi bi-list-ul me-1" />Drives
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <i className="bi bi-bar-chart-line me-1" />Analytics
          </button>
        </li>
      </ul>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')} /></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} /></div>}

      {/* ── ANALYTICS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        loadingStats ? (
          <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        ) : !stats ? (
          <div className="text-center py-5 text-muted">No data available yet.</div>
        ) : (
          <div>
            {/* Stat cards */}
            <div className="row g-3 mb-4">
              {[
                { label: 'Total Drives',     value: stats.total,          icon: 'bi-briefcase',       color: 'primary' },
                { label: 'Open Drives',      value: (stats.byStatus['upcoming'] || 0) + (stats.byStatus['ongoing'] || 0), icon: 'bi-door-open', color: 'success' },
                { label: 'Total Applicants', value: stats.totalApplicants, icon: 'bi-people',          color: 'info' },
                { label: 'Completed',        value: stats.byStatus['completed'] || 0, icon: 'bi-check-circle', color: 'secondary' },
              ].map(c => (
                <div key={c.label} className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div className={`pd-stat-icon bg-${c.color} bg-opacity-10 text-${c.color} rounded p-2 fs-4`}>
                        <i className={`bi ${c.icon}`} />
                      </div>
                      <div>
                        <div className="fw-bold fs-5">{c.value}</div>
                        <div className="text-muted small">{c.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status breakdown */}
            <div className="row g-3 mb-4">
              {Object.entries(stats.byStatus).map(([s, cnt]) => (
                <div key={s} className="col-auto">
                  <span className={`badge fs-6 ${STATUS_BADGE[s] || 'text-bg-secondary'}`}>
                    {s}: {cnt}
                  </span>
                </div>
              ))}
            </div>

            {/* Drive breakdown table */}
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white fw-semibold">Drive Breakdown</div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Company</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-center">Applicants</th>
                      <th>Drive Date</th>
                      <th>Deadline</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.breakdown.map(b => (
                      <tr key={b._id}>
                        <td className="fw-medium">{b.companyName}</td>
                        <td className="text-muted small">{b.role}</td>
                        <td><span className={`badge ${STATUS_BADGE[b.status] || 'text-bg-secondary'}`}>{b.status}</span></td>
                        <td className="text-center fw-bold">{b.applicantCount}</td>
                        <td className="small">{b.driveDate ? new Date(b.driveDate).toLocaleDateString() : '—'}</td>
                        <td className="small">{b.applyDeadline ? new Date(b.applyDeadline).toLocaleDateString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── DRIVES TAB ───────────────────────────────────────────────────── */}
      {activeTab === 'drives' && (<>
      {/* Status filter tabs */}
      <div className="d-flex gap-2 mb-4 flex-wrap">
        {['', 'upcoming', 'ongoing', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setFilterStatus(s)}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : drives.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-briefcase fs-1 d-block mb-2" />
          No drives found. Click <strong>New Drive</strong> to add one.
        </div>
      ) : (
        <div className="row g-3">
          {drives.map(d => (
            <div key={d._id} className="col-md-6 col-xl-4">
              <div className="card border-0 shadow-sm h-100 pd-card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h6 className="fw-bold mb-0">{d.companyName}</h6>
                      <div className="text-muted small">{d.role}</div>
                    </div>
                    <span className={`badge ${STATUS_BADGE[d.status] || 'text-bg-secondary'}`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="pd-meta row g-1 my-2">
                    <div className="col-6">
                      <i className="bi bi-currency-rupee text-muted me-1" /><small>{ctcLabel(d)}</small>
                    </div>
                    <div className="col-6">
                      <i className="bi bi-geo-alt text-muted me-1" /><small>{d.location || '—'}</small>
                    </div>
                    <div className="col-6">
                      <i className="bi bi-building text-muted me-1" /><small>{d.driveType}</small>
                    </div>
                    <div className="col-6">
                      <i className="bi bi-people text-muted me-1" /><small>{d.applicants?.length || 0} applied</small>
                    </div>
                    {d.applyDeadline && (
                      <div className="col-12">
                        <i className="bi bi-calendar-x text-muted me-1" />
                        <small>Deadline: {new Date(d.applyDeadline).toLocaleDateString()}</small>
                      </div>
                    )}
                  </div>

                  {d.eligibility?.allowedBranches && d.eligibility.allowedBranches.length > 0 && (
                    <div className="mb-2">
                      {d.eligibility.allowedBranches.map(b => (
                        <span key={b} className="badge text-bg-light border me-1">{b}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer bg-white border-top-0 d-flex gap-2">
                  <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openManage(d)}>
                    <i className="bi bi-people me-1" />Manage
                  </button>
                  <button className="btn btn-sm btn-outline-primary" onClick={() => openEdit(d)}>
                    <i className="bi bi-pencil me-1" />Edit
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(d._id, d.companyName)}>
                    <i className="bi bi-trash" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal d-block pd-backdrop" tabIndex={-1}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">{editId ? 'Edit Drive' : 'New Placement Drive'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Company Name <span className="text-danger">*</span></label>
                      <input className="form-control" value={form.companyName} onChange={e => setForm({...form, companyName: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium">Role / Position <span className="text-danger">*</span></label>
                      <input className="form-control" placeholder="e.g. Software Engineer" value={form.role} onChange={e => setForm({...form, role: e.target.value})} required />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">CTC Min (LPA)</label>
                      <input type="number" className="form-control" value={form.ctcMin} onChange={e => setForm({...form, ctcMin: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">CTC Max (LPA)</label>
                      <input type="number" className="form-control" value={form.ctcMax} onChange={e => setForm({...form, ctcMax: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Drive Type</label>
                      <select className="form-select" value={form.driveType} onChange={e => setForm({...form, driveType: e.target.value})}>
                        <option value="on-campus">On Campus</option>
                        <option value="off-campus">Off Campus</option>
                        <option value="virtual">Virtual</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Location</label>
                      <input className="form-control" placeholder="Chennai / Remote" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Apply Deadline</label>
                      <input type="date" className="form-control" value={form.applyDeadline} onChange={e => setForm({...form, applyDeadline: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium">Drive Date</label>
                      <input type="date" className="form-control" value={form.driveDate} onChange={e => setForm({...form, driveDate: e.target.value})} />
                    </div>

                    <div className="col-12"><hr className="my-0" /><small className="fw-semibold text-muted">ELIGIBILITY</small></div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Min CGPA</label>
                      <input type="number" step="0.1" min="0" max="10" className="form-control" placeholder="e.g. 6.5" value={form.minCgpa} onChange={e => setForm({...form, minCgpa: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Max Backlogs</label>
                      <input type="number" min="0" className="form-control" value={form.maxBacklogs} onChange={e => setForm({...form, maxBacklogs: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Allowed Branches</label>
                      <input className="form-control" placeholder="CSE, IT, ECE" value={form.allowedBranches} onChange={e => setForm({...form, allowedBranches: e.target.value})} />
                      <div className="form-text">Comma-separated dept codes</div>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium">Allowed Years</label>
                      <input className="form-control" placeholder="3, 4" value={form.allowedYears} onChange={e => setForm({...form, allowedYears: e.target.value})} />
                      <div className="form-text">Comma-separated</div>
                    </div>

                    <div className="col-12">
                      <label className="form-label fw-medium">Description / JD Notes</label>
                      <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (editId ? 'Update Drive' : 'Create Drive')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Manage Panel (applicants + rounds) */}
      {manageDrive && (
        <div className="modal d-block pd-backdrop" tabIndex={-1} onClick={() => setManageDrive(null)}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">
                  {manageDrive.companyName} — {manageDrive.role}
                  <span className={`ms-2 badge ${STATUS_BADGE[manageDrive.status] || 'text-bg-secondary'} small`}>{manageDrive.status}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setManageDrive(null)} />
              </div>

              <div className="modal-body p-0">
                {/* sub-tabs */}
                <ul className="nav nav-tabs px-3 pt-2 border-bottom">
                  <li className="nav-item">
                    <button className={`nav-link ${manageTab === 'applicants' ? 'active' : ''}`} onClick={() => setManageTab('applicants')}>
                      Applicants ({manageApplicants.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button className={`nav-link ${manageTab === 'rounds' ? 'active' : ''}`} onClick={() => setManageTab('rounds')}>
                      Interview Rounds ({manageDrive.rounds?.length || 0})
                    </button>
                  </li>
                </ul>

                <div className="p-3">
                  {manageTab === 'applicants' && (
                    <>
                      {loadingPanel ? (
                        <div className="text-center py-4"><div className="spinner-border spinner-border-sm" /></div>
                      ) : manageApplicants.length === 0 ? (
                        <p className="text-muted small text-center py-4">No applicants yet.</p>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm table-hover align-middle mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Student</th>
                                <th>Email</th>
                                <th style={{ width: 180 }}>Status</th>
                                <th style={{ width: 60 }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {manageApplicants.map(a => {
                                const st = manageStatuses[a._id] || 'applied';
                                return (
                                  <tr key={a._id}>
                                    <td className="fw-medium">{a.firstName} {a.lastName}</td>
                                    <td className="text-muted small">{a.email}</td>
                                    <td>
                                      <select
                                        className="form-select form-select-sm"
                                        value={st}
                                        onChange={e => handleStatusChange(a._id, e.target.value)}
                                      >
                                        {['applied','shortlisted','selected','rejected','placed'].map(s => (
                                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td>
                                      {st === 'placed' && (
                                        <button
                                          title="Download Certificate"
                                          className="btn btn-sm btn-success"
                                          onClick={async () => {
                                            try {
                                              const url = await placementDriveApi.downloadCertificate(manageDrive!._id, a._id);
                                              const link = document.createElement('a');
                                              link.href = url;
                                              link.download = `certificate-${a._id}.pdf`;
                                              link.click();
                                              URL.revokeObjectURL(url);
                                            } catch { /* ignore */ }
                                          }}
                                        >
                                          <i className="bi bi-file-earmark-pdf" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="mt-3 pt-2 border-top">
                        <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowBulkImport(v => !v)}>
                          <i className="bi bi-upload me-1" />{showBulkImport ? 'Hide' : 'Bulk Import'}
                        </button>
                        {showBulkImport && manageDrive && (
                          <div className="mt-2">
                            <BulkStatusImport driveId={manageDrive._id} onDone={() => { setShowBulkImport(false); }} />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {manageTab === 'rounds' && (
                    <>
                      {/* Existing rounds */}
                      {(manageDrive.rounds || []).length === 0 ? (
                        <p className="text-muted small mb-3">No rounds added yet.</p>
                      ) : (
                        <div className="list-group mb-3">
                          {(manageDrive.rounds || []).map((r, idx) => (
                            <div key={idx} className="list-group-item d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-semibold">{idx + 1}. {r.name}</div>
                                {r.date && <div className="small text-muted">{new Date(r.date).toLocaleDateString()}{r.venue ? ` · ${r.venue}` : ''}</div>}
                                {r.description && <div className="small text-muted">{r.description}</div>}
                              </div>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveRound(idx)}>
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add round form */}
                      <form onSubmit={handleAddRound} className="border rounded p-3 bg-light">
                        <div className="fw-semibold small mb-2">Add Interview Round</div>
                        <div className="row g-2">
                          <div className="col-md-4">
                            <input className="form-control form-control-sm" placeholder="Round name *" value={newRound.name} onChange={e => setNewRound(r => ({ ...r, name: e.target.value }))} required />
                          </div>
                          <div className="col-md-3">
                            <input type="date" className="form-control form-control-sm" value={newRound.date} onChange={e => setNewRound(r => ({ ...r, date: e.target.value }))} />
                          </div>
                          <div className="col-md-3">
                            <input className="form-control form-control-sm" placeholder="Venue" value={newRound.venue} onChange={e => setNewRound(r => ({ ...r, venue: e.target.value }))} />
                          </div>
                          <div className="col-md-2 d-flex">
                            <button type="submit" className="btn btn-primary btn-sm w-100">Add</button>
                          </div>
                          <div className="col-12">
                            <input className="form-control form-control-sm" placeholder="Notes / description" value={newRound.description} onChange={e => setNewRound(r => ({ ...r, description: e.target.value }))} />
                          </div>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </>)}
    </div>
  );
};

export default PlacementDrivesPage;

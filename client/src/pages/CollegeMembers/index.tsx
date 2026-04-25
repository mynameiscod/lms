import React, { useEffect, useState, useCallback } from 'react';
import { departmentApi, collegeMembershipApi, userApi } from '../../api';
import './CollegeMembersPage.css';

interface User { _id: string; firstName: string; lastName: string; email: string; role: string; }
interface Department { _id: string; name: string; code: string; }
interface Membership {
  _id: string;
  userId: { _id: string; firstName: string; lastName: string; email: string; profilePicture?: string };
  departmentId?: { _id: string; name: string; code: string } | null;
  collegeRole: string;
  yearOfStudy?: number | null;
  rollNumber?: string | null;
  academicYear?: string | null;
  division?: string | null;
  isActive: boolean;
}

const COLLEGE_ROLES = ['COLLEGE_ADMIN', 'DEPT_HEAD', 'PLACEMENT_OFFICER', 'CRT_TRAINER', 'STUDENT'];
const ROLE_BADGE: Record<string, string> = {
  COLLEGE_ADMIN: 'text-bg-danger',
  DEPT_HEAD: 'text-bg-warning',
  PLACEMENT_OFFICER: 'text-bg-info',
  CRT_TRAINER: 'text-bg-secondary',
  STUDENT: 'text-bg-success',
};

const emptyForm = {
  userId: '',
  collegeRole: 'STUDENT',
  departmentId: '',
  yearOfStudy: '',
  rollNumber: '',
  academicYear: '',
  division: '',
  cgpa: '',
  backlogs: '',
};

const CollegeMembersPage: React.FC = () => {
  const [members, setMembers]       = useState<Membership[]>([]);
  const [users, setUsers]           = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // filters
  const [filterRole, setFilterRole]     = useState('');
  const [filterDept, setFilterDept]     = useState('');
  const [filterYear, setFilterYear]     = useState('');
  const [search, setSearch]             = useState('');

  // modal
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // ── fetch ───────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [membersRes, usersRes, deptsRes] = await Promise.all([
        collegeMembershipApi.list({
          collegeRole: filterRole || undefined,
          departmentId: filterDept || undefined,
          yearOfStudy: filterYear ? Number(filterYear) : undefined,
        }),
        userApi.getUsers(),
        departmentApi.list(),
      ]);
      setMembers(membersRes.data || []);
      setUsers(usersRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterRole, filterDept, filterYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── upsert ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.collegeRole) { setError('User and college role are required.'); return; }
    try {
      setSubmitting(true); setError('');
      await collegeMembershipApi.upsert({
        userId: form.userId,
        collegeRole: form.collegeRole,
        departmentId: form.departmentId || null,
        yearOfStudy: form.yearOfStudy ? Number(form.yearOfStudy) : null,
        rollNumber: form.rollNumber || undefined,
        academicYear: form.academicYear || undefined,
        division: form.division || undefined,
        cgpa: form.cgpa ? Number(form.cgpa) : undefined,
        backlogs: form.backlogs !== '' ? Number(form.backlogs) : undefined,
      });
      setSuccess('Membership saved.');
      setShowModal(false);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed to save membership');
    } finally {
      setSubmitting(false);
    }
  };

  // ── deactivate ──────────────────────────────────────────────────────────────
  const handleDeactivate = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from college?`)) return;
    try {
      await collegeMembershipApi.deactivate(userId);
      setSuccess(`${name} removed.`);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Failed');
    }
  };

  // ── filtered display ────────────────────────────────────────────────────────
  const filtered = members.filter(m => {
    const name = `${m.userId?.firstName} ${m.userId?.lastName} ${m.userId?.email}`.toLowerCase();
    return !search || name.includes(search.toLowerCase());
  });

  // ── users not yet assigned (for dropdown) ───────────────────────────────────
  const assignedUserIds = new Set(members.map(m => m.userId?._id));
  const unassignedUsers = users.filter(u => !assignedUserIds.has(u._id));

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="cm-page container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-0">College Members</h4>
          <p className="text-muted small mb-0">Assign users college roles and department</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setError(''); setShowModal(true); }}>
          <i className="bi bi-person-plus me-1" />Assign Role
        </button>
      </div>

      {/* Alerts */}
      {error   && <div className="alert alert-danger alert-dismissible">{error}<button className="btn-close" onClick={() => setError('')} /></div>}
      {success && <div className="alert alert-success alert-dismissible">{success}<button className="btn-close" onClick={() => setSuccess('')} /></div>}

      {/* Filters */}
      <div className="card border-0 shadow-sm mb-3 p-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small fw-medium mb-1">Search</label>
            <input className="form-control form-control-sm" placeholder="Name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-medium mb-1">Role</label>
            <select className="form-select form-select-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">All roles</option>
              {COLLEGE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-medium mb-1">Department</label>
            <select className="form-select form-select-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">All departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.code} — {d.name}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small fw-medium mb-1">Year</label>
            <select className="form-select form-select-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
              <option value="">All years</option>
              {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div className="col-md-2">
            <button className="btn btn-sm btn-outline-secondary w-100" onClick={() => { setFilterRole(''); setFilterDept(''); setFilterYear(''); setSearch(''); }}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-people fs-1 d-block mb-2" />
          No members found. Click <strong>Assign Role</strong> to add one.
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Member</th>
                  <th>College Role</th>
                  <th>Department</th>
                  <th className="text-center">Year</th>
                  <th>Roll No.</th>
                  <th>Academic Year</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m._id}>
                    <td>
                      <div className="fw-medium">{m.userId?.firstName} {m.userId?.lastName}</div>
                      <div className="text-muted small">{m.userId?.email}</div>
                    </td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[m.collegeRole] || 'text-bg-secondary'}`}>
                        {m.collegeRole}
                      </span>
                    </td>
                    <td className="small">
                      {m.departmentId
                        ? <span className="badge text-bg-primary">{(m.departmentId as any).code}</span>
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-center small">{m.yearOfStudy || '—'}</td>
                    <td className="small">{m.rollNumber || '—'}</td>
                    <td className="small">{m.academicYear || '—'}</td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        title="Edit"
                        onClick={() => {
                          setForm({
                            userId: m.userId?._id,
                            collegeRole: m.collegeRole,
                            departmentId: (m.departmentId as any)?._id || '',
                            yearOfStudy: m.yearOfStudy ? String(m.yearOfStudy) : '',
                            rollNumber: m.rollNumber || '',
                            academicYear: m.academicYear || '',
                            division: m.division || '',
                            cgpa: (m as any).cgpa != null ? String((m as any).cgpa) : '',
                            backlogs: (m as any).backlogs != null ? String((m as any).backlogs) : '',
                          });
                          setError('');
                          setShowModal(true);
                        }}
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        title="Remove"
                        onClick={() => handleDeactivate(m.userId?._id, `${m.userId?.firstName} ${m.userId?.lastName}`)}
                      >
                        <i className="bi bi-person-dash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign / Edit Modal */}
      {showModal && (
        <div className="modal d-block cm-backdrop" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Assign College Role</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-medium">User <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={form.userId}
                      onChange={e => setForm({ ...form, userId: e.target.value })}
                      required
                    >
                      <option value="">Select user...</option>
                      {/* Already assigned user shown if editing */}
                      {form.userId && !unassignedUsers.find(u => u._id === form.userId) && (() => {
                        const existing = users.find(u => u._id === form.userId);
                        return existing ? <option value={existing._id}>{existing.firstName} {existing.lastName} ({existing.email})</option> : null;
                      })()}
                      {unassignedUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName} — {u.email}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">College Role <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={form.collegeRole}
                      onChange={e => setForm({ ...form, collegeRole: e.target.value })}
                      required
                    >
                      {COLLEGE_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">Department</label>
                    <select className="form-select" value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}>
                      <option value="">None</option>
                      {departments.map(d => <option key={d._id} value={d._id}>{d.code} — {d.name}</option>)}
                    </select>
                  </div>

                  {form.collegeRole === 'STUDENT' && (
                    <div className="row g-2">
                      <div className="col-6">
                        <label className="form-label fw-medium">Year of Study</label>
                        <select className="form-select" value={form.yearOfStudy} onChange={e => setForm({ ...form, yearOfStudy: e.target.value })}>
                          <option value="">—</option>
                          {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-medium">Division</label>
                        <input className="form-control" placeholder="A / B / C" value={form.division} onChange={e => setForm({ ...form, division: e.target.value })} />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-medium">Roll Number</label>
                        <input className="form-control" placeholder="CSE2024001" value={form.rollNumber} onChange={e => setForm({ ...form, rollNumber: e.target.value })} />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-medium">Academic Year</label>
                        <input className="form-control" placeholder="2024-25" value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })} />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-medium">CGPA (0–10)</label>
                        <input type="number" step="0.01" min="0" max="10" className="form-control" placeholder="8.5" value={form.cgpa} onChange={e => setForm({ ...form, cgpa: e.target.value })} />
                      </div>
                      <div className="col-6">
                        <label className="form-label fw-medium">Active Backlogs</label>
                        <input type="number" min="0" className="form-control" placeholder="0" value={form.backlogs} onChange={e => setForm({ ...form, backlogs: e.target.value })} />
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : 'Save'}
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

export default CollegeMembersPage;

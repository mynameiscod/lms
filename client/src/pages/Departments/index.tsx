import React, { useEffect, useState } from 'react';
import { departmentApi } from '../../api';
import './DepartmentsPage.css';

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  totalStudents: number;
  activeBatches: number;
  isActive: boolean;
  headUserId?: { _id: string; firstName: string; lastName: string; email: string } | null;
}

const emptyForm = { name: '', code: '', description: '' };

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── fetch ──────────────────────────────────────────────────────────────────
  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await departmentApi.list();
      setDepartments(res.data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDepartments(); }, []);

  // ── open modal ─────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || '' });
    setError('');
    setShowModal(true);
  };

  // ── submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) {
      setError('Department name and code are required.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      if (editing) {
        await departmentApi.update(editing._id, form);
        setSuccess('Department updated.');
      } else {
        await departmentApi.create(form);
        setSuccess('Department created.');
      }
      setShowModal(false);
      fetchDepartments();
    } catch (e: any) {
      setError(e.message || 'Failed to save department');
    } finally {
      setSubmitting(false);
    }
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await departmentApi.remove(deleteTarget._id);
      setSuccess('Department deactivated.');
      setDeleteTarget(null);
      fetchDepartments();
    } catch (e: any) {
      setError(e.message || 'Failed to deactivate department');
    } finally {
      setDeleting(false);
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="dp-page container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fw-bold mb-0">Departments</h4>
          <p className="text-muted small mb-0">Manage college departments</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1" />
          Add Department
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError('')} />
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible" role="alert">
          {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')} />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : departments.length === 0 ? (
        <div className="dp-empty text-center py-5">
          <i className="bi bi-building dp-empty-icon" />
          <p className="mt-2 text-muted">No departments yet. Click <strong>Add Department</strong> to create one.</p>
        </div>
      ) : (
        <div className="card border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Head</th>
                  <th className="text-center">Students</th>
                  <th className="text-center">Batches</th>
                  <th className="text-center">Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((dept) => (
                  <tr key={dept._id}>
                    <td>
                      <span className="badge text-bg-primary fw-semibold">{dept.code}</span>
                    </td>
                    <td className="fw-medium">{dept.name}</td>
                    <td className="text-muted small">{dept.description || '—'}</td>
                    <td className="small">
                      {dept.headUserId
                        ? `${dept.headUserId.firstName} ${dept.headUserId.lastName}`
                        : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-center">{dept.totalStudents}</td>
                    <td className="text-center">{dept.activeBatches}</td>
                    <td className="text-center">
                      <span className={`badge ${dept.isActive ? 'text-bg-success' : 'text-bg-secondary'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEdit(dept)}
                        title="Edit"
                      >
                        <i className="bi bi-pencil" />
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => setDeleteTarget(dept)}
                        title="Deactivate"
                      >
                        <i className="bi bi-trash" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal d-block dp-modal-backdrop" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <form onSubmit={handleSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">
                    {editing ? 'Edit Department' : 'Add Department'}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Department Name <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. Computer Science & Engineering"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-medium">
                      Department Code <span className="text-danger">*</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder="e.g. CSE"
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                      maxLength={10}
                      required
                    />
                    <div className="form-text">Short uppercase code — must be unique within this college.</div>
                  </div>

                  <div className="mb-1">
                    <label className="form-label fw-medium">Description</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Optional description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting
                      ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</>
                      : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivate Modal */}
      {deleteTarget && (
        <div className="modal d-block dp-modal-backdrop" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-sm">
            <div className="modal-content shadow">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold text-danger">Deactivate Department?</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteTarget(null)} />
              </div>
              <div className="modal-body pt-2">
                <p className="text-muted small mb-0">
                  <strong>{deleteTarget.name}</strong> will be marked inactive. Existing data is preserved.
                </p>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button className="btn btn-sm btn-danger" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <span className="spinner-border spinner-border-sm" /> : 'Deactivate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentsPage;

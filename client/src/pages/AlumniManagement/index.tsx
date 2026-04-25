import React, { useEffect, useState } from 'react';
import { alumniApi } from '../../api';
import './AlumniManagement.css';

interface Alumni {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  graduationYear: number;
  department?: string;
  rollNumber?: string;
  currentCompany?: string;
  currentRole?: string;
  currentLocation?: string;
  ctcPackage?: number;
  linkedInUrl?: string;
  testimonial?: string;
  isAvailableForMentoring: boolean;
}

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  graduationYear: String(new Date().getFullYear()),
  department: '', rollNumber: '',
  currentCompany: '', currentRole: '', currentLocation: '',
  ctcPackage: '', linkedInUrl: '', testimonial: '',
  isAvailableForMentoring: false,
};

const AlumniManagement: React.FC = () => {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await alumniApi.list(yearFilter ? { year: Number(yearFilter) } : {});
      const json = await res.json();
      if (json.success) setAlumni(json.data);
    } catch { setError('Failed to load alumni'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [yearFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setForm({ ...emptyForm });
    setEditId(null);
    setError('');
    setShowModal(true);
  };

  const openEdit = (a: Alumni) => {
    setForm({
      firstName: a.firstName,
      lastName: a.lastName,
      email: a.email || '',
      phone: a.phone || '',
      graduationYear: String(a.graduationYear),
      department: a.department || '',
      rollNumber: a.rollNumber || '',
      currentCompany: a.currentCompany || '',
      currentRole: a.currentRole || '',
      currentLocation: a.currentLocation || '',
      ctcPackage: a.ctcPackage != null ? String(a.ctcPackage) : '',
      linkedInUrl: a.linkedInUrl || '',
      testimonial: a.testimonial || '',
      isAvailableForMentoring: a.isAvailableForMentoring,
    });
    setEditId(a._id);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, any> = {
        ...form,
        graduationYear: Number(form.graduationYear),
        ctcPackage: form.ctcPackage ? Number(form.ctcPackage) : undefined,
      };
      if (!payload.email) delete payload.email;
      if (!payload.phone) delete payload.phone;
      if (!payload.ctcPackage) delete payload.ctcPackage;

      const res = editId
        ? await alumniApi.update(editId, payload)
        : await alumniApi.create(payload);
      const json = await res.json();
      if (!json.success) { setError(json.message || 'Save failed'); return; }
      setShowModal(false);
      await load();
    } catch { setError('Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this alumni record?')) return;
    await alumniApi.remove(id);
    await load();
  };

  const filtered = alumni.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.firstName.toLowerCase().includes(q) ||
      a.lastName.toLowerCase().includes(q) ||
      (a.currentCompany || '').toLowerCase().includes(q) ||
      (a.department || '').toLowerCase().includes(q)
    );
  });

  const years = [...new Set(alumni.map(a => a.graduationYear))].sort((a, b) => b - a);

  return (
    <div className="am-container">
      <div className="am-header">
        <div>
          <h4 className="am-title">Alumni Management</h4>
          <p className="am-subtitle">{alumni.length} alumni on record</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Add Alumni</button>
      </div>

      <div className="am-filters">
        <input
          className="form-control form-control-sm am-search"
          placeholder="Search by name, company, department..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-select form-select-sm am-year-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
          <option value="">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="am-loading"><div className="spinner-border text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="am-empty">
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎓</div>
          <p>No alumni found. Add your first alumni record.</p>
        </div>
      ) : (
        <div className="am-grid">
          {filtered.map(a => (
            <div key={a._id} className="am-card">
              <div className="am-card-avatar">{a.firstName[0]}{a.lastName[0]}</div>
              <div className="am-card-body">
                <div className="am-name">{a.firstName} {a.lastName}</div>
                <div className="am-year-dept">
                  {a.graduationYear} {a.department ? `· ${a.department}` : ''}
                </div>
                {a.currentCompany && (
                  <div className="am-company">
                    🏢 {a.currentCompany}{a.currentRole ? ` — ${a.currentRole}` : ''}
                  </div>
                )}
                {a.ctcPackage != null && <div className="am-ctc">💰 {a.ctcPackage} LPA</div>}
                {a.currentLocation && <div className="am-loc">📍 {a.currentLocation}</div>}
                <div className="am-badges">
                  {a.isAvailableForMentoring && (
                    <span className="badge bg-success am-badge">Mentor</span>
                  )}
                  {a.linkedInUrl && (
                    <a href={a.linkedInUrl} target="_blank" rel="noreferrer" className="badge am-badge-li">LinkedIn ↗</a>
                  )}
                </div>
              </div>
              <div className="am-card-actions">
                <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(a)}>Edit</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(a._id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex={-1} style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Edit Alumni' : 'Add Alumni'}</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">First Name *</label>
                      <input className="form-control form-control-sm" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Last Name *</label>
                      <input className="form-control form-control-sm" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Email</label>
                      <input type="email" className="form-control form-control-sm" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Phone</label>
                      <input className="form-control form-control-sm" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Graduation Year *</label>
                      <input type="number" className="form-control form-control-sm" required min={2000} max={2050} value={form.graduationYear} onChange={e => setForm(f => ({ ...f, graduationYear: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Department</label>
                      <input className="form-control form-control-sm" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label form-label-sm">Roll Number</label>
                      <input className="form-control form-control-sm" value={form.rollNumber} onChange={e => setForm(f => ({ ...f, rollNumber: e.target.value }))} />
                    </div>
                    <div className="col-12"><hr className="my-1" /><small className="text-muted fw-semibold">Current Employment</small></div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Company</label>
                      <input className="form-control form-control-sm" value={form.currentCompany} onChange={e => setForm(f => ({ ...f, currentCompany: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Role</label>
                      <input className="form-control form-control-sm" value={form.currentRole} onChange={e => setForm(f => ({ ...f, currentRole: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">Location</label>
                      <input className="form-control form-control-sm" value={form.currentLocation} onChange={e => setForm(f => ({ ...f, currentLocation: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label form-label-sm">CTC Package (LPA)</label>
                      <input type="number" min={0} step={0.5} className="form-control form-control-sm" value={form.ctcPackage} onChange={e => setForm(f => ({ ...f, ctcPackage: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label form-label-sm">LinkedIn URL</label>
                      <input type="url" className="form-control form-control-sm" value={form.linkedInUrl} onChange={e => setForm(f => ({ ...f, linkedInUrl: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label form-label-sm">Testimonial</label>
                      <textarea className="form-control form-control-sm" rows={2} value={form.testimonial} onChange={e => setForm(f => ({ ...f, testimonial: e.target.value }))} />
                    </div>
                    <div className="col-12">
                      <div className="form-check">
                        <input className="form-check-input" type="checkbox" id="mentoring" checked={form.isAvailableForMentoring} onChange={e => setForm(f => ({ ...f, isAvailableForMentoring: e.target.checked }))} />
                        <label className="form-check-label" htmlFor="mentoring">Available for student mentoring</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving…' : editId ? 'Update' : 'Add'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlumniManagement;

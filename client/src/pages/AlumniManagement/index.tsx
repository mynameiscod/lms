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
      const json: any = await alumniApi.list(yearFilter ? { year: Number(yearFilter) } : {});
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

      const json: any = editId
        ? await alumniApi.update(editId, payload)
        : await alumniApi.create(payload);
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

      <AdminReferrals />

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

// ── Admin referral management (post referrals from alumni; track interest) ──────
const AdminReferrals: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ alumniName: '', company: '', role: '', location: '', workMode: '', ctc: '', description: '', applyUrl: '', skills: '', deadline: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => { try { const r = await (alumniApi as any).listReferrals(); if (r.success) setRows(r.data || []); } catch { /* ignore */ } };
  useEffect(() => { load(); }, []);

  const post = async () => {
    if (!form.company || !form.role) return;
    setSaving(true);
    try {
      await (alumniApi as any).createReferral({ ...form, skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [], deadline: form.deadline || undefined });
      setForm({ alumniName: '', company: '', role: '', location: '', workMode: '', ctc: '', description: '', applyUrl: '', skills: '', deadline: '' });
      setOpen(false); load();
    } catch { /* ignore */ } finally { setSaving(false); }
  };
  const close = async (id: string, status: string) => { await (alumniApi as any).updateReferral(id, { status }); load(); };
  const del = async (id: string) => { if (!window.confirm('Delete this referral?')) return; await (alumniApi as any).deleteReferral(id); load(); };

  const inp: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 8, padding: '8px 10px', fontSize: 13, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ background: '#fff', border: '1px solid #e6e8f0', borderRadius: 14, padding: 16, margin: '14px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>💼 Alumni Referrals <span style={{ color: '#94a3b8', fontWeight: 500, fontSize: 12 }}>({rows.length})</span></div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(o => !o)}>{open ? 'Cancel' : '+ Post referral'}</button>
      </div>

      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 8, marginBottom: 12 }}>
          <input style={inp} placeholder="Company *" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
          <input style={inp} placeholder="Role *" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} />
          <input style={inp} placeholder="Referred by (alumni name)" value={form.alumniName} onChange={e => setForm({ ...form, alumniName: e.target.value })} />
          <input style={inp} placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          <select style={inp} value={form.workMode} onChange={e => setForm({ ...form, workMode: e.target.value })}><option value="">Work mode</option><option value="onsite">Onsite</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option></select>
          <input style={inp} placeholder="CTC (e.g. 8-12 LPA)" value={form.ctc} onChange={e => setForm({ ...form, ctc: e.target.value })} />
          <input style={inp} placeholder="Skills (comma-separated)" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
          <input style={inp} type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
          <input style={{ ...inp, gridColumn: '1 / -1' }} placeholder="Apply URL" value={form.applyUrl} onChange={e => setForm({ ...form, applyUrl: e.target.value })} />
          <textarea style={{ ...inp, gridColumn: '1 / -1', minHeight: 50, fontFamily: 'inherit' }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className="btn btn-primary btn-sm" style={{ gridColumn: '1 / -1', justifySelf: 'start' }} disabled={saving} onClick={post}>{saving ? 'Posting…' : 'Post referral'}</button>
        </div>
      )}

      {rows.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>No referrals yet.</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((r: any) => (
            <div key={r._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: '#f8fafc', border: '1px solid #eef1f6', borderRadius: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>{r.role} · {r.company} {r.status !== 'open' && <span style={{ fontSize: 11, color: '#94a3b8' }}>({r.status})</span>}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{r.interested?.length || 0} interested{r.alumniName ? ` · by ${r.alumniName}` : ''}</div>
              </div>
              {r.interested?.length > 0 && <span title={r.interested.map((i: any) => i.studentName).join(', ')} style={{ fontSize: 11.5, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 12, padding: '2px 9px', cursor: 'help' }}>🙋 {r.interested.length}</span>}
              {r.status === 'open' && <button onClick={() => close(r._id, 'closed')} style={{ border: '1px solid #e2e8f0', background: '#fff', borderRadius: 7, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#64748b' }}>Close</button>}
              <button onClick={() => del(r._id)} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12.5 }}>Delete</button>
            </div>
          ))}
        </div>}
    </div>
  );
};

export default AlumniManagement;

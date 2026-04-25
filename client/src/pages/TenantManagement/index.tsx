import React, { useEffect, useState, useCallback } from 'react';
import { tenantApi } from '../../api';
import './TenantManagement.css';

interface TenantModules {
  courses: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  classRecordings: boolean;
  codeAssessments: boolean;
  mockInterviews: boolean;
  placement: boolean;
  leads: boolean;
  marketing: boolean;
}

interface TenantRow {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  type: string;
  subscriptionPlan: string;
  modules: TenantModules;
  createdAt: string;
}

const MODULE_DEFS: { key: keyof TenantModules; label: string; icon: string; desc: string }[] = [
  { key: 'courses',         label: 'Courses & Learning',   icon: 'fa-solid fa-book-open',         desc: 'Course mgmt, My Course, Topic Hub' },
  { key: 'attendance',      label: 'Attendance',           icon: 'fa-solid fa-calendar-check',    desc: 'Mark, view & report attendance' },
  { key: 'quizzes',         label: 'Quizzes',              icon: 'fa-solid fa-circle-question',   desc: 'Quiz management & taking' },
  { key: 'assignments',     label: 'Assignments',          icon: 'fa-solid fa-file-pen',          desc: 'Assignments & grading' },
  { key: 'classRecordings', label: 'Class Recordings',     icon: 'fa-solid fa-video',             desc: 'Live classes & recordings' },
  { key: 'codeAssessments', label: 'Code Assessments',     icon: 'fa-solid fa-code',              desc: 'Coding snippets & submissions' },
  { key: 'mockInterviews',  label: 'Mock Interviews',      icon: 'fa-solid fa-comments',          desc: 'AI mock interview practice' },
  { key: 'placement',       label: 'CRT / Placement',      icon: 'fa-solid fa-briefcase',         desc: 'Placement drives, alumni, applications' },
  { key: 'leads',           label: 'Leads / CRM',          icon: 'fa-solid fa-user-tag',          desc: 'Lead management & telecaller' },
  { key: 'marketing',       label: 'Marketing',            icon: 'fa-solid fa-bullhorn',          desc: 'Campaigns, analytics, insights' },
];

const STUDENT_FEATURES = [
  { key: 'dashboard',      label: 'Dashboard',        icon: 'fa-solid fa-gauge-high' },
  { key: 'myCourse',       label: 'My Courses',       icon: 'fa-solid fa-book-open' },
  { key: 'classHub',       label: 'Class Hub',        icon: 'fa-solid fa-video' },
  { key: 'attendance',     label: 'Attendance',       icon: 'fa-solid fa-calendar-check' },
  { key: 'quizzes',        label: 'Quizzes',          icon: 'fa-solid fa-circle-question' },
  { key: 'assignments',    label: 'Assignments',      icon: 'fa-solid fa-file-pen' },
  { key: 'mockInterviews', label: 'Mock Interviews',  icon: 'fa-solid fa-comments' },
];

const DEFAULT_MODULES: TenantModules = {
  courses: true, attendance: true, quizzes: true, assignments: true,
  classRecordings: true, codeAssessments: true, mockInterviews: true,
  placement: true, leads: true, marketing: true,
};

const DEFAULT_STUDENT_FEATURES: Record<string, boolean> = {
  dashboard: true, myCourse: true, classHub: true,
  attendance: true, quizzes: true, assignments: true, mockInterviews: true,
};

// â”€â”€ Create Tenant Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface CreateModalProps {
  onClose: () => void;
  onCreated: (tenant: TenantRow, loginLink: string, registerLink: string) => void;
}

const CreateTenantModal: React.FC<CreateModalProps> = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    organizationName: '', firstName: '', lastName: '', email: '', password: ''
  });
  const [features, setFeatures] = useState<Record<string, boolean>>(DEFAULT_STUDENT_FEATURES);
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const change = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const { organizationName, firstName, lastName, email, password } = form;
    if (!organizationName || !firstName || !lastName || !email || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSaving(true);
    try {
      const res = await tenantApi.registerOrganization({
        organizationName, firstName, lastName, email, password, studentFeatures: features
      });
      const tenantId = res.data?.user?.tenantId;
      let loginLink = '';
      let registerLink = '';
      if (tenantId) {
        try {
          const linkRes = await tenantApi.generateInviteLink(tenantId);
          loginLink = linkRes.data?.loginLink || '';
          registerLink = linkRes.data?.registerLink || '';
        } catch { /* ignore */ }
      }
      // Build a minimal TenantRow so parent list refreshes
      const newTenant: TenantRow = {
        _id: tenantId || '',
        name: organizationName,
        slug: organizationName.toLowerCase().replace(/\s+/g, '-'),
        isActive: true,
        type: 'institute',
        subscriptionPlan: 'free',
        modules: DEFAULT_MODULES,
        createdAt: new Date().toISOString(),
      };
      onCreated(newTenant, loginLink, registerLink);
    } catch (err: any) {
      setError(err.message || 'Failed to create organization');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tm-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tm-modal">
        <div className="tm-modal-header">
          <h4><i className="fa-solid fa-building me-2" />Add New College / Organization</h4>
          <button className="tm-close" onClick={onClose}><i className="fa-solid fa-xmark" /></button>
        </div>

        <form onSubmit={submit} className="tm-modal-body">
          {error && <div className="tm-modal-error">{error}</div>}

          <div className="tm-form-row">
            <div className="tm-form-group">
              <label>Organization Name *</label>
              <input name="organizationName" value={form.organizationName} onChange={change} placeholder="ABC Engineering College" disabled={saving} />
            </div>
          </div>

          <div className="tm-form-row two-col">
            <div className="tm-form-group">
              <label>Admin First Name *</label>
              <input name="firstName" value={form.firstName} onChange={change} placeholder="John" disabled={saving} />
            </div>
            <div className="tm-form-group">
              <label>Admin Last Name *</label>
              <input name="lastName" value={form.lastName} onChange={change} placeholder="Doe" disabled={saving} />
            </div>
          </div>

          <div className="tm-form-row">
            <div className="tm-form-group">
              <label>Admin Email *</label>
              <input type="email" name="email" value={form.email} onChange={change} placeholder="admin@college.edu" disabled={saving} />
            </div>
          </div>

          <div className="tm-form-row">
            <div className="tm-form-group">
              <label>Admin Password * <span className="tm-hint">(min. 8 chars â€” share with admin)</span></label>
              <div className="tm-pw-wrap">
                <input type={showPw ? 'text' : 'password'} name="password" value={form.password} onChange={change} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" disabled={saving} />
                <button type="button" className="tm-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? 'ðŸ™ˆ' : 'ðŸ‘ï¸'}
                </button>
              </div>
            </div>
          </div>

          <div className="tm-form-group">
            <label>Student Features</label>
            <div className="tm-sf-grid">
              {STUDENT_FEATURES.map(f => (
                <label key={f.key} className={`tm-sf-chip${features[f.key] ? ' on' : ''}`}>
                  <input
                    type="checkbox"
                    checked={!!features[f.key]}
                    onChange={() => setFeatures(p => ({ ...p, [f.key]: !p[f.key] }))}
                    style={{ display: 'none' }}
                  />
                  <i className={f.icon} style={{ marginRight: 6 }} />{f.label}
                </label>
              ))}
            </div>
          </div>

          <div className="tm-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="fa-solid fa-plus me-2" />}
              {saving ? 'Creatingâ€¦' : 'Create Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// â”€â”€ Success / Invite Links Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface LinksModalProps {
  tenantName: string;
  loginLink: string;
  registerLink: string;
  onClose: () => void;
}

const InviteLinksModal: React.FC<LinksModalProps> = ({ tenantName, loginLink, registerLink, onClose }) => {
  const [copied, setCopied] = useState('');

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  return (
    <div className="tm-modal-overlay">
      <div className="tm-modal tm-modal-success">
        <div className="tm-success-icon">ðŸŽ‰</div>
        <h4 className="tm-success-title">"{tenantName}" created!</h4>
        <p className="tm-success-sub">Share these links with the college. The admin can log in immediately.</p>

        <div className="tm-link-box">
          <div className="tm-link-label"><i className="fa-solid fa-right-to-bracket me-1" />Admin / Staff Login Link</div>
          <div className="tm-link-row">
            <span className="tm-link-url">{loginLink || 'â€”'}</span>
            <button className="tm-copy-btn" onClick={() => copy(loginLink, 'login')}>
              {copied === 'login' ? 'âœ“ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="tm-link-box">
          <div className="tm-link-label"><i className="fa-solid fa-user-plus me-1" />New Student Registration Link</div>
          <div className="tm-link-row">
            <span className="tm-link-url">{registerLink || 'â€”'}</span>
            <button className="tm-copy-btn" onClick={() => copy(registerLink, 'register')}>
              {copied === 'register' ? 'âœ“ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <p className="tm-link-note">
          <i className="fa-solid fa-circle-info me-1" />
          The admin password you set is their temporary credential. Ask them to change it after first login.
        </p>

        <button className="btn btn-primary w-100 mt-3" onClick={onClose}>Done</button>
      </div>
    </div>
  );
};

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const TenantManagementPage: React.FC = () => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const [editModules, setEditModules] = useState<TenantModules>(DEFAULT_MODULES);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [successLinks, setSuccessLinks] = useState<{ name: string; login: string; register: string } | null>(null);
  const [copiedId, setCopiedId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tenantApi.listTenants();
      if (res.success) setTenants(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPanel = (t: TenantRow) => {
    setSelected(t);
    setEditModules({ ...DEFAULT_MODULES, ...(t.modules || {}) });
  };

  const toggle = (key: keyof TenantModules) => {
    setEditModules(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await tenantApi.updateTenantModules(selected._id, editModules);
      if (res.success) {
        setTenants(prev => prev.map(t => t._id === selected._id ? { ...t, modules: res.data } : t));
        setSelected(prev => prev ? { ...prev, modules: res.data } : null);
        setToast('Modules saved!');
        setTimeout(() => setToast(''), 3000);
      }
    } catch {
      setToast('Save failed');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const copyLink = async (tenantId: string) => {
    try {
      const res = await tenantApi.generateInviteLink(tenantId);
      const link = res.data?.loginLink || '';
      await navigator.clipboard.writeText(link);
      setCopiedId(tenantId);
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      setToast('Failed to copy link');
      setTimeout(() => setToast(''), 2000);
    }
  };

  const handleCreated = (tenant: TenantRow, loginLink: string, registerLink: string) => {
    setTenants(prev => [tenant, ...prev]);
    setShowCreate(false);
    setSuccessLinks({ name: tenant.name, login: loginLink, register: registerLink });
  };

  const enabledCount = (m?: TenantModules) =>
    Object.values(m || DEFAULT_MODULES).filter(Boolean).length;

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="tm-page">
      <div className="tm-header">
        <div>
          <h2 className="tm-title">
            <i className="fa-solid fa-building me-2" />Tenant Management
          </h2>
          <p className="tm-sub">Onboard colleges, control which modules are enabled per tenant.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="tm-search-wrap">
            <i className="fa-solid fa-magnifying-glass" />
            <input
              className="tm-search"
              placeholder="Search tenantsâ€¦"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm tm-add-btn" onClick={() => setShowCreate(true)}>
            <i className="fa-solid fa-plus me-1" />Add Tenant
          </button>
        </div>
      </div>

      {toast && <div className="tm-toast">{toast}</div>}

      <div className="tm-layout">
        {/* Left: tenant list */}
        <div className="tm-list">
          {loading ? (
            <div className="tm-loading"><div className="spinner-border spinner-border-sm" /></div>
          ) : filtered.length === 0 ? (
            <div className="tm-empty-state">
              <i className="fa-solid fa-building-circle-exclamation" />
              <p>No tenants yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <i className="fa-solid fa-plus me-1" />Add First Tenant
              </button>
            </div>
          ) : filtered.map(t => (
            <div
              key={t._id}
              className={`tm-card${selected?._id === t._id ? ' active' : ''}`}
              onClick={() => openPanel(t)}
            >
              <div className="tm-card-top">
                <div className="tm-avatar">{t.name[0].toUpperCase()}</div>
                <div className="tm-card-info">
                  <div className="tm-card-name">{t.name}</div>
                  <div className="tm-card-meta">{t.slug} Â· {t.subscriptionPlan}</div>
                </div>
                <span className={`tm-badge ${t.isActive ? 'active' : 'inactive'}`}>
                  {t.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="tm-modules-chips">
                {MODULE_DEFS.map(m => {
                  const on = (t.modules || DEFAULT_MODULES)[m.key];
                  return (
                    <span key={m.key} className={`tm-chip ${on ? 'on' : 'off'}`} title={m.label}>
                      <i className={m.icon} />
                    </span>
                  );
                })}
                <span className="tm-chip-count">{enabledCount(t.modules)}/10</span>
              </div>
              <div className="tm-card-actions" onClick={e => e.stopPropagation()}>
                <button
                  className="tm-link-btn"
                  title="Copy login link"
                  onClick={() => copyLink(t._id)}
                >
                  {copiedId === t._id
                    ? <><i className="fa-solid fa-check me-1" />Copied!</>
                    : <><i className="fa-solid fa-link me-1" />Copy Login Link</>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: edit panel */}
        {selected ? (
          <div className="tm-panel">
            <div className="tm-panel-head">
              <div>
                <h4 className="tm-panel-title">{selected.name}</h4>
                <span className="tm-panel-slug">{selected.slug}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-outline-secondary btn-sm"
                  style={{ fontSize: '0.75rem' }}
                  onClick={() => copyLink(selected._id)}
                  title="Get invite links"
                >
                  <i className="fa-solid fa-share-nodes me-1" />Invite Links
                </button>
                <button className="tm-close" onClick={() => setSelected(null)}>
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>
            <p className="tm-panel-hint">
              Toggle modules on/off. <strong>Disabled modules are completely hidden</strong> from all
              users in this tenant â€” admins, instructors, and students alike.
            </p>
            <div className="tm-module-grid">
              {MODULE_DEFS.map(m => {
                const on = editModules[m.key];
                return (
                  <div
                    key={m.key}
                    className={`tm-module-card${on ? ' on' : ' off'}`}
                    onClick={() => toggle(m.key)}
                  >
                    <div className="tm-module-top">
                      <span className="tm-module-icon"><i className={m.icon} /></span>
                      <div className={`tm-switch${on ? ' on' : ''}`}>
                        <div className="tm-switch-thumb" />
                      </div>
                    </div>
                    <div className="tm-module-label">{m.label}</div>
                    <div className="tm-module-desc">{m.desc}</div>
                  </div>
                );
              })}
            </div>
            <div className="tm-panel-footer">
              <span className="tm-enabled-count">
                <i className="fa-solid fa-circle-check" style={{ color: 'var(--bs-success)' }} />
                {' '}{Object.values(editModules).filter(Boolean).length} of 10 modules enabled
              </span>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="tm-panel tm-panel-empty">
            <i className="fa-solid fa-arrow-left tm-panel-empty-icon" />
            <p>Select a tenant from the list to configure its modules.</p>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {successLinks && (
        <InviteLinksModal
          tenantName={successLinks.name}
          loginLink={successLinks.login}
          registerLink={successLinks.register}
          onClose={() => setSuccessLinks(null)}
        />
      )}
    </div>
  );
};

export default TenantManagementPage;

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

const DEFAULT_MODULES: TenantModules = {
  courses: true, attendance: true, quizzes: true, assignments: true,
  classRecordings: true, codeAssessments: true, mockInterviews: true,
  placement: true, leads: true, marketing: true,
};

const TenantManagementPage: React.FC = () => {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantRow | null>(null);
  const [editModules, setEditModules] = useState<TenantModules>(DEFAULT_MODULES);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');

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
      const res = await tenantApi.updateTenantModules(selected._id, editModules as Record<string, boolean>);
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
          <p className="tm-sub">Control which modules are enabled per college / institute.</p>
        </div>
        <div className="tm-search-wrap">
          <i className="fa-solid fa-magnifying-glass" />
          <input
            className="tm-search"
            placeholder="Search tenants…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {toast && <div className="tm-toast">{toast}</div>}

      <div className="tm-layout">
        {/* Left: tenant list */}
        <div className="tm-list">
          {loading ? (
            <div className="tm-loading"><div className="spinner-border spinner-border-sm" /></div>
          ) : filtered.length === 0 ? (
            <p className="tm-empty">No tenants found.</p>
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
                  <div className="tm-card-meta">{t.slug} · {t.subscriptionPlan}</div>
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
              <button className="tm-close" onClick={() => setSelected(null)}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>
            <p className="tm-panel-hint">
              Toggle modules on/off. <strong>Disabled modules are completely hidden</strong> from all
              users in this tenant — admins, instructors, and students alike.
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
    </div>
  );
};

export default TenantManagementPage;

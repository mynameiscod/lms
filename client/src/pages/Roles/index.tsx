import React, { useEffect, useMemo, useState } from 'react';
import { roleApi } from '../../api';
import { Spinner, Alert } from '../../components/common';
import { Role } from '../../types';
import './RolesPage.css';

interface PermissionItem { key: string; label: string; }
interface PermissionGroup { label: string; permissions: PermissionItem[]; }
type ViewMode = 'list' | 'form';

// Per-module icon + description for the Feature Permissions list
const MODULE_META: Record<string, { icon: string; tint: string; desc: string }> = {
  users:          { icon: '👥', tint: 'blue',   desc: 'Manage users, roles, instructors and students' },
  courses:        { icon: '📘', tint: 'cyan',   desc: 'Manage courses, lessons, chapters and content' },
  batches:        { icon: '🏫', tint: 'indigo', desc: 'Manage batches and batch students' },
  attendance:     { icon: '🗓️', tint: 'green',  desc: 'Mark and view attendance' },
  quizzes:        { icon: '❓', tint: 'amber',  desc: 'Create, edit and take quizzes' },
  questions:      { icon: '🧩', tint: 'purple', desc: 'Manage the question bank' },
  assignments:    { icon: '📝', tint: 'orange', desc: 'Create, submit and grade assignments' },
  interviews:     { icon: '🎤', tint: 'rose',   desc: 'Mock interviews and templates' },
  reports:        { icon: '📊', tint: 'teal',   desc: 'Reports and analytics dashboards' },
  admin:          { icon: '⚙️', tint: 'red',    desc: 'System settings and tenant management' },
  leads:          { icon: '🎯', tint: 'pink',   desc: 'Lead creation, tracking and analytics' },
  marketing:      { icon: '📣', tint: 'green',  desc: 'Marketing dashboards and insights' },
  codingSnippets: { icon: '💻', tint: 'indigo', desc: 'Coding snippet assessments' },
};
const CARD_TINTS = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'teal', 'indigo', 'red', 'amber'];
const PAGE_SIZE = 6;

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Record<string, PermissionGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDesc, setRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [searchRoles, setSearchRoles] = useState('');
  const [page, setPage] = useState(1);
  const [permSearch, setPermSearch] = useState('');

  useEffect(() => { fetchRoles(); fetchPermissions(); }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleApi.getRoles();
      setRoles(response.data || []);
    } catch (err: any) { setError(err.message || 'Failed to fetch roles'); }
    finally { setLoading(false); }
  };
  const fetchPermissions = async () => {
    try { const response = await roleApi.getAvailablePermissions(); setPermissionGroups(response.data || {}); }
    catch (err: any) { console.error('Failed to fetch permissions:', err); }
  };

  const allPermKeys = useMemo(() => Object.values(permissionGroups).flatMap(g => g.permissions.map(p => p.key)), [permissionGroups]);

  const openCreateForm = () => {
    setEditingRole(null); setRoleName(''); setRoleDesc(''); setSelectedPermissions([]);
    setExpandedGroups(new Set(Object.keys(permissionGroups))); setPermSearch(''); setError(''); setViewMode('form');
  };
  const openEditForm = (role: Role) => {
    setEditingRole(role); setRoleName(role.name); setRoleDesc(role.description || ''); setSelectedPermissions([...role.permissions]);
    setExpandedGroups(new Set(Object.keys(permissionGroups))); setPermSearch(''); setError(''); setViewMode('form');
  };
  const goBack = () => { setViewMode('list'); setEditingRole(null); setRoleName(''); setRoleDesc(''); setSelectedPermissions([]); setExpandedGroups(new Set()); };

  const togglePermission = (k: string) => setSelectedPermissions(prev => prev.includes(k) ? prev.filter(p => p !== k) : [...prev, k]);
  const toggleGroupExpand = (g: string) => setExpandedGroups(prev => { const n = new Set(prev); n.has(g) ? n.delete(g) : n.add(g); return n; });
  const toggleGroupSelect = (groupKey: string) => {
    const group = permissionGroups[groupKey]; if (!group) return;
    const keys = group.permissions.map(p => p.key);
    const allSel = keys.every(k => selectedPermissions.includes(k));
    setSelectedPermissions(prev => allSel ? prev.filter(p => !keys.includes(p)) : [...new Set([...prev, ...keys])]);
  };
  const selectAll = () => setSelectedPermissions(selectedPermissions.length === allPermKeys.length ? [] : allPermKeys);
  const collapseAll = () => setExpandedGroups(expandedGroups.size === 0 ? new Set(Object.keys(permissionGroups)) : new Set());

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!roleName.trim()) { setError('Role name is required'); return; }
    try {
      setSubmitting(true); setError('');
      if (editingRole) {
        await roleApi.updateRole(editingRole._id, { name: roleName, description: roleDesc, permissions: selectedPermissions });
        setSuccess('Role updated successfully');
      } else {
        await roleApi.createRole(roleName, selectedPermissions, roleDesc);
        setSuccess('Role created successfully');
      }
      goBack(); fetchRoles();
    } catch (err: any) { setError(err.message || 'Operation failed'); }
    finally { setSubmitting(false); }
  };
  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Delete the role "${role.name}"?`)) return;
    try { setError(''); await roleApi.deleteRole(role._id); setSuccess('Role deleted'); fetchRoles(); }
    catch (err: any) { setError(err.message || 'Failed to delete role'); }
  };

  const permLabel = (key: string): string => {
    for (const g of Object.values(permissionGroups)) { const f = g.permissions.find(p => p.key === key); if (f) return f.label; }
    return key.replace(/_/g, ' ');
  };

  if (loading) return <Spinner fullScreen />;

  // ───────────────────────── FORM VIEW ─────────────────────────
  if (viewMode === 'form') {
    const term = permSearch.trim().toLowerCase();
    const groups = Object.entries(permissionGroups).map(([key, g]) => {
      const perms = term ? g.permissions.filter(p => p.label.toLowerCase().includes(term) || g.label.toLowerCase().includes(term)) : g.permissions;
      return { key, group: g, perms };
    }).filter(x => x.perms.length > 0);

    return (
      <div className="roles-page">
        <div className="rl-form-top">
          <div className="rl-form-top-left">
            <button type="button" className="rl-back" onClick={goBack} aria-label="Back">←</button>
            <div>
              <h1 className="rl-title">{editingRole ? 'Edit Role' : 'Create New Role'}</h1>
              <p className="rl-sub">Define role name and assign permissions</p>
            </div>
          </div>
          <button type="button" className="rl-btn primary" onClick={() => handleSubmit()} disabled={submitting}>
            {submitting ? 'Saving…' : '💾 Save Role'}
          </button>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <div className="rl-form-grid">
          {/* Left: name, description, summary */}
          <div className="rl-form-left">
            <label className="rl-field">
              <span className="rl-label">Role Name <b className="req">*</b></span>
              <input className="rl-input" placeholder="e.g. Content Manager, Lab Assistant" value={roleName} onChange={e => setRoleName(e.target.value)} autoFocus />
            </label>
            <label className="rl-field">
              <span className="rl-label">Role Description</span>
              <textarea className="rl-textarea" rows={5} placeholder="Enter role description…" value={roleDesc} onChange={e => setRoleDesc(e.target.value)} />
            </label>
            <div className="rl-summary">
              <span className="rl-summary-ic">🧾</span>
              <div>
                <div className="rl-summary-title">Permissions Summary</div>
                <div className="rl-summary-text">{selectedPermissions.length} of {allPermKeys.length} permissions selected</div>
              </div>
            </div>
          </div>

          {/* Right: feature permissions */}
          <div className="rl-form-right">
            <div className="rl-perm-head">
              <div>
                <h3>Feature Permissions</h3>
                <p>Select the modules and permissions this role should have access to</p>
              </div>
              <div className="rl-perm-actions">
                <div className="rl-search sm">
                  <span>🔍</span>
                  <input placeholder="Search permissions…" value={permSearch} onChange={e => setPermSearch(e.target.value)} />
                </div>
                <button type="button" className="rl-btn ghost" onClick={collapseAll}>{expandedGroups.size === 0 ? 'Expand All' : 'Collapse All'}</button>
                <button type="button" className="rl-btn primary" onClick={selectAll}>{selectedPermissions.length === allPermKeys.length ? 'Deselect All' : 'Select All'}</button>
              </div>
            </div>

            <div className="rl-modules">
              {groups.map(({ key, group, perms }) => {
                const meta = MODULE_META[key] || { icon: '🔧', tint: 'blue', desc: '' };
                const total = group.permissions.length;
                const sel = group.permissions.filter(p => selectedPermissions.includes(p.key)).length;
                const expanded = expandedGroups.has(key) || !!term;
                const allSel = sel === total && total > 0;
                return (
                  <div key={key} className={`rl-module ${expanded ? 'open' : ''}`}>
                    <div className="rl-module-row" onClick={() => toggleGroupExpand(key)}>
                      <span className={`rl-module-ic ${meta.tint}`}>{meta.icon}</span>
                      <div className="rl-module-info">
                        <div className="rl-module-name">{group.label}</div>
                        <div className="rl-module-desc">{meta.desc}</div>
                      </div>
                      <span className={`rl-module-count ${sel > 0 ? 'has' : ''}`}>{sel} / {total} selected</span>
                      <input
                        type="checkbox"
                        className="rl-module-check"
                        checked={allSel}
                        ref={el => { if (el) el.indeterminate = sel > 0 && !allSel; }}
                        onClick={e => e.stopPropagation()}
                        onChange={() => toggleGroupSelect(key)}
                      />
                    </div>
                    {expanded && (
                      <div className="rl-perm-list">
                        {perms.map(p => (
                          <label key={p.key} className={`rl-perm ${selectedPermissions.includes(p.key) ? 'checked' : ''}`}>
                            <input type="checkbox" checked={selectedPermissions.includes(p.key)} onChange={() => togglePermission(p.key)} />
                            <span>{p.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {groups.length === 0 && <div className="rl-empty">No permissions match "{permSearch}"</div>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── LIST VIEW ─────────────────────────
  const filtered = roles.filter(r => {
    const q = searchRoles.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || (r.description || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const pageRoles = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  return (
    <div className="roles-page">
      <div className="rl-head">
        <div>
          <h1 className="rl-title">Roles Management</h1>
          <p className="rl-sub">Create and manage roles with feature-level permissions</p>
        </div>
        <div className="rl-head-actions">
          <div className="rl-search">
            <span>🔍</span>
            <input placeholder="Search roles…" value={searchRoles} onChange={e => { setSearchRoles(e.target.value); setPage(1); }} />
          </div>
          <button className="rl-btn primary" onClick={openCreateForm}>+ Create Role</button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {filtered.length === 0 ? (
        <div className="rl-empty-card">No roles found. Create your first role to get started.</div>
      ) : (
        <>
          <div className="rl-grid">
            {pageRoles.map((role, i) => {
              const tint = CARD_TINTS[(((cur - 1) * PAGE_SIZE) + i) % CARD_TINTS.length];
              return (
                <div key={role._id} className="rl-card">
                  <div className="rl-card-top">
                    <span className={`rl-card-ic ${tint}`}>🛡️</span>
                    <div className="rl-card-title">
                      <div className="rl-card-name">{role.name} <span className="rl-card-badge">{role.permissions.length} Permissions</span></div>
                    </div>
                    <div className="rl-card-actions">
                      <button className="rl-icon-btn edit" onClick={() => openEditForm(role)} title="Edit">✏️</button>
                      <button className="rl-icon-btn del" onClick={() => handleDelete(role)} title="Delete">🗑️</button>
                    </div>
                  </div>
                  <p className="rl-card-desc">{role.description || 'No description provided.'}</p>
                  <div className="rl-chips">
                    {role.permissions.slice(0, 4).map(p => <span key={p} className="rl-chip">{permLabel(p)}</span>)}
                    {role.permissions.length > 4 && <span className="rl-chip more">+{role.permissions.length - 4} more</span>}
                  </div>
                  <div className="rl-card-meta">📅 Created: {new Date(role.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="rl-pagination">
              <button className="rl-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={cur <= 1}>‹</button>
              {Array.from({ length: totalPages }, (_, n) => (
                <button key={n} className={`rl-page-btn ${cur === n + 1 ? 'active' : ''}`} onClick={() => setPage(n + 1)}>{n + 1}</button>
              ))}
              <button className="rl-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={cur >= totalPages}>›</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RolesPage;

import React, { useEffect, useState } from 'react';
import { roleApi } from '../../api';
import { Spinner, Alert, Button } from '../../components/common';
import { Role } from '../../types';
import './RolesPage.css';

interface PermissionItem {
  key: string;
  label: string;
}

interface PermissionGroup {
  label: string;
  permissions: PermissionItem[];
}

type ViewMode = 'list' | 'form';

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Record<string, PermissionGroup>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // View & form state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleApi.getRoles();
      setRoles(response.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await roleApi.getAvailablePermissions();
      setPermissionGroups(response.data || {});
    } catch (err: any) {
      console.error('Failed to fetch permissions:', err);
    }
  };

  const openCreateForm = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setExpandedGroups(new Set(Object.keys(permissionGroups)));
    setError('');
    setViewMode('form');
  };

  const openEditForm = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions([...role.permissions]);
    const expanded = new Set<string>();
    Object.entries(permissionGroups).forEach(([groupKey, group]) => {
      if (group.permissions.some(p => role.permissions.includes(p.key))) {
        expanded.add(groupKey);
      }
    });
    if (expanded.size === 0) expanded.add(Object.keys(permissionGroups)[0] || '');
    setExpandedGroups(expanded);
    setError('');
    setViewMode('form');
  };

  const goBack = () => {
    setViewMode('list');
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setExpandedGroups(new Set());
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleGroupToggle = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const handleSelectAllGroup = (groupKey: string) => {
    const group = permissionGroups[groupKey];
    if (!group) return;
    const groupPermKeys = group.permissions.map(p => p.key);
    const allSelected = groupPermKeys.every(k => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !groupPermKeys.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...groupPermKeys])]);
    }
  };

  const handleSelectAll = () => {
    const allKeys = Object.values(permissionGroups).flatMap(g => g.permissions.map(p => p.key));
    if (selectedPermissions.length === allKeys.length) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allKeys);
    }
  };

  const handleExpandAll = () => {
    const allKeys = Object.keys(permissionGroups);
    if (expandedGroups.size === allKeys.length) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(allKeys));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingRole) {
        await roleApi.updateRole(editingRole._id, {
          name: roleName,
          permissions: selectedPermissions
        });
        setSuccess('Role updated successfully');
      } else {
        await roleApi.createRole(roleName, selectedPermissions);
        setSuccess('Role created successfully');
      }

      goBack();
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (!window.confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      setError('');
      await roleApi.deleteRole(role._id);
      setSuccess('Role deleted successfully');
      fetchRoles();
    } catch (err: any) {
      setError(err.message || 'Failed to delete role');
    }
  };

  const getGroupPermissionCount = (groupKey: string): { selected: number; total: number } => {
    const group = permissionGroups[groupKey];
    if (!group) return { selected: 0, total: 0 };
    const total = group.permissions.length;
    const selected = group.permissions.filter(p => selectedPermissions.includes(p.key)).length;
    return { selected, total };
  };

  const getPermissionGroupLabel = (permKey: string): string => {
    for (const group of Object.values(permissionGroups)) {
      const found = group.permissions.find(p => p.key === permKey);
      if (found) return found.label;
    }
    return permKey.replace(/_/g, ' ');
  };

  const allPermKeys = Object.values(permissionGroups).flatMap(g => g.permissions.map(p => p.key));

  if (loading) return <Spinner fullScreen />;

  // ─── FORM VIEW ───
  if (viewMode === 'form') {
    return (
      <div className="roles-page">
        <div className="form-top-bar">
          <button type="button" className="back-btn" onClick={goBack}>
            ← Back to Roles
          </button>
          <h2 className="form-title">{editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Role'}</h2>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        <form onSubmit={handleSubmit} className="role-form-inline">
          {/* Role name input */}
          <div className="form-name-row">
            <label htmlFor="roleName" className="form-label">Role Name</label>
            <input
              id="roleName"
              type="text"
              className="role-name-input"
              placeholder="e.g. Content Manager, Lab Assistant"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Permissions toolbar */}
          <div className="permissions-toolbar">
            <div className="toolbar-left">
              <span className="toolbar-title">Feature Permissions</span>
              <span className="selected-count">
                {selectedPermissions.length} / {allPermKeys.length} selected
              </span>
            </div>
            <div className="toolbar-right">
              <button type="button" className="toolbar-btn" onClick={handleExpandAll}>
                {expandedGroups.size === Object.keys(permissionGroups).length ? 'Collapse All' : 'Expand All'}
              </button>
              <button type="button" className="toolbar-btn primary" onClick={handleSelectAll}>
                {selectedPermissions.length === allPermKeys.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {/* Permission groups */}
          <div className="permission-groups-inline">
            {Object.entries(permissionGroups).map(([groupKey, group]) => {
              const { selected, total } = getGroupPermissionCount(groupKey);
              const isExpanded = expandedGroups.has(groupKey);
              const allGroupSelected = selected === total;

              return (
                <div key={groupKey} className={`permission-group ${isExpanded ? 'expanded' : ''}`}>
                  <div className="group-header" onClick={() => handleGroupToggle(groupKey)}>
                    <div className="group-header-left">
                      <span className={`expand-arrow ${isExpanded ? 'open' : ''}`}>▶</span>
                      <span className="group-label">{group.label}</span>
                      <span className={`group-count ${selected > 0 ? 'has-selected' : ''}`}>
                        {selected}/{total}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={`group-select-all ${allGroupSelected ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); handleSelectAllGroup(groupKey); }}
                    >
                      {allGroupSelected ? '✓ All' : 'Select All'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="group-permissions">
                      {group.permissions.map((perm) => (
                        <label key={perm.key} className={`permission-checkbox ${selectedPermissions.includes(perm.key) ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.key)}
                            onChange={() => handlePermissionToggle(perm.key)}
                          />
                          <span className="perm-label">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky bottom actions */}
          <div className="form-actions-bar">
            <Button type="button" onClick={goBack} className="btn-secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="roles-page">
      <div className="roles-header">
        <div className="roles-header-text">
          <h1 style={{ color: '#005897' }}>Roles Management</h1>
          <p className="roles-subtitle">Create and manage roles with feature-level permissions</p>
        </div>
        <Button onClick={openCreateForm}>+ Create Role</Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="roles-grid">
        {roles.length === 0 ? (
          <div className="no-roles">
            <p>No roles found. Create your first role to get started.</p>
          </div>
        ) : (
          roles.map((role) => (
            <div key={role._id} className="role-card">
              <div className="role-card-header">
                <h3>{role.name}</h3>
                <div className="role-actions">
                  <button className="action-btn edit" onClick={() => openEditForm(role)}>
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(role)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="role-permissions">
                <span className="permissions-count-label">
                  {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''} assigned
                </span>
                <div className="permissions-list">
                  {role.permissions.length === 0 ? (
                    <span className="no-permissions">No permissions assigned</span>
                  ) : (
                    role.permissions.slice(0, 8).map((perm) => (
                      <span key={perm} className="permission-badge">
                        {getPermissionGroupLabel(perm)}
                      </span>
                    ))
                  )}
                  {role.permissions.length > 8 && (
                    <span className="permission-badge more-badge">
                      +{role.permissions.length - 8} more
                    </span>
                  )}
                </div>
              </div>
              <div className="role-meta">
                <span>Created: {new Date(role.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RolesPage;

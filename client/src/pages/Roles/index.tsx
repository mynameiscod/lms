import React, { useEffect, useState } from 'react';
import { roleApi } from '../../api';
import { Spinner, Alert, Button, Modal, Input } from '../../components/common';
import { Role } from '../../types';
import './RolesPage.css';

// Available permissions list
const AVAILABLE_PERMISSIONS = [
  'manage_roles',
  'manage_users',
  'create_courses',
  'edit_courses',
  'delete_courses',
  'view_courses',
  'manage_enrollments',
  'view_reports',
  'manage_tenant'
];

const RolesPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRoles();
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

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
    setIsModalOpen(true);
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setRoleName(role.name);
    setSelectedPermissions(role.permissions);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    setRoleName('');
    setSelectedPermissions([]);
  };

  const handlePermissionToggle = (permission: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
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

      closeModal();
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

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="roles-page">
      <div className="roles-header">
        <div className="roles-header-text">
          <h1>Roles Management</h1>
          <p className="roles-subtitle">Create and manage roles with custom permissions for your organization</p>
        </div>
        <Button onClick={openCreateModal}>+ Create Role</Button>
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
                  <button className="action-btn edit" onClick={() => openEditModal(role)}>
                    Edit
                  </button>
                  <button className="action-btn delete" onClick={() => handleDelete(role)}>
                    Delete
                  </button>
                </div>
              </div>
              <div className="role-permissions">
                <span className="permissions-label">Permissions ({role.permissions.length})</span>
                <div className="permissions-list">
                  {role.permissions.length === 0 ? (
                    <span className="no-permissions">No permissions assigned</span>
                  ) : (
                    role.permissions.map((perm) => (
                      <span key={perm} className="permission-badge">
                        {perm.replace(/_/g, ' ')}
                      </span>
                    ))
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

      {/* Create/Edit Role Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingRole ? 'Edit Role' : 'Create New Role'}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="role-form">
          <Input
            type="text"
            name="roleName"
            label="Role Name"
            placeholder="Enter role name"
            value={roleName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRoleName(e.target.value)}
            required
          />

          <div className="permissions-section">
            <label className="permissions-label">Permissions</label>
            <div className="permissions-grid">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label key={perm} className="permission-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => handlePermissionToggle(perm)}
                  />
                  <span>{perm.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <Button type="button" onClick={closeModal} className="btn-secondary">
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default RolesPage;

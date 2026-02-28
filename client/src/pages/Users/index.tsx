import React, { useEffect, useState } from 'react';
import { userApi, roleApi } from '../../api';
import { Button, Modal, Input, Alert, Spinner } from '../../components/common';
import { User, Role } from '../../types';
import './UsersPage.css';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state for create user
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'STUDENT'
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Modal state for edit role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        userApi.getUsers(),
        roleApi.getRoles()
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = `${user.firstName} ${user.lastName} ${user.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesStatus;
  });

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingUser(null);
    setSelectedRole('');
  };

  const openCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateFormData({
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'STUDENT'
    });
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.email || !createFormData.firstName || !createFormData.lastName || !createFormData.password) {
      setError('All fields are required');
      return;
    }

    try {
      setCreatingUser(true);
      setError('');

      await userApi.createUser(
        createFormData.email,
        createFormData.firstName,
        createFormData.lastName,
        createFormData.password,
        createFormData.role
      );

      setSuccess('User created successfully');
      closeCreateModal();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async () => {
    if (!editingUser || !selectedRole || selectedRole === editingUser.role) {
      setError('Please select a different role');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await userApi.updateUserRole(editingUser._id, selectedRole);
      setSuccess('User role updated successfully');

      // Update local state
      setUsers(users.map(u =>
        u._id === editingUser._id ? { ...u, role: selectedRole } : u
      ));

      closeRoleModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update role');
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateUser = async (user: User) => {
    try {
      setError('');
      await userApi.activateUser(user._id);
      setSuccess('User activated successfully');
      setUsers(users.map(u =>
        u._id === user._id ? { ...u, isActive: true } : u
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to activate user');
    }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to deactivate ${user.firstName} ${user.lastName}?`)) {
      return;
    }

    try {
      setError('');
      await userApi.deactivateUser(user._id);
      setSuccess('User deactivated successfully');
      setUsers(users.map(u =>
        u._id === user._id ? { ...u, isActive: false } : u
      ));
    } catch (err: any) {
      setError(err.message || 'Failed to deactivate user');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      await userApi.deleteUser(user._id);
      setSuccess('User deleted successfully');
      setUsers(users.filter(u => u._id !== user._id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (loading) return <Spinner fullScreen />;

  return (
    <div className="users-page">
      <div className="users-header">
        <div className="users-header-text">
          <h1>User Management</h1>
          <p className="users-subtitle">Manage tenant users, roles, and permissions</p>
        </div>
        <Button onClick={openCreateModal}>+ Create User</Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      <div className="users-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Users ({users.length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'active' ? 'active' : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Active ({users.filter(u => u.isActive).length})
          </button>
          <button
            className={`filter-btn ${statusFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setStatusFilter('inactive')}
          >
            Inactive ({users.filter(u => !u.isActive).length})
          </button>
        </div>
      </div>

      <div className="users-table-container">
        {filteredUsers.length === 0 ? (
          <div className="no-users">
            <p>No users found matching your criteria.</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className={!user.isActive ? 'inactive-row' : ''}>
                  <td>
                    <div className="user-name">
                      <span className="avatar">{user.firstName[0]}{user.lastName[0]}</span>
                      <div>
                        <div className="full-name">{user.firstName} {user.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role.toLowerCase()}`}>
                      {user.role === 'TENANT_ADMIN' ? 'Tenant Admin' : user.role === 'SUPER_ADMIN' ? 'Super Admin' : user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => openEditModal(user)}
                        title="Change Role"
                      >
                        Edit Role
                      </button>
                      {user.isActive ? (
                        <button
                          className="action-btn deactivate-btn"
                          onClick={() => handleDeactivateUser(user)}
                          title="Deactivate User"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="action-btn activate-btn"
                          onClick={() => handleActivateUser(user)}
                          title="Activate User"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Create New User"
        size="medium"
      >
        <form onSubmit={handleCreateUser} className="create-user-form">
          <Input
            type="text"
            name="firstName"
            label="First Name"
            placeholder="John"
            value={createFormData.firstName}
            onChange={handleCreateFormChange}
            required
          />

          <Input
            type="text"
            name="lastName"
            label="Last Name"
            placeholder="Doe"
            value={createFormData.lastName}
            onChange={handleCreateFormChange}
            required
          />

          <Input
            type="email"
            name="email"
            label="Email"
            placeholder="john@example.com"
            value={createFormData.email}
            onChange={handleCreateFormChange}
            required
          />

          <Input
            type="password"
            name="password"
            label="Password"
            placeholder="••••••••"
            value={createFormData.password}
            onChange={handleCreateFormChange}
            required
          />

          <div className="role-selection">
            <label>Role</label>
            <select
              name="role"
              value={createFormData.role}
              onChange={handleCreateFormChange}
              className="role-select"
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
            </select>
          </div>

          <div className="modal-actions">
            <Button
              type="button"
              onClick={closeCreateModal}
              className="btn-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={creatingUser}
            >
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={closeRoleModal}
        title="Change User Role"
        size="small"
      >
        {editingUser && (
          <div className="role-modal-content">
            <div className="user-info">
              <p><strong>User:</strong> {editingUser.firstName} {editingUser.lastName}</p>
              <p><strong>Email:</strong> {editingUser.email}</p>
              <p><strong>Current Role:</strong> <span className="role-badge">{editingUser.role}</span></p>
            </div>

            <div className="role-selection">
              <label>New Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="role-select"
              >
                <option value="">-- Select a role --</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
              </select>
            </div>

            <div className="modal-actions">
              <Button
                type="button"
                onClick={closeRoleModal}
                className="btn-secondary"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRoleChange}
                loading={submitting}
                disabled={!selectedRole || selectedRole === editingUser.role}
              >
                Update Role
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UsersPage;

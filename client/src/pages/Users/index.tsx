import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, roleApi, batchApi } from '../../api';
import { Button, Modal, Input, Alert, Spinner } from '../../components/common';
import { User, Role } from '../../types';
import './UsersPage.css';

interface Batch {
  _id: string;
  name: string;
  isActive?: boolean;
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [warning, setWarning] = useState<{ message: string; setupLink?: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [batchFilter, setBatchFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal state for invite student
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    batchId: '',
    role: 'STUDENT',
    customRoleId: ''
  });
  const [invitingStudent, setInvitingStudent] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteWarning, setInviteWarning] = useState<{ message: string; setupLink?: string } | null>(null);

  // Modal state for create user (non-student)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'INSTRUCTOR',
    customRoleId: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);

  // Modal state for edit role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, batchesRes] = await Promise.all([
        userApi.getUsers(),
        roleApi.getRoles(),
        batchApi.getBatches()
      ]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      // Get all batches for filtering
      const allBatches = (batchesRes.data || []);
      setBatches(allBatches);
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

    const matchesBatch = 
      batchFilter === 'all' || 
      user.batchId === batchFilter;

    const matchesRole = 
      roleFilter === 'all' || 
      user.role === roleFilter;

    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && user.isActive) ||
      (activeFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesBatch && matchesRole && matchesActive;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, batchFilter, roleFilter, activeFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setSelectedRole(user.role);
    setSelectedCustomRoleId(user.customRoleId || '');
    setIsRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setIsRoleModalOpen(false);
    setEditingUser(null);
    setSelectedRole('');
    setSelectedCustomRoleId('');
  };

  const openInviteModal = () => {
    setIsInviteModalOpen(true);
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteFormData({
      email: '',
      firstName: '',
      lastName: '',
      batchId: '',
      role: 'STUDENT',
      customRoleId: ''
    });
    setInviteError('');
    setInviteSuccess('');
    setInviteWarning(null);
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
      role: 'INSTRUCTOR',
      customRoleId: ''
    });
  };

  const handleInviteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setInviteFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteFormData.email || !inviteFormData.firstName || !inviteFormData.lastName) {
      setInviteError('Email, First Name, and Last Name are required');
      return;
    }

    try {
      setInvitingStudent(true);
      setInviteError('');
      setInviteSuccess('');
      setInviteWarning(null);

      // Use inviteStudent endpoint which sends welcome email
      const result = await userApi.inviteStudent(
        inviteFormData.email,
        inviteFormData.firstName,
        inviteFormData.lastName,
        inviteFormData.batchId || undefined,
        inviteFormData.role || undefined,
        inviteFormData.customRoleId || undefined
      );

      // Check if email was sent successfully
      if (result.emailSent) {
        setInviteSuccess(`✅ Student invited successfully! Welcome email sent to ${inviteFormData.email}`);
      } else {
        // Email failed but user was created - show warning with setup link
        setInviteSuccess(`✅ Student account created for ${inviteFormData.email}`);
        setInviteWarning({
          message: `⚠️ Email could not be sent: ${result.emailError || 'Unknown error'}`,
          setupLink: result.data?.setupLink
        });
      }
      
      fetchData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to invite student');
    } finally {
      setInvitingStudent(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.email || !createFormData.firstName || !createFormData.lastName) {
      setError('Email, First Name, and Last Name are required');
      return;
    }

    try {
      setCreatingUser(true);
      setError('');

      // Generate a temporary password for non-student users
      const tempPassword = Math.random().toString(36).slice(-12);

      // Use createUser endpoint for non-student users
      await userApi.createUser(
        createFormData.email,
        createFormData.firstName,
        createFormData.lastName,
        tempPassword,
        createFormData.role,
        createFormData.customRoleId || undefined
      );

      setSuccess(`✅ User created successfully! Role: ${createFormData.role}`);
      closeCreateModal();
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleRoleChange = async () => {
    if (!editingUser || !selectedRole) {
      setError('Please select a role');
      return;
    }

    const roleChanged = selectedRole !== editingUser.role;
    const customRoleChanged = selectedCustomRoleId !== (editingUser.customRoleId || '');

    if (!roleChanged && !customRoleChanged) {
      setError('No changes to save');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      await userApi.updateUserRole(editingUser._id, selectedRole, selectedCustomRoleId || null);
      setSuccess('User role updated successfully');

      // Update local state
      setUsers(users.map(u =>
        u._id === editingUser._id ? { ...u, role: selectedRole, customRoleId: selectedCustomRoleId || undefined } : u
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
      await fetchData();
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
      await fetchData();
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
        <div className="users-header-actions">
          <Button 
            onClick={openInviteModal}
            className="btn-header-sm"
          >
            📧 Invite Student
          </Button>
          <Button 
            onClick={() => navigate('/bulk-upload')}
            className="btn-header-sm btn-secondary-header"
          >
            📤 Bulk Upload
          </Button>
          <Button 
            onClick={openCreateModal}
            className="btn-header-sm btn-secondary-header"
          >
            👥 Create User
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {warning && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <strong>⚠️ Email Failed</strong>
              <p style={{ margin: '0.5rem 0' }}>{warning.message}</p>
              {warning.setupLink && (
                <div style={{ marginTop: '0.5rem' }}>
                  <p style={{ margin: '0.25rem 0', fontWeight: 'bold' }}>Share this setup link manually:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      value={warning.setupLink}
                      readOnly
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.85rem' }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(warning.setupLink || '');
                        setSuccess('Setup link copied to clipboard!');
                      }}
                      style={{ padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setWarning(null)}
              style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', padding: '0' }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
          <select
            value={batchFilter}
            onChange={(e) => setBatchFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Batches</option>
            {batches.map(batch => (
              <option key={batch._id} value={batch._id}>{batch.name}</option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role._id} value={role._id}>{role.name}</option>
            ))}
          </select>

          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
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
              {paginatedUsers.map((user) => (
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
                    {user.customRoleId && (
                      <span className="role-badge custom" style={{ marginLeft: 4, fontSize: 10 }}>
                        {roles.find(r => r._id === user.customRoleId)?.name || 'Custom'}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <span
                        className="action-icon edit-icon"
                        onClick={() => openEditModal(user)}
                        title="Edit Role"
                      >
                        ✏️
                      </span>
                      {user.isActive ? (
                        <span
                          className="action-icon deactivate-icon"
                          onClick={() => handleDeactivateUser(user)}
                          title="Deactivate User"
                        >
                          ⊘
                        </span>
                      ) : (
                        <span
                          className="action-icon activate-icon"
                          onClick={() => handleActivateUser(user)}
                          title="Activate User"
                        >
                          ✓
                        </span>
                      )}
                      <span
                        className="action-icon delete-icon"
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                      >
                        🗑️
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination Controls */}
        {filteredUsers.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">
              <span>Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users</span>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="items-per-page-select"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                title="First page"
              >
                «
              </button>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Previous page"
              >
                ‹
              </button>
              <div className="pagination-pages">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-btn ${currentPage === pageNum ? 'active' : ''}`}
                      onClick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Next page"
              >
                ›
              </button>
              <button
                className="pagination-btn"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Last page"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Student Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={closeInviteModal}
        title="📧 Invite New Student"
        size="medium"
      >
        <form onSubmit={handleInviteStudent} className="invite-form">
          {inviteError && (
            <Alert type="error" message={inviteError} onClose={() => setInviteError('')} />
          )}
          {inviteSuccess && (
            <Alert type="success" message={inviteSuccess} onClose={() => setInviteSuccess('')} />
          )}
          {inviteWarning && (
            <div className="invite-warning" style={{ background: '#fff8e1', border: '1px solid #ffcc02', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
              <p style={{ margin: 0, color: '#856404' }}>{inviteWarning.message}</p>
              {inviteWarning.setupLink && (
                <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                  <strong>Setup Link:</strong>{' '}
                  <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', wordBreak: 'break-all' }}>
                    {inviteWarning.setupLink}
                  </code>
                </p>
              )}
            </div>
          )}

          {!inviteSuccess ? (
            <>
              <div className="invite-info">
                <p className="info-text">
                  ℹ️ A welcome email with setup instructions will be sent to the student.
                </p>
              </div>

              <Input
                type="text"
                name="firstName"
                label="First Name *"
                placeholder="John"
                value={inviteFormData.firstName}
                onChange={handleInviteFormChange}
                required
              />

              <Input
                type="text"
                name="lastName"
                label="Last Name *"
                placeholder="Doe"
                value={inviteFormData.lastName}
                onChange={handleInviteFormChange}
                required
              />

              <Input
                type="email"
                name="email"
                label="Email Address *"
                placeholder="john.doe@example.com"
                value={inviteFormData.email}
                onChange={handleInviteFormChange}
                required
              />

              <div className="form-group">
                <label htmlFor="batch">Batch (Optional)</label>
                <select
                  id="batch"
                  name="batchId"
                  value={inviteFormData.batchId}
                  onChange={handleInviteFormChange}
                  className="form-select"
                >
                  <option value="">-- Select a batch --</option>
                  {batches.map(batch => (
                    <option key={batch._id} value={batch._id}>
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="inviteRole">Role</label>
                <select
                  id="inviteRole"
                  name="role"
                  value={inviteFormData.role}
                  onChange={handleInviteFormChange}
                  className="form-select"
                >
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="STAFF">Staff</option>
                  <option value="TENANT_ADMIN">Tenant Admin</option>
                </select>
              </div>

              {roles.length > 0 && (
                <div className="form-group">
                  <label htmlFor="inviteCustomRole">Custom Permission Role <span className="optional-label">(Optional)</span></label>
                  <select
                    id="inviteCustomRole"
                    name="customRoleId"
                    value={inviteFormData.customRoleId}
                    onChange={handleInviteFormChange}
                    className="form-select"
                  >
                    <option value="">-- Use default permissions for base role --</option>
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name} ({r.permissions.length} permissions)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <Button
                  type="button"
                  onClick={closeInviteModal}
                  className="btn-secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={invitingStudent}
                  className="btn-primary"
                >
                  Send Invitation Email
                </Button>
              </div>
            </>
          ) : (
            <div className="modal-actions">
              <Button
                type="button"
                onClick={() => {
                  setInviteSuccess('');
                  setInviteWarning(null);
                  setInviteFormData({ email: '', firstName: '', lastName: '', batchId: '', role: 'STUDENT', customRoleId: '' });
                }}
                className="btn-secondary"
              >
                Invite Another
              </Button>
              <Button
                type="button"
                onClick={closeInviteModal}
                className="btn-primary"
              >
                Done
              </Button>
            </div>
          )}
        </form>
      </Modal>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="👥 Create New User"
        size="medium"
      >
        <form onSubmit={handleCreateUser} className="create-user-form">
          <div className="create-info">
            <p className="info-text">
              ℹ️ Create staff, instructors, or administrators. No email will be sent.
            </p>
          </div>

          <Input
            type="text"
            name="firstName"
            label="First Name *"
            placeholder="Jane"
            value={createFormData.firstName}
            onChange={handleCreateFormChange}
            required
          />

          <Input
            type="text"
            name="lastName"
            label="Last Name *"
            placeholder="Smith"
            value={createFormData.lastName}
            onChange={handleCreateFormChange}
            required
          />

          <Input
            type="email"
            name="email"
            label="Email Address *"
            placeholder="jane.smith@example.com"
            value={createFormData.email}
            onChange={handleCreateFormChange}
            required
          />

          <div className="form-group">
            <label htmlFor="role">Role *</label>
            <select
              id="role"
              name="role"
              value={createFormData.role}
              onChange={handleCreateFormChange}
              className="form-select"
              required
            >
              <option value="STUDENT">Student</option>
              <option value="INSTRUCTOR">Instructor</option>
              <option value="STAFF">Staff</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
            </select>
          </div>

          {roles.length > 0 && (
            <div className="form-group">
              <label htmlFor="createCustomRole">Custom Permission Role <span className="optional-label">(Optional)</span></label>
              <select
                id="createCustomRole"
                name="customRoleId"
                value={createFormData.customRoleId}
                onChange={handleCreateFormChange}
                className="form-select"
              >
                <option value="">-- Use default permissions for base role --</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.permissions.length} permissions)
                  </option>
                ))}
              </select>
            </div>
          )}

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
              className="btn-primary"
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
        title="🔄 Change User Role"
        size="medium"
      >
        {editingUser && (
          <div className="role-modal-content">
            <div className="user-info">
              <p><strong>User:</strong> {editingUser.firstName} {editingUser.lastName}</p>
              <p><strong>Email:</strong> {editingUser.email}</p>
              <p><strong>Current Role:</strong> <span className="role-badge">{editingUser.role}</span></p>
              {editingUser.customRoleId && (
                <p><strong>Custom Role:</strong> <span className="role-badge custom">{roles.find(r => r._id === editingUser.customRoleId)?.name || 'Unknown'}</span></p>
              )}
            </div>

            <div className="role-selection">
              <label>Base Role</label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="form-select"
              >
                <option value="">-- Select a role --</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="STAFF">Staff</option>
                <option value="TENANT_ADMIN">Tenant Admin</option>
              </select>
            </div>

            <div className="role-selection">
              <label>Custom Permission Role <span className="optional-label">(Optional)</span></label>
              <select
                value={selectedCustomRoleId}
                onChange={(e) => setSelectedCustomRoleId(e.target.value)}
                className="form-select"
              >
                <option value="">-- Use default permissions for base role --</option>
                {roles.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.permissions.length} permissions)
                  </option>
                ))}
              </select>
              <p className="role-help-text">
                {selectedCustomRoleId
                  ? '⚡ This user will get permissions from the selected custom role instead of the default permissions.'
                  : 'ℹ️ User will get the default permissions for their base role.'}
              </p>
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
                className="btn-primary"
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

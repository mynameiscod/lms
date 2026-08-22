import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi, roleApi, batchApi } from '../../api';
import { studentProfileAPI } from '../../api/studentProfileAPI';
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({ email: '', firstName: '', lastName: '', mobileNumber: '', batchId: '', role: 'STUDENT', customRoleId: '' });
  const [invitingStudent, setInvitingStudent] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviteWarning, setInviteWarning] = useState<{ message: string; setupLink?: string } | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({ email: '', firstName: '', lastName: '', role: 'INSTRUCTOR', customRoleId: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createModalError, setCreateModalError] = useState('');

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCustomRoleId, setSelectedCustomRoleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, batchesRes] = await Promise.all([userApi.getUsers(), roleApi.getRoles(), batchApi.getBatches()]);
      setUsers(usersRes.data || []);
      setRoles(rolesRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const prettyRole = (r: string) => r === 'SUPER_ADMIN' ? 'Super Admin' : r === 'TENANT_ADMIN' ? 'Tenant Admin' : r.charAt(0) + r.slice(1).toLowerCase();
  const formatJoined = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const currentUser: any = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
  const batchName = (user: User) => user.batchName || batches.find(b => b._id === user.batchId)?.name || '—';

  const stats = useMemo(() => ({
    total: users.length,
    students: users.filter(u => u.role === 'STUDENT').length,
    trainers: users.filter(u => u.role === 'INSTRUCTOR').length,
    admins: users.filter(u => ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(u.role)).length,
  }), [users]);

  const filteredUsers = useMemo(() => users.filter(user => {
    const haystack = `${user.firstName} ${user.lastName} ${user.email} ${user.phone || ''}`.toLowerCase();
    const matchesSearch = haystack.includes(searchTerm.trim().toLowerCase());
    const matchesBatch = batchFilter === 'all' || user.batchId === batchFilter;
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesActive = activeFilter === 'all' || (activeFilter === 'active' ? user.isActive : !user.isActive);
    return matchesSearch && matchesBatch && matchesRole && matchesActive;
  }), [users, searchTerm, batchFilter, roleFilter, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, batchFilter, roleFilter, activeFilter]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
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

  const handleExport = async () => {
    setExporting(true);
    try { await userApi.exportUsers(); }
    catch (e: any) { setError(e?.message || 'Failed to export users'); }
    finally { setExporting(false); }
  };

  const handleBulkReminders = async () => {
    if (!window.confirm('Email every student with an incomplete profile a checklist of their missing items?')) return;
    setBulkSending(true);
    try {
      const res = await studentProfileAPI.sendBulkProfileReminders();
      setSuccess(res.message || 'Reminders are being sent.');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to send reminders.');
    } finally { setBulkSending(false); }
  };

  const closeInviteModal = () => {
    setIsInviteModalOpen(false);
    setInviteFormData({ email: '', firstName: '', lastName: '', mobileNumber: '', batchId: '', role: 'STUDENT', customRoleId: '' });
    setInviteError(''); setInviteSuccess(''); setInviteWarning(null);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false); setCreateModalError('');
    setCreateFormData({ email: '', firstName: '', lastName: '', role: 'INSTRUCTOR', customRoleId: '' });
  };

  const handleInviteFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setInviteFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleCreateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setCreateFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleInviteStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteFormData.email || !inviteFormData.firstName || !inviteFormData.lastName) { setInviteError('Email, First Name, and Last Name are required'); return; }
    try {
      setInvitingStudent(true); setInviteError(''); setInviteSuccess(''); setInviteWarning(null);
      const result = await userApi.inviteStudent(inviteFormData.email, inviteFormData.firstName, inviteFormData.lastName, inviteFormData.batchId || undefined, inviteFormData.role || undefined, inviteFormData.customRoleId || undefined, inviteFormData.mobileNumber || undefined);
      if (result.emailSent) setInviteSuccess(`Student invited successfully. Welcome email sent to ${inviteFormData.email}`);
      else {
        setInviteSuccess(`Student account created for ${inviteFormData.email}`);
        setInviteWarning({ message: `Email could not be sent: ${result.emailError || 'Unknown error'}`, setupLink: result.data?.setupLink });
      }
      fetchData();
    } catch (err: any) { setInviteError(err.message || 'Failed to invite student'); }
    finally { setInvitingStudent(false); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.email || !createFormData.firstName || !createFormData.lastName) { setCreateModalError('Email, First Name, and Last Name are required'); return; }
    try {
      setCreatingUser(true); setCreateModalError('');
      const tempPassword = Math.random().toString(36).slice(-12);
      await userApi.createUser(createFormData.email, createFormData.firstName, createFormData.lastName, tempPassword, createFormData.role, createFormData.customRoleId || undefined);
      setSuccess(`User created successfully. Role: ${prettyRole(createFormData.role)}`);
      closeCreateModal(); fetchData();
    } catch (err: any) { setCreateModalError(err.message || 'Failed to create user'); }
    finally { setCreatingUser(false); }
  };

  const handleRoleChange = async () => {
    if (!editingUser || !selectedRole) return;
    try {
      setSubmitting(true); setError('');
      await userApi.updateUserRole(editingUser._id, selectedRole, selectedCustomRoleId || null);
      setSuccess('User role updated successfully');
      setUsers(prev => prev.map(u => u._id === editingUser._id ? { ...u, role: selectedRole, customRoleId: selectedCustomRoleId || undefined } : u));
      closeRoleModal();
    } catch (err: any) { setError(err.message || 'Failed to update role'); }
    finally { setSubmitting(false); }
  };

  const handleActivateUser = async (user: User) => {
    try { await userApi.activateUser(user._id); setSuccess('User activated successfully'); await fetchData(); }
    catch (err: any) { setError(err.message || 'Failed to activate user'); }
  };

  const handleDeactivateUser = async (user: User) => {
    if (!window.confirm(`Deactivate ${user.firstName} ${user.lastName}?`)) return;
    try { await userApi.deactivateUser(user._id); setSuccess('User deactivated successfully'); await fetchData(); }
    catch (err: any) { setError(err.message || 'Failed to deactivate user'); }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) return;
    try { await userApi.deleteUser(user._id); setSuccess('User deleted successfully'); setUsers(prev => prev.filter(u => u._id !== user._id)); }
    catch (err: any) { setError(err.message || 'Failed to delete user'); }
  };

  if (loading) return <Spinner fullScreen />;

  const statCards = [
    { label: 'Total Users', value: stats.total, icon: 'people', tone: 'navy', note: 'All user accounts' },
    { label: 'Students', value: stats.students, icon: 'mortarboard', tone: 'teal', note: `${stats.total ? Math.round(stats.students / stats.total * 100) : 0}% of users` },
    { label: 'Trainers', value: stats.trainers, icon: 'person-workspace', tone: 'purple', note: 'Instructor accounts' },
    { label: 'Admins', value: stats.admins, icon: 'shield-check', tone: 'amber', note: 'Platform & tenant admins' },
  ];

  return (
    <div className="users-page">
      <div className="users-header">
        <div><h1>Users</h1><p>Manage students, instructors and administrators</p></div>
        <details className="add-user-menu">
          <summary><i className="bi bi-plus-lg" /> Add User <i className="bi bi-chevron-down" /></summary>
          <div className="add-user-menu-panel">
            <button onClick={() => setIsInviteModalOpen(true)}><i className="bi bi-envelope-plus" /><span><strong>Invite Student</strong><small>Send setup instructions by email</small></span></button>
            <button onClick={() => setIsCreateModalOpen(true)}><i className="bi bi-person-plus" /><span><strong>Create User</strong><small>Create staff, trainer or admin</small></span></button>
            <button onClick={() => navigate('/bulk-upload')}><i className="bi bi-file-earmark-arrow-up" /><span><strong>Bulk Upload</strong><small>Import multiple users</small></span></button>
          </div>
        </details>
      </div>

      <section className="users-stats" aria-label="User summary">
        {statCards.map(card => <article className="user-stat-card" key={card.label}>
          <span className={`user-stat-icon ${card.tone}`}><i className={`bi bi-${card.icon}`} /></span>
          <div><span>{card.label}</span><strong>{card.value.toLocaleString('en-IN')}</strong><small>{card.note}</small></div>
        </article>)}
      </section>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}
      {warning && <div className="users-warning"><i className="bi bi-exclamation-triangle" /><div><strong>Email delivery issue</strong><span>{warning.message}</span>{warning.setupLink && <button onClick={() => navigator.clipboard.writeText(warning.setupLink || '')}>Copy setup link</button>}</div><button className="icon-button" onClick={() => setWarning(null)}><i className="bi bi-x-lg" /></button></div>}

      <div className="users-toolbar">
        <div className="users-search"><i className="bi bi-search" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name, email or mobile..." /></div>
        <div className={`filters-cluster ${showFilters ? 'mobile-open' : ''}`}>
          <label><span>Role</span><select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}><option value="all">All Roles</option>{Array.from(new Set(users.map(u => u.role))).map(r => <option value={r} key={r}>{prettyRole(r)}</option>)}</select></label>
          <label><span>Status</span><select value={activeFilter} onChange={e => setActiveFilter(e.target.value as any)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label><span>Batch</span><select value={batchFilter} onChange={e => setBatchFilter(e.target.value)}><option value="all">All Batches</option>{batches.map(b => <option value={b._id} key={b._id}>{b.name}</option>)}</select></label>
        </div>
        <button className="mobile-filter-button" onClick={() => setShowFilters(v => !v)}><i className="bi bi-funnel" /> Filters</button>
        <div className="toolbar-actions">
          <button className="secondary-action" onClick={handleExport} disabled={exporting}><i className="bi bi-download" /> {exporting ? 'Exporting...' : 'Export'}</button>
          <details className="bulk-menu"><summary>Bulk Actions <i className="bi bi-chevron-down" /></summary><div><button onClick={handleBulkReminders} disabled={bulkSending}><i className="bi bi-envelope-check" /> {bulkSending ? 'Sending...' : 'Email incomplete profiles'}</button><button onClick={() => navigate('/bulk-upload')}><i className="bi bi-file-earmark-arrow-up" /> Bulk upload users</button></div></details>
        </div>
      </div>

      <section className="users-list-card">
        <div className="users-list-head"><h2>Users <span>({filteredUsers.length})</span></h2><span>{filteredUsers.length} users found</span></div>
        {filteredUsers.length === 0 ? <div className="users-empty"><i className="bi bi-people" /><strong>No users found</strong><span>Try changing your search or filters.</span></div> : <>
          <div className="users-table-wrap">
            <table className="users-table">
              <thead><tr><th>User</th><th>Contact</th><th>Role</th><th>Batch</th><th>Status</th><th>Joined On</th><th className="actions-col">Actions</th></tr></thead>
              <tbody>{paginatedUsers.map(user => <tr key={user._id} className={!user.isActive ? 'inactive-row' : ''}>
                <td data-label="User"><div className="user-identity"><span className="avatar">{(user.firstName?.[0] || '')}{(user.lastName?.[0] || '')}</span><div><button className={user.role === 'STUDENT' ? 'name-link' : 'plain-name'} onClick={() => user.role === 'STUDENT' && navigate(`/users/${user._id}`, { state: { user } })}>{user.firstName} {user.lastName}</button><small>{user.email}{currentUser && (currentUser._id === user._id || currentUser.id === user._id) && <span className="you-badge">You</span>}</small>{user.role === 'STUDENT' && user.completeness != null && <small className="completion">{user.completeness}% profile complete</small>}</div></div></td>
                <td data-label="Contact"><div className="contact-cell"><span><i className="bi bi-envelope" />{user.email}</span>{user.phone && <span><i className="bi bi-telephone" />{user.phone}</span>}</div></td>
                <td data-label="Role"><span className={`role-badge ${user.role.toLowerCase()}`}>{prettyRole(user.role)}</span>{user.customRoleId && <span className="role-badge custom">{roles.find(r => r._id === user.customRoleId)?.name || 'Custom'}</span>}</td>
                <td data-label="Batch"><span className="batch-cell">{batchName(user)}</span></td>
                <td data-label="Status"><span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                <td data-label="Joined On"><span className="joined-cell">{formatJoined(user.createdAt)}</span></td>
                <td data-label="Actions" className="actions-col"><details className="row-actions"><summary aria-label={`Actions for ${user.firstName} ${user.lastName}`}><i className="bi bi-three-dots-vertical" /></summary><div>{user.role === 'STUDENT' && <button onClick={() => navigate(`/users/${user._id}`, { state: { user } })}><i className="bi bi-eye" /> View details</button>}<button onClick={() => openEditModal(user)}><i className="bi bi-person-gear" /> Change role</button>{user.isActive ? <button onClick={() => handleDeactivateUser(user)}><i className="bi bi-person-dash" /> Deactivate</button> : <button onClick={() => handleActivateUser(user)}><i className="bi bi-person-check" /> Activate</button>}<button className="danger" onClick={() => handleDeleteUser(user)}><i className="bi bi-trash3" /> Delete</button></div></details></td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="users-pagination"><span>Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users</span><div className="pagination-actions"><button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><i className="bi bi-chevron-left" /></button>{Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const page = totalPages <= 5 ? i + 1 : Math.min(Math.max(currentPage - 2, 1), totalPages - 4) + i; return <button key={page} className={page === currentPage ? 'active' : ''} onClick={() => handlePageChange(page)}>{page}</button>; })}<button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><i className="bi bi-chevron-right" /></button><select value={itemsPerPage} onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}><option value={10}>10 / page</option><option value={20}>20 / page</option><option value={25}>25 / page</option><option value={50}>50 / page</option></select></div></div>
        </>}
      </section>

      <Modal isOpen={isInviteModalOpen} onClose={closeInviteModal} title="Invite New Student" size="medium">
        <form onSubmit={handleInviteStudent} className="invite-form">
          {inviteError && <Alert type="error" message={inviteError} onClose={() => setInviteError('')} />}
          {inviteSuccess && <Alert type="success" message={inviteSuccess} onClose={() => setInviteSuccess('')} />}
          {inviteWarning && <div className="soft-warning"><i className="bi bi-exclamation-triangle" /><span>{inviteWarning.message}</span>{inviteWarning.setupLink && <code>{inviteWarning.setupLink}</code>}</div>}
          {!inviteSuccess ? <>
            <div className="form-info"><i className="bi bi-info-circle" /><span>A welcome email with setup instructions will be sent to the student.</span></div>
            <Input type="text" name="firstName" label="First Name *" placeholder="John" value={inviteFormData.firstName} onChange={handleInviteFormChange} required />
            <Input type="text" name="lastName" label="Last Name *" placeholder="Doe" value={inviteFormData.lastName} onChange={handleInviteFormChange} required />
            <Input type="email" name="email" label="Email Address *" placeholder="john.doe@example.com" value={inviteFormData.email} onChange={handleInviteFormChange} required />
            <Input type="tel" name="mobileNumber" label="Mobile Number (Optional)" placeholder="+91 9876543210" value={inviteFormData.mobileNumber} onChange={handleInviteFormChange} />
            <div className="form-group"><label htmlFor="batch">Batch (Optional)</label><select id="batch" name="batchId" value={inviteFormData.batchId} onChange={handleInviteFormChange} className="form-select"><option value="">Select a batch</option>{batches.map(batch => <option key={batch._id} value={batch._id}>{batch.name}</option>)}</select></div>
            <div className="form-group"><label htmlFor="inviteRole">Role</label><select id="inviteRole" name="role" value={inviteFormData.role} onChange={handleInviteFormChange} className="form-select"><option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option><option value="STAFF">Staff</option><option value="TENANT_ADMIN">Tenant Admin</option></select></div>
            {roles.length > 0 && <div className="form-group"><label htmlFor="inviteCustomRole">Custom Permission Role <span className="optional-label">(Optional)</span></label><select id="inviteCustomRole" name="customRoleId" value={inviteFormData.customRoleId} onChange={handleInviteFormChange} className="form-select"><option value="">Use default permissions</option>{roles.map(r => <option key={r._id} value={r._id}>{r.name} ({r.permissions.length} permissions)</option>)}</select></div>}
            <div className="modal-actions"><Button type="button" onClick={closeInviteModal} className="btn-secondary">Cancel</Button><Button type="submit" loading={invitingStudent} className="btn-primary">Send Invitation</Button></div>
          </> : <div className="modal-actions"><Button type="button" onClick={() => { setInviteSuccess(''); setInviteWarning(null); setInviteFormData({ email: '', firstName: '', lastName: '', mobileNumber: '', batchId: '', role: 'STUDENT', customRoleId: '' }); }} className="btn-secondary">Invite Another</Button><Button type="button" onClick={closeInviteModal} className="btn-primary">Done</Button></div>}
        </form>
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={closeCreateModal} title="Create New User" size="medium">
        <form onSubmit={handleCreateUser} className="create-user-form">
          {createModalError && <Alert type="error" message={createModalError} onClose={() => setCreateModalError('')} />}
          <div className="form-info"><i className="bi bi-info-circle" /><span>Create staff, instructors or administrators. No email will be sent.</span></div>
          <Input type="text" name="firstName" label="First Name *" placeholder="Jane" value={createFormData.firstName} onChange={handleCreateFormChange} required />
          <Input type="text" name="lastName" label="Last Name *" placeholder="Smith" value={createFormData.lastName} onChange={handleCreateFormChange} required />
          <Input type="email" name="email" label="Email Address *" placeholder="jane.smith@example.com" value={createFormData.email} onChange={handleCreateFormChange} required />
          <div className="form-group"><label htmlFor="role">Role *</label><select id="role" name="role" value={createFormData.role} onChange={handleCreateFormChange} className="form-select" required><option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option><option value="STAFF">Staff</option><option value="TENANT_ADMIN">Tenant Admin</option></select></div>
          {roles.length > 0 && <div className="form-group"><label htmlFor="createCustomRole">Custom Permission Role <span className="optional-label">(Optional)</span></label><select id="createCustomRole" name="customRoleId" value={createFormData.customRoleId} onChange={handleCreateFormChange} className="form-select"><option value="">Use default permissions</option>{roles.map(r => <option key={r._id} value={r._id}>{r.name} ({r.permissions.length} permissions)</option>)}</select></div>}
          <div className="modal-actions"><Button type="button" onClick={closeCreateModal} className="btn-secondary">Cancel</Button><Button type="submit" loading={creatingUser} className="btn-primary">Create User</Button></div>
        </form>
      </Modal>

      <Modal isOpen={isRoleModalOpen} onClose={closeRoleModal} title="Change User Role" size="medium">
        {editingUser && <div className="role-modal-content"><div className="user-info"><strong>{editingUser.firstName} {editingUser.lastName}</strong><span>{editingUser.email}</span></div><div className="form-group"><label>Base Role</label><select value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="form-select"><option value="">Select a role</option><option value="STUDENT">Student</option><option value="INSTRUCTOR">Instructor</option><option value="STAFF">Staff</option><option value="TENANT_ADMIN">Tenant Admin</option></select></div><div className="form-group"><label>Custom Permission Role <span className="optional-label">(Optional)</span></label><select value={selectedCustomRoleId} onChange={e => setSelectedCustomRoleId(e.target.value)} className="form-select"><option value="">Use default permissions</option>{roles.map(r => <option key={r._id} value={r._id}>{r.name} ({r.permissions.length} permissions)</option>)}</select></div><div className="modal-actions"><Button type="button" onClick={closeRoleModal} className="btn-secondary">Cancel</Button><Button type="button" onClick={handleRoleChange} loading={submitting} className="btn-primary">Update Role</Button></div></div>}
      </Modal>
    </div>
  );
};

export default UsersPage;

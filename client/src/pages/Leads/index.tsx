import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, userApi } from '../../api';
import './Leads.css';

interface Stage {
  _id: string;
  name: string;
  color: string;
  order: number;
}

interface Lead {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  courseInterest: string[];
  source: string;
  stageId: Stage | string;
  assignedTo?: { _id: string; firstName: string; lastName: string; email: string } | null;
  nextFollowUp?: string;
  notes: string;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
}

const SOURCES = ['website', 'walkin', 'referral', 'social_media', 'google_ads', 'whatsapp', 'phone', 'other'];

const LeadsPage: React.FC = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [todayFollowUps, setTodayFollowUps] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', courseInterest: '', source: 'other',
    stageId: '', assignedTo: '', nextFollowUp: '', notes: ''
  });

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stagesRes, leadsRes, usersRes] = await Promise.all([
        leadStageApi.getStages(),
        leadApi.getLeads({ search, stageId: filterStage, source: filterSource, page, limit: 100 }),
        userApi.getUsers()
      ]);
      setStages(stagesRes.data || []);
      setLeads(leadsRes.data?.leads || []);
      setTotalPages(leadsRes.data?.totalPages || 1);

      // Load analytics for stats
      try {
        const analyticsRes = await leadApi.getAnalytics();
        setTotalLeads(analyticsRes.data?.totalLeads || 0);
        setTodayFollowUps(analyticsRes.data?.todayFollowUps || 0);
      } catch { /* ignore */ }

      // Filter staff/instructors/admins
      const users = usersRes.data || [];
      setStaff(users.filter((u: any) => ['TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'].includes(u.role)));
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [search, filterStage, filterSource, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setEditingLead(null);
    setFormData({
      name: '', email: '', phone: '', courseInterest: '', source: 'other',
      stageId: stages[0]?._id || '', assignedTo: '', nextFollowUp: '', notes: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    const stage = typeof lead.stageId === 'object' ? lead.stageId._id : lead.stageId;
    setFormData({
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      courseInterest: lead.courseInterest?.join(', ') || '',
      source: lead.source,
      stageId: stage,
      assignedTo: lead.assignedTo?._id || '',
      nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.split('T')[0] : '',
      notes: lead.notes || ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      showAlertMsg('error', 'Name and phone are required');
      return;
    }
    try {
      const payload = {
        ...formData,
        courseInterest: formData.courseInterest.split(',').map(s => s.trim()).filter(Boolean),
        assignedTo: formData.assignedTo || undefined,
        nextFollowUp: formData.nextFollowUp || undefined
      };
      if (editingLead) {
        await leadApi.updateLead(editingLead._id, payload);
        showAlertMsg('success', 'Lead updated');
      } else {
        await leadApi.createLead(payload);
        showAlertMsg('success', 'Lead created');
      }
      setShowModal(false);
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to save lead');
    }
  };

  const handleDelete = async (lead: Lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"?`)) return;
    try {
      await leadApi.deleteLead(lead._id);
      showAlertMsg('success', 'Lead deleted');
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to delete lead');
    }
  };

  const handleStageChange = async (leadId: string, newStageId: string) => {
    try {
      await leadApi.changeStage(leadId, newStageId);
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to change stage');
    }
  };

  const getStage = (lead: Lead): Stage | null => {
    if (typeof lead.stageId === 'object') return lead.stageId as Stage;
    return stages.find(s => s._id === lead.stageId) || null;
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return <div className="leads-page"><div className="loading-spinner">Loading leads...</div></div>;
  }

  return (
    <div className="leads-page">
      {/* Header */}
      <div className="leads-header">
        <h1>Lead Management</h1>
        <div className="leads-header-actions">
          <div className="view-toggle">
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Board</button>
            <button className={view === 'table' ? 'active' : ''} onClick={() => setView('table')}>Table</button>
          </div>
          <button className="btn-primary" onClick={handleOpenCreate}>+ Add Lead</button>
        </div>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Stats */}
      <div className="leads-stats">
        <div className="stat-card">
          <div className="stat-label">Total Leads</div>
          <div className="stat-value">{totalLeads}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Today's Follow-ups</div>
          <div className="stat-value">{todayFollowUps}</div>
        </div>
        {stages.map(stage => {
          const count = leads.filter(l => getStage(l)?._id === stage._id).length;
          return (
            <div className="stat-card" key={stage._id}>
              <div className="stat-label" style={{ color: stage.color }}>{stage.name}</div>
              <div className="stat-value">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="leads-filters">
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="">All Stages</option>
          {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
      </div>

      {stages.length === 0 ? (
        <div className="empty-state">
          <h3>No lead stages configured</h3>
          <p>Please set up your lead lifecycle stages first.</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/lead-stages')}>
            Configure Stages
          </button>
        </div>
      ) : view === 'kanban' ? (
        /* Kanban View */
        <div className="kanban-board">
          {stages.map(stage => {
            const stageLeads = leads.filter(l => getStage(l)?._id === stage._id);
            return (
              <div className="kanban-column" key={stage._id}>
                <div className="kanban-column-header">
                  <span className="kanban-column-dot" style={{ backgroundColor: stage.color }} />
                  <span className="kanban-column-name">{stage.name}</span>
                  <span className="kanban-column-count">{stageLeads.length}</span>
                </div>
                <div className="kanban-cards">
                  {stageLeads.map(lead => (
                    <div className="kanban-card" key={lead._id} onClick={() => navigate(`/leads/${lead._id}`)}>
                      <div className="kanban-card-name">{lead.name}</div>
                      {lead.phone && <div className="kanban-card-info">{lead.phone}</div>}
                      {lead.email && <div className="kanban-card-info">{lead.email}</div>}
                      <div className="kanban-card-meta">
                        <span className="kanban-card-source">{lead.source.replace('_', ' ')}</span>
                        {lead.nextFollowUp && (
                          <span className={`kanban-card-followup ${isOverdue(lead.nextFollowUp) ? 'overdue' : ''}`}>
                            {isOverdue(lead.nextFollowUp) ? 'Overdue' : formatDate(lead.nextFollowUp)}
                          </span>
                        )}
                      </div>
                      <div className="kanban-card-stage-select" onClick={e => e.stopPropagation()}>
                        <select
                          value={stage._id}
                          onChange={e => handleStageChange(lead._id, e.target.value)}
                        >
                          {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <>
          <div className="leads-table-container">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Stage</th>
                  <th>Assigned To</th>
                  <th>Follow-up</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No leads found</td></tr>
                ) : leads.map(lead => {
                  const stage = getStage(lead);
                  return (
                    <tr key={lead._id} onClick={() => navigate(`/leads/${lead._id}`)}>
                      <td style={{ fontWeight: 600 }}>{lead.name}</td>
                      <td>{lead.phone}</td>
                      <td>{lead.email || '-'}</td>
                      <td>{lead.source.replace('_', ' ')}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className="table-stage-select"
                          value={stage?._id || ''}
                          onChange={e => handleStageChange(lead._id, e.target.value)}
                        >
                          {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                      </td>
                      <td>{lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : '-'}</td>
                      <td>
                        {lead.nextFollowUp ? (
                          <span className={isOverdue(lead.nextFollowUp) ? 'kanban-card-followup overdue' : ''}>
                            {formatDate(lead.nextFollowUp)}
                          </span>
                        ) : '-'}
                      </td>
                      <td>{formatDate(lead.createdAt)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.78rem', marginRight: 4 }} onClick={() => handleOpenEdit(lead)}>Edit</button>
                        <button className="btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => handleDelete(lead)}>Del</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editingLead ? 'Edit Lead' : 'Add New Lead'}</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Full name" autoFocus />
              </div>
              <div className="form-group">
                <label>Phone *</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="Email address" />
              </div>
              <div className="form-group">
                <label>Source</label>
                <select value={formData.source} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}>
                  {SOURCES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Stage</label>
                <select value={formData.stageId} onChange={e => setFormData(p => ({ ...p, stageId: e.target.value }))}>
                  {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned To</label>
                <select value={formData.assignedTo} onChange={e => setFormData(p => ({ ...p, assignedTo: e.target.value }))}>
                  <option value="">Unassigned</option>
                  {staff.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Course Interest (comma separated)</label>
              <input type="text" value={formData.courseInterest} onChange={e => setFormData(p => ({ ...p, courseInterest: e.target.value }))} placeholder="e.g., Java Full Stack, Python" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Next Follow-up</label>
                <input type="date" value={formData.nextFollowUp} onChange={e => setFormData(p => ({ ...p, nextFollowUp: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editingLead ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

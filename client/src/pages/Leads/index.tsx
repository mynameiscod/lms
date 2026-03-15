import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, userApi, leadFormConfigApi } from '../../api';
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

interface FormField {
  _id?: string;
  fieldKey: string;
  label: string;
  type: string;
  required: boolean;
  enabled: boolean;
  isBuiltIn: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

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

  // Board stage visibility — default first 5
  const [visibleStageIds, setVisibleStageIds] = useState<Set<string>>(new Set());
  const [stagesInitialized, setStagesInitialized] = useState(false);

  // Form config
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [configSources, setConfigSources] = useState<string[]>(SOURCES);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterSource, setFilterSource] = useState('');

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '', email: '', phone: '', courseInterest: '', source: 'other',
    stageId: '', assignedTo: '', nextFollowUp: '', notes: ''
  });

  // Not Interested reason modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingLeadId, setPendingLeadId] = useState('');
  const [pendingStageId, setPendingStageId] = useState('');
  const [notInterestedReason, setNotInterestedReason] = useState('');

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [stagesRes, leadsRes, usersRes, configRes] = await Promise.all([
        leadStageApi.getStages(),
        leadApi.getLeads({ search, stageId: filterStage, source: filterSource, page, limit: 100 }),
        userApi.getUsers(),
        leadFormConfigApi.getConfig()
      ]);
      const loadedStages = stagesRes.data || [];
      setStages(loadedStages);
      setLeads(leadsRes.data?.leads || []);
      setTotalPages(leadsRes.data?.totalPages || 1);

      // Initialize visible stages to first 5 on first load
      if (!stagesInitialized && loadedStages.length > 0) {
        const defaultVisible = loadedStages.slice(0, 5).map((s: Stage) => s._id);
        setVisibleStageIds(new Set(defaultVisible));
        setStagesInitialized(true);
      }

      // Form config
      if (configRes.data) {
        const enabledFields = (configRes.data.fields || [])
          .filter((f: FormField) => f.enabled)
          .sort((a: FormField, b: FormField) => a.order - b.order);
        setFormFields(enabledFields);
        if (configRes.data.sources?.length > 0) {
          setConfigSources(configRes.data.sources);
        }
      }

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
    const initial: Record<string, any> = {
      name: '', email: '', phone: '', courseInterest: '', source: configSources[0] || 'other',
      stageId: stages[0]?._id || '', assignedTo: '', nextFollowUp: '', notes: ''
    };
    // Initialize custom fields
    formFields.forEach(f => {
      if (!f.isBuiltIn && !(f.fieldKey in initial)) {
        initial[f.fieldKey] = f.type === 'checkbox' ? false : '';
      }
    });
    setFormData(initial);
    setShowModal(true);
  };

  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    const stage = typeof lead.stageId === 'object' ? lead.stageId._id : lead.stageId;
    const data: Record<string, any> = {
      name: lead.name,
      email: lead.email || '',
      phone: lead.phone,
      courseInterest: lead.courseInterest?.join(', ') || '',
      source: lead.source,
      stageId: stage,
      assignedTo: lead.assignedTo?._id || '',
      nextFollowUp: lead.nextFollowUp ? lead.nextFollowUp.split('T')[0] : '',
      notes: lead.notes || ''
    };
    // Load custom field values
    const customFields = (lead as any).customFields || {};
    formFields.forEach(f => {
      if (!f.isBuiltIn) {
        data[f.fieldKey] = customFields[f.fieldKey] ?? (f.type === 'checkbox' ? false : '');
      }
    });
    setFormData(data);
    setShowModal(true);
  };

  const handleSave = async () => {
    // Validate required fields
    for (const field of formFields) {
      if (field.required && field.enabled) {
        const val = formData[field.fieldKey];
        if (!val || (typeof val === 'string' && !val.trim())) {
          showAlertMsg('error', `${field.label} is required`);
          return;
        }
      }
    }
    try {
      // Separate built-in vs custom fields
      const builtInKeys = ['name', 'email', 'phone', 'courseInterest', 'source', 'stageId', 'assignedTo', 'nextFollowUp', 'notes'];
      const customFields: Record<string, any> = {};
      formFields.forEach(f => {
        if (!f.isBuiltIn && formData[f.fieldKey] !== undefined) {
          customFields[f.fieldKey] = formData[f.fieldKey];
        }
      });

      const payload: any = {};
      builtInKeys.forEach(key => {
        if (formData[key] !== undefined) payload[key] = formData[key];
      });
      payload.courseInterest = (formData.courseInterest || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      payload.assignedTo = formData.assignedTo || undefined;
      payload.nextFollowUp = formData.nextFollowUp || undefined;
      if (Object.keys(customFields).length > 0) {
        payload.customFields = customFields;
      }

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
    // Check if target is "Not Interested"
    const targetStage = stages.find(s => s._id === newStageId);
    if (targetStage?.name === 'Not Interested') {
      setPendingLeadId(leadId);
      setPendingStageId(newStageId);
      setNotInterestedReason('');
      setShowReasonModal(true);
      return;
    }
    try {
      await leadApi.changeStage(leadId, newStageId);
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to change stage');
    }
  };

  const handleConfirmNotInterested = async () => {
    if (!notInterestedReason.trim()) {
      showAlertMsg('error', 'Please provide a reason');
      return;
    }
    try {
      await leadApi.changeStage(pendingLeadId, pendingStageId, notInterestedReason.trim());
      setShowReasonModal(false);
      loadData();
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to change stage');
    }
  };

  const toggleStageVisibility = (stageId: string) => {
    setVisibleStageIds(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        if (next.size <= 1) return prev; // keep at least 1 visible
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  const visibleStages = stages.filter(s => visibleStageIds.has(s._id));

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
          {configSources.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
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
        <>
          {/* Stage Picker */}
          <div className="stage-picker">
            <span className="stage-picker-label">Columns:</span>
            <div className="stage-picker-chips">
              {stages.map(stage => {
                const active = visibleStageIds.has(stage._id);
                const count = leads.filter(l => getStage(l)?._id === stage._id).length;
                return (
                  <button
                    key={stage._id}
                    className={`stage-chip ${active ? 'active' : ''}`}
                    onClick={() => toggleStageVisibility(stage._id)}
                    style={active ? { borderColor: stage.color, background: stage.color + '14' } : {}}
                  >
                    <span className="stage-chip-dot" style={{ backgroundColor: stage.color }} />
                    {stage.name}
                    <span className="stage-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="kanban-board" style={{ '--kanban-cols': visibleStages.length } as React.CSSProperties}>
            {visibleStages.map(stage => {
              const stageLeads = leads.filter(l => getStage(l)?._id === stage._id);
              return (
                <div className="kanban-column" key={stage._id}>
                  <div className="kanban-column-header">
                    <span className="kanban-column-dot" style={{ backgroundColor: stage.color }} />
                    <span className="kanban-column-name">{stage.name}</span>
                    <span className="kanban-column-count">{stageLeads.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {stageLeads.length === 0 ? (
                      <div className="kanban-empty">No leads</div>
                    ) : stageLeads.map(lead => (
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
        </>
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
            <div className="dynamic-form">
              {formFields.map(field => {
                // Built-in fields with special rendering
                if (field.fieldKey === 'source') {
                  return (
                    <div className="form-group" key={field.fieldKey}>
                      <label>{field.label}{field.required ? ' *' : ''}</label>
                      <select value={formData.source || ''} onChange={e => setFormData(p => ({ ...p, source: e.target.value }))}>
                        {configSources.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  );
                }
                if (field.fieldKey === 'stageId') {
                  return (
                    <div className="form-group" key={field.fieldKey}>
                      <label>{field.label}{field.required ? ' *' : ''}</label>
                      <select value={formData.stageId || ''} onChange={e => setFormData(p => ({ ...p, stageId: e.target.value }))}>
                        {stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                      </select>
                    </div>
                  );
                }
                if (field.fieldKey === 'assignedTo') {
                  return (
                    <div className="form-group" key={field.fieldKey}>
                      <label>{field.label}{field.required ? ' *' : ''}</label>
                      <select value={formData.assignedTo || ''} onChange={e => setFormData(p => ({ ...p, assignedTo: e.target.value }))}>
                        <option value="">Unassigned</option>
                        {staff.map(u => <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>)}
                      </select>
                    </div>
                  );
                }
                // Generic field rendering
                const val = formData[field.fieldKey] ?? '';
                const onChange = (v: any) => setFormData(p => ({ ...p, [field.fieldKey]: v }));

                if (field.type === 'textarea') {
                  return (
                    <div className="form-group" key={field.fieldKey}>
                      <label>{field.label}{field.required ? ' *' : ''}</label>
                      <textarea value={val} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ''} />
                    </div>
                  );
                }
                if (field.type === 'select' && field.options && field.options.length > 0) {
                  return (
                    <div className="form-group" key={field.fieldKey}>
                      <label>{field.label}{field.required ? ' *' : ''}</label>
                      <select value={val} onChange={e => onChange(e.target.value)}>
                        <option value="">-- Select --</option>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  );
                }
                if (field.type === 'checkbox') {
                  return (
                    <div className="form-group form-group-checkbox" key={field.fieldKey}>
                      <label>
                        <input type="checkbox" checked={!!val} onChange={e => onChange(e.target.checked)} />
                        {' '}{field.label}
                      </label>
                    </div>
                  );
                }
                // text, email, tel, number, date
                return (
                  <div className="form-group" key={field.fieldKey}>
                    <label>{field.label}{field.required ? ' *' : ''}</label>
                    <input
                      type={field.type}
                      value={val}
                      onChange={e => onChange(e.target.value)}
                      placeholder={field.placeholder || ''}
                    />
                  </div>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave}>{editingLead ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Not Interested Reason Modal */}
      {showReasonModal && (
        <div className="modal-overlay" onClick={() => setShowReasonModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h2>Not Interested - Reason Required</h2>
            <p style={{ color: '#6b7280', fontSize: '0.88rem', margin: '0 0 16px' }}>
              Please provide a reason why this lead is not interested.
            </p>
            <div className="form-group">
              <label>Reason *</label>
              <textarea
                value={notInterestedReason}
                onChange={e => setNotInterestedReason(e.target.value)}
                placeholder="e.g., Found another institute, budget constraints..."
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowReasonModal(false)}>Cancel</button>
              <button className="btn-danger" style={{ padding: '8px 18px', fontSize: '0.85rem' }} onClick={handleConfirmNotInterested} disabled={!notInterestedReason.trim()}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsPage;

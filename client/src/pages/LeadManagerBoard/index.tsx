import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi } from '../../api';
import './LeadManagerBoard.css';

interface StageBreakdown {
  stageId: string;
  name: string;
  color: string;
  count: number;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  totalLeads: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  stageBreakdown: StageBreakdown[];
}

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
  source: string;
  stageId: { _id: string; name: string; color: string } | string;
  nextFollowUp?: string;
  createdAt: string;
}

const LeadManagerBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expanded employee — shows their leads
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [employeeLeads, setEmployeeLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignLeadId, setAssignLeadId] = useState('');
  const [assignToUser, setAssignToUser] = useState('');

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await leadApi.getManagerBoard();
      setEmployees(res.data?.employees || []);
      setStages(res.data?.stages || []);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExpandEmployee = async (empId: string) => {
    if (expandedId === empId) {
      setExpandedId(null);
      setEmployeeLeads([]);
      return;
    }
    try {
      setExpandedId(empId);
      setLoadingLeads(true);
      const assignedTo = empId === 'unassigned' ? undefined : empId;
      const res = await leadApi.getLeads({ assignedTo, limit: 200 });
      let leads = res.data?.leads || [];
      if (empId === 'unassigned') {
        leads = leads.filter((l: Lead) => !l.stageId || !(l as any).assignedTo);
      }
      setEmployeeLeads(leads);
    } catch {
      setEmployeeLeads([]);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleReassign = async () => {
    if (!assignLeadId || !assignToUser) return;
    try {
      await leadApi.updateLead(assignLeadId, { assignedTo: assignToUser });
      showAlertMsg('success', 'Lead reassigned');
      setShowAssignModal(false);
      // Refresh both board and expanded leads
      loadData();
      if (expandedId) handleExpandEmployee(expandedId);
    } catch (error: any) {
      showAlertMsg('error', error.message || 'Failed to reassign');
    }
  };

  const openAssignModal = (leadId: string) => {
    setAssignLeadId(leadId);
    setAssignToUser('');
    setShowAssignModal(true);
  };

  const isOverdue = (date?: string) => {
    if (!date) return false;
    return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
  };

  const formatDate = (date?: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Compute totals
  const totalAll = employees.reduce((s, e) => s + e.totalLeads, 0);
  const totalFollowUps = employees.reduce((s, e) => s + e.todayFollowUps, 0);
  const totalOverdue = employees.reduce((s, e) => s + e.overdueFollowUps, 0);

  if (loading) {
    return <div className="manager-board"><div className="loading-spinner">Loading manager board...</div></div>;
  }

  return (
    <div className="manager-board">
      <div className="manager-board-header">
        <h1>Lead Manager Board</h1>
        <button className="btn-secondary" onClick={() => navigate('/leads')}>← All Leads</button>
      </div>

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Summary Stats */}
      <div className="mb-summary-stats">
        <div className="mb-stat-card">
          <div className="mb-stat-value">{totalAll}</div>
          <div className="mb-stat-label">Total Leads</div>
        </div>
        <div className="mb-stat-card">
          <div className="mb-stat-value">{employees.filter(e => e._id !== 'unassigned').length}</div>
          <div className="mb-stat-label">Team Members</div>
        </div>
        <div className="mb-stat-card mb-stat-warning">
          <div className="mb-stat-value">{totalFollowUps}</div>
          <div className="mb-stat-label">Today's Follow-ups</div>
        </div>
        <div className="mb-stat-card mb-stat-danger">
          <div className="mb-stat-value">{totalOverdue}</div>
          <div className="mb-stat-label">Overdue</div>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="mb-employee-list">
        {employees.length === 0 ? (
          <div className="empty-state">
            <h3>No staff members or leads found</h3>
            <p>Assign leads to staff from the All Leads page.</p>
          </div>
        ) : employees.map(emp => {
          const isExpanded = expandedId === emp._id;
          const activeStages = emp.stageBreakdown.filter(s => s.count > 0);
          return (
            <div className={`mb-employee-card ${isExpanded ? 'expanded' : ''}`} key={emp._id}>
              {/* Card Header */}
              <div className="mb-emp-header" onClick={() => handleExpandEmployee(emp._id)}>
                <div className="mb-emp-info">
                  <div className="mb-emp-avatar">
                    {emp._id === 'unassigned' ? '?' : emp.firstName[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div className="mb-emp-name">
                      {emp.firstName} {emp.lastName}
                      {emp.role && <span className="mb-emp-role">{emp.role.replace('_', ' ')}</span>}
                    </div>
                    {emp.email && <div className="mb-emp-email">{emp.email}</div>}
                  </div>
                </div>
                <div className="mb-emp-stats">
                  <div className="mb-emp-stat">
                    <span className="mb-emp-stat-val">{emp.totalLeads}</span>
                    <span className="mb-emp-stat-lbl">Leads</span>
                  </div>
                  <div className="mb-emp-stat">
                    <span className="mb-emp-stat-val mb-warn">{emp.todayFollowUps}</span>
                    <span className="mb-emp-stat-lbl">Follow-ups</span>
                  </div>
                  {emp.overdueFollowUps > 0 && (
                    <div className="mb-emp-stat">
                      <span className="mb-emp-stat-val mb-danger">{emp.overdueFollowUps}</span>
                      <span className="mb-emp-stat-lbl">Overdue</span>
                    </div>
                  )}
                  <span className="mb-emp-expand">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Stage Breakdown Bar */}
              {emp.totalLeads > 0 && (
                <div className="mb-stage-bar">
                  {emp.stageBreakdown.map(s => s.count > 0 ? (
                    <div
                      key={s.stageId}
                      className="mb-stage-segment"
                      style={{ width: `${(s.count / emp.totalLeads) * 100}%`, backgroundColor: s.color }}
                      title={`${s.name}: ${s.count}`}
                    />
                  ) : null)}
                </div>
              )}

              {/* Stage Tags */}
              <div className="mb-stage-tags">
                {activeStages.map(s => (
                  <span key={s.stageId} className="mb-stage-tag" style={{ borderColor: s.color, color: s.color }}>
                    <span className="mb-stage-tag-dot" style={{ backgroundColor: s.color }} />
                    {s.name}: {s.count}
                  </span>
                ))}
                {activeStages.length === 0 && (
                  <span className="mb-stage-tag" style={{ color: '#9ca3af', borderColor: '#e5e7eb' }}>No leads</span>
                )}
              </div>

              {/* Expanded: Lead List */}
              {isExpanded && (
                <div className="mb-emp-leads">
                  {loadingLeads ? (
                    <div className="mb-leads-loading">Loading leads...</div>
                  ) : employeeLeads.length === 0 ? (
                    <div className="mb-leads-loading">No leads assigned</div>
                  ) : (
                    <table className="mb-leads-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Phone</th>
                          <th>Source</th>
                          <th>Stage</th>
                          <th>Follow-up</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeLeads.map(lead => {
                          const stage = typeof lead.stageId === 'object' ? lead.stageId : null;
                          return (
                            <tr key={lead._id}>
                              <td>
                                <span className="mb-lead-name" onClick={() => navigate(`/leads/${lead._id}`)}>
                                  {lead.name}
                                </span>
                              </td>
                              <td>{lead.phone}</td>
                              <td>{lead.source?.replace(/_/g, ' ')}</td>
                              <td>
                                {stage && (
                                  <span className="mb-lead-stage" style={{ backgroundColor: stage.color + '20', color: stage.color, borderColor: stage.color }}>
                                    {stage.name}
                                  </span>
                                )}
                              </td>
                              <td>
                                {lead.nextFollowUp ? (
                                  <span className={isOverdue(lead.nextFollowUp) ? 'mb-overdue' : ''}>
                                    {formatDate(lead.nextFollowUp)}
                                    {isOverdue(lead.nextFollowUp) && ' ⚠'}
                                  </span>
                                ) : '-'}
                              </td>
                              <td>
                                <button className="btn-sm" onClick={() => openAssignModal(lead._id)}>Reassign</button>
                                <button className="btn-sm btn-sm-view" onClick={() => navigate(`/leads/${lead._id}`)}>View</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reassign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h2>Reassign Lead</h2>
            <div className="form-group">
              <label>Assign To</label>
              <select value={assignToUser} onChange={e => setAssignToUser(e.target.value)}>
                <option value="">-- Select Staff --</option>
                {employees.filter(e => e._id !== 'unassigned').map(e => (
                  <option key={e._id} value={e._id}>{e.firstName} {e.lastName}</option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleReassign} disabled={!assignToUser}>Reassign</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadManagerBoardPage;

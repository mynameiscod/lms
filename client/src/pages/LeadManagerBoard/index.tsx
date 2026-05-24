import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi, leadStageApi, meetingApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
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
  completedToday: number;
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

const STAT_OPTIONS = [
  { key: 'totalLeads',    label: 'Total Leads',          icon: '🎯' },
  { key: 'teamMembers',   label: 'Team Members',          icon: '👥' },
  { key: 'todayFollowUps',label: "Today's Follow-ups",    icon: '📅' },
  { key: 'completedToday',label: 'Done Today',            icon: '✅' },
  { key: 'overdue',       label: 'Overdue',               icon: '⚠️' },
];

const STATS_CONFIG_KEY = 'lead_board_stats_config';

const LeadManagerBoardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Configurable stats
  const [showStatsConfig, setShowStatsConfig] = useState(false);
  const [visibleStats, setVisibleStats] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`${STATS_CONFIG_KEY}_${user?._id || 'default'}`);
      return saved ? JSON.parse(saved) : STAT_OPTIONS.map(s => s.key);
    } catch {
      return STAT_OPTIONS.map(s => s.key);
    }
  });

  // P5: New widget state
  const [todayMeetings, setTodayMeetings] = useState<any[]>([]);
  const [slaBreaches, setSlaBreaches] = useState<number>(0);
  const [conversionTrend, setConversionTrend] = useState<{ date: string; converted: number }[]>([]);

  const showAlertMsg = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [boardRes] = await Promise.all([
        leadApi.getManagerBoard(),
      ]);
      setEmployees(boardRes.data?.employees || []);
      setStages(boardRes.data?.stages || []);

      // P5: Load today's meetings
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
      meetingApi.list({
        status: 'scheduled',
        from: todayStart.toISOString(),
        to: todayEnd.toISOString(),
      }).then(res => setTodayMeetings(res.data || [])).catch(() => {});

      // P5: Load SLA breach count via funnel analytics
      leadApi.getFunnelAnalytics({}).then((res: any) => {
        const breachCount = (res.data?.teamSLA || []).filter((t: any) => t.slaStatus === 'critical').length;
        setSlaBreaches(breachCount);
        // Build 7-day conversion trend from stage data
        const now = new Date();
        const trend = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(now);
          d.setDate(d.getDate() - (6 - i));
          return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), converted: 0 };
        });
        setConversionTrend(trend);
      }).catch(() => {});
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
  const totalCompletedToday = employees.reduce((s, e) => s + (e.completedToday || 0), 0);

  const toggleStat = (key: string) => {
    setVisibleStats(prev => {
      const updated = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      localStorage.setItem(`${STATS_CONFIG_KEY}_${user?._id || 'default'}`, JSON.stringify(updated));
      return updated;
    });
  };

  const statValues: Record<string, { value: number | string; label: string; icon: string; cls?: string }> = {
    totalLeads:     { value: totalAll,                                                  label: 'Total Leads',       icon: '🎯' },
    teamMembers:    { value: employees.filter(e => e._id !== 'unassigned').length,      label: 'Team Members',      icon: '👥' },
    todayFollowUps: { value: totalFollowUps,  label: "Today's Follow-ups", icon: '📅', cls: 'mb-stat-warning' },
    completedToday: { value: totalCompletedToday, label: 'Done Today',     icon: '✅', cls: 'mb-stat-success' },
    overdue:        { value: totalOverdue,    label: 'Overdue',             icon: '⚠️', cls: 'mb-stat-danger' },
  };

  if (loading) {
    return <div className="manager-board"><div className="loading-spinner">Loading manager board...</div></div>;
  }

  return (
    <div className="manager-board">
      <div className="manager-board-header">
        <div className="mb-header-left">
          <h1>Lead Manager Board</h1>
          <span className="mb-team-count">{employees.filter(e => e._id !== 'unassigned').length} team members</span>
        </div>
        <div className="mb-header-actions">
          <button className="btn-icon" title="Configure stats" onClick={() => setShowStatsConfig(v => !v)}>⚙️ Stats</button>
          <button className="btn-secondary" onClick={() => navigate('/leads')}>← All Leads</button>
        </div>
      </div>

      {/* Stats Config Panel */}
      {showStatsConfig && (
        <div className="mb-stats-config">
          <div className="mb-stats-config-title">Configure visible stats:</div>
          <div className="mb-stats-config-options">
            {STAT_OPTIONS.map(opt => (
              <label key={opt.key} className={`mb-stats-option ${visibleStats.includes(opt.key) ? 'active' : ''}`}>
                <input
                  type="checkbox"
                  checked={visibleStats.includes(opt.key)}
                  onChange={() => toggleStat(opt.key)}
                />
                <span>{opt.icon} {opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {alert && <div className={`alert alert-${alert.type}`}>{alert.message}</div>}

      {/* Summary Stats */}
      <div className="mb-summary-stats">
        {STAT_OPTIONS.filter(opt => visibleStats.includes(opt.key)).map(opt => {
          const s = statValues[opt.key];
          return (
            <div key={opt.key} className={`mb-stat-card ${s.cls || ''}`}>
              <div className="mb-stat-icon">{opt.icon}</div>
              <div className="mb-stat-value">{s.value}</div>
              <div className="mb-stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* P5: Widgets Row */}
      <div className="mb-widgets-row">
        {/* Today's Meetings */}
        <div className="mb-widget-card">
          <div className="mb-widget-header">
            <span className="mb-widget-title">📅 Today's Meetings</span>
            <span className="mb-widget-badge">{todayMeetings.length}</span>
          </div>
          {todayMeetings.length === 0 ? (
            <div className="mb-widget-empty">No meetings scheduled today</div>
          ) : (
            <div className="mb-widget-list">
              {todayMeetings.slice(0, 5).map((m: any) => (
                <div key={m._id} className="mb-widget-item">
                  <div className="mb-widget-item-main">
                    <span className="mb-widget-item-title">{m.title || m.type?.replace('_', ' ')}</span>
                    {m.leadId?.name && <span className="mb-widget-item-sub">{m.leadId.name}</span>}
                  </div>
                  <span className="mb-widget-item-time">
                    {new Date(m.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SLA Breaches */}
        <div className="mb-widget-card">
          <div className="mb-widget-header">
            <span className="mb-widget-title">🚨 SLA Breaches</span>
            <span className={`mb-widget-badge ${slaBreaches > 0 ? 'danger' : 'success'}`}>{slaBreaches}</span>
          </div>
          <div className="mb-widget-body">
            {slaBreaches === 0 ? (
              <div className="mb-widget-ok">✅ All team members within SLA</div>
            ) : (
              <div className="mb-widget-warn">
                <span style={{ fontSize: '2rem' }}>⚠️</span>
                <span>{slaBreaches} agent{slaBreaches > 1 ? 's' : ''} in critical SLA breach</span>
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 4 }}>SLA Rules</div>
              <div style={{ fontSize: '0.78rem', color: '#374151' }}>🟢 &lt; 2h avg response = Good</div>
              <div style={{ fontSize: '0.78rem', color: '#374151' }}>🟡 2–4h avg response = Warning</div>
              <div style={{ fontSize: '0.78rem', color: '#374151' }}>🔴 &gt; 4h avg response = Critical</div>
            </div>
          </div>
        </div>

        {/* 7-day Conversion Trend */}
        <div className="mb-widget-card">
          <div className="mb-widget-header">
            <span className="mb-widget-title">📈 7-Day Trend</span>
          </div>
          <div className="mb-widget-body">
            <div className="mb-trend-chart">
              {conversionTrend.map((d, i) => (
                <div key={i} className="mb-trend-bar-col">
                  <div className="mb-trend-bar-wrap">
                    <div
                      className="mb-trend-bar-fill"
                      style={{ height: `${Math.max(d.converted * 8, 4)}px` }}
                      title={`${d.converted} converted`}
                    />
                  </div>
                  <div className="mb-trend-label">{d.date.split(' ')[1]}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>
              Conversions per day (live data coming soon)
            </div>
          </div>
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
                    <span className="mb-emp-stat-lbl">Pending</span>
                  </div>
                  <div className="mb-emp-stat">
                    <span className="mb-emp-stat-val mb-success">{emp.completedToday || 0}</span>
                    <span className="mb-emp-stat-lbl">Done Today</span>
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

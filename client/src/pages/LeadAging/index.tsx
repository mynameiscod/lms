import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadApi } from '../../api';

interface AgingLead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  priority: 'hot' | 'warm' | 'cold';
  source?: string;
  daysStuck: number;
  stageId?: { _id: string; name: string; color?: string };
  assignedTo?: { firstName: string; lastName: string; email: string };
  updatedAt: string;
}

const URGENCY_CONFIG = [
  { maxDays: 3, label: 'Healthy', color: '#2e7d32', bg: '#e8f5e9', badge: 'success' },
  { maxDays: 7, label: 'Attention', color: '#e65100', bg: '#fff3e0', badge: 'warning' },
  { maxDays: 14, label: 'Critical', color: '#c62828', bg: '#ffebee', badge: 'danger' },
  { maxDays: Infinity, label: 'Dead', color: '#7b1fa2', bg: '#f3e5f5', badge: 'purple' },
];

const getUrgency = (days: number) => URGENCY_CONFIG.find(u => days <= u.maxDays) || URGENCY_CONFIG[3];

export default function LeadAgingPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<AgingLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(7);
  const [stageId, setStageId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leadApi.getAgingLeads({ days, stageId: stageId || undefined });
      const data = res?.data || res;
      setLeads(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [days, stageId]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    healthy: leads.filter(l => l.daysStuck <= 3).length,
    attention: leads.filter(l => l.daysStuck > 3 && l.daysStuck <= 7).length,
    critical: leads.filter(l => l.daysStuck > 7 && l.daysStuck <= 14).length,
    dead: leads.filter(l => l.daysStuck > 14).length,
  };

  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <div>
          <h4 className="mb-0 fw-bold">
            <i className="fas fa-hourglass-half me-2 text-warning" />
            Lead Aging Board
          </h4>
          <small className="text-muted">Leads stuck in the same stage longer than expected</small>
        </div>
        <div className="ms-auto d-flex gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 140 }}
            value={days}
            onChange={e => setDays(Number(e.target.value))}
          >
            <option value={3}>3+ days</option>
            <option value={7}>7+ days</option>
            <option value={14}>14+ days</option>
            <option value={30}>30+ days</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={load} disabled={loading}>
            <i className="fas fa-sync-alt me-1" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label: '≤3 Days', value: counts.healthy, color: '#2e7d32', bg: '#e8f5e9', icon: 'fa-check-circle' },
          { label: '4–7 Days', value: counts.attention, color: '#e65100', bg: '#fff3e0', icon: 'fa-exclamation-triangle' },
          { label: '8–14 Days', value: counts.critical, color: '#c62828', bg: '#ffebee', icon: 'fa-fire' },
          { label: '15+ Days', value: counts.dead, color: '#7b1fa2', bg: '#f3e5f5', icon: 'fa-skull-crossbones' },
        ].map(c => (
          <div className="col-6 col-md-3" key={c.label}>
            <div className="card border-0 h-100" style={{ background: c.bg }}>
              <div className="card-body text-center py-3">
                <i className={`fas ${c.icon} fa-2x mb-2`} style={{ color: c.color }} />
                <div className="fs-3 fw-bold" style={{ color: c.color }}>{c.value}</div>
                <div className="small text-muted">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom py-3">
          <span className="fw-semibold">
            {loading ? 'Loading…' : `${leads.length} leads found (stuck ≥ ${days} days)`}
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>Lead</th>
                <th>Stage</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Days Stuck</th>
                <th>Urgency</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <div className="spinner-border spinner-border-sm me-2" />
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted">
                    <i className="fas fa-smile fa-2x mb-2 d-block text-success" />
                    No aging leads found — great job!
                  </td>
                </tr>
              )}
              {!loading && leads.map(lead => {
                const urgency = getUrgency(lead.daysStuck);
                return (
                  <tr key={lead._id} style={{ background: urgency.bg + '44' }}>
                    <td>
                      <div className="fw-semibold">{lead.name}</div>
                      <small className="text-muted">{lead.phone}</small>
                    </td>
                    <td>
                      <span className="badge" style={{ background: lead.stageId?.color || '#6c757d', color: '#fff' }}>
                        {lead.stageId?.name || '—'}
                      </span>
                    </td>
                    <td>
                      {lead.assignedTo
                        ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
                        : <span className="text-muted">Unassigned</span>}
                    </td>
                    <td>
                      <span className={`badge bg-${lead.priority === 'hot' ? 'danger' : lead.priority === 'warm' ? 'warning text-dark' : 'secondary'}`}>
                        {lead.priority}
                      </span>
                    </td>
                    <td>
                      <span className="fw-bold" style={{ color: urgency.color }}>{lead.daysStuck}d</span>
                    </td>
                    <td>
                      <span className="badge rounded-pill px-3" style={{ background: urgency.color, color: '#fff' }}>
                        {urgency.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate(`/leads/${lead._id}`)}
                      >
                        <i className="fas fa-arrow-right me-1" />
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

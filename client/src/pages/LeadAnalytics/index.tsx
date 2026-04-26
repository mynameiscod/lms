import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { leadApi, userApi } from '../../api';
import './LeadAnalytics.css';

// ── Funnel analytics types (from /leads/funnel-analytics) ───────────────────
interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
  dropOffPct: number;
  isBottleneck: boolean;
  avgAgeDays: number;
}

interface SourcePerf {
  source: string;
  total: number;
  converted: number;
  hot: number;
  conversionRate: number;
  hotRate: number;
}

interface PriorityDist {
  priority: string;
  count: number;
}

interface CallOutcomeDist {
  outcome: string;
  count: number;
}

interface TeamSLA {
  _id: string;
  name: string;
  avgResponseHours: number;
  slaStatus: 'good' | 'warning' | 'critical';
}

interface FunnelData {
  summary: { totalLeads: number; converted: number; conversionRate: number };
  funnelStages: FunnelStage[];
  sourcePerformance: SourcePerf[];
  priorityDistribution: PriorityDist[];
  callOutcomes: CallOutcomeDist[];
  teamSLA: TeamSLA[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const fmt = (d: Date) => d.toISOString().split('T')[0];

const slaColor = (s: TeamSLA['slaStatus']) =>
  s === 'good' ? '#10b981' : s === 'warning' ? '#f59e0b' : '#ef4444';

const slaBadgeClass = (s: TeamSLA['slaStatus']) =>
  s === 'good' ? 'sla-good' : s === 'warning' ? 'sla-warning' : 'sla-critical';

// ── Component ────────────────────────────────────────────────────────────────
const LeadAnalytics: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FunnelData | null>(null);

  const [dateFrom, setDateFrom] = useState(fmt(firstOfMonth));
  const [dateTo, setDateTo] = useState(fmt(today));
  const [assignedTo, setAssignedTo] = useState('');
  const [teamMembers, setTeamMembers] = useState<{ _id: string; name: string }[]>([]);

  // Load team members for filter dropdown
  useEffect(() => {
    userApi.getUsers().then((res: any) => {
      const users = Array.isArray(res) ? res : res?.users ?? [];
      setTeamMembers(users.map((u: any) => ({ _id: u._id, name: u.name || u.firstName || u.email })));
    }).catch(() => {});
  }, []);

  const loadFunnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (assignedTo) params.assignedTo = assignedTo;
      const res = await (leadApi as any).getFunnelAnalytics(params);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load funnel analytics');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, assignedTo]);

  useEffect(() => {
    loadFunnel();
  }, [loadFunnel]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="lead-analytics">
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="lead-analytics">
        <div className="analytics-header"><h1>Lead Analytics</h1></div>
        <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
          {error || 'No data available'}
        </div>
      </div>
    );
  }

  const maxStageCount = Math.max(...(data.funnelStages.map(s => s.count)), 1);
  const maxOutcomeCount = Math.max(...(data.callOutcomes.map(o => o.count)), 1);

  return (
    <div className="lead-analytics">
      {/* ── Header + Filters ─────────────────────────────────────────────── */}
      <div className="analytics-header">
        <h1>Lead Funnel Analytics</h1>
        <div className="analytics-filters">
          <label>
            From
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
            <option value="">All Team Members</option>
            {teamMembers.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <button className="btn-export" onClick={loadFunnel}>Refresh</button>
        </div>
      </div>

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <div className="quick-stats">
        <div className="stat-card primary">
          <div className="stat-value">{data.summary.totalLeads}</div>
          <div className="stat-label">Total Leads</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{data.summary.converted}</div>
          <div className="stat-label">Converted</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{data.summary.conversionRate.toFixed(1)}%</div>
          <div className="stat-label">Conversion Rate</div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* ── Stage Funnel ──────────────────────────────────────────────── */}
        <div className="analytics-section full-width">
          <div className="section-header">
            <h2>Stage-by-Stage Funnel</h2>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Red badge = bottleneck (&gt;50% drop-off from previous stage)
            </span>
          </div>
          <div className="funnel-container">
            {data.funnelStages.map((stage) => (
              <div key={stage.stage} className="funnel-bar">
                <div className="funnel-label">
                  {stage.stage}
                  {stage.isBottleneck && (
                    <span className="bottleneck-badge">⚠ bottleneck</span>
                  )}
                </div>
                <div className="funnel-bar-wrapper">
                  <div
                    className={`funnel-bar-fill${stage.isBottleneck ? ' bottleneck' : ''}`}
                    style={{ width: `${(stage.count / maxStageCount) * 100}%` }}
                  >
                    {stage.count > 0 && <span>{stage.percentage.toFixed(1)}%</span>}
                  </div>
                </div>
                <div className="funnel-meta">
                  <span className="funnel-value">{stage.count}</span>
                  {stage.dropOffPct > 0 && (
                    <span className={`drop-off${stage.isBottleneck ? ' critical' : ''}`}>
                      ↓ {stage.dropOffPct.toFixed(1)}%
                    </span>
                  )}
                  <span className="avg-age">{stage.avgAgeDays.toFixed(1)}d avg</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Source Performance ────────────────────────────────────────── */}
        <div className="analytics-section">
          <div className="section-header"><h2>Source Performance</h2></div>
          <div className="section-body">
            <table className="source-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Total</th>
                  <th>Hot</th>
                  <th>Converted</th>
                  <th>Conv %</th>
                  <th>Hot %</th>
                </tr>
              </thead>
              <tbody>
                {data.sourcePerformance.map((src) => (
                  <tr key={src.source}>
                    <td>{src.source || '—'}</td>
                    <td>{src.total}</td>
                    <td>{src.hot}</td>
                    <td>{src.converted}</td>
                    <td>
                      <span className={`conv-badge ${src.conversionRate >= 20 ? 'high' : src.conversionRate >= 5 ? 'medium' : 'low'}`}>
                        {src.conversionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td>{src.hotRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Call Outcomes ────────────────────────────────────────────── */}
        <div className="analytics-section">
          <div className="section-header"><h2>Call Outcomes</h2></div>
          <div className="section-body">
            <div className="lost-reasons-chart">
              {data.callOutcomes.map((co) => (
                <div key={co.outcome} className="lost-reason-item">
                  <div className="lost-reason-label" style={{ minWidth: 130 }}>{co.outcome || 'unknown'}</div>
                  <div className="lost-reason-bar">
                    <div
                      className="lost-reason-bar-fill"
                      style={{ width: `${(co.count / maxOutcomeCount) * 100}%`, background: '#6366f1' }}
                    ></div>
                  </div>
                  <div className="lost-reason-value">{co.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Priority Distribution ─────────────────────────────────────── */}
        <div className="analytics-section">
          <div className="section-header"><h2>Priority Distribution</h2></div>
          <div className="section-body">
            <div className="lost-reasons-chart">
              {data.priorityDistribution.map((p) => {
                const color = p.priority === 'hot' ? '#ef4444' : p.priority === 'warm' ? '#f59e0b' : '#6b7280';
                const total = data.priorityDistribution.reduce((s, x) => s + x.count, 0) || 1;
                return (
                  <div key={p.priority} className="lost-reason-item">
                    <div className="lost-reason-color" style={{ background: color }}></div>
                    <div className="lost-reason-label">{p.priority}</div>
                    <div className="lost-reason-bar">
                      <div
                        className="lost-reason-bar-fill"
                        style={{ width: `${(p.count / total) * 100}%`, background: color }}
                      ></div>
                    </div>
                    <div className="lost-reason-value">{p.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Team SLA ──────────────────────────────────────────────────── */}
        <div className="analytics-section full-width">
          <div className="section-header">
            <h2>Team Response SLA</h2>
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Good ≤ 2h · Warning ≤ 8h · Critical &gt; 8h
            </span>
          </div>
          <div className="section-body">
            <table className="team-performance-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Avg First Response</th>
                  <th>SLA Status</th>
                </tr>
              </thead>
              <tbody>
                {data.teamSLA.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="team-member">
                        <div className="team-avatar">
                          {(member.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        {member.name}
                      </div>
                    </td>
                    <td>{member.avgResponseHours.toFixed(1)}h</td>
                    <td>
                      <span
                        className={`response-badge ${slaBadgeClass(member.slaStatus)}`}
                        style={{ color: slaColor(member.slaStatus), borderColor: slaColor(member.slaStatus) }}
                      >
                        {member.slaStatus.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadAnalytics;

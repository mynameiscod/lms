import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { leadApi } from '../../api';
import './LeadAnalytics.css';

interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
}

interface SourcePerformance {
  source: string;
  leads: number;
  qualified: number;
  converted: number;
  conversionRate: number;
}

interface Bottleneck {
  fromStage: string;
  toStage: string;
  dropOff: number;
  isWarning: boolean;
}

interface LostReason {
  reason: string;
  count: number;
  percentage: number;
  color: string;
}

interface TeamMember {
  _id: string;
  name: string;
  assigned: number;
  calls: number;
  qualified: number;
  avgResponseTime: number; // in minutes
  overdue: number;
}

interface AnalyticsData {
  summary: {
    totalLeads: number;
    totalCalls: number;
    qualified: number;
    demos: number;
    converted: number;
    conversionRate: number;
  };
  funnel: FunnelStage[];
  sourcePerformance: SourcePerformance[];
  bottlenecks: Bottleneck[];
  lostReasons: LostReason[];
  teamPerformance: TeamMember[];
  dailyLeads: { date: string; count: number }[];
}

const LeadAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [alertMsg, setAlertMsg] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const showAlertMsg = (type: 'success' | 'error' | 'info', message: string) => {
    setAlertMsg({ type, message });
    setTimeout(() => setAlertMsg(null), 3000);
  };
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [source, setSource] = useState('all');
  const [data, setData] = useState<AnalyticsData | null>(null);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      // Use mock data for now - analytics API endpoint can be added later
      setData(getMockData());
    } catch (error: any) {
      // If analytics endpoint doesn't exist yet, use mock data
      console.log('Using mock analytics data');
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }, [period, source]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const getMockData = (): AnalyticsData => ({
    summary: {
      totalLeads: 245,
      totalCalls: 512,
      qualified: 156,
      demos: 68,
      converted: 18,
      conversionRate: 7.3
    },
    funnel: [
      { name: 'New Leads', count: 245, percentage: 100 },
      { name: 'Qualified', count: 156, percentage: 63.7 },
      { name: 'Demo Scheduled', count: 68, percentage: 27.8 },
      { name: 'Demo Completed', count: 52, percentage: 21.2 },
      { name: 'Payment Ready', count: 28, percentage: 11.4 },
      { name: 'Enrolled', count: 18, percentage: 7.3 }
    ],
    sourcePerformance: [
      { source: 'Walk-in', leads: 25, qualified: 22, converted: 8, conversionRate: 32 },
      { source: 'Referral', leads: 18, qualified: 15, converted: 5, conversionRate: 28 },
      { source: 'Google Ads', leads: 85, qualified: 52, converted: 3, conversionRate: 3.5 },
      { source: 'Meta Ads', leads: 95, qualified: 48, converted: 2, conversionRate: 2.1 },
      { source: 'WhatsApp', leads: 22, qualified: 19, converted: 0, conversionRate: 0 }
    ],
    bottlenecks: [
      { fromStage: 'Qualified', toStage: 'Demo', dropOff: 56, isWarning: true },
      { fromStage: 'Payment Ready', toStage: 'Enrolled', dropOff: 35, isWarning: true },
      { fromStage: 'Demo', toStage: 'Payment Ready', dropOff: 46, isWarning: false }
    ],
    lostReasons: [
      { reason: 'Fee Issue', count: 45, percentage: 35, color: '#ef4444' },
      { reason: 'Competitor', count: 32, percentage: 25, color: '#f59e0b' },
      { reason: 'No Response', count: 26, percentage: 20, color: '#6b7280' },
      { reason: 'Timing Issue', count: 15, percentage: 12, color: '#3b82f6' },
      { reason: 'Other', count: 10, percentage: 8, color: '#8b5cf6' }
    ],
    teamPerformance: [
      { _id: '1', name: 'Priya Sharma', assigned: 45, calls: 128, qualified: 32, avgResponseTime: 12, overdue: 1 },
      { _id: '2', name: 'Rahul Verma', assigned: 38, calls: 95, qualified: 22, avgResponseTime: 28, overdue: 4 },
      { _id: '3', name: 'Amit Patel', assigned: 52, calls: 156, qualified: 38, avgResponseTime: 8, overdue: 0 }
    ],
    dailyLeads: [
      { date: 'Mon', count: 32 },
      { date: 'Tue', count: 45 },
      { date: 'Wed', count: 38 },
      { date: 'Thu', count: 52 },
      { date: 'Fri', count: 48 },
      { date: 'Sat', count: 18 },
      { date: 'Sun', count: 12 }
    ]
  });

  const getResponseBadgeClass = (minutes: number): string => {
    if (minutes <= 15) return 'fast';
    if (minutes <= 30) return 'normal';
    return 'slow';
  };

  const getConvBadgeClass = (rate: number): string => {
    if (rate >= 20) return 'high';
    if (rate >= 5) return 'medium';
    return 'low';
  };

  const handleExport = () => {
    showAlertMsg('info', 'Export functionality coming soon');
  };

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

  if (!data) {
    return (
      <div className="lead-analytics">
        <p>Unable to load analytics data</p>
      </div>
    );
  }

  // Safe access to arrays with fallbacks
  const funnel = data.funnel || [];
  const sourcePerformance = data.sourcePerformance || [];
  const bottlenecks = data.bottlenecks || [];
  const lostReasons = data.lostReasons || [];
  const teamPerformance = data.teamPerformance || [];
  const dailyLeads = data.dailyLeads || [];
  
  const maxDailyLead = dailyLeads.length > 0 ? Math.max(...dailyLeads.map(d => d.count)) : 1;

  return (
    <div className="lead-analytics">
      <div className="analytics-header">
        <h1>Lead Analytics</h1>
        <div className="analytics-filters">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All Sources</option>
            <option value="google_ads">Google Ads</option>
            <option value="meta">Meta Ads</option>
            <option value="walkin">Walk-in</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
          </select>
        </div>
        <div className="analytics-actions">
          <button className="btn-export" onClick={handleExport}>
            📊 Export Report
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="stat-card primary">
          <div className="stat-value">{data.summary.totalLeads}</div>
          <div className="stat-label">Total Leads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.summary.totalCalls}</div>
          <div className="stat-label">Total Calls</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.summary.qualified}</div>
          <div className="stat-label">Qualified</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{data.summary.demos}</div>
          <div className="stat-label">Demos Scheduled</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{data.summary.converted}</div>
          <div className="stat-label">Converted</div>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Conversion Funnel */}
        <div className="analytics-section">
          <div className="section-header">
            <h2>Conversion Funnel</h2>
          </div>
          <div className="funnel-container">
            {funnel.map((stage, index) => (
              <div key={stage.name} className="funnel-bar">
                <div className="funnel-label">{stage.name}</div>
                <div className="funnel-bar-wrapper">
                  <div 
                    className="funnel-bar-fill" 
                    style={{ width: `${stage.percentage}%` }}
                  >
                    {stage.percentage >= 20 && <span>{stage.percentage.toFixed(1)}%</span>}
                  </div>
                </div>
                <div className="funnel-value">{stage.count}</div>
              </div>
            ))}
            <div className="funnel-summary">
              Overall Conversion: <strong>{data.summary.conversionRate}%</strong>
            </div>
          </div>
        </div>

        {/* Source Performance */}
        <div className="analytics-section">
          <div className="section-header">
            <h2>Source Performance</h2>
          </div>
          <div className="section-body">
            <table className="source-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Leads</th>
                  <th>Qualified</th>
                  <th>Converted</th>
                  <th>Conv. %</th>
                </tr>
              </thead>
              <tbody>
                {sourcePerformance.map((src) => (
                  <tr key={src.source}>
                    <td>{src.source}</td>
                    <td>{src.leads}</td>
                    <td>{src.qualified}</td>
                    <td>{src.converted}</td>
                    <td>
                      <span className={`conv-badge ${getConvBadgeClass(src.conversionRate)}`}>
                        {src.conversionRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stage Bottlenecks */}
        <div className="analytics-section">
          <div className="section-header">
            <h2>Stage Bottlenecks</h2>
          </div>
          <div className="section-body">
            <ul className="bottleneck-list">
              {bottlenecks.map((bn, index) => (
                <li key={index} className="bottleneck-item">
                  <div className={`bottleneck-icon ${bn.isWarning ? 'warning' : 'success'}`}>
                    {bn.isWarning ? '⚠️' : '✓'}
                  </div>
                  <div className="bottleneck-info">
                    <div className="bottleneck-title">{bn.fromStage} → {bn.toStage}</div>
                    <div className="bottleneck-detail">
                      {bn.isWarning ? 'High drop-off detected' : 'Good conversion rate'}
                    </div>
                  </div>
                  <div className={`bottleneck-value ${bn.isWarning ? 'warning' : 'success'}`}>
                    {bn.dropOff}% {bn.isWarning ? 'drop' : 'conv.'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Lost Reasons */}
        <div className="analytics-section">
          <div className="section-header">
            <h2>Lost Reasons</h2>
          </div>
          <div className="section-body">
            <div className="lost-reasons-chart">
              {lostReasons.map((reason) => (
                <div key={reason.reason} className="lost-reason-item">
                  <div className="lost-reason-color" style={{ background: reason.color }}></div>
                  <div className="lost-reason-label">{reason.reason}</div>
                  <div className="lost-reason-bar">
                    <div 
                      className="lost-reason-bar-fill" 
                      style={{ width: `${reason.percentage}%`, background: reason.color }}
                    ></div>
                  </div>
                  <div className="lost-reason-value">{reason.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Team Performance */}
        <div className="analytics-section full-width">
          <div className="section-header">
            <h2>Team Performance</h2>
          </div>
          <div className="section-body">
            <table className="team-performance-table">
              <thead>
                <tr>
                  <th>Team Member</th>
                  <th>Assigned</th>
                  <th>Calls</th>
                  <th>Qualified</th>
                  <th>Avg Response</th>
                  <th>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <div className="team-member">
                        <div className="team-avatar">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        {member.name}
                      </div>
                    </td>
                    <td>{member.assigned}</td>
                    <td>{member.calls}</td>
                    <td>{member.qualified}</td>
                    <td>
                      <span className={`response-badge ${getResponseBadgeClass(member.avgResponseTime)}`}>
                        {member.avgResponseTime} min
                        {member.avgResponseTime <= 15 && ' ✓'}
                      </span>
                    </td>
                    <td>
                      {member.overdue > 0 ? (
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>
                          {member.overdue} ⚠️
                        </span>
                      ) : (
                        <span style={{ color: '#10b981' }}>0 ✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Daily Leads Chart */}
        <div className="analytics-section full-width">
          <div className="section-header">
            <h2>Leads This Week</h2>
          </div>
          <div className="section-body">
            <div className="timeline-chart">
              {dailyLeads.map((day) => (
                <div 
                  key={day.date} 
                  className="timeline-bar"
                  style={{ height: `${(day.count / maxDailyLead) * 100}%` }}
                >
                  <span className="bar-value">{day.count}</span>
                  <span className="bar-label">{day.date}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadAnalytics;

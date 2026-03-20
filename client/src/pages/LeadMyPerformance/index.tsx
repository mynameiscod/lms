import React, { useState, useEffect } from 'react';
import { leadApi } from '../../api';
import './LeadMyPerformance.css';

// Matches actual API response from getMyPerformance controller
interface PerformanceData {
  totalAssigned: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  todayActivities: number;
  weekActivities: number;
  monthActivities: number;
  stageBreakdown: { stageId: string; name: string; count: number }[];
  recentActivities: { leadName: string; leadId: string; activity: { type: string; description?: string; createdAt: string } }[];
}

const ACTIVITY_ICONS: Record<string, string> = {
  call: '📞',
  note: '📝',
  email: '📧',
  whatsapp: '💬',
  status_change: '🔄',
  assignment: '👤',
  created: '✅',
};

const LeadMyPerformancePage: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await leadApi.getMyPerformance();
        // authenticatedFetch returns parsed JSON directly, not a Response object
        if (!res.success) throw new Error(res.message || 'Failed to fetch performance');
        setData(res.data);
      } catch (err: any) {
        setError(err.message || 'Error loading performance data');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) return <div className="perf-loading">⏳ Loading performance data...</div>;
  if (error) return (
    <div className="perf-error-container">
      <div className="perf-error-icon">⚠️</div>
      <div className="perf-error">{error}</div>
      <button className="perf-retry-btn" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
  if (!data) return null;

  const completionRate = data.totalAssigned > 0
    ? Math.round(((data.stageBreakdown.find(s => s.name?.toLowerCase().includes('convert'))?.count || 0) / data.totalAssigned) * 100)
    : 0;

  return (
    <div className="perf-page">
      <div className="perf-header">
        <div>
          <h2>📊 My Performance</h2>
          <p className="perf-subtitle">Track your lead activities and follow-up progress</p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="perf-stats-grid">
        <div className="perf-stat-card">
          <div className="perf-stat-icon">👥</div>
          <span className="perf-stat-value">{data.totalAssigned}</span>
          <span className="perf-stat-label">Total Leads Assigned</span>
        </div>
        <div className="perf-stat-card highlight-warn">
          <div className="perf-stat-icon">📅</div>
          <span className="perf-stat-value">{data.todayFollowUps}</span>
          <span className="perf-stat-label">Today's Follow-ups</span>
          {data.todayFollowUps > 0 && <span className="perf-stat-badge warn">Due Today</span>}
        </div>
        <div className="perf-stat-card highlight-danger">
          <div className="perf-stat-icon">⚠️</div>
          <span className="perf-stat-value">{data.overdueFollowUps}</span>
          <span className="perf-stat-label">Overdue Follow-ups</span>
          {data.overdueFollowUps > 0 && <span className="perf-stat-badge danger">Action Required</span>}
        </div>
        <div className="perf-stat-card highlight-success">
          <div className="perf-stat-icon">🎯</div>
          <span className="perf-stat-value">{completionRate}%</span>
          <span className="perf-stat-label">Conversion Rate</span>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="perf-section">
        <h3>⚡ Activity Summary</h3>
        <div className="perf-activity-summary">
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.todayActivities}</span>
            <span className="perf-activity-label">Today</span>
          </div>
          <div className="perf-activity-divider" />
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.weekActivities}</span>
            <span className="perf-activity-label">This Week</span>
          </div>
          <div className="perf-activity-divider" />
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.monthActivities}</span>
            <span className="perf-activity-label">This Month</span>
          </div>
        </div>
        {/* Activity progress bar */}
        {data.monthActivities > 0 && (
          <div className="perf-activity-bar-container">
            <div className="perf-activity-bar">
              <div className="perf-activity-fill" style={{ width: `${Math.min((data.weekActivities / Math.max(data.monthActivities, 1)) * 100, 100)}%` }} />
            </div>
            <span className="perf-activity-bar-label">{Math.round((data.weekActivities / data.monthActivities) * 100)}% of monthly in this week</span>
          </div>
        )}
      </div>

      <div className="perf-two-col">
        {/* Stage Breakdown */}
        <div className="perf-section">
          <h3>📊 Lead Stage Breakdown</h3>
          {data.stageBreakdown.length === 0 ? (
            <p className="perf-empty">No leads assigned yet</p>
          ) : (
            <div className="perf-stage-list">
              {data.stageBreakdown.map((s, i) => (
                <div key={i} className="perf-stage-item">
                  <div className="perf-stage-info">
                    <span className="perf-stage-dot" />
                    <span className="perf-stage-name">{s.name}</span>
                  </div>
                  <div className="perf-stage-bar-wrap">
                    <div
                      className="perf-stage-bar-fill"
                      style={{ width: `${data.totalAssigned > 0 ? Math.round((s.count / data.totalAssigned) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="perf-stage-count">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="perf-section">
          <h3>🕐 Recent Activities</h3>
          <div className="perf-recent-list">
            {data.recentActivities.length === 0 && <p className="perf-empty">No recent activities</p>}
            {data.recentActivities.map((item, i) => (
              <div key={i} className="perf-recent-item">
                <span className="perf-recent-icon">
                  {ACTIVITY_ICONS[item.activity?.type] || '📋'}
                </span>
                <div className="perf-recent-content">
                  <span className="perf-recent-type">{item.activity?.type?.replace('_', ' ') || 'activity'}</span>
                  <span className="perf-recent-desc">
                    {item.activity?.description ? `${item.activity.description} — ` : ''}
                    <em>{item.leadName}</em>
                  </span>
                </div>
                <span className="perf-recent-time">
                  {item.activity?.createdAt ? new Date(item.activity.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadMyPerformancePage;

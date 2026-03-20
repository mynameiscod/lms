import React, { useState, useEffect } from 'react';
import { leadApi } from '../../api';
import './LeadMyPerformance.css';

interface PerformanceData {
  totalAssigned: number;
  todayFollowUps: number;
  overdueFollowUps: number;
  activityCounts: { today: number; week: number; month: number };
  stageBreakdown: { stageName: string; stageColor: string; count: number }[];
  recentActivities: { type: string; description: string; leadName: string; createdAt: string }[];
}

const LeadMyPerformancePage: React.FC = () => {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPerformance = async () => {
      try {
        const res = await leadApi.getMyPerformance();
        if (!res.ok) throw new Error('Failed to fetch performance');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Error loading performance data');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, []);

  if (loading) return <div className="perf-loading">Loading performance data...</div>;
  if (error) return <div className="perf-error">{error}</div>;
  if (!data) return null;

  return (
    <div className="perf-page">
      <h2>My Performance</h2>

      <div className="perf-stats-grid">
        <div className="perf-stat-card">
          <span className="perf-stat-value">{data.totalAssigned}</span>
          <span className="perf-stat-label">Total Leads Assigned</span>
        </div>
        <div className="perf-stat-card highlight-warn">
          <span className="perf-stat-value">{data.todayFollowUps}</span>
          <span className="perf-stat-label">Today's Follow-ups</span>
        </div>
        <div className="perf-stat-card highlight-danger">
          <span className="perf-stat-value">{data.overdueFollowUps}</span>
          <span className="perf-stat-label">Overdue Follow-ups</span>
        </div>
      </div>

      <div className="perf-section">
        <h3>Activity Summary</h3>
        <div className="perf-activity-summary">
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.activityCounts.today}</span>
            <span>Today</span>
          </div>
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.activityCounts.week}</span>
            <span>This Week</span>
          </div>
          <div className="perf-activity-period">
            <span className="perf-activity-count">{data.activityCounts.month}</span>
            <span>This Month</span>
          </div>
        </div>
      </div>

      <div className="perf-two-col">
        <div className="perf-section">
          <h3>Lead Stage Breakdown</h3>
          <div className="perf-stage-list">
            {data.stageBreakdown.map((s, i) => (
              <div key={i} className="perf-stage-item">
                <span className="perf-stage-dot" style={{ backgroundColor: s.stageColor }} />
                <span className="perf-stage-name">{s.stageName}</span>
                <span className="perf-stage-count">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="perf-section">
          <h3>Recent Activities</h3>
          <div className="perf-recent-list">
            {data.recentActivities.length === 0 && <p className="perf-empty">No recent activities</p>}
            {data.recentActivities.map((a, i) => (
              <div key={i} className="perf-recent-item">
                <span className="perf-recent-type">{a.type}</span>
                <span className="perf-recent-desc">{a.description} — <em>{a.leadName}</em></span>
                <span className="perf-recent-time">{new Date(a.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeadMyPerformancePage;

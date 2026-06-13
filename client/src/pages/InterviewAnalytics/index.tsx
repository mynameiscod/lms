import React, { useState, useEffect } from 'react';
import { interviewAnalyticsApi, interviewTemplateApi } from '../../api/interviewModuleApi';
import './InterviewAnalytics.css';

const InterviewAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [filterTemplate, setFilterTemplate] = useState('');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    interviewTemplateApi.getAll({ limit: 100 }).then(res => setTemplates(res.templates || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const params: any = {};
        if (filterTemplate) params.templateId = filterTemplate;
        if (dateRange.from) params.dateFrom = dateRange.from;
        if (dateRange.to) params.dateTo = dateRange.to;
        const res = await interviewAnalyticsApi.getAdminAnalytics();
        setAnalytics(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAnalytics();
  }, [filterTemplate, dateRange]);

  if (loading) return <div className="ianalytics-loading">Loading analytics...</div>;
  if (!analytics) return <div className="ianalytics-empty">No analytics data available.</div>;

  return (
    <div className="ianalytics-container">
      <div className="ianalytics-header">
        <h1>Interview Analytics Dashboard</h1>
        <p className="ianalytics-subtitle">Overview of interview performance across your institution</p>
      </div>

      <div className="ianalytics-filters">
        <select value={filterTemplate} onChange={e => setFilterTemplate(e.target.value)}>
          <option value="">All Templates</option>
          {templates.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}
        </select>
        <input type="date" value={dateRange.from} onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))} />
        <span>to</span>
        <input type="date" value={dateRange.to} onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))} />
      </div>

      {/* Summary Cards */}
      <div className="ianalytics-cards">
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">Total Attempts</span>
          <span className="ianalytics-card-value">{analytics.totalAttempts || 0}</span>
        </div>
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">Completed</span>
          <span className="ianalytics-card-value">{analytics.completedAttempts || 0}</span>
        </div>
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">Average Score</span>
          <span className="ianalytics-card-value">{analytics.averageScore?.toFixed(1) || 0}%</span>
        </div>
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">Pass Rate</span>
          <span className="ianalytics-card-value">{analytics.passRate?.toFixed(1) || 0}%</span>
        </div>
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">Avg Duration</span>
          <span className="ianalytics-card-value">{analytics.averageDuration?.toFixed(0) || 0} min</span>
        </div>
        <div className="ianalytics-card">
          <span className="ianalytics-card-label">AI Cost (total)</span>
          <span className="ianalytics-card-value">${Number(analytics.aiTotalCost || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Score Distribution */}
      {analytics.scoreDistribution && (
        <div className="ianalytics-section">
          <h2>Score Distribution</h2>
          <div className="ianalytics-distribution">
            {Object.entries(analytics.scoreDistribution as Record<string, number>).map(([range, count]) => (
              <div key={range} className="ianalytics-dist-bar">
                <span className="ianalytics-dist-label">{range}</span>
                <div className="ianalytics-dist-fill-wrap">
                  <div
                    className="ianalytics-dist-fill"
                    style={{ width: `${Math.min(100, ((count as number) / Math.max(1, analytics.totalAttempts)) * 100 * 3)}%` }}
                  />
                </div>
                <span className="ianalytics-dist-count">{count as number}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category-wise Averages */}
      {analytics.categoryAverages && (
        <div className="ianalytics-section">
          <h2>Category-wise Average Scores</h2>
          <div className="ianalytics-category-grid">
            {Object.entries(analytics.categoryAverages as Record<string, any>).map(([category, scores]) => (
              <div key={category} className="ianalytics-category-card">
                <h3>{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
                {typeof scores === 'object' && scores !== null && Object.entries(scores as Record<string, number>).map(([metric, value]) => (
                  <div key={metric} className="ianalytics-metric-row">
                    <span>{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <div className="ianalytics-metric-bar-wrap">
                      <div className="ianalytics-metric-bar" style={{ width: `${Math.min(100, (value as number) * 10)}%` }} />
                    </div>
                    <span className="ianalytics-metric-val">{(value as number)?.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top & Low Performers */}
      <div className="ianalytics-performers-wrap">
        {analytics.topPerformers && analytics.topPerformers.length > 0 && (
          <div className="ianalytics-section ianalytics-half">
            <h2>Top Performers</h2>
            <table className="ianalytics-perf-table">
              <thead><tr><th>Student</th><th>Score</th><th>Attempts</th></tr></thead>
              <tbody>
                {analytics.topPerformers.map((p: any, i: number) => (
                  <tr key={i}>
                    <td>{p.studentName || p.studentId}</td>
                    <td><strong>{p.bestScore?.toFixed(1)}%</strong></td>
                    <td>{p.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {analytics.lowPerformers && analytics.lowPerformers.length > 0 && (
          <div className="ianalytics-section ianalytics-half">
            <h2>Students Needing Support</h2>
            <table className="ianalytics-perf-table">
              <thead><tr><th>Student</th><th>Score</th><th>Attempts</th></tr></thead>
              <tbody>
                {analytics.lowPerformers.map((p: any, i: number) => (
                  <tr key={i}>
                    <td>{p.studentName || p.studentId}</td>
                    <td><strong>{p.bestScore?.toFixed(1)}%</strong></td>
                    <td>{p.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section-wise Scores */}
      {analytics.sectionAverages && analytics.sectionAverages.length > 0 && (
        <div className="ianalytics-section">
          <h2>Section-wise Performance</h2>
          <div className="ianalytics-section-scores">
            {analytics.sectionAverages.map((sec: any, i: number) => (
              <div key={i} className="ianalytics-sec-card">
                <h4>{sec.sectionTitle || `Section ${i + 1}`}</h4>
                <div className="ianalytics-sec-score">{sec.averageScore?.toFixed(1)}%</div>
                <span className="ianalytics-sec-type">{sec.sectionType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewAnalytics;

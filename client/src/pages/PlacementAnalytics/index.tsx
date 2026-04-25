import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, Legend,
} from 'recharts';
import { placementDriveApi } from '../../api';
import './PlacementAnalytics.css';

const COLORS = ['#6650d8', '#38bdf8', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981', '#f97316'];

interface Analytics {
  summary: { totalDrives: number; totalApplicants: number; totalPlaced: number; totalShortlisted: number; totalSelected: number };
  offersByCompany: { company: string; offers: number }[];
  pipeline: { stage: string; count: number }[];
  monthlyTrends: { month: string; drives: number; placed: number }[];
  ctcDistribution: { range: string; count: number }[];
  statusCounts: Record<string, number>;
}

const PlacementAnalytics: React.FC = () => {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await placementDriveApi.getAnalytics();
        const json = await res.json();
        if (json.success) setData(json.data);
        else setError(json.message || 'Failed to load');
      } catch {
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="pa-loading"><div className="spinner-border text-primary" /></div>;
  if (error) return <div className="alert alert-danger m-4">{error}</div>;
  if (!data) return null;

  const placementRate = data.summary.totalApplicants > 0
    ? ((data.summary.totalPlaced / data.summary.totalApplicants) * 100).toFixed(1)
    : '0';

  return (
    <div className="pa-container">
      <div className="pa-header">
        <h4 className="pa-title">Placement Analytics</h4>
        <p className="pa-subtitle">College-wide placement performance overview</p>
      </div>

      {/* Summary Cards */}
      <div className="pa-summary-row">
        {[
          { label: 'Total Drives', value: data.summary.totalDrives, color: 'primary' },
          { label: 'Total Applicants', value: data.summary.totalApplicants, color: 'info' },
          { label: 'Shortlisted', value: data.summary.totalShortlisted, color: 'warning' },
          { label: 'Placed', value: data.summary.totalPlaced, color: 'success' },
          { label: 'Placement Rate', value: `${placementRate}%`, color: 'secondary' },
        ].map(c => (
          <div key={c.label} className={`pa-stat-card pa-stat-${c.color}`}>
            <div className="pa-stat-value">{c.value}</div>
            <div className="pa-stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="pa-grid">
        {/* Offers by Company */}
        <div className="pa-card">
          <h6 className="pa-card-title">Offers by Company</h6>
          {data.offersByCompany.length === 0 ? (
            <div className="pa-empty">No placement data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.offersByCompany} margin={{ left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="company" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="offers" name="Placed" radius={[4, 4, 0, 0]}>
                  {data.offersByCompany.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* CTC Distribution */}
        <div className="pa-card">
          <h6 className="pa-card-title">CTC Distribution (Placed Students)</h6>
          {data.ctcDistribution.every(d => d.count === 0) ? (
            <div className="pa-empty">No CTC data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.ctcDistribution.filter(d => d.count > 0)}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {data.ctcDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pipeline Funnel */}
        <div className="pa-card">
          <h6 className="pa-card-title">Recruitment Pipeline</h6>
          <div className="pa-funnel">
            {data.pipeline.map((stage, i) => {
              const maxCount = data.pipeline[0].count || 1;
              const width = Math.max(30, (stage.count / maxCount) * 100);
              return (
                <div key={stage.stage} className="pa-funnel-row">
                  <div
                    className="pa-funnel-bar"
                    style={{ width: `${width}%`, backgroundColor: COLORS[i] }}
                  >
                    <span className="pa-funnel-label">{stage.stage}</span>
                    <span className="pa-funnel-count">{stage.count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Trends */}
        <div className="pa-card pa-card-wide">
          <h6 className="pa-card-title">Monthly Trends (Last 12 Months)</h6>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.monthlyTrends} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="drives" name="Drives" stroke="#6650d8" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="placed" name="Placed" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Drive Status breakdown */}
        <div className="pa-card">
          <h6 className="pa-card-title">Drive Status Breakdown</h6>
          <div className="pa-status-list">
            {Object.entries(data.statusCounts).map(([status, count]) => (
              <div key={status} className="pa-status-row">
                <span className={`badge pa-badge-${status}`}>{status}</span>
                <div className="pa-status-bar-wrap">
                  <div
                    className="pa-status-bar"
                    style={{
                      width: `${Math.max(4, (count / data.summary.totalDrives) * 100)}%`,
                      backgroundColor: status === 'completed' ? '#22c55e' : status === 'ongoing' ? '#6650d8' : status === 'upcoming' ? '#38bdf8' : '#ef4444',
                    }}
                  />
                </div>
                <span className="pa-status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlacementAnalytics;

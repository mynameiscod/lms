import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { marketingAPI, DashboardStats, CompetitorAd } from '../../api/marketingAPI';
import './Marketing.css';

const COLORS = ['#005897', '#0088cc', '#00b4d8', '#48cae4', '#90e0ef', '#ade8f4', '#caf0f8', '#e0f7ff'];

const MarketingDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await marketingAPI.getDashboardStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="marketing-page">
        <div className="marketing-loading"><div className="spinner"></div><p>Loading dashboard...</p></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="marketing-page">
        <div className="marketing-empty">
          <h2>📊 Marketing Intelligence Dashboard</h2>
          <p>No data yet. Start by adding competitors and capturing their ads.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>📊 Marketing Intelligence Dashboard</h1>
        <p className="marketing-subtitle">Analyze competitor marketing & generate better content for CodeBegun</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-icon">🏢</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalCompetitors}</span>
            <span className="stat-label">Competitors</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📢</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalAds}</span>
            <span className="stat-label">Ads Captured</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🧠</div>
          <div className="stat-info">
            <span className="stat-value">{stats.totalInsights}</span>
            <span className="stat-label">Insights Generated</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📱</div>
          <div className="stat-info">
            <span className="stat-value">{stats.adsByPlatform.length}</span>
            <span className="stat-label">Platforms Tracked</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Hook Patterns */}
        <div className="chart-card">
          <h3>🎣 Most Common Hooks</h3>
          {stats.topHooks.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.topHooks.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={180} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#005897" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No hook data yet. Analyze some ads first.</p>
          )}
        </div>

        {/* Platform Distribution */}
        <div className="chart-card">
          <h3>📱 Ads by Platform</h3>
          {stats.adsByPlatform.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={stats.adsByPlatform} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="count" label={({ name, value }: any) => `${name}: ${value}`}>
                  {stats.adsByPlatform.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No platform data yet.</p>
          )}
        </div>

        {/* Top CTAs */}
        <div className="chart-card">
          <h3>🎯 Most Common CTAs</h3>
          {stats.topCTAs.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.topCTAs.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#00b4d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No CTA data yet.</p>
          )}
        </div>

        {/* Top Pain Points */}
        <div className="chart-card">
          <h3>💢 Top Pain Points Targeted</h3>
          {stats.topPainPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.topPainPoints.slice(0, 6)} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={200} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#48cae4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="chart-empty">No pain point data yet.</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>🕐 Recent Competitor Activity</h3>
        {stats.recentAds.length > 0 ? (
          <div className="activity-list">
            {stats.recentAds.map((ad: any) => (
              <div key={ad._id} className="activity-item">
                <div className="activity-platform">{getPlatformIcon(ad.platform)}</div>
                <div className="activity-content">
                  <strong>{ad.headline}</strong>
                  <span className="activity-meta">
                    {ad.competitorId?.name || 'Unknown'} • {ad.platform} • {new Date(ad.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className={`activity-badge ${ad.isAnalyzed ? 'analyzed' : 'pending'}`}>
                  {ad.isAnalyzed ? '✅ Analyzed' : '⏳ Pending'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="chart-empty">No ads captured yet. Go to Ad Capture to add competitor ads.</p>
        )}
      </div>
    </div>
  );
};

function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    Facebook: '📘', Instagram: '📸', LinkedIn: '💼', 'Google Ads': '🔍',
    YouTube: '▶️', Twitter: '🐦', WhatsApp: '💬', Other: '🌐',
  };
  return icons[platform] || '🌐';
}

export default MarketingDashboard;

import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { marketingAPI, DashboardStats } from '../../api/marketingAPI';
import './Marketing.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

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

  const hookChartData = {
    labels: stats.topHooks.slice(0, 6).map(h => h.name),
    datasets: [{
      label: 'Count',
      data: stats.topHooks.slice(0, 6).map(h => h.count),
      backgroundColor: '#005897',
      borderRadius: 4,
    }]
  };

  const platformChartData = {
    labels: stats.adsByPlatform.map(p => p.name),
    datasets: [{
      data: stats.adsByPlatform.map(p => p.count),
      backgroundColor: COLORS.slice(0, stats.adsByPlatform.length),
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

  const ctaChartData = {
    labels: stats.topCTAs.slice(0, 6).map(c => c.name),
    datasets: [{
      label: 'Count',
      data: stats.topCTAs.slice(0, 6).map(c => c.count),
      backgroundColor: '#00b4d8',
      borderRadius: 4,
    }]
  };

  const painPointChartData = {
    labels: stats.topPainPoints.slice(0, 6).map(p => p.name),
    datasets: [{
      label: 'Count',
      data: stats.topPainPoints.slice(0, 6).map(p => p.count),
      backgroundColor: '#48cae4',
      borderRadius: 4,
    }]
  };

  const barOptions: any = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  const verticalBarOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  const doughnutOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
    cutout: '55%',
  };

  return (
    <div className="marketing-page">
      <div className="marketing-header">
        <h1>📊 Marketing Intelligence Dashboard</h1>
        <p className="marketing-subtitle">Analyze competitor marketing & generate better content for CodeBegun</p>
      </div>

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

      <div className="charts-grid">
        <div className="chart-card">
          <h3>🎣 Most Common Hooks</h3>
          {stats.topHooks.length > 0 ? (
            <div style={{ height: 280 }}><Bar data={hookChartData} options={barOptions} /></div>
          ) : (
            <p className="chart-empty">No hook data yet. Analyze some ads first.</p>
          )}
        </div>

        <div className="chart-card">
          <h3>📱 Ads by Platform</h3>
          {stats.adsByPlatform.length > 0 ? (
            <div style={{ height: 280 }}><Doughnut data={platformChartData} options={doughnutOptions} /></div>
          ) : (
            <p className="chart-empty">No platform data yet.</p>
          )}
        </div>

        <div className="chart-card">
          <h3>🎯 Most Common CTAs</h3>
          {stats.topCTAs.length > 0 ? (
            <div style={{ height: 280 }}><Bar data={ctaChartData} options={verticalBarOptions} /></div>
          ) : (
            <p className="chart-empty">No CTA data yet.</p>
          )}
        </div>

        <div className="chart-card">
          <h3>💢 Top Pain Points Targeted</h3>
          {stats.topPainPoints.length > 0 ? (
            <div style={{ height: 280 }}><Bar data={painPointChartData} options={barOptions} /></div>
          ) : (
            <p className="chart-empty">No pain point data yet.</p>
          )}
        </div>
      </div>

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

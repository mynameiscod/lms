import React, { useState, useEffect } from 'react';
import {
  getCampaignDashboard,
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  updateCampaignMetrics,
  AdCampaign,
  CampaignDashboardData
} from '../../api/campaignAPI';
import './Marketing.css';

const PLATFORMS = ['Facebook', 'Instagram', 'Google', 'LinkedIn', 'YouTube', 'WhatsApp', 'Twitter', 'Other'];
const STATUSES = ['draft', 'active', 'paused', 'completed', 'archived'];
const OBJECTIVES = ['awareness', 'traffic', 'leads', 'conversions', 'engagement'];

const CampaignManagement: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<CampaignDashboardData | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdCampaign | null>(null);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  const [filter, setFilter] = useState<{ status?: string; platform?: string }>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    platform: 'Facebook',
    status: 'draft',
    objective: 'leads',
    budget: 0,
    startDate: '',
    endDate: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmContent: '',
    utmTerm: '',
    targetAudience: '',
    landingPageUrl: '',
    notes: ''
  });

  const [metricsData, setMetricsData] = useState({
    impressions: 0,
    reach: 0,
    clicks: 0,
    leads: 0,
    conversions: 0,
    spend: 0
  });

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, campaignsRes] = await Promise.all([
        getCampaignDashboard(),
        getCampaigns(filter)
      ]);
      setDashboardData(dashboardRes.data);
      setCampaigns(campaignsRes.data);
    } catch (error) {
      console.error('Error fetching campaign data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCampaign) {
        await updateCampaign(editingCampaign._id, formData);
      } else {
        await createCampaign(formData);
      }
      setShowForm(false);
      setEditingCampaign(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving campaign:', error);
    }
  };

  const handleMetricsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCampaign) return;
    try {
      await updateCampaignMetrics(selectedCampaign._id, metricsData);
      setShowMetricsModal(false);
      setSelectedCampaign(null);
      fetchData();
    } catch (error) {
      console.error('Error updating metrics:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await deleteCampaign(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      platform: 'Facebook',
      status: 'draft',
      objective: 'leads',
      budget: 0,
      startDate: '',
      endDate: '',
      utmSource: '',
      utmMedium: '',
      utmCampaign: '',
      utmContent: '',
      utmTerm: '',
      targetAudience: '',
      landingPageUrl: '',
      notes: ''
    });
  };

  const openEditForm = (campaign: AdCampaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      platform: campaign.platform,
      status: campaign.status,
      objective: campaign.objective,
      budget: campaign.budget,
      startDate: campaign.startDate.split('T')[0],
      endDate: campaign.endDate?.split('T')[0] || '',
      utmSource: campaign.utmSource,
      utmMedium: campaign.utmMedium,
      utmCampaign: campaign.utmCampaign,
      utmContent: campaign.utmContent || '',
      utmTerm: campaign.utmTerm || '',
      targetAudience: campaign.targetAudience || '',
      landingPageUrl: campaign.landingPageUrl || '',
      notes: campaign.notes || ''
    });
    setShowForm(true);
  };

  const openMetricsModal = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setMetricsData({
      impressions: campaign.metrics.impressions,
      reach: campaign.metrics.reach,
      clicks: campaign.metrics.clicks,
      leads: campaign.metrics.leads,
      conversions: campaign.metrics.conversions,
      spend: campaign.spend
    });
    setShowMetricsModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: '#6b7280',
      active: '#10b981',
      paused: '#f59e0b',
      completed: '#3b82f6',
      archived: '#9ca3af'
    };
    return colors[status] || '#6b7280';
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      Facebook: '📘',
      Instagram: '📷',
      Google: '🔍',
      LinkedIn: '💼',
      YouTube: '🎬',
      WhatsApp: '💬',
      Twitter: '🐦',
      Other: '📢'
    };
    return icons[platform] || '📢';
  };

  if (loading) {
    return <div className="marketing-loading">Loading campaign data...</div>;
  }

  return (
    <div className="marketing-container">
      <div className="marketing-header">
        <h1>Campaign Management</h1>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          + New Campaign
        </button>
      </div>

      {/* Dashboard Overview */}
      {dashboardData && (
        <div className="campaign-dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Budget</span>
              <span className="stat-value">{formatCurrency(dashboardData.overview.totalBudget)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Spend</span>
              <span className="stat-value">{formatCurrency(dashboardData.overview.totalSpend)}</span>
              <span className="stat-sub">{dashboardData.overview.budgetUtilization}% utilized</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Leads</span>
              <span className="stat-value">{dashboardData.overview.actualLeads}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Cost Per Lead</span>
              <span className="stat-value">{formatCurrency(dashboardData.overview.cpl)}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Click Through Rate</span>
              <span className="stat-value">{dashboardData.overview.ctr}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Conversion Rate</span>
              <span className="stat-value">{dashboardData.overview.conversionRate}%</span>
            </div>
          </div>

          {/* Platform Stats */}
          <div className="dashboard-section">
            <h3>Performance by Platform</h3>
            <div className="platform-stats">
              {dashboardData.platformStats.map((platform) => (
                <div key={platform._id} className="platform-card">
                  <span className="platform-icon">{getPlatformIcon(platform._id)}</span>
                  <span className="platform-name">{platform._id}</span>
                  <div className="platform-metrics">
                    <span>Campaigns: {platform.campaigns}</span>
                    <span>Spend: {formatCurrency(platform.spend)}</span>
                    <span>Leads: {platform.leads}</span>
                    <span>CPL: {platform.leads > 0 ? formatCurrency(platform.spend / platform.leads) : '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Source Distribution */}
          {dashboardData.sourceDistribution.length > 0 && (
            <div className="dashboard-section">
              <h3>Lead Sources (UTM)</h3>
              <div className="source-chart">
                {dashboardData.sourceDistribution.map((source) => (
                  <div key={source._id} className="source-bar-container">
                    <span className="source-name">{source._id}</span>
                    <div className="source-bar">
                      <div 
                        className="source-bar-fill"
                        style={{ 
                          width: `${(source.count / Math.max(...dashboardData!.sourceDistribution.map(s => s.count))) * 100}%`
                        }}
                      />
                    </div>
                    <span className="source-count">{source.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="filters-row">
        <select 
          value={filter.status || ''} 
          onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select 
          value={filter.platform || ''} 
          onChange={(e) => setFilter({ ...filter, platform: e.target.value || undefined })}
        >
          <option value="">All Platforms</option>
          {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Campaigns List */}
      <div className="campaigns-table-container">
        <table className="campaigns-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Platform</th>
              <th>Status</th>
              <th>Budget</th>
              <th>Spend</th>
              <th>Leads</th>
              <th>CPL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign._id}>
                <td>
                  <div className="campaign-name-cell">
                    <strong>{campaign.name}</strong>
                    <span className="campaign-dates">
                      {new Date(campaign.startDate).toLocaleDateString()}
                      {campaign.endDate && ` - ${new Date(campaign.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                </td>
                <td>
                  <span className="platform-badge">
                    {getPlatformIcon(campaign.platform)} {campaign.platform}
                  </span>
                </td>
                <td>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(campaign.status) }}
                  >
                    {campaign.status}
                  </span>
                </td>
                <td>{formatCurrency(campaign.budget)}</td>
                <td>{formatCurrency(campaign.spend)}</td>
                <td>{campaign.actualLeads || campaign.metrics.leads}</td>
                <td>{formatCurrency(campaign.metrics.cpl)}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" onClick={() => openMetricsModal(campaign)} title="Update Metrics">
                      📊
                    </button>
                    <button className="btn-icon" onClick={() => openEditForm(campaign)} title="Edit">
                      ✏️
                    </button>
                    <button className="btn-icon btn-danger" onClick={() => handleDelete(campaign._id)} title="Delete">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Campaign Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content campaign-form-modal">
            <div className="modal-header">
              <h2>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</h2>
              <button className="close-btn" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Campaign Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Platform *</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    required
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Objective</label>
                  <select
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                  >
                    {OBJECTIVES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Budget (INR) *</label>
                  <input
                    type="number"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                    min="0"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>UTM Parameters</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>UTM Source *</label>
                  <input
                    type="text"
                    value={formData.utmSource}
                    onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                    placeholder="e.g., facebook, google"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UTM Medium *</label>
                  <input
                    type="text"
                    value={formData.utmMedium}
                    onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                    placeholder="e.g., cpc, social"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UTM Campaign *</label>
                  <input
                    type="text"
                    value={formData.utmCampaign}
                    onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                    placeholder="e.g., spring_sale_2024"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>UTM Content</label>
                  <input
                    type="text"
                    value={formData.utmContent}
                    onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                    placeholder="e.g., banner_ad"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Landing Page URL</label>
                <input
                  type="url"
                  value={formData.landingPageUrl}
                  onChange={(e) => setFormData({ ...formData, landingPageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label>Target Audience</label>
                <input
                  type="text"
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  placeholder="e.g., IT professionals, 25-35"
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingCampaign(null); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metrics Update Modal */}
      {showMetricsModal && selectedCampaign && (
        <div className="modal-overlay">
          <div className="modal-content metrics-modal">
            <div className="modal-header">
              <h2>Update Metrics - {selectedCampaign.name}</h2>
              <button className="close-btn" onClick={() => setShowMetricsModal(false)}>×</button>
            </div>
            <form onSubmit={handleMetricsSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Impressions</label>
                  <input
                    type="number"
                    value={metricsData.impressions}
                    onChange={(e) => setMetricsData({ ...metricsData, impressions: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Reach</label>
                  <input
                    type="number"
                    value={metricsData.reach}
                    onChange={(e) => setMetricsData({ ...metricsData, reach: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Clicks</label>
                  <input
                    type="number"
                    value={metricsData.clicks}
                    onChange={(e) => setMetricsData({ ...metricsData, clicks: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Leads</label>
                  <input
                    type="number"
                    value={metricsData.leads}
                    onChange={(e) => setMetricsData({ ...metricsData, leads: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Conversions</label>
                  <input
                    type="number"
                    value={metricsData.conversions}
                    onChange={(e) => setMetricsData({ ...metricsData, conversions: Number(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Spend (INR)</label>
                  <input
                    type="number"
                    value={metricsData.spend}
                    onChange={(e) => setMetricsData({ ...metricsData, spend: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowMetricsModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Metrics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManagement;

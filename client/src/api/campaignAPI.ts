import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (tenantId) config.headers['X-Tenant-Id'] = tenantId;
  return config;
});

// Types
export interface CampaignMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  leads: number;
  conversions: number;
  cpl: number;
  cpc: number;
  ctr: number;
  conversionRate: number;
}

export interface AdCampaign {
  _id: string;
  name: string;
  description?: string;
  platform: 'Facebook' | 'Instagram' | 'Google' | 'LinkedIn' | 'YouTube' | 'WhatsApp' | 'Twitter' | 'Other';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  objective: 'awareness' | 'traffic' | 'leads' | 'conversions' | 'engagement';
  budget: number;
  spend: number;
  startDate: string;
  endDate?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmContent?: string;
  utmTerm?: string;
  targetAudience?: string;
  targetLocations?: string[];
  ageRange?: { min: number; max: number };
  metrics: CampaignMetrics;
  landingPageUrl?: string;
  adAccountId?: string;
  externalCampaignId?: string;
  notes?: string;
  actualLeads?: number;
  roi?: number;
  budgetUtilization?: number;
  createdBy?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDashboardData {
  overview: {
    totalBudget: number;
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalLeads: number;
    totalConversions: number;
    campaignCount: number;
    actualLeads: number;
    cpl: number;
    ctr: number;
    conversionRate: number;
    budgetUtilization: number;
  };
  platformStats: Array<{
    _id: string;
    spend: number;
    leads: number;
    clicks: number;
    conversions: number;
    campaigns: number;
  }>;
  statusStats: Array<{
    _id: string;
    count: number;
    spend: number;
    leads: number;
  }>;
  topCampaigns: AdCampaign[];
  sourceDistribution: Array<{
    _id: string;
    count: number;
  }>;
}

export interface StageAnalyticsData {
  stages: Array<{
    stageId: string;
    stageName: string;
    color: string;
    order: number;
    stats: {
      totalLeads: number;
      completedTransitions: number;
      activeLeads: number;
      totalDurationMinutes: number;
      avgDurationMinutes: number;
      minDurationMinutes: number;
      maxDurationMinutes: number;
    };
    conversionRate: number;
    avgDurationHours: number;
    avgDurationDays: number;
  }>;
  summary: {
    totalStages: number;
    totalTransitions: number;
    averageLifecycleMinutes: number;
  };
}

export interface BottleneckData {
  bottlenecks: Array<{
    stageId: string;
    stageName: string;
    stuckLeads: number;
    avgStuckHours: number;
    avgStuckDays: number;
    maxStuckHours: number;
    topStuckLeads: Array<{
      _id: string;
      name: string;
      phone: string;
      nextFollowUp?: string;
      assignedTo?: { firstName: string; lastName: string };
      stuckHours: number;
      stuckDays: number;
    }>;
  }>;
  summary: {
    totalStuckLeads: number;
    worstBottleneck: any;
  };
}

export interface LeadLifecycleData {
  lead: {
    id: string;
    name: string;
    createdAt: string;
  };
  stageHistory: Array<{
    _id: string;
    stageId: string;
    stageName: string;
    enteredAt: string;
    exitedAt: string | null;
    durationMinutes: number | null;
    currentDurationMinutes?: number;
    enteredBy?: { firstName: string; lastName: string };
    exitedBy?: { firstName: string; lastName: string };
  }>;
  summary: {
    totalStages: number;
    totalLifecycleMinutes: number;
    totalLifecycleHours: number;
    totalLifecycleDays: number;
    currentStage: {
      stageName: string;
      enteredAt: string;
      durationMinutes: number;
    } | null;
  };
}

// ===================== CAMPAIGN API =====================

export const getCampaigns = async (params?: { status?: string; platform?: string; page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.platform) queryParams.append('platform', params.platform);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const response = await api.get(`/campaigns?${queryParams.toString()}`);
  return response.data;
};

export const getCampaign = async (id: string) => {
  const response = await api.get(`/campaigns/${id}`);
  return response.data;
};

export const createCampaign = async (data: Partial<AdCampaign>) => {
  const response = await api.post('/campaigns', data);
  return response.data;
};

export const updateCampaign = async (id: string, data: Partial<AdCampaign>) => {
  const response = await api.put(`/campaigns/${id}`, data);
  return response.data;
};

export const updateCampaignMetrics = async (id: string, metrics: Partial<CampaignMetrics & { spend: number }>) => {
  const response = await api.patch(`/campaigns/${id}/metrics`, metrics);
  return response.data;
};

export const deleteCampaign = async (id: string) => {
  const response = await api.delete(`/campaigns/${id}`);
  return response.data;
};

export const getCampaignDashboard = async (params?: { startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const response = await api.get(`/campaigns/dashboard?${queryParams.toString()}`);
  return response.data;
};

export const getCampaignLeads = async (id: string, params?: { page?: number; limit?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  
  const response = await api.get(`/campaigns/${id}/leads?${queryParams.toString()}`);
  return response.data;
};

export const syncCampaignMetrics = async (id: string) => {
  const response = await api.post(`/campaigns/${id}/sync-metrics`);
  return response.data;
};

// ===================== STAGE HISTORY API =====================

export const getStageAnalytics = async (params?: { startDate?: string; endDate?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  
  const response = await api.get(`/stage-history/analytics?${queryParams.toString()}`);
  return response.data;
};

export const getBottleneckAnalysis = async () => {
  const response = await api.get('/stage-history/bottlenecks');
  return response.data;
};

export const getStageVelocity = async (days?: number) => {
  const queryParams = days ? `?days=${days}` : '';
  const response = await api.get(`/stage-history/velocity${queryParams}`);
  return response.data;
};

export const getLeadLifecycle = async (leadId: string) => {
  const response = await api.get(`/stage-history/lead/${leadId}/lifecycle`);
  return response.data;
};

export default {
  // Campaigns
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  updateCampaignMetrics,
  deleteCampaign,
  getCampaignDashboard,
  getCampaignLeads,
  syncCampaignMetrics,
  // Stage History
  getStageAnalytics,
  getBottleneckAnalysis,
  getStageVelocity,
  getLeadLifecycle
};

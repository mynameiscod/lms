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
export interface Competitor {
  _id: string;
  name: string;
  website: string;
  platforms: string[];
  logo: string;
  notes: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CompetitorAd {
  _id: string;
  competitorId: Competitor | string;
  platform: string;
  headline: string;
  primaryText: string;
  cta: string;
  landingPageUrl: string;
  mediaUrl: string;
  notes: string;
  isAnalyzed: boolean;
  analyzedAt: string | null;
  createdAt: string;
}

export interface GeneratedContent {
  _id: string;
  type: 'instagram_reel' | 'ad_copy' | 'linkedin_post' | 'whatsapp_message';
  content: string;
  generatedAt: string;
}

export interface AdInsight {
  _id: string;
  adId: CompetitorAd | string;
  competitorId: Competitor | string;
  hookType: string;
  painPoint: string;
  targetAudience: string;
  emotionalTrigger: string;
  offerType: string;
  ctaType: string;
  tone: string;
  strengthScore: number;
  weaknesses: string[];
  suggestedAngleForCodeBegun: string;
  generatedContent: GeneratedContent[];
  createdAt: string;
}

export interface GeneratedMarketingContent {
  _id: string;
  type: 'instagram_reel' | 'ad_copy' | 'linkedin_post' | 'whatsapp_message';
  content: string;
  relatedInsight: AdInsight | string;
  languageStyle: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCompetitors: number;
  totalAds: number;
  totalInsights: number;
  recentAds: CompetitorAd[];
  topHooks: { name: string; count: number }[];
  topCTAs: { name: string; count: number }[];
  topPainPoints: { name: string; count: number }[];
  adsByPlatform: { name: string; count: number }[];
}

export const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'Google Ads', 'YouTube', 'Twitter', 'WhatsApp', 'Other'];

export const marketingAPI = {
  // Dashboard
  getDashboardStats: async (): Promise<{ success: boolean; data: DashboardStats }> => {
    const res = await api.get('/marketing/dashboard');
    return res.data;
  },

  // Competitors
  getCompetitors: async (): Promise<{ success: boolean; data: Competitor[] }> => {
    const res = await api.get('/marketing/competitors');
    return res.data;
  },
  createCompetitor: async (data: Partial<Competitor>): Promise<{ success: boolean; data: Competitor }> => {
    const res = await api.post('/marketing/competitors', data);
    return res.data;
  },
  updateCompetitor: async (id: string, data: Partial<Competitor>): Promise<{ success: boolean; data: Competitor }> => {
    const res = await api.put(`/marketing/competitors/${id}`, data);
    return res.data;
  },
  deleteCompetitor: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/marketing/competitors/${id}`);
    return res.data;
  },

  // Ads
  fetchAds: async (competitorName: string): Promise<{ success: boolean; message: string; data: any }> => {
    const res = await api.post('/marketing/ads/fetch', { competitorName });
    return res.data;
  },
  getAds: async (): Promise<{ success: boolean; data: CompetitorAd[] }> => {
    const res = await api.get('/marketing/ads');
    return res.data;
  },
  createAd: async (data: Partial<CompetitorAd>): Promise<{ success: boolean; data: CompetitorAd }> => {
    const res = await api.post('/marketing/ads', data);
    return res.data;
  },
  deleteAd: async (id: string): Promise<{ success: boolean }> => {
    const res = await api.delete(`/marketing/ads/${id}`);
    return res.data;
  },

  // Analysis
  analyzeAd: async (adId: string): Promise<{ success: boolean; data: AdInsight }> => {
    const res = await api.post(`/marketing/ads/${adId}/analyze`);
    return res.data;
  },

  // Insights
  getInsights: async (): Promise<{ success: boolean; data: AdInsight[] }> => {
    const res = await api.get('/marketing/insights');
    return res.data;
  },
  getInsightById: async (id: string): Promise<{ success: boolean; data: AdInsight }> => {
    const res = await api.get(`/marketing/insights/${id}`);
    return res.data;
  },

  // Content Generation
  generateContent: async (insightId: string, type: string): Promise<{ success: boolean; data: { type: string; content: string } }> => {
    const res = await api.post(`/marketing/insights/${insightId}/generate`, { type });
    return res.data;
  },

  // Generated Content
  getGeneratedContent: async (): Promise<{ success: boolean; data: GeneratedMarketingContent[] }> => {
    const res = await api.get('/marketing/content');
    return res.data;
  },
};

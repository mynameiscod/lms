import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import Competitor from '../models/Competitor';
import CompetitorAd from '../models/CompetitorAd';
import AdInsight from '../models/AdInsight';
import { analyzeAd, generateContent } from '../services/marketingIntelligenceService';

// ===================== COMPETITORS =====================

export const createCompetitor = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { name, website, platforms, logo, notes } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Competitor name is required' });
    }
    const competitor = await Competitor.create({
      tenantId: req.tenantId,
      name,
      website: website || '',
      platforms: platforms || [],
      logo: logo || '',
      notes: notes || '',
      createdBy: req.user!.id,
    });
    res.status(201).json({ success: true, message: 'Competitor created', data: competitor });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getCompetitors = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const competitors = await Competitor.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json({ success: true, message: 'Competitors fetched', data: competitors });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCompetitor = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const competitor = await Competitor.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: req.body },
      { new: true }
    );
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    res.json({ success: true, message: 'Competitor updated', data: competitor });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCompetitor = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const competitor = await Competitor.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    // Clean up related ads and insights
    await CompetitorAd.deleteMany({ competitorId: req.params.id, tenantId: req.tenantId });
    await AdInsight.deleteMany({ competitorId: req.params.id, tenantId: req.tenantId });
    res.json({ success: true, message: 'Competitor and related data deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== ADS =====================

export const createAd = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { competitorId, platform, headline, primaryText, cta, landingPageUrl, mediaUrl, notes } = req.body;
    if (!competitorId || !platform || !headline) {
      return res.status(400).json({ success: false, message: 'Competitor, platform, and headline are required' });
    }
    const competitor = await Competitor.findOne({ _id: competitorId, tenantId: req.tenantId });
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }
    const ad = await CompetitorAd.create({
      tenantId: req.tenantId,
      competitorId,
      platform,
      headline,
      primaryText: primaryText || '',
      cta: cta || '',
      landingPageUrl: landingPageUrl || '',
      mediaUrl: mediaUrl || '',
      notes: notes || '',
      capturedBy: req.user!.id,
    });
    res.status(201).json({ success: true, message: 'Ad captured', data: ad });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getAds = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const ads = await CompetitorAd.find({ tenantId: req.tenantId })
      .populate('competitorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Ads fetched', data: ads });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAd = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const ad = await CompetitorAd.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }
    await AdInsight.deleteMany({ adId: req.params.id, tenantId: req.tenantId });
    res.json({ success: true, message: 'Ad deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== ANALYZE =====================

export const analyzeAdEndpoint = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { adId } = req.params;
    const ad = await CompetitorAd.findOne({ _id: adId, tenantId: req.tenantId });
    if (!ad) {
      return res.status(404).json({ success: false, message: 'Ad not found' });
    }
    const competitor = await Competitor.findById(ad.competitorId);

    // Run mock AI analysis
    const analysis = analyzeAd({
      headline: ad.headline,
      primaryText: ad.primaryText,
      cta: ad.cta,
      platform: ad.platform,
      competitorName: competitor?.name || 'Unknown',
    });

    // Upsert insight
    const insight = await AdInsight.findOneAndUpdate(
      { adId, tenantId: req.tenantId },
      {
        $set: {
          tenantId: req.tenantId,
          adId,
          competitorId: ad.competitorId,
          ...analysis,
        },
      },
      { upsert: true, new: true }
    );

    // Mark ad as analyzed
    ad.isAnalyzed = true;
    ad.analyzedAt = new Date();
    await ad.save();

    res.json({ success: true, message: 'Ad analyzed successfully', data: insight });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== INSIGHTS =====================

export const getInsights = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const insights = await AdInsight.find({ tenantId: req.tenantId })
      .populate('competitorId', 'name')
      .populate('adId', 'headline platform primaryText cta')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Insights fetched', data: insights });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInsightById = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const insight = await AdInsight.findOne({ _id: req.params.id, tenantId: req.tenantId })
      .populate('competitorId', 'name')
      .populate('adId', 'headline platform primaryText cta landingPageUrl');
    if (!insight) {
      return res.status(404).json({ success: false, message: 'Insight not found' });
    }
    res.json({ success: true, message: 'Insight fetched', data: insight });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== CONTENT GENERATION =====================

export const generateContentEndpoint = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { insightId } = req.params;
    const { type } = req.body;
    if (!type || !['instagram_reel', 'ad_copy', 'linkedin_post', 'whatsapp_message'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Valid content type is required' });
    }
    const insight = await AdInsight.findOne({ _id: insightId, tenantId: req.tenantId })
      .populate('competitorId', 'name')
      .populate('adId', 'headline');
    if (!insight) {
      return res.status(404).json({ success: false, message: 'Insight not found' });
    }

    const content = generateContent({
      type,
      insight: {
        hookType: insight.hookType,
        painPoint: insight.painPoint,
        targetAudience: insight.targetAudience,
        emotionalTrigger: insight.emotionalTrigger,
        offerType: insight.offerType,
        ctaType: insight.ctaType,
        tone: insight.tone,
        suggestedPositioning: insight.suggestedPositioning,
        competitorName: (insight.competitorId as any)?.name || 'Competitor',
        headline: (insight.adId as any)?.headline || '',
      },
    });

    // Save generated content to the insight
    insight.generatedContent.push({
      type,
      content,
      generatedAt: new Date(),
    });
    await insight.save();

    res.json({ success: true, message: 'Content generated', data: { type, content } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== DASHBOARD STATS =====================

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantId = req.tenantId;

    const [totalCompetitors, totalAds, totalInsights, recentAds, allInsights, adsByPlatform] = await Promise.all([
      Competitor.countDocuments({ tenantId }),
      CompetitorAd.countDocuments({ tenantId }),
      AdInsight.countDocuments({ tenantId }),
      CompetitorAd.find({ tenantId })
        .populate('competitorId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      AdInsight.find({ tenantId }).lean(),
      CompetitorAd.aggregate([
        { $match: { tenantId: { $exists: true } } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    // Aggregate hook types
    const hookCounts: Record<string, number> = {};
    const ctaCounts: Record<string, number> = {};
    const painPointCounts: Record<string, number> = {};
    allInsights.forEach((ins: any) => {
      if (ins.hookType) hookCounts[ins.hookType] = (hookCounts[ins.hookType] || 0) + 1;
      if (ins.ctaType) ctaCounts[ins.ctaType] = (ctaCounts[ins.ctaType] || 0) + 1;
      if (ins.painPoint) painPointCounts[ins.painPoint] = (painPointCounts[ins.painPoint] || 0) + 1;
    });

    const toSorted = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    res.json({
      success: true,
      message: 'Dashboard stats',
      data: {
        totalCompetitors,
        totalAds,
        totalInsights,
        recentAds,
        topHooks: toSorted(hookCounts),
        topCTAs: toSorted(ctaCounts),
        topPainPoints: toSorted(painPointCounts),
        adsByPlatform: adsByPlatform.map((p: any) => ({ name: p._id, count: p.count })),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

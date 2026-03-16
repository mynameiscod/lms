import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import Competitor from '../models/Competitor';
import CompetitorAd from '../models/CompetitorAd';
import AdInsight from '../models/AdInsight';
import GeneratedMarketingContent from '../models/GeneratedMarketingContent';
import { analyzeAd, generateContent } from '../services/marketingIntelligenceService';
import { fetchCompetitorAds } from '../services/adScraperService';

// ===================== COMPETITORS =====================

// ===================== COMPETITORS WITH AD COUNTS =====================

export const getCompetitorsWithAdCounts = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const competitors = await Competitor.find({ tenantId: req.tenantId }).lean();
    const adCounts = await CompetitorAd.aggregate([
      { $match: { tenantId: req.tenantId } },
      { $group: { _id: '$competitorId', count: { $sum: 1 }, analyzedCount: { $sum: { $cond: ['$isAnalyzed', 1, 0] } } } },
    ]);

    const countMap: Record<string, { count: number; analyzedCount: number }> = {};
    adCounts.forEach((c: any) => {
      countMap[c._id.toString()] = { count: c.count, analyzedCount: c.analyzedCount };
    });

    const result = competitors.map((comp: any) => ({
      ...comp,
      adCount: countMap[comp._id.toString()]?.count || 0,
      analyzedCount: countMap[comp._id.toString()]?.analyzedCount || 0,
    }));

    // Sort by ad count descending
    result.sort((a: any, b: any) => b.adCount - a.adCount);

    res.json({ success: true, message: 'Competitors with ad counts', data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== ADS BY COMPETITOR =====================

export const getAdsByCompetitor = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { competitorId } = req.params;
    const ads = await CompetitorAd.find({ tenantId: req.tenantId, competitorId })
      .populate('competitorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Ads fetched', data: ads });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== ANALYZE ALL ADS OF A COMPETITOR =====================

export const analyzeCompetitor = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { competitorId } = req.params;
    const competitor = await Competitor.findOne({ _id: competitorId, tenantId: req.tenantId });
    if (!competitor) {
      return res.status(404).json({ success: false, message: 'Competitor not found' });
    }

    const ads = await CompetitorAd.find({ tenantId: req.tenantId, competitorId });
    if (ads.length === 0) {
      return res.status(400).json({ success: false, message: 'No ads for this competitor to analyze' });
    }

    // Analyze each ad and collect all insights
    const allAnalyses = [];
    for (const ad of ads) {
      const analysis = analyzeAd({
        headline: ad.headline,
        primaryText: ad.primaryText,
        cta: ad.cta,
        platform: ad.platform,
        competitorName: competitor.name,
      });

      // Upsert insight for each ad
      await AdInsight.findOneAndUpdate(
        { adId: ad._id, tenantId: req.tenantId },
        { $set: { tenantId: req.tenantId, adId: ad._id, competitorId: competitor._id, ...analysis } },
        { upsert: true, new: true }
      );

      ad.isAnalyzed = true;
      ad.analyzedAt = new Date();
      await ad.save();

      allAnalyses.push(analysis);
    }

    // Build combined summary from all analyses
    const hookFreq: Record<string, number> = {};
    const painFreq: Record<string, number> = {};
    const audienceFreq: Record<string, number> = {};
    const ctaFreq: Record<string, number> = {};
    const toneFreq: Record<string, number> = {};
    const allWeaknesses: string[] = [];
    const allAngles: string[] = [];
    let totalStrength = 0;

    for (const a of allAnalyses) {
      hookFreq[a.hookType] = (hookFreq[a.hookType] || 0) + 1;
      painFreq[a.painPoint] = (painFreq[a.painPoint] || 0) + 1;
      audienceFreq[a.targetAudience] = (audienceFreq[a.targetAudience] || 0) + 1;
      ctaFreq[a.ctaType] = (ctaFreq[a.ctaType] || 0) + 1;
      toneFreq[a.tone] = (toneFreq[a.tone] || 0) + 1;
      allWeaknesses.push(...a.weaknesses);
      allAngles.push(a.suggestedAngleForCodeBegun);
      totalStrength += a.strengthScore;
    }

    const topOf = (freq: Record<string, number>) =>
      Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

    // Generate combined marketing ideas
    const sampleInsight = allAnalyses[0];
    const marketingIdeas = ['instagram_reel', 'ad_copy', 'linkedin_post', 'whatsapp_message'].map(type => ({
      type,
      content: generateContent({
        type: type as any,
        insight: {
          hookType: topOf(hookFreq)[0]?.name || sampleInsight.hookType,
          painPoint: topOf(painFreq)[0]?.name || sampleInsight.painPoint,
          targetAudience: topOf(audienceFreq)[0]?.name || sampleInsight.targetAudience,
          emotionalTrigger: sampleInsight.emotionalTrigger,
          offerType: sampleInsight.offerType,
          ctaType: topOf(ctaFreq)[0]?.name || sampleInsight.ctaType,
          tone: topOf(toneFreq)[0]?.name || sampleInsight.tone,
          suggestedAngleForCodeBegun: allAngles[0],
          competitorName: competitor.name,
          headline: ads[0].headline,
        },
      }),
    }));

    const summary = {
      competitorName: competitor.name,
      totalAds: ads.length,
      avgStrengthScore: Math.round((totalStrength / allAnalyses.length) * 10) / 10,
      topHooks: topOf(hookFreq).slice(0, 3),
      topPainPoints: topOf(painFreq).slice(0, 3),
      topAudiences: topOf(audienceFreq).slice(0, 3),
      topCTAs: topOf(ctaFreq).slice(0, 3),
      topTones: topOf(toneFreq).slice(0, 3),
      commonWeaknesses: [...new Set(allWeaknesses)].slice(0, 5),
      suggestedAngles: allAngles.slice(0, 3),
      marketingIdeas,
    };

    res.json({ success: true, message: `Analyzed ${ads.length} ads for ${competitor.name}`, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== FETCH ADS (SCRAPE + STORE + ANALYZE) =====================

export const fetchAds = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { competitorName } = req.body;
    if (!competitorName || typeof competitorName !== 'string') {
      return res.status(400).json({ success: false, message: 'Competitor name is required' });
    }

    // 1. Find or create competitor
    let competitor = await Competitor.findOne({
      tenantId: req.tenantId,
      name: { $regex: new RegExp(`^${competitorName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (!competitor) {
      competitor = await Competitor.create({
        tenantId: req.tenantId,
        name: competitorName,
        platforms: ['Facebook'],
        status: 'active',
        createdBy: req.user!.id,
      });
    }

    // 2. Scrape ads from Meta Ads Library
    const scrapedAds = await fetchCompetitorAds(competitorName);

    if (scrapedAds.length === 0) {
      return res.json({
        success: true,
        message: `No ads found for "${competitorName}". Meta may be blocking automated access. Try adding ads manually.`,
        data: { competitor, ads: [], insights: [], scrapedCount: 0 },
      });
    }

    // 3. Store ads in database
    const storedAds = [];
    const insights = [];

    for (const scraped of scrapedAds) {
      const ad = await CompetitorAd.create({
        tenantId: req.tenantId,
        competitorId: competitor._id,
        platform: scraped.platform || 'Facebook',
        headline: scraped.headline,
        primaryText: scraped.primaryText,
        cta: scraped.cta,
        landingPageUrl: scraped.landingPage,
        mediaUrl: scraped.mediaUrl,
        startedRunning: scraped.startedRunning || '',
        estimatedReach: scraped.estimatedReach || '',
        capturedBy: req.user!.id,
        capturedAt: new Date(),
      });
      storedAds.push(ad);

      // 4. Analyze each ad
      const analysis = analyzeAd({
        headline: scraped.headline,
        primaryText: scraped.primaryText,
        cta: scraped.cta,
        platform: scraped.platform,
        competitorName,
      });

      const insight = await AdInsight.findOneAndUpdate(
        { adId: ad._id, tenantId: req.tenantId },
        {
          $set: {
            tenantId: req.tenantId,
            adId: ad._id,
            competitorId: competitor._id,
            ...analysis,
          },
        },
        { upsert: true, new: true }
      );
      insights.push(insight);

      // Mark ad as analyzed
      ad.isAnalyzed = true;
      ad.analyzedAt = new Date();
      await ad.save();
    }

    res.json({
      success: true,
      message: `Fetched ${storedAds.length} ads for "${competitorName}"`,
      data: { competitor, ads: storedAds, insights, scrapedCount: storedAds.length },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

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
        suggestedAngleForCodeBegun: insight.suggestedAngleForCodeBegun,
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

    // Also save to standalone GeneratedMarketingContent collection
    await GeneratedMarketingContent.create({
      tenantId: req.tenantId,
      type,
      content,
      relatedInsight: insightId,
      languageStyle: insight.tone || 'professional',
      createdBy: req.user!.id,
    });

    res.json({ success: true, message: 'Content generated', data: { type, content } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GENERATED CONTENT =====================

export const getGeneratedContent = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const content = await GeneratedMarketingContent.find({ tenantId: req.tenantId })
      .populate('relatedInsight', 'hookType painPoint targetAudience')
      .sort({ createdAt: -1 });
    res.json({ success: true, message: 'Generated content fetched', data: content });
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

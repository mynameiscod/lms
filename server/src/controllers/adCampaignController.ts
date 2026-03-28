import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, ApiResponse } from '../types';
import AdCampaign, { IAdCampaign, CampaignStatus } from '../models/AdCampaign';
import Lead from '../models/Lead';

// ===================== CREATE CAMPAIGN =====================

export const createCampaign = async (req: AuthenticatedRequest, res: Response<ApiResponse<IAdCampaign>>) => {
  try {
    const {
      name, description, platform, status, objective,
      budget, startDate, endDate,
      utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
      targetAudience, targetLocations, ageRange,
      landingPageUrl, adAccountId, externalCampaignId, notes
    } = req.body;

    if (!name || !platform || !budget || !startDate || !utmSource || !utmMedium || !utmCampaign) {
      return res.status(400).json({
        success: false,
        message: 'Name, platform, budget, startDate, utmSource, utmMedium, and utmCampaign are required'
      });
    }

    const campaign = await AdCampaign.create({
      name,
      description,
      platform,
      status: status || 'draft',
      objective: objective || 'leads',
      budget,
      spend: 0,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      utmSource: utmSource.toLowerCase(),
      utmMedium: utmMedium.toLowerCase(),
      utmCampaign: utmCampaign.toLowerCase(),
      utmContent: utmContent?.toLowerCase(),
      utmTerm: utmTerm?.toLowerCase(),
      targetAudience,
      targetLocations,
      ageRange,
      landingPageUrl,
      adAccountId,
      externalCampaignId,
      notes,
      tenantId: req.tenantId,
      createdBy: req.user!.id
    });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET ALL CAMPAIGNS =====================

export const getCampaigns = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, platform, page = 1, limit = 20 } = req.query;
    
    const filter: any = { tenantId: req.tenantId };
    if (status) filter.status = status;
    if (platform) filter.platform = platform;

    const skip = (Number(page) - 1) * Number(limit);

    const [campaigns, total] = await Promise.all([
      AdCampaign.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('createdBy', 'firstName lastName'),
      AdCampaign.countDocuments(filter)
    ]);

    // Enrich with lead counts
    const campaignIds = campaigns.map(c => c._id);
    const leadCounts = await Lead.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(req.tenantId as string), campaignId: { $in: campaignIds } } },
      { $group: { _id: '$campaignId', count: { $sum: 1 } } }
    ]);

    const leadCountMap: Record<string, number> = {};
    leadCounts.forEach((lc: any) => {
      leadCountMap[lc._id.toString()] = lc.count;
    });

    const enrichedCampaigns = campaigns.map(c => ({
      ...c.toObject(),
      actualLeads: leadCountMap[c._id.toString()] || 0
    }));

    res.json({
      success: true,
      message: 'Campaigns retrieved',
      data: enrichedCampaigns,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET SINGLE CAMPAIGN =====================

export const getCampaign = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    }).populate('createdBy', 'firstName lastName');

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Get actual lead count
    const leadCount = await Lead.countDocuments({
      tenantId: req.tenantId,
      campaignId: campaign._id
    });

    res.json({
      success: true,
      message: 'Campaign retrieved',
      data: {
        ...campaign.toObject(),
        actualLeads: leadCount
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== UPDATE CAMPAIGN =====================

export const updateCampaign = async (req: AuthenticatedRequest, res: Response<ApiResponse<IAdCampaign>>) => {
  try {
    const allowedUpdates = [
      'name', 'description', 'platform', 'status', 'objective',
      'budget', 'spend', 'startDate', 'endDate',
      'utmSource', 'utmMedium', 'utmCampaign', 'utmContent', 'utmTerm',
      'targetAudience', 'targetLocations', 'ageRange',
      'landingPageUrl', 'adAccountId', 'externalCampaignId', 'notes'
    ];

    const updates: any = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Lowercase UTM params
    if (updates.utmSource) updates.utmSource = updates.utmSource.toLowerCase();
    if (updates.utmMedium) updates.utmMedium = updates.utmMedium.toLowerCase();
    if (updates.utmCampaign) updates.utmCampaign = updates.utmCampaign.toLowerCase();
    if (updates.utmContent) updates.utmContent = updates.utmContent.toLowerCase();
    if (updates.utmTerm) updates.utmTerm = updates.utmTerm.toLowerCase();

    const campaign = await AdCampaign.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      updates,
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== UPDATE CAMPAIGN METRICS =====================

export const updateCampaignMetrics = async (req: AuthenticatedRequest, res: Response<ApiResponse<IAdCampaign>>) => {
  try {
    const { impressions, reach, clicks, leads, conversions, spend } = req.body;

    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Update metrics
    if (impressions !== undefined) campaign.metrics.impressions = impressions;
    if (reach !== undefined) campaign.metrics.reach = reach;
    if (clicks !== undefined) campaign.metrics.clicks = clicks;
    if (leads !== undefined) campaign.metrics.leads = leads;
    if (conversions !== undefined) campaign.metrics.conversions = conversions;
    if (spend !== undefined) campaign.spend = spend;

    await campaign.save(); // Pre-save hook calculates CPL, CPC, CTR, etc.

    res.json({
      success: true,
      message: 'Campaign metrics updated',
      data: campaign
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== DELETE CAMPAIGN =====================

export const deleteCampaign = async (req: AuthenticatedRequest, res: Response<ApiResponse<null>>) => {
  try {
    const campaign = await AdCampaign.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully',
      data: null
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== CAMPAIGN ANALYTICS DASHBOARD =====================

export const getCampaignDashboard = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const { startDate, endDate } = req.query;

    // Date filter for campaigns
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    const campaignFilter: any = { tenantId: tenantOid };
    if (Object.keys(dateFilter).length > 0) {
      campaignFilter.startDate = dateFilter;
    }

    // Aggregate overall stats
    const overallStats = await AdCampaign.aggregate([
      { $match: campaignFilter },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$budget' },
          totalSpend: { $sum: '$spend' },
          totalImpressions: { $sum: '$metrics.impressions' },
          totalClicks: { $sum: '$metrics.clicks' },
          totalLeads: { $sum: '$metrics.leads' },
          totalConversions: { $sum: '$metrics.conversions' },
          campaignCount: { $sum: 1 }
        }
      }
    ]);

    // Get actual leads from Lead collection (linked via campaignId)
    const actualLeadStats = await Lead.aggregate([
      { $match: { tenantId: tenantOid, campaignId: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          totalActualLeads: { $sum: 1 }
        }
      }
    ]);

    // Stats by platform
    const platformStats = await AdCampaign.aggregate([
      { $match: campaignFilter },
      {
        $group: {
          _id: '$platform',
          spend: { $sum: '$spend' },
          leads: { $sum: '$metrics.leads' },
          clicks: { $sum: '$metrics.clicks' },
          conversions: { $sum: '$metrics.conversions' },
          campaigns: { $sum: 1 }
        }
      },
      { $sort: { spend: -1 } }
    ]);

    // Stats by status
    const statusStats = await AdCampaign.aggregate([
      { $match: campaignFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          spend: { $sum: '$spend' },
          leads: { $sum: '$metrics.leads' }
        }
      }
    ]);

    // Top performing campaigns
    const topCampaigns = await AdCampaign.find(campaignFilter)
      .sort({ 'metrics.leads': -1 })
      .limit(5)
      .select('name platform spend metrics');

    // Lead source distribution (from UTM)
    const sourceDistribution = await Lead.aggregate([
      { $match: { tenantId: tenantOid, 'utmParams.source': { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$utmParams.source',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const stats = overallStats[0] || {
      totalBudget: 0,
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalLeads: 0,
      totalConversions: 0,
      campaignCount: 0
    };

    // Calculate aggregate metrics
    const overallCPL = stats.totalLeads > 0 ? Math.round((stats.totalSpend / stats.totalLeads) * 100) / 100 : 0;
    const overallCTR = stats.totalImpressions > 0 ? Math.round((stats.totalClicks / stats.totalImpressions) * 10000) / 100 : 0;
    const overallConversionRate = stats.totalLeads > 0 ? Math.round((stats.totalConversions / stats.totalLeads) * 10000) / 100 : 0;

    res.json({
      success: true,
      message: 'Campaign dashboard data',
      data: {
        overview: {
          ...stats,
          actualLeads: actualLeadStats[0]?.totalActualLeads || 0,
          cpl: overallCPL,
          ctr: overallCTR,
          conversionRate: overallConversionRate,
          budgetUtilization: stats.totalBudget > 0 ? Math.round((stats.totalSpend / stats.totalBudget) * 100) : 0
        },
        platformStats,
        statusStats,
        topCampaigns,
        sourceDistribution
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET CAMPAIGN LEADS =====================

export const getCampaignLeads = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignId = req.params.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [leads, total] = await Promise.all([
      Lead.find({ tenantId: req.tenantId, campaignId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('stageId', 'name color')
        .populate('assignedTo', 'firstName lastName'),
      Lead.countDocuments({ tenantId: req.tenantId, campaignId })
    ]);

    res.json({
      success: true,
      message: 'Campaign leads retrieved',
      data: leads,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== AUTO-LINK LEAD TO CAMPAIGN =====================
// This is called internally when a lead is created with UTM params

export const linkLeadToCampaign = async (
  leadId: mongoose.Types.ObjectId,
  utmParams: { source?: string; medium?: string; campaign?: string },
  tenantId: mongoose.Types.ObjectId
): Promise<void> => {
  try {
    if (!utmParams.source || !utmParams.campaign) return;

    // Find matching campaign by UTM params
    const campaign = await AdCampaign.findOne({
      tenantId,
      utmSource: utmParams.source.toLowerCase(),
      utmCampaign: utmParams.campaign.toLowerCase(),
      status: { $in: ['active', 'paused'] }
    });

    if (campaign) {
      await Lead.findByIdAndUpdate(leadId, { campaignId: campaign._id });
      
      // Increment campaign lead count
      await AdCampaign.findByIdAndUpdate(campaign._id, {
        $inc: { 'metrics.leads': 1 }
      });
    }
  } catch (error) {
    console.error('Error linking lead to campaign:', error);
  }
};

// ===================== SYNC CAMPAIGN METRICS =====================
// Recalculate metrics from actual leads

export const syncCampaignMetrics = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const campaign = await AdCampaign.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });

    if (!campaign) {
      return res.status(404).json({ success: false, message: 'Campaign not found' });
    }

    // Count actual leads linked to this campaign
    const actualLeads = await Lead.countDocuments({
      tenantId: req.tenantId,
      campaignId: campaign._id
    });

    // Count conversions (leads with convertedStudentId)
    const conversions = await Lead.countDocuments({
      tenantId: req.tenantId,
      campaignId: campaign._id,
      convertedStudentId: { $exists: true, $ne: null }
    });

    campaign.metrics.leads = actualLeads;
    campaign.metrics.conversions = conversions;
    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign metrics synced',
      data: campaign
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

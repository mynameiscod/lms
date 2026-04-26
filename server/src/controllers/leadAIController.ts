import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Lead from '../models/Lead';
import leadAIService from '../services/leadAIService';
import { AuthRequest } from '../types/express';

/**
 * Generate AI summary for a lead
 */
export const generateSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { force } = req.query; // Force regeneration even if cached

    const lead = await Lead.findById(leadId)
      .populate('stage', 'name category')
      .populate('activities.createdBy', 'name');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check if we should use cached summary
    if (!force && lead.aiSummary?.generatedAt) {
      const hoursSinceGenerated = 
        (Date.now() - new Date(lead.aiSummary.generatedAt).getTime()) / (1000 * 60 * 60);
      
      // Return cached if less than 24 hours old and lead hasn't changed
      if (hoursSinceGenerated < 24 && lead.aiSummary.summary) {
        return res.json({
          cached: true,
          ...lead.aiSummary
        });
      }
    }

    // Generate new summary
    const summary = await leadAIService.generateSummary(lead._id as mongoose.Types.ObjectId);

    if (!summary) {
      // Fall back to quick insights if AI unavailable
      const quickInsights = await leadAIService.generateQuickInsights(lead);
      return res.json({
        fallback: true,
        summary: 'AI summary not available',
        keyInsights: quickInsights,
        suggestedNextAction: 'Follow up with the lead',
        conversionProbability: 'medium' as const
      });
    }

    // Save the summary to lead
    lead.aiSummary = {
      summary: summary.summary,
      keyInsights: summary.keyInsights,
      suggestedNextAction: summary.suggestedNextAction,
      conversionProbability: summary.conversionProbability,
      seriousnessScore: summary.seriousnessScore,
      generatedAt: new Date(),
      generatedBy: 'openai'
    };
    await lead.save();

    res.json({
      cached: false,
      ...lead.aiSummary
    });
  } catch (error) {
    console.error('Error generating AI summary:', error);
    res.status(500).json({ message: 'Failed to generate AI summary' });
  }
};

/**
 * Get AI summary for a lead (uses cache or generates)
 */
export const getSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId)
      .populate('stage', 'name category')
      .populate('activities.createdBy', 'name');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const summary = await leadAIService.getOrGenerateSummary(lead._id as mongoose.Types.ObjectId);

    res.json(summary);
  } catch (error) {
    console.error('Error getting AI summary:', error);
    res.status(500).json({ message: 'Failed to get AI summary' });
  }
};

/**
 * Generate quick insights (rule-based, no AI)
 */
export const getQuickInsights = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId)
      .populate('stage', 'name category');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    const insights = await leadAIService.generateQuickInsights(lead);

    res.json(insights);
  } catch (error) {
    console.error('Error generating quick insights:', error);
    res.status(500).json({ message: 'Failed to generate quick insights' });
  }
};

/**
 * Bulk generate summaries for multiple leads
 */
export const bulkGenerateSummaries = async (req: AuthRequest, res: Response) => {
  try {
    const { leadIds } = req.body;
    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    // Process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < leadIds.length; i += batchSize) {
      const batch = leadIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (leadId: string) => {
        try {
          const lead = await Lead.findById(leadId)
            .populate('stage', 'name category')
            .populate('activities.createdBy', 'name');

          if (!lead) {
            results.push({ leadId, success: false, error: 'Lead not found' });
            return;
          }

          const summary = await leadAIService.generateSummary(lead._id as mongoose.Types.ObjectId);
          
          if (summary) {
            lead.aiSummary = {
              summary: summary.summary,
              keyInsights: summary.keyInsights,
              suggestedNextAction: summary.suggestedNextAction,
              conversionProbability: summary.conversionProbability,
              seriousnessScore: summary.seriousnessScore,
              generatedAt: new Date(),
              generatedBy: 'openai'
            };
            await lead.save();
          }

          results.push({ leadId, success: true });
        } catch (error: any) {
          results.push({ leadId, success: false, error: error.message });
        }
      }));

      // Small delay between batches to avoid rate limits
      if (i + batchSize < leadIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      message: `Generated summaries for ${successful} leads, ${failed} failed`,
      results
    });
  } catch (error) {
    console.error('Error bulk generating summaries:', error);
    res.status(500).json({ message: 'Failed to bulk generate summaries' });
  }
};

/**
 * Check if AI service is available
 */
export const checkAIStatus = async (req: AuthRequest, res: Response) => {
  try {
    const isAvailable = leadAIService.isAvailable();
    
    res.json({
      available: isAvailable,
      provider: isAvailable ? 'openai' : null,
      message: isAvailable 
        ? 'AI service is available' 
        : 'OpenAI API key not configured. Quick insights are available as fallback.'
    });
  } catch (error) {
    console.error('Error checking AI status:', error);
    res.status(500).json({ message: 'Failed to check AI status' });
  }
};

/**
 * Get leads with outdated or missing summaries
 */
export const getLeadsNeedingSummary = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { limit = 50 } = req.query;
    const hoursThreshold = 24;
    const cutoffDate = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000);

    const leads = await Lead.find({
      tenantId,
      $or: [
        { 'aiSummary.lastGeneratedAt': { $exists: false } },
        { 'aiSummary.lastGeneratedAt': null },
        { 'aiSummary.lastGeneratedAt': { $lt: cutoffDate } }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(Number(limit))
    .select('name phone stage priority score updatedAt aiSummary.lastGeneratedAt');

    res.json({
      count: leads.length,
      leads
    });
  } catch (error) {
    console.error('Error getting leads needing summary:', error);
    res.status(500).json({ message: 'Failed to get leads needing summary' });
  }
};

/**
 * Get AI suggestions for next best action
 */
export const getNextBestAction = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findById(leadId)
      .populate('stage', 'name category')
      .populate('activities.createdBy', 'name');

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Get or generate insights
    const summary = await leadAIService.getOrGenerateSummary(lead._id as mongoose.Types.ObjectId);
    
    // Return the suggested action as the "next best action"
    const nextAction = summary?.suggestedNextAction || 'Follow up with the lead';



    res.json({
      nextAction,
      suggestedNextAction: summary?.suggestedNextAction || '',
      conversionProbability: summary?.conversionProbability || 'medium',
      keyInsights: summary?.keyInsights || []
    });
  } catch (error) {
    console.error('Error getting next best action:', error);
    res.status(500).json({ message: 'Failed to get next best action' });
  }
};

// ===================== GENERATE FOLLOW-UP MESSAGE =====================

export const generateFollowUpMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { language = 'english' } = req.query as { language?: string };

    const allowedLanguages = ['english', 'telugu', 'hindi'] as const;
    const lang = allowedLanguages.includes(language as any)
      ? (language as 'english' | 'telugu' | 'hindi')
      : 'english';

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const message = await leadAIService.generateFollowUpMessage(lead._id as any, lang);
    res.json({ success: true, message: 'Follow-up message generated', data: { message, language: lang } });
  } catch (error) {
    console.error('Error generating follow-up message:', error);
    res.status(500).json({ message: 'Failed to generate follow-up message' });
  }
};

// ===================== GENERATE TALK TRACK =====================

export const getTalkTrack = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const talkTrack = await leadAIService.generateTalkTrack(lead._id as mongoose.Types.ObjectId);
    if (!talkTrack) {
      return res.status(503).json({ success: false, message: 'AI service unavailable — OPENAI_API_KEY not configured' });
    }

    res.json({ success: true, data: talkTrack });
  } catch (error: any) {
    console.error('Error generating talk track:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

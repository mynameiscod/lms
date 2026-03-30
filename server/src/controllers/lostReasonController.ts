import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LostReasonConfig, { ILostReason, DEFAULT_LOST_REASONS, LOST_REASON_CATEGORIES } from '../models/LostReasonConfig';
import Lead from '../models/Lead';
import { AuthRequest } from '../types/express';

/**
 * Get lost reason configuration for tenant
 */
export const getLostReasonConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    let config = await LostReasonConfig.findOne({ tenantId });

    // Create default config if not exists
    if (!config) {
      config = await LostReasonConfig.create({
        tenantId,
        reasons: DEFAULT_LOST_REASONS,
        settings: {
          requireReason: true,
          requireDetail: false,
          showReEngagementPrompt: true,
          defaultReEngagementDays: 30
        }
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting lost reason config:', error);
    res.status(500).json({ message: 'Failed to get lost reason configuration' });
  }
};

/**
 * Update lost reason configuration
 */
export const updateLostReasonConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { reasons, settings } = req.body;

    const config = await LostReasonConfig.findOneAndUpdate(
      { tenantId },
      { 
        $set: { 
          reasons, 
          settings,
          updatedAt: new Date()
        } 
      },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error updating lost reason config:', error);
    res.status(500).json({ message: 'Failed to update lost reason configuration' });
  }
};

/**
 * Add a new lost reason
 */
export const addReason = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const newReason: ILostReason = req.body;

    // Get max order
    const config = await LostReasonConfig.findOne({ tenantId });
    const maxOrder = config?.reasons.reduce((max, r) => Math.max(max, r.order || 0), 0) || 0;
    
    newReason.order = maxOrder + 1;
    newReason.enabled = true;

    const updatedConfig = await LostReasonConfig.findOneAndUpdate(
      { tenantId },
      { $push: { reasons: newReason } },
      { new: true, upsert: true }
    );

    res.status(201).json(updatedConfig);
  } catch (error) {
    console.error('Error adding lost reason:', error);
    res.status(500).json({ message: 'Failed to add lost reason' });
  }
};

/**
 * Update a lost reason
 */
export const updateReason = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { reasonId } = req.params;
    const updates = req.body;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LostReasonConfig.findOne({ tenantId });
    
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    const reasonIndex = config.reasons.findIndex(r => r.id === reasonId);
    if (reasonIndex === -1) {
      return res.status(404).json({ message: 'Lost reason not found' });
    }

    // Update the reason
    const reason = config.reasons[reasonIndex];
    if (updates.label !== undefined) reason.label = updates.label;
    if (updates.category !== undefined) reason.category = updates.category;
    if (updates.requiresDetail !== undefined) reason.requiresDetail = updates.requiresDetail;
    if (updates.allowReEngagement !== undefined) reason.allowReEngagement = updates.allowReEngagement;
    if (updates.suggestedReEngagementDays !== undefined) reason.suggestedReEngagementDays = updates.suggestedReEngagementDays;
    if (updates.autoActions !== undefined) reason.autoActions = updates.autoActions;
    if (updates.order !== undefined) reason.order = updates.order;
    if (updates.enabled !== undefined) reason.enabled = updates.enabled;

    await config.save();

    res.json(config);
  } catch (error) {
    console.error('Error updating lost reason:', error);
    res.status(500).json({ message: 'Failed to update lost reason' });
  }
};

/**
 * Delete a lost reason (soft delete by setting inactive)
 */
export const deleteReason = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { reasonId } = req.params;
    const { hardDelete } = req.query;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LostReasonConfig.findOne({ tenantId });
    
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    if (hardDelete === 'true') {
      config.reasons = config.reasons.filter(r => r.id !== reasonId);
    } else {
      // Soft delete
      const reason = config.reasons.find(r => r.id === reasonId);
      if (reason) {
        reason.enabled = false;
      }
    }

    await config.save();

    res.json(config);
  } catch (error) {
    console.error('Error deleting lost reason:', error);
    res.status(500).json({ message: 'Failed to delete lost reason' });
  }
};

/**
 * Reorder lost reasons
 */
export const reorderReasons = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { reasonOrder } = req.body; // Array of { id, order }

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LostReasonConfig.findOne({ tenantId });
    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    // Update order for each reason
    for (const item of reasonOrder) {
      const reason = config.reasons.find(r => r.id === item.id);
      if (reason) {
        reason.order = item.order;
      }
    }

    await config.save();

    res.json(config);
  } catch (error) {
    console.error('Error reordering lost reasons:', error);
    res.status(500).json({ message: 'Failed to reorder lost reasons' });
  }
};

/**
 * Get lost reason categories
 */
export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    res.json(LOST_REASON_CATEGORIES);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ message: 'Failed to get categories' });
  }
};

/**
 * Get active lost reasons
 */
export const getActiveReasons = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LostReasonConfig.findOne({ tenantId });
    
    if (!config) {
      return res.json(DEFAULT_LOST_REASONS.filter(r => r.enabled));
    }

    const activeReasons = config.reasons
      .filter(r => r.enabled)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    res.json(activeReasons);
  } catch (error) {
    console.error('Error getting active reasons:', error);
    res.status(500).json({ message: 'Failed to get active reasons' });
  }
};

/**
 * Mark a lead as lost with a reason
 */
export const markLeadAsLost = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { reasonId, reason, detail, reEngagementDate } = req.body;
    const userId = req.user?._id;
    const tenantId = req.user?.tenantId;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Get the lost reason config
    const config = await LostReasonConfig.findOne({ tenantId });
    const lostReason = config?.reasons.find(r => r.id === reasonId);

    // Update lead with lost information
    lead.lostReason = reason || lostReason?.label;
    lead.lostReasonCategory = lostReason?.category;
    lead.lostReasonDetail = detail;
    lead.lostAt = new Date();
    
    if (reEngagementDate || lostReason?.suggestedReEngagementDays) {
      lead.reEngagementDate = reEngagementDate 
        ? new Date(reEngagementDate)
        : new Date(Date.now() + (lostReason?.suggestedReEngagementDays || 30) * 24 * 60 * 60 * 1000);
    }

    // Add activity
    lead.activities.push({
      type: 'note',
      description: `Lead marked as lost: ${lead.lostReason}${detail ? ` - ${detail}` : ''}`,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {
        reasonId,
        reason: lead.lostReason,
        detail,
        reEngagementDate: lead.reEngagementDate
      }
    });

    await lead.save();

    // Update reason usage count
    if (config && reasonId) {
      await LostReasonConfig.findOneAndUpdate(
        { tenantId, 'reasons._id': reasonId },
        { 
          $inc: { 'reasons.$.usageCount': 1 },
          $set: { 'reasons.$.lastUsedAt': new Date() }
        }
      );
    }

    res.json({
      message: 'Lead marked as lost',
      lead
    });
  } catch (error) {
    console.error('Error marking lead as lost:', error);
    res.status(500).json({ message: 'Failed to mark lead as lost' });
  }
};

/**
 * Get lost reasons analytics
 */
export const getLostReasonAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { startDate, endDate } = req.query;

    const matchStage: any = { 
      tenantId: new mongoose.Types.ObjectId(tenantId as string),
      lostAt: { $exists: true }
    };

    if (startDate || endDate) {
      matchStage.lostAt = {};
      if (startDate) matchStage.lostAt.$gte = new Date(startDate as string);
      if (endDate) matchStage.lostAt.$lte = new Date(endDate as string);
    }

    // Get lost leads by reason
    const byReason = await Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$lostReason',
          count: { $sum: 1 },
          reEngageable: {
            $sum: {
              $cond: [{ $ifNull: ['$reEngagementDate', false] }, 1, 0]
            }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get lost leads trend
    const trend = await Lead.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$lostAt' },
            month: { $month: '$lostAt' },
            week: { $week: '$lostAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 } }
    ]);

    // Leads due for re-engagement
    const reEngagementDue = await Lead.countDocuments({
      tenantId,
      lostAt: { $exists: true },
      reEngagementDate: { $lte: new Date() }
    });

    res.json({
      byReason,
      trend,
      reEngagementDue,
      totalLost: byReason.reduce((sum, r) => sum + r.count, 0)
    });
  } catch (error) {
    console.error('Error getting lost reason analytics:', error);
    res.status(500).json({ message: 'Failed to get lost reason analytics' });
  }
};

/**
 * Get leads due for re-engagement
 */
export const getReEngagementLeads = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { upcoming } = req.query;
    const daysAhead = upcoming ? parseInt(upcoming as string) : 0;
    const cutoffDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);

    const leads = await Lead.find({
      tenantId,
      lostAt: { $exists: true },
      reEngagementDate: { $lte: cutoffDate }
    })
    .sort({ reEngagementDate: 1 })
    .select('name phone email lostReason lostAt reEngagementDate')
    .limit(50);

    res.json(leads);
  } catch (error) {
    console.error('Error getting re-engagement leads:', error);
    res.status(500).json({ message: 'Failed to get re-engagement leads' });
  }
};

/**
 * Re-engage a lost lead
 */
export const reEngageLead = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;
    const { newStage, note } = req.body;
    const userId = req.user?._id;

    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Store previous lost info before clearing
    const previousLostInfo = {
      reason: lead.lostReason,
      detail: lead.lostReasonDetail,
      date: lead.lostAt
    };

    // Clear lost status
    lead.lostReason = undefined;
    lead.lostReasonCategory = undefined;
    lead.lostReasonDetail = undefined;
    lead.lostAt = undefined;
    lead.reEngagementDate = undefined;

    // Update stage if provided
    if (newStage) {
      lead.stageId = newStage;
    }

    // Add activity
    lead.activities.push({
      type: 'status_change',
      description: `Lead re-engaged after being lost (${previousLostInfo.reason})${note ? `. ${note}` : ''}`,
      createdBy: userId,
      createdAt: new Date(),
      metadata: {
        previousLostInfo,
        note
      }
    });

    await lead.save();

    res.json({
      message: 'Lead re-engaged successfully',
      lead
    });
  } catch (error) {
    console.error('Error re-engaging lead:', error);
    res.status(500).json({ message: 'Failed to re-engage lead' });
  }
};

/**
 * Reset to default lost reasons
 */
export const resetToDefaults = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LostReasonConfig.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          reasons: DEFAULT_LOST_REASONS,
          settings: {
            requireReason: true,
            requireDetail: false,
            showReEngagementPrompt: true,
            defaultReEngagementDays: 30
          }
        }
      },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error resetting to defaults:', error);
    res.status(500).json({ message: 'Failed to reset to defaults' });
  }
};

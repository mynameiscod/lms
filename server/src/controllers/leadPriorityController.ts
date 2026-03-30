import { Request, Response } from 'express';
import mongoose from 'mongoose';
import LeadPriorityConfig, { 
  DEFAULT_PRIORITY_RULES, 
  DEFAULT_THRESHOLDS,
  ILeadPriorityRule,
  IEligibilityRule
} from '../models/LeadPriorityConfig';
import leadScoringService from '../services/leadScoringService';
import { AuthRequest } from '../types/express';

/**
 * Get priority configuration for tenant
 */
export const getPriorityConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    let config = await LeadPriorityConfig.findOne({ tenantId });
    
    // Create default config if doesn't exist
    if (!config) {
      config = await LeadPriorityConfig.create({
        tenantId,
        rules: DEFAULT_PRIORITY_RULES,
        thresholds: DEFAULT_THRESHOLDS,
        eligibilityRules: [],
        isActive: true
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error getting priority config:', error);
    res.status(500).json({ message: 'Failed to get priority configuration' });
  }
};

/**
 * Update priority configuration
 */
export const updatePriorityConfig = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { rules, thresholds, eligibilityRules, settings, isActive } = req.body;

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          ...(rules && { rules }),
          ...(thresholds && { thresholds }),
          ...(eligibilityRules && { eligibilityRules }),
          ...(settings && { settings }),
          ...(isActive !== undefined && { isActive })
        }
      },
      { new: true, upsert: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error updating priority config:', error);
    res.status(500).json({ message: 'Failed to update priority configuration' });
  }
};

/**
 * Add a new priority rule
 */
export const addPriorityRule = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const rule: ILeadPriorityRule = req.body;
    
    // Generate ID if not provided
    if (!rule.id) {
      rule.id = `rule_${Date.now()}`;
    }

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId },
      { $push: { rules: rule } },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Priority configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error adding priority rule:', error);
    res.status(500).json({ message: 'Failed to add priority rule' });
  }
};

/**
 * Update a priority rule
 */
export const updatePriorityRule = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { ruleId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const updates = req.body;

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId, 'rules.id': ruleId },
      { 
        $set: Object.keys(updates).reduce((acc, key) => {
          acc[`rules.$.${key}`] = updates[key];
          return acc;
        }, {} as Record<string, any>)
      },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Rule not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating priority rule:', error);
    res.status(500).json({ message: 'Failed to update priority rule' });
  }
};

/**
 * Delete a priority rule
 */
export const deletePriorityRule = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { ruleId } = req.params;
    
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId },
      { $pull: { rules: { id: ruleId } } },
      { new: true }
    );

    if (!config) {
      return res.status(404).json({ message: 'Configuration not found' });
    }

    res.json(config);
  } catch (error) {
    console.error('Error deleting priority rule:', error);
    res.status(500).json({ message: 'Failed to delete priority rule' });
  }
};

/**
 * Update thresholds
 */
export const updateThresholds = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const { hot, warm } = req.body;

    if (hot <= warm) {
      return res.status(400).json({ message: 'Hot threshold must be greater than warm threshold' });
    }

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId },
      { $set: { 'thresholds.hot': hot, 'thresholds.warm': warm } },
      { new: true }
    );

    res.json(config);
  } catch (error) {
    console.error('Error updating thresholds:', error);
    res.status(500).json({ message: 'Failed to update thresholds' });
  }
};

/**
 * Calculate score for a specific lead
 */
export const calculateLeadScore = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const result = await leadScoringService.updateLeadScore(
      new mongoose.Types.ObjectId(leadId)
    );

    if (!result) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error calculating lead score:', error);
    res.status(500).json({ message: 'Failed to calculate lead score' });
  }
};

/**
 * Get score breakdown for a lead
 */
export const getLeadScoreBreakdown = async (req: AuthRequest, res: Response) => {
  try {
    const { leadId } = req.params;

    const result = await leadScoringService.getScoreBreakdown(
      new mongoose.Types.ObjectId(leadId)
    );

    if (!result) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error getting score breakdown:', error);
    res.status(500).json({ message: 'Failed to get score breakdown' });
  }
};

/**
 * Bulk recalculate scores for all leads in tenant
 */
export const bulkRecalculateScores = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const updatedCount = await leadScoringService.bulkUpdateScores(tenantId);

    res.json({ 
      message: `Successfully recalculated scores for ${updatedCount} leads`,
      updatedCount 
    });
  } catch (error) {
    console.error('Error bulk recalculating scores:', error);
    res.status(500).json({ message: 'Failed to recalculate scores' });
  }
};

/**
 * Reset to default rules
 */
export const resetToDefaults = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant ID required' });
    }

    const config = await LeadPriorityConfig.findOneAndUpdate(
      { tenantId },
      {
        $set: {
          rules: DEFAULT_PRIORITY_RULES,
          thresholds: DEFAULT_THRESHOLDS
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

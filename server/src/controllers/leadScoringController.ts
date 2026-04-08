import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import LeadScoringConfig from '../models/LeadScoringConfig';
import { rescoreAllLeads } from '../services/leadScoringService';
import User from '../models/User';

// GET /lead-scoring/config
export const getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    let config = await LeadScoringConfig.findOne({ tenantId: req.tenantId })
      .populate('roundRobinMembers', 'firstName lastName email')
      .populate('fallbackMembers', 'firstName lastName email')
      .populate('assignmentRules.assignToMembers', 'firstName lastName email');

    if (!config) {
      // Return default empty config
      config = new LeadScoringConfig({
        tenantId: req.tenantId,
        isActive: false,
        scoringRules: [],
        qualificationRules: [],
        assignmentMode: 'none',
        roundRobinMembers: [],
        assignmentRules: [],
        fallbackMembers: [],
        createdBy: req.userId
      });
    }

    res.json({ success: true, data: config });
  } catch (err: any) {
    console.error('[LEAD-SCORING] Error fetching config:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /lead-scoring/config
export const updateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      isActive,
      scoringRules,
      hotThreshold,
      warmThreshold,
      qualificationRules,
      assignmentMode,
      roundRobinMembers,
      assignmentRules,
      fallbackMembers
    } = req.body;

    const config = await LeadScoringConfig.findOneAndUpdate(
      { tenantId: req.tenantId },
      {
        $set: {
          isActive,
          scoringRules,
          hotThreshold,
          warmThreshold,
          qualificationRules,
          assignmentMode,
          roundRobinMembers,
          assignmentRules,
          fallbackMembers,
          createdBy: req.userId
        }
      },
      { new: true, upsert: true }
    )
      .populate('roundRobinMembers', 'firstName lastName email')
      .populate('fallbackMembers', 'firstName lastName email')
      .populate('assignmentRules.assignToMembers', 'firstName lastName email');

    res.json({ success: true, data: config });
  } catch (err: any) {
    console.error('[LEAD-SCORING] Error updating config:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /lead-scoring/team-members
export const getTeamMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await User.find({
      tenantId: req.tenantId,
      isActive: true,
      role: { $in: ['TENANT_ADMIN', 'STAFF'] }
    }).select('firstName lastName email role');

    res.json({ success: true, data: users });
  } catch (err: any) {
    console.error('[LEAD-SCORING] Error fetching team members:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /lead-scoring/rescore-all
export const rescoreAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await rescoreAllLeads(req.tenantId as any);
    res.json({
      success: true,
      data: result,
      message: `Processed ${result.processed} leads: ${result.scored} scored, ${result.assigned} assigned`
    });
  } catch (err: any) {
    console.error('[LEAD-SCORING] Error rescoring leads:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

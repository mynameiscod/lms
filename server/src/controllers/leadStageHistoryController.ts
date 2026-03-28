import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest, ApiResponse } from '../types';
import LeadStageHistory, { ILeadStageHistory } from '../models/LeadStageHistory';
import LeadStage from '../models/LeadStage';
import Lead from '../models/Lead';

// ===================== GET LEAD LIFECYCLE =====================
// Full timeline of a lead's stage transitions

export const getLeadLifecycle = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;

    const lead = await Lead.findOne({
      _id: leadId,
      tenantId: req.tenantId
    }).select('name createdAt stageId');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const stageHistory = await LeadStageHistory.find({
      leadId,
      tenantId: req.tenantId
    })
      .sort({ enteredAt: 1 })
      .populate('enteredBy', 'firstName lastName')
      .populate('exitedBy', 'firstName lastName');

    // Calculate total lifecycle time
    const totalLifecycleMinutes = stageHistory.reduce((total, record) => {
      if (record.exitedAt) {
        return total + (record.durationMinutes || 0);
      } else {
        // Active stage - calculate current duration
        const now = new Date();
        const diffMs = now.getTime() - record.enteredAt.getTime();
        return total + Math.floor(diffMs / (1000 * 60));
      }
    }, 0);

    // Find current active stage
    const activeStage = stageHistory.find(s => !s.exitedAt);

    res.json({
      success: true,
      message: 'Lead lifecycle retrieved',
      data: {
        lead: {
          id: lead._id,
          name: lead.name,
          createdAt: lead.createdAt
        },
        stageHistory,
        summary: {
          totalStages: stageHistory.length,
          totalLifecycleMinutes,
          totalLifecycleHours: Math.round(totalLifecycleMinutes / 60 * 100) / 100,
          totalLifecycleDays: Math.round(totalLifecycleMinutes / (60 * 24) * 100) / 100,
          currentStage: activeStage ? {
            stageName: activeStage.stageName,
            enteredAt: activeStage.enteredAt,
            durationMinutes: (activeStage as any).currentDurationMinutes
          } : null
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== STAGE DURATION ANALYTICS =====================
// Average time spent in each stage across all leads

export const getStageAnalytics = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const { startDate, endDate } = req.query;

    // Date filter
    const dateFilter: any = { tenantId: tenantOid };
    if (startDate) dateFilter.enteredAt = { ...dateFilter.enteredAt, $gte: new Date(startDate as string) };
    if (endDate) dateFilter.enteredAt = { ...dateFilter.enteredAt, $lte: new Date(endDate as string) };

    // Get all stages for this tenant
    const stages = await LeadStage.find({ tenantId: req.tenantId }).sort({ order: 1 });

    // Aggregate stats per stage
    const stageStats = await LeadStageHistory.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$stageId',
          stageName: { $first: '$stageName' },
          totalLeads: { $sum: 1 },
          completedTransitions: {
            $sum: { $cond: [{ $ne: ['$exitedAt', null] }, 1, 0] }
          },
          activeLeads: {
            $sum: { $cond: [{ $eq: ['$exitedAt', null] }, 1, 0] }
          },
          totalDurationMinutes: {
            $sum: { $ifNull: ['$durationMinutes', 0] }
          },
          avgDurationMinutes: {
            $avg: { $ifNull: ['$durationMinutes', 0] }
          },
          minDurationMinutes: {
            $min: { $ifNull: ['$durationMinutes', 0] }
          },
          maxDurationMinutes: {
            $max: { $ifNull: ['$durationMinutes', 0] }
          }
        }
      },
      { $sort: { totalLeads: -1 } }
    ]);

    // Map stats to stages
    const statsMap: Record<string, any> = {};
    stageStats.forEach((stat: any) => {
      statsMap[stat._id.toString()] = stat;
    });

    const stageAnalytics = stages.map(stage => ({
      stageId: stage._id,
      stageName: stage.name,
      color: stage.color,
      order: stage.order,
      stats: statsMap[stage._id.toString()] || {
        totalLeads: 0,
        completedTransitions: 0,
        activeLeads: 0,
        totalDurationMinutes: 0,
        avgDurationMinutes: 0,
        minDurationMinutes: 0,
        maxDurationMinutes: 0
      }
    }));

    // Calculate funnel metrics
    const funnelMetrics = stageAnalytics.map((stage, index) => {
      const prevStage = index > 0 ? stageAnalytics[index - 1] : null;
      const conversionRate = prevStage && prevStage.stats.totalLeads > 0
        ? Math.round((stage.stats.totalLeads / prevStage.stats.totalLeads) * 10000) / 100
        : 100;
      
      return {
        ...stage,
        conversionRate,
        avgDurationHours: Math.round((stage.stats.avgDurationMinutes || 0) / 60 * 100) / 100,
        avgDurationDays: Math.round((stage.stats.avgDurationMinutes || 0) / (60 * 24) * 100) / 100
      };
    });

    res.json({
      success: true,
      message: 'Stage analytics retrieved',
      data: {
        stages: funnelMetrics,
        summary: {
          totalStages: stages.length,
          totalTransitions: stageStats.reduce((sum: number, s: any) => sum + s.totalLeads, 0),
          averageLifecycleMinutes: stageStats.reduce((sum: number, s: any) => sum + (s.avgDurationMinutes || 0), 0)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== BOTTLENECK ANALYSIS =====================
// Find stages where leads are stuck the longest

export const getBottleneckAnalysis = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);

    // Find active stage records (leads currently in a stage)
    const activeStages = await LeadStageHistory.aggregate([
      { $match: { tenantId: tenantOid, exitedAt: null } },
      {
        $addFields: {
          currentDuration: {
            $divide: [
              { $subtract: [new Date(), '$enteredAt'] },
              1000 * 60  // Convert to minutes
            ]
          }
        }
      },
      {
        $group: {
          _id: '$stageId',
          stageName: { $first: '$stageName' },
          stuckLeads: { $sum: 1 },
          avgStuckMinutes: { $avg: '$currentDuration' },
          maxStuckMinutes: { $max: '$currentDuration' },
          leads: {
            $push: {
              leadId: '$leadId',
              enteredAt: '$enteredAt',
              stuckMinutes: '$currentDuration'
            }
          }
        }
      },
      { $sort: { avgStuckMinutes: -1 } }
    ]);

    // Get lead details for top stuck leads per stage
    const bottlenecks = await Promise.all(
      activeStages.map(async (stage: any) => {
        // Get top 5 stuck leads
        const topStuck = stage.leads
          .sort((a: any, b: any) => b.stuckMinutes - a.stuckMinutes)
          .slice(0, 5);

        const leadIds = topStuck.map((l: any) => l.leadId);
        const leads = await Lead.find({ _id: { $in: leadIds } })
          .select('name phone nextFollowUp')
          .populate('assignedTo', 'firstName lastName');

        return {
          stageId: stage._id,
          stageName: stage.stageName,
          stuckLeads: stage.stuckLeads,
          avgStuckHours: Math.round(stage.avgStuckMinutes / 60 * 100) / 100,
          avgStuckDays: Math.round(stage.avgStuckMinutes / (60 * 24) * 100) / 100,
          maxStuckHours: Math.round(stage.maxStuckMinutes / 60 * 100) / 100,
          topStuckLeads: leads.map((lead: any) => {
            const stuckInfo = topStuck.find((s: any) => s.leadId.toString() === lead._id.toString());
            return {
              ...lead.toObject(),
              stuckHours: stuckInfo ? Math.round(stuckInfo.stuckMinutes / 60 * 100) / 100 : 0,
              stuckDays: stuckInfo ? Math.round(stuckInfo.stuckMinutes / (60 * 24) * 100) / 100 : 0
            };
          })
        };
      })
    );

    res.json({
      success: true,
      message: 'Bottleneck analysis retrieved',
      data: {
        bottlenecks,
        summary: {
          totalStuckLeads: activeStages.reduce((sum: number, s: any) => sum + s.stuckLeads, 0),
          worstBottleneck: bottlenecks[0] || null
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== RECORD STAGE TRANSITION =====================
// Called when a lead changes stage

export const recordStageTransition = async (
  leadId: mongoose.Types.ObjectId,
  oldStageId: mongoose.Types.ObjectId | null,
  newStageId: mongoose.Types.ObjectId,
  newStageName: string,
  userId: mongoose.Types.ObjectId,
  tenantId: mongoose.Types.ObjectId
): Promise<void> => {
  try {
    const now = new Date();

    // Close the previous stage record
    if (oldStageId) {
      const previousRecord = await LeadStageHistory.findOne({
        leadId,
        stageId: oldStageId,
        exitedAt: null,
        tenantId
      });

      if (previousRecord) {
        previousRecord.exitedAt = now;
        previousRecord.exitedBy = userId;
        const durationMs = now.getTime() - previousRecord.enteredAt.getTime();
        previousRecord.durationMinutes = Math.floor(durationMs / (1000 * 60));
        await previousRecord.save();
      }
    }

    // Create new stage record
    await LeadStageHistory.create({
      leadId,
      stageId: newStageId,
      stageName: newStageName,
      enteredAt: now,
      enteredBy: userId,
      tenantId
    });
  } catch (error) {
    console.error('Error recording stage transition:', error);
  }
};

// ===================== INITIALIZE STAGE HISTORY FOR LEAD =====================
// Called when a lead is created

export const initializeLeadStageHistory = async (
  leadId: mongoose.Types.ObjectId,
  stageId: mongoose.Types.ObjectId,
  stageName: string,
  userId: mongoose.Types.ObjectId,
  tenantId: mongoose.Types.ObjectId
): Promise<void> => {
  try {
    await LeadStageHistory.create({
      leadId,
      stageId,
      stageName,
      enteredAt: new Date(),
      enteredBy: userId,
      tenantId
    });
  } catch (error) {
    console.error('Error initializing lead stage history:', error);
  }
};

// ===================== STAGE VELOCITY REPORT =====================
// How fast leads move through stages

export const getStageVelocity = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const tenantOid = new mongoose.Types.ObjectId(req.tenantId as string);
    const { days = 30 } = req.query;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(days));

    // Get completed transitions in the time period
    const velocityData = await LeadStageHistory.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          exitedAt: { $ne: null, $gte: cutoffDate }
        }
      },
      {
        $group: {
          _id: {
            stageId: '$stageId',
            stageName: '$stageName'
          },
          transitions: { $sum: 1 },
          avgDuration: { $avg: '$durationMinutes' },
          medianDurations: { $push: '$durationMinutes' }
        }
      },
      { $sort: { transitions: -1 } }
    ]);

    // Calculate median for each stage
    const velocityReport = velocityData.map((stage: any) => {
      const sorted = stage.medianDurations.sort((a: number, b: number) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

      return {
        stageId: stage._id.stageId,
        stageName: stage._id.stageName,
        transitions: stage.transitions,
        avgDurationHours: Math.round(stage.avgDuration / 60 * 100) / 100,
        medianDurationHours: Math.round(median / 60 * 100) / 100,
        transitionsPerDay: Math.round((stage.transitions / Number(days)) * 100) / 100
      };
    });

    res.json({
      success: true,
      message: 'Stage velocity report',
      data: {
        period: `Last ${days} days`,
        stages: velocityReport,
        summary: {
          totalTransitions: velocityReport.reduce((sum: number, s: any) => sum + s.transitions, 0),
          avgTransitionsPerDay: velocityReport.reduce((sum: number, s: any) => sum + s.transitionsPerDay, 0)
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

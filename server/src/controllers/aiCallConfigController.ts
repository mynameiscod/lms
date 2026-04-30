/**
 * aiCallConfigController.ts
 * Admin CRUD for per-tenant AI call configuration.
 * All endpoints require authentication + admin role.
 */
import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import AICallConfig from '../models/AICallConfig';
import Lead from '../models/Lead';

/**
 * GET /api/v1/ai-calls/config
 * Get config for current tenant (create default if not exists).
 */
export const getConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    let config = await AICallConfig.findOne({ tenantId: req.tenantId });
    if (!config) {
      config = await AICallConfig.create({
        tenantId: req.tenantId,
        enabled: false,
        questions: [
          { id: 'q1', text: 'Hi! This is an automated call from our admissions team. Are you interested in joining our course?', key: 'interested', order: 1, required: true },
          { id: 'q2', text: 'Which course are you interested in?', key: 'course', order: 2, required: true },
          { id: 'q3', text: 'What is your current qualification?', key: 'qualification', order: 3, required: false },
          { id: 'q4', text: 'When are you planning to start?', key: 'timeline', order: 4, required: false },
          { id: 'q5', text: 'Do you have any questions for us?', key: 'questions', order: 5, required: false }
        ],
        retry: { maxAttempts: 3, retryGapMinutes: 30, nextDayRetry: true, workingHoursStart: 9, workingHoursEnd: 18, workingDays: [1,2,3,4,5,6] },
        scoring: { hotThreshold: 75, warmThreshold: 40, assignOnScore: 40 },
        whatsappFallback: { enabled: false, templateName: '', triggerAfterMaxAttempts: true }
      });
    }
    res.json({ success: true, message: 'Config fetched', data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch config', error: err.message });
  }
};

/**
 * PUT /api/v1/ai-calls/config
 * Update config for current tenant.
 */
export const updateConfig = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const allowedFields = [
      'enabled', 'exotelAccountSid', 'exotelApiKey', 'exotelApiToken',
      'exotelVirtualNumber', 'exotelAppId', 'questions', 'retry',
      'scoring', 'whatsappFallback', 'llmModel', 'systemPrompt'
    ];
    const update: Record<string, any> = {};
    allowedFields.forEach(f => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    const config = await AICallConfig.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ success: true, message: 'Config updated', data: config });
  } catch (err: any) {
    res.status(400).json({ success: false, message: 'Failed to update config', error: err.message });
  }
};

/**
 * GET /api/v1/ai-calls/stats
 * Dashboard stats for AI calls.
 */
export const getStats = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const config = await AICallConfig.findOne({ tenantId: req.tenantId });

    const [total, pending, answered, completed, failed, hot, warm, cold] = await Promise.all([
      Lead.countDocuments({ tenantId: req.tenantId, aiCallStatus: { $exists: true } }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCallStatus: 'pending' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCallStatus: 'answered' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCallStatus: 'completed' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCallStatus: 'failed' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCategory: 'HOT' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCategory: 'WARM' }),
      Lead.countDocuments({ tenantId: req.tenantId, aiCategory: 'COLD' })
    ]);

    const answeredRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const qualifiedRate = completed > 0 ? Math.round(((hot + warm) / completed) * 100) : 0;

    res.json({
      success: true,
      message: 'Stats fetched',
      data: {
        enabled: config?.enabled || false,
        totalCalls: config?.stats.totalCallsInitiated || 0,
        totalAnswered: config?.stats.totalAnswered || 0,
        totalQualified: config?.stats.totalQualified || 0,
        leads: { total, pending, answered, completed, failed },
        categories: { hot, warm, cold },
        rates: { answeredRate, qualifiedRate }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats', error: err.message });
  }
};

/**
 * GET /api/v1/ai-calls/leads
 * List leads with AI call activity (paginated).
 */
export const getAICallLeads = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { page = '1', limit = '20', status, category } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: any = { tenantId: req.tenantId, aiCallStatus: { $exists: true } };
    if (status) filter.aiCallStatus = status;
    if (category) filter.aiCategory = category;

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .select('name phone source aiCallStatus aiCallAttempts aiQualificationScore aiCategory nextAICallAt priority score assignedTo createdAt')
        .populate('assignedTo', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Lead.countDocuments(filter)
    ]);

    res.json({
      success: true,
      message: 'AI call leads fetched',
      data: { leads, total, page: pageNum, totalPages: Math.ceil(total / limitNum) }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch leads', error: err.message });
  }
};

/**
 * POST /api/v1/ai-calls/trigger/:leadId
 * Manually trigger an AI call for a specific lead.
 */
export const triggerCallManually = async (req: AuthenticatedRequest, res: Response<ApiResponse<any>>) => {
  try {
    const { leadId } = req.params;
    const lead = await Lead.findOne({ _id: leadId, tenantId: req.tenantId });
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const config = await AICallConfig.findOne({ tenantId: req.tenantId, enabled: true });
    if (!config) {
      return res.status(400).json({ success: false, message: 'AI calling is not enabled. Configure it in AI Call Settings.' });
    }

    const { enqueueAICall } = await import('../services/aiCallQueueService');
    const nextAttempt = (lead.aiCallAttempts || 0) + 1;
    await enqueueAICall(leadId, req.tenantId!, nextAttempt);

    await Lead.findByIdAndUpdate(leadId, { aiCallStatus: 'pending', nextAICallAt: new Date() });

    res.json({ success: true, message: `AI call queued (attempt ${nextAttempt})`, data: { leadId, attemptNumber: nextAttempt } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to trigger call', error: err.message });
  }
};

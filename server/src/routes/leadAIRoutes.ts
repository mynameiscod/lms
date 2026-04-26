import express from 'express';
import {
  generateSummary,
  getSummary,
  getQuickInsights,
  bulkGenerateSummaries,
  checkAIStatus,
  getLeadsNeedingSummary,
  getNextBestAction,
  generateFollowUpMessage,
  getTalkTrack,
} from '../controllers/leadAIController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Check AI service status
router.get(
  '/status',
  authMiddleware,
  tenantResolver,
  checkAIStatus
);

// Get leads needing summary (for batch processing)
router.get(
  '/pending',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  getLeadsNeedingSummary
);

// Bulk generate summaries (admin only)
router.post(
  '/bulk-generate',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  bulkGenerateSummaries
);

// Generate summary for a specific lead (force regenerate)
router.post(
  '/leads/:leadId/generate',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  generateSummary
);

// Get summary for a lead (uses cache or generates)
router.get(
  '/leads/:leadId/summary',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getSummary
);

// Get quick insights (rule-based, no AI)
router.get(
  '/leads/:leadId/insights',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getQuickInsights
);

// Get next best action for a lead
router.get(
  '/leads/:leadId/next-action',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads']),
  getNextBestAction
);

// Generate AI follow-up message (supports language=english|telugu|hindi)
router.get(
  '/leads/:leadId/followup-message',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads', 'edit_leads']),
  generateFollowUpMessage
);

// Generate talk track for a lead (opening, points, objection handlers, closing)
router.get(
  '/leads/:leadId/talk-track',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads']),
  getTalkTrack
);

export default router;

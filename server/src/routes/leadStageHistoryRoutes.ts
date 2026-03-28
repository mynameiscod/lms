import express from 'express';
import {
  getLeadLifecycle,
  getStageAnalytics,
  getBottleneckAnalysis,
  getStageVelocity
} from '../controllers/leadStageHistoryController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Stage analytics dashboard
router.get(
  '/analytics',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_lead_analytics']),
  getStageAnalytics
);

// Bottleneck analysis
router.get(
  '/bottlenecks',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_lead_analytics']),
  getBottleneckAnalysis
);

// Stage velocity report
router.get(
  '/velocity',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_lead_analytics']),
  getStageVelocity
);

// Lead lifecycle (for a specific lead)
router.get(
  '/lead/:leadId/lifecycle',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_leads', 'view_lead_analytics']),
  getLeadLifecycle
);

export default router;

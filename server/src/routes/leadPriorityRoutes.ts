import express from 'express';
import {
  getPriorityConfig,
  updatePriorityConfig,
  addPriorityRule,
  updatePriorityRule,
  deletePriorityRule,
  updateThresholds,
  calculateLeadScore,
  getLeadScoreBreakdown,
  bulkRecalculateScores,
  resetToDefaults
} from '../controllers/leadPriorityController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Get priority configuration
router.get(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_leads']),
  getPriorityConfig
);

// Update entire priority configuration (admin only)
router.put(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updatePriorityConfig
);

// Add a new priority rule
router.post(
  '/rules',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  addPriorityRule
);

// Update a specific priority rule
router.put(
  '/rules/:ruleId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updatePriorityRule
);

// Delete a priority rule
router.delete(
  '/rules/:ruleId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  deletePriorityRule
);

// Update priority thresholds
router.put(
  '/thresholds',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateThresholds
);

// Calculate score for a specific lead
router.get(
  '/leads/:leadId/score',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  calculateLeadScore
);

// Get score breakdown for a lead
router.get(
  '/leads/:leadId/breakdown',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getLeadScoreBreakdown
);

// Bulk recalculate scores (admin only)
router.post(
  '/recalculate',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  bulkRecalculateScores
);

// Reset to defaults (admin only)
router.post(
  '/reset',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  resetToDefaults
);

export default router;

import express from 'express';
import {
  getLostReasonConfig,
  updateLostReasonConfig,
  addReason,
  updateReason,
  deleteReason,
  reorderReasons,
  getCategories,
  getActiveReasons,
  markLeadAsLost,
  getLostReasonAnalytics,
  getReEngagementLeads,
  reEngageLead,
  resetToDefaults
} from '../controllers/lostReasonController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Get lost reason categories
router.get(
  '/categories',
  authMiddleware,
  tenantResolver,
  getCategories
);

// Get active lost reasons (for telecaller dropdown)
router.get(
  '/active',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads']),
  getActiveReasons
);

// Get full lost reason configuration (admin)
router.get(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  getLostReasonConfig
);

// Update full configuration (admin only)
router.put(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateLostReasonConfig
);

// Add a new reason
router.post(
  '/reasons',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  addReason
);

// Update a specific reason
router.put(
  '/reasons/:reasonId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateReason
);

// Delete a reason
router.delete(
  '/reasons/:reasonId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  deleteReason
);

// Reorder reasons
router.put(
  '/reasons/reorder',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  reorderReasons
);

// Get lost reason analytics
router.get(
  '/analytics',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_lead_analytics', 'manage_leads']),
  getLostReasonAnalytics
);

// Get leads due for re-engagement
router.get(
  '/reengagement',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads']),
  getReEngagementLeads
);

// Mark a lead as lost
router.post(
  '/leads/:leadId/mark-lost',
  authMiddleware,
  tenantResolver,
  roleGuard(['edit_leads', 'manage_leads', 'create_leads']),
  markLeadAsLost
);

// Re-engage a lost lead
router.post(
  '/leads/:leadId/reengage',
  authMiddleware,
  tenantResolver,
  roleGuard(['edit_leads', 'manage_leads']),
  reEngageLead
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

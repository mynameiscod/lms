import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  updateCampaignMetrics,
  deleteCampaign,
  getCampaignDashboard,
  getCampaignLeads,
  syncCampaignMetrics
} from '../controllers/adCampaignController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Dashboard (overview of all campaigns)
router.get(
  '/dashboard',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing', 'view_lead_analytics']),
  getCampaignDashboard
);

// CRUD for campaigns
router.post(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing']),
  createCampaign
);

router.get(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing', 'view_lead_analytics']),
  getCampaigns
);

router.get(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing', 'view_lead_analytics']),
  getCampaign
);

router.put(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing']),
  updateCampaign
);

router.patch(
  '/:id/metrics',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing']),
  updateCampaignMetrics
);

router.post(
  '/:id/sync-metrics',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing']),
  syncCampaignMetrics
);

router.delete(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing']),
  deleteCampaign
);

// Get leads for a specific campaign
router.get(
  '/:id/leads',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_marketing', 'view_lead_analytics', 'view_leads']),
  getCampaignLeads
);

export default router;

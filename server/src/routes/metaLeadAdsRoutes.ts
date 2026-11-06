import express from 'express';
import {
  verifyMetaLeadWebhook,
  handleMetaLeadWebhook,
  syncMetaLeads,
  setupMetaWebhook,
} from '../controllers/metaLeadAdsController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Meta Lead Ads webhook verification (GET) - Public, no auth
router.get('/webhook', verifyMetaLeadWebhook);

// Meta Lead Ads webhook handler (POST) - Public, no auth
router.post('/webhook', handleMetaLeadWebhook);

// Manual sync: pull leads from Meta page forms (lead managers only)
router.post('/sync', authMiddleware, tenantResolver, roleGuard(['manage_leads']), syncMetaLeads);

// Setup/re-subscribe Meta App webhook subscription (lead managers only; App Secret must be saved)
router.post('/setup-webhook', authMiddleware, tenantResolver, roleGuard(['manage_leads']), setupMetaWebhook);

export default router;

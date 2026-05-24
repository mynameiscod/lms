import express from 'express';
import {
  verifyMetaLeadWebhook,
  handleMetaLeadWebhook,
  syncMetaLeads,
} from '../controllers/metaLeadAdsController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Meta Lead Ads webhook verification (GET) - Public, no auth
router.get('/webhook', verifyMetaLeadWebhook);

// Meta Lead Ads webhook handler (POST) - Public, no auth
router.post('/webhook', handleMetaLeadWebhook);

// Manual sync: pull leads from Meta page forms (requires auth)
router.post('/sync', authMiddleware, tenantResolver, syncMetaLeads);

export default router;

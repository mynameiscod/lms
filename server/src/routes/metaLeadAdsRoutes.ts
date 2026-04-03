import express from 'express';
import {
  verifyMetaLeadWebhook,
  handleMetaLeadWebhook
} from '../controllers/metaLeadAdsController';

const router = express.Router();

// Meta Lead Ads webhook verification (GET) - Public, no auth
router.get('/webhook', verifyMetaLeadWebhook);

// Meta Lead Ads webhook handler (POST) - Public, no auth
router.post('/webhook', handleMetaLeadWebhook);

export default router;

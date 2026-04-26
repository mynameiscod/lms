import express from 'express';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { handleGoogleLeadWebhook, verifyGoogleWebhook } from '../controllers/googleAdsController';

const router = express.Router();

// Public endpoint — no auth (Google sends from its servers)
// Optional tenantMiddleware for multi-tenant routing via X-Tenant-Id header
router.use(tenantMiddleware as any);

// Google verifies the endpoint with a GET before sending leads
router.get('/webhook', verifyGoogleWebhook as any);

// Main lead intake
router.post('/webhook', handleGoogleLeadWebhook as any);

export default router;

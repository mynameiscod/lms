/**
 * aiCallRoutes.ts
 * Routes for AI Lead Qualification voice call feature.
 *
 * Public:
 *   POST /webhook/exotel          — Exotel status callback (no auth)
 *
 * Authenticated (admin):
 *   GET  /config                  — Get tenant AI call config
 *   PUT  /config                  — Update tenant AI call config
 *   GET  /stats                   — Dashboard stats
 *   GET  /leads                   — List leads with AI call data
 *   POST /trigger/:leadId         — Manually trigger AI call for a lead
 */
import express from 'express';
import { authMiddleware as authenticateToken } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import {
  getConfig,
  updateConfig,
  getStats,
  getAICallLeads,
  triggerCallManually
} from '../controllers/aiCallConfigController';
import { handleExotelWebhook } from '../controllers/aiCallWebhookController';

const router = express.Router();

// ── PUBLIC ── Exotel webhook (no auth — Exotel posts here directly)
router.post('/webhook/exotel', handleExotelWebhook);

// ── AUTHENTICATED ──
router.use(authenticateToken, tenantResolver);

router.get('/config', getConfig);
router.put('/config', updateConfig);
router.get('/stats', getStats);
router.get('/leads', getAICallLeads);
router.post('/trigger/:leadId', triggerCallManually);

export default router;

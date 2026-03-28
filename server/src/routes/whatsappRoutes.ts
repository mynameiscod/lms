import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  verifyWebhook,
  handleWebhook,
  markColdLeads,
  sendManualMessage,
  sendBulkColdLeadMessages
} from '../controllers/whatsappWebhookController';

const router = express.Router();

// ===================== WEBHOOK ENDPOINTS (NO AUTH - PUBLIC) =====================

// WhatsApp webhook verification (GET)
router.get('/webhook', verifyWebhook);

// WhatsApp webhook handler (POST) - receives messages
router.post('/webhook', handleWebhook);

// ===================== PROTECTED ENDPOINTS =====================

// Mark cold leads (cron job or manual trigger)
router.post(
  '/mark-cold',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  markColdLeads
);

// Send manual WhatsApp message
router.post(
  '/send',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'edit_leads']),
  sendManualMessage
);

// Send bulk messages to cold leads
router.post(
  '/bulk-cold-leads',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  sendBulkColdLeadMessages
);

export default router;

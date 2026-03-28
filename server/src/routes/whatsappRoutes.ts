import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
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
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN'),
  markColdLeads
);

// Send manual WhatsApp message
router.post(
  '/send',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  sendManualMessage
);

// Send bulk messages to cold leads
router.post(
  '/bulk-cold-leads',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN'),
  sendBulkColdLeadMessages
);

export default router;

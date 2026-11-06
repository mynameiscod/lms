import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getSummary, listEvents, leadEvents, retryFailed, testSend,
  getSettings, updateSettings,
  startSpendSync, spendStatus, spendSummary,
} from '../controllers/metaCrmController';

/** Meta CRM conversion events + ad spend. Mounted at /meta-crm. */
const router = express.Router();

const read = [authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_lead_analytics'])];
const manage = [authMiddleware, tenantResolver, roleGuard(['manage_leads'])];
const leadView = [authMiddleware, tenantResolver, roleGuard(['manage_leads', 'view_leads'])];

router.get('/summary', ...read, getSummary);
router.get('/events', ...read, listEvents);
router.get('/lead/:leadId', ...leadView, leadEvents);
router.post('/retry-failed', ...manage, retryFailed);
router.post('/test-send', ...manage, testSend);

router.get('/settings', ...manage, getSettings);
router.put('/settings', ...manage, updateSettings);

router.get('/spend/summary', ...read, spendSummary);
router.get('/spend/status', ...manage, spendStatus);
router.post('/spend/sync', ...manage, startSpendSync);
router.post('/spend/backfill', ...manage, (req, res, next) => { req.query.days = String(Math.min(90, parseInt(String(req.query.days || '90'), 10) || 90)); next(); }, startSpendSync);

export default router;

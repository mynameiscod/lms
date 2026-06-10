import express from 'express';
import {
  listFees,
  upsertFee,
  recordPayment,
  deletePayment,
  getFeeAnalytics,
  getReceipt,
  getMyReceipt,
  sendReminder,
  sendBulkReminders,
} from '../controllers/feeController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Student self-service — own receipt only. Must be before the billing guard.
router.get('/me/receipt', getMyReceipt);

router.use(roleGuard(['manage_billing']));

// Specific routes before parameterised ones
router.get('/', listFees);
router.get('/analytics', getFeeAnalytics);
router.post('/remind-bulk', sendBulkReminders);

router.put('/:studentId', upsertFee);
router.post('/:studentId/payments', recordPayment);
router.delete('/:studentId/payments/:paymentId', deletePayment);
router.get('/:studentId/receipt', getReceipt);
router.post('/:studentId/remind', sendReminder);

export default router;

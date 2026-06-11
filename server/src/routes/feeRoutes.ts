import express from 'express';
import {
  listFees,
  upsertFee,
  recordPayment,
  deletePayment,
  getFeeAnalytics,
  getReceipt,
  getMyReceipt,
  getReceiptSettings,
  updateReceiptSettings,
  sendReminder,
  sendBulkReminders,
} from '../controllers/feeController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantMiddleware);

// Student self-service — own receipt only. Must be before the billing guards.
router.get('/me/receipt', getMyReceipt);

// Read access: view_fees OR manage_billing
const canView = roleGuard(['view_fees', 'manage_billing']);
// Write access: manage_billing only
const canManage = roleGuard(['manage_billing']);

// Specific routes before parameterised ones
router.get('/', canView, listFees);
router.get('/analytics', canView, getFeeAnalytics);
router.get('/receipt-settings', canView, getReceiptSettings);
router.put('/receipt-settings', canManage, updateReceiptSettings);
router.post('/remind-bulk', canManage, sendBulkReminders);

router.put('/:studentId', canManage, upsertFee);
router.post('/:studentId/payments', canManage, recordPayment);
router.delete('/:studentId/payments/:paymentId', canManage, deletePayment);
router.get('/:studentId/receipt', canView, getReceipt);
router.post('/:studentId/remind', canManage, sendReminder);

export default router;

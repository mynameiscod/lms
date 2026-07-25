import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/paymentController';

// Authenticated Razorpay paywall routes (learning-plan unlock).
// The webhook is mounted separately as a PUBLIC route in routes/index.ts.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/config', ctrl.getPaymentConfig);
router.post('/order', ctrl.createOrder);
router.post('/verify', ctrl.verifyPayment);

// P1 — online fee collection
router.get('/fee-info', ctrl.getFeePaymentInfo);
router.post('/fee-order', ctrl.createFeeOrder);

// Admin — reconciliation + refunds
router.get('/transactions', ctrl.listTransactions);
router.post('/:id/refund', ctrl.refundPayment);

export default router;

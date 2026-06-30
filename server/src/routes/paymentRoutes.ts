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

export default router;

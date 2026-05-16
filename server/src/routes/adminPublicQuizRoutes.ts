import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/publicQuizController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/all-registrations', ctrl.getAllRegistrations);
router.get('/registrations/:subId', ctrl.getRegistrationDetail);
router.put('/registrations/:subId/approve', ctrl.approveRegistration);
router.put('/registrations/:subId/reject', ctrl.rejectRegistration);

export default router;

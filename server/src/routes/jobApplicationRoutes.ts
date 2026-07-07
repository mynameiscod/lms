import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/jobApplicationController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', ctrl.listApplications);
router.post('/', ctrl.createApplication);
router.patch('/:id/move', ctrl.moveApplication);
router.patch('/:id', ctrl.updateApplication);
router.delete('/:id', ctrl.deleteApplication);

export default router;

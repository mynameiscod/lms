import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from './notificationController';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/',              ctrl.list);
router.patch('/:id/read',   ctrl.markRead);
router.post('/read-all',     ctrl.markAllRead);

export default router;

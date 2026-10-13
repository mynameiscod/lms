import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/conceptLessonController';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get   ('/by-content/:contentId', ctrl.getByContentId);
const manage = roleGuard(['manage_learning_plans', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
router.put   ('/by-content/:contentId', manage, ctrl.upsertByContentId);
router.delete('/by-content/:contentId', manage, ctrl.deleteByContentId);

export default router;

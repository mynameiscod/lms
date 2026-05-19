import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/conceptLessonController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get   ('/by-content/:contentId', ctrl.getByContentId);
router.put   ('/by-content/:contentId', ctrl.upsertByContentId);
router.delete('/by-content/:contentId', ctrl.deleteByContentId);

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/mentorController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', ctrl.getChat);
router.post('/message', ctrl.sendMessage);
router.delete('/', ctrl.clearChat);

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentScheduleController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/',            ctrl.listSchedules);
router.post('/assign',     ctrl.assignToBatches);
router.post('/extend',     ctrl.extendSchedules);
router.patch('/:id',       ctrl.updateSchedule);
router.delete('/:id',      ctrl.removeSchedule);

export default router;

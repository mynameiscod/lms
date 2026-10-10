import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/assessmentScheduleController';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// The list was open to anyone; the writes below already check the same keys inside the controller.
router.get('/',            roleGuard(['manage_skill_assessment', 'create_quiz', 'edit_quiz', 'manage_assignments', 'manage_tenant']), ctrl.listSchedules);
router.post('/assign',     ctrl.assignToBatches);
router.post('/extend',     ctrl.extendSchedules);
router.patch('/:id',       ctrl.updateSchedule);
router.delete('/:id',      ctrl.removeSchedule);

export default router;

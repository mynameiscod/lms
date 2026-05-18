import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/curriculumController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// Curriculum CRUD
router.get('/',           ctrl.listCurricula);
router.post('/',          ctrl.createCurriculum);
router.get('/:id',        ctrl.getCurriculum);
router.put('/:id',        ctrl.updateCurriculum);
router.delete('/:id',     ctrl.deleteCurriculum);
router.patch('/:id/publish', ctrl.togglePublish);
router.post('/:id/clone', ctrl.cloneCurriculum);

// Day plans
router.get('/:id/days',           ctrl.getDayPlans);
router.put('/:id/days/:day',      ctrl.upsertDayPlan);
router.delete('/:id/days/:day',   ctrl.clearDayPlan);

// Weekend plans
router.get('/:id/weekends',                      ctrl.getWeekendPlans);
router.put('/:id/weekends/:week/:dayOfWeek',     ctrl.upsertWeekendPlan);

export default router;

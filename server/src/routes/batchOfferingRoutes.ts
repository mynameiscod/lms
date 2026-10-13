import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/batchOfferingController';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_learning_plans', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']));

router.get('/',               ctrl.listOfferings);
router.post('/',              ctrl.createOffering);
router.get('/:id',            ctrl.getOffering);
router.put('/:id',            ctrl.updateOffering);
router.delete('/:id',         ctrl.deleteOffering);
router.get('/:id/progress',   ctrl.getOfferingProgress);
router.get('/:id/day/:day',   ctrl.getOfferingDay);
router.put('/:id/day/:day',   ctrl.upsertDayOverride);

export default router;

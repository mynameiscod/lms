import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/batchOfferingController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/',               ctrl.listOfferings);
router.post('/',              ctrl.createOffering);
router.get('/:id',            ctrl.getOffering);
router.put('/:id',            ctrl.updateOffering);
router.delete('/:id',         ctrl.deleteOffering);
router.get('/:id/day/:day',   ctrl.getOfferingDay);
router.put('/:id/day/:day',   ctrl.upsertDayOverride);

export default router;

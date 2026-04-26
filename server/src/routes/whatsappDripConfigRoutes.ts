import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import {
  getDripConfig,
  saveDripConfig,
  updateSequenceForStage,
  resetToDefaults,
} from '../controllers/whatsAppDripConfigController';

const router = express.Router();

router.use(authMiddleware as any);
router.use(tenantMiddleware as any);

router.get('/', getDripConfig as any);
router.put('/', saveDripConfig as any);
router.patch('/sequence/:stageName', updateSequenceForStage as any);
router.post('/reset', resetToDefaults as any);

export default router;

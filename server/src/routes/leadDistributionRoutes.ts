import express from 'express';
import { getDistributionConfig, upsertDistributionConfig } from '../controllers/leadDistributionController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantResolver);

router.get('/', roleGuard(['manage_leads']), getDistributionConfig);
router.put('/', roleGuard(['manage_leads']), upsertDistributionConfig);

export default router;

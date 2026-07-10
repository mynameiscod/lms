import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { summary } from '../controllers/aiUsageController';

const router = Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_tenant', 'manage_tenants', 'manage_tenant_settings']));

router.get('/summary', summary);

export default router;

import express from 'express';
import { createTenant, getTenant, updateTenant } from '../controllers/tenantController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.post('/', authMiddleware, roleGuard(['manage_tenants']), createTenant);
router.get('/:tenantId', authMiddleware, getTenant);
router.patch('/:tenantId', authMiddleware, roleGuard(['manage_tenants']), updateTenant);

export default router;
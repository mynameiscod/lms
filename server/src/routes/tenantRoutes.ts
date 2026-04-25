import express from 'express';
import { 
  createTenant, 
  getTenant, 
  updateTenant, 
  generateInviteLink,
  getStudentFeatures,
  updateStudentFeatures,
  listTenants,
  getTenantModules,
  updateTenantModules
} from '../controllers/tenantController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// SUPER_ADMIN: list all tenants
router.get('/', authMiddleware, roleGuard(['manage_tenants']), listTenants);

router.post('/', authMiddleware, roleGuard(['manage_tenants']), createTenant);
router.get('/:tenantId', authMiddleware, getTenant);
router.patch('/:tenantId', authMiddleware, roleGuard(['manage_tenants']), updateTenant);
router.get('/:tenantId/invite-link', authMiddleware, generateInviteLink);
router.get('/:tenantId/student-features', authMiddleware, getStudentFeatures);
router.patch('/:tenantId/student-features', authMiddleware, roleGuard(['manage_tenant']), updateStudentFeatures);
router.get('/:tenantId/modules', authMiddleware, getTenantModules);
router.patch('/:tenantId/modules', authMiddleware, roleGuard(['manage_tenants']), updateTenantModules);

export default router;
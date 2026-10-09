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

/**
 * Only your own institute — any other id answers 404 (so ids cannot be probed). The platform
 * administrator may act on any institute. Before this, any logged-in user could read another
 * institute's record and any tenant admin could switch another institute's student features.
 */
const ownTenant = (req: any, res: any, next: any) =>
  req.user?.role === 'SUPER_ADMIN' || String(req.user?.tenantId || '') === String(req.params.tenantId)
    ? next()
    : res.status(404).json({ success: false, message: 'Institute not found' });

// SUPER_ADMIN: list all tenants
router.get('/', authMiddleware, roleGuard(['manage_tenants']), listTenants);

router.post('/', authMiddleware, roleGuard(['manage_tenants']), createTenant);
router.get('/:tenantId', authMiddleware, ownTenant, getTenant);
router.patch('/:tenantId', authMiddleware, roleGuard(['manage_tenants']), updateTenant);
router.get('/:tenantId/invite-link', authMiddleware, ownTenant, generateInviteLink);
router.get('/:tenantId/student-features', authMiddleware, ownTenant, getStudentFeatures);
router.patch('/:tenantId/student-features', authMiddleware, ownTenant, roleGuard(['manage_tenant']), updateStudentFeatures);
router.get('/:tenantId/modules', authMiddleware, ownTenant, getTenantModules);
router.patch('/:tenantId/modules', authMiddleware, roleGuard(['manage_tenants']), updateTenantModules);

export default router;
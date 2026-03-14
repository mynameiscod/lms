import express from 'express';
import { 
  createTenant, 
  getTenant, 
  updateTenant, 
  generateInviteLink,
  getStudentFeatures,
  updateStudentFeatures
} from '../controllers/tenantController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.post('/', authMiddleware, roleGuard(['manage_tenants']), createTenant);
router.get('/:tenantId', authMiddleware, getTenant);
router.patch('/:tenantId', authMiddleware, roleGuard(['manage_tenants']), updateTenant);
router.get('/:tenantId/invite-link', authMiddleware, generateInviteLink);
router.get('/:tenantId/student-features', authMiddleware, getStudentFeatures);
router.patch('/:tenantId/student-features', authMiddleware, roleGuard(['manage_tenant']), updateStudentFeatures);

export default router;
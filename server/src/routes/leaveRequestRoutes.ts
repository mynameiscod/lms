import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/leaveRequestController';

const router = Router();
router.use(authMiddleware);
router.use(tenantResolver);

// Student
router.post('/', roleGuard(['enroll_courses', 'view_courses', 'submit_assignments']), ctrl.applyLeave);
router.get('/my', roleGuard(['enroll_courses', 'view_courses', 'submit_assignments']), ctrl.myLeaves);

// Admin / instructor
const reviewPerms = ['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'];
router.get('/', roleGuard(reviewPerms), ctrl.listLeaves);
router.post('/:id/approve', roleGuard(reviewPerms), ctrl.approveLeave);
router.post('/:id/reject', roleGuard(reviewPerms), ctrl.rejectLeave);

export default router;

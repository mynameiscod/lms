import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/drillController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

// Student
router.get('/concepts', ctrl.concepts);
router.get('/assigned', ctrl.myAssignments);
router.post('/new', ctrl.newProblem);
router.post('/:id/plan', ctrl.checkPlan);
router.post('/:id/run', ctrl.run);
router.get('/my-progress', ctrl.myProgress);

// Admin / instructor
const adminGuard = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
router.get('/admin/overview', adminGuard, ctrl.adminOverview);
router.post('/admin/assign', adminGuard, ctrl.assignProblem);
router.get('/admin/assignments', adminGuard, ctrl.listAssignments);

export default router;

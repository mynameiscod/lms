import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/dsaCurriculumController';

/** DSA curriculum inside the Code Visualizer. Admin rights match the Visualizer's. */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

const adminGuard = roleGuard(['manage_visualizer', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

router.post('/admin/seed', adminGuard, ctrl.adminSeed);
router.post('/admin/modules/:slug/practice-sets', adminGuard, ctrl.adminCreatePracticeSets);

router.get('/modules', ctrl.listModules);
router.get('/modules/:slug', ctrl.getModule);

export default router;

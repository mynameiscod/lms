import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/playgroundController';

const router = Router();
router.use(authMiddleware);
router.use(tenantResolver);

// Students (and staff who can manage courses) can use the playground
const perms = ['enroll_courses', 'view_courses', 'submit_assignments', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant'];

router.post('/run', roleGuard(perms), ctrl.run);
router.post('/trace', roleGuard(perms), ctrl.traceDebug);
router.get('/', roleGuard(perms), ctrl.listPrograms);
router.post('/', roleGuard(perms), ctrl.createProgram);
router.get('/:id', roleGuard(perms), ctrl.getProgram);
router.put('/:id', roleGuard(perms), ctrl.updateProgram);
router.post('/:id/push-github', roleGuard(perms), ctrl.pushToGithub);
router.delete('/:id', roleGuard(perms), ctrl.deleteProgram);

export default router;

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/placementProgramController';

/** Public: the ad landing form. Mounted at /public/placement-program, before the generic /public. */
export const publicPlacementProgramRoutes = Router();
publicPlacementProgramRoutes.post('/register', rateLimit('signupBurst'), rateLimit('placementRegister'), ctrl.publicRegister);

/** Admin: the candidate pipeline. Same permission as Placement Drives. */
const router = Router();
router.use(authMiddleware, tenantMiddleware, roleGuard(['manage_placement', 'manage_tenant']));
router.get('/', ctrl.list);
router.get('/:id', ctrl.get);
router.put('/:id/stage', ctrl.setStage);
router.post('/:id/notes', ctrl.addNote);
export default router;

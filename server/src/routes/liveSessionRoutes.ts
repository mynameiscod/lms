import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { startLive, listActive, endLive } from '../controllers/liveSessionController';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantResolver);

// Anyone authenticated in the tenant can see what's live (students join).
router.get('/active', listActive);

// Starting / ending a live class requires instructor/admin rights.
router.post('/', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), startLive);
router.post('/:id/end', roleGuard(['create_courses', 'edit_courses', 'manage_own_courses']), endLive);

export default router;

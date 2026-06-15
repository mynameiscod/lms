import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/recordingLogController';

const router = Router();

router.use(authMiddleware);
router.use(tenantResolver);

// Any authenticated user can post telemetry for their own recording session
router.post('/', ctrl.logRecordingEvent);

// Admin / instructor: review recording sessions + timelines
const adminPerms = ['manage_tenant_users', 'manage_tenant', 'create_courses', 'edit_courses', 'manage_own_courses'];
router.get('/', roleGuard(adminPerms), ctrl.listRecordingLogs);
router.get('/:sessionId', roleGuard(adminPerms), ctrl.getRecordingLog);

export default router;

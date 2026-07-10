import express from 'express';
import {
  createLiveClass,
  listLiveClasses,
  getLiveClass,
  updateLiveClass,
  deleteLiveClass,
  startLiveClass,
  getJoinToken,
  changePeerRole,
  setHlsUrl,
  endLiveClass,
} from '../controllers/liveClassController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware);
router.use(tenantResolver);

// Instructor/admin — manage & host
const hostGuard = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

// Any authenticated member of the tenant can list / view / get a join token
router.get('/', listLiveClasses);
router.get('/:id', getLiveClass);
router.post('/:id/join-token', getJoinToken);

// Host-only
router.post('/', hostGuard, createLiveClass);
router.patch('/:id', hostGuard, updateLiveClass);
router.delete('/:id', hostGuard, deleteLiveClass);
router.post('/:id/start', hostGuard, startLiveClass);
router.post('/:id/end', hostGuard, endLiveClass);
router.post('/:id/hls-url', hostGuard, setHlsUrl);
router.post('/:id/change-role', hostGuard, changePeerRole);

export default router;

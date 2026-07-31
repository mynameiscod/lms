import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  listTracks, createTrack, updateTrack, deleteTrack, getTrack,
  libraryFor, setTrackItems,
  listAssignments, upsertAssignment, deleteAssignment, previewToday,
  myGate, studentGate, setBypass, labProgress,
} from '../controllers/labTrackController';

const router = Router();

/**
 * Authoring a track and attaching it to a batch both use the existing lab-management
 * permissions, so nobody gains reach they did not already have over these modules.
 * Reading is deliberately wider than writing: an instructor may need to see which day a
 * batch is on without being able to rewrite the plan under them.
 */
const MANAGE = roleGuard(['manage_thinking_lab', 'manage_communication_lab', 'manage_tenant']);
const VIEW = roleGuard(['manage_thinking_lab', 'manage_communication_lab', 'manage_tenant', 'view_reports']);

// Content library for the builder's picker
router.get('/library', authMiddleware, tenantResolver, VIEW, libraryFor);

// Tracks
router.get('/', authMiddleware, tenantResolver, VIEW, listTracks);
router.post('/', authMiddleware, tenantResolver, MANAGE, createTrack);
router.get('/:id', authMiddleware, tenantResolver, VIEW, getTrack);
router.put('/:id', authMiddleware, tenantResolver, MANAGE, updateTrack);
router.delete('/:id', authMiddleware, tenantResolver, MANAGE, deleteTrack);
router.put('/:id/items', authMiddleware, tenantResolver, MANAGE, setTrackItems);

// Batch assignments + config
router.get('/assignments/list', authMiddleware, tenantResolver, VIEW, listAssignments);
router.post('/assignments', authMiddleware, tenantResolver, MANAGE, upsertAssignment);
router.delete('/assignments/:id', authMiddleware, tenantResolver, MANAGE, deleteAssignment);
router.get('/assignments/preview', authMiddleware, tenantResolver, VIEW, previewToday);

router.get('/progress', authMiddleware, tenantResolver, VIEW, labProgress);

// Gate: the student's own state needs no admin permission, only a session.
router.get('/gate/me', authMiddleware, tenantResolver, myGate);
router.get('/gate/student/:userId', authMiddleware, tenantResolver, VIEW, studentGate);
router.post('/gate/bypass', authMiddleware, tenantResolver, MANAGE, setBypass);

export default router;

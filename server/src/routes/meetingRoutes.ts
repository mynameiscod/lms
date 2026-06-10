import express from 'express';
import {
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  getMyUpcomingMeetings,
} from '../controllers/meetingController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// All routes require authentication and tenant resolution
router.use(authMiddleware, tenantResolver);

// GET /meetings/upcoming-mine — meetings for current user
router.get('/upcoming-mine', getMyUpcomingMeetings);

// CRUD
router.get('/', roleGuard(['manage_leads', 'view_leads']), getMeetings);
router.post('/', roleGuard(['manage_leads', 'create_leads']), createMeeting);
router.get('/:id', roleGuard(['manage_leads', 'view_leads']), getMeeting);
router.put('/:id', roleGuard(['manage_leads', 'create_leads']), updateMeeting);
router.delete('/:id', roleGuard(['manage_leads']), deleteMeeting);

export default router;

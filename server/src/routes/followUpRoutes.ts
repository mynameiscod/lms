import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  createFollowUp,
  getMyFollowUps,
  getTodayFollowUps,
  getOverdueFollowUps,
  completeFollowUp,
  rescheduleFollowUp,
  getLeadFollowUps,
  deleteFollowUp,
  getFollowUpCalendar,
  markAsMissed,
  quickSchedule
} from '../controllers/followUpController';

const router = express.Router();

const leadPermissions = ['manage_leads', 'view_leads', 'edit_leads'];

// ===================== MY FOLLOW-UPS =====================

// Get my follow-ups
router.get(
  '/my',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getMyFollowUps
);

// Get today's follow-ups (dashboard)
router.get(
  '/today',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getTodayFollowUps
);

// Get overdue follow-ups
router.get(
  '/overdue',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getOverdueFollowUps
);

// Get calendar view
router.get(
  '/calendar',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getFollowUpCalendar
);

// ===================== CRUD =====================

// Create follow-up
router.post(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  createFollowUp
);

// Quick schedule (call again, tomorrow, etc)
router.post(
  '/quick',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  quickSchedule
);

// Get lead's follow-ups
router.get(
  '/lead/:leadId',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getLeadFollowUps
);

// Complete follow-up
router.put(
  '/:id/complete',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  completeFollowUp
);

// Reschedule follow-up
router.put(
  '/:id/reschedule',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  rescheduleFollowUp
);

// Mark as missed
router.put(
  '/:id/missed',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  markAsMissed
);

// Delete follow-up
router.delete(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  deleteFollowUp
);

export default router;

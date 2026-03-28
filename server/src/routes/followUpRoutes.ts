import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
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

// ===================== MY FOLLOW-UPS =====================

// Get my follow-ups
router.get(
  '/my',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  getMyFollowUps
);

// Get today's follow-ups (dashboard)
router.get(
  '/today',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  getTodayFollowUps
);

// Get overdue follow-ups
router.get(
  '/overdue',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  getOverdueFollowUps
);

// Get calendar view
router.get(
  '/calendar',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  getFollowUpCalendar
);

// ===================== CRUD =====================

// Create follow-up
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  createFollowUp
);

// Quick schedule (call again, tomorrow, etc)
router.post(
  '/quick',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  quickSchedule
);

// Get lead's follow-ups
router.get(
  '/lead/:leadId',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  getLeadFollowUps
);

// Complete follow-up
router.put(
  '/:id/complete',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  completeFollowUp
);

// Reschedule follow-up
router.put(
  '/:id/reschedule',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  rescheduleFollowUp
);

// Mark as missed
router.put(
  '/:id/missed',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  markAsMissed
);

// Delete follow-up
router.delete(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'INSTRUCTOR', 'STAFF'),
  deleteFollowUp
);

export default router;

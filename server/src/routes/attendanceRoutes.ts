import express from 'express';
import {
  markAttendance,
  getStudentAttendance,
  getBatchAttendance,
  getBatchAttendanceSummary,
  getStudentAttendanceSummary,
  getAttendanceByDateRange,
  deleteAttendance,
  bulkMarkAttendance,
  exportAttendanceCSV
} from '../controllers/attendanceController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { requireBatchFeature } from '../middleware/batchFeatureGuard';

const router = express.Router();

// Apply middleware
router.use(authMiddleware);
router.use(tenantResolver);

// Mark attendance - ATTENDANCE_ADMIN only
router.post(
  '/',
  roleGuard(['mark_attendance']),
  markAttendance
);

// Get student attendance - Student can view their own, admins can view all.
// requireBatchFeature only blocks a STUDENT whose batch disabled attendance.
router.get(
  '/student/:studentId',
  requireBatchFeature('attendance'),
  getStudentAttendance
);

// Get batch attendance for a specific date
router.get(
  '/batch/:batchId/date',
  getBatchAttendance
);

// Get batch attendance summary
router.get(
  '/batch/:batchId/summary',
  getBatchAttendanceSummary
);

// Get attendance by date range
router.get(
  '/range',
  getAttendanceByDateRange
);

// Export attendance as CSV
router.get(
  '/export/csv',
  roleGuard(['mark_attendance']),
  exportAttendanceCSV
);

// Bulk mark attendance
router.post(
  '/bulk',
  roleGuard(['mark_attendance']),
  bulkMarkAttendance
);

// Get student attendance summary
router.get(
  '/student/:studentId/summary',
  requireBatchFeature('attendance'),
  getStudentAttendanceSummary
);

// Delete attendance record - ATTENDANCE_ADMIN only
router.delete(
  '/:attendanceId',
  roleGuard(['mark_attendance']),
  deleteAttendance
);

export default router;

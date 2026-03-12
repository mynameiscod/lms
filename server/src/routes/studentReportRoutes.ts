import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getStudentReport,
  searchStudents,
  getAllStudentsSummary
} from '../controllers/studentReportController';

const router = Router();

// Search students (admin/instructor only)
router.get(
  '/search',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_tenant_users', 'manage_tenant_courses']),
  searchStudents
);

// Get all students summary (admin/instructor only)
router.get(
  '/summary',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_tenant_users', 'manage_tenant_courses']),
  getAllStudentsSummary
);

// Get specific student report (admin/instructor only)
router.get(
  '/:studentId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_tenant_users', 'manage_tenant_courses']),
  getStudentReport
);

export default router;

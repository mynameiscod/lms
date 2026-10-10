import express from 'express';
import dashboardController from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import { AuthenticatedRequest } from '../types';
import { Response, NextFunction } from 'express';

/** Staff counts are for staff: a student (or CareerPilot member) without a custom role gets nothing. */
const notAStudent = (req: AuthenticatedRequest, res: Response, next: NextFunction) =>
  (req.user?.role === 'STUDENT' && !(req.user as any)?.customRoleId)
    ? res.status(403).json({ success: false, message: 'Access denied' })
    : next();

const router = express.Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Admin stats
router.get('/admin-stats', notAStudent as any, dashboardController.getAdminStats);

// Rich admin overview (full dashboard)
// Revenue, leads and placements for the whole institute — was reachable by any logged-in user.
router.get('/admin-overview', roleGuard(['view_admin_dashboard']), dashboardController.getAdminOverview);

// Student dashboard
router.get('/student', dashboardController.getStudentDashboard);

export default router;

import express from 'express';
import dashboardController from '../controllers/dashboardController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = express.Router();

// All routes require authentication and tenant context
router.use(authMiddleware);
router.use(tenantMiddleware);

// Student dashboard
router.get('/student', dashboardController.getStudentDashboard);

export default router;

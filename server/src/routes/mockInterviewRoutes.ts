import express from 'express';
import { mockInterviewController } from '../controllers/mockInterviewController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);
router.use(tenantResolver);

// Get available interview categories (public route for authenticated users)
router.get('/categories', mockInterviewController.getCategories);

// Student routes
router.post('/', mockInterviewController.createInterview);
router.get('/my-interviews', mockInterviewController.getMyInterviews);
router.get('/my-stats', mockInterviewController.getMyStats);
router.get('/my-assigned', mockInterviewController.getMyAssignedInterviews);
router.get('/leaderboard/:batchId', mockInterviewController.getBatchLeaderboard);

// ==================== ADMIN ASSIGNMENT ROUTES ====================
// Assign to single student
router.post(
  '/assign/student',
  roleGuard(['create_courses']),
  mockInterviewController.assignToStudent
);

// Assign to batch of students
router.post(
  '/assign/batch',
  roleGuard(['create_courses']),
  mockInterviewController.assignToBatch
);

// Get all assigned interviews (admin)
router.get(
  '/assigned',
  roleGuard(['create_courses']),
  mockInterviewController.getAssignedInterviews
);

// Get assignment statistics
router.get(
  '/assignment-stats',
  roleGuard(['create_courses']),
  mockInterviewController.getAssignmentStats
);

// Get interviews with recordings (admin)
router.get(
  '/recordings',
  roleGuard(['create_courses']),
  mockInterviewController.getInterviewsWithRecordings
);

// Interview session routes
router.get('/:interviewId', mockInterviewController.getInterview);
router.post('/:interviewId/start', mockInterviewController.startInterview);
router.post('/:interviewId/answer', mockInterviewController.submitAnswer);
router.post('/:interviewId/complete', mockInterviewController.completeInterview);
router.post('/:interviewId/cancel', mockInterviewController.cancelInterview);
router.post('/:interviewId/recording', mockInterviewController.saveRecording);

export default router;

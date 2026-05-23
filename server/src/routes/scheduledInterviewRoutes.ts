import express from 'express';
import {
  createInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
  addStudents,
  submitFeedback,
  getFeedback,
  releaseFeedback,
  releaseAllFeedback,
  getMyInterviews,
  getMyFeedback,
  getMyFeedbackForInterview,
} from '../controllers/scheduledInterviewController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

const adminGuard = roleGuard(['manage_tenant_courses', 'manage_leads', 'TENANT_ADMIN']);

// ── Student routes (all authenticated users) ─────────────────────────────────
router.get('/my', authMiddleware, tenantResolver, getMyInterviews);
router.get('/my-feedback', authMiddleware, tenantResolver, getMyFeedback);
router.get('/:id/my-feedback', authMiddleware, tenantResolver, getMyFeedbackForInterview);

// ── Admin / Staff routes ──────────────────────────────────────────────────────
router.post('/', authMiddleware, tenantResolver, createInterview);
router.get('/', authMiddleware, tenantResolver, getInterviews);
router.get('/:id', authMiddleware, tenantResolver, getInterviewById);
router.put('/:id', authMiddleware, tenantResolver, updateInterview);
router.delete('/:id', authMiddleware, tenantResolver, adminGuard, deleteInterview);
router.post('/:id/students', authMiddleware, tenantResolver, addStudents);

// Feedback management
router.post('/:id/feedback/:studentId', authMiddleware, tenantResolver, submitFeedback);
router.get('/:id/feedback/:studentId', authMiddleware, tenantResolver, getFeedback);
router.patch('/:id/feedback/:studentId/release', authMiddleware, tenantResolver, releaseFeedback);
router.patch('/:id/release-all', authMiddleware, tenantResolver, releaseAllFeedback);

export default router;

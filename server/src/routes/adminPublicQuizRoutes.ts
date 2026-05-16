import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/publicQuizController';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

// Available quizzes (for week-config dropdown)
router.get('/available-quizzes', ctrl.getAvailableQuizzes);

// Week configuration (which quiz for which week + topper count)
router.get('/week-config', ctrl.getWeekConfig);
router.put('/week-config', ctrl.setWeekConfig);

// Leaderboard for a week
router.get('/leaderboard', ctrl.getLeaderboard);

// All registrations across all weeks
router.get('/all-registrations', ctrl.getAllRegistrations);

// Individual registration detail + approve/reject
router.get('/registrations/:subId', ctrl.getRegistrationDetail);
router.put('/registrations/:subId/approve', ctrl.approveRegistration);
router.put('/registrations/:subId/reject', ctrl.rejectRegistration);

export default router;

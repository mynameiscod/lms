import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/publicQuizController';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);
/** Management only — students reach their own data through the /my routes. Same keys as the menu item. */
router.use(roleGuard(['create_quiz', 'edit_quiz', 'manage_tenant']));
router.use(express.json());

// Available quizzes (for week-config dropdown)
router.get('/available-quizzes', ctrl.getAvailableQuizzes);

// Week configuration (which quiz for which week + topper count)
router.get('/week-config', ctrl.getWeekConfig);
router.get('/all-batch-configs', ctrl.getAllBatchConfigs);
router.put('/week-config', ctrl.setWeekConfig);

// Leaderboard for a week
router.get('/leaderboard', ctrl.getLeaderboard);

// All registrations across all weeks
router.get('/all-registrations', ctrl.getAllRegistrations);

// Send quiz links to all approved students in a week
router.post('/send-quiz-links', ctrl.sendWeekQuizLinks);

// Individual registration detail + approve/reject/generate-link
router.get('/registrations/:subId', ctrl.getRegistrationDetail);
router.put('/registrations/:subId/approve', ctrl.approveRegistration);
router.put('/registrations/:subId/reject', ctrl.rejectRegistration);
router.put('/registrations/:subId/generate-link', ctrl.generateQuizLink);

export default router;

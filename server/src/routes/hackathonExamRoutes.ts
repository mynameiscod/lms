import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/hackathonExamAdminController';

/**
 * Running the exam, from the admin side.
 *
 * The order of these is the product: configure, prove the bank can fill it, draw the papers,
 * invite, watch, grade, review, publish. Each step refuses to run before the one before it,
 * because none of them is easy to undo in front of 800 people.
 */
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

/* Configure */
router.get('/by-hackathon/:hackathonId', ctrl.getExamForHackathon);
router.post('/by-hackathon/:hackathonId', ctrl.upsertExam);

/* Prove it can be drawn, then draw it */
router.get('/:id/coverage', ctrl.getExamCoverage);
router.get('/:id/readiness', ctrl.getExamReadiness);
router.post('/:id/provision', ctrl.provisionExamAttempts);
router.post('/:id/invite', ctrl.sendExamInvitations);

/* Watch it happen */
router.get('/:id/dashboard', ctrl.getExamDashboard);
router.get('/:id/attempts', ctrl.listExamAttempts);
router.get('/:id/attempts/:attemptId', ctrl.getExamAttempt);

/* Grade, review, publish */
router.post('/:id/grade', ctrl.runGradingPass);
router.post('/:id/attempts/:attemptId/score', ctrl.overrideAttemptScore);
router.get('/:id/leaderboard', ctrl.getExamLeaderboard);
router.post('/:id/close', ctrl.closeExam);
router.post('/:id/publish', ctrl.publishExamResults);
router.post('/:id/send-results', ctrl.sendExamResults);

export default router;

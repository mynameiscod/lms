import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
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
// Same split as hackathonRoutes: reading results needs view, everything that changes an exam needs manage.
const MANAGE = roleGuard(['manage_hackathons']);
const VIEW = roleGuard(['view_hackathons', 'manage_hackathons']);

/* Configure */
router.get('/by-hackathon/:hackathonId', VIEW, ctrl.getExamForHackathon);
router.post('/by-hackathon/:hackathonId', MANAGE, ctrl.upsertExam);

/* Prove it can be drawn, then draw it */
router.get('/:id/coverage', VIEW, ctrl.getExamCoverage);
router.get('/:id/readiness', VIEW, ctrl.getExamReadiness);
/** Which questions a section draws from — 'how many' is not the same as 'which'. */
router.get('/:id/sections/:key/pool', MANAGE, ctrl.getSectionPool);
router.post('/:id/provision', MANAGE, ctrl.provisionExamAttempts);
router.post('/:id/invite', MANAGE, ctrl.sendExamInvitations);
/* A bulk send runs in the background and returns 202. These report how far it has got —
   without a jobId, whichever send is currently running for this exam. */
router.get('/:id/send-progress', VIEW, ctrl.getExamSendProgress);
router.get('/:id/send-progress/:jobId', VIEW, ctrl.getExamSendProgress);

/* Watch it happen */
router.get('/:id/dashboard', VIEW, ctrl.getExamDashboard);
router.get('/:id/attempts', VIEW, ctrl.listExamAttempts);
router.get('/:id/attempts/:attemptId', VIEW, ctrl.getExamAttempt);
router.post('/:id/attempts/:attemptId/resend-invite', MANAGE, ctrl.resendAttemptInvite);
router.post('/:id/attempts/:attemptId/verify', MANAGE, ctrl.verifyAttemptManually);
router.patch('/:id/attempts/:attemptId/mobile', MANAGE, ctrl.updateAttemptMobile);
router.get('/:id/attempts/:attemptId/recording/:seq', MANAGE, ctrl.streamAttemptRecording);
router.delete('/:id/attempts/:attemptId/recording', MANAGE, ctrl.deleteAttemptRecording);

/* Grade, review, publish */
router.post('/:id/grade', MANAGE, ctrl.runGradingPass);
router.post('/:id/attempts/:attemptId/score', MANAGE, ctrl.overrideAttemptScore);
router.get('/:id/leaderboard', VIEW, ctrl.getExamLeaderboard);
router.post('/:id/close', MANAGE, ctrl.closeExam);
router.post('/:id/publish', MANAGE, ctrl.publishExamResults);
router.post('/:id/send-results', MANAGE, ctrl.sendExamResults);

export default router;

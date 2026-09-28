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
/** Which questions a section draws from — 'how many' is not the same as 'which'. */
router.get('/:id/sections/:key/pool', ctrl.getSectionPool);
router.post('/:id/provision', ctrl.provisionExamAttempts);
router.post('/:id/invite', ctrl.sendExamInvitations);
/* A bulk send runs in the background and returns 202. These report how far it has got —
   without a jobId, whichever send is currently running for this exam. */
router.get('/:id/send-progress', ctrl.getExamSendProgress);
router.get('/:id/send-progress/:jobId', ctrl.getExamSendProgress);

/* Watch it happen */
router.get('/:id/dashboard', ctrl.getExamDashboard);
router.get('/:id/attempts', ctrl.listExamAttempts);
router.get('/:id/attempts/:attemptId', ctrl.getExamAttempt);
router.post('/:id/attempts/:attemptId/resend-invite', ctrl.resendAttemptInvite);
router.post('/:id/attempts/:attemptId/verify', ctrl.verifyAttemptManually);
router.patch('/:id/attempts/:attemptId/mobile', ctrl.updateAttemptMobile);
router.get('/:id/attempts/:attemptId/recording/:seq', ctrl.streamAttemptRecording);
router.delete('/:id/attempts/:attemptId/recording', ctrl.deleteAttemptRecording);

/* Grade, review, publish */
router.post('/:id/grade', ctrl.runGradingPass);
router.post('/:id/attempts/:attemptId/score', ctrl.overrideAttemptScore);
router.get('/:id/leaderboard', ctrl.getExamLeaderboard);
router.post('/:id/close', ctrl.closeExam);
router.post('/:id/publish', ctrl.publishExamResults);
router.post('/:id/send-results', ctrl.sendExamResults);

export default router;

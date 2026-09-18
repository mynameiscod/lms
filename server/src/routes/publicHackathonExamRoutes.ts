import express from 'express';
import * as ctrl from '../controllers/publicHackathonExamController';

/**
 * The candidate's exam, unauthenticated.
 *
 * A team was given a code, not an account. Identity is the team code plus the member's own
 * mobile, proved by an OTP to that number; after that the exam token is the credential and
 * every handler re-reads the attempt rather than trusting anything the tab remembers.
 */
const router = express.Router();

/* Before the paper: find the exam, prove who you are. */
router.get('/hackathon-exams/:slug', ctrl.getExamBySlug);
router.post('/hackathon-exams/otp/request', ctrl.requestExamOtp);
router.post('/hackathon-exams/otp/verify', ctrl.verifyExamOtp);

/* The paper. `:token` is the exam token issued at verification. */
router.get('/hackathon-exams/attempt/:token', ctrl.getExamOverview);
router.post('/hackathon-exams/attempt/:token/start', ctrl.startExam);
router.post('/hackathon-exams/attempt/:token/heartbeat', ctrl.examHeartbeat);
router.post('/hackathon-exams/attempt/:token/answer', ctrl.saveExamAnswer);
router.post('/hackathon-exams/attempt/:token/violation', ctrl.reportExamViolation);
router.post('/hackathon-exams/attempt/:token/run', ctrl.runExamCode);
router.post('/hackathon-exams/attempt/:token/submit', ctrl.submitExam);
router.get('/hackathon-exams/attempt/:token/result', ctrl.getExamResult);

export default router;

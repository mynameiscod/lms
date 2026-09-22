import express from 'express';
import * as ctrl from '../controllers/publicHackathonExamController';
import multer from 'multer';

/* Video chunks are held in memory and forwarded straight to Bunny — they are never
   written to this disk, which is the volume the exam itself is running on. 20MB is a
   generous ceiling for a fifteen-second slice and a firm one against anything else. */
const chunkUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

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
/* Mobile alone — offline cohorts are never given a slug or a team code. */
router.post('/hackathon-exams/otp/by-mobile', ctrl.requestExamOtpByMobile);
router.post('/hackathon-exams/otp/by-mobile/verify', ctrl.verifyExamOtpByMobile);
router.post('/hackathon-exams/otp/request', ctrl.requestExamOtp);
router.post('/hackathon-exams/otp/verify', ctrl.verifyExamOtp);

/* The paper. `:token` is the exam token issued at verification. */
router.get('/hackathon-exams/attempt/:token', ctrl.getExamOverview);
/* Proving who you are when you arrived on your own link, and never saw a team code. */
router.post('/hackathon-exams/attempt/:token/otp/request', ctrl.requestExamOtpByToken);
router.post('/hackathon-exams/attempt/:token/otp/verify', ctrl.verifyExamOtpByToken);
router.post('/hackathon-exams/attempt/:token/start', ctrl.startExam);
router.post('/hackathon-exams/attempt/:token/heartbeat', ctrl.examHeartbeat);
router.post('/hackathon-exams/attempt/:token/answer', ctrl.saveExamAnswer);
router.post('/hackathon-exams/attempt/:token/violation', ctrl.reportExamViolation);
router.post('/hackathon-exams/attempt/:token/run', ctrl.runExamCode);
router.post('/hackathon-exams/attempt/:token/recording/state', express.json(), ctrl.setRecordingState);
router.post('/hackathon-exams/attempt/:token/recording/chunk', chunkUpload.single('chunk'), ctrl.uploadRecordingChunk);
router.post('/hackathon-exams/attempt/:token/submit', ctrl.submitExam);
router.get('/hackathon-exams/attempt/:token/result', ctrl.getExamResult);

export default router;

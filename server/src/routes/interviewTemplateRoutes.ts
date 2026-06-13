import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/interviewTemplateController';

const router = Router();

// ── Multer config for interview answer recordings (audio/video) ──────────
const interviewUploadsDir = path.join(__dirname, '../../uploads/interview-recordings');
if (!fs.existsSync(interviewUploadsDir)) {
  fs.mkdirSync(interviewUploadsDir, { recursive: true });
}

const interviewRecordingStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, interviewUploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `interview-${unique}${ext}`);
  },
});

const uploadInterviewRecording = multer({
  storage: interviewRecordingStorage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    const allowed = /^(audio|video)\//;
    if (allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed'));
    }
  },
});

// All routes require auth + tenant
router.use(authMiddleware);
router.use(tenantResolver);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN / INSTRUCTOR — Template Management
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/templates',
  roleGuard(['manage_interview_templates']),
  ctrl.createTemplate
);

router.get(
  '/templates',
  roleGuard(['manage_interview_templates']),
  ctrl.getTemplates
);

router.get(
  '/templates/:templateId',
  roleGuard(['manage_interview_templates']),
  ctrl.getTemplateById
);

router.put(
  '/templates/:templateId',
  roleGuard(['manage_interview_templates']),
  ctrl.updateTemplate
);

router.post(
  '/templates/:templateId/publish',
  roleGuard(['manage_interview_templates']),
  ctrl.publishTemplate
);

router.post(
  '/templates/:templateId/archive',
  roleGuard(['manage_interview_templates']),
  ctrl.archiveTemplate
);

router.post(
  '/templates/:templateId/duplicate',
  roleGuard(['manage_interview_templates']),
  ctrl.duplicateTemplate
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN / INSTRUCTOR — Question Bank
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/question-bank',
  roleGuard(['manage_interview_templates']),
  ctrl.createQuestion
);

router.post(
  '/question-bank/bulk',
  roleGuard(['manage_interview_templates']),
  ctrl.bulkCreateQuestions
);

router.post(
  '/question-bank/ai-generate',
  roleGuard(['manage_interview_templates']),
  ctrl.aiGenerateQuestions
);

router.get(
  '/question-bank',
  roleGuard(['manage_interview_templates']),
  ctrl.getQuestions
);

router.get(
  '/question-bank/topics',
  roleGuard(['manage_interview_templates']),
  ctrl.getQuestionTopics
);

router.get(
  '/question-bank/tags',
  roleGuard(['manage_interview_templates']),
  ctrl.getQuestionTags
);

router.get(
  '/question-bank/:questionId',
  roleGuard(['manage_interview_templates']),
  ctrl.getQuestionById
);

router.put(
  '/question-bank/:questionId',
  roleGuard(['manage_interview_templates']),
  ctrl.updateQuestion
);

router.post(
  '/question-bank/:questionId/deactivate',
  roleGuard(['manage_interview_templates']),
  ctrl.deactivateQuestion
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN / INSTRUCTOR — Assignment (Push)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/assignments/push',
  roleGuard(['assign_interviews']),
  ctrl.pushAssignment
);

router.post(
  '/assignments/push-batch',
  roleGuard(['assign_interviews']),
  ctrl.pushAssignmentToBatch
);

router.post(
  '/assignments/push-course',
  roleGuard(['assign_interviews']),
  ctrl.pushAssignmentToCourse
);

router.get(
  '/assignments',
  roleGuard(['assign_interviews']),
  ctrl.getAssignments
);

router.post(
  '/assignments/:assignmentId/cancel',
  roleGuard(['assign_interviews']),
  ctrl.cancelAssignment
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN / INSTRUCTOR — Evaluation & Review
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/attempts/:attemptId/evaluate',
  roleGuard(['evaluate_interviews']),
  ctrl.evaluateAttempt
);

router.post(
  '/attempts/:attemptId/publish',
  roleGuard(['evaluate_interviews']),
  ctrl.publishAttemptResult
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — Analytics
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/analytics/admin',
  roleGuard(['manage_interview_templates']),
  ctrl.getAdminAnalytics
);

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT — Interview Flow
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/student/assignments',
  roleGuard(['attempt_interviews']),
  ctrl.getStudentAssignments
);

router.post(
  '/student/attempts/start',
  roleGuard(['attempt_interviews']),
  ctrl.startAttempt
);

router.get(
  '/student/attempts',
  roleGuard(['attempt_interviews']),
  ctrl.getStudentAttempts
);

router.get(
  '/student/attempts/:attemptId',
  roleGuard(['attempt_interviews']),
  ctrl.getAttempt
);

router.post(
  '/student/attempts/:attemptId/answer',
  roleGuard(['attempt_interviews']),
  ctrl.saveAnswer
);

router.post(
  '/student/attempts/:attemptId/skip',
  roleGuard(['attempt_interviews']),
  ctrl.skipQuestion
);

router.post(
  '/student/attempts/:attemptId/complete-section',
  roleGuard(['attempt_interviews']),
  ctrl.completeSection
);

router.post(
  '/student/attempts/:attemptId/submit',
  roleGuard(['attempt_interviews']),
  ctrl.submitAttempt
);

router.get(
  '/student/attempts/:attemptId/report',
  roleGuard(['attempt_interviews']),
  ctrl.getAttemptReport
);

router.get(
  '/student/analytics',
  roleGuard(['attempt_interviews']),
  ctrl.getStudentAnalytics
);

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN — View any attempt report (for evaluation)
// ═══════════════════════════════════════════════════════════════════════════

router.get(
  '/attempts/:attemptId/report',
  roleGuard(['evaluate_interviews']),
  ctrl.getAttemptReport
);

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT — Upload answer recording (audio/video per question)
// ═══════════════════════════════════════════════════════════════════════════

router.post(
  '/student/attempts/:attemptId/upload-answer',
  roleGuard(['attempt_interviews']),
  uploadInterviewRecording.single('recording'),
  ctrl.uploadAnswerRecording
);

export default router;

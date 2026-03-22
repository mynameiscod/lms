import { Router } from 'express';
import * as fs from 'fs';
import multer from 'multer';
import * as quizController from '../controllers/quizController';
import * as questionController from '../controllers/questionController';
import * as quizReportController from '../controllers/quizReportController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

// Ensure recordings directory exists
const recordingsDir = 'uploads/quiz-recordings';
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir, { recursive: true });
}

const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, recordingsDir),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 500 * 1024 * 1024 } // 500 MB max
});

const router = Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// ========== QUIZ REPORTS (Must come before generic /:quizId routes) ==========

// Get all quizzes for reporting
router.get(
  '/report/list',
  roleGuard(['view_reports']),
  quizReportController.getQuizzesForReporting
);

// ========== QUIZ ROUTES ==========

// Quiz Routes
router.post(
  '/',
  roleGuard(['create_quiz']),
  quizController.createQuiz
);

router.get('/instructor', quizController.getQuizzes);

router.get('/chapter/:chapterId', quizController.getQuizzesByChapter);

router.get('/:quizId/attempts/latest', quizController.getLatestStudentAttempt);
router.get('/student/available', quizController.getStudentQuizzes);

router.get('/:quizId', quizController.getQuizById);

router.put(
  '/:quizId',
  roleGuard(['edit_quiz']),
  quizController.updateQuiz
);

router.delete(
  '/:quizId',
  roleGuard(['delete_quiz']),
  quizController.deleteQuiz
);

router.get('/:quizId/access', quizController.checkQuizAccess);

router.get('/:quizId/availability', quizController.checkQuizAvailability);

// Quiz Attempt Routes
router.post('/:quizId/start', quizController.startQuizAttempt);

router.get('/:quizId/questions', quizController.getQuizQuestions);

router.post('/:quizId/attempt/:attemptId/submit', quizController.submitQuizAttempt);

router.post('/:quizId/attempt/:attemptId/recording', recordingUpload.single('recording'), quizController.uploadAttemptRecording);

router.get('/attempt/:attemptId/results', quizController.getQuizResults);
router.get('/attempt/:attemptId/student-results', quizController.getStudentAttemptResults);

// Question Routes
router.post(
  '/:quizId/questions',
  roleGuard(['create_question']),
  questionController.createQuestion
);

router.get('/:quizId/questions/list', questionController.getQuestionsForQuiz);

router.get('/:quizId/questions/:questionId', questionController.getQuestionById);

router.put(
  '/:quizId/questions/:questionId',
  roleGuard(['edit_question']),
  questionController.updateQuestion
);

router.delete(
  '/:quizId/questions/:questionId',
  roleGuard(['delete_question']),
  questionController.deleteQuestion
);

router.post(
  '/:quizId/questions/bulk',
  roleGuard(['create_question']),
  questionController.bulkCreateQuestions
);

router.post(
  '/:quizId/questions/:questionId/validate',
  questionController.validateAnswer
);

// ========== QUESTION BANK LINKING ==========

// Link multiple questions from Question Bank to a quiz
router.post(
  '/:quizId/link-questions',
  roleGuard(['edit_quiz']),
  quizController.linkQuestionsToQuiz
);

// Add a single question to a quiz
router.post(
  '/:quizId/add-question/:questionId',
  roleGuard(['edit_quiz']),
  quizController.addQuestionToQuiz
);

// Remove a single question from a quiz
router.delete(
  '/:quizId/remove-question/:questionId',
  roleGuard(['edit_quiz']),
  quizController.removeQuestionFromQuiz
);

// Remove all questions from a quiz
router.delete(
  '/:quizId/remove-all-questions',
  roleGuard(['edit_quiz']),
  quizController.removeQuestionsFromQuiz
);

// Get available questions from Question Bank for a quiz
router.get(
  '/:quizId/available-questions',
  quizController.getAvailableQuestions
);

// ========== QUIZ REPORTS ==========

// Get quiz report summary
router.get(
  '/:quizId/report/summary',
  roleGuard(['view_reports']),
  quizReportController.getQuizReportSummary
);

// Get all quiz attempts
router.get(
  '/:quizId/report/attempts',
  roleGuard(['view_reports']),
  quizReportController.getQuizAttempts
);

// Get student performance report
router.get(
  '/:quizId/report/student-performance',
  roleGuard(['view_reports']),
  quizReportController.getStudentPerformanceReport
);

// Get question analytics
router.get(
  '/:quizId/report/question-analytics',
  roleGuard(['view_reports']),
  quizReportController.getQuestionAnalytics
);

// Get complete quiz report
router.get(
  '/:quizId/report/complete',
  roleGuard(['view_reports']),
  quizReportController.getCompleteQuizReport
);

// Export quiz report as CSV
router.get(
  '/:quizId/report/export-csv',
  roleGuard(['view_reports']),
  quizReportController.exportQuizReportCSV
);

// Get top performers
router.get(
  '/:quizId/report/top-performers',
  roleGuard(['view_reports']),
  quizReportController.getTopPerformers
);

// Get quiz distribution stats (sent to, pending, completed, in-progress)
router.get(
  '/:quizId/report/distribution',
  roleGuard(['view_reports']),
  quizReportController.getQuizDistributionStats
);

export default router;

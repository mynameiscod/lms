import { Router } from 'express';
import * as quizController from '../controllers/quizController';
import * as questionController from '../controllers/questionController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Middleware
router.use(authMiddleware);
router.use(tenantMiddleware);

// Quiz Routes
router.post(
  '/',
  roleGuard(['create_quiz']),
  quizController.createQuiz
);

router.get('/instructor', quizController.getQuizzes);

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

router.get('/attempt/:attemptId/results', quizController.getQuizResults);

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

export default router;

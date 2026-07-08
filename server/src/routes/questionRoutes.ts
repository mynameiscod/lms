import { Router } from 'express';
import * as questionController from '../controllers/questionController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { tenantMiddleware } from '../middleware/tenantMiddleware';

const router = Router();

// Middleware - all Question Bank endpoints require authentication
router.use(authMiddleware);
router.use(tenantMiddleware);

// ========== QUESTION BANK ENDPOINTS ==========

// Create a new question in the Question Bank
router.post(
  '/bank/create',
  roleGuard(['create_question']),
  questionController.createQuestionBankQuestion
);

// Get all questions in the Question Bank (with filtering)
router.get(
  '/bank/list',
  questionController.getQuestionBank
);

// Search questions in Question Bank
router.get(
  '/bank/search',
  questionController.searchQuestionsInBank
);

// Get questions by specific tags
router.get(
  '/bank/tags',
  questionController.getQuestionsByTags
);

// Get all available tags in Question Bank
router.get(
  '/bank/all-tags',
  questionController.getAllTags
);

// Check for duplicate questions
router.post(
  '/bank/check-duplicate',
  questionController.checkDuplicate
);

// Get Question Bank statistics
router.get(
  '/bank/stats',
  questionController.getQuestionBankStats
);

// Generate questions using AI — must be before /bank/:questionId
router.post(
  '/bank/generate',
  roleGuard(['create_question']),
  questionController.generateAIQuestions
);

// Preview / remove duplicate bank questions — must be before /bank/:questionId
router.post(
  '/bank/dedupe',
  roleGuard(['delete_question']),
  questionController.dedupeQuestionBank
);

// Update a question in Question Bank
router.put(
  '/bank/:questionId',
  roleGuard(['edit_question']),
  questionController.updateQuestion
);

// Delete a question from Question Bank
router.delete(
  '/bank/:questionId',
  roleGuard(['delete_question']),
  questionController.deleteQuestionBankQuestion
);

// Mark a question as duplicate
router.post(
  '/bank/:questionId/mark-duplicate',
  roleGuard(['edit_question']),
  questionController.markAsDuplicate
);

export default router;

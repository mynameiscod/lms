import express from 'express';
import {
  getQuestionConfig,
  updateQuestionConfig,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  saveLeadAnswers,
  getLeadAnswers,
  getQuestionsForStage,
  resetToDefaults
} from '../controllers/qualificationController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Get qualification question configuration
router.get(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'view_leads', 'create_leads']),
  getQuestionConfig
);

// Update entire configuration (admin only)
router.put(
  '/config',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateQuestionConfig
);

// Add a new question
router.post(
  '/questions',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  addQuestion
);

// Update a specific question
router.put(
  '/questions/:questionId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  updateQuestion
);

// Delete a question
router.delete(
  '/questions/:questionId',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  deleteQuestion
);

// Reorder questions
router.put(
  '/questions/reorder',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  reorderQuestions
);

// Get questions for a specific stage (telecaller use)
router.get(
  '/stage/:stageId',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads']),
  getQuestionsForStage
);

// Save answers for a lead (telecaller use)
router.post(
  '/leads/:leadId/answers',
  authMiddleware,
  tenantResolver,
  roleGuard(['edit_leads', 'manage_leads', 'create_leads']),
  saveLeadAnswers
);

// Get answers for a lead
router.get(
  '/leads/:leadId/answers',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_leads', 'manage_leads', 'create_leads']),
  getLeadAnswers
);

// Reset to defaults (admin only)
router.post(
  '/reset',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  resetToDefaults
);

export default router;

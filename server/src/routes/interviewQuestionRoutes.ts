import express from 'express';
import {
  createQuestion,
  bulkCreateQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  getQuestionsByChapter,
  getQuestionsBySubject,
  getQuestionsByCourse,
  getQuestionById,
  getAllQuestions,
  markHelpful,
  getStudentProgress,
  getStudentCourseProgress,
  updateStudentProgress,
  getChapterStats
} from '../controllers/interviewQuestionController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// ==================== ADMIN ROUTES ====================

// Create single question
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createQuestion);

// Bulk create questions
router.post('/bulk', authMiddleware, tenantResolver, roleGuard(['create_courses']), bulkCreateQuestions);

// Update question
router.put('/:questionId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateQuestion);

// Delete question
router.delete('/:questionId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteQuestion);

// Reorder questions in a chapter
router.put('/chapter/:chapterId/reorder', authMiddleware, tenantResolver, roleGuard(['edit_courses']), reorderQuestions);

// Get chapter stats (admin view)
router.get('/chapter/:chapterId/stats', authMiddleware, tenantResolver, getChapterStats);

// ==================== QUERY ROUTES (All authenticated users) ====================

// Get all questions with filters
router.get('/', authMiddleware, tenantResolver, getAllQuestions);

// Get questions by chapter
router.get('/chapter/:chapterId', authMiddleware, tenantResolver, getQuestionsByChapter);

// Get questions by subject
router.get('/subject/:subjectId', authMiddleware, tenantResolver, getQuestionsBySubject);

// Get questions by course
router.get('/course/:courseId', authMiddleware, tenantResolver, getQuestionsByCourse);

// Get single question (increments view count)
router.get('/:questionId', authMiddleware, tenantResolver, getQuestionById);

// Mark question as helpful
router.post('/:questionId/helpful', authMiddleware, tenantResolver, markHelpful);

// ==================== STUDENT PROGRESS ROUTES ====================

// Get student progress for a chapter
router.get('/progress/chapter/:chapterId', authMiddleware, tenantResolver, getStudentProgress);

// Get student progress for entire course
router.get('/progress/course/:courseId', authMiddleware, tenantResolver, getStudentCourseProgress);

// Update student progress on a question
router.put('/progress/:questionId', authMiddleware, tenantResolver, updateStudentProgress);

export default router;

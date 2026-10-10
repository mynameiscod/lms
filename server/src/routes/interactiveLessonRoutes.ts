import { roleGuard } from '../middleware/roleGuard';
import express from 'express';
import {
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getProgress,
  saveSceneProgress,
  completeLesson,
  getLessonProgressAdmin,
  getTemplates,
  executeCode,
  generateLessonAI,
} from '../controllers/interactiveLessonController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// All routes require auth + tenant
router.use(authMiddleware, tenantResolver);
const manage = roleGuard(['manage_learning_plans', 'create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);

// Templates (admin)
router.get('/templates', getTemplates);

// AI generation (admin)
router.post('/generate-ai', manage, generateLessonAI);

// Lessons CRUD (admin/instructor)
router.get('/', listLessons);
router.post('/', manage, createLesson);
router.get('/:id', getLesson);
router.put('/:id', manage, updateLesson);
router.delete('/:id', manage, deleteLesson);

// Progress admin view
router.get('/:lessonId/progress-admin', manage, getLessonProgressAdmin);

// Code execution (student use during lesson)
router.post('/execute', executeCode);

// Student progress
router.get('/:lessonId/progress', getProgress);
router.post('/:lessonId/progress/scene', saveSceneProgress);
router.post('/:lessonId/complete', completeLesson);

export default router;

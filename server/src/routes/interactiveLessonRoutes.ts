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
} from '../controllers/interactiveLessonController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// All routes require auth + tenant
router.use(authMiddleware, tenantResolver);

// Templates (admin)
router.get('/templates', getTemplates);

// Lessons CRUD (admin/instructor)
router.get('/', listLessons);
router.post('/', createLesson);
router.get('/:id', getLesson);
router.put('/:id', updateLesson);
router.delete('/:id', deleteLesson);

// Progress admin view
router.get('/:lessonId/progress-admin', getLessonProgressAdmin);

// Code execution (student use during lesson)
router.post('/execute', executeCode);

// Student progress
router.get('/:lessonId/progress', getProgress);
router.post('/:lessonId/progress/scene', saveSceneProgress);
router.post('/:lessonId/complete', completeLesson);

export default router;

import express from 'express';
import { 
  getProgress, 
  getCompletedChapters, 
  markChapterComplete, 
  isChapterCompleted 
} from '../controllers/progressController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';

const router = express.Router();

// Get progress for a course
router.get('/course/:courseId', authMiddleware, tenantResolver, getProgress);

// Get completed chapter IDs for a course
router.get('/course/:courseId/completed-chapters', authMiddleware, tenantResolver, getCompletedChapters);

// Mark chapter as completed
router.post('/chapter/:chapterId/complete', authMiddleware, tenantResolver, markChapterComplete);

// Check if chapter is completed
router.get('/chapter/:chapterId/status', authMiddleware, tenantResolver, isChapterCompleted);

export default router;

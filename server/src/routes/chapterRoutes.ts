import express from 'express';
import { 
  createChapter, 
  getChaptersBySubject,
  getChaptersByCourse,
  getChaptersByTenant, 
  getChapterById, 
  updateChapter,
  deleteChapter,
  reorderChapters,
  addVideoToChapter,
  removeVideoFromChapter,
  addNoteToChapter,
  removeNoteFromChapter
} from '../controllers/chapterController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Create chapter
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createChapter);

// Get all chapters for tenant (with optional filters)
router.get('/', authMiddleware, tenantResolver, getChaptersByTenant);

// Get chapters by subject
router.get('/subject/:subjectId', authMiddleware, tenantResolver, getChaptersBySubject);

// Get chapters by course
router.get('/course/:courseId', authMiddleware, tenantResolver, getChaptersByCourse);

// Reorder chapters within a subject
router.put('/subject/:subjectId/reorder', authMiddleware, tenantResolver, roleGuard(['edit_courses']), reorderChapters);

// Get single chapter
router.get('/:chapterId', authMiddleware, getChapterById);

// Update chapter
router.put('/:chapterId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateChapter);

// Delete chapter
router.delete('/:chapterId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteChapter);

// Video management
router.post('/:chapterId/videos', authMiddleware, tenantResolver, roleGuard(['edit_courses']), addVideoToChapter);
router.delete('/:chapterId/videos/:videoIndex', authMiddleware, tenantResolver, roleGuard(['edit_courses']), removeVideoFromChapter);

// Note management
router.post('/:chapterId/notes', authMiddleware, tenantResolver, roleGuard(['edit_courses']), addNoteToChapter);
router.delete('/:chapterId/notes/:noteIndex', authMiddleware, tenantResolver, roleGuard(['edit_courses']), removeNoteFromChapter);

export default router;

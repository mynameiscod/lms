import express from 'express';
import { 
  createSubject, 
  getSubjectsByCourse,
  getSubjectsByTenant, 
  getSubjectById, 
  updateSubject,
  deleteSubject,
  reorderSubjects 
} from '../controllers/subjectController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// Create subject
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createSubject);

// Get all subjects for tenant (with optional filters)
router.get('/', authMiddleware, tenantResolver, getSubjectsByTenant);

// Get subjects by course
router.get('/course/:courseId', authMiddleware, tenantResolver, getSubjectsByCourse);

// Reorder subjects within a course
router.put('/course/:courseId/reorder', authMiddleware, tenantResolver, roleGuard(['edit_courses']), reorderSubjects);

// Get single subject
router.get('/:subjectId', authMiddleware, getSubjectById);

// Update subject
router.put('/:subjectId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateSubject);

// Delete subject
router.delete('/:subjectId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteSubject);

export default router;

import express from 'express';
import { 
  createCourse, 
  getCoursesByTenant, 
  getCourseById, 
  updateCourse,
  deleteCourse,
  toggleCourseStatus 
} from '../controllers/courseController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

// CRUD routes
router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createCourse);
router.get('/', authMiddleware, tenantResolver, getCoursesByTenant);
router.get('/:courseId', authMiddleware, getCourseById);
router.put('/:courseId', authMiddleware, tenantResolver, roleGuard(['edit_courses']), updateCourse);
router.delete('/:courseId', authMiddleware, tenantResolver, roleGuard(['delete_courses']), deleteCourse);
router.patch('/:courseId/status', authMiddleware, tenantResolver, roleGuard(['edit_courses']), toggleCourseStatus);

export default router;
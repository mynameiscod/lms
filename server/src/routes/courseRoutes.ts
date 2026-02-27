import express from 'express';
import { createCourse, getCoursesByTenant, getCourseById } from '../controllers/courseController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.post('/', authMiddleware, tenantResolver, roleGuard(['create_courses']), createCourse);
router.get('/', authMiddleware, tenantResolver, getCoursesByTenant);
router.get('/:courseId', authMiddleware, getCourseById);

export default router;
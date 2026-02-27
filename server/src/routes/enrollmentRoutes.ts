import express from 'express';
import {
  enrollStudent,
  getStudentEnrollments,
  getCourseEnrollments
} from '../controllers/enrollmentController';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

router.post('/enroll', authMiddleware, tenantResolver, enrollStudent);
router.get('/my-enrollments', authMiddleware, tenantResolver, getStudentEnrollments);
router.get('/:courseId', authMiddleware, roleGuard(['view_enrolled_students']), getCourseEnrollments);

export default router;
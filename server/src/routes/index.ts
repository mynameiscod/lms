import express from 'express';
import authRoutes from './authRoutes';
import tenantRoutes from './tenantRoutes';
import courseRoutes from './courseRoutes';
import enrollmentRoutes from './enrollmentRoutes';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import batchRoutes from './batchRoutes';
import attendanceRoutes from './attendanceRoutes';
import quizRoutes from './quizRoutes';
import questionRoutes from './questionRoutes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/tenants', tenantRoutes);
router.use('/courses', courseRoutes);
router.use('/enrollments', enrollmentRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/batches', batchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/quizzes', quizRoutes);
router.use('/questions', questionRoutes);

export default router;
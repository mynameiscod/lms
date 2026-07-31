import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  listStudentExams,
  createExam,
  createExamsBulk,
  updateExam,
  deleteExam,
} from '../controllers/examController';

const router = Router();

// Reading a student's exam history — anyone who can already see student reports.
router.get(
  '/student/:studentId',
  authMiddleware,
  tenantResolver,
  roleGuard(['view_exams', 'view_reports', 'manage_exams']),
  listStudentExams
);

// Writing marks is a separate, higher bar: these are the records that decide whether a
// student passed, so viewing a report must not imply being able to change one.
router.post('/', authMiddleware, tenantResolver, roleGuard(['manage_exams']), createExam);
router.post('/bulk', authMiddleware, tenantResolver, roleGuard(['manage_exams']), createExamsBulk);
router.put('/:id', authMiddleware, tenantResolver, roleGuard(['manage_exams']), updateExam);
router.delete('/:id', authMiddleware, tenantResolver, roleGuard(['manage_exams']), deleteExam);

export default router;

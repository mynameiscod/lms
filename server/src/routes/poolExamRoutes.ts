import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import * as ctrl from '../controllers/poolExamController';

/**
 * Pool exams, the student side. No role guard: who may sit an exam is decided per exam by the
 * service (was it given to this student, is it open, are attempts left), and every attempt route
 * only ever finds the caller's own attempts.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

router.get('/:assignmentId', ctrl.overview);
router.post('/:assignmentId/start', ctrl.start);
router.get('/attempts/:attemptId', ctrl.paper);
router.put('/attempts/:attemptId/answers/:key', ctrl.save);
router.post('/attempts/:attemptId/run/:key', ctrl.run);
router.post('/attempts/:attemptId/violation', ctrl.violation);
router.post('/attempts/:attemptId/submit', ctrl.submit);

export default router;

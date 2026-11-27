import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/poolExamController';

/** Pool exam results, for whoever manages or marks assignments. Every lookup is scoped to the caller's institute. */
const router = express.Router();
router.use(authMiddleware, tenantResolver, roleGuard(['manage_assignments', 'grade_submissions']));

router.get('/attempts/:attemptId', ctrl.attemptDetail);
router.post('/attempts/:attemptId/regrade', ctrl.regrade);
router.get('/:assignmentId', ctrl.results);
router.get('/:assignmentId/questions', ctrl.questionStats);
router.get('/:assignmentId/export', ctrl.exportResults);
router.post('/:assignmentId/release', ctrl.release);

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/problemDeliveryController';

/**
 * Learner side of the Problem Bank: the problem sets assigned to me, and solving them.
 * Any signed-in user; what they may open is decided per set by problemDeliveryService.
 */
const router = express.Router();
router.use(authMiddleware, tenantResolver);

router.get('/sets', ctrl.mySets);
router.get('/sets/:setId', ctrl.learnerSet);
router.get('/sets/:setId/problems/:problemId', ctrl.learnerProblem);
router.post('/sets/:setId/problems/:problemId/run', rateLimit('codingPracticeRun'), ctrl.learnerRun);
router.post('/sets/:setId/problems/:problemId/submit', rateLimit('codingPracticeSubmit'), ctrl.learnerSubmit);

export default router;

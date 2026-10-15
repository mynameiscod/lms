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

// The practice library: every published problem, chosen by the member. Facets before :problemId.
router.get('/library', ctrl.libraryList);
router.get('/library/facets', ctrl.libraryFacets);
router.get('/library/:problemId', ctrl.libraryProblem);
router.post('/library/:problemId/run', rateLimit('practiceLibraryJudge'), ctrl.libraryRun);
router.post('/library/:problemId/submit', rateLimit('practiceLibraryJudge'), ctrl.librarySubmit);

router.get('/sets', ctrl.mySets);
router.get('/sets/:setId', ctrl.learnerSet);
router.get('/sets/:setId/problems/:problemId', ctrl.learnerProblem);
router.post('/sets/:setId/problems/:problemId/run', rateLimit('codingPracticeRun'), ctrl.learnerRun);
router.post('/sets/:setId/problems/:problemId/submit', rateLimit('codingPracticeSubmit'), ctrl.learnerSubmit);

export default router;

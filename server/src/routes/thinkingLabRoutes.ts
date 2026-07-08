import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/thinkingLabController';

const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

// Student — daily challenge loop
router.get('/today', ctrl.getToday);
router.post('/next', ctrl.nextChallenge);
router.get('/stats', ctrl.stats);
router.get('/badges', ctrl.badges);
router.get('/leaderboard', ctrl.leaderboard);
router.post('/:id/approach', ctrl.saveApproach);   // think-first gate (>=30 words)
router.post('/:id/hint', ctrl.revealHint);
router.post('/:id/run', ctrl.run);
router.post('/:id/submit', ctrl.submit);

// Admin / instructor — question bank
const adminGuard = roleGuard(['create_courses', 'edit_courses', 'manage_own_courses', 'manage_tenant']);
router.get('/admin/meta', adminGuard, ctrl.meta);
router.get('/admin/problems', adminGuard, ctrl.listProblems);
router.post('/admin/generate', adminGuard, ctrl.generateProblems);
router.patch('/admin/problems/:id', adminGuard, ctrl.toggleProblem);
router.delete('/admin/problems/:id', adminGuard, ctrl.deleteProblem);

export default router;

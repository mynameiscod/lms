import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import * as ctrl from '../controllers/battleController';

// Admin/instructor Tech Battle management.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);
router.use(express.json());

router.get('/available-quizzes', ctrl.availableQuizzes);
router.get('/', ctrl.listBattles);
router.post('/', ctrl.createBattle);
router.get('/:id', ctrl.getBattle);
router.put('/:id', ctrl.updateBattle);
router.get('/:id/registrations', ctrl.getRegistrations);
router.get('/:id/leaderboard', ctrl.adminLeaderboard);
router.get('/:id/export', ctrl.exportRegistrations);

export default router;

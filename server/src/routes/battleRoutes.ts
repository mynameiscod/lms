import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';
import * as ctrl from '../controllers/battleController';

// Admin/instructor Tech Battle management.
const router = express.Router();
router.use(authMiddleware, tenantMiddleware);

/**
 * Permission map (roleGuard.ts → PERMISSION_GROUPS.techBattles):
 *   manage_battles               create / edit / delete / broadcast
 *   view_battles                 list, detail, registrations, leaderboard
 *   review_battle_registrations  approve / reject
 *   export_battle_data           export registrant PII
 *
 * Previously every one of these was a hardcoded
 * `['SUPER_ADMIN','TENANT_ADMIN','INSTRUCTOR','STAFF']` check in the controller, so
 * STAFF could delete battles, broadcast to the public and export PII — and custom
 * roles could not be granted access at all.
 */
const MANAGE = roleGuard(['manage_battles']);
const VIEW   = roleGuard(['view_battles', 'manage_battles']);
const REVIEW = roleGuard(['review_battle_registrations', 'manage_battles']);
router.use(express.json());

router.get('/available-quizzes', MANAGE, ctrl.availableQuizzes);
router.get('/', VIEW, ctrl.listBattles);
router.post('/', MANAGE, ctrl.createBattle);
router.get('/:id', VIEW, ctrl.getBattle);
router.put('/:id', MANAGE, ctrl.updateBattle);
router.delete('/:id', MANAGE, ctrl.deleteBattle);
router.post('/:id/broadcast', MANAGE, ctrl.broadcastBattle);
router.get('/:id/registrations', VIEW, ctrl.getRegistrations);
router.post('/:id/registrations/:regId/approve', REVIEW, ctrl.approveRegistration);
router.post('/:id/registrations/:regId/reject', REVIEW, ctrl.rejectRegistration);
router.get('/:id/leaderboard', VIEW, ctrl.adminLeaderboard);
router.get('/:id/export', roleGuard(['export_battle_data']), ctrl.exportRegistrations);

export default router;

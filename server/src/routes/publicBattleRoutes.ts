import express from 'express';
import * as ctrl from '../controllers/battleController';

// Public (no auth) Tech Battle funnel: list → landing → register(OTP) → time-gated exam → leaderboard.
const router = express.Router();

// Token-scoped exam + OTP (specific literals first).
router.post('/battles/verify', express.json(), ctrl.verifyBattleOtp);
router.post('/battles/resend', express.json(), ctrl.resendBattleOtp);
router.get('/battles/exam/:token', ctrl.getBattleExam);
router.post('/battles/exam/:token/start', express.json(), ctrl.startBattleExam);
router.post('/battles/exam/:token/heartbeat', express.json(), ctrl.battleHeartbeat);
router.post('/battles/exam/:token/submit', express.json(), ctrl.submitBattleExam);

// Tenant-scoped listing / landing / register / leaderboard.
router.get('/:tenantSlug/battles', ctrl.listPublicBattles);
router.get('/:tenantSlug/battles/:slug', ctrl.getPublicBattle);
router.post('/:tenantSlug/battles/:slug/register', express.json(), ctrl.registerForBattle);
router.get('/:tenantSlug/battles/:slug/leaderboard', ctrl.getPublicLeaderboard);

export default router;

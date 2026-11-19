import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/referralController';

/** /public/refer — the referral link a student shares. No account; counted per mobile and per network. */
export const publicReferralRoutes = express.Router();
publicReferralRoutes.get('/:code', ctrl.publicInfo);
publicReferralRoutes.post('/:code', rateLimit('signupBurst'), rateLimit('signup'), ctrl.publicSubmit);

/** /referrals — the student's Refer & Earn page, and the admin Referrals screen. */
const router = express.Router();
router.use(authMiddleware);

router.get('/me', ctrl.myPage);
router.post('/me/refer', rateLimit('signup'), ctrl.myRefer);
router.post('/me/withdraw', ctrl.myWithdraw);

const ADMIN = roleGuard(['manage_referrals']);
router.get('/admin/program', ADMIN, ctrl.adminGetProgram);
router.put('/admin/program', ADMIN, ctrl.adminSaveProgram);
router.get('/admin/summary', ADMIN, ctrl.adminSummary);
router.get('/admin/list', ADMIN, ctrl.adminList);
router.post('/admin/add', ADMIN, ctrl.adminAdd);
router.post('/admin/:id/reject', ADMIN, ctrl.adminReject);
router.post('/admin/:id/restore', ADMIN, ctrl.adminRestore);
router.post('/admin/:id/recheck', ADMIN, ctrl.adminRecheck);
router.get('/admin/payouts', ADMIN, ctrl.adminPayouts);
router.post('/admin/payouts/:id/paid', ADMIN, ctrl.adminPayoutPaid);
router.post('/admin/payouts/:id/reject', ADMIN, ctrl.adminPayoutReject);

export default router;

import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';
import { rateLimit } from '../middleware/rateLimit';
import * as ctrl from '../controllers/lmsDemoController';

/** /public/lms-demo — the free demo sign-up. No account yet, so counted by address. */
export const publicLmsDemoRoutes = express.Router();
publicLmsDemoRoutes.get('/info', ctrl.publicInfo);
publicLmsDemoRoutes.post('/start', rateLimit('signupBurst'), rateLimit('signup'), ctrl.publicStart);
publicLmsDemoRoutes.post('/resend', rateLimit('otp'), ctrl.publicResend);
publicLmsDemoRoutes.post('/verify', rateLimit('otp'), ctrl.publicVerify);
publicLmsDemoRoutes.post('/enter', rateLimit('otp'), ctrl.publicEnter);

/** /lms-demo — the demo student's own screens, and the admin screen. */
const router = express.Router();
router.use(authMiddleware);

router.get('/me', ctrl.me);
router.post('/me/talk', ctrl.talk);
router.post('/me/more-time', ctrl.moreTime);

// A super admin, or a role a super admin gave manage_lms_demo.
const ADMIN = roleGuard(['manage_lms_demo']);
router.get('/admin/config', ADMIN, ctrl.adminGetConfig);
router.put('/admin/config', ADMIN, ctrl.adminSaveConfig);
router.get('/admin/content', ADMIN, ctrl.adminContent);
router.get('/admin/options/:kind', ADMIN, ctrl.adminOptions);
router.get('/admin/students', ADMIN, ctrl.adminListStudents);
router.post('/admin/students', ADMIN, ctrl.adminGiveDemo);
router.get('/admin/students/:id/link', ADMIN, ctrl.adminLink);
router.post('/admin/students/:id/extend', ADMIN, ctrl.adminExtend);
router.post('/admin/students/:id/end', ADMIN, ctrl.adminEnd);
router.post('/admin/students/:id/reset', ADMIN, ctrl.adminReset);

// "Give demo" on a CRM lead: whoever works leads, as well as LMS Demo admins.
router.post('/lead/:leadId/give', roleGuard(['manage_lms_demo', 'manage_leads', 'edit_leads']), ctrl.leadGiveDemo);

export default router;
